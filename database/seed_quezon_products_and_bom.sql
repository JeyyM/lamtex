-- =============================================================================
-- Seed: Quezon (QZN) product categories, products, 3 variants each, and BOM rows
--
-- Three branch-scoped product categories, one finished-good family per category,
-- three SKUs per family, each linked to Quezon raw materials (QZN-* RM SKUs).
-- Each variant sets trucking load fields (weight_kg, length_m, volume_cbm, wall_thickness_mm)
-- as one stock unit for load planning.
--
-- Requires:
--   • branch QZN + name Quezon (seed_quezon_branch_employees.sql)
--   • seed_quezon_raw_materials_and_supplier_links.sql
--
-- Re-runnable: deletes seeded products by fixed names (CASCADE removes variants,
--               stock, BOM).
-- =============================================================================

DO $$
DECLARE
  b_id           uuid;
  c_upvc         uuid;
  c_hdpe         uuid;
  c_pepack       uuid;
  p_upvc         uuid;
  p_hdpe         uuid;
  p_pepack       uuid;
  rm_pvc         uuid;
  rm_hdpe        uuid;
  rm_caco3       uuid;
  rm_stab        uuid;
  rm_dop         uuid;
  rm_film        uuid;
  rm_sack        uuid;
  rm_adh         uuid;
BEGIN
  SELECT id INTO b_id FROM branches WHERE code = 'QZN' LIMIT 1;
  IF b_id IS NULL THEN
    RAISE EXCEPTION 'seed_quezon_products_and_bom: branch QZN not found';
  END IF;

  SELECT id INTO rm_pvc   FROM raw_materials WHERE sku = 'QZN-RM-PVC-001'   LIMIT 1;
  SELECT id INTO rm_hdpe  FROM raw_materials WHERE sku = 'QZN-RM-HDPE-001'  LIMIT 1;
  SELECT id INTO rm_caco3 FROM raw_materials WHERE sku = 'QZN-RM-CACO3-001' LIMIT 1;
  SELECT id INTO rm_stab  FROM raw_materials WHERE sku = 'QZN-RM-STAB-001'  LIMIT 1;
  SELECT id INTO rm_dop   FROM raw_materials WHERE sku = 'QZN-RM-DOP-001'   LIMIT 1;
  SELECT id INTO rm_film  FROM raw_materials WHERE sku = 'QZN-PKG-FILM-001' LIMIT 1;
  SELECT id INTO rm_sack  FROM raw_materials WHERE sku = 'QZN-PKG-SACK-001' LIMIT 1;
  SELECT id INTO rm_adh   FROM raw_materials WHERE sku = 'QZN-RM-ADH-001'   LIMIT 1;

  IF rm_pvc IS NULL OR rm_hdpe IS NULL OR rm_caco3 IS NULL OR rm_stab IS NULL
     OR rm_dop IS NULL OR rm_film IS NULL OR rm_sack IS NULL OR rm_adh IS NULL THEN
    RAISE EXCEPTION 'seed_quezon_products_and_bom: missing QZN raw materials - run seed_quezon_raw_materials_and_supplier_links.sql first';
  END IF;

  DELETE FROM products
  WHERE branch = 'Quezon'
    AND name IN (
      'QZN uPVC Pipe - Standard Line',
      'QZN HDPE Fitting - Injection Line',
      'QZN PE Liner Kit - Packed SKU'
    );

  INSERT INTO product_categories (name, slug, description, sort_order, is_active, branch)
  VALUES
    ('QZN uPVC Pressure Pipe', 'qzn-upvc-pressure', 'uPVC pressure piping - Quezon catalog', 1, true, 'Quezon'),
    ('QZN HDPE Molded Parts', 'qzn-hdpe-molded', 'HDPE injection parts - Quezon catalog', 2, true, 'Quezon'),
    ('QZN PE Packaged Goods', 'qzn-pe-packaged', 'Film, liner, and sack assemblies - Quezon', 3, true, 'Quezon')
  ON CONFLICT (slug) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order  = EXCLUDED.sort_order,
    is_active   = true,
    branch      = EXCLUDED.branch;

  SELECT id INTO c_upvc   FROM product_categories WHERE slug = 'qzn-upvc-pressure' LIMIT 1;
  SELECT id INTO c_hdpe  FROM product_categories WHERE slug = 'qzn-hdpe-molded'   LIMIT 1;
  SELECT id INTO c_pepack FROM product_categories WHERE slug = 'qzn-pe-packaged'    LIMIT 1;

  -- Product 1: uPVC pipe (3 variants)
  INSERT INTO products (name, category_id, branch, description, status, total_variants, avg_price)
  VALUES (
    'QZN uPVC Pipe - Standard Line',
    c_upvc,
    'Quezon',
    'Schedule uPVC pipe extruded at Quezon using branch PVC compound recipe.',
    'Active',
    3,
    228.33
  )
  RETURNING id INTO p_upvc;

  INSERT INTO product_variants (
    product_id, sku, size, unit_price, cost_price,
    total_stock, reorder_point, safety_stock, status,
    units_sold_ytd, revenue_ytd, branch,
    weight_kg, length_m, volume_cbm, wall_thickness_mm
  )
  VALUES
    -- One stock unit = one 6 m pipe stick; volume ≈ cylindrical shipping envelope
    (p_upvc, 'QZN-PV-STD-01', '20mm',  165.00,  98.00, 420, 140, 70, 'Active', 0, 0, 'Quezon', 2.850, 6.000, 0.002950, 2.30),
    (p_upvc, 'QZN-PV-STD-02', '32mm',  210.00, 125.00, 310, 100, 50, 'Active', 0, 0, 'Quezon', 5.400, 6.000, 0.007550, 2.70),
    (p_upvc, 'QZN-PV-STD-03', '50mm',  310.00, 185.00, 180,  60, 30, 'Active', 0, 0, 'Quezon', 10.200, 6.000, 0.014900, 4.20);

  INSERT INTO product_variant_stock (variant_id, branch_id, quantity)
  SELECT v.id, b_id, v.total_stock
  FROM product_variants v
  WHERE v.product_id = p_upvc
  ON CONFLICT (variant_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity;

  INSERT INTO product_variant_raw_materials (variant_id, raw_material_id, quantity_needed, unit_of_measure)
  SELECT v.id, rm_pvc, q.pvc_kg, 'kg'::unit_of_measure
  FROM product_variants v
  CROSS JOIN (VALUES ('QZN-PV-STD-01', 2.2::numeric), ('QZN-PV-STD-02', 3.5), ('QZN-PV-STD-03', 5.6)) AS q(sku, pvc_kg)
  WHERE v.sku = q.sku
  UNION ALL
  SELECT v.id, rm_stab, q.stab_kg, 'kg'::unit_of_measure
  FROM product_variants v
  CROSS JOIN (VALUES ('QZN-PV-STD-01', 0.04::numeric), ('QZN-PV-STD-02', 0.065), ('QZN-PV-STD-03', 0.10)) AS q(sku, stab_kg)
  WHERE v.sku = q.sku
  UNION ALL
  SELECT v.id, rm_caco3, q.gcc_kg, 'kg'::unit_of_measure
  FROM product_variants v
  CROSS JOIN (VALUES ('QZN-PV-STD-01', 0.85::numeric), ('QZN-PV-STD-02', 1.35), ('QZN-PV-STD-03', 2.10)) AS q(sku, gcc_kg)
  WHERE v.sku = q.sku
  UNION ALL
  SELECT v.id, rm_dop, q.dop_l, 'liter'::unit_of_measure
  FROM product_variants v
  CROSS JOIN (VALUES ('QZN-PV-STD-01', 0.12::numeric), ('QZN-PV-STD-02', 0.19), ('QZN-PV-STD-03', 0.30)) AS q(sku, dop_l)
  WHERE v.sku = q.sku;

  -- Product 2: HDPE fitting (3 variants)
  INSERT INTO products (name, category_id, branch, description, status, total_variants, avg_price)
  VALUES (
    'QZN HDPE Fitting - Injection Line',
    c_hdpe,
    'Quezon',
    'Injection-molded HDPE fittings for Quezon distribution lines.',
    'Active',
    3,
    137.00
  )
  RETURNING id INTO p_hdpe;

  INSERT INTO product_variants (
    product_id, sku, size, unit_price, cost_price,
    total_stock, reorder_point, safety_stock, status,
    units_sold_ytd, revenue_ytd, branch,
    weight_kg, length_m, volume_cbm, wall_thickness_mm
  )
  VALUES
    -- One stock unit = one molded fitting; length = longest package axis
    (p_hdpe, 'QZN-HD-STD-01', 'DN25',  95.00,  56.00, 600, 200, 100, 'Active', 0, 0, 'Quezon', 0.260, 0.090, 0.000140, 4.50),
    (p_hdpe, 'QZN-HD-STD-02', 'DN32', 118.00,  70.00, 480, 160,  80, 'Active', 0, 0, 'Quezon', 0.440, 0.110, 0.000240, 6.00),
    (p_hdpe, 'QZN-HD-STD-03', 'DN50', 198.00, 118.00, 260,  90,  45, 'Active', 0, 0, 'Quezon', 0.980, 0.150, 0.000520, 8.50);

  INSERT INTO product_variant_stock (variant_id, branch_id, quantity)
  SELECT v.id, b_id, v.total_stock
  FROM product_variants v
  WHERE v.product_id = p_hdpe
  ON CONFLICT (variant_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity;

  INSERT INTO product_variant_raw_materials (variant_id, raw_material_id, quantity_needed, unit_of_measure)
  SELECT v.id, rm_hdpe, q.h_kg, 'kg'::unit_of_measure
  FROM product_variants v
  CROSS JOIN (VALUES ('QZN-HD-STD-01', 0.42::numeric), ('QZN-HD-STD-02', 0.58), ('QZN-HD-STD-03', 0.95)) AS q(sku, h_kg)
  WHERE v.sku = q.sku
  UNION ALL
  SELECT v.id, rm_film, q.film_kg, 'kg'::unit_of_measure
  FROM product_variants v
  CROSS JOIN (VALUES ('QZN-HD-STD-01', 0.02::numeric), ('QZN-HD-STD-02', 0.03), ('QZN-HD-STD-03', 0.05)) AS q(sku, film_kg)
  WHERE v.sku = q.sku;

  -- Product 3: PE liner kit (3 variants) — film + adhesive + sack
  INSERT INTO products (name, category_id, branch, description, status, total_variants, avg_price)
  VALUES (
    'QZN PE Liner Kit - Packed SKU',
    c_pepack,
    'Quezon',
    'Pre-cut PE liner with adhesive and retail sack - Quezon assembly.',
    'Active',
    3,
    285.00
  )
  RETURNING id INTO p_pepack;

  INSERT INTO product_variants (
    product_id, sku, size, unit_price, cost_price,
    total_stock, reorder_point, safety_stock, status,
    units_sold_ytd, revenue_ytd, branch,
    weight_kg, length_m, volume_cbm, wall_thickness_mm
  )
  VALUES
    -- One stock unit = one packed kit; wall_thickness_mm = nominal liner film gauge
    (p_pepack, 'QZN-PK-KIT-01', 'Small',  215.00, 128.00, 380, 120, 60, 'Active', 0, 0, 'Quezon', 0.820, 0.380, 0.012800, 0.50),
    (p_pepack, 'QZN-PK-KIT-02', 'Medium', 275.00, 165.00, 290,  95, 48, 'Active', 0, 0, 'Quezon', 1.250, 0.450, 0.018500, 0.60),
    (p_pepack, 'QZN-PK-KIT-03', 'Large',  365.00, 218.00, 175,  55, 28, 'Active', 0, 0, 'Quezon', 1.780, 0.520, 0.026000, 0.80);

  INSERT INTO product_variant_stock (variant_id, branch_id, quantity)
  SELECT v.id, b_id, v.total_stock
  FROM product_variants v
  WHERE v.product_id = p_pepack
  ON CONFLICT (variant_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity;

  INSERT INTO product_variant_raw_materials (variant_id, raw_material_id, quantity_needed, unit_of_measure)
  SELECT v.id, rm_film, q.film_kg, 'kg'::unit_of_measure
  FROM product_variants v
  CROSS JOIN (VALUES ('QZN-PK-KIT-01', 0.55::numeric), ('QZN-PK-KIT-02', 0.88), ('QZN-PK-KIT-03', 1.35)) AS q(sku, film_kg)
  WHERE v.sku = q.sku
  UNION ALL
  SELECT v.id, rm_adh, q.adh_kg, 'kg'::unit_of_measure
  FROM product_variants v
  CROSS JOIN (VALUES ('QZN-PK-KIT-01', 0.08::numeric), ('QZN-PK-KIT-02', 0.12), ('QZN-PK-KIT-03', 0.18)) AS q(sku, adh_kg)
  WHERE v.sku = q.sku
  UNION ALL
  SELECT v.id, rm_sack, q.sack_pc, 'pieces'::unit_of_measure
  FROM product_variants v
  CROSS JOIN (VALUES ('QZN-PK-KIT-01', 1::numeric), ('QZN-PK-KIT-02', 1::numeric), ('QZN-PK-KIT-03', 1::numeric)) AS q(sku, sack_pc)
  WHERE v.sku = q.sku;

  -- Refresh product aggregates (match apply.sql pattern)
  UPDATE products SET
    total_variants   = (SELECT COUNT(*) FROM product_variants WHERE product_id = p_upvc),
    total_stock      = (SELECT COALESCE(SUM(total_stock), 0) FROM product_variants WHERE product_id = p_upvc),
    avg_price        = (SELECT COALESCE(ROUND(AVG(unit_price), 2), 0) FROM product_variants WHERE product_id = p_upvc),
    total_revenue    = (SELECT COALESCE(SUM(revenue_ytd), 0) FROM product_variants WHERE product_id = p_upvc),
    total_units_sold = (SELECT COALESCE(SUM(units_sold_ytd), 0) FROM product_variants WHERE product_id = p_upvc)
  WHERE id = p_upvc;

  UPDATE products SET
    total_variants   = (SELECT COUNT(*) FROM product_variants WHERE product_id = p_hdpe),
    total_stock      = (SELECT COALESCE(SUM(total_stock), 0) FROM product_variants WHERE product_id = p_hdpe),
    avg_price        = (SELECT COALESCE(ROUND(AVG(unit_price), 2), 0) FROM product_variants WHERE product_id = p_hdpe),
    total_revenue    = (SELECT COALESCE(SUM(revenue_ytd), 0) FROM product_variants WHERE product_id = p_hdpe),
    total_units_sold = (SELECT COALESCE(SUM(units_sold_ytd), 0) FROM product_variants WHERE product_id = p_hdpe)
  WHERE id = p_hdpe;

  UPDATE products SET
    total_variants   = (SELECT COUNT(*) FROM product_variants WHERE product_id = p_pepack),
    total_stock      = (SELECT COALESCE(SUM(total_stock), 0) FROM product_variants WHERE product_id = p_pepack),
    avg_price        = (SELECT COALESCE(ROUND(AVG(unit_price), 2), 0) FROM product_variants WHERE product_id = p_pepack),
    total_revenue    = (SELECT COALESCE(SUM(revenue_ytd), 0) FROM product_variants WHERE product_id = p_pepack),
    total_units_sold = (SELECT COALESCE(SUM(units_sold_ytd), 0) FROM product_variants WHERE product_id = p_pepack)
  WHERE id = p_pepack;

END $$;
