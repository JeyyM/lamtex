-- Notify executives and the assigned agent when delivery is recorded (Delivered or Partially Fulfilled).
-- Run in Supabase SQL editor after notifications_order_in_transit.sql.

CREATE OR REPLACE FUNCTION notify_order_delivery_recorded(
  p_order_id UUID,
  p_recorded_by TEXT DEFAULT NULL,
  p_trip_number TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  recipient RECORD;
  branch_name TEXT;
  line_count INT;
  trip_suffix TEXT;
  recorded_suffix TEXT;
  msg_exec TEXT;
  msg_agent TEXT;
  title_exec TEXT;
  title_agent TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status NOT IN ('Delivered'::order_status, 'Partially Fulfilled'::order_status) THEN
    RAISE EXCEPTION 'Order % delivery not recorded (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  trip_suffix := CASE
    WHEN p_trip_number IS NOT NULL AND trim(p_trip_number) <> '' THEN
      format(' (trip %s)', trim(p_trip_number))
    ELSE ''
  END;

  recorded_suffix := CASE
    WHEN p_recorded_by IS NOT NULL AND trim(p_recorded_by) <> '' THEN format(' by %s', p_recorded_by)
    ELSE ''
  END;

  IF o.status = 'Delivered'::order_status THEN
    title_exec := 'Order delivered';
    title_agent := 'Customer order delivered';
    msg_exec := format(
      'Order %s for %s was fully delivered%s%s — %s item(s), total ₱%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      trip_suffix,
      recorded_suffix,
      line_count,
      to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
    );
    msg_agent := format(
      'Order %s for %s was fully delivered%s%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      trip_suffix,
      recorded_suffix
    );
  ELSE
    title_exec := 'Partial delivery recorded';
    title_agent := 'Partial delivery recorded';
    msg_exec := format(
      'Partial delivery recorded for order %s (%s)%s%s — %s item(s), total ₱%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      trip_suffix,
      recorded_suffix,
      line_count,
      to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
    );
    msg_agent := format(
      'Partial delivery recorded for order %s for %s%s%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      trip_suffix,
      recorded_suffix
    );
  END IF;

  FOR recipient IN
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
      recipient.auth_user_id,
      'Delivery'::notification_category,
      title_exec,
      msg_exec,
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
        'recordedBy', p_recorded_by,
        'tripNumber', p_trip_number,
        'actualDelivery', o.actual_delivery,
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'deliveryType', o.delivery_type,
        'urgency', o.urgency
      ),
      'order_delivery_recorded'
    );
    inserted := inserted + 1;
  END LOOP;

  IF o.agent_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO recipient
    FROM employees e
    WHERE e.id = o.agent_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF recipient.auth_user_id IS NOT NULL THEN
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
        'Delivery'::notification_category,
        title_agent,
        msg_agent,
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
          'recordedBy', p_recorded_by,
          'tripNumber', p_trip_number,
          'actualDelivery', o.actual_delivery,
          'requiredDate', o.required_date,
          'deliveryAddress', o.delivery_address,
          'deliveryType', o.delivery_type,
          'urgency', o.urgency
        ),
        'order_delivery_recorded'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_order_delivery_recorded(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_order_delivery_recorded(UUID, TEXT, TEXT) IS
  'Fan-out in-app notification to executives and the assigned agent when delivery is recorded (Delivered or Partially Fulfilled).';
