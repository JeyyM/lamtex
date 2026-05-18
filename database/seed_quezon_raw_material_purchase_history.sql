-- =============================================================================
-- Seed: Purchase order history for Quezon (QZN) raw materials + suppliers
--
-- Inserts completed / partially received / in-flight POs at branch QZN. Each line
-- ties one raw material SKU to the supplier named in supplier_materials seed
-- (primary or alternate). One item per PO for a clear per-material audit trail.
--
-- Requires:
--   • branches QZN (seed_quezon_branch_employees.sql)
--   • Quezon suppliers (seed_suppliers_quezon.sql)
--   • Raw materials + supplier_materials (seed_quezon_raw_materials_and_supplier_links.sql)
--
-- Re-runnable: DELETE purchase_orders WHERE po_number LIKE 'PO-QZN-HIST-%'
--   (CASCADE clears items, logs, receipts).
-- =============================================================================

DO $$
DECLARE
  r record;
  v_po         uuid;
  b_id         uuid;
  v_line_total numeric(14,2);
  v_item_rows  int;
BEGIN
  SELECT id INTO b_id FROM branches WHERE code = 'QZN' LIMIT 1;
  IF b_id IS NULL THEN
    RAISE EXCEPTION 'seed_quezon_raw_material_purchase_history: branch QZN not found';
  END IF;

  IF (SELECT count(*) FROM raw_materials WHERE sku LIKE 'QZN-%') < 11 THEN
    RAISE EXCEPTION 'seed_quezon_raw_material_purchase_history: run seed_quezon_raw_materials_and_supplier_links.sql first';
  END IF;

  DELETE FROM purchase_orders WHERE po_number LIKE 'PO-QZN-HIST-%';

  FOR r IN
    SELECT * FROM (VALUES
      -- PVC resin — Lucena + alternate Calabarzon
      ('PO-QZN-HIST-001'::text, 'Lucena Polymer Supply Co.'::text, 'QZN-RM-PVC-001'::text,
        10000::numeric, 10000::numeric, 91.20::numeric, 'kg'::text, 'Completed'::text,
        '2025-06-10'::date, '2025-06-24'::date, '2025-06-23'::date, 'Paid'::text),
      ('PO-QZN-HIST-002', 'Calabarzon Specialty Chemicals – Quezon Hub', 'QZN-RM-PVC-001',
        3500, 3500, 94.50, 'kg', 'Completed', '2025-09-03', '2025-09-12', '2025-09-11', 'Paid'),
      ('PO-QZN-HIST-003', 'Lucena Polymer Supply Co.', 'QZN-RM-PVC-001',
        12000, 8200, 90.85, 'kg', 'Partially Received', '2026-02-01', '2026-02-14', '2026-02-13', 'Partially Paid'),
      ('PO-QZN-HIST-004', 'Lucena Polymer Supply Co.', 'QZN-RM-PVC-001',
        5000, 0, 91.00, 'kg', 'Sent', '2026-04-18', '2026-05-02', NULL, 'Unpaid'),

      -- HDPE
      ('PO-QZN-HIST-005', 'Lucena Polymer Supply Co.', 'QZN-RM-HDPE-001',
        5200, 5200, 76.40, 'kg', 'Completed', '2025-07-22', '2025-08-05', '2025-08-04', 'Paid'),
      ('PO-QZN-HIST-006', 'Lucena Polymer Supply Co.', 'QZN-RM-HDPE-001',
        4800, 4800, 77.10, 'kg', 'Completed', '2025-11-12', '2025-11-26', '2025-11-25', 'Paid'),

      -- GCC filler — Sierra preferred + Lucena alternate
      ('PO-QZN-HIST-007', 'Sierra Madre Industrial Minerals', 'QZN-RM-CACO3-001',
        14000, 14000, 13.42, 'kg', 'Completed', '2025-05-08', '2025-05-26', '2025-05-24', 'Paid'),
      ('PO-QZN-HIST-008', 'Sierra Madre Industrial Minerals', 'QZN-RM-CACO3-001',
        10000, 10000, 13.48, 'kg', 'Completed', '2025-10-01', '2025-10-19', '2025-10-18', 'Paid'),
      ('PO-QZN-HIST-009', 'Lucena Polymer Supply Co.', 'QZN-RM-CACO3-001',
        3200, 3200, 14.15, 'kg', 'Completed', '2026-01-08', '2026-01-29', '2026-01-28', 'Paid'),

      -- Stabilizer & adhesive — Calabarzon
      ('PO-QZN-HIST-010', 'Calabarzon Specialty Chemicals – Quezon Hub', 'QZN-RM-STAB-001',
        650, 650, 146.80, 'kg', 'Completed', '2025-08-14', '2025-08-23', '2025-08-22', 'Paid'),
      ('PO-QZN-HIST-011', 'Calabarzon Specialty Chemicals – Quezon Hub', 'QZN-RM-STAB-001',
        550, 550, 147.20, 'kg', 'Completed', '2025-12-02', '2025-12-11', '2025-12-10', 'Paid'),
      ('PO-QZN-HIST-012', 'Calabarzon Specialty Chemicals – Quezon Hub', 'QZN-RM-ADH-001',
        180, 180, 129.90, 'kg', 'Completed', '2025-06-20', '2025-06-27', '2025-06-27', 'Paid'),
      ('PO-QZN-HIST-013', 'Calabarzon Specialty Chemicals – Quezon Hub', 'QZN-RM-ADH-001',
        140, 140, 131.00, 'kg', 'Completed', '2026-03-04', '2026-03-11', '2026-03-10', 'Paid'),

      -- Plasticizer & solvent — Polillo
      ('PO-QZN-HIST-014', 'Polillo Industrial Solvents Ltd.', 'QZN-RM-DOP-001',
        900, 900, 70.60, 'liter', 'Completed', '2025-07-01', '2025-07-15', '2025-07-14', 'Paid'),
      ('PO-QZN-HIST-015', 'Polillo Industrial Solvents Ltd.', 'QZN-RM-DOP-001',
        720, 720, 71.25, 'liter', 'Completed', '2025-12-15', '2025-12-29', '2025-12-28', 'Paid'),
      ('PO-QZN-HIST-016', 'Polillo Industrial Solvents Ltd.', 'QZN-RM-SOLV-001',
        450, 450, 92.80, 'liter', 'Completed', '2025-09-08', '2025-09-22', '2025-09-20', 'Paid'),
      ('PO-QZN-HIST-017', 'Polillo Industrial Solvents Ltd.', 'QZN-RM-SOLV-001',
        380, 380, 93.10, 'liter', 'Completed', '2026-02-18', '2026-03-04', '2026-03-03', 'Paid'),

      -- Rubber — South Luzon
      ('PO-QZN-HIST-018', 'South Luzon Rubber & Latex Inc.', 'QZN-RM-RUB-001',
        420, 420, 111.50, 'kg', 'Completed', '2025-08-28', '2025-09-18', '2025-09-17', 'Paid'),
      ('PO-QZN-HIST-019', 'South Luzon Rubber & Latex Inc.', 'QZN-RM-RUB-001',
        360, 360, 112.00, 'kg', 'Completed', '2026-01-20', '2026-02-10', '2026-02-09', 'Paid'),

      -- Packaging — sacks, film (dual source), drums
      ('PO-QZN-HIST-020', 'Bondoc Peninsula Packaging Corp.', 'QZN-PKG-SACK-001',
        6000, 6000, 17.35, 'pieces', 'Completed', '2025-10-10', '2025-10-20', '2025-10-19', 'Paid'),
      ('PO-QZN-HIST-021', 'Bondoc Peninsula Packaging Corp.', 'QZN-PKG-SACK-001',
        4500, 4500, 17.48, 'pieces', 'Completed', '2026-04-02', '2026-04-12', '2026-04-11', 'Paid'),
      ('PO-QZN-HIST-022', 'Tayabas Flexo Print & Film', 'QZN-PKG-FILM-001',
        1400, 1400, 57.00, 'kg', 'Completed', '2025-07-18', '2025-08-01', '2025-07-31', 'Paid'),
      ('PO-QZN-HIST-023', 'Tayabas Flexo Print & Film', 'QZN-PKG-FILM-001',
        1100, 1100, 56.90, 'kg', 'Completed', '2025-11-25', '2025-12-09', '2025-12-08', 'Paid'),
      ('PO-QZN-HIST-024', 'Bondoc Peninsula Packaging Corp.', 'QZN-PKG-FILM-001',
        800, 800, 58.75, 'kg', 'Completed', '2026-02-05', '2026-02-17', '2026-02-16', 'Paid'),
      ('PO-QZN-HIST-025', 'Pacific Rim Container Quezon', 'QZN-PKG-DRUM-001',
        24, 24, 2810.00, 'drums', 'Completed', '2025-09-01', '2025-09-19', '2025-09-18', 'Paid'),
      ('PO-QZN-HIST-026', 'Pacific Rim Container Quezon', 'QZN-PKG-DRUM-001',
        48, 48, 2840.00, 'drums', 'Completed', '2026-01-12', '2026-01-30', '2026-01-29', 'Paid'),

      -- One confirmed, not yet received
      ('PO-QZN-HIST-027', 'Sierra Madre Industrial Minerals', 'QZN-RM-CACO3-001',
        8000, 0, 13.55, 'kg', 'Confirmed', '2026-04-22', '2026-05-10', NULL, 'Unpaid')
    ) AS t(
      po_num, sup_name, sku, qty_ord, qty_rec, unit_price, uom,
      status, order_dt, expected_dt, actual_dt, pay_kind
    )
  LOOP
    v_po := NULL;

    INSERT INTO purchase_orders (
      po_number,
      branch_id,
      supplier_id,
      status,
      order_date,
      expected_delivery_date,
      actual_delivery_date,
      total_amount,
      currency,
      notes,
      created_by,
      payment_status,
      amount_paid
    )
    SELECT
      r.po_num,
      b_id,
      s.id,
      r.status,
      r.order_dt,
      r.expected_dt,
      r.actual_dt,
      0,
      'PHP',
      'Quezon RM history — ' || r.sku || ' @ ' || r.sup_name,
      'Quezon Procurement',
      CASE r.pay_kind
        WHEN 'Paid' THEN 'Paid'
        WHEN 'Partially Paid' THEN 'Partially Paid'
        ELSE 'Unpaid'
      END,
      0
    FROM suppliers s
    WHERE s.name = r.sup_name
    RETURNING id INTO v_po;

    IF v_po IS NULL THEN
      RAISE EXCEPTION 'seed_quezon_raw_material_purchase_history: supplier not found: %', r.sup_name;
    END IF;

    INSERT INTO purchase_order_items (
      order_id,
      material_id,
      quantity_ordered,
      quantity_received,
      unit_price,
      unit_of_measure,
      sync_price_on_receive
    )
    SELECT
      v_po,
      rm.id,
      r.qty_ord,
      r.qty_rec,
      r.unit_price,
      r.uom,
      false
    FROM raw_materials rm
    WHERE rm.sku = r.sku;

    GET DIAGNOSTICS v_item_rows = ROW_COUNT;
    IF v_item_rows <> 1 THEN
      RAISE EXCEPTION 'seed_quezon_raw_material_purchase_history: material not found or not unique: %', r.sku;
    END IF;

    v_line_total := round(r.qty_ord * r.unit_price, 2);

    UPDATE purchase_orders
    SET
      total_amount = v_line_total,
      amount_paid = CASE r.pay_kind
        WHEN 'Paid' THEN v_line_total
        WHEN 'Partially Paid' THEN round(v_line_total * (r.qty_rec / NULLIF(r.qty_ord, 0)), 2)
        ELSE 0
      END,
      payment_status = CASE r.pay_kind
        WHEN 'Paid' THEN 'Paid'
        WHEN 'Partially Paid' THEN 'Partially Paid'
        ELSE 'Unpaid'
      END
    WHERE id = v_po;

    INSERT INTO purchase_order_logs (order_id, action, performed_by, description)
    VALUES (v_po, 'created', 'Quezon Procurement', 'Purchase order created — ' || r.sku);

    IF r.status = 'Completed' THEN
      INSERT INTO purchase_order_logs (order_id, action, performed_by, description)
      VALUES (v_po, 'received', 'Warehouse — Quezon', 'Receipt closed; qty received matches order');
    ELSIF r.status = 'Partially Received' THEN
      INSERT INTO purchase_order_logs (order_id, action, performed_by, description)
      VALUES (v_po, 'received', 'Warehouse — Quezon', 'Partial receipt — balance pending');
    END IF;
  END LOOP;

  RAISE NOTICE 'seed_quezon_raw_material_purchase_history: inserted % POs',
    (SELECT count(*)::int FROM purchase_orders WHERE po_number LIKE 'PO-QZN-HIST-%');
END $$;
