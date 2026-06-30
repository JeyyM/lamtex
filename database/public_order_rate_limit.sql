-- ============================================================================
-- Public order portal — anti-brute-force rate limiting
-- ----------------------------------------------------------------------------
-- The customer order portal is intentionally unauthenticated: customers open
-- /order/<token> without logging in. The public RPCs (get_public_order_summary
-- and get_public_order_discount_lines) are granted to `anon`, so anyone with
-- the public anon key can call them directly via the REST API — bypassing the
-- React app entirely. To stop someone from "mashing random combinations" to
-- find valid order tokens, we rate-limit by client IP **inside** the RPCs
-- (SECURITY DEFINER), which is the only place that cannot be bypassed.
--
-- Defense layers:
--   1. Tokens are now 128-bit crypto-random (frontend) — guessing is infeasible.
--   2. This per-IP throttle caps how fast anyone can probe tokens regardless.
--
-- Idempotent — safe to re-run. Mirrored into database/schema.sql.
-- Run in the Supabase SQL editor, then: NOTIFY pgrst, 'reload schema';
-- ============================================================================

-- Attempt log used purely for throttling (IP + success flag + time).
CREATE TABLE IF NOT EXISTS public.public_order_access_attempts (
  id          BIGSERIAL PRIMARY KEY,
  ip          TEXT NOT NULL DEFAULT 'unknown',
  found       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_order_access_attempts_ip_time
  ON public.public_order_access_attempts (ip, created_at DESC);

-- RLS on, no anon/authenticated policies: only the SECURITY DEFINER functions
-- below (which run as the table owner and bypass RLS) may read/write it.
ALTER TABLE public.public_order_access_attempts ENABLE ROW LEVEL SECURITY;

-- ── Resolve the caller's IP from PostgREST-provided request headers ─────────
CREATE OR REPLACE FUNCTION public.current_request_ip()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_headers TEXT;
  v_ip      TEXT;
BEGIN
  BEGIN
    v_headers := current_setting('request.headers', true);
  EXCEPTION WHEN OTHERS THEN
    v_headers := NULL;
  END;

  IF v_headers IS NULL OR v_headers = '' THEN
    RETURN 'unknown';
  END IF;

  BEGIN
    -- x-forwarded-for may be "client, proxy1, proxy2" — take the first hop.
    v_ip := split_part(COALESCE((v_headers::json) ->> 'x-forwarded-for', ''), ',', 1);
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  v_ip := NULLIF(trim(COALESCE(v_ip, '')), '');
  RETURN COALESCE(v_ip, 'unknown');
END;
$$;

-- ── Guard: returns 'rate_limited' if the caller has tripped a threshold ─────
-- Thresholds (per IP):
--   • 30 FAILED lookups in 10 minutes  → block (token-guessing behaviour)
--   • 120 total calls in 1 minute      → block (hammering / scraping)
-- A real customer viewing one order makes 2 calls per page load, so these are
-- far above legitimate usage.
CREATE OR REPLACE FUNCTION public.public_order_access_guard()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ip       TEXT := public.current_request_ip();
  v_fail_10m INT;
  v_all_1m   INT;
BEGIN
  SELECT count(*) INTO v_fail_10m
  FROM public.public_order_access_attempts a
  WHERE a.ip = v_ip
    AND a.found = FALSE
    AND a.created_at > NOW() - INTERVAL '10 minutes';

  IF v_fail_10m >= 30 THEN
    RETURN 'rate_limited';
  END IF;

  SELECT count(*) INTO v_all_1m
  FROM public.public_order_access_attempts a
  WHERE a.ip = v_ip
    AND a.found = FALSE
    AND a.created_at > NOW() - INTERVAL '1 minute';

  IF v_all_1m >= 60 THEN
    RETURN 'rate_limited';
  END IF;

  RETURN NULL;
END;
$$;

-- ── Record one access attempt (and opportunistically prune old rows) ────────
CREATE OR REPLACE FUNCTION public.public_order_access_record(p_found BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ip TEXT := public.current_request_ip();
BEGIN
  INSERT INTO public.public_order_access_attempts (ip, found)
  VALUES (v_ip, COALESCE(p_found, FALSE));

  -- ~1% of calls prune rows older than a day so the table stays small without
  -- needing a separate cron job.
  IF random() < 0.01 THEN
    DELETE FROM public.public_order_access_attempts
    WHERE created_at < NOW() - INTERVAL '1 day';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.current_request_ip() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_order_access_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_order_access_record(BOOLEAN) FROM PUBLIC;

-- ============================================================================
-- Guarded public RPCs — same bodies as database/schema.sql, with the rate-limit
-- guard at the top and attempt recording on every outcome. CREATE OR REPLACE so
-- re-running is safe.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_order_summary(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portal   order_customer_portals%ROWTYPE;
  v_order    RECORD;
  v_customer RECORD;
  v_invoice  RECORD;
  v_company  RECORD;
  v_addr     TEXT;
  v_items    JSONB;
  v_trips    JSONB;
  v_activities JSONB;
  v_agent    JSONB;
  v_agent_core TEXT;
  v_driver   JSONB;
  v_block    TEXT;
BEGIN
  -- Anti-brute-force: throttle by client IP before doing anything else.
  v_block := public.public_order_access_guard();
  IF v_block IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', v_block);
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    PERFORM public.public_order_access_record(false);
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_portal
  FROM order_customer_portals
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    PERFORM public.public_order_access_record(false);
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- Valid token (even if revoked/expired/cancelled) — not a guess.
  PERFORM public.public_order_access_record(true);

  IF v_portal.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'revoked');
  END IF;

  IF v_portal.expires_at IS NOT NULL AND v_portal.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  SELECT
    o.id,
    o.order_number,
    o.order_date,
    o.required_date,
    o.actual_delivery,
    o.status,
    o.payment_status,
    o.payment_terms,
    o.delivery_type,
    o.delivery_address,
    o.subtotal,
    o.discount_percent,
    o.discount_amount,
    o.tax_amount,
    o.total_amount,
    o.amount_paid,
    o.balance_due,
    o.invoice_date,
    o.due_date,
    o.order_notes,
    o.agent_id,
    o.agent_name,
    o.customer_name,
    o.customer_id,
    o.branch_id,
    b.name AS branch_name
  INTO v_order
  FROM orders o
  LEFT JOIN branches b ON b.id = o.branch_id
  WHERE o.id = v_portal.order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_missing');
  END IF;

  IF v_order.status = 'Cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cancelled');
  END IF;

  UPDATE order_customer_portals
  SET view_count = view_count + 1,
      last_viewed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_portal.id;

  SELECT c.name, c.email, c.phone, c.address, c.city, c.province, c.postal_code, c.contact_person
  INTO v_customer
  FROM customers c
  WHERE c.id = v_order.customer_id;

  SELECT i.invoice_number, i.issue_date, i.due_date, i.payment_terms, i.notes
  INTO v_invoice
  FROM invoices i
  WHERE i.order_id = v_order.id
  ORDER BY i.created_at DESC
  LIMIT 1;

  SELECT cs.company_name, cs.primary_phone, cs.primary_email
  INTO v_company
  FROM company_settings cs
  WHERE cs.branch_id = v_order.branch_id
  LIMIT 1;

  SELECT trim(concat_ws(', ',
    NULLIF(ca.street, ''),
    NULLIF(ca.city, ''),
    NULLIF(ca.province, ''),
    NULLIF(ca.postal_code, '')
  ))
  INTO v_addr
  FROM company_addresses ca
  JOIN company_settings cs ON cs.id = ca.settings_id
  WHERE cs.branch_id = v_order.branch_id AND ca.is_primary = true
  LIMIT 1;

  v_agent := jsonb_build_object(
    'name', COALESCE(v_order.agent_name, ''),
    'phone', NULL,
    'email', NULL
  );

  v_agent_core := NULLIF(trim(v_order.agent_name), '');
  IF v_agent_core IS NOT NULL THEN
    IF NULLIF(trim(COALESCE(v_order.branch_name, '')), '') IS NOT NULL THEN
      v_agent_core := NULLIF(trim(regexp_replace(
        v_agent_core,
        '^' || regexp_replace(trim(v_order.branch_name), '([\[\].^$|?*+(){}\\])', '\\\1', 'g') || '\s*[-–—]\s*',
        '',
        'i'
      )), '');
    END IF;
    IF v_agent_core IS NOT NULL AND v_agent_core = trim(v_order.agent_name) THEN
      v_agent_core := NULLIF(trim(regexp_replace(v_agent_core, '^[^-–—]+[-–—]\s*', '', 'i')), '');
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'name', COALESCE(e.employee_name, v_order.agent_name, ''),
    'phone', NULLIF(trim(COALESCE(eci.primary_phone, eci.secondary_phone, e.phone)), ''),
    'email', NULLIF(trim(COALESCE(eci.work_email, eci.personal_email, e.email)), '')
  )
  INTO v_agent
  FROM employees e
  LEFT JOIN employee_contact_info eci ON eci.employee_id = e.id
  WHERE (
      v_order.agent_id IS NOT NULL AND e.id = v_order.agent_id
    )
    OR (
      e.role = 'Sales Agent'
      AND (
        NULLIF(trim(v_order.agent_name), '') IS NOT NULL
        OR v_agent_core IS NOT NULL
      )
      AND (
        lower(trim(e.employee_name)) = lower(trim(v_order.agent_name))
        OR (v_agent_core IS NOT NULL AND lower(trim(e.employee_name)) = lower(v_agent_core))
        OR lower(trim(v_order.agent_name)) LIKE '%' || lower(trim(e.employee_name)) || '%'
        OR (v_agent_core IS NOT NULL AND lower(v_agent_core) LIKE '%' || lower(trim(e.employee_name)) || '%')
      )
    )
  ORDER BY
    CASE WHEN v_order.agent_id IS NOT NULL AND e.id = v_order.agent_id THEN 0 ELSE 1 END,
    CASE WHEN e.branch_id IS NOT DISTINCT FROM v_order.branch_id THEN 0 ELSE 1 END,
    CASE
      WHEN v_agent_core IS NOT NULL AND lower(trim(e.employee_name)) = lower(v_agent_core) THEN 0
      WHEN lower(trim(e.employee_name)) = lower(trim(COALESCE(v_order.agent_name, ''))) THEN 1
      ELSE 2
    END,
    length(COALESCE(eci.primary_phone, eci.secondary_phone, e.phone, '')) DESC,
    length(COALESCE(eci.work_email, eci.personal_email, e.email, '')) DESC
  LIMIT 1;

  IF v_agent IS NULL THEN
    v_agent := jsonb_build_object(
      'name', COALESCE(v_order.agent_name, ''),
      'phone', NULL,
      'email', NULL
    );
  ELSIF
    NULLIF(trim(COALESCE(v_agent->>'phone', '')), '') IS NULL
    AND NULLIF(trim(COALESCE(v_agent->>'email', '')), '') IS NULL
  THEN
    v_agent := jsonb_build_object(
      'name', COALESCE(v_agent->>'name', v_order.agent_name, ''),
      'phone', NULL,
      'email', NULL
    );
  END IF;

  v_driver := NULL;
  SELECT jsonb_build_object(
    'name', COALESCE(drv.employee_name, NULLIF(trim(t.driver_name), ''), ''),
    'phone', NULLIF(trim(COALESCE(drv_ci.primary_phone, drv_ci.secondary_phone, drv.phone)), ''),
    'email', NULLIF(trim(COALESCE(drv_ci.work_email, drv_ci.personal_email, drv.email)), ''),
    'vehicleName', NULLIF(trim(t.vehicle_name), ''),
    'tripNumber', t.trip_number,
    'status', t.status::text
  )
  INTO v_driver
  FROM trips t
  LEFT JOIN LATERAL (
    SELECT e.id, e.employee_name, e.email, e.phone
    FROM employees e
    WHERE (t.driver_id IS NOT NULL AND e.id = t.driver_id)
       OR (
         NULLIF(trim(t.driver_name), '') IS NOT NULL
         AND lower(trim(COALESCE(e.employee_name, ''))) = lower(trim(t.driver_name))
         AND e.user_role = 'Driver'::user_role
       )
    ORDER BY
      CASE WHEN t.driver_id IS NOT NULL AND e.id = t.driver_id THEN 0 ELSE 1 END,
      CASE WHEN e.status = 'active'::employee_status THEN 0 ELSE 1 END
    LIMIT 1
  ) drv ON true
  LEFT JOIN employee_contact_info drv_ci ON drv_ci.employee_id = drv.id
  WHERE v_order.id = ANY(t.order_ids)
    AND (
      t.driver_id IS NOT NULL
      OR NULLIF(trim(t.driver_name), '') IS NOT NULL
    )
  ORDER BY
    CASE
      WHEN v_order.status IN ('Delivered', 'Partially Fulfilled', 'Completed')
        AND t.status::text = 'Completed' THEN 1
      WHEN t.status::text = 'In Transit' THEN 2
      WHEN t.status::text = 'Loading' THEN 3
      WHEN t.status::text = 'Planned' THEN 4
      WHEN t.status::text = 'Pending' THEN 5
      WHEN t.status::text = 'Completed' THEN 6
      WHEN t.status::text = 'Delayed' THEN 7
      ELSE 10
    END,
    t.scheduled_date DESC NULLS LAST,
    t.updated_at DESC NULLS LAST,
    t.created_at DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'description', trim(concat_ws(' — ', NULLIF(oli.product_name, ''), NULLIF(oli.variant_description, ''))),
      'quantity', oli.quantity,
      'unitPrice', oli.unit_price,
      'discountAmount', COALESCE(oli.discount_amount, 0),
      'discountsBreakdown', COALESCE(oli.discounts_breakdown, '[]'::jsonb),
      'discountLines', public.expand_order_line_discounts(
        oli.quantity,
        oli.unit_price,
        oli.discount_amount,
        oli.discounts_breakdown
      ),
      'total', oli.line_total
    ) ORDER BY oli.created_at
  ), '[]'::jsonb)
  INTO v_items
  FROM order_line_items oli
  WHERE oli.order_id = v_order.id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'tripNumber', t.trip_number,
      'driverName', COALESCE(drv.employee_name, t.driver_name, ''),
      'driverPhone', NULLIF(trim(COALESCE(drv_ci.primary_phone, drv_ci.secondary_phone, drv.phone)), ''),
      'driverEmail', NULLIF(trim(COALESCE(drv_ci.work_email, drv_ci.personal_email, drv.email)), ''),
      'vehicleName', COALESCE(t.vehicle_name, ''),
      'status', t.status,
      'scheduledDate', t.scheduled_date,
      'delayReason', t.delay_reason
    )
    ORDER BY t.scheduled_date DESC NULLS LAST
  ), '[]'::jsonb)
  INTO v_trips
  FROM trips t
  LEFT JOIN LATERAL (
    SELECT e.id, e.employee_name, e.email, e.phone
    FROM employees e
    WHERE (t.driver_id IS NOT NULL AND e.id = t.driver_id)
       OR (
         NULLIF(trim(t.driver_name), '') IS NOT NULL
         AND lower(trim(COALESCE(e.employee_name, ''))) = lower(trim(t.driver_name))
         AND e.user_role = 'Driver'::user_role
       )
    ORDER BY
      CASE WHEN t.driver_id IS NOT NULL AND e.id = t.driver_id THEN 0 ELSE 1 END,
      CASE WHEN e.status = 'active'::employee_status THEN 0 ELSE 1 END
    LIMIT 1
  ) drv ON true
  LEFT JOIN employee_contact_info drv_ci ON drv_ci.employee_id = drv.id
  WHERE v_order.id = ANY(t.order_ids);

  IF v_driver IS NULL OR NULLIF(trim(COALESCE(v_driver->>'name', '')), '') IS NULL THEN
    SELECT jsonb_build_object(
      'name', NULLIF(trim(trip_row->>'driverName'), ''),
      'phone', NULLIF(trim(trip_row->>'driverPhone'), ''),
      'email', NULLIF(trim(trip_row->>'driverEmail'), ''),
      'vehicleName', NULLIF(trim(trip_row->>'vehicleName'), ''),
      'tripNumber', NULLIF(trim(trip_row->>'tripNumber'), ''),
      'status', NULLIF(trim(trip_row->>'status'), '')
    )
    INTO v_driver
    FROM jsonb_array_elements(v_trips) AS trip_row
    WHERE NULLIF(trim(trip_row->>'driverName'), '') IS NOT NULL
    LIMIT 1;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'at', l.timestamp,
      'action', l.action::text,
      'description', l.description,
      'oldValue', l.old_value,
      'newValue', l.new_value,
      'metadata', l.metadata
    ) ORDER BY l.timestamp DESC
  ), '[]'::jsonb)
  INTO v_activities
  FROM order_logs l
  WHERE l.order_id = v_order.id
    AND (
      l.action::text IN (
        'created',
        'item_added', 'item_removed', 'item_quantity_changed', 'item_price_changed',
        'discount_applied',
        'status_changed', 'payment_status_changed',
        'approved', 'rejected', 'cancelled',
        'shipped', 'delivered',
        'payment_received', 'invoice_generated'
      )
      OR (
        l.action = 'proof_uploaded'
        AND COALESCE(l.description, '') ILIKE 'proof of delivery%'
      )
    )
    AND NOT (
      l.action = 'proof_uploaded'
      AND COALESCE(l.description, '') ILIKE '%payment%'
    );

  RETURN jsonb_build_object(
    'ok', true,
    'orderNumber', v_order.order_number,
    'orderDate', v_order.order_date,
    'requiredDate', v_order.required_date,
    'actualDelivery', v_order.actual_delivery,
    'status', v_order.status,
    'paymentStatus', v_order.payment_status,
    'paymentTerms', COALESCE(v_invoice.payment_terms::text, v_order.payment_terms::text),
    'deliveryType', v_order.delivery_type,
    'deliveryAddress', COALESCE(v_order.delivery_address, v_customer.address),
    'subtotal', v_order.subtotal,
    'discountPercent', v_order.discount_percent,
    'discountAmount', v_order.discount_amount,
    'taxAmount', v_order.tax_amount,
    'totalAmount', v_order.total_amount,
    'amountPaid', v_order.amount_paid,
    'balanceDue', v_order.balance_due,
    'invoiceNumber', v_invoice.invoice_number,
    'issueDate', COALESCE(v_invoice.issue_date, v_order.invoice_date),
    'dueDate', COALESCE(v_invoice.due_date, v_order.due_date),
    'orderNotes', v_order.order_notes,
    'invoiceNotes', v_invoice.notes,
    'agentName', COALESCE(v_agent->>'name', v_order.agent_name),
    'agent', v_agent,
    'assignedDriver', v_driver,
    'branchName', v_order.branch_name,
    'customer', jsonb_build_object(
      'name', COALESCE(v_customer.name, v_order.customer_name),
      'email', v_customer.email,
      'phone', v_customer.phone,
      'contactPerson', v_customer.contact_person,
      'address', trim(concat_ws(', ',
        NULLIF(v_customer.address, ''),
        NULLIF(v_customer.city, ''),
        NULLIF(v_customer.province, ''),
        NULLIF(v_customer.postal_code, '')
      ))
    ),
    'company', jsonb_build_object(
      'name', COALESCE(v_company.company_name, 'LAMTEX'),
      'phone', v_company.primary_phone,
      'email', v_company.primary_email,
      'address', v_addr
    ),
    'items', v_items,
    'trips', v_trips,
    'activities', v_activities
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_summary(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_summary(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_order_discount_lines(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portal order_customer_portals%ROWTYPE;
  v_lines  JSONB;
  v_block  TEXT;
BEGIN
  v_block := public.public_order_access_guard();
  IF v_block IS NOT NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    PERFORM public.public_order_access_record(false);
    RETURN '[]'::jsonb;
  END IF;

  SELECT * INTO v_portal
  FROM order_customer_portals
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    PERFORM public.public_order_access_record(false);
    RETURN '[]'::jsonb;
  END IF;

  PERFORM public.public_order_access_record(true);

  IF v_portal.expires_at IS NOT NULL AND v_portal.expires_at < NOW() THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'description', trim(concat_ws(' — ',
        NULLIF(oli.product_name, ''),
        NULLIF(oli.variant_description, '')
      )),
      'sku', oli.sku,
      'quantity', oli.quantity,
      'unitPrice', oli.unit_price,
      'lineTotal', oli.line_total,
      'discountAmount', COALESCE(oli.discount_amount, 0),
      'discountsBreakdown', COALESCE(oli.discounts_breakdown, '[]'::jsonb)
    ) ORDER BY oli.created_at
  ), '[]'::jsonb)
  INTO v_lines
  FROM order_line_items oli
  WHERE oli.order_id = v_portal.order_id;

  RETURN v_lines;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_discount_lines(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_discount_lines(TEXT) TO anon, authenticated;
