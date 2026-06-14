-- Notify a truck driver when they are removed or reassigned off a trip.
-- Run in Supabase SQL editor after notifications_trip_driver_assigned.sql.

CREATE OR REPLACE FUNCTION notify_driver_trip_unassigned(
  p_trip_id UUID,
  p_previous_driver_id UUID,
  p_assigned_by TEXT DEFAULT NULL,
  p_new_driver_name TEXT DEFAULT NULL
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
  schedule_label TEXT;
  msg TEXT;
  new_driver_label TEXT;
BEGIN
  IF p_previous_driver_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT
    tr.id,
    tr.trip_number,
    tr.scheduled_date,
    tr.vehicle_name,
    tr.driver_id,
    tr.driver_name,
    tr.branch_id,
    tr.inter_branch_request_id
  INTO t
  FROM trips tr
  WHERE tr.id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO driver
  FROM employees e
  WHERE e.id = p_previous_driver_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF driver.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = t.branch_id;

  schedule_label := COALESCE(
    to_char(t.scheduled_date, 'Mon DD, YYYY'),
    'the planned date'
  );

  new_driver_label := NULLIF(trim(COALESCE(p_new_driver_name, '')), '');

  IF new_driver_label IS NOT NULL THEN
    msg := format(
      'You were removed from trip %s on %s — reassigned to %s%s',
      t.trip_number,
      schedule_label,
      new_driver_label,
      CASE WHEN p_assigned_by IS NOT NULL AND trim(p_assigned_by) <> '' THEN format(' (by %s)', p_assigned_by) ELSE '' END
    );
  ELSE
    msg := format(
      'You are no longer assigned to trip %s on %s — vehicle %s%s',
      t.trip_number,
      schedule_label,
      COALESCE(t.vehicle_name, 'TBD'),
      CASE WHEN p_assigned_by IS NOT NULL AND trim(p_assigned_by) <> '' THEN format(' (by %s)', p_assigned_by) ELSE '' END
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
    driver.auth_user_id,
    'Delivery'::notification_category,
    'Trip assignment removed',
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
      'previousDriverId', p_previous_driver_id,
      'newDriverId', t.driver_id,
      'newDriverName', new_driver_label,
      'branchName', branch_name,
      'assignedBy', p_assigned_by,
      'interBranchRequestId', t.inter_branch_request_id
    ),
    'trip_unassigned_from_driver'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_driver_trip_unassigned(UUID, UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_driver_trip_unassigned(UUID, UUID, TEXT, TEXT) IS
  'In-app notification to the previous truck driver when they are removed or reassigned off a trip.';
