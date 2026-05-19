-- ============================================================================
-- overhaul_preflight_check.sql
-- Read-only diagnostic. Paste into Supabase SQL Editor BEFORE running
-- `overhaul_wipe.sql` + `overhaul_reseed.sql`.
--
-- For each of the 4 target branches (MNL, CEB, BTG, QZN), reports:
--   1. Branch exists / active
--   2. Active Sales Agents (need ≥ 1 to host customers)
--   3. Active Truck Drivers (need ≥ 1 for Phase 4 trips)
--   4. Trucks with capacity set (need ≥ 1 for Phase 4 trips)
--   5. Active product_variants tagged to this branch
--      and how many have BOM rows / weight / volume / shipping dims
--   6. Raw materials with cost_per_unit set (affects material_consumption.total_cost)
--
-- A red flag = "needed but zero". A yellow flag = partial coverage; reseed
-- will degrade gracefully (fallback variant from any branch, computed volume,
-- $0 material cost) but realism suffers.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Branches present & active
-- ---------------------------------------------------------------------------
SELECT '1. branches' AS section, code, name, is_active
FROM branches
WHERE code IN ('MNL','CEB','BTG','QZN')
ORDER BY code;


-- ---------------------------------------------------------------------------
-- 1b. Navbar alignment (Orders / Logistics / Warehouse filter by branches.name)
--     Must match src/constants/lamtexBranches.ts exactly.
-- ---------------------------------------------------------------------------
SELECT
  b.code,
  b.name AS branches_name_in_db,
  v.app_navbar_label,
  CASE WHEN b.name = v.app_navbar_label THEN 'OK' ELSE 'MISMATCH — fix branches.name or lamtexBranches.ts' END AS navbar_check
FROM branches b
JOIN (VALUES
  ('MNL', 'Manila'),
  ('CEB', 'Cebu'),
  ('BTG', 'Batangas'),
  ('QZN', 'Quezon')
) AS v(code, app_navbar_label) ON v.code = b.code
WHERE b.code IN ('MNL','CEB','BTG','QZN')
ORDER BY b.code;


-- ---------------------------------------------------------------------------
-- 2-4. People + fleet per branch
-- ---------------------------------------------------------------------------
SELECT
  b.code AS branch,
  -- Sales Agents
  COUNT(*) FILTER (WHERE e.role = 'Sales Agent'::employee_role AND e.status = 'active') AS active_sales_agents,
  -- Truck drivers
  (SELECT COUNT(*) FROM employees e2 WHERE e2.branch_id = b.id AND e2.role = 'Truck Driver'::employee_role AND e2.status = 'active') AS active_truck_drivers,
  -- Vehicles
  (SELECT COUNT(*) FROM vehicles v WHERE v.branch_id = b.id AND COALESCE(v.status::TEXT,'Available') <> 'Out of Service') AS usable_vehicles,
  (SELECT COUNT(*) FROM vehicles v WHERE v.branch_id = b.id AND v.max_weight_kg > 0 AND v.max_volume_cbm > 0) AS vehicles_with_capacity
FROM branches b
LEFT JOIN employees e ON e.branch_id = b.id
WHERE b.code IN ('MNL','CEB','BTG','QZN')
GROUP BY b.code, b.id
ORDER BY b.code;


-- ---------------------------------------------------------------------------
-- 5. Product variants per branch + completeness
-- ---------------------------------------------------------------------------
-- Scope by branches.code; variants join on product_variants.branch = branches.name
WITH branch_pool AS (
  SELECT code, name FROM branches WHERE code IN ('MNL','CEB','BTG','QZN')
),
variant_stats AS (
  SELECT
    bp.code AS branch,
    bp.name AS branch_name,
    COUNT(pv.id)                                              AS total_variants,
    COUNT(pv.id) FILTER (WHERE pv.status = 'Active')          AS active_variants,
    COUNT(pv.id) FILTER (WHERE pv.weight_kg          IS NOT NULL AND pv.weight_kg          > 0) AS with_weight,
    COUNT(pv.id) FILTER (WHERE pv.volume_cbm         IS NOT NULL AND pv.volume_cbm         > 0) AS with_volume_explicit,
    COUNT(pv.id) FILTER (WHERE pv.outer_diameter_mm  IS NOT NULL AND pv.outer_diameter_mm  > 0) AS with_outer_diameter,
    COUNT(pv.id) FILTER (WHERE pv.length_m           IS NOT NULL AND pv.length_m           > 0) AS with_length,
    COUNT(pv.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM product_variant_raw_materials bom WHERE bom.variant_id = pv.id
      )
    ) AS variants_with_bom
  FROM branch_pool bp
  LEFT JOIN product_variants pv ON pv.branch = bp.name AND pv.status = 'Active'
  GROUP BY bp.code, bp.name
)
SELECT
  branch,
  active_variants,
  variants_with_bom,
  CASE WHEN active_variants = 0 THEN '–'
       ELSE ROUND(100.0 * variants_with_bom / active_variants, 1)::TEXT || '%'
  END AS bom_coverage_pct,
  with_weight,
  with_volume_explicit,
  CASE WHEN active_variants = 0 THEN '–'
       ELSE ROUND(100.0 * with_volume_explicit / active_variants, 1)::TEXT || '%'
  END AS explicit_volume_pct,
  with_outer_diameter,
  with_length,
  -- "computable volume" = explicit OR (outer_diameter AND length)
  CASE WHEN active_variants = 0 THEN '–'
       ELSE ROUND(
         100.0 * (
           SELECT COUNT(*)
           FROM   product_variants pv2
           WHERE  pv2.branch = (SELECT name FROM branch_pool WHERE code = variant_stats.branch)
             AND  pv2.status = 'Active'
             AND  (
               (pv2.volume_cbm IS NOT NULL AND pv2.volume_cbm > 0)
               OR (pv2.outer_diameter_mm IS NOT NULL AND pv2.outer_diameter_mm > 0
                   AND pv2.length_m IS NOT NULL AND pv2.length_m > 0)
             )
         ) / active_variants, 1)::TEXT || '%'
  END AS computable_volume_pct
FROM variant_stats
ORDER BY branch;


-- ---------------------------------------------------------------------------
-- 6. Raw materials cost completeness
-- ---------------------------------------------------------------------------
SELECT
  '6. raw_materials' AS section,
  COUNT(*)                                                       AS total_active,
  COUNT(*) FILTER (WHERE cost_per_unit IS NOT NULL
                     AND cost_per_unit > 0)                      AS with_cost,
  CASE WHEN COUNT(*) = 0 THEN '–'
       ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE cost_per_unit > 0) / COUNT(*), 1)::TEXT || '%'
  END                                                            AS cost_coverage_pct
FROM raw_materials
WHERE status = 'Active';


-- ---------------------------------------------------------------------------
-- 7. Variants missing BOM (list first 20, per branch). If you want full BOM
--    coverage you'll want to add product_variant_raw_materials rows for these.
-- ---------------------------------------------------------------------------
SELECT
  b.code AS branch_code,
  pv.branch AS variant_branch_label,
  pv.sku,
  p.name AS product,
  pv.size,
  pv.unit_price
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
JOIN branches b ON b.name = pv.branch AND b.code IN ('MNL','CEB','BTG','QZN')
WHERE pv.status = 'Active'
  AND NOT EXISTS (SELECT 1 FROM product_variant_raw_materials bom WHERE bom.variant_id = pv.id)
ORDER BY b.code, pv.sku
LIMIT 20;


-- ---------------------------------------------------------------------------
-- 8. Summary: who is "fully ready" vs who has gaps
-- ---------------------------------------------------------------------------
WITH per_branch AS (
  SELECT
    b.code AS branch,
    (SELECT COUNT(*) FROM employees e WHERE e.branch_id = b.id AND e.role = 'Sales Agent'  AND e.status = 'active') AS agents,
    (SELECT COUNT(*) FROM employees e WHERE e.branch_id = b.id AND e.role = 'Truck Driver' AND e.status = 'active') AS drivers,
    (SELECT COUNT(*) FROM vehicles  v WHERE v.branch_id = b.id AND v.max_weight_kg > 0 AND v.max_volume_cbm > 0)     AS trucks,
    (SELECT COUNT(*) FROM product_variants pv WHERE pv.branch = b.name AND pv.status = 'Active')                     AS variants,
    (SELECT COUNT(*) FROM product_variants pv
       WHERE pv.branch = b.name AND pv.status = 'Active'
         AND EXISTS (SELECT 1 FROM product_variant_raw_materials bom WHERE bom.variant_id = pv.id))                  AS variants_with_bom
  FROM branches b
  WHERE b.code IN ('MNL','CEB','BTG','QZN')
)
SELECT
  branch,
  agents, drivers, trucks, variants, variants_with_bom,
  CASE
    WHEN agents = 0                THEN 'BLOCKER: no sales agents — customers cannot be created'
    WHEN variants = 0              THEN 'BLOCKER: no active variants — line items will fall back to other branches'
    WHEN drivers = 0 OR trucks = 0 THEN 'WARNING: no driver/truck — Phase 4 will skip trips for this branch'
    WHEN variants_with_bom = 0     THEN 'WARNING: no BOM — Phase 3 will produce zero material_consumption rows for this branch'
    WHEN variants_with_bom < variants
                                   THEN 'PARTIAL: only ' ||
                                        ROUND(100.0 * variants_with_bom / variants, 1)::TEXT ||
                                        '% of variants have BOM'
    ELSE                                'OK'
  END AS readiness
FROM per_branch
ORDER BY branch;
