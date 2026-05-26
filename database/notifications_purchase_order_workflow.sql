-- Purchase order approval workflow notifications (in-app).
-- Run in Supabase SQL editor after notifications table exists.
-- Safe to re-run (idempotent CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS).

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS submitted_by_auth_user_id UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS submitted_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Resolve the auth user to notify for the employee who submitted this PO.
CREATE OR REPLACE FUNCTION resolve_po_submitter_auth_user_id(p_po_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  uid UUID;
  submitter TEXT;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF po.submitted_by_auth_user_id IS NOT NULL THEN
    RETURN po.submitted_by_auth_user_id;
  END IF;

  IF po.submitted_by_employee_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO uid
    FROM employees e
    WHERE e.id = po.submitted_by_employee_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  submitter := COALESCE(
    NULLIF(trim(po.submitted_by), ''),
    (
      SELECT l.performed_by
      FROM purchase_order_logs l
      WHERE l.order_id = po.id
        AND l.action = 'submitted'
      ORDER BY l.created_at DESC
      LIMIT 1
    ),
    NULLIF(trim(po.created_by), '')
  );

  IF submitter IS NULL THEN
    RETURN NULL;
  END IF;

  IF position('@' IN submitter) > 0 THEN
    SELECT u.id
    INTO uid
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(submitter))
    LIMIT 1;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  SELECT e.auth_user_id
  INTO uid
  FROM employees e
  WHERE e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL
    AND (
      e.employee_name = submitter
      OR e.email = submitter
      OR lower(trim(e.employee_name)) = lower(trim(submitter))
      OR lower(split_part(e.email, '@', 1)) = lower(trim(submitter))
    )
  ORDER BY e.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN uid;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_po_submitter_auth_user_id(UUID) TO authenticated;

-- Draft → Requested: notify all active executives with linked auth accounts.
CREATE OR REPLACE FUNCTION notify_executives_po_submitted_for_approval(p_po_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  exec RECORD;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status IS DISTINCT FROM 'Requested' THEN
    RAISE EXCEPTION 'PO % is not Requested (current: %)', po.po_number, po.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  msg := format(
    'PO %s submitted for approval by %s — %s, %s item(s), total %s%s',
    po.po_number,
    COALESCE(po.submitted_by, po.created_by, 'Unknown'),
    COALESCE(supplier_name, 'No supplier'),
    line_count,
    CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
    to_char(COALESCE(po.total_amount, 0), 'FM999,999,990.00')
  );

  FOR exec IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      exec.auth_user_id,
      'Approvals'::notification_category,
      'Purchase order awaiting approval',
      msg,
      false,
      '/purchase-orders/' || po.id::text,
      'Review PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'submittedBy', po.submitted_by,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status
      ),
      'purchase_order_submitted_for_approval'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Cancelled PO: notify the employee who submitted it for approval.
CREATE OR REPLACE FUNCTION notify_po_submitter_cancelled(
  p_po_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status IS DISTINCT FROM 'Cancelled' THEN
    RAISE EXCEPTION 'PO % is not Cancelled (current: %)', po.po_number, po.status;
  END IF;

  submitter_uid := resolve_po_submitter_auth_user_id(p_po_id);

  IF submitter_uid IS NULL THEN
    RETURN 0;
  END IF;

  -- Skip only when canceller label exactly matches submitter (warehouse self-cancel).
  IF po.submitted_by IS NOT NULL
     AND p_cancelled_by IS NOT NULL
     AND lower(trim(p_cancelled_by)) = lower(trim(po.submitted_by)) THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  msg := format(
    'PO %s was cancelled by %s%s',
    po.po_number,
    COALESCE(NULLIF(trim(p_cancelled_by), ''), 'someone'),
    CASE
      WHEN p_cancellation_reason IS NOT NULL AND trim(p_cancellation_reason) <> ''
      THEN format('. Reason: %s', p_cancellation_reason)
      ELSE ''
    END
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    submitter_uid,
    'System'::notification_category,
    'Purchase order cancelled',
    msg,
    true,
    '/purchase-orders/' || po.id::text,
    'View PO',
    po.branch_id,
    jsonb_build_object(
      'purchaseOrderId', po.id,
      'poNumber', po.po_number,
      'supplierName', supplier_name,
      'submittedBy', po.submitted_by,
      'cancelledBy', p_cancelled_by,
      'cancellationReason', p_cancellation_reason,
      'branchName', branch_name,
      'totalAmount', po.total_amount,
      'currency', po.currency,
      'lineCount', line_count,
      'status', po.status
    ),
    'purchase_order_cancelled'
  );

  RETURN 1;
END;
$$;

-- Rejected PO: notify the employee who submitted it for approval.
CREATE OR REPLACE FUNCTION notify_po_submitter_rejected(
  p_po_id UUID,
  p_rejected_by TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status IS DISTINCT FROM 'Rejected' THEN
    RAISE EXCEPTION 'PO % is not Rejected (current: %)', po.po_number, po.status;
  END IF;

  submitter_uid := resolve_po_submitter_auth_user_id(p_po_id);

  IF submitter_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  msg := format(
    'PO %s was rejected%s%s',
    po.po_number,
    CASE WHEN p_rejected_by IS NOT NULL AND trim(p_rejected_by) <> '' THEN format(' by %s', p_rejected_by) ELSE '' END,
    CASE
      WHEN p_rejection_reason IS NOT NULL AND trim(p_rejection_reason) <> ''
      THEN format('. Reason: %s', p_rejection_reason)
      ELSE ''
    END
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    submitter_uid,
    'Approvals'::notification_category,
    'Purchase order rejected',
    msg,
    true,
    '/purchase-orders/' || po.id::text,
    'View PO',
    po.branch_id,
    jsonb_build_object(
      'purchaseOrderId', po.id,
      'poNumber', po.po_number,
      'supplierName', supplier_name,
      'submittedBy', po.submitted_by,
      'rejectedBy', p_rejected_by,
      'rejectionReason', p_rejection_reason,
      'branchName', branch_name,
      'totalAmount', po.total_amount,
      'currency', po.currency,
      'lineCount', line_count,
      'status', po.status
    ),
    'purchase_order_rejected'
  );

  RETURN 1;
END;
$$;

-- Accepted PO: notify the employee who submitted it for approval.
CREATE OR REPLACE FUNCTION notify_po_submitter_accepted(
  p_po_id UUID,
  p_accepted_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status IS DISTINCT FROM 'Accepted' THEN
    RAISE EXCEPTION 'PO % is not Accepted (current: %)', po.po_number, po.status;
  END IF;

  submitter_uid := resolve_po_submitter_auth_user_id(p_po_id);

  IF submitter_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  msg := format(
    'PO %s was accepted%s — confirm with the supplier when ready',
    po.po_number,
    CASE WHEN p_accepted_by IS NOT NULL AND trim(p_accepted_by) <> '' THEN format(' by %s', p_accepted_by) ELSE '' END
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    submitter_uid,
    'Approvals'::notification_category,
    'Purchase order accepted',
    msg,
    false,
    '/purchase-orders/' || po.id::text,
    'View PO',
    po.branch_id,
    jsonb_build_object(
      'purchaseOrderId', po.id,
      'poNumber', po.po_number,
      'supplierName', supplier_name,
      'submittedBy', po.submitted_by,
      'acceptedBy', p_accepted_by,
      'branchName', branch_name,
      'totalAmount', po.total_amount,
      'currency', po.currency,
      'lineCount', line_count,
      'status', po.status
    ),
    'purchase_order_accepted'
  );

  RETURN 1;
END;
$$;

-- Accepted → Confirmed: notify all executives and warehouse staff (incoming supplier order).
CREATE OR REPLACE FUNCTION notify_executives_and_warehouse_po_confirmed(
  p_po_id UUID,
  p_confirmed_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  recipient RECORD;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  msg_exec TEXT;
  msg_wh TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status IS DISTINCT FROM 'Confirmed' THEN
    RAISE EXCEPTION 'PO % is not Confirmed (current: %)', po.po_number, po.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  msg_exec := format(
    'PO %s confirmed with supplier%s — %s, %s item(s), total %s%s',
    po.po_number,
    CASE WHEN p_confirmed_by IS NOT NULL AND trim(p_confirmed_by) <> '' THEN format(' by %s', p_confirmed_by) ELSE '' END,
    COALESCE(supplier_name, 'No supplier'),
    line_count,
    CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
    to_char(COALESCE(po.total_amount, 0), 'FM999,999,990.00')
  );

  msg_wh := format(
    'PO %s is confirmed with %s — %s item(s) incoming%s, ready to receive',
    po.po_number,
    COALESCE(supplier_name, 'the supplier'),
    line_count,
    CASE WHEN branch_name IS NOT NULL AND trim(branch_name) <> '' THEN format(' at %s', branch_name) ELSE '' END
  );

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Approvals'::notification_category,
      'Purchase order confirmed',
      msg_exec,
      false,
      '/purchase-orders/' || po.id::text,
      'View PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'confirmedBy', p_confirmed_by,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'audience', 'executive'
      ),
      'purchase_order_confirmed'
    );
    inserted := inserted + 1;
  END LOOP;

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Warehouse'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Inventory'::notification_category,
      'Purchase order ready to receive',
      msg_wh,
      false,
      '/purchase-orders/' || po.id::text,
      'Receive PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'confirmedBy', p_confirmed_by,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'audience', 'warehouse'
      ),
      'purchase_order_confirmed'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_po_submitted_for_approval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_po_submitter_cancelled(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_po_submitter_rejected(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_po_submitter_accepted(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_executives_and_warehouse_po_confirmed(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION resolve_po_submitter_auth_user_id(UUID) IS
  'Resolve auth.users.id for the employee who submitted a purchase order.';
COMMENT ON FUNCTION notify_executives_po_submitted_for_approval(UUID) IS
  'Fan-out in-app notification to all active Executive users when a PO is submitted for approval.';
COMMENT ON FUNCTION notify_po_submitter_cancelled(UUID, TEXT, TEXT) IS
  'In-app notification to the employee who submitted a PO when it is cancelled by someone else.';
COMMENT ON FUNCTION notify_po_submitter_rejected(UUID, TEXT, TEXT) IS
  'In-app notification to the employee who submitted a PO when it is rejected.';
COMMENT ON FUNCTION notify_po_submitter_accepted(UUID, TEXT) IS
  'In-app notification to the employee who submitted a PO when it is accepted.';
COMMENT ON FUNCTION notify_executives_and_warehouse_po_confirmed(UUID, TEXT) IS
  'Fan-out in-app notification to all active Executive and Warehouse users when a PO is confirmed with the supplier.';

-- Receive (partial or full): notify all executives and warehouse staff.
CREATE OR REPLACE FUNCTION notify_executives_and_warehouse_po_received(
  p_po_id UUID,
  p_received_by TEXT DEFAULT NULL,
  p_quantity_received NUMERIC DEFAULT 0,
  p_is_full BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  recipient RECORD;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  total_received NUMERIC;
  total_ordered NUMERIC;
  qty_ratio TEXT;
  recorded_suffix TEXT;
  msg_exec TEXT;
  msg_wh TEXT;
  title_val TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status NOT IN ('Partially Received', 'Completed') THEN
    RAISE EXCEPTION 'PO % receive not recorded (current: %)', po.po_number, po.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  SELECT
    COALESCE(SUM(quantity_received), 0),
    COALESCE(SUM(quantity_ordered), 0)
  INTO total_received, total_ordered
  FROM purchase_order_items
  WHERE order_id = po.id;

  qty_ratio := format(
    '%s / %s',
    to_char(total_received, 'FM999,999,990.##'),
    to_char(total_ordered, 'FM999,999,990.##')
  );

  recorded_suffix := CASE
    WHEN p_received_by IS NOT NULL AND trim(p_received_by) <> '' THEN format(' by %s', p_received_by)
    ELSE ''
  END;

  IF p_is_full OR po.status = 'Completed' THEN
    title_val := 'Purchase order fully received';
    msg_exec := format(
      'PO %s from %s fully received%s — %s received, %s item(s), total %s%s',
      po.po_number,
      COALESCE(supplier_name, 'supplier'),
      recorded_suffix,
      qty_ratio,
      line_count,
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(COALESCE(po.total_amount, 0), 'FM999,999,990.00')
    );
    msg_wh := format(
      'PO %s from %s fully received%s — %s received%s',
      po.po_number,
      COALESCE(supplier_name, 'the supplier'),
      recorded_suffix,
      qty_ratio,
      CASE WHEN branch_name IS NOT NULL AND trim(branch_name) <> '' THEN format(' at %s', branch_name) ELSE '' END
    );
  ELSE
    title_val := 'Partial receipt recorded';
    msg_exec := format(
      'Partial receipt on PO %s (%s)%s — %s received, %s item(s)',
      po.po_number,
      COALESCE(supplier_name, 'supplier'),
      recorded_suffix,
      qty_ratio,
      line_count
    );
    msg_wh := format(
      'Partial receipt on PO %s from %s%s — %s received',
      po.po_number,
      COALESCE(supplier_name, 'the supplier'),
      recorded_suffix,
      qty_ratio
    );
  END IF;

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Inventory'::notification_category,
      title_val,
      msg_exec,
      false,
      '/purchase-orders/' || po.id::text,
      'View PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'receivedBy', p_received_by,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'quantityReceived', total_received,
        'quantityOrdered', total_ordered,
        'quantityReceivedOnEvent', COALESCE(p_quantity_received, 0),
        'isFullReceive', p_is_full OR po.status = 'Completed',
        'audience', 'executive'
      ),
      'purchase_order_received'
    );
    inserted := inserted + 1;
  END LOOP;

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Warehouse'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Inventory'::notification_category,
      title_val,
      msg_wh,
      false,
      '/purchase-orders/' || po.id::text,
      'View PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'receivedBy', p_received_by,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'quantityReceived', total_received,
        'quantityOrdered', total_ordered,
        'quantityReceivedOnEvent', COALESCE(p_quantity_received, 0),
        'isFullReceive', p_is_full OR po.status = 'Completed',
        'audience', 'warehouse'
      ),
      'purchase_order_received'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Payment recorded on PO: notify executives only.
CREATE OR REPLACE FUNCTION notify_executives_po_payment_recorded(
  p_po_id UUID,
  p_recorded_by TEXT DEFAULT NULL,
  p_payment_amount NUMERIC DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  exec RECORD;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  payment_total NUMERIC;
  is_paid_in_full BOOLEAN;
  notif_title TEXT;
  event_type_val TEXT;
  recorded_suffix TEXT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  payment_total := COALESCE(p_payment_amount, 0);

  IF payment_total <= 0 THEN
    RETURN 0;
  END IF;

  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  recorded_suffix := CASE
    WHEN p_recorded_by IS NOT NULL AND trim(p_recorded_by) <> '' THEN format(' by %s', p_recorded_by)
    ELSE ''
  END;

  is_paid_in_full := COALESCE(po.amount_paid, 0) >= COALESCE(po.total_amount, 0)
    AND COALESCE(po.total_amount, 0) > 0
    OR po.payment_status = 'Paid';

  IF is_paid_in_full THEN
    notif_title := 'Purchase order paid in full';
    event_type_val := 'purchase_order_payment_completed';
    msg := format(
      'PO %s (%s) is now fully paid%s — final payment %s%s, total %s%s',
      po.po_number,
      COALESCE(supplier_name, 'supplier'),
      recorded_suffix,
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(payment_total, 'FM999,999,990.00'),
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(COALESCE(po.total_amount, 0), 'FM999,999,990.00')
    );
  ELSE
    notif_title := 'PO payment recorded';
    event_type_val := 'purchase_order_payment_recorded';
    msg := format(
      'Payment of %s%s recorded on PO %s (%s)%s — paid %s%s / total %s%s',
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(payment_total, 'FM999,999,990.00'),
      po.po_number,
      COALESCE(supplier_name, 'supplier'),
      recorded_suffix,
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(COALESCE(po.amount_paid, 0), 'FM999,999,990.00'),
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(COALESCE(po.total_amount, 0), 'FM999,999,990.00')
    );
  END IF;

  FOR exec IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      exec.auth_user_id,
      'Payment'::notification_category,
      notif_title,
      msg,
      is_paid_in_full,
      '/purchase-orders/' || po.id::text,
      'View PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'amountPaid', po.amount_paid,
        'paymentStatus', po.payment_status,
        'paidInFull', is_paid_in_full,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'recordedBy', p_recorded_by,
        'paymentAmount', payment_total
      ),
      event_type_val
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_and_warehouse_po_received(UUID, TEXT, NUMERIC, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_executives_po_payment_recorded(UUID, TEXT, NUMERIC) TO authenticated;

COMMENT ON FUNCTION notify_executives_and_warehouse_po_received(UUID, TEXT, NUMERIC, BOOLEAN) IS
  'Fan-out in-app notification to all active Executive and Warehouse users when a PO receipt is recorded.';
COMMENT ON FUNCTION notify_executives_po_payment_recorded(UUID, TEXT, NUMERIC) IS
  'In-app notification to all active executives when a payment is recorded on a purchase order.';
