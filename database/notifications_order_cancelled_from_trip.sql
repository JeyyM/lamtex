-- In-app notifications when an order is cancelled from a trip: agent, branch logistics, and executives.
-- Run in Supabase SQL editor after notifications_order_cancelled.sql.

CREATE OR REPLACE FUNCTION notify_order_cancelled_from_trip(
  p_order_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL,
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
  trip_ref TEXT;
  reason_suffix TEXT;
  msg_agent TEXT;
  msg_logistics TEXT;
  msg_executive TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Cancelled'::order_status THEN
    RAISE EXCEPTION 'Order % is not Cancelled (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  trip_ref := NULLIF(trim(COALESCE(p_trip_number, '')), '');
  reason_suffix := CASE
    WHEN p_cancellation_reason IS NOT NULL AND trim(p_cancellation_reason) <> ''
    THEN format('. Reason: %s', p_cancellation_reason)
    ELSE ''
  END;

  msg_agent := format(
    'Order %s for %s was cancelled%s%s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN trip_ref IS NOT NULL THEN format(' from trip %s', trip_ref) ELSE '' END,
    CASE WHEN p_cancelled_by IS NOT NULL AND trim(p_cancelled_by) <> '' THEN format(' by %s', p_cancelled_by) ELSE '' END,
    reason_suffix
  );

  msg_logistics := format(
    'Order %s (%s) cancelled%s — removed from dispatch%s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN trip_ref IS NOT NULL THEN format(' from trip %s', trip_ref) ELSE '' END,
    CASE WHEN p_cancelled_by IS NOT NULL AND trim(p_cancelled_by) <> '' THEN format(' by %s', p_cancelled_by) ELSE '' END,
    reason_suffix
  );

  msg_executive := format(
    'Order %s for %s cancelled%s%s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN trip_ref IS NOT NULL THEN format(' from trip %s', trip_ref) ELSE '' END,
    CASE WHEN p_cancelled_by IS NOT NULL AND trim(p_cancelled_by) <> '' THEN format(' by %s', p_cancelled_by) ELSE '' END,
    reason_suffix
  );

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
        'System'::notification_category,
        'Order cancelled from trip',
        msg_agent,
        true,
        '/orders/' || o.id::text,
        'View order',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'agentName', o.agent_name,
          'branchName', branch_name,
          'tripNumber', trip_ref,
          'totalAmount', o.total_amount,
          'subtotal', o.subtotal,
          'lineCount', line_count,
          'status', o.status,
          'cancelledBy', p_cancelled_by,
          'cancellationReason', p_cancellation_reason,
          'requiredDate', o.required_date,
          'urgency', o.urgency
        ),
        'order_cancelled_from_trip'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  IF o.branch_id IS NOT NULL THEN
    FOR recipient IN
      SELECT e.auth_user_id
      FROM employees e
      WHERE e.user_role = 'Logistics'::user_role
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
        'System'::notification_category,
        'Order cancelled from trip',
        msg_logistics,
        true,
        '/logistics?tab=dispatch',
        'View dispatch',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'branchName', branch_name,
          'tripNumber', trip_ref,
          'totalAmount', o.total_amount,
          'lineCount', line_count,
          'status', o.status,
          'cancelledBy', p_cancelled_by,
          'cancellationReason', p_cancellation_reason
        ),
        'order_cancelled_from_trip'
      );
      inserted := inserted + 1;
    END LOOP;
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
      'System'::notification_category,
      'Order cancelled from trip',
      msg_executive,
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
        'tripNumber', trip_ref,
        'totalAmount', o.total_amount,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'cancelledBy', p_cancelled_by,
        'cancellationReason', p_cancellation_reason,
        'requiredDate', o.required_date,
        'urgency', o.urgency
      ),
      'order_cancelled_from_trip'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_order_cancelled_from_trip(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_order_cancelled_from_trip(UUID, TEXT, TEXT, TEXT) IS
  'Notify assigned agent, branch logistics, and executives when an order is cancelled from a trip.';
