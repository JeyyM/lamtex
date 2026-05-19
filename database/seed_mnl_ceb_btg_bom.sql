-- ============================================================================
-- seed_mnl_ceb_btg_bom.sql
-- Backfill BOM (product_variant_raw_materials) for Active product_variants
-- tagged to Manila / Cebu / Batangas — these come from `apply.sql` which
-- creates variants but never attaches raw materials.
--
-- What this script does
--   1. Ensures eight generic raw_materials exist (idempotent on sku):
--        - LMX-RM-PVC-001   PVC Resin K-65 (PVC Resin)
--        - LMX-RM-HDPE-001  HDPE Pellets PE100 (HDPE Resin)
--        - LMX-RM-PPR-001   PPR Random Copolymer (PPR Resin)
--        - LMX-RM-STAB-001  Calcium-Zinc Stabilizer (Stabilizers)
--        - LMX-RM-DOP-001   DOP Plasticizer (Plasticizers)
--        - LMX-RM-CACO3-001 Calcium Carbonate Filler (Additives)
--        - LMX-RM-COLOR-001 Color Masterbatch — White (Colorants)
--        - LMX-PKG-FILM-001 PE Shrink Wrap (Packaging Materials)
--   2. Inserts BOM rows for every Active variant in Manila/Cebu/Batangas
--      that currently has ZERO BOM rows. Variants that already have BOM
--      (e.g. Quezon) are left untouched.
--      Quantities are scaled per the variant's weight_kg using factors
--      that match how QZN's BOM was sized in
--      `seed_quezon_products_and_bom.sql`.
--
-- Mapping (driven by product_categories.slug → which the apply.sql
-- categories already follow):
--
--   HDPE family   (m-hdpe-pipes, c-hdpe-pipes, b-industrial-pipes,
--                  m-pressure-line, b-drainage-systems, m-hdpe-fittings,
--                  b-hdpe-fittings)
--     HDPE Resin       0.92 × weight
--     Stabilizer       0.020 × weight
--     Colorant         0.005 × weight
--     Packaging        0.030 × weight
--
--   PVC family    (m-upvc-sanitary, m-upvc-electrical, c-pvc-conduits,
--                  c-sanitary-fittings, b-chemical-pvc)
--     PVC Resin        0.78 × weight
--     CaCO3            0.10 × weight
--     Stabilizer       0.025 × weight
--     Plasticizer      0.05 × weight
--     Colorant         0.005 × weight
--
--   PPR family    (m-ppr-pipes)
--     PPR Resin        0.94 × weight
--     Stabilizer       0.025 × weight
--     Colorant         0.005 × weight
--
--   Flexible Hose family (c-garden-hoses, b-flexible-hoses)
--     PVC Resin        0.55 × weight
--     Plasticizer      0.30 × weight
--     CaCO3            0.05 × weight
--     Stabilizer       0.020 × weight
--     Colorant         0.010 × weight
--
--   Fallback (any other slug, or no category)
--     PVC Resin        0.70 × weight
--     Stabilizer       0.030 × weight
--     Packaging        0.020 × weight
--
-- Run in: Supabase Dashboard → SQL Editor BEFORE running
-- `overhaul_wipe.sql` + `overhaul_reseed.sql`.
-- Idempotent: re-runnable; will only add BOM for variants with zero BOM.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Ensure global material_categories exist (required for step 1).
--    Some DBs only have branch-scoped Quezon categories; this script needs the
--    standard names from schema.sql seed.
-- ---------------------------------------------------------------------------
INSERT INTO material_categories (name, slug, sort_order, is_active)
VALUES
  ('PVC Resin',             'lmx-cat-pvc-resin',           1,  TRUE),
  ('HDPE Resin',            'lmx-cat-hdpe-resin',          2,  TRUE),
  ('PPR Resin',             'lmx-cat-ppr-resin',           3,  TRUE),
  ('Stabilizers',           'lmx-cat-stabilizers',         4,  TRUE),
  ('Plasticizers',          'lmx-cat-plasticizers',        5,  TRUE),
  ('Colorants',             'lmx-cat-colorants',           7,  TRUE),
  ('Additives',             'lmx-cat-additives',           8,  TRUE),
  ('Packaging Materials',   'lmx-cat-packaging-materials', 9,  TRUE)
ON CONFLICT (name) DO UPDATE SET
  is_active   = TRUE,
  sort_order  = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- 1. Seed the eight generic raw_materials we'll reference.
-- ---------------------------------------------------------------------------
INSERT INTO raw_materials (
  name, sku, brand, category_id,
  description, unit_of_measure,
  total_stock, reorder_point, safety_stock,
  cost_per_unit, currency, last_purchase_price, average_cost,
  primary_supplier, lead_time_days,
  status
)
SELECT v.name, v.sku, v.brand, mc.id,
       v.description, v.uom::unit_of_measure,
       v.stock, v.reorder, v.safety,
       v.cost, 'PHP', v.cost, v.cost,
       v.supplier, v.lead,
       'Active'::material_status
FROM (VALUES
  ('PVC Resin K-65',           'LMX-RM-PVC-001',   'LMX',  'PVC Resin',
   'Suspension-grade PVC resin K-value 65 for pipe extrusion.',
   'kg', 8000.0,  2000.0, 1000.0,  85.50, 'Solvay PH', 14),

  ('HDPE Pellets PE100',       'LMX-RM-HDPE-001',  'LMX',  'HDPE Resin',
   'High-density polyethylene pellets, PE100 grade, for pressure pipes.',
   'kg', 6000.0,  1500.0,  750.0,  95.00, 'Borouge', 21),

  ('PPR Random Copolymer',     'LMX-RM-PPR-001',   'LMX',  'PPR Resin',
   'Random copolymer polypropylene for hot/cold potable lines.',
   'kg', 1800.0,   500.0,  250.0, 125.00, 'Sabic', 28),

  ('Calcium-Zinc Stabilizer',  'LMX-RM-STAB-001',  'LMX',  'Stabilizers',
   'Lead-free calcium-zinc heat stabilizer for PVC processing.',
   'kg',  900.0,   200.0,  100.0, 250.00, 'Galata Chem', 30),

  ('DOP Plasticizer',          'LMX-RM-DOP-001',   'LMX',  'Plasticizers',
   'Dioctyl phthalate plasticizer for flexible PVC compounds.',
   'liter', 1500.0, 400.0, 200.0,  95.00, 'Eastman', 30),

  ('Calcium Carbonate Filler', 'LMX-RM-CACO3-001', 'LMX',  'Additives',
   'Ground calcium carbonate filler, ultra-fine grade.',
   'kg', 12000.0, 3000.0, 1500.0,  28.00, 'Imerys', 14),

  ('Color Masterbatch — White','LMX-RM-COLOR-001', 'LMX',  'Colorants',
   'Titanium dioxide based white masterbatch for plastics.',
   'kg',  600.0,   150.0,   75.0, 340.00, 'Cabot', 30),

  ('PE Shrink Wrap',           'LMX-PKG-FILM-001', 'LMX',  'Packaging Materials',
   'Polyethylene shrink wrap film for outbound bundling.',
   'kg', 1200.0,   300.0,  150.0,  72.00, 'LocalPack PH', 7)
) AS v(name, sku, brand, cat_name, description, uom, stock, reorder, safety, cost, supplier, lead)
JOIN material_categories mc ON mc.name = v.cat_name
ON CONFLICT (sku) DO NOTHING;

-- Make sure stocks exist per branch for these raw materials (so material_stock
-- queries don't have nulls). 25% of total goes to each of 4 branches.
INSERT INTO material_stock (material_id, branch_id, quantity)
SELECT rm.id, b.id, ROUND(rm.total_stock * 0.25, 4)
FROM raw_materials rm
CROSS JOIN branches b
WHERE rm.sku IN (
  'LMX-RM-PVC-001','LMX-RM-HDPE-001','LMX-RM-PPR-001','LMX-RM-STAB-001',
  'LMX-RM-DOP-001','LMX-RM-CACO3-001','LMX-RM-COLOR-001','LMX-PKG-FILM-001'
)
  AND b.code IN ('MNL','CEB','BTG','QZN')
ON CONFLICT (material_id, branch_id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. Insert BOM rows for variants in MNL / CEB / BTG that have ZERO BOM today.
-- ---------------------------------------------------------------------------
-- Branch scope uses `branches.code` (MNL, CEB, BTG) joined to the denormalized
-- `product_variants.branch` text (= `branches.name`). Quezon (QZN) variants
-- already have BOM from seed_quezon_products_and_bom.sql — skipped via NOT EXISTS.
DO $bom$
DECLARE
  -- Raw material IDs (resolved up-front)
  rm_pvc    UUID;
  rm_hdpe   UUID;
  rm_ppr    UUID;
  rm_stab   UUID;
  rm_dop    UUID;
  rm_caco3  UUID;
  rm_color  UUID;
  rm_pkg    UUID;

  r_v       RECORD;
  v_slug    TEXT;
  v_family  TEXT;        -- 'hdpe' | 'pvc' | 'ppr' | 'hose' | 'fallback'
  v_w       NUMERIC;
  v_count_added INT := 0;
  v_count_skip  INT := 0;
BEGIN
  SELECT id INTO rm_pvc   FROM raw_materials WHERE sku = 'LMX-RM-PVC-001';
  SELECT id INTO rm_hdpe  FROM raw_materials WHERE sku = 'LMX-RM-HDPE-001';
  SELECT id INTO rm_ppr   FROM raw_materials WHERE sku = 'LMX-RM-PPR-001';
  SELECT id INTO rm_stab  FROM raw_materials WHERE sku = 'LMX-RM-STAB-001';
  SELECT id INTO rm_dop   FROM raw_materials WHERE sku = 'LMX-RM-DOP-001';
  SELECT id INTO rm_caco3 FROM raw_materials WHERE sku = 'LMX-RM-CACO3-001';
  SELECT id INTO rm_color FROM raw_materials WHERE sku = 'LMX-RM-COLOR-001';
  SELECT id INTO rm_pkg   FROM raw_materials WHERE sku = 'LMX-PKG-FILM-001';

  IF rm_pvc IS NULL OR rm_hdpe IS NULL OR rm_ppr IS NULL OR rm_stab IS NULL
     OR rm_dop IS NULL OR rm_caco3 IS NULL OR rm_color IS NULL OR rm_pkg IS NULL THEN
    RAISE EXCEPTION
      'seed_mnl_ceb_btg_bom: missing LMX raw_materials after step 1. '
      'Check material_categories names (PVC Resin, HDPE Resin, …) exist. '
      'Missing SKUs: pvc=% hdpe=% ppr=% stab=% dop=% caco3=% color=% pkg=%',
      rm_pvc IS NULL, rm_hdpe IS NULL, rm_ppr IS NULL, rm_stab IS NULL,
      rm_dop IS NULL, rm_caco3 IS NULL, rm_color IS NULL, rm_pkg IS NULL;
  END IF;

  FOR r_v IN
    SELECT pv.id            AS variant_id,
           pv.sku            AS variant_sku,
           pv.branch         AS variant_branch,
           COALESCE(pv.weight_kg, 0.5) AS weight_kg,
           LOWER(COALESCE(pc.slug, ''))  AS slug
    FROM product_variants pv
    JOIN products         p  ON p.id = pv.product_id
    JOIN branches         b  ON b.name = pv.branch AND b.code IN ('MNL', 'CEB', 'BTG')
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    WHERE pv.status = 'Active'
      AND NOT EXISTS (
        SELECT 1 FROM product_variant_raw_materials bom WHERE bom.variant_id = pv.id
      )
  LOOP
    v_slug := r_v.slug;
    v_w    := r_v.weight_kg;

    -- Determine family from the category slug
    IF v_slug IN ('m-hdpe-pipes','c-hdpe-pipes','b-industrial-pipes',
                  'm-pressure-line','b-drainage-systems',
                  'm-hdpe-fittings','b-hdpe-fittings') THEN
      v_family := 'hdpe';
    ELSIF v_slug IN ('m-upvc-sanitary','m-upvc-electrical','c-pvc-conduits',
                     'c-sanitary-fittings','b-chemical-pvc') THEN
      v_family := 'pvc';
    ELSIF v_slug IN ('m-ppr-pipes') THEN
      v_family := 'ppr';
    ELSIF v_slug IN ('c-garden-hoses','b-flexible-hoses') THEN
      v_family := 'hose';
    ELSE
      v_family := 'fallback';
    END IF;

    -- Insert the BOM rows per family
    IF v_family = 'hdpe' THEN
      INSERT INTO product_variant_raw_materials (variant_id, raw_material_id, quantity_needed, unit_of_measure, notes) VALUES
        (r_v.variant_id, rm_hdpe,  GREATEST(ROUND(v_w * 0.92, 4),  0.0001), 'kg',     'Auto-seed: HDPE main resin'),
        (r_v.variant_id, rm_stab,  GREATEST(ROUND(v_w * 0.020, 4), 0.0001), 'kg',     'Auto-seed: heat stabilizer'),
        (r_v.variant_id, rm_color, GREATEST(ROUND(v_w * 0.005, 4), 0.0001), 'kg',     'Auto-seed: color masterbatch'),
        (r_v.variant_id, rm_pkg,   GREATEST(ROUND(v_w * 0.030, 4), 0.0001), 'kg',     'Auto-seed: shrink wrap');

    ELSIF v_family = 'pvc' THEN
      INSERT INTO product_variant_raw_materials (variant_id, raw_material_id, quantity_needed, unit_of_measure, notes) VALUES
        (r_v.variant_id, rm_pvc,   GREATEST(ROUND(v_w * 0.78, 4),  0.0001), 'kg',     'Auto-seed: PVC main resin'),
        (r_v.variant_id, rm_caco3, GREATEST(ROUND(v_w * 0.10, 4),  0.0001), 'kg',     'Auto-seed: CaCO3 filler'),
        (r_v.variant_id, rm_stab,  GREATEST(ROUND(v_w * 0.025, 4), 0.0001), 'kg',     'Auto-seed: heat stabilizer'),
        (r_v.variant_id, rm_dop,   GREATEST(ROUND(v_w * 0.05, 4),  0.0001), 'liter',  'Auto-seed: DOP plasticizer'),
        (r_v.variant_id, rm_color, GREATEST(ROUND(v_w * 0.005, 4), 0.0001), 'kg',     'Auto-seed: color masterbatch');

    ELSIF v_family = 'ppr' THEN
      INSERT INTO product_variant_raw_materials (variant_id, raw_material_id, quantity_needed, unit_of_measure, notes) VALUES
        (r_v.variant_id, rm_ppr,   GREATEST(ROUND(v_w * 0.94, 4),  0.0001), 'kg',     'Auto-seed: PPR main resin'),
        (r_v.variant_id, rm_stab,  GREATEST(ROUND(v_w * 0.025, 4), 0.0001), 'kg',     'Auto-seed: heat stabilizer'),
        (r_v.variant_id, rm_color, GREATEST(ROUND(v_w * 0.005, 4), 0.0001), 'kg',     'Auto-seed: color masterbatch');

    ELSIF v_family = 'hose' THEN
      INSERT INTO product_variant_raw_materials (variant_id, raw_material_id, quantity_needed, unit_of_measure, notes) VALUES
        (r_v.variant_id, rm_pvc,   GREATEST(ROUND(v_w * 0.55, 4),  0.0001), 'kg',     'Auto-seed: PVC resin (flexible)'),
        (r_v.variant_id, rm_dop,   GREATEST(ROUND(v_w * 0.30, 4),  0.0001), 'liter',  'Auto-seed: DOP plasticizer (heavy)'),
        (r_v.variant_id, rm_caco3, GREATEST(ROUND(v_w * 0.05, 4),  0.0001), 'kg',     'Auto-seed: CaCO3 filler'),
        (r_v.variant_id, rm_stab,  GREATEST(ROUND(v_w * 0.020, 4), 0.0001), 'kg',     'Auto-seed: heat stabilizer'),
        (r_v.variant_id, rm_color, GREATEST(ROUND(v_w * 0.010, 4), 0.0001), 'kg',     'Auto-seed: color masterbatch');

    ELSE
      INSERT INTO product_variant_raw_materials (variant_id, raw_material_id, quantity_needed, unit_of_measure, notes) VALUES
        (r_v.variant_id, rm_pvc,  GREATEST(ROUND(v_w * 0.70, 4),  0.0001), 'kg', 'Auto-seed: generic resin (fallback)'),
        (r_v.variant_id, rm_stab, GREATEST(ROUND(v_w * 0.030, 4), 0.0001), 'kg', 'Auto-seed: stabilizer (fallback)'),
        (r_v.variant_id, rm_pkg,  GREATEST(ROUND(v_w * 0.020, 4), 0.0001), 'kg', 'Auto-seed: packaging (fallback)');
    END IF;

    v_count_added := v_count_added + 1;
  END LOOP;

  -- Count variants we deliberately skipped (already had BOM)
  SELECT COUNT(*) INTO v_count_skip
  FROM product_variants pv
  JOIN branches b ON b.name = pv.branch AND b.code IN ('MNL', 'CEB', 'BTG')
  WHERE pv.status = 'Active'
    AND EXISTS (SELECT 1 FROM product_variant_raw_materials bom WHERE bom.variant_id = pv.id);

  RAISE NOTICE 'seed_mnl_ceb_btg_bom: BOM attached to % new variants (% skipped — already had BOM)', v_count_added, v_count_skip;
END;
$bom$;


-- ---------------------------------------------------------------------------
-- 3. Refresh raw_materials.linked_products with the product IDs that consume each material.
-- ---------------------------------------------------------------------------
UPDATE raw_materials rm SET
  linked_products = sub.product_ids,
  updated_at = NOW()
FROM (
  SELECT bom.raw_material_id,
         ARRAY_AGG(DISTINCT pv.product_id) AS product_ids
  FROM product_variant_raw_materials bom
  JOIN product_variants pv ON pv.id = bom.variant_id
  WHERE bom.raw_material_id IS NOT NULL
  GROUP BY bom.raw_material_id
) sub
WHERE rm.id = sub.raw_material_id;

COMMIT;


-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
SELECT
  b.code AS branch_code,
  b.name AS branch_name,
  COUNT(*)                                                                       AS active_variants,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM product_variant_raw_materials bom WHERE bom.variant_id = pv.id
  ))                                                                             AS variants_with_bom,
  ROUND(100.0 *
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM product_variant_raw_materials bom WHERE bom.variant_id = pv.id
        ))::NUMERIC / NULLIF(COUNT(*), 0), 1)                                    AS bom_coverage_pct
FROM product_variants pv
JOIN branches b ON b.name = pv.branch
WHERE pv.status = 'Active'
  AND b.code IN ('MNL', 'CEB', 'BTG', 'QZN')
GROUP BY b.code, b.name
ORDER BY b.code;

SELECT name, sku, status, total_stock, cost_per_unit
FROM raw_materials
WHERE sku LIKE 'LMX-%'
ORDER BY sku;
