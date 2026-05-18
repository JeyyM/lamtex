-- =============================================================================
-- Seed: Quezon (QZN) production request history + material_consumption (BOM)
--
-- Creates completed / in-progress production_requests linked to Quezon finished
-- goods, production_batches, and material_consumption rows derived from BOM
-- × quantity_completed. Reduces QZN material_stock and raw_materials.total_stock
-- to match the consumption ledger (after restoring prior seed totals on re-run).
--
-- Requires:
--   • branch QZN (seed_quezon_branch_employees.sql)
--   • Quezon products + BOM (seed_quezon_products_and_bom.sql)
--
-- Re-runnable:
--   • Adds back quantities from existing seed consumption rows, then deletes
--     PR-QZN-HIST-* / BATCH-QZN-HIST-* / material_consumption where remarks
--     like 'Quezon seed PR %', then re-seeds.
-- =============================================================================

DO $$
DECLARE
  b_id       uuid;
  pr_id      uuid;
  batch_id   uuid;
  rec        record;
  sku_ix     int;
  v_sku      text;
  v_units    numeric;
  v_complete numeric;
  v_vid      uuid;
  v_pid      uuid;
  v_pname    text;
  v_batch    text;
  ded        record;
BEGIN
  SELECT id INTO b_id FROM branches WHERE code = 'QZN' LIMIT 1;
  IF b_id IS NULL THEN
    RAISE EXCEPTION 'seed_quezon_production_requests_and_consumption: branch QZN not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM product_variants WHERE sku = 'QZN-PV-STD-01' LIMIT 1) THEN
    RAISE EXCEPTION 'seed_quezon_production_requests_and_consumption: run seed_quezon_products_and_bom.sql first';
  END IF;

  -- Restore inventory from a previous run of this seed
  UPDATE material_stock ms SET
    quantity   = ms.quantity + COALESCE(agg.add_back, 0),
    updated_at = NOW()
  FROM (
    SELECT material_id, SUM(quantity_consumed)::numeric AS add_back
    FROM material_consumption
    WHERE branch = 'QZN'
      AND remarks LIKE 'Quezon seed PR %'
    GROUP BY material_id
  ) agg
  WHERE ms.branch_id = b_id
    AND ms.material_id = agg.material_id;

  UPDATE raw_materials rm SET
    total_stock = rm.total_stock + COALESCE(agg.add_back, 0),
    updated_at  = NOW()
  FROM (
    SELECT material_id, SUM(quantity_consumed)::numeric AS add_back
    FROM material_consumption
    WHERE branch = 'QZN'
      AND remarks LIKE 'Quezon seed PR %'
    GROUP BY material_id
  ) agg
  WHERE rm.id = agg.material_id
    AND rm.sku LIKE 'QZN-%';

  DELETE FROM material_consumption
  WHERE branch = 'QZN'
    AND remarks LIKE 'Quezon seed PR %';

  DELETE FROM production_batches WHERE batch_number LIKE 'BATCH-QZN-HIST-%';

  DELETE FROM production_requests WHERE pr_number LIKE 'PR-QZN-HIST-%';

  FOR rec IN
    SELECT * FROM (VALUES
      ('PR-QZN-HIST-001'::text, '2025-10-28'::date, '2025-11-08'::date, 'Completed'::text,
       ARRAY['QZN-PV-STD-01'::text], ARRAY[250::numeric], ARRAY['BATCH-QZN-HIST-001'::text]),
      ('PR-QZN-HIST-002', '2025-12-02', '2025-12-14', 'Completed',
       ARRAY['QZN-PV-STD-02'], ARRAY[180::numeric], ARRAY['BATCH-QZN-HIST-002']),
      ('PR-QZN-HIST-003', '2026-01-08', '2026-01-20', 'Completed',
       ARRAY['QZN-HD-STD-01'], ARRAY[400::numeric], ARRAY['BATCH-QZN-HIST-003']),
      ('PR-QZN-HIST-004', '2026-01-25', '2026-02-05', 'Completed',
       ARRAY['QZN-PK-KIT-02'], ARRAY[120::numeric], ARRAY['BATCH-QZN-HIST-004']),
      ('PR-QZN-HIST-005', '2026-03-01', '2026-03-12', 'Completed',
       ARRAY['QZN-PV-STD-03', 'QZN-HD-STD-03'], ARRAY[95::numeric, 60::numeric],
       ARRAY['BATCH-QZN-HIST-005A', 'BATCH-QZN-HIST-005B']),
      ('PR-QZN-HIST-006', '2026-04-20', NULL::date, 'In Progress',
       ARRAY['QZN-PV-STD-01'], ARRAY[300::numeric], ARRAY[NULL::text]),
      ('PR-QZN-HIST-007', '2026-04-02', '2026-04-15', 'Completed',
       ARRAY['QZN-PK-KIT-01'], ARRAY[200::numeric], ARRAY['BATCH-QZN-HIST-007']),
      ('PR-QZN-HIST-008', '2025-10-10', '2025-10-22', 'Completed',
       ARRAY['QZN-HD-STD-02'], ARRAY[220::numeric], ARRAY['BATCH-QZN-HIST-008'])
    ) AS t(pr_num, req_dt, done_dt, st, skus, qtys, batch_nums)
  LOOP
    INSERT INTO production_requests (
      pr_number,
      branch_id,
      status,
      request_date,
      expected_completion_date,
      notes,
      created_by,
      accepted_by,
      accepted_at
    ) VALUES (
      rec.pr_num,
      b_id,
      rec.st,
      rec.req_dt,
      COALESCE(rec.done_dt, rec.req_dt + 14),
      'Quezon demo — seeded production request / BOM consumption history',
      'Quezon Production — Floor',
      CASE WHEN rec.st = 'In Progress' THEN NULL ELSE 'Quezon Approver — Plant' END,
      CASE
        WHEN rec.st = 'In Progress' THEN NULL
        ELSE (rec.req_dt::timestamp + TIME '09:00:00') AT TIME ZONE 'Asia/Manila'
      END
    )
    RETURNING id INTO pr_id;

    INSERT INTO production_request_logs (request_id, action, performed_by, description)
    VALUES (pr_id, 'created', 'Quezon Production — Floor', 'Production request raised (seed)');

    IF rec.st <> 'In Progress' THEN
      INSERT INTO production_request_logs (request_id, action, performed_by, description)
      VALUES (pr_id, 'accepted', 'Quezon Approver — Plant', 'Accepted for production (seed)');
    END IF;

    FOR sku_ix IN 1 .. array_length(rec.skus, 1)
    LOOP
      v_sku   := rec.skus[sku_ix];
      v_units := rec.qtys[sku_ix];
      v_batch := rec.batch_nums[sku_ix];

      SELECT pv.id, pv.product_id, p.name
      INTO v_vid, v_pid, v_pname
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.sku = v_sku
      LIMIT 1;

      IF v_vid IS NULL THEN
        RAISE EXCEPTION 'seed_quezon_production_requests_and_consumption: missing variant %', v_sku;
      END IF;

      v_complete := CASE WHEN rec.st = 'In Progress' THEN 0 ELSE v_units END;

      INSERT INTO production_request_items (
        request_id,
        product_id,
        product_variant_id,
        quantity,
        quantity_completed
      ) VALUES (
        pr_id,
        v_pid,
        v_vid,
        v_units,
        v_complete
      );

      IF rec.st = 'Completed' AND v_complete > 0 AND v_batch IS NOT NULL THEN
        INSERT INTO production_batches (
          batch_number,
          product_id,
          product_name,
          planned_qty,
          actual_qty,
          qa_status,
          scheduled_date,
          completed_date,
          branch_id
        ) VALUES (
          v_batch,
          v_pid,
          v_pname,
          CEIL(v_complete)::int,
          CEIL(v_complete)::int,
          'Passed'::qa_status,
          rec.done_dt,
          rec.done_dt,
          b_id
        )
        RETURNING id INTO batch_id;

        INSERT INTO material_consumption (
          material_id,
          material_name,
          quantity_consumed,
          unit_of_measure,
          consumption_date,
          production_batch_id,
          product_id,
          product_name,
          branch,
          cost_per_unit,
          total_cost,
          remarks,
          issued_by
        )
        SELECT
          bom.raw_material_id,
          rm.name,
          ROUND((bom.quantity_needed * v_complete)::numeric, 4),
          bom.unit_of_measure,
          rec.done_dt,
          batch_id,
          v_pid,
          v_pname,
          'QZN',
          COALESCE(rm.cost_per_unit, 0),
          ROUND(COALESCE(rm.cost_per_unit, 0) * (bom.quantity_needed * v_complete), 2),
          'Quezon seed PR ' || rec.pr_num,
          'Quezon Production — Floor'
        FROM product_variant_raw_materials bom
        JOIN raw_materials rm ON rm.id = bom.raw_material_id
        WHERE bom.variant_id = v_vid;
      END IF;
    END LOOP;

    IF rec.st = 'Completed' THEN
      INSERT INTO production_request_logs (request_id, action, performed_by, description)
      VALUES (pr_id, 'completed', 'Quezon Production — Floor', 'Completed; materials issued from BOM (seed)');
    ELSE
      INSERT INTO production_request_logs (request_id, action, performed_by, description)
      VALUES (pr_id, 'status_change', 'Quezon Approver — Plant', 'Status: In Progress — floor run started (seed)');
    END IF;
  END LOOP;

  -- Apply stock deductions for all inserted seed consumption rows
  FOR ded IN
    SELECT material_id, SUM(quantity_consumed)::numeric AS sq
    FROM material_consumption
    WHERE branch = 'QZN'
      AND remarks LIKE 'Quezon seed PR %'
    GROUP BY material_id
  LOOP
    UPDATE material_stock
    SET
      quantity   = GREATEST(0, quantity - ded.sq),
      updated_at = NOW()
    WHERE branch_id = b_id
      AND material_id = ded.material_id;

    UPDATE raw_materials
    SET
      total_stock = GREATEST(0, total_stock - ded.sq),
      updated_at  = NOW()
    WHERE id = ded.material_id
      AND sku LIKE 'QZN-%';
  END LOOP;

  RAISE NOTICE 'seed_quezon_production_requests_and_consumption: PRs %, consumption rows %',
    (SELECT count(*)::int FROM production_requests WHERE pr_number LIKE 'PR-QZN-HIST-%'),
    (SELECT count(*)::int FROM material_consumption WHERE remarks LIKE 'Quezon seed PR %');
END $$;
