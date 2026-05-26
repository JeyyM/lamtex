-- Notify the assigned agent when an order is approved or rejected.
-- Run in Supabase SQL editor after notifications_order_submitted_for_approval.sql.

CREATE OR REPLACE FUNCTION notify_agent_order_approved(
  p_order_id UUID,
  p_decided_by TEXT DEFAULT NULL
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
  msg TEXT;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Approved'::order_status THEN
    RAISE EXCEPTION 'Order % is not Approved (current: %)', o.order_number, o.status;
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

  msg := format(
    'Order %s for %s was approved%s — total ₱%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_decided_by IS NOT NULL AND trim(p_decided_by) <> '' THEN format(' by %s', p_decided_by) ELSE '' END,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
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
    agent.auth_user_id,
    'Approvals'::notification_category,
    'Order approved',
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
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'decidedBy', p_decided_by,
      'requiredDate', o.required_date,
      'urgency', o.urgency
    ),
    'order_approved'
  );

  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION notify_agent_order_rejected(
  p_order_id UUID,
  p_decided_by TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
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
  msg TEXT;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Rejected'::order_status THEN
    RAISE EXCEPTION 'Order % is not Rejected (current: %)', o.order_number, o.status;
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

  msg := format(
    'Order %s for %s was rejected%s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_decided_by IS NOT NULL AND trim(p_decided_by) <> '' THEN format(' by %s', p_decided_by) ELSE '' END,
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
    agent.auth_user_id,
    'Approvals'::notification_category,
    'Order rejected',
    msg,
    true,
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
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'decidedBy', p_decided_by,
      'rejectionReason', p_rejection_reason,
      'requiredDate', o.required_date,
      'urgency', o.urgency
    ),
    'order_rejected'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_agent_order_approved(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_agent_order_rejected(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_agent_order_approved(UUID, TEXT) IS
  'In-app notification to the assigned agent when their order is approved.';
COMMENT ON FUNCTION notify_agent_order_rejected(UUID, TEXT, TEXT) IS
  'In-app notification to the assigned agent when their order is rejected.';
