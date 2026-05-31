-- In-app notifications when a trip is marked delayed: branch logistics + agents on affected orders.
-- Affected = orders on the trip that are not Delivered, Partially Fulfilled, Completed, or Cancelled.
-- Run in Supabase SQL editor after notifications_trip_driver_assigned.sql.

CREATE OR REPLACE FUNCTION notify_trip_delayed(
  p_trip_id UUID,
  p_delay_reason TEXT DEFAULT NULL,
  p_reported_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  o RECORD;
  logist RECORD;
  agent_rec RECORD;
  branch_name TEXT;
  reason_text TEXT;
  reporter TEXT;
  affected_count INT := 0;
  order_summary TEXT := '';
  msg_logistics TEXT;
  msg_agent TEXT;
  inserted INT := 0;
  logistics_notified BOOLEAN := FALSE;
BEGIN
  SELECT
    tr.id,
    tr.trip_number,
    tr.vehicle_name,
    tr.driver_name,
    tr.branch_id,
    tr.order_ids
  INTO t
  FROM trips tr
  WHERE tr.id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id;
  END IF;

  reason_text := NULLIF(trim(COALESCE(p_delay_reason, '')), '');
  reporter := NULLIF(trim(COALESCE(p_reported_by, '')), '');

  IF t.branch_id IS NOT NULL THEN
    SELECT name INTO branch_name FROM branches WHERE id = t.branch_id;
  END IF;

  FOR o IN
    SELECT ord.id, ord.order_number, ord.customer_name, ord.agent_id, ord.status, ord.urgency
    FROM orders ord
    WHERE ord.id = ANY(COALESCE(t.order_ids, ARRAY[]::uuid[]))
      AND ord.status NOT IN (
        'Delivered'::order_status,
        'Partially Fulfilled'::order_status,
        'Completed'::order_status,
        'Cancelled'::order_status
      )
    ORDER BY ord.order_number
  LOOP
    affected_count := affected_count + 1;
    IF order_summary <> '' THEN
      order_summary := order_summary || ', ';
    END IF;
    order_summary := order_summary || format('%s (%s)', o.order_number, COALESCE(o.customer_name, 'customer'));

    IF o.agent_id IS NOT NULL THEN
      SELECT e.auth_user_id
      INTO agent_rec
      FROM employees e
      WHERE e.id = o.agent_id
        AND e.status = 'active'::employee_status
        AND e.auth_user_id IS NOT NULL;

      IF agent_rec.auth_user_id IS NOT NULL THEN
        msg_agent := format(
          'Trip %s was marked delayed for order %s (%s)%s%s',
          t.trip_number,
          o.order_number,
          COALESCE(o.customer_name, 'your customer'),
          CASE WHEN reason_text IS NOT NULL THEN format(' — %s', reason_text) ELSE '' END,
          CASE WHEN reporter IS NOT NULL THEN format(' (reported by %s)', reporter) ELSE '' END
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
          agent_rec.auth_user_id,
          'Delivery'::notification_category,
          'Trip delay — your order',
          msg_agent,
          o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
          '/orders/' || o.id::text,
          'View order',
          t.branch_id,
          jsonb_build_object(
            'tripId', t.id,
            'tripNumber', t.trip_number,
            'vehicleName', t.vehicle_name,
            'driverName', t.driver_name,
            'orderId', o.id,
            'orderNumber', o.order_number,
            'customerName', o.customer_name,
            'orderStatus', o.status,
            'delayReason', reason_text,
            'reportedBy', reporter,
            'branchName', branch_name
          ),
          'trip_delayed'
        );
        inserted := inserted + 1;
      END IF;
    END IF;
  END LOOP;

  IF affected_count = 0 OR t.branch_id IS NULL THEN
    RETURN inserted;
  END IF;

  msg_logistics := format(
    'Trip %s (%s%s) marked delayed — %s order(s) still outstanding: %s%s%s',
    t.trip_number,
    COALESCE(t.vehicle_name, 'vehicle TBD'),
    CASE WHEN t.driver_name IS NOT NULL AND trim(t.driver_name) <> '' THEN format(', %s', trim(t.driver_name)) ELSE '' END,
    affected_count,
    order_summary,
    CASE WHEN reason_text IS NOT NULL THEN format('. Reason: %s', reason_text) ELSE '' END,
    CASE WHEN reporter IS NOT NULL THEN format(' (reported by %s)', reporter) ELSE '' END
  );

  FOR logist IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Logistics'::user_role
      AND e.branch_id = t.branch_id
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
      logist.auth_user_id,
      'Delivery'::notification_category,
      'Trip delayed',
      msg_logistics,
      true,
      '/logistics?tab=dispatch',
      'View dispatch',
      t.branch_id,
      jsonb_build_object(
        'tripId', t.id,
        'tripNumber', t.trip_number,
        'vehicleName', t.vehicle_name,
        'driverName', t.driver_name,
        'delayReason', reason_text,
        'reportedBy', reporter,
        'branchName', branch_name,
        'affectedOrderCount', affected_count
      ),
      'trip_delayed'
    );
    inserted := inserted + 1;
    logistics_notified := TRUE;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_trip_delayed(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_trip_delayed(UUID, TEXT, TEXT) IS
  'Notify branch logistics and assigned agents when a trip is delayed (skips delivered/partially fulfilled/completed/cancelled orders).';
