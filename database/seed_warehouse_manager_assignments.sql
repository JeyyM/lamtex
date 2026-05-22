-- =============================================================================
-- Seed: Warehouse manager catalog assignments
--
-- For each branch with active Warehouse Managers:
--   • Assigns every active product family (all categories) via round-robin
--   • Assigns every active branch raw material (incl. LMX-* / QZN-* shared stock)
--   • Guarantees each warehouse manager has at least one product + one material
--   • Ensures every catalog item is assigned to at least one manager on its branch
--
-- Branch matching mirrors the app (legacy Manila/Cebu/Batangas/Quezon names,
-- product_variants.branch fallback, LMX/QZN material SKUs).
--
-- Prerequisites:
--   • database/warehouse_manager_assignments.sql
--   • seed_logistics_warehouse_users.sql (+ seed_quezon_branch_employees.sql)
--   • Product / raw material catalog seeds
--
-- Re-runnable: clears warehouse-manager assignment rows, then re-seeds.
-- =============================================================================

DO $$
DECLARE
  v_wm_count              INT;
  v_product_rows          INT := 0;
  v_material_rows         INT := 0;
  v_guarantee_prod_rows   INT := 0;
  v_guarantee_mat_rows    INT := 0;
  v_products_total        INT;
  v_materials_total       INT;
  v_products_gap          INT;
  v_materials_gap         INT;
  v_wm_without_products   INT;
  v_wm_without_materials  INT;
  v_categories_gap        INT;
  v_inserted              INT;
BEGIN
  IF to_regclass('public.employee_product_assignments') IS NULL
     OR to_regclass('public.employee_material_assignments') IS NULL THEN
    RAISE EXCEPTION
      'seed_warehouse_manager_assignments: run database/warehouse_manager_assignments.sql first';
  END IF;

  SELECT count(*) INTO v_wm_count
  FROM employees
  WHERE role = 'Warehouse Manager'
    AND status = 'active'
    AND branch_id IS NOT NULL;

  IF v_wm_count = 0 THEN
    RAISE EXCEPTION
      'seed_warehouse_manager_assignments: no active Warehouse Manager employees with a branch found';
  END IF;

  DELETE FROM employee_product_assignments epa
  USING employees e
  WHERE epa.employee_id = e.id
    AND e.role = 'Warehouse Manager';

  DELETE FROM employee_material_assignments ema
  USING employees e
  WHERE ema.employee_id = e.id
    AND e.role = 'Warehouse Manager';

  -- ── Products: branch catalog → round-robin across branch managers ───────────
  WITH branch_managers AS (
    SELECT
      e.id AS employee_id,
      e.branch_id,
      (row_number() OVER (PARTITION BY e.branch_id ORDER BY e.employee_id) - 1) AS mgr_ord
    FROM employees e
    WHERE e.role = 'Warehouse Manager'
      AND e.status = 'active'
      AND e.branch_id IS NOT NULL
  ),
  branch_manager_counts AS (
    SELECT branch_id, count(*)::INT AS mgr_count
    FROM branch_managers
    GROUP BY branch_id
  ),
  branch_product_catalog AS (
    SELECT DISTINCT ON (b.id, p.id)
      p.id AS product_id,
      b.id AS branch_id,
      coalesce(pc.name, 'Uncategorized') AS category_name,
      p.name AS product_name
    FROM products p
    INNER JOIN branches b ON (
      p.branch = b.name
      OR p.branch = CASE b.code
        WHEN 'MNL' THEN 'Manila'
        WHEN 'CEB' THEN 'Cebu'
        WHEN 'BTG' THEN 'Batangas'
        WHEN 'QZN' THEN 'Quezon'
        ELSE NULL
      END
      OR EXISTS (
        SELECT 1
        FROM product_variants pv
        WHERE pv.product_id = p.id
          AND (
            pv.branch = b.name
            OR pv.branch = CASE b.code
              WHEN 'MNL' THEN 'Manila'
              WHEN 'CEB' THEN 'Cebu'
              WHEN 'BTG' THEN 'Batangas'
              WHEN 'QZN' THEN 'Quezon'
              ELSE NULL
            END
          )
      )
    )
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.status IS DISTINCT FROM 'Discontinued'
      AND EXISTS (
        SELECT 1
        FROM branch_managers bm
        WHERE bm.branch_id = b.id
      )
    ORDER BY b.id, p.id, pc.name NULLS LAST, p.name
  ),
  branch_products AS (
    SELECT
      product_id,
      branch_id,
      (row_number() OVER (
        PARTITION BY branch_id
        ORDER BY category_name, product_name, product_id
      ) - 1) AS item_ord
    FROM branch_product_catalog
  ),
  product_picks AS (
    SELECT DISTINCT ON (bp.product_id)
      bm.employee_id,
      bp.product_id
    FROM branch_products bp
    INNER JOIN branch_manager_counts bmc ON bmc.branch_id = bp.branch_id
    INNER JOIN branch_managers bm
      ON bm.branch_id = bp.branch_id
     AND bm.mgr_ord = (bp.item_ord % bmc.mgr_count)
    ORDER BY bp.product_id, bm.employee_id
  )
  INSERT INTO employee_product_assignments (employee_id, product_id)
  SELECT employee_id, product_id
  FROM product_picks
  ON CONFLICT (employee_id, product_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_product_rows := v_product_rows + v_inserted;

  -- ── Materials: branch catalog → round-robin ─────────────────────────────────
  WITH branch_managers AS (
    SELECT
      e.id AS employee_id,
      e.branch_id,
      (row_number() OVER (PARTITION BY e.branch_id ORDER BY e.employee_id) - 1) AS mgr_ord
    FROM employees e
    WHERE e.role = 'Warehouse Manager'
      AND e.status = 'active'
      AND e.branch_id IS NOT NULL
  ),
  branch_manager_counts AS (
    SELECT branch_id, count(*)::INT AS mgr_count
    FROM branch_managers
    GROUP BY branch_id
  ),
  branch_material_catalog AS (
    SELECT DISTINCT
      rm.id AS material_id,
      b.id AS branch_id,
      coalesce(mc.name, 'Uncategorized') AS category_name,
      rm.name AS material_name
    FROM branches b
    INNER JOIN raw_materials rm ON rm.status IS DISTINCT FROM 'Discontinued'
    LEFT JOIN material_categories mc ON mc.id = rm.category_id
    WHERE EXISTS (
      SELECT 1 FROM branch_managers bm WHERE bm.branch_id = b.id
    )
    AND (
      mc.branch_id = b.id
      OR EXISTS (
        SELECT 1
        FROM material_stock ms
        WHERE ms.material_id = rm.id
          AND ms.branch_id = b.id
      )
      OR (b.code IN ('MNL', 'CEB', 'BTG') AND rm.sku LIKE 'LMX-%')
      OR (b.code = 'QZN' AND rm.sku LIKE 'QZN-%')
    )
  ),
  branch_materials AS (
    SELECT
      material_id,
      branch_id,
      (row_number() OVER (
        PARTITION BY branch_id
        ORDER BY category_name, material_name, material_id
      ) - 1) AS item_ord
    FROM branch_material_catalog
  ),
  material_picks AS (
    SELECT DISTINCT ON (bm.material_id)
      mgr.employee_id,
      bm.material_id
    FROM branch_materials bm
    INNER JOIN branch_manager_counts bmc ON bmc.branch_id = bm.branch_id
    INNER JOIN branch_managers mgr
      ON mgr.branch_id = bm.branch_id
     AND mgr.mgr_ord = (bm.item_ord % bmc.mgr_count)
    ORDER BY bm.material_id, mgr.employee_id
  )
  INSERT INTO employee_material_assignments (employee_id, material_id)
  SELECT employee_id, material_id
  FROM material_picks
  ON CONFLICT (employee_id, material_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_material_rows := v_material_rows + v_inserted;

  -- ── Guarantee: every warehouse manager gets ≥1 product + ≥1 material ────────
  WITH branch_managers AS (
    SELECT
      e.id AS employee_id,
      e.branch_id,
      e.employee_id AS emp_code
    FROM employees e
    WHERE e.role = 'Warehouse Manager'
      AND e.status = 'active'
      AND e.branch_id IS NOT NULL
  ),
  branch_product_catalog AS (
    SELECT DISTINCT ON (b.id, p.id)
      p.id AS product_id,
      b.id AS branch_id
    FROM products p
    INNER JOIN branches b ON (
      p.branch = b.name
      OR p.branch = CASE b.code
        WHEN 'MNL' THEN 'Manila'
        WHEN 'CEB' THEN 'Cebu'
        WHEN 'BTG' THEN 'Batangas'
        WHEN 'QZN' THEN 'Quezon'
        ELSE NULL
      END
      OR EXISTS (
        SELECT 1
        FROM product_variants pv
        WHERE pv.product_id = p.id
          AND (
            pv.branch = b.name
            OR pv.branch = CASE b.code
              WHEN 'MNL' THEN 'Manila'
              WHEN 'CEB' THEN 'Cebu'
              WHEN 'BTG' THEN 'Batangas'
              WHEN 'QZN' THEN 'Quezon'
              ELSE NULL
            END
          )
      )
    )
    WHERE p.status IS DISTINCT FROM 'Discontinued'
  ),
  wm_needs_product AS (
    SELECT bm.employee_id, bm.branch_id, bm.emp_code
    FROM branch_managers bm
    WHERE NOT EXISTS (
      SELECT 1 FROM employee_product_assignments epa WHERE epa.employee_id = bm.employee_id
    )
  ),
  wm_product_pick AS (
    SELECT DISTINCT ON (wnp.employee_id)
      wnp.employee_id,
      bpc.product_id
    FROM wm_needs_product wnp
    INNER JOIN branch_product_catalog bpc ON bpc.branch_id = wnp.branch_id
    ORDER BY wnp.employee_id, bpc.product_id
  )
  INSERT INTO employee_product_assignments (employee_id, product_id)
  SELECT employee_id, product_id
  FROM wm_product_pick
  ON CONFLICT (employee_id, product_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_guarantee_prod_rows := v_inserted;
  v_product_rows := v_product_rows + v_inserted;

  WITH branch_managers AS (
    SELECT
      e.id AS employee_id,
      e.branch_id
    FROM employees e
    WHERE e.role = 'Warehouse Manager'
      AND e.status = 'active'
      AND e.branch_id IS NOT NULL
  ),
  branch_material_catalog AS (
    SELECT DISTINCT
      rm.id AS material_id,
      b.id AS branch_id
    FROM branches b
    INNER JOIN raw_materials rm ON rm.status IS DISTINCT FROM 'Discontinued'
    LEFT JOIN material_categories mc ON mc.id = rm.category_id
    WHERE (
      mc.branch_id = b.id
      OR EXISTS (
        SELECT 1 FROM material_stock ms
        WHERE ms.material_id = rm.id AND ms.branch_id = b.id
      )
      OR (b.code IN ('MNL', 'CEB', 'BTG') AND rm.sku LIKE 'LMX-%')
      OR (b.code = 'QZN' AND rm.sku LIKE 'QZN-%')
    )
  ),
  wm_needs_material AS (
    SELECT bm.employee_id, bm.branch_id
    FROM branch_managers bm
    WHERE NOT EXISTS (
      SELECT 1 FROM employee_material_assignments ema WHERE ema.employee_id = bm.employee_id
    )
  ),
  wm_material_pick AS (
    SELECT DISTINCT ON (wnm.employee_id)
      wnm.employee_id,
      bmc.material_id
    FROM wm_needs_material wnm
    INNER JOIN branch_material_catalog bmc ON bmc.branch_id = wnm.branch_id
    ORDER BY wnm.employee_id, bmc.material_id
  )
  INSERT INTO employee_material_assignments (employee_id, material_id)
  SELECT employee_id, material_id
  FROM wm_material_pick
  ON CONFLICT (employee_id, material_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_guarantee_mat_rows := v_inserted;
  v_material_rows := v_material_rows + v_inserted;

  -- ── Fallback: orphan catalog rows → first active warehouse manager ──────────
  WITH fallback_wm AS (
    SELECT e.id AS employee_id
    FROM employees e
    WHERE e.role = 'Warehouse Manager'
      AND e.status = 'active'
    ORDER BY e.employee_id
    LIMIT 1
  )
  INSERT INTO employee_product_assignments (employee_id, product_id)
  SELECT fw.employee_id, p.id
  FROM products p
  CROSS JOIN fallback_wm fw
  WHERE p.status IS DISTINCT FROM 'Discontinued'
    AND NOT EXISTS (
      SELECT 1 FROM employee_product_assignments epa WHERE epa.product_id = p.id
    )
  ON CONFLICT (employee_id, product_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_product_rows := v_product_rows + v_inserted;

  WITH fallback_wm AS (
    SELECT e.id AS employee_id
    FROM employees e
    WHERE e.role = 'Warehouse Manager'
      AND e.status = 'active'
    ORDER BY e.employee_id
    LIMIT 1
  )
  INSERT INTO employee_material_assignments (employee_id, material_id)
  SELECT fw.employee_id, rm.id
  FROM raw_materials rm
  CROSS JOIN fallback_wm fw
  WHERE rm.status IS DISTINCT FROM 'Discontinued'
    AND NOT EXISTS (
      SELECT 1 FROM employee_material_assignments ema WHERE ema.material_id = rm.id
    )
  ON CONFLICT (employee_id, material_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_material_rows := v_material_rows + v_inserted;

  -- ── Verification ────────────────────────────────────────────────────────────
  WITH branch_managers AS (
    SELECT e.id AS employee_id, e.branch_id
    FROM employees e
    WHERE e.role = 'Warehouse Manager'
      AND e.status = 'active'
      AND e.branch_id IS NOT NULL
  ),
  branch_product_catalog AS (
    SELECT DISTINCT p.id AS product_id, b.id AS branch_id, p.category_id
    FROM products p
    INNER JOIN branches b ON (
      p.branch = b.name
      OR p.branch = CASE b.code
        WHEN 'MNL' THEN 'Manila'
        WHEN 'CEB' THEN 'Cebu'
        WHEN 'BTG' THEN 'Batangas'
        WHEN 'QZN' THEN 'Quezon'
        ELSE NULL
      END
      OR EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id
          AND (
            pv.branch = b.name
            OR pv.branch = CASE b.code
              WHEN 'MNL' THEN 'Manila'
              WHEN 'CEB' THEN 'Cebu'
              WHEN 'BTG' THEN 'Batangas'
              WHEN 'QZN' THEN 'Quezon'
              ELSE NULL
            END
          )
      )
    )
    WHERE p.status IS DISTINCT FROM 'Discontinued'
      AND EXISTS (SELECT 1 FROM branch_managers bm WHERE bm.branch_id = b.id)
  ),
  branch_material_catalog AS (
    SELECT DISTINCT rm.id AS material_id, b.id AS branch_id
    FROM branches b
    INNER JOIN raw_materials rm ON rm.status IS DISTINCT FROM 'Discontinued'
    LEFT JOIN material_categories mc ON mc.id = rm.category_id
    WHERE EXISTS (SELECT 1 FROM branch_managers bm WHERE bm.branch_id = b.id)
      AND (
        mc.branch_id = b.id
        OR EXISTS (
          SELECT 1 FROM material_stock ms
          WHERE ms.material_id = rm.id AND ms.branch_id = b.id
        )
        OR (b.code IN ('MNL', 'CEB', 'BTG') AND rm.sku LIKE 'LMX-%')
        OR (b.code = 'QZN' AND rm.sku LIKE 'QZN-%')
      )
  )
  SELECT
    (SELECT count(*)::int FROM branch_product_catalog),
    (SELECT count(*)::int FROM branch_material_catalog),
    (SELECT count(*)::int
     FROM branch_product_catalog bpc
     WHERE NOT EXISTS (
       SELECT 1 FROM employee_product_assignments epa WHERE epa.product_id = bpc.product_id
     )),
    (SELECT count(*)::int
     FROM branch_material_catalog bmc
     WHERE NOT EXISTS (
       SELECT 1 FROM employee_material_assignments ema WHERE ema.material_id = bmc.material_id
     )),
    (SELECT count(*)::int
     FROM branch_managers bm
     WHERE NOT EXISTS (
       SELECT 1 FROM employee_product_assignments epa WHERE epa.employee_id = bm.employee_id
     )),
    (SELECT count(*)::int
     FROM branch_managers bm
     WHERE NOT EXISTS (
       SELECT 1 FROM employee_material_assignments ema WHERE ema.employee_id = bm.employee_id
     )),
    (SELECT count(*)::int
     FROM (
       SELECT DISTINCT bpc.branch_id, bpc.category_id
       FROM branch_product_catalog bpc
       WHERE bpc.category_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM employee_product_assignments epa
           WHERE epa.product_id = bpc.product_id
         )
     ) uncovered_cats)
  INTO
    v_products_total,
    v_materials_total,
    v_products_gap,
    v_materials_gap,
    v_wm_without_products,
    v_wm_without_materials,
    v_categories_gap;

  RAISE NOTICE
    'seed_warehouse_manager_assignments: % product + % material rows inserted '
    '(guarantee pass: % products, % materials); '
    'branch catalog %/% products, %/% materials covered; '
    'managers missing products=%, materials=%, uncovered categories=%',
    v_product_rows, v_material_rows,
    v_guarantee_prod_rows, v_guarantee_mat_rows,
    v_products_total - v_products_gap, v_products_total,
    v_materials_total - v_materials_gap, v_materials_total,
    v_wm_without_products, v_wm_without_materials, v_categories_gap;

  IF v_products_gap > 0
     OR v_materials_gap > 0
     OR v_wm_without_products > 0
     OR v_wm_without_materials > 0
     OR v_categories_gap > 0 THEN
    RAISE WARNING
      'seed_warehouse_manager_assignments: gaps remain — products=%, materials=%, '
      'managers without products=%, without materials=%, categories=%',
      v_products_gap, v_materials_gap,
      v_wm_without_products, v_wm_without_materials, v_categories_gap;
  END IF;
END;
$$;

SELECT
  (SELECT count(*)::int FROM employees WHERE role = 'Warehouse Manager' AND status = 'active') AS warehouse_managers,
  (SELECT count(*)::int FROM employee_product_assignments epa
   JOIN employees e ON e.id = epa.employee_id AND e.role = 'Warehouse Manager') AS product_assignment_rows,
  (SELECT count(*)::int FROM employee_material_assignments ema
   JOIN employees e ON e.id = ema.employee_id AND e.role = 'Warehouse Manager') AS material_assignment_rows,
  (SELECT count(*)::int FROM employees e
   WHERE e.role = 'Warehouse Manager' AND e.status = 'active'
     AND EXISTS (SELECT 1 FROM employee_product_assignments epa WHERE epa.employee_id = e.id)
     AND EXISTS (SELECT 1 FROM employee_material_assignments ema WHERE ema.employee_id = e.id)
  ) AS managers_with_both_types;
