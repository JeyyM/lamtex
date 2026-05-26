-- Notify executives when a rejected order is revised and resubmitted (Rejected → Pending).
-- Run in Supabase SQL editor after notifications_order_submitted_for_approval.sql.

CREATE OR REPLACE FUNCTION notify_executives_order_revised(p_order_id UUID)
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

  IF o.status IS DISTINCT FROM 'Pending'::order_status THEN
    RAISE EXCEPTION 'Order % is not Pending (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s revised and resubmitted by %s — %s for %s item(s), total ₱%s',
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
      'Order revised & resubmitted',
      msg,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
      '/orders/' || o.id::text,
      'Review revised order',
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
        'urgency', o.urgency,
        'discountPercent', o.discount_percent,
        'revised', true
      ),
      'order_revised'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_order_revised(UUID) TO authenticated;

COMMENT ON FUNCTION notify_executives_order_revised(UUID) IS
  'Fan-out in-app notification to all active Executive users when a rejected order is revised and resubmitted.';
