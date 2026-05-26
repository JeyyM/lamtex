-- Notify the assigned agent when a payment proof is uploaded (unless the agent uploaded it),
-- and notify executives when a payment amount is recorded (cash or credit > 0).
-- Run in Supabase SQL editor after notifications_order_other_proof_uploaded.sql.

CREATE OR REPLACE FUNCTION notify_agent_order_payment_proof_uploaded(
  p_order_id UUID,
  p_uploaded_by TEXT DEFAULT NULL,
  p_uploader_employee_id UUID DEFAULT NULL,
  p_proof_count INT DEFAULT 1,
  p_payment_cash NUMERIC DEFAULT 0,
  p_payment_credit NUMERIC DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  agent RECORD;
  branch_name TEXT;
  line_count INT;
  proof_label TEXT;
  uploaded_suffix TEXT;
  payment_total NUMERIC;
  is_paid_in_full BOOLEAN;
  notif_title TEXT;
  event_type_val TEXT;
  msg TEXT;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.agent_id IS NULL THEN
    RETURN 0;
  END IF;

  IF p_uploader_employee_id IS NOT NULL AND p_uploader_employee_id = o.agent_id THEN
    RETURN 0;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO agent
  FROM employees e
  WHERE e.id = o.agent_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF agent.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  payment_total := COALESCE(p_payment_cash, 0) + COALESCE(p_payment_credit, 0);
  is_paid_in_full := COALESCE(o.balance_due, 0) <= 0
    OR o.payment_status = 'Paid'::payment_status;

  proof_label := CASE
    WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 payment proof'
    ELSE format('%s payment proofs', COALESCE(p_proof_count, 1))
  END;

  uploaded_suffix := CASE
    WHEN p_uploaded_by IS NOT NULL AND trim(p_uploaded_by) <> '' THEN format(' by %s', p_uploaded_by)
    ELSE ''
  END;

  IF is_paid_in_full AND payment_total > 0 THEN
    notif_title := 'Order paid in full';
    event_type_val := 'order_payment_completed';
    msg := format(
      'Order %s (%s) is now fully paid%s — final payment cash ₱%s, credit ₱%s (total paid ₱%s)',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      uploaded_suffix,
      to_char(COALESCE(p_payment_cash, 0), 'FM999,999,990.00'),
      to_char(COALESCE(p_payment_credit, 0), 'FM999,999,990.00'),
      to_char(COALESCE(o.amount_paid, 0), 'FM999,999,990.00')
    );
  ELSIF payment_total > 0 THEN
    notif_title := 'Payment proof uploaded';
    event_type_val := 'order_payment_proof_uploaded';
    msg := format(
      'Payment proof recorded for order %s (%s): cash ₱%s, credit ₱%s%s — balance ₱%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      to_char(COALESCE(p_payment_cash, 0), 'FM999,999,990.00'),
      to_char(COALESCE(p_payment_credit, 0), 'FM999,999,990.00'),
      uploaded_suffix,
      to_char(COALESCE(o.balance_due, 0), 'FM999,999,990.00')
    );
  ELSE
    notif_title := 'Payment proof uploaded';
    event_type_val := 'order_payment_proof_uploaded';
    msg := format(
      '%s uploaded for order %s (%s)%s',
      proof_label,
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      uploaded_suffix
    );
  END IF;

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
    agent.auth_user_id,
    'Payment'::notification_category,
    notif_title,
    msg,
    is_paid_in_full AND payment_total > 0,
    '/orders/' || o.id::text,
    'View order',
    o.branch_id,
    jsonb_build_object(
      'orderId', o.id,
      'orderNumber', o.order_number,
      'customerName', o.customer_name,
      'agentName', o.agent_name,
      'branchName', branch_name,
      'totalAmount', o.total_amount,
      'amountPaid', o.amount_paid,
      'balanceDue', o.balance_due,
      'paymentStatus', o.payment_status,
      'paidInFull', is_paid_in_full AND payment_total > 0,
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'uploadedBy', p_uploaded_by,
      'proofCount', COALESCE(p_proof_count, 1),
      'proofType', 'payment',
      'paymentCash', COALESCE(p_payment_cash, 0),
      'paymentCredit', COALESCE(p_payment_credit, 0),
      'requiredDate', o.required_date,
      'deliveryAddress', o.delivery_address,
      'deliveryType', o.delivery_type,
      'urgency', o.urgency
    ),
    event_type_val
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_agent_order_payment_proof_uploaded(UUID, TEXT, UUID, INT, NUMERIC, NUMERIC) TO authenticated;

COMMENT ON FUNCTION notify_agent_order_payment_proof_uploaded(UUID, TEXT, UUID, INT, NUMERIC, NUMERIC) IS
  'In-app notification to the assigned agent when a payment proof is uploaded, skipped when the uploader is that agent.';


CREATE OR REPLACE FUNCTION notify_executives_order_payment_recorded(
  p_order_id UUID,
  p_recorded_by TEXT DEFAULT NULL,
  p_payment_cash NUMERIC DEFAULT 0,
  p_payment_credit NUMERIC DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  exec RECORD;
  branch_name TEXT;
  line_count INT;
  payment_total NUMERIC;
  is_paid_in_full BOOLEAN;
  notif_title TEXT;
  event_type_val TEXT;
  recorded_suffix TEXT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  payment_total := COALESCE(p_payment_cash, 0) + COALESCE(p_payment_credit, 0);

  IF payment_total <= 0 THEN
    RETURN 0;
  END IF;

  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  recorded_suffix := CASE
    WHEN p_recorded_by IS NOT NULL AND trim(p_recorded_by) <> '' THEN format(' by %s', p_recorded_by)
    ELSE ''
  END;

  is_paid_in_full := COALESCE(o.balance_due, 0) <= 0
    OR o.payment_status = 'Paid'::payment_status;

  IF is_paid_in_full THEN
    notif_title := 'Order paid in full';
    event_type_val := 'order_payment_completed';
    msg := format(
      'Order %s (%s) is now fully paid%s — final payment ₱%s, total ₱%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      recorded_suffix,
      to_char(payment_total, 'FM999,999,990.00'),
      to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
    );
  ELSE
    notif_title := 'Payment received';
    event_type_val := 'order_payment_recorded';
    msg := format(
      'Payment of ₱%s recorded on order %s (%s)%s — paid ₱%s / total ₱%s, balance ₱%s',
      to_char(payment_total, 'FM999,999,990.00'),
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      recorded_suffix,
      to_char(COALESCE(o.amount_paid, 0), 'FM999,999,990.00'),
      to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00'),
      to_char(COALESCE(o.balance_due, 0), 'FM999,999,990.00')
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
      '/orders/' || o.id::text,
      'View order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'amountPaid', o.amount_paid,
        'balanceDue', o.balance_due,
        'paymentStatus', o.payment_status,
        'paidInFull', is_paid_in_full,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'recordedBy', p_recorded_by,
        'paymentCash', COALESCE(p_payment_cash, 0),
        'paymentCredit', COALESCE(p_payment_credit, 0),
        'paymentAmount', payment_total,
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'deliveryType', o.delivery_type,
        'urgency', o.urgency
      ),
      event_type_val
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_order_payment_recorded(UUID, TEXT, NUMERIC, NUMERIC) TO authenticated;

COMMENT ON FUNCTION notify_executives_order_payment_recorded(UUID, TEXT, NUMERIC, NUMERIC) IS
  'In-app notification to all active executives when a payment is recorded on an order (cash or credit > 0).';
