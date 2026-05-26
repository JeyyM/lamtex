-- Notify executives, branch warehouse staff, and the assigned agent when an order is scheduled.
-- Run in Supabase SQL editor after notifications_order_logistics_ready.sql.

CREATE OR REPLACE FUNCTION notify_order_scheduled(
  p_order_id UUID,
  p_scheduled_by TEXT DEFAULT NULL,
  p_trip_number TEXT DEFAULT NULL,
  p_scheduled_date DATE DEFAULT NULL,
  p_vehicle_name TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL
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
  schedule_label TEXT;
  trip_suffix TEXT;
  msg_exec TEXT;
  msg_wh TEXT;
  msg_agent TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Scheduled'::order_status THEN
    RAISE EXCEPTION 'Order % is not Scheduled (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  schedule_label := COALESCE(
    to_char(p_scheduled_date, 'Mon DD, YYYY'),
    to_char(o.scheduled_departure_date, 'Mon DD, YYYY'),
    'the planned date'
  );

  trip_suffix := CASE
    WHEN p_trip_number IS NOT NULL AND trim(p_trip_number) <> '' THEN
      format(' (trip %s)', trim(p_trip_number))
    ELSE ''
  END;

  msg_exec := format(
    'Order %s for %s scheduled for %s%s%s — %s item(s), total ₱%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    schedule_label,
    trip_suffix,
    CASE WHEN p_scheduled_by IS NOT NULL AND trim(p_scheduled_by) <> '' THEN format(' by %s', p_scheduled_by) ELSE '' END,
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  msg_wh := format(
    'Order %s for %s is scheduled for %s%s — prepare for loading (%s item(s))',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    schedule_label,
    trip_suffix,
    line_count
  );

  msg_agent := format(
    'Order %s for %s was scheduled for %s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    schedule_label,
    trip_suffix
  );

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
      'Order scheduled',
      msg_exec,
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
        'scheduledBy', p_scheduled_by,
        'tripNumber', p_trip_number,
        'scheduledDate', COALESCE(p_scheduled_date, o.scheduled_departure_date),
        'vehicleName', p_vehicle_name,
        'driverName', p_driver_name,
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'deliveryType', o.delivery_type,
        'urgency', o.urgency
      ),
      'order_scheduled'
    );
    inserted := inserted + 1;
  END LOOP;

  IF o.branch_id IS NOT NULL THEN
    FOR recipient IN
      SELECT e.auth_user_id
      FROM employees e
      WHERE e.user_role = 'Warehouse'::user_role
        AND e.branch_id = o.branch_id
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
        'Order scheduled for fulfillment',
        msg_wh,
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
          'scheduledBy', p_scheduled_by,
          'tripNumber', p_trip_number,
          'scheduledDate', COALESCE(p_scheduled_date, o.scheduled_departure_date),
          'vehicleName', p_vehicle_name,
          'driverName', p_driver_name,
          'requiredDate', o.required_date,
          'deliveryAddress', o.delivery_address,
          'deliveryType', o.delivery_type,
          'urgency', o.urgency
        ),
        'order_scheduled'
      );
      inserted := inserted + 1;
    END LOOP;
  END IF;

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
        'Customer order scheduled',
        msg_agent,
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
          'scheduledBy', p_scheduled_by,
          'tripNumber', p_trip_number,
          'scheduledDate', COALESCE(p_scheduled_date, o.scheduled_departure_date),
          'vehicleName', p_vehicle_name,
          'driverName', p_driver_name,
          'requiredDate', o.required_date,
          'deliveryAddress', o.delivery_address,
          'deliveryType', o.delivery_type,
          'urgency', o.urgency
        ),
        'order_scheduled'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_order_scheduled(UUID, TEXT, TEXT, DATE, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_order_scheduled(UUID, TEXT, TEXT, DATE, TEXT, TEXT) IS
  'Fan-out in-app notification to executives, branch warehouse staff, and the assigned agent when an order is scheduled.';
