-- Notify the assigned agent when commission is marked paid out on payment proof(s).
-- Run in Supabase SQL editor after notifications_order_payment_proof.sql.

CREATE OR REPLACE FUNCTION notify_agent_order_commission_paid(
  p_order_id UUID,
  p_paid_by TEXT DEFAULT NULL,
  p_commission_amount NUMERIC DEFAULT 0,
  p_cash_amount NUMERIC DEFAULT 0,
  p_proof_count INT DEFAULT 1
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
  paid_suffix TEXT;
  msg TEXT;
  title TEXT;
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

  paid_suffix := CASE
    WHEN p_paid_by IS NOT NULL AND trim(p_paid_by) <> '' THEN format(' by %s', p_paid_by)
    ELSE ''
  END;

  IF COALESCE(p_proof_count, 1) <= 1 THEN
    title := 'Commission paid out';
    msg := format(
      'Commission of ₱%s paid out on order %s (%s) for cash payment ₱%s%s',
      to_char(COALESCE(p_commission_amount, 0), 'FM999,999,990.00'),
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      to_char(COALESCE(p_cash_amount, 0), 'FM999,999,990.00'),
      paid_suffix
    );
  ELSE
    title := 'Commissions paid out';
    msg := format(
      'Commission of ₱%s paid out on order %s (%s) — %s payment proof(s), cash ₱%s%s',
      to_char(COALESCE(p_commission_amount, 0), 'FM999,999,990.00'),
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      COALESCE(p_proof_count, 1),
      to_char(COALESCE(p_cash_amount, 0), 'FM999,999,990.00'),
      paid_suffix
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
    title,
    msg,
    false,
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
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'paidBy', p_paid_by,
      'commissionAmount', COALESCE(p_commission_amount, 0),
      'cashAmount', COALESCE(p_cash_amount, 0),
      'proofCount', COALESCE(p_proof_count, 1),
      'requiredDate', o.required_date,
      'deliveryAddress', o.delivery_address,
      'deliveryType', o.delivery_type,
      'urgency', o.urgency
    ),
    'order_commission_paid'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_agent_order_commission_paid(UUID, TEXT, NUMERIC, NUMERIC, INT) TO authenticated;

COMMENT ON FUNCTION notify_agent_order_commission_paid(UUID, TEXT, NUMERIC, NUMERIC, INT) IS
  'In-app notification to the assigned agent when commission is marked paid out on payment proof(s).';
