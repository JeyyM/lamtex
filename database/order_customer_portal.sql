-- Customer-facing order summary links (read-only; no online payment).
-- Run in Supabase SQL Editor after schema is applied.

CREATE OR REPLACE FUNCTION public.expand_order_line_discounts(
  p_qty INT,
  p_unit_price NUMERIC,
  p_discount_amount NUMERIC,
  p_breakdown JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_gross NUMERIC;
  v_running NUMERIC;
  v_elem JSONB;
  v_pct NUMERIC;
  v_after NUMERIC;
  v_amt NUMERIC;
  v_name TEXT;
  v_lines JSONB := '[]'::jsonb;
  v_from_breakdown NUMERIC := 0;
  v_unallocated NUMERIC;
BEGIN
  v_gross := COALESCE(p_qty, 0) * COALESCE(p_unit_price, 0);
  v_running := v_gross;

  IF p_breakdown IS NOT NULL AND jsonb_typeof(p_breakdown) = 'array' THEN
    FOR v_elem IN SELECT value FROM jsonb_array_elements(p_breakdown) AS t(value)
    LOOP
      v_name := NULLIF(trim(COALESCE(v_elem->>'name', '')), '');
      BEGIN
        v_pct := COALESCE(
          NULLIF(trim(COALESCE(v_elem->>'percentage', v_elem->>'percent', '')), '')::numeric,
          0
        );
      EXCEPTION WHEN OTHERS THEN
        v_pct := 0;
      END;
      IF v_pct > 0 AND v_running > 0 THEN
        v_after := v_running * (1 - v_pct / 100);
        v_amt := round(v_running - v_after, 2);
        IF v_amt > 0 THEN
          v_lines := v_lines || jsonb_build_array(jsonb_build_object(
            'name', COALESCE(v_name, 'Discount'),
            'percentage', v_pct,
            'amount', v_amt
          ));
          v_from_breakdown := v_from_breakdown + v_amt;
          v_running := v_after;
        END IF;
      END IF;
    END LOOP;
  END IF;

  v_unallocated := round(COALESCE(p_discount_amount, 0) - v_from_breakdown, 2);
  IF v_unallocated > 0.005 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'name', 'Discount',
      'amount', v_unallocated
    ));
  END IF;

  IF jsonb_array_length(v_lines) = 0 AND COALESCE(p_discount_amount, 0) > 0 THEN
    v_lines := jsonb_build_array(jsonb_build_object(
      'name', 'Discount',
      'amount', round(COALESCE(p_discount_amount, 0), 2)
    ));
  END IF;

  RETURN v_lines;
END;
$$;

CREATE TABLE IF NOT EXISTS order_customer_portals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  token           VARCHAR(64) NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ,
  view_count      INT NOT NULL DEFAULT 0,
  last_viewed_at  TIMESTAMPTZ,
  customer_email  VARCHAR(255),
  sent_via_email  BOOLEAN NOT NULL DEFAULT FALSE,
  last_email_sent TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_customer_portals_order_id_key UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_customer_portals_token ON order_customer_portals(token);
CREATE INDEX IF NOT EXISTS idx_order_customer_portals_order ON order_customer_portals(order_id);

ALTER TABLE order_customer_portals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY auth_select_order_customer_portals ON order_customer_portals
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY auth_insert_order_customer_portals ON order_customer_portals
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY auth_update_order_customer_portals ON order_customer_portals
    FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY auth_delete_order_customer_portals ON order_customer_portals
    FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Public read by token (no auth). Returns order + receipt-style summary only.
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
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_portal
  FROM order_customer_portals
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_portal.expires_at IS NOT NULL AND v_portal.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  SELECT
    o.id,
    o.order_number,
    o.order_date,
    o.required_date,
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
  LEFT JOIN employees drv ON drv.id = t.driver_id
  LEFT JOIN employee_contact_info drv_ci ON drv_ci.employee_id = drv.id
  WHERE v_order.id = ANY(t.order_ids)
    AND (
      t.driver_id IS NOT NULL
      OR NULLIF(trim(t.driver_name), '') IS NOT NULL
    )
  ORDER BY
    CASE t.status::text
      WHEN 'In Transit' THEN 1
      WHEN 'Loading' THEN 2
      WHEN 'Packed' THEN 3
      WHEN 'Ready' THEN 4
      WHEN 'Scheduled' THEN 5
      ELSE 10
    END,
    t.scheduled_date DESC NULLS LAST,
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
  LEFT JOIN employees drv ON drv.id = t.driver_id
  LEFT JOIN employee_contact_info drv_ci ON drv_ci.employee_id = drv.id
  WHERE v_order.id = ANY(t.order_ids);

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
