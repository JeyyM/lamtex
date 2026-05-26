-- Order-created notifications for executives (in-app feed).
-- Run in Supabase SQL editor. Also folded into database/schema.sql.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Creates one in-app notification per active Executive with a linked auth account.
CREATE OR REPLACE FUNCTION notify_executives_order_created(p_order_id UUID)
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

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s created by %s for %s — %s item(s), total ₱%s',
    o.order_number,
    COALESCE(o.agent_name, 'Unknown agent'),
    COALESCE(o.customer_name, 'Unknown customer'),
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
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
      'Approvals'::notification_category,
      'New order created',
      msg,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
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
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'urgency', o.urgency
      ),
      'order_created'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_order_created(UUID) TO authenticated;

COMMENT ON FUNCTION notify_executives_order_created(UUID) IS
  'Fan-out in-app notification to all active Executive users when an order is created.';
