-- Notify the assigned truck driver when they are assigned to a trip/route.
-- Run in Supabase SQL editor after notifications_order_scheduled.sql.

CREATE OR REPLACE FUNCTION notify_driver_trip_assigned(
  p_trip_id UUID,
  p_assigned_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  driver RECORD;
  branch_name TEXT;
  order_count INT;
  schedule_label TEXT;
  msg TEXT;
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

  IF t.driver_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO driver
  FROM employees e
  WHERE e.id = t.driver_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF driver.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = t.branch_id;
  order_count := COALESCE(array_length(t.order_ids, 1), 0);

  schedule_label := COALESCE(
    to_char(t.scheduled_date, 'Mon DD, YYYY'),
    'the planned date'
  );

  msg := format(
    'You were assigned to trip %s on %s — %s order(s), vehicle %s%s',
    t.trip_number,
    schedule_label,
    order_count,
    COALESCE(t.vehicle_name, 'TBD'),
    CASE WHEN p_assigned_by IS NOT NULL AND trim(p_assigned_by) <> '' THEN format(' (by %s)', p_assigned_by) ELSE '' END
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
    driver.auth_user_id,
    'Delivery'::notification_category,
    'Trip assigned to you',
    msg,
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
      'orderIds', to_jsonb(COALESCE(t.order_ids, ARRAY[]::uuid[])),
      'branchName', branch_name,
      'assignedBy', p_assigned_by
    ),
    'trip_assigned_to_driver'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_driver_trip_assigned(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_driver_trip_assigned(UUID, TEXT) IS
  'In-app notification to the assigned truck driver when they are assigned to a trip.';
