-- Notify branch logistics staff when an order is marked Loading (warehouse started loading).
-- Run in Supabase SQL editor after notifications_order_logistics_ready.sql.

CREATE OR REPLACE FUNCTION notify_branch_logistics_order_loading(
  p_order_id UUID,
  p_marked_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  logist RECORD;
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

  IF o.status IS DISTINCT FROM 'Loading'::order_status THEN
    RAISE EXCEPTION 'Order % is not Loading (current: %)', o.order_number, o.status;
  END IF;

  IF o.branch_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s for %s is now loading at the warehouse%s (%s item(s), total ₱%s)',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_marked_by IS NOT NULL AND trim(p_marked_by) <> '' THEN format(' — started by %s', p_marked_by) ELSE '' END,
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  FOR logist IN
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
      logist.auth_user_id,
      'Delivery'::notification_category,
      'Order loading started',
      msg,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
      '/logistics?order=' || o.id::text || '&tab=routes',
      'View in logistics',
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
        'markedBy', p_marked_by,
        'requiredDate', o.required_date,
        'scheduledDepartureDate', o.scheduled_departure_date,
        'deliveryAddress', o.delivery_address,
        'deliveryType', o.delivery_type,
        'urgency', o.urgency
      ),
      'order_loading'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_branch_logistics_order_loading(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_branch_logistics_order_loading(UUID, TEXT) IS
  'Fan-out in-app notification to active Logistics staff at the order branch when an order is marked Loading.';
