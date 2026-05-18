-- =============================================================================
-- Seed: Quezon (QZN) raw materials + per-branch stock + supplier_materials links
--
-- Inserts branch-scoped material categories (required for Raw Materials UI when
-- branch = Quezon), raw materials with SKUs prefixed QZN-, stock at Quezon, and
-- catalogue rows on the Quezon suppliers from seed_suppliers_quezon.sql.
-- Material monthly_consumption / yearly_consumption are left at 0 until BOM usage exists.
--
-- Requires:
--   • branches row code QZN (seed_quezon_branch_employees.sql)
--   • Quezon suppliers (seed_suppliers_quezon.sql)
--
-- Re-runnable: NOT EXISTS on raw_materials.sku; categories upsert by slug;
--             material_stock / supplier_materials ON CONFLICT DO UPDATE / NOTHING.
-- =============================================================================

DO $$
DECLARE
  b_id uuid;
BEGIN
  SELECT id INTO b_id FROM branches WHERE code = 'QZN' LIMIT 1;
  IF b_id IS NULL THEN
    RAISE EXCEPTION 'seed_quezon_raw_materials: branch QZN not found';
  END IF;

  -- Categories scoped to Quezon (unique global name/slug)
  INSERT INTO material_categories (name, slug, description, sort_order, is_active, branch_id)
  VALUES
    ('Quezon — PVC Resin',        'qzn-pvc-resin',        'PVC compounds — Quezon plant',              1, true, b_id),
    ('Quezon — HDPE Resin',       'qzn-hdpe-resin',       'HDPE pellets — Quezon',                    2, true, b_id),
    ('Quezon — Fillers',          'qzn-fillers',          'Mineral fillers — Quezon',                 3, true, b_id),
    ('Quezon — Stabilizers',      'qzn-stabilizers',      'Heat stabilizers — Quezon',               4, true, b_id),
    ('Quezon — Plasticizers',     'qzn-plasticizers',     'DOP / plasticizer cuts — Quezon',        5, true, b_id),
    ('Quezon — Rubber',           'qzn-rubber',           'Natural rubber — Quezon',                  6, true, b_id),
    ('Quezon — Packaging',        'qzn-packaging',        'Bags film drums — Quezon',               7, true, b_id),
    ('Quezon — Solvents',         'qzn-solvents',         'Industrial solvents — Quezon',            8, true, b_id),
    ('Quezon — Adhesives',        'qzn-adhesives',        'Adhesives & pastes — Quezon',             9, true, b_id)
  ON CONFLICT (slug) DO UPDATE SET
    branch_id   = EXCLUDED.branch_id,
    sort_order  = EXCLUDED.sort_order,
    is_active   = true,
    description = EXCLUDED.description;

  -- Raw materials (skip if SKU exists)
  INSERT INTO raw_materials (
    name, sku, brand, category_id, description,
    unit_of_measure, total_stock, cost_per_unit, status,
    monthly_consumption, reorder_point, safety_stock, primary_supplier
  )
  SELECT
    v.name,
    v.sku,
    v.brand,
    mc.id,
    v.description,
    v.uom::unit_of_measure,
    v.stock,
    v.cost,
    'Active'::material_status,
    v.monthly_use,
    v.reorder_pt,
    v.safety,
    v.primary_label
  FROM (VALUES
    ('QZN Suspension PVC Resin K-67',     'QZN-RM-PVC-001',  'Formosa / Lucena blend',
     'qzn-pvc-resin',     'kg',     18500::numeric, 92::numeric,  0::numeric, 6000::numeric, 2500::numeric,
     'Imported suspension PVC for Quezon extrusion lines', 'Lucena Polymer Supply Co.'),
    ('QZN HDPE Injection MFI 8',          'QZN-RM-HDPE-001', 'Local grade',
     'qzn-hdpe-resin',    'kg',     9200::numeric,  78::numeric, 0::numeric, 4000::numeric, 1500::numeric,
     'HDPE for fittings and crates', 'Lucena Polymer Supply Co.'),
    ('QZN Ground Calcium Carbonate G-cc', 'QZN-RM-CACO3-001', 'Sierra blend',
     'qzn-fillers',       'kg',     24000::numeric, 14::numeric,  0::numeric, 10000::numeric, 5000::numeric,
     'Fine GCC filler for rigid PVC', 'Sierra Madre Industrial Minerals'),
    ('QZN Ca-Zn One-Pack Stabilizer',    'QZN-RM-STAB-001', 'Calabarzon',
     'qzn-stabilizers',   'kg',     2100::numeric,  148::numeric, 0::numeric, 600::numeric, 200::numeric,
     'Lead-free stabilizer pack', 'Calabarzon Specialty Chemicals – Quezon Hub'),
    ('QZN General Purpose Plasticizer', 'QZN-RM-DOP-001',  'Polillo ref',
     'qzn-plasticizers',  'liter',  3200::numeric,  72::numeric, 0::numeric, 1200::numeric, 400::numeric,
     'Phthalate-type plasticizer for soft PVC', 'Polillo Industrial Solvents Ltd.'),
    ('QZN SMR CV Rubber Bale',          'QZN-RM-RUB-001',  'SLRI',
     'qzn-rubber',        'kg',     1500::numeric,  115::numeric, 0::numeric, 400::numeric, 120::numeric,
     'Natural rubber for specialty runs', 'South Luzon Rubber & Latex Inc.'),
    ('QZN Woven PP Sack 50 kg',          'QZN-PKG-SACK-001', 'Bondoc',
     'qzn-packaging',     'pieces', 18000::numeric, 18::numeric, 0::numeric, 6000::numeric, 2000::numeric,
     'Printed woven sacks', 'Bondoc Peninsula Packaging Corp.'),
    ('QZN PE Blown Film Roll',         'QZN-PKG-FILM-001', 'Tayabas',
     'qzn-packaging',     'kg',     4800::numeric,  58::numeric, 0::numeric, 1600::numeric, 600::numeric,
     'PE film for inner liners', 'Tayabas Flexo Print & Film'),
    ('QZN HDPE Drum 200 L',            'QZN-PKG-DRUM-001', 'Pacific Rim',
     'qzn-packaging',     'drums',  220::numeric,   2850::numeric, 0::numeric, 60::numeric, 24::numeric,
     'Reconditioned + new drums', 'Pacific Rim Container Quezon'),
    ('QZN Industrial Solvent Blend',   'QZN-RM-SOLV-001', 'Polillo',
     'qzn-solvents',      'liter',  1600::numeric,  95::numeric, 0::numeric, 500::numeric, 150::numeric,
     'Cleaning / flush solvent', 'Polillo Industrial Solvents Ltd.'),
    ('QZN PVC adhesive paste',         'QZN-RM-ADH-001', 'Calabarzon',
     'qzn-adhesives',     'kg',     850::numeric,   132::numeric, 0::numeric, 250::numeric, 80::numeric,
     'Solvent-borne PVC cement analogue', 'Calabarzon Specialty Chemicals – Quezon Hub')
  ) AS v(
    name, sku, brand, cat_slug, uom, stock, cost, monthly_use, reorder_pt, safety, description, primary_label
  )
  JOIN material_categories mc ON mc.slug = v.cat_slug AND mc.branch_id = b_id
  WHERE NOT EXISTS (SELECT 1 FROM raw_materials r WHERE r.sku = v.sku);

  -- Per-branch stock at Quezon
  INSERT INTO material_stock (material_id, branch_id, quantity)
  SELECT rm.id, b_id, v.qty
  FROM raw_materials rm
  JOIN (VALUES
    ('QZN-RM-PVC-001', 18500::numeric),
    ('QZN-RM-HDPE-001', 9200::numeric),
    ('QZN-RM-CACO3-001', 24000::numeric),
    ('QZN-RM-STAB-001', 2100::numeric),
    ('QZN-RM-DOP-001', 3200::numeric),
    ('QZN-RM-RUB-001', 1500::numeric),
    ('QZN-PKG-SACK-001', 18000::numeric),
    ('QZN-PKG-FILM-001', 4800::numeric),
    ('QZN-PKG-DRUM-001', 220::numeric),
    ('QZN-RM-SOLV-001', 1600::numeric),
    ('QZN-RM-ADH-001', 850::numeric)
  ) AS v(sku, qty) ON rm.sku = v.sku
  ON CONFLICT (material_id, branch_id) DO UPDATE SET
    quantity   = EXCLUDED.quantity,
    updated_at = NOW();

  -- Align aggregate total_stock on raw_materials with Quezon bin (single-branch seed)
  UPDATE raw_materials rm
  SET total_stock = ms.quantity, updated_at = NOW()
  FROM material_stock ms
  WHERE ms.material_id = rm.id AND ms.branch_id = b_id
    AND rm.sku LIKE 'QZN-%';

  -- No implied usage until BOM / production tracks it (fixes older seed runs that set monthly_consumption)
  UPDATE raw_materials
  SET
    monthly_consumption = 0,
    yearly_consumption  = 0,
    updated_at          = NOW()
  WHERE sku LIKE 'QZN-%';

  -- Supplier catalogue: (supplier_name, material_sku, unit_price, lead_days, min_order, preferred)
  INSERT INTO supplier_materials (supplier_id, material_id, unit_price, lead_time_days, min_order_qty, is_preferred)
  SELECT s.id, rm.id, x.price, x.lead_days, x.min_ord, x.pref
  FROM (VALUES
    -- Lucena Polymer — resins
    ('Lucena Polymer Supply Co.',           'QZN-RM-PVC-001',    91::numeric, 14, 1000::numeric, true),
    ('Lucena Polymer Supply Co.',           'QZN-RM-HDPE-001',    77::numeric, 14,  800::numeric, true),
    -- Sierra Madre — filler
    ('Sierra Madre Industrial Minerals',    'QZN-RM-CACO3-001',  13.5::numeric, 18, 5000::numeric, true),
    ('Lucena Polymer Supply Co.',           'QZN-RM-CACO3-001',  14.2::numeric, 21, 3000::numeric, false),
    -- Calabarzon hub — stabilizer, adhesive; also alternate PVC
    ('Calabarzon Specialty Chemicals – Quezon Hub', 'QZN-RM-STAB-001', 147::numeric,  9,  500::numeric, true),
    ('Calabarzon Specialty Chemicals – Quezon Hub', 'QZN-RM-ADH-001',  131::numeric,  7,  100::numeric, true),
    ('Calabarzon Specialty Chemicals – Quezon Hub', 'QZN-RM-PVC-001',  94::numeric,  7,  500::numeric, false),
    -- Polillo — plasticizer & solvent
    ('Polillo Industrial Solvents Ltd.',    'QZN-RM-DOP-001',    71::numeric, 14,  500::numeric, true),
    ('Polillo Industrial Solvents Ltd.',    'QZN-RM-SOLV-001',   93::numeric, 14,  200::numeric, true),
    -- Rubber
    ('South Luzon Rubber & Latex Inc.',     'QZN-RM-RUB-001',   112::numeric, 21,  500::numeric, true),
    -- Packaging
    ('Bondoc Peninsula Packaging Corp.',      'QZN-PKG-SACK-001',  17.5::numeric, 10, 2000::numeric, true),
    ('Bondoc Peninsula Packaging Corp.',      'QZN-PKG-FILM-001',  59::numeric, 12,  800::numeric, false),
    ('Tayabas Flexo Print & Film',          'QZN-PKG-FILM-001',  57::numeric, 12,  500::numeric, true),
    ('Pacific Rim Container Quezon',        'QZN-PKG-DRUM-001', 2820::numeric, 18,   12::numeric, true)
  ) AS x(supplier_name, sku, price, lead_days, min_ord, pref)
  JOIN suppliers s ON s.name = x.supplier_name
  JOIN raw_materials rm ON rm.sku = x.sku
  ON CONFLICT (supplier_id, material_id) DO UPDATE SET
    unit_price     = EXCLUDED.unit_price,
    lead_time_days = EXCLUDED.lead_time_days,
    min_order_qty  = EXCLUDED.min_order_qty,
    is_preferred   = EXCLUDED.is_preferred;

END $$;
