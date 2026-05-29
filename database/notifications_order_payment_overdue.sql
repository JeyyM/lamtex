-- Order payment overdue: mark newly overdue orders, in-app notify executives + agent.
-- Run in Supabase SQL editor after notifications_order_payment_recorded.sql.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION order_compute_due_date(
  p_actual_delivery DATE,
  p_payment_terms payment_terms
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  terms TEXT;
  days INT;
BEGIN
  IF p_actual_delivery IS NULL THEN
    RETURN NULL;
  END IF;

  terms := upper(trim(COALESCE(p_payment_terms::text, '')));

  IF terms = 'COD' OR terms LIKE '%COD%' THEN
    RETURN p_actual_delivery + 1;
  END IF;

  days := NULLIF(substring(terms from '\d+')::INT, 0);
  IF days IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN p_actual_delivery + days;
END;
$$;

CREATE OR REPLACE FUNCTION notify_order_payment_overdue(
  p_order_id UUID,
  p_days_overdue INT DEFAULT NULL
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
  due_date DATE;
  days_overdue INT;
  msg_exec TEXT;
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

  due_date := COALESCE(o.due_date, order_compute_due_date(o.actual_delivery, o.payment_terms));
  days_overdue := COALESCE(
    p_days_overdue,
    CASE WHEN due_date IS NOT NULL THEN GREATEST(0, (CURRENT_DATE - due_date)::INT) ELSE 0 END
  );

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;

  msg_exec := format(
    'Order %s payment overdue — %s, ₱%s balance due, %s day(s) past payment terms',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    to_char(COALESCE(o.balance_due, 0), 'FM999,999,990.00'),
    days_overdue
  );

  msg_agent := format(
    'Order %s for %s is past payment terms — ₱%s due, %s day(s) overdue',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    to_char(COALESCE(o.balance_due, 0), 'FM999,999,990.00'),
    days_overdue
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
      'Payment'::notification_category,
      'Order payment overdue',
      msg_exec,
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
        'totalAmount', o.total_amount,
        'amountPaid', o.amount_paid,
        'balanceDue', o.balance_due,
        'paymentStatus', o.payment_status,
        'paymentTerms', o.payment_terms,
        'dueDate', due_date,
        'daysOverdue', days_overdue,
        'status', o.status
      ),
      'order_payment_overdue'
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
        'Payment'::notification_category,
        'Customer payment overdue',
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
          'totalAmount', o.total_amount,
          'amountPaid', o.amount_paid,
          'balanceDue', o.balance_due,
          'paymentStatus', o.payment_status,
          'paymentTerms', o.payment_terms,
          'dueDate', due_date,
          'daysOverdue', days_overdue,
          'status', o.status
        ),
        'order_payment_overdue'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION process_newly_overdue_orders()
RETURNS TABLE (
  order_id UUID,
  days_overdue INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  v_due_date DATE;
  days INT;
BEGIN
  FOR o IN
    SELECT ord.*
    FROM orders ord
    WHERE ord.status IN ('Partially Fulfilled'::order_status, 'Delivered'::order_status, 'Completed'::order_status)
      AND ord.overdue_notified_at IS NULL
      AND ord.actual_delivery IS NOT NULL
      AND COALESCE(ord.balance_due, 0) > 0.01
      AND (
        ord.payment_status IN (
          'Unbilled'::payment_status,
          'Invoiced'::payment_status,
          'Partially Paid'::payment_status,
          'On Credit'::payment_status
        )
        OR ord.payment_status = 'Overdue'::payment_status
      )
  LOOP
    v_due_date := COALESCE(o.due_date, order_compute_due_date(o.actual_delivery, o.payment_terms));
    IF v_due_date IS NULL OR v_due_date >= CURRENT_DATE THEN
      CONTINUE;
    END IF;

    days := GREATEST(0, (CURRENT_DATE - v_due_date)::INT);

    UPDATE orders
    SET
      payment_status = 'Overdue'::payment_status,
      due_date = v_due_date,
      overdue_notified_at = NOW(),
      updated_at = NOW()
    WHERE id = o.id;

    PERFORM notify_order_payment_overdue(o.id, days);

    order_id := o.id;
    days_overdue := days;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION order_compute_due_date(DATE, payment_terms) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_order_payment_overdue(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_newly_overdue_orders() TO authenticated;

COMMENT ON FUNCTION order_compute_due_date(DATE, payment_terms) IS
  'Payment due date from actual delivery date and payment terms (COD = next day; Net N = N days).';
COMMENT ON FUNCTION notify_order_payment_overdue(UUID, INT) IS
  'In-app notification to executives and the assigned agent when an order payment is overdue.';
COMMENT ON FUNCTION process_newly_overdue_orders() IS
  'Mark newly overdue delivered orders, notify executives and agent once per order, return processed rows.';
