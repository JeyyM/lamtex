-- Notify executives or agent when an order is cancelled (role-dependent routing from client).
-- Run in Supabase SQL editor after notifications_order_decision.sql.

CREATE OR REPLACE FUNCTION notify_executives_order_cancelled(
  p_order_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
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
  msg TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Cancelled'::order_status THEN
    RAISE EXCEPTION 'Order % is not Cancelled (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s cancelled by agent %s — %s%s',
    o.order_number,
    COALESCE(p_cancelled_by, o.agent_name, 'Unknown'),
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE
      WHEN p_cancellation_reason IS NOT NULL AND trim(p_cancellation_reason) <> ''
      THEN format('. Reason: %s', p_cancellation_reason)
      ELSE ''
    END
  );

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
      'System'::notification_category,
      'Order cancelled by agent',
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
        'cancelledBy', p_cancelled_by,
        'cancellationReason', p_cancellation_reason,
        'requiredDate', o.required_date,
        'urgency', o.urgency
      ),
      'order_cancelled_by_agent'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_agent_order_cancelled(
  p_order_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
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

  IF o.status IS DISTINCT FROM 'Cancelled'::order_status THEN
    RAISE EXCEPTION 'Order % is not Cancelled (current: %)', o.order_number, o.status;
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
    'Order %s for %s was cancelled%s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_cancelled_by IS NOT NULL AND trim(p_cancelled_by) <> '' THEN format(' by %s', p_cancelled_by) ELSE '' END,
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
    agent.auth_user_id,
    'System'::notification_category,
    'Order cancelled',
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
      'cancelledBy', p_cancelled_by,
      'cancellationReason', p_cancellation_reason,
      'requiredDate', o.required_date,
      'urgency', o.urgency
    ),
    'order_cancelled_by_executive'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_order_cancelled(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_agent_order_cancelled(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_executives_order_cancelled(UUID, TEXT, TEXT) IS
  'Fan-out in-app notification to executives when an agent cancels an order.';
COMMENT ON FUNCTION notify_agent_order_cancelled(UUID, TEXT, TEXT) IS
  'In-app notification to the assigned agent when an executive cancels their order.';
