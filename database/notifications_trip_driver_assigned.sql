-- Notify the assigned truck driver when they are assigned to a trip/route or IBR shipment.
-- Run in Supabase SQL editor after notifications_order_scheduled.sql and inter_branch_request_trip.sql.

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
  dest_label TEXT;
  ibr_number TEXT;
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
    tr.destinations,
    tr.branch_id,
    tr.inter_branch_request_id
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
  dest_label := COALESCE(t.destinations[1], 'destination branch');

  IF t.inter_branch_request_id IS NOT NULL THEN
    SELECT ibr.ibr_number INTO ibr_number
    FROM inter_branch_requests ibr
    WHERE ibr.id = t.inter_branch_request_id;
  END IF;

  schedule_label := COALESCE(
    to_char(t.scheduled_date, 'Mon DD, YYYY'),
    'the planned date'
  );

  IF t.inter_branch_request_id IS NOT NULL THEN
    msg := format(
      'You were assigned to inter-branch shipment %s on %s — delivering to %s, truck %s, driver %s%s',
      COALESCE(ibr_number, t.trip_number),
      schedule_label,
      dest_label,
      COALESCE(t.vehicle_name, 'TBD'),
      COALESCE(NULLIF(trim(t.driver_name), ''), 'TBD'),
      CASE WHEN p_assigned_by IS NOT NULL AND trim(p_assigned_by) <> '' THEN format(' (by %s)', p_assigned_by) ELSE '' END
    );
  ELSE
    msg := format(
      'You were assigned to trip %s on %s — %s order(s), vehicle %s%s',
      t.trip_number,
      schedule_label,
      order_count,
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
    CASE WHEN t.inter_branch_request_id IS NOT NULL THEN 'Inter-branch shipment assigned' ELSE 'Trip assigned to you' END,
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
      'assignedBy', p_assigned_by,
      'interBranchRequestId', t.inter_branch_request_id,
      'ibrNumber', ibr_number,
      'destinationLabel', dest_label
    ),
    'trip_assigned_to_driver'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_driver_trip_assigned(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_driver_trip_assigned(UUID, TEXT) IS
  'In-app notification to the assigned truck driver when they are assigned to a trip or inter-branch shipment.';
