-- =============================================================================
-- Seed: Manila (MNL) + Cebu (CEB) production requests & purchase orders
--
-- Adds demo PR/PO history for branches other than Batangas (BTG already has
-- most catalog PO-RM-SEED / PO-2026-* data). Re-runnable via prefixed numbers.
--
-- Requires:
--   • branches MNL, CEB (apply.sql / schema.sql)
--   • Products + variants for each branch (apply.sql)
--   • LMX raw materials (seed_mnl_ceb_btg_bom.sql)
--   • Suppliers (seed_suppliers_all_branches.sql or po_additional_seed suppliers)
--
-- Re-run: deletes PR-MNL-HIST-*, PR-CEB-HIST-*, PO-MNL-HIST-*, PO-CEB-HIST-*
-- =============================================================================

DO $$
DECLARE
  b_id       uuid;
  b_code     text;
  b_name     text;
  pr_id      uuid;
  po_id      uuid;
  rec        record;
  v_vid      uuid;
  v_pid      uuid;
  v_complete numeric;
  v_line_total numeric(14,2);
  v_item_rows int;
  v_sup_id   uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM branches WHERE code = 'MNL') THEN
    RAISE EXCEPTION 'seed_mnl_ceb_production_requests_and_purchase_orders: branch MNL not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM branches WHERE code = 'CEB') THEN
    RAISE EXCEPTION 'seed_mnl_ceb_production_requests_and_purchase_orders: branch CEB not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM product_variants pv JOIN products p ON p.id = pv.product_id JOIN branches b ON b.code = 'MNL' AND p.branch = b.name LIMIT 1) THEN
    RAISE EXCEPTION 'seed_mnl_ceb_production_requests_and_purchase_orders: run apply.sql (products) first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM raw_materials WHERE sku = 'LMX-RM-PVC-001') THEN
    RAISE EXCEPTION 'seed_mnl_ceb_production_requests_and_purchase_orders: run seed_mnl_ceb_btg_bom.sql first';
  END IF;

  DELETE FROM production_requests WHERE pr_number LIKE 'PR-MNL-HIST-%' OR pr_number LIKE 'PR-CEB-HIST-%';
  DELETE FROM purchase_orders WHERE po_number LIKE 'PO-MNL-HIST-%' OR po_number LIKE 'PO-CEB-HIST-%';

  -- ── Production requests ────────────────────────────────────────────────────
  FOR rec IN
    SELECT * FROM (VALUES
      ('MNL'::text, 'PR-MNL-HIST-001'::text, '2025-08-12'::date, '2025-08-26'::date, 'Completed'::text, 1, 420::numeric),
      ('MNL', 'PR-MNL-HIST-002', '2025-10-18', '2025-10-31', 'Completed', 3, 280),
      ('MNL', 'PR-MNL-HIST-003', '2025-12-04', '2025-12-17', 'Completed', 5, 190),
      ('MNL', 'PR-MNL-HIST-004', '2026-01-14', '2026-01-28', 'Completed', 7, 310),
      ('MNL', 'PR-MNL-HIST-005', '2026-02-20', NULL::date, 'In Progress', 2, 480),
      ('MNL', 'PR-MNL-HIST-006', '2026-03-08', '2026-03-22', 'Requested', 4, 220),
      ('MNL', 'PR-MNL-HIST-007', '2026-04-05', '2026-04-19', 'Accepted', 6, 160),
      ('MNL', 'PR-MNL-HIST-008', '2026-04-24', NULL, 'Draft', 8, 120),

      ('CEB', 'PR-CEB-HIST-001', '2025-09-02', '2025-09-16', 'Completed', 1, 360),
      ('CEB', 'PR-CEB-HIST-002', '2025-11-11', '2025-11-24', 'Completed', 2, 240),
      ('CEB', 'PR-CEB-HIST-003', '2026-01-06', '2026-01-20', 'Completed', 4, 300),
      ('CEB', 'PR-CEB-HIST-004', '2026-02-12', '2026-02-26', 'Completed', 6, 175),
      ('CEB', 'PR-CEB-HIST-005', '2026-03-19', NULL, 'In Progress', 3, 410),
      ('CEB', 'PR-CEB-HIST-006', '2026-04-01', '2026-04-15', 'Requested', 5, 195),
      ('CEB', 'PR-CEB-HIST-007', '2026-04-12', '2026-04-26', 'Accepted', 7, 140),
      ('CEB', 'PR-CEB-HIST-008', '2026-04-27', NULL, 'Draft', 9, 90)
    ) AS t(branch_code, pr_num, req_dt, done_dt, st, variant_ord, qty)
  LOOP
    SELECT id, name INTO b_id, b_name FROM branches WHERE code = rec.branch_code LIMIT 1;

    SELECT pv.id, pv.product_id
    INTO v_vid, v_pid
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE p.branch = b_name
    ORDER BY pv.sku
    OFFSET GREATEST(rec.variant_ord - 1, 0)
    LIMIT 1;

    IF v_vid IS NULL THEN
      RAISE EXCEPTION 'seed_mnl_ceb: no variant ord % for branch %', rec.variant_ord, rec.branch_code;
    END IF;

    v_complete := CASE WHEN rec.st IN ('In Progress', 'Draft', 'Requested', 'Accepted') THEN 0 ELSE rec.qty END;
    IF rec.st = 'In Progress' THEN
      v_complete := round(rec.qty * 0.35, 2);
    END IF;

    INSERT INTO production_requests (
      pr_number, branch_id, status, request_date, expected_completion_date,
      notes, created_by, accepted_by, accepted_at
    ) VALUES (
      rec.pr_num,
      b_id,
      rec.st,
      rec.req_dt,
      COALESCE(rec.done_dt, rec.req_dt + 14),
      rec.branch_code || ' demo — seeded production request',
      CASE rec.branch_code WHEN 'MNL' THEN 'Manila Production — Floor' ELSE 'Cebu Production — Floor' END,
      CASE WHEN rec.st IN ('Completed', 'In Progress') THEN
        CASE rec.branch_code WHEN 'MNL' THEN 'Manila Approver — Plant' ELSE 'Cebu Approver — Plant' END
      ELSE NULL END,
      CASE WHEN rec.st IN ('Completed', 'In Progress') THEN
        (rec.req_dt::timestamp + TIME '10:00:00') AT TIME ZONE 'Asia/Manila'
      ELSE NULL END
    )
    RETURNING id INTO pr_id;

    INSERT INTO production_request_items (
      request_id, product_id, product_variant_id, quantity, quantity_completed
    ) VALUES (pr_id, v_pid, v_vid, rec.qty, v_complete);

    INSERT INTO production_request_logs (request_id, action, performed_by, description)
    VALUES (
      pr_id,
      'created',
      CASE rec.branch_code WHEN 'MNL' THEN 'Manila Production — Floor' ELSE 'Cebu Production — Floor' END,
      'Production request raised (seed)'
    );

    IF rec.st IN ('Completed', 'In Progress', 'Accepted') THEN
      INSERT INTO production_request_logs (request_id, action, performed_by, description)
      VALUES (
        pr_id,
        CASE rec.st WHEN 'Completed' THEN 'completed' WHEN 'In Progress' THEN 'status_change' ELSE 'accepted' END,
        CASE rec.branch_code WHEN 'MNL' THEN 'Manila Approver — Plant' ELSE 'Cebu Approver — Plant' END,
        'Seed workflow — ' || rec.st
      );
    END IF;
  END LOOP;

  -- ── Purchase orders ──────────────────────────────────────────────────────
  FOR rec IN
    SELECT * FROM (VALUES
      -- Manila
      ('MNL'::text, 'PO-MNL-HIST-001'::text, 'Lucena Polymer Supply Co.'::text, 'LMX-RM-PVC-001'::text,
        5200::numeric, 5200::numeric, 88.50::numeric, 'kg'::text, 'Completed'::text,
        '2025-07-08'::date, '2025-07-22'::date, '2025-07-21'::date, 'Paid'::text),
      ('MNL', 'PO-MNL-HIST-002', 'Lucena Polymer Supply Co.', 'LMX-RM-HDPE-001',
        3800, 3800, 94.20, 'kg', 'Completed', '2025-09-14', '2025-09-28', '2025-09-27', 'Paid'),
      ('MNL', 'PO-MNL-HIST-003', 'Sierra Madre Industrial Minerals', 'LMX-RM-CACO3-001',
        9000, 9000, 27.80, 'kg', 'Completed', '2025-10-20', '2025-11-05', '2025-11-04', 'Paid'),
      ('MNL', 'PO-MNL-HIST-004', 'Calabarzon Specialty Chemicals – Quezon Hub', 'LMX-RM-STAB-001',
        480, 480, 248.00, 'kg', 'Completed', '2025-11-28', '2025-12-09', '2025-12-08', 'Paid'),
      ('MNL', 'PO-MNL-HIST-005', 'Polillo Industrial Solvents Ltd.', 'LMX-RM-DOP-001',
        620, 620, 93.50, 'liter', 'Completed', '2026-01-10', '2026-01-24', '2026-01-23', 'Paid'),
      ('MNL', 'PO-MNL-HIST-006', 'Bondoc Peninsula Packaging Corp.', 'LMX-PKG-FILM-001',
        1400, 1400, 71.00, 'kg', 'Completed', '2026-02-05', '2026-02-15', '2026-02-14', 'Paid'),
      ('MNL', 'PO-MNL-HIST-007', 'Lucena Polymer Supply Co.', 'LMX-RM-PVC-001',
        6500, 4200, 89.10, 'kg', 'Partially Received', '2026-03-12', '2026-03-26', '2026-03-25', 'Partially Paid'),
      ('MNL', 'PO-MNL-HIST-008', 'Lucena Polymer Supply Co.', 'LMX-RM-HDPE-001',
        4500, 0, 95.00, 'kg', 'Confirmed', '2026-03-25', '2026-04-08', NULL, 'Unpaid'),
      ('MNL', 'PO-MNL-HIST-009', 'Sierra Madre Industrial Minerals', 'LMX-RM-CACO3-001',
        7200, 0, 28.20, 'kg', 'Sent', '2026-04-10', '2026-04-24', NULL, 'Unpaid'),
      ('MNL', 'PO-MNL-HIST-010', 'Tayabas Flexo Print & Film', 'LMX-PKG-FILM-001',
        900, 0, 72.50, 'kg', 'Requested', '2026-04-22', '2026-05-06', NULL, 'Unpaid'),

      -- Cebu
      ('CEB', 'PO-CEB-HIST-001', 'Lucena Polymer Supply Co.', 'LMX-RM-PVC-001',
        4100, 4100, 87.90, 'kg', 'Completed', '2025-08-19', '2025-09-02', '2025-09-01', 'Paid'),
      ('CEB', 'PO-CEB-HIST-002', 'Lucena Polymer Supply Co.', 'LMX-RM-HDPE-001',
        3200, 3200, 93.80, 'kg', 'Completed', '2025-10-07', '2025-10-21', '2025-10-20', 'Paid'),
      ('CEB', 'PO-CEB-HIST-003', 'Sierra Madre Industrial Minerals', 'LMX-RM-CACO3-001',
        7800, 7800, 27.60, 'kg', 'Completed', '2025-11-15', '2025-11-29', '2025-11-28', 'Paid'),
      ('CEB', 'PO-CEB-HIST-004', 'Calabarzon Specialty Chemicals – Quezon Hub', 'LMX-RM-STAB-001',
        390, 390, 249.50, 'kg', 'Completed', '2025-12-18', '2025-12-30', '2025-12-29', 'Paid'),
      ('CEB', 'PO-CEB-HIST-005', 'Polillo Industrial Solvents Ltd.', 'LMX-RM-DOP-001',
        540, 540, 94.00, 'liter', 'Completed', '2026-01-22', '2026-02-05', '2026-02-04', 'Paid'),
      ('CEB', 'PO-CEB-HIST-006', 'Bondoc Peninsula Packaging Corp.', 'LMX-PKG-FILM-001',
        1100, 1100, 70.50, 'kg', 'Completed', '2026-02-14', '2026-02-24', '2026-02-23', 'Paid'),
      ('CEB', 'PO-CEB-HIST-007', 'Lucena Polymer Supply Co.', 'LMX-RM-PVC-001',
        5000, 3100, 88.75, 'kg', 'Partially Received', '2026-03-05', '2026-03-19', '2026-03-18', 'Partially Paid'),
      ('CEB', 'PO-CEB-HIST-008', 'Lucena Polymer Supply Co.', 'LMX-RM-HDPE-001',
        3600, 0, 94.50, 'kg', 'Confirmed', '2026-03-28', '2026-04-11', NULL, 'Unpaid'),
      ('CEB', 'PO-CEB-HIST-009', 'Sierra Madre Industrial Minerals', 'LMX-RM-CACO3-001',
        6400, 0, 28.00, 'kg', 'Sent', '2026-04-08', '2026-04-22', NULL, 'Unpaid'),
      ('CEB', 'PO-CEB-HIST-010', 'Tayabas Flexo Print & Film', 'LMX-PKG-FILM-001',
        850, 0, 73.00, 'kg', 'Requested', '2026-04-26', '2026-05-10', NULL, 'Unpaid')
    ) AS t(
      branch_code, po_num, sup_name, sku, qty_ord, qty_rec, unit_price, uom,
      status, order_dt, expected_dt, actual_dt, pay_kind
    )
  LOOP
    SELECT id INTO b_id FROM branches WHERE code = rec.branch_code LIMIT 1;

    SELECT s.id INTO v_sup_id
    FROM suppliers s
    WHERE s.name = rec.sup_name
    LIMIT 1;

    IF v_sup_id IS NULL THEN
      SELECT s.id INTO v_sup_id FROM suppliers s WHERE s.status = 'Active' ORDER BY s.name LIMIT 1;
    END IF;
    IF v_sup_id IS NULL THEN
      RAISE EXCEPTION 'seed_mnl_ceb: no supplier for PO %', rec.po_num;
    END IF;

    INSERT INTO purchase_orders (
      po_number, branch_id, supplier_id, status,
      order_date, expected_delivery_date, actual_delivery_date,
      total_amount, currency, notes, created_by,
      payment_status, amount_paid
    ) VALUES (
      rec.po_num,
      b_id,
      v_sup_id,
      rec.status,
      rec.order_dt,
      rec.expected_dt,
      rec.actual_dt,
      0,
      'PHP',
      rec.branch_code || ' RM history — ' || rec.sku,
      CASE rec.branch_code WHEN 'MNL' THEN 'Manila Procurement' ELSE 'Cebu Procurement' END,
      CASE rec.pay_kind
        WHEN 'Paid' THEN 'Paid'
        WHEN 'Partially Paid' THEN 'Partially Paid'
        ELSE 'Unpaid'
      END,
      0
    )
    RETURNING id INTO po_id;

    INSERT INTO purchase_order_items (
      order_id, material_id, quantity_ordered, quantity_received,
      unit_price, unit_of_measure, sync_price_on_receive
    )
    SELECT
      po_id,
      rm.id,
      rec.qty_ord,
      rec.qty_rec,
      rec.unit_price,
      rec.uom,
      false
    FROM raw_materials rm
    WHERE rm.sku = rec.sku;

    GET DIAGNOSTICS v_item_rows = ROW_COUNT;
    IF v_item_rows <> 1 THEN
      RAISE EXCEPTION 'seed_mnl_ceb: material not found: %', rec.sku;
    END IF;

    v_line_total := round(rec.qty_ord * rec.unit_price, 2);

    UPDATE purchase_orders
    SET
      total_amount = v_line_total,
      amount_paid = CASE rec.pay_kind
        WHEN 'Paid' THEN v_line_total
        WHEN 'Partially Paid' THEN round(v_line_total * (rec.qty_rec / NULLIF(rec.qty_ord, 0)), 2)
        ELSE 0
      END
    WHERE id = po_id;

    INSERT INTO purchase_order_logs (order_id, action, performed_by, description)
    VALUES (
      po_id,
      'created',
      CASE rec.branch_code WHEN 'MNL' THEN 'Manila Procurement' ELSE 'Cebu Procurement' END,
      'Purchase order created — ' || rec.sku || ' (seed)'
    );

    IF rec.status IN ('Completed', 'Partially Received') THEN
      INSERT INTO purchase_order_logs (order_id, action, performed_by, description)
      VALUES (
        po_id,
        'received',
        CASE rec.branch_code WHEN 'MNL' THEN 'Warehouse — Manila' ELSE 'Warehouse — Cebu' END,
        CASE rec.status WHEN 'Completed' THEN 'Receipt closed' ELSE 'Partial receipt logged' END
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'seed_mnl_ceb_production_requests_and_purchase_orders: PRs MNL=%, CEB=%, POs MNL=%, CEB=%',
    (SELECT count(*)::int FROM production_requests WHERE pr_number LIKE 'PR-MNL-HIST-%'),
    (SELECT count(*)::int FROM production_requests WHERE pr_number LIKE 'PR-CEB-HIST-%'),
    (SELECT count(*)::int FROM purchase_orders WHERE po_number LIKE 'PO-MNL-HIST-%'),
    (SELECT count(*)::int FROM purchase_orders WHERE po_number LIKE 'PO-CEB-HIST-%');
END $$;
