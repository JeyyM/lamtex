-- Notify the assigned agent when an "other" order proof is uploaded (unless the agent uploaded it).
-- Run in Supabase SQL editor after notifications_order_delivery_proof_uploaded.sql.

CREATE OR REPLACE FUNCTION notify_agent_order_other_proof_uploaded(
  p_order_id UUID,
  p_uploaded_by TEXT DEFAULT NULL,
  p_uploader_employee_id UUID DEFAULT NULL,
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
  proof_label TEXT;
  uploaded_suffix TEXT;
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

  proof_label := CASE
    WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 other document'
    ELSE format('%s other documents', COALESCE(p_proof_count, 1))
  END;

  uploaded_suffix := CASE
    WHEN p_uploaded_by IS NOT NULL AND trim(p_uploaded_by) <> '' THEN format(' by %s', p_uploaded_by)
    ELSE ''
  END;

  msg := format(
    '%s uploaded for order %s (%s)%s',
    proof_label,
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    uploaded_suffix
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
    'Other document uploaded',
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
      'uploadedBy', p_uploaded_by,
      'proofCount', COALESCE(p_proof_count, 1),
      'proofType', 'other',
      'requiredDate', o.required_date,
      'deliveryAddress', o.delivery_address,
      'deliveryType', o.delivery_type,
      'urgency', o.urgency
    ),
    'order_other_proof_uploaded'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_agent_order_other_proof_uploaded(UUID, TEXT, UUID, INT) TO authenticated;

COMMENT ON FUNCTION notify_agent_order_other_proof_uploaded(UUID, TEXT, UUID, INT) IS
  'In-app notification to the assigned agent when an other order proof is uploaded, skipped when the uploader is that agent.';
