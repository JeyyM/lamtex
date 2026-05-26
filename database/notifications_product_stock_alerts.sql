-- In-app notifications when product stock crosses thresholds:
--   • quantity drops to 0 (out of stock)
--   • quantity crosses at or below reorder_point (while still > 0)
--
-- Branch-level: fires on product_variant_stock (matches branch stock shown in the UI).
-- Variant-level: fires on product_variants.total_stock / reorder_point when no branch rows exist,
--                 or when only reorder_point changes.

CREATE OR REPLACE FUNCTION notify_product_stock_threshold_if_crossed(
  p_variant_id UUID,
  p_product_id UUID,
  p_sku TEXT,
  p_size TEXT,
  p_is_hidden BOOLEAN,
  p_status product_status,
  p_old_stock INT,
  p_new_stock INT,
  p_old_rp INT,
  p_new_rp INT,
  p_branch_id UUID DEFAULT NULL,
  p_branch_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_rec RECORD;
  product_action_url TEXT;
  alert_type TEXT;
  notif_title TEXT;
  msg TEXT;
  is_urgent BOOLEAN;
  branch_label TEXT;
  was_already_low BOOLEAN;
  is_now_low BOOLEAN;
  recipient RECORD;
BEGIN
  IF COALESCE(p_is_hidden, false) THEN
    RETURN;
  END IF;

  IF p_status = 'Discontinued'::product_status THEN
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
    alert_type := 'product_out_of_stock';
    notif_title := 'Product out of stock';
    is_urgent := true;
  -- Fresh crossing into low-stock: wasn't low before, is low now.
  ELSIF is_now_low AND NOT was_already_low THEN
    alert_type := 'product_below_reorder_point';
    notif_title := 'Product below reorder point';
    is_urgent := true;
  -- Stock dropped further while still low (e.g. 80 → 40 with rp 100): re-alert so the
  -- continued decline is visible. Skip identical no-op writes.
  ELSIF is_now_low AND was_already_low
        AND COALESCE(p_new_stock, 0) < COALESCE(p_old_stock, 0) THEN
    alert_type := 'product_below_reorder_point';
    notif_title := 'Product stock still below reorder point';
    is_urgent := true;
  ELSE
    RETURN;
  END IF;

  SELECT p.id, p.name, p.branch, pc.slug AS category_slug
  INTO product_rec
  FROM products p
  LEFT JOIN product_categories pc ON pc.id = p.category_id
  WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  product_action_url := CASE
    WHEN product_rec.category_slug IS NOT NULL AND trim(product_rec.category_slug) <> '' THEN
      '/products/category/' || trim(product_rec.category_slug) || '/family/' || p_product_id::text
    ELSE
      '/products/' || p_product_id::text
  END;

  branch_label := CASE
    WHEN p_branch_name IS NOT NULL AND trim(p_branch_name) <> '' THEN format(' — %s', p_branch_name)
    ELSE ''
  END;

  IF alert_type = 'product_out_of_stock' THEN
    msg := format(
      '%s (%s%s) is out of stock%s',
      p_sku,
      COALESCE(product_rec.name, 'Unknown product'),
      CASE WHEN p_size IS NOT NULL AND trim(p_size) <> '' THEN format(', %s', p_size) ELSE '' END,
      branch_label
    );
  ELSE
    msg := format(
      '%s (%s%s) is below reorder point: %s units left (reorder at %s)%s',
      p_sku,
      COALESCE(product_rec.name, 'Unknown product'),
      CASE WHEN p_size IS NOT NULL AND trim(p_size) <> '' THEN format(', %s', p_size) ELSE '' END,
      COALESCE(p_new_stock, 0),
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
      product_action_url,
      'View product',
      p_branch_id,
      jsonb_build_object(
        'variantId', p_variant_id,
        'productId', p_product_id,
        'productName', product_rec.name,
        'sku', p_sku,
        'size', p_size,
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
      product_action_url,
      'View product',
      p_branch_id,
      jsonb_build_object(
        'variantId', p_variant_id,
        'productId', p_product_id,
        'productName', product_rec.name,
        'sku', p_sku,
        'size', p_size,
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

CREATE OR REPLACE FUNCTION trg_product_variant_branch_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  branch_name TEXT;
  old_qty INT;
  new_qty INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  old_qty := CASE WHEN TG_OP = 'INSERT' THEN 0 ELSE COALESCE(OLD.quantity, 0) END;
  new_qty := COALESCE(NEW.quantity, 0);

  IF old_qty IS NOT DISTINCT FROM new_qty THEN
    RETURN NEW;
  END IF;

  SELECT
    pv.id,
    pv.product_id,
    pv.sku,
    pv.size,
    pv.is_hidden,
    pv.status,
    pv.reorder_point
  INTO v
  FROM product_variants pv
  WHERE pv.id = NEW.variant_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT b.name INTO branch_name FROM branches b WHERE b.id = NEW.branch_id;

  PERFORM notify_product_stock_threshold_if_crossed(
    v.id,
    v.product_id,
    v.sku,
    v.size,
    v.is_hidden,
    v.status,
    old_qty,
    new_qty,
    COALESCE(v.reorder_point, 0),
    COALESCE(v.reorder_point, 0),
    NEW.branch_id,
    branch_name
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_product_variant_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_branch_rows BOOLEAN;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM product_variant_stock pvs WHERE pvs.variant_id = NEW.id LIMIT 1
  ) INTO has_branch_rows;

  -- Branch stock rows drive alerts for quantity changes; avoid duplicate aggregate alerts.
  IF has_branch_rows
     AND NEW.total_stock IS DISTINCT FROM OLD.total_stock
     AND NEW.reorder_point IS NOT DISTINCT FROM OLD.reorder_point THEN
    RETURN NEW;
  END IF;

  IF NEW.total_stock IS NOT DISTINCT FROM OLD.total_stock
     AND NEW.reorder_point IS NOT DISTINCT FROM OLD.reorder_point THEN
    RETURN NEW;
  END IF;

  PERFORM notify_product_stock_threshold_if_crossed(
    NEW.id,
    NEW.product_id,
    NEW.sku,
    NEW.size,
    NEW.is_hidden,
    NEW.status,
    COALESCE(OLD.total_stock, 0),
    COALESCE(NEW.total_stock, 0),
    COALESCE(OLD.reorder_point, 0),
    COALESCE(NEW.reorder_point, 0),
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$;

-- Triggers are optional; the app calls notify_product_stock_threshold_rpc after stock writes.
-- Uncomment below if you prefer database-only alerts without client RPC wiring.

/*
DROP TRIGGER IF EXISTS product_variant_branch_stock_alert ON product_variant_stock;
CREATE TRIGGER product_variant_branch_stock_alert
  AFTER INSERT OR UPDATE OF quantity ON product_variant_stock
  FOR EACH ROW
  EXECUTE FUNCTION trg_product_variant_branch_stock_alert();

DROP TRIGGER IF EXISTS product_variant_stock_alert ON product_variants;
CREATE TRIGGER product_variant_stock_alert
  AFTER UPDATE OF total_stock, reorder_point ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION trg_product_variant_stock_alert();
*/

COMMENT ON FUNCTION notify_product_stock_threshold_if_crossed(UUID, UUID, TEXT, TEXT, BOOLEAN, product_status, INT, INT, INT, INT, UUID, TEXT) IS
  'Insert Inventory notifications for Executives and Warehouse when stock crosses out-of-stock or reorder thresholds.';

COMMENT ON FUNCTION trg_product_variant_branch_stock_alert() IS
  'Trigger: branch-level product stock alerts (matches per-branch stock in the UI).';

COMMENT ON FUNCTION trg_product_variant_stock_alert() IS
  'Trigger: variant-level alerts for reorder_point changes and legacy total_stock updates without branch rows.';

CREATE OR REPLACE FUNCTION notify_product_stock_threshold_rpc(
  p_variant_id UUID,
  p_old_stock INT,
  p_new_stock INT,
  p_old_rp INT DEFAULT NULL,
  p_new_rp INT DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  branch_name TEXT;
BEGIN
  SELECT
    pv.id,
    pv.product_id,
    pv.sku,
    pv.size,
    pv.is_hidden,
    pv.status,
    pv.reorder_point
  INTO v
  FROM product_variants pv
  WHERE pv.id = p_variant_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  branch_name := NULL;
  IF p_branch_id IS NOT NULL THEN
    SELECT b.name INTO branch_name FROM branches b WHERE b.id = p_branch_id;
  END IF;

  PERFORM notify_product_stock_threshold_if_crossed(
    v.id,
    v.product_id,
    v.sku,
    v.size,
    v.is_hidden,
    v.status,
    COALESCE(p_old_stock, 0),
    COALESCE(p_new_stock, 0),
    COALESCE(p_old_rp, v.reorder_point, 0),
    COALESCE(p_new_rp, v.reorder_point, 0),
    p_branch_id,
    branch_name
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_product_stock_threshold_rpc(UUID, INT, INT, INT, INT, UUID) TO authenticated;

COMMENT ON FUNCTION notify_product_stock_threshold_rpc(UUID, INT, INT, INT, INT, UUID) IS
  'Client-callable wrapper to emit product low-stock / out-of-stock in-app notifications.';
