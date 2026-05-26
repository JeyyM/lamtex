-- In-app notifications when raw material stock crosses thresholds:
--   • quantity drops to 0 (out of stock)
--   • quantity crosses at or below reorder_point (while still > 0)
--   • stock decreases further while still below reorder_point
--
-- Mirrors the product variant flow in notifications_product_stock_alerts.sql.
-- Called from the client after every material stock mutation via the wrapper RPC
-- `notify_material_stock_threshold_rpc`.

CREATE OR REPLACE FUNCTION notify_material_stock_threshold_if_crossed(
  p_material_id UUID,
  p_sku TEXT,
  p_name TEXT,
  p_unit TEXT,
  p_status material_status,
  p_old_stock NUMERIC,
  p_new_stock NUMERIC,
  p_old_rp NUMERIC,
  p_new_rp NUMERIC,
  p_branch_id UUID DEFAULT NULL,
  p_branch_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_type TEXT;
  notif_title TEXT;
  msg TEXT;
  is_urgent BOOLEAN;
  branch_label TEXT;
  unit_label TEXT;
  was_already_low BOOLEAN;
  is_now_low BOOLEAN;
  recipient RECORD;
BEGIN
  IF p_status = 'Discontinued'::material_status THEN
    RETURN;
  END IF;

  IF p_old_stock IS NOT DISTINCT FROM p_new_stock
     AND p_old_rp IS NOT DISTINCT FROM p_new_rp THEN
    RETURN;
  END IF;

  -- "Already low" = previous state was at/under previous reorder point with positive stock.
  was_already_low := COALESCE(p_old_rp, 0) > 0
    AND COALESCE(p_old_stock, 0) > 0
    AND COALESCE(p_old_stock, 0) <= COALESCE(p_old_rp, 0);

  -- "Now low" = current stock is positive and at/under the (current) reorder point.
  is_now_low := COALESCE(p_new_rp, 0) > 0
    AND COALESCE(p_new_stock, 0) > 0
    AND COALESCE(p_new_stock, 0) <= COALESCE(p_new_rp, 0);

  -- Out-of-stock takes priority: any transition into zero (or below) when there was stock before.
  IF COALESCE(p_old_stock, 0) > 0 AND COALESCE(p_new_stock, 0) <= 0 THEN
    alert_type := 'material_out_of_stock';
    notif_title := 'Material out of stock';
    is_urgent := true;
  -- Fresh crossing into low-stock: wasn't low before, is low now.
  ELSIF is_now_low AND NOT was_already_low THEN
    alert_type := 'material_below_reorder_point';
    notif_title := 'Material below reorder point';
    is_urgent := true;
  -- Stock dropped further while still low (e.g. 80 → 40 with rp 100): re-alert so the
  -- continued decline is visible. Skip identical no-op writes.
  ELSIF is_now_low AND was_already_low
        AND COALESCE(p_new_stock, 0) < COALESCE(p_old_stock, 0) THEN
    alert_type := 'material_below_reorder_point';
    notif_title := 'Material stock still below reorder point';
    is_urgent := true;
  ELSE
    RETURN;
  END IF;

  branch_label := CASE
    WHEN p_branch_name IS NOT NULL AND trim(p_branch_name) <> '' THEN format(' — %s', p_branch_name)
    ELSE ''
  END;

  unit_label := COALESCE(NULLIF(trim(p_unit), ''), 'units');

  IF alert_type = 'material_out_of_stock' THEN
    msg := format(
      '%s (%s) is out of stock%s',
      p_sku,
      COALESCE(p_name, 'Unknown material'),
      branch_label
    );
  ELSE
    msg := format(
      '%s (%s) is below reorder point: %s %s left (reorder at %s)%s',
      p_sku,
      COALESCE(p_name, 'Unknown material'),
      COALESCE(p_new_stock, 0),
      unit_label,
      COALESCE(p_new_rp, 0),
      branch_label
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
      'Inventory'::notification_category,
      notif_title,
      msg,
      is_urgent,
      '/materials/' || p_material_id::text,
      'View material',
      p_branch_id,
      jsonb_build_object(
        'materialId', p_material_id,
        'name', p_name,
        'sku', p_sku,
        'unit', p_unit,
        'branchName', p_branch_name,
        'totalStock', p_new_stock,
        'previousStock', p_old_stock,
        'reorderPoint', p_new_rp,
        'alertType', alert_type
      ),
      alert_type
    );
  END LOOP;

  FOR recipient IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Warehouse'::user_role
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
      'Inventory'::notification_category,
      notif_title,
      msg,
      is_urgent,
      '/materials/' || p_material_id::text,
      'View material',
      p_branch_id,
      jsonb_build_object(
        'materialId', p_material_id,
        'name', p_name,
        'sku', p_sku,
        'unit', p_unit,
        'branchName', p_branch_name,
        'totalStock', p_new_stock,
        'previousStock', p_old_stock,
        'reorderPoint', p_new_rp,
        'alertType', alert_type
      ),
      alert_type
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION notify_material_stock_threshold_if_crossed(UUID, TEXT, TEXT, TEXT, material_status, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID, TEXT) IS
  'Insert Inventory notifications for Executives and Warehouse when raw material stock crosses out-of-stock or reorder thresholds.';

CREATE OR REPLACE FUNCTION notify_material_stock_threshold_rpc(
  p_material_id UUID,
  p_old_stock NUMERIC,
  p_new_stock NUMERIC,
  p_old_rp NUMERIC DEFAULT NULL,
  p_new_rp NUMERIC DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m RECORD;
  branch_name TEXT;
BEGIN
  SELECT
    rm.id,
    rm.sku,
    rm.name,
    rm.unit_of_measure,
    rm.status,
    rm.reorder_point
  INTO m
  FROM raw_materials rm
  WHERE rm.id = p_material_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  branch_name := NULL;
  IF p_branch_id IS NOT NULL THEN
    SELECT b.name INTO branch_name FROM branches b WHERE b.id = p_branch_id;
  END IF;

  PERFORM notify_material_stock_threshold_if_crossed(
    m.id,
    m.sku,
    m.name,
    m.unit_of_measure::text,
    m.status,
    COALESCE(p_old_stock, 0),
    COALESCE(p_new_stock, 0),
    COALESCE(p_old_rp, m.reorder_point, 0),
    COALESCE(p_new_rp, m.reorder_point, 0),
    p_branch_id,
    branch_name
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_material_stock_threshold_rpc(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID) TO authenticated;

COMMENT ON FUNCTION notify_material_stock_threshold_rpc(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID) IS
  'Client-callable wrapper to emit raw material low-stock / out-of-stock in-app notifications.';
