-- ============================================================
-- apply.sql  –  Seed example specifications on raw materials
-- Run this in the Supabase SQL Editor (safe to re-run)
-- ============================================================

-- Alter default so future inserts start with an empty array
ALTER TABLE raw_materials
  ALTER COLUMN specifications SET DEFAULT '[]'::jsonb;

-- Migrate any existing {} rows to []
UPDATE raw_materials
SET specifications = '[]'::jsonb
WHERE specifications = '{}'::jsonb OR specifications IS NULL;

-- ── PVC Resin ───────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Density",          "value":"1.35–1.45 g/cm³"},
  {"label":"K-Value",          "value":"65–70"},
  {"label":"Volatile Matter",  "value":"≤ 0.3%"},
  {"label":"Apparent Density", "value":"0.45–0.55 g/mL"},
  {"label":"Particle Size",    "value":"100–160 μm"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%PVC Resin%';

-- ── HDPE Resin ──────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Density",           "value":"0.941–0.965 g/cm³"},
  {"label":"Melt Flow Index",   "value":"0.2–1.0 g/10 min"},
  {"label":"Tensile Strength",  "value":"22–31 MPa"},
  {"label":"Flexural Modulus",  "value":"1000–1550 MPa"},
  {"label":"Hardness (Shore D)","value":"60–70"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%HDPE Resin%';

-- ── PPR Resin ───────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Density",              "value":"0.90 g/cm³"},
  {"label":"Melt Flow Rate",       "value":"0.3–3.0 g/10 min"},
  {"label":"Vicat Softening Point","value":"≥ 145 °C"},
  {"label":"Tensile Strength",     "value":"≥ 25 MPa"},
  {"label":"Elongation at Break",  "value":"≥ 400%"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%PPR Resin%';

-- ── Stabilizers ─────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",         "value":"Lead / Ca-Zn / OBS"},
  {"label":"Appearance",   "value":"White to off-white powder"},
  {"label":"Purity",       "value":"≥ 98%"},
  {"label":"Melting Point","value":"270–290 °C"},
  {"label":"pH (1% aq.)",  "value":"7–9"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Stabilizer%';

-- ── Plasticizers ─────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",                "value":"DOP / DINP / DOTP"},
  {"label":"Appearance",          "value":"Clear oily liquid"},
  {"label":"Density at 20 °C",    "value":"0.980–0.986 g/cm³"},
  {"label":"Viscosity at 25 °C",  "value":"70–90 mPa·s"},
  {"label":"Flash Point",         "value":"≥ 200 °C"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Plasticizer%';

-- ── Lubricants ───────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",         "value":"Internal / External"},
  {"label":"Appearance",   "value":"White flakes / powder"},
  {"label":"Melting Point","value":"55–90 °C"},
  {"label":"Acid Value",   "value":"≤ 1 mg KOH/g"},
  {"label":"Drop Point",   "value":"60–75 °C"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Lubricant%';

-- ── Colorants ────────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",           "value":"Masterbatch / Pigment"},
  {"label":"Carrier Resin",  "value":"PVC / PE / PP"},
  {"label":"Pigment Content","value":"40–60%"},
  {"label":"Heat Stability", "value":"≥ 220 °C"},
  {"label":"Lightfastness",  "value":"Grade 6–8 (ISO 105-B02)"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Colorant%';

-- ── Additives ─────────────────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",        "value":"Impact modifier / Processing aid"},
  {"label":"Appearance",  "value":"White free-flowing powder"},
  {"label":"Bulk Density","value":"0.30–0.45 g/mL"},
  {"label":"Purity",      "value":"≥ 99%"},
  {"label":"Moisture",    "value":"≤ 0.5%"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Additive%';

-- ── Packaging Materials ───────────────────────────────────────
UPDATE raw_materials rm
SET specifications = '[
  {"label":"Type",           "value":"Bags / Labels / Stretch film"},
  {"label":"Material",       "value":"PE / PP / Kraft"},
  {"label":"Thickness",      "value":"50–100 μm"},
  {"label":"Tensile Strength","value":"≥ 15 MPa"},
  {"label":"Print Colors",   "value":"1–4 colors"}
]'::jsonb,
updated_at = NOW()
FROM material_categories mc
WHERE rm.category_id = mc.id
  AND mc.name ILIKE '%Packaging%';

-- ── VERIFY ────────────────────────────────────────────────────
SELECT mc.name AS category, rm.name AS material, rm.specifications
FROM raw_materials rm
JOIN material_categories mc ON mc.id = rm.category_id
ORDER BY mc.name, rm.name;

-- ============================================================
-- PRODUCT SEED DATA  –  Manila / Cebu / Batangas branches
-- Safe to re-run (existence checks before every INSERT)
-- ============================================================

-- 1. Ensure the three app branches exist (see `branches_lamtex_three_sites_seed.sql` + `src/constants/lamtexBranches.ts`)
INSERT INTO branches (code, name, address) VALUES
  ('MNL', 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market',   'Valenzuela City, Metro Manila'),
  ('CEB', 'Cebu (Visayas) - LAMTEX regional hub & warehouse',  'Cebu City, Cebu'),
  ('BTG', 'Batangas - LAMTEX plant & Calabarzon staging',      'Batangas City, Batangas')
ON CONFLICT (code) DO UPDATE
  SET name    = EXCLUDED.name,
      address = EXCLUDED.address;

-- 2. Ensure branch-specific product categories exist
INSERT INTO product_categories (name, slug, description, sort_order, is_active, branch) VALUES
  ('M_HDPE Pipes',        'm-hdpe-pipes',        'Heavy-duty HDPE piping for industrial use',         1, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('M_HDPE Fittings',     'm-hdpe-fittings',     'Elbows, tees, couplings for HDPE systems',          2, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('M_UPVC Sanitary',     'm-upvc-sanitary',     'Sanitary drainage and sewage pipes',                3, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('M_UPVC Electrical',   'm-upvc-electrical',   'Conduit pipes for electrical wiring',               4, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('M_Pressure Line',     'm-pressure-line',     'High-pressure rated water supply pipes',            5, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('M_PPR Pipes',         'm-ppr-pipes',         'Polypropylene random copolymer hot/cold pipes',     6, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('C_HDPE Pipes',        'c-hdpe-pipes',        'HDPE distribution pipes for Cebu operations',       1, true, 'Cebu (Visayas) - LAMTEX regional hub & warehouse'),
  ('C_PVC Conduits',      'c-pvc-conduits',      'PVC electrical conduit pipes',                       2, true, 'Cebu (Visayas) - LAMTEX regional hub & warehouse'),
  ('C_Sanitary Fittings', 'c-sanitary-fittings', 'Drainage fittings and traps',                        3, true, 'Cebu (Visayas) - LAMTEX regional hub & warehouse'),
  ('C_Garden Hoses',      'c-garden-hoses',      'Flexible garden and irrigation hoses',               4, true, 'Cebu (Visayas) - LAMTEX regional hub & warehouse'),
  ('B_Industrial Pipes',  'b-industrial-pipes',  'Heavy industrial grade piping systems',             1, true, 'Batangas - LAMTEX plant & Calabarzon staging'),
  ('B_HDPE Fittings',     'b-hdpe-fittings',     'HDPE couplings and reducers',                        2, true, 'Batangas - LAMTEX plant & Calabarzon staging'),
  ('B_Chemical PVC',      'b-chemical-pvc',      'Chemical-resistant PVC pipe systems',                3, true, 'Batangas - LAMTEX plant & Calabarzon staging'),
  ('B_Drainage Systems',  'b-drainage-systems',  'Underground drainage and stormwater pipes',          4, true, 'Batangas - LAMTEX plant & Calabarzon staging'),
  ('B_Flexible Hoses',    'b-flexible-hoses',    'Industrial flexible hose assemblies',                5, true, 'Batangas - LAMTEX plant & Calabarzon staging')
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed products + variants via PL/pgSQL
DO $$
DECLARE
  r_branch   RECORD;
  r_cat      RECORD;
  r_branch2  RECORD;
  v_prod_id  UUID;
  v_var_id   UUID;
  v_name     TEXT;
  v_sku_b    TEXT;
  v_sizes    TEXT[];
  v_prices   NUMERIC[];
  v_costs    NUMERIC[];
  v_stocks   INT[];
  v_reo      INT[];
  v_ods      NUMERIC[];
  v_walls    NUMERIC[];
  v_wts      NUMERIC[];
  v_lens     NUMERIC[];
  i          INT;
  p          INT;
  v_qty      INT;
  v_up       NUMERIC;
  v_cp       NUMERIC;
  v_stk      INT;
  v_sold     INT;
  v_sku      TEXT;
BEGIN
  FOR r_branch IN
    SELECT id, name FROM branches WHERE code IN ('MNL', 'CEB', 'BTG')
  LOOP
    -- Only load categories belonging to this branch
    FOR r_cat IN
      SELECT id, name, slug
        FROM product_categories
       WHERE is_active = TRUE
         AND branch = r_branch.name
       ORDER BY sort_order
    LOOP
      -- SKU base: branch 3-char code + first 3 alpha chars of slug (upper)
      v_sku_b := upper(left(r_branch.name, 3))
                 || upper(left(regexp_replace(r_cat.slug, '[^a-z]', '', 'g'), 3));

      -- Variant specs by slug pattern
      IF r_cat.slug IN ('m-hdpe-pipes','c-hdpe-pipes','b-industrial-pipes','m-pressure-line','b-drainage-systems') THEN
        v_sizes  := ARRAY['20mm','32mm','50mm','75mm','110mm'];
        v_prices := ARRAY[120,240,580,1080,2100]::NUMERIC[];
        v_costs  := ARRAY[84,168,406,756,1470]::NUMERIC[];
        v_stocks := ARRAY[2400,1500,950,480,180];
        v_reo    := ARRAY[800,500,300,180,80];
        v_ods    := ARRAY[20,32,50,75,110]::NUMERIC[];
        v_walls  := ARRAY[1.8,3.0,4.6,6.8,10.0]::NUMERIC[];
        v_wts    := ARRAY[0.12,0.29,0.68,1.52,3.24]::NUMERIC[];
        v_lens   := ARRAY[6,6,6,6,6]::NUMERIC[];

      ELSIF r_cat.slug IN ('m-hdpe-fittings','b-hdpe-fittings','m-upvc-sanitary',
                           'c-sanitary-fittings','m-upvc-electrical','c-pvc-conduits',
                           'b-chemical-pvc','m-ppr-pipes') THEN
        v_sizes  := ARRAY['20mm','25mm','32mm','40mm','50mm'];
        v_prices := ARRAY[45,65,95,145,220]::NUMERIC[];
        v_costs  := ARRAY[32,46,67,102,154]::NUMERIC[];
        v_stocks := ARRAY[5000,4200,3500,2800,2100];
        v_reo    := ARRAY[1500,1200,1000,800,600];
        v_ods    := ARRAY[20,25,32,40,50]::NUMERIC[];
        v_walls  := ARRAY[2.3,2.8,3.4,4.1,5.0]::NUMERIC[];
        v_wts    := ARRAY[0.05,0.08,0.14,0.22,0.38]::NUMERIC[];
        v_lens   := ARRAY[0.1,0.1,0.1,0.15,0.2]::NUMERIC[];

      ELSIF r_cat.slug IN ('c-garden-hoses','b-flexible-hoses') THEN
        v_sizes  := ARRAY['1/2" x 10m','1/2" x 20m','3/4" x 10m','3/4" x 20m','1" x 10m'];
        v_prices := ARRAY[180,320,280,520,450]::NUMERIC[];
        v_costs  := ARRAY[126,224,196,364,315]::NUMERIC[];
        v_stocks := ARRAY[1800,1200,1500,900,650];
        v_reo    := ARRAY[600,400,500,300,220];
        v_ods    := ARRAY[12.7,12.7,19.0,19.0,25.4]::NUMERIC[];
        v_walls  := ARRAY[1.5,1.5,1.8,1.8,2.2]::NUMERIC[];
        v_wts    := ARRAY[0.28,0.56,0.42,0.84,0.65]::NUMERIC[];
        v_lens   := ARRAY[10,20,10,20,10]::NUMERIC[];

      ELSE
        v_sizes  := ARRAY['Small','Medium','Large'];
        v_prices := ARRAY[150,280,450]::NUMERIC[];
        v_costs  := ARRAY[105,196,315]::NUMERIC[];
        v_stocks := ARRAY[500,350,200];
        v_reo    := ARRAY[150,120,80];
        v_ods    := ARRAY[0,0,0]::NUMERIC[];
        v_walls  := ARRAY[0,0,0]::NUMERIC[];
        v_wts    := ARRAY[0,0,0]::NUMERIC[];
        v_lens   := ARRAY[0,0,0]::NUMERIC[];
      END IF;

      -- 2 product families per category
      FOR p IN 1..2 LOOP
        v_name := r_cat.name
                  || CASE p WHEN 1 THEN ' Standard' ELSE ' Premium' END;

        SELECT id INTO v_prod_id
          FROM products
         WHERE name = v_name AND branch = r_branch.name
         LIMIT 1;

        IF v_prod_id IS NULL THEN
          INSERT INTO products (
            name, category_id, branch, description, status, total_variants, avg_price
          ) VALUES (
            v_name, r_cat.id, r_branch.name,
            CASE p
              WHEN 1 THEN 'Standard-grade ' || lower(r_cat.name)
                          || ' for commercial and residential applications. Manufactured to PNS standards.'
              ELSE        'Premium-grade '  || lower(r_cat.name)
                          || ' engineered for industrial and heavy-duty use. Exceeds PNS requirements.'
            END,
            'Active',
            array_length(v_sizes, 1),
            round(v_prices[3] * CASE p WHEN 1 THEN 1.0 ELSE 1.3 END, 2)
          )
          RETURNING id INTO v_prod_id;
        END IF;

        IF v_prod_id IS NULL THEN CONTINUE; END IF;

        FOR i IN 1..array_length(v_sizes, 1) LOOP
          v_sku  := v_sku_b || p::text || lpad(i::text, 2, '0');
          v_up   := round(v_prices[i] * CASE p WHEN 1 THEN 1.0 ELSE 1.3 END, 2);
          v_cp   := round(v_costs[i]  * CASE p WHEN 1 THEN 1.0 ELSE 1.2 END, 2);
          v_stk  := v_stocks[i] / 2 + 50;
          v_sold := (v_stocks[i] * 0.3)::INT;

          SELECT id INTO v_var_id FROM product_variants WHERE sku = v_sku;

          IF v_var_id IS NULL THEN
            INSERT INTO product_variants (
              product_id, sku, size,
              unit_price, cost_price,
              total_stock, reorder_point, safety_stock, status,
              units_sold_ytd, revenue_ytd,
              outer_diameter_mm, wall_thickness_mm, weight_kg, length_m,
              branch
            ) VALUES (
              v_prod_id, v_sku, v_sizes[i],
              v_up, v_cp,
              v_stk, v_reo[i], (v_reo[i]/2)::INT,
              CASE WHEN v_stk < v_reo[i] THEN 'Low Stock'::product_status ELSE 'Active'::product_status END,
              v_sold,
              round(v_up * v_sold, 2),
              NULLIF(v_ods[i], 0), NULLIF(v_walls[i], 0), NULLIF(v_wts[i], 0), NULLIF(v_lens[i], 0),
              r_branch.name
            )
            RETURNING id INTO v_var_id;
          END IF;

          IF v_var_id IS NULL THEN CONTINUE; END IF;

          -- Per-branch stock rows
          FOR r_branch2 IN
            SELECT id, name FROM branches WHERE code IN ('MNL', 'CEB', 'BTG')
          LOOP
            v_qty := CASE WHEN r_branch2.name = r_branch.name THEN v_stk ELSE (v_stk / 5)::INT END;
            INSERT INTO product_variant_stock (variant_id, branch_id, quantity)
            VALUES (v_var_id, r_branch2.id, v_qty)
            ON CONFLICT (variant_id, branch_id) DO NOTHING;
          END LOOP;

          -- Bulk discounts
          IF NOT EXISTS (SELECT 1 FROM product_bulk_discounts WHERE variant_id = v_var_id) THEN
            INSERT INTO product_bulk_discounts (variant_id, min_qty, max_qty, discount_percent, is_active)
            VALUES
              (v_var_id,  5,  9,    5.0, TRUE),
              (v_var_id, 10, 24,   10.0, TRUE),
              (v_var_id, 25, NULL, 15.0, TRUE);
          END IF;
        END LOOP;

        -- Refresh product aggregate stats
        UPDATE products SET
          total_variants   = (SELECT COUNT(*)                              FROM product_variants WHERE product_id = v_prod_id),
          total_stock      = (SELECT COALESCE(SUM(total_stock),       0)   FROM product_variants WHERE product_id = v_prod_id),
          avg_price        = (SELECT COALESCE(ROUND(AVG(unit_price),  2), 0) FROM product_variants WHERE product_id = v_prod_id),
          total_revenue    = (SELECT COALESCE(SUM(revenue_ytd),       0)   FROM product_variants WHERE product_id = v_prod_id),
          total_units_sold = (SELECT COALESCE(SUM(units_sold_ytd),    0)   FROM product_variants WHERE product_id = v_prod_id)
        WHERE id = v_prod_id;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Verify
SELECT b.name AS branch,
       COUNT(DISTINCT p.id)  AS product_families,
       COUNT(DISTINCT pv.id) AS variants
FROM branches b
LEFT JOIN products        p  ON p.branch     = b.name
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE b.code IN ('MNL', 'CEB', 'BTG')
GROUP BY b.name ORDER BY b.name;

