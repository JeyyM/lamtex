-- Re-run if you already applied order_customer_portal.sql with payment history.
-- Replaces get_public_order_summary to return order activities instead of payment proofs.

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

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'description', trim(concat_ws(' — ', NULLIF(oli.product_name, ''), NULLIF(oli.variant_description, ''))),
      'quantity', oli.quantity,
      'unitPrice', oli.unit_price,
      'discountAmount', COALESCE(oli.discount_amount, 0),
      'total', oli.line_total
    ) ORDER BY oli.created_at
  ), '[]'::jsonb)
  INTO v_items
  FROM order_line_items oli
  WHERE oli.order_id = v_order.id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'tripNumber', t.trip_number,
      'driverName', COALESCE(t.driver_name, ''),
      'vehicleName', COALESCE(t.vehicle_name, ''),
      'status', t.status,
      'scheduledDate', t.scheduled_date,
      'delayReason', t.delay_reason
    )
  ), '[]'::jsonb)
  INTO v_trips
  FROM trips t
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
    'agentName', v_order.agent_name,
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
