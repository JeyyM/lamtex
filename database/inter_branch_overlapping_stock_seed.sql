-- ============================================================================
-- Inter-branch: overlapping warehouse stock (materials + product variants)
--
-- Fills per-branch stock so IBR add-line pickers can find items. Also fixes
-- legacy `products.branch` / `product_variants.branch` = 'Manila'|'Cebu'|'Batangas'
-- when `branches.name` is the long LAMTEX title (so joins work).
-- Safe to re-run (ON CONFLICT upserts, idempotent product seed by name+branch).
-- ============================================================================

-- ── 0) Align product rows to current `branches.name` (short → from branches) ─
UPDATE products p
SET
  branch     = b.name,
  updated_at = now()
FROM branches b
WHERE p.branch IN ('Manila', 'Cebu', 'Batangas')
  AND b.code = CASE p.branch
    WHEN 'Manila' THEN 'MNL'
    WHEN 'Cebu' THEN 'CEB'
    WHEN 'Batangas' THEN 'BTG'
  END
  AND p.branch IS DISTINCT FROM b.name;

UPDATE product_variants pv
SET
  branch     = p.branch,
  updated_at = now()
FROM products p
WHERE p.id = pv.product_id
  AND pv.branch IS DISTINCT FROM p.branch;

-- Also align product_categories when still using short labels
UPDATE product_categories pc
SET
  branch     = b.name,
  updated_at = now()
FROM branches b
WHERE pc.branch IN ('Manila', 'Cebu', 'Batangas')
  AND b.code = CASE pc.branch
    WHEN 'Manila' THEN 'MNL'
    WHEN 'Cebu' THEN 'CEB'
    WHEN 'Batangas' THEN 'BTG'
  END
  AND pc.branch IS DISTINCT FROM b.name;

-- ── 1) Raw materials: stock on all three branches ───────────────────────────
WITH mat AS (
  SELECT id
  FROM raw_materials
  WHERE status = 'Active'
  ORDER BY name
  LIMIT 30
)
INSERT INTO material_stock (material_id, branch_id, quantity)
SELECT
  m.id,
  b.id,
  (150 + (floor(random() * 850))::numeric(14, 4))::numeric(14, 4)
FROM mat m
CROSS JOIN (
  SELECT id FROM branches WHERE code IN ('MNL', 'CEB', 'BTG') AND is_active IS NOT FALSE
) b
ON CONFLICT (material_id, branch_id) DO UPDATE
SET
  quantity   = GREATEST(material_stock.quantity, EXCLUDED.quantity),
  updated_at = now();

-- ── 2) Guaranteed shared-name products (one product per site, identical name) ─
--     Inter-branch name logic needs the same `products.name` in stock at
--     each branch — these rows always satisfy that.
-- ───────────────────────────────────────────────────────────────────────────
DO $ibr$
DECLARE
  shared_name  text := 'LAMTEX IBR - Cross-branch standard item';
  r_br         record;
  v_cat        uuid;
  v_prod       uuid;
  v_var        uuid;
  v_sku        text;
  v_bid        uuid;
BEGIN
  FOR r_br IN
    SELECT id, name, code
    FROM branches
    WHERE code IN ('MNL', 'CEB', 'BTG')
    ORDER BY code
  LOOP
    v_bid := r_br.id;

    SELECT c.id
    INTO v_cat
    FROM product_categories c
    WHERE c.is_active
      AND c.branch = r_br.name
    ORDER BY c.sort_order NULLS LAST, c.name
    LIMIT 1;

    SELECT p.id
    INTO v_prod
    FROM products p
    WHERE p.name = shared_name
      AND p.branch = r_br.name
    LIMIT 1;

    IF v_prod IS NULL THEN
      INSERT INTO products (
        name, category_id, branch, description, status,
        total_variants, total_stock, avg_price
      ) VALUES (
        shared_name,
        v_cat,
        r_br.name,
        'Seeded for inter-branch: same name on MNL, CEB, BTG; safe to delete in prod.',
        'Active',
        0,
        0,
        0
      )
      RETURNING id INTO v_prod;
    END IF;

    v_sku := 'IBR-SEED-' || r_br.code;
    IF EXISTS (SELECT 1 FROM product_variants WHERE sku = v_sku) THEN
      SELECT id INTO v_var FROM product_variants WHERE sku = v_sku LIMIT 1;
    ELSE
      INSERT INTO product_variants (
        product_id,
        sku,
        size,
        unit_price,
        cost_price,
        total_stock,
        reorder_point,
        safety_stock,
        status,
        supplier_id,
        lead_time_days,
        min_order_qty,
        branch,
        specs
      ) VALUES (
        v_prod,
        v_sku,
        'Standard',
        0,
        0,
        0,
        0,
        0,
        'Active',
        NULL,
        7,
        1,
        r_br.name,
        '[]'::jsonb
      )
      RETURNING id INTO v_var;
    END IF;

    INSERT INTO product_variant_stock (variant_id, branch_id, quantity)
    VALUES (v_var, v_bid, 120)
    ON CONFLICT (variant_id, branch_id) DO UPDATE
    SET
      quantity   = GREATEST(product_variant_stock.quantity, EXCLUDED.quantity, 1),
      updated_at = now();
  END LOOP;
END
$ibr$;

-- Refresh variant count for the seeded product rows
UPDATE products p
SET
  total_variants = (SELECT count(*)::int FROM product_variants v WHERE v.product_id = p.id),
  total_stock    = (SELECT coalesce(sum(vps.quantity), 0)::int
                    FROM product_variants v
                    JOIN product_variant_stock vps ON vps.variant_id = v.id
                    WHERE v.product_id = p.id),
  updated_at     = now()
WHERE p.name = 'LAMTEX IBR - Cross-branch standard item';

-- ── 3) All other product names that already exist on all three sites ────────
INSERT INTO product_variant_stock (variant_id, branch_id, quantity)
SELECT
  x.variant_id,
  x.branch_id,
  80 + (floor(random() * 400))::int
FROM (
  SELECT DISTINCT ON (p.name, b.code)
    pv.id AS variant_id,
    b.id  AS branch_id
  FROM products p
  INNER JOIN branches b ON b.name = p.branch
  INNER JOIN LATERAL (
    SELECT id
    FROM product_variants
    WHERE product_id = p.id
      AND status = 'Active'
    ORDER BY id
    LIMIT 1
  ) pv ON true
  WHERE b.code IN ('MNL', 'CEB', 'BTG')
    AND p.status = 'Active'
    AND p.name IN (
      SELECT p2.name
      FROM products p2
      INNER JOIN branches b2 ON b2.name = p2.branch
      WHERE b2.code IN ('MNL', 'CEB', 'BTG')
        AND p2.status = 'Active'
      GROUP BY p2.name
      HAVING count(DISTINCT b2.code) = 3
    )
  ORDER BY p.name, b.code, p.id
) x
ON CONFLICT (variant_id, branch_id) DO UPDATE
SET
  quantity   = GREATEST(product_variant_stock.quantity, EXCLUDED.quantity),
  updated_at = now();

-- Verify: should return at least the shared name with branch_count = 3
-- SELECT p.name, count(DISTINCT b.code) AS branch_count
-- FROM products p
-- JOIN branches b ON b.name = p.branch
-- WHERE b.code IN ('MNL','CEB','BTG') AND p.status = 'Active'
-- GROUP BY p.name
-- HAVING count(DISTINCT b.code) = 3;
