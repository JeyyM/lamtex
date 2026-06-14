-- Trip cancelled: notify branch logistics/warehouse, executives, driver, and per-order staff when orders return to Approved.
-- Run in Supabase SQL editor after notifications_order_scheduled.sql and notifications_trip_driver_unassigned.sql.

CREATE OR REPLACE FUNCTION notify_order_unscheduled_from_trip(
  p_order_id UUID,
  p_trip_number TEXT DEFAULT NULL,
  p_previous_scheduled_date DATE DEFAULT NULL,
  p_unscheduled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
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
  reason_suffix TEXT;
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

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  schedule_label := COALESCE(
    to_char(p_previous_scheduled_date, 'Mon DD, YYYY'),
    to_char(o.scheduled_departure_date, 'Mon DD, YYYY'),
    'the planned date'
  );

  trip_suffix := CASE
    WHEN p_trip_number IS NOT NULL AND trim(p_trip_number) <> '' THEN
      format(' (trip %s cancelled)', trim(p_trip_number))
    ELSE ' (delivery trip cancelled)'
  END;

  reason_suffix := CASE
    WHEN p_cancellation_reason IS NOT NULL AND trim(p_cancellation_reason) <> ''
    THEN format('. Reason: %s', p_cancellation_reason)
    ELSE ''
  END;

  msg_exec := format(
    'Order %s for %s was unscheduled%s — returned to Approved for %s%s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    trip_suffix,
    schedule_label,
    CASE WHEN p_unscheduled_by IS NOT NULL AND trim(p_unscheduled_by) <> '' THEN format(' by %s', p_unscheduled_by) ELSE '' END,
    reason_suffix
  );

  msg_wh := format(
    'Order %s for %s removed from cancelled trip%s — no longer scheduled for %s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    trip_suffix,
    schedule_label
  );

  msg_agent := format(
    'Order %s for %s was unscheduled%s — back in the dispatch queue%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    trip_suffix,
    reason_suffix
  );

  FOR recipient IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id, category, title, message, urgent, action_url, action_label, branch_id, metadata, event_type
    ) VALUES (
      recipient.auth_user_id,
      'Delivery'::notification_category,
      'Order unscheduled',
      msg_exec,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
      '/orders/' || o.id::text,
      'View order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'branchName', branch_name,
        'tripNumber', p_trip_number,
        'previousScheduledDate', p_previous_scheduled_date,
        'unscheduledBy', p_unscheduled_by,
        'cancellationReason', p_cancellation_reason,
        'status', o.status
      ),
      'order_unscheduled_from_trip'
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
        user_id, category, title, message, urgent, action_url, action_label, branch_id, metadata, event_type
      ) VALUES (
        recipient.auth_user_id,
        'Delivery'::notification_category,
        'Order unscheduled from trip',
        msg_wh,
        o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
        '/orders/' || o.id::text,
        'View order',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'branchName', branch_name,
          'tripNumber', p_trip_number,
          'previousScheduledDate', p_previous_scheduled_date,
          'unscheduledBy', p_unscheduled_by,
          'cancellationReason', p_cancellation_reason,
          'status', o.status
        ),
        'order_unscheduled_from_trip'
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
        user_id, category, title, message, urgent, action_url, action_label, branch_id, metadata, event_type
      ) VALUES (
        recipient.auth_user_id,
        'Delivery'::notification_category,
        'Customer order unscheduled',
        msg_agent,
        o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
        '/orders/' || o.id::text,
        'View order',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'branchName', branch_name,
          'tripNumber', p_trip_number,
          'previousScheduledDate', p_previous_scheduled_date,
          'unscheduledBy', p_unscheduled_by,
          'cancellationReason', p_cancellation_reason,
          'status', o.status
        ),
        'order_unscheduled_from_trip'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_order_unscheduled_from_trip(UUID, TEXT, DATE, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_order_unscheduled_from_trip(UUID, TEXT, DATE, TEXT, TEXT) IS
  'Fan-out in-app notification when an order is unscheduled because its delivery trip was cancelled.';


CREATE OR REPLACE FUNCTION notify_trip_cancelled(
  p_trip_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  recipient RECORD;
  driver RECORD;
  branch_name TEXT;
  order_count INT;
  schedule_label TEXT;
  reason_suffix TEXT;
  msg_logistics TEXT;
  msg_driver TEXT;
  inserted INT := 0;
BEGIN
  SELECT
    tr.id,
    tr.trip_number,
    tr.scheduled_date,
    tr.vehicle_name,
    tr.driver_id,
    tr.driver_name,
    tr.order_ids,
    tr.branch_id
  INTO t
  FROM trips tr
  WHERE tr.id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = t.branch_id;
  order_count := COALESCE(array_length(t.order_ids, 1), 0);

  schedule_label := COALESCE(
    to_char(t.scheduled_date, 'Mon DD, YYYY'),
    'the planned date'
  );

  reason_suffix := CASE
    WHEN p_cancellation_reason IS NOT NULL AND trim(p_cancellation_reason) <> ''
    THEN format('. Reason: %s', p_cancellation_reason)
    ELSE ''
  END;

  msg_logistics := format(
    'Trip %s on %s was cancelled — %s order(s) returned to the dispatch queue%s%s',
    t.trip_number,
    schedule_label,
    order_count,
    CASE WHEN p_cancelled_by IS NOT NULL AND trim(p_cancelled_by) <> '' THEN format(' by %s', p_cancelled_by) ELSE '' END,
    reason_suffix
  );

  FOR recipient IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id, category, title, message, urgent, action_url, action_label, branch_id, metadata, event_type
    ) VALUES (
      recipient.auth_user_id,
      'Delivery'::notification_category,
      'Trip cancelled',
      msg_logistics,
      false,
      '/logistics',
      'View logistics',
      t.branch_id,
      jsonb_build_object(
        'tripId', t.id,
        'tripNumber', t.trip_number,
        'scheduledDate', t.scheduled_date,
        'vehicleName', t.vehicle_name,
        'driverName', t.driver_name,
        'orderCount', order_count,
        'branchName', branch_name,
        'cancelledBy', p_cancelled_by,
        'cancellationReason', p_cancellation_reason
      ),
      'trip_cancelled'
    );
    inserted := inserted + 1;
  END LOOP;

  IF t.branch_id IS NOT NULL THEN
    FOR recipient IN
      SELECT e.auth_user_id
      FROM employees e
      WHERE e.user_role IN ('Logistics'::user_role, 'Warehouse'::user_role)
        AND e.branch_id = t.branch_id
        AND e.auth_user_id IS NOT NULL
        AND e.status = 'active'::employee_status
    LOOP
      INSERT INTO notifications (
        user_id, category, title, message, urgent, action_url, action_label, branch_id, metadata, event_type
      ) VALUES (
        recipient.auth_user_id,
        'Delivery'::notification_category,
        'Trip cancelled',
        msg_logistics,
        false,
        '/logistics',
        'View logistics',
        t.branch_id,
        jsonb_build_object(
          'tripId', t.id,
          'tripNumber', t.trip_number,
          'scheduledDate', t.scheduled_date,
          'vehicleName', t.vehicle_name,
          'driverName', t.driver_name,
          'orderCount', order_count,
          'branchName', branch_name,
          'cancelledBy', p_cancelled_by,
          'cancellationReason', p_cancellation_reason
        ),
        'trip_cancelled'
      );
      inserted := inserted + 1;
    END LOOP;
  END IF;

  IF t.driver_id IS NOT NULL THEN
    SELECT e.auth_user_id, e.employee_name
    INTO driver
    FROM employees e
    WHERE e.id = t.driver_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF driver.auth_user_id IS NOT NULL THEN
      msg_driver := format(
        'Trip %s on %s was cancelled — you are no longer assigned to this route%s%s',
        t.trip_number,
        schedule_label,
        CASE WHEN p_cancelled_by IS NOT NULL AND trim(p_cancelled_by) <> '' THEN format(' by %s', p_cancelled_by) ELSE '' END,
        reason_suffix
      );

      INSERT INTO notifications (
        user_id, category, title, message, urgent, action_url, action_label, branch_id, metadata, event_type
      ) VALUES (
        driver.auth_user_id,
        'Delivery'::notification_category,
        'Trip cancelled',
        msg_driver,
        false,
        '/',
        'Open driver dashboard',
        t.branch_id,
        jsonb_build_object(
          'tripId', t.id,
          'tripNumber', t.trip_number,
          'scheduledDate', t.scheduled_date,
          'vehicleName', t.vehicle_name,
          'driverId', t.driver_id,
          'driverName', t.driver_name,
          'orderCount', order_count,
          'branchName', branch_name,
          'cancelledBy', p_cancelled_by,
          'cancellationReason', p_cancellation_reason
        ),
        'trip_cancelled'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_trip_cancelled(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_trip_cancelled(UUID, TEXT, TEXT) IS
  'In-app notification to executives, branch logistics/warehouse staff, and the assigned driver when a trip is cancelled.';
