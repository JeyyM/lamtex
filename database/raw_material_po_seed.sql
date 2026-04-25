-- ============================================================================
-- raw_material_po_seed.sql
-- Bulk seed: purchase_orders + purchase_order_items for raw materials.
--
-- Prerequisites: at least one branch, one supplier, one raw_materials row.
-- If raw_materials.supplier_id is NULL, this script assigns each material to
-- a random Active (or any) supplier before generating POs.
-- Idempotent: skips if 40+ rows exist with po_number like PO-RM-SEED-%%.
--
-- Re-run from scratch:
--   DELETE FROM purchase_order_items WHERE order_id IN (
--     SELECT id FROM purchase_orders WHERE po_number LIKE 'PO-RM-SEED-%');
--   DELETE FROM purchase_orders WHERE po_number LIKE 'PO-RM-SEED-%';
-- ============================================================================

DO $rm$
DECLARE
  v_have      int;
  v_n         int := 140;
  v_i         int;
  v_po_id     uuid;
  v_sup       uuid;
  v_branch    uuid;
  v_status    text;
  v_pay       text;
  v_od        date;
  v_exp       date;
  v_act       date;
  v_lines     int;
  v_li        int;
  v_mid       uuid;
  v_mname     text;
  v_qty       numeric(14,2);
  v_price     numeric(14,2);
  v_uom       text;
  v_rec       numeric(14,2);
  v_line      numeric(14,2);
  v_total     numeric(14,2);
  v_paid      numeric(14,2);
  v_r         double precision;
  v_num       text;
  v_cost      numeric(14,4);
  r_m         record;
  v_backfill  int;
BEGIN
  SELECT count(*)::int INTO v_have FROM purchase_orders WHERE po_number LIKE 'PO-RM-SEED-%';
  IF v_have >= 40 THEN
    RAISE NOTICE 'raw_material_po_seed: found % PO-RM-SEED-* POs, skip.', v_have;
    RETURN;
  END IF;

  IF (SELECT count(*)::int FROM raw_materials) = 0 THEN
    RAISE EXCEPTION 'raw_material_po_seed: raw_materials is empty. Seed materials first.';
  END IF;
  IF (SELECT count(*)::int FROM suppliers) = 0 THEN
    RAISE EXCEPTION 'raw_material_po_seed: no suppliers. Seed suppliers first.';
  END IF;

  v_backfill := 0;
  FOR r_m IN
    SELECT id AS mat_id FROM raw_materials WHERE supplier_id IS NULL
  LOOP
    SELECT s.id INTO v_sup
    FROM suppliers s
    WHERE s.status = 'Active'
    ORDER BY random()
    LIMIT 1;
    IF v_sup IS NULL THEN
      SELECT s.id INTO v_sup FROM suppliers s ORDER BY random() LIMIT 1;
    END IF;
    IF v_sup IS NULL THEN
      RAISE EXCEPTION 'raw_material_po_seed: could not pick a supplier.';
    END IF;
    UPDATE raw_materials SET supplier_id = v_sup WHERE id = r_m.mat_id;
    v_backfill := v_backfill + 1;
  END LOOP;
  IF v_backfill > 0 THEN
    RAISE NOTICE 'raw_material_po_seed: set supplier_id on % raw_materials row(s) without a supplier.', v_backfill;
  END IF;

  IF (SELECT count(*)::int FROM raw_materials WHERE supplier_id IS NOT NULL) = 0 THEN
    RAISE EXCEPTION 'raw_material_po_seed: no materials linked to suppliers after backfill.';
  END IF;

  FOR v_i IN 1..v_n LOOP
    v_num := 'PO-RM-SEED-' || lpad(v_i::text, 5, '0');
    v_r := random();

    IF v_r < 0.38 THEN
      v_status := 'Completed';
    ELSIF v_r < 0.58 THEN
      v_status := 'Confirmed';
    ELSIF v_r < 0.75 THEN
      v_status := 'Sent';
    ELSIF v_r < 0.88 THEN
      v_status := 'Partially Received';
    ELSIF v_r < 0.94 THEN
      v_status := 'Accepted';
    ELSIF v_r < 0.97 THEN
      v_status := 'Requested';
    ELSE
      v_status := 'Cancelled';
    END IF;

    IF v_status IN ('Completed', 'Partially Received') THEN
      v_r := random();
      IF v_r < 0.78 THEN
        v_pay := 'Paid';
      ELSIF v_r < 0.92 THEN
        v_pay := 'Partially Paid';
      ELSE
        v_pay := 'Overdue';
      END IF;
    ELSE
      v_pay := 'Unpaid';
    END IF;

    SELECT supplier_id INTO v_sup
    FROM raw_materials
    WHERE supplier_id IS NOT NULL
    GROUP BY supplier_id
    ORDER BY random()
    LIMIT 1;

    SELECT id INTO v_branch
    FROM branches
    WHERE name IN ('Manila', 'Cebu', 'Batangas')
    ORDER BY random()
    LIMIT 1;

    v_od := date '2024-04-01' + (floor(random() * 650))::int;
    v_exp := v_od + (7 + (floor(random() * 16))::int);

    IF v_status IN ('Completed', 'Partially Received') THEN
      v_act := v_exp + (floor(random() * 9))::int - 4;
      IF v_act < v_od THEN
        v_act := v_od + 2;
      END IF;
    ELSE
      v_act := NULL;
    END IF;

    v_lines := 1 + (floor(random() * 3))::int;
    v_total := 0;

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
    ) VALUES (
      v_num,
      v_branch,
      v_sup,
      v_status,
      v_od,
      v_exp,
      v_act,
      0,
      'PHP',
      'Raw material procurement (RM seed pack)',
      'Material Planning',
      v_pay,
      0
    ) RETURNING id INTO v_po_id;

    FOR v_li IN 1..v_lines LOOP
      SELECT rm.id, rm.name, rm.cost_per_unit, rm.unit_of_measure::text
      INTO v_mid, v_mname, v_cost, v_uom
      FROM raw_materials rm
      WHERE rm.supplier_id = v_sup
      ORDER BY random()
      LIMIT 1;

      v_qty := (50 + floor(random() * 4500))::numeric;
      IF coalesce(v_cost, 0) < 0.0001 THEN
        v_price := round((25 + (random() * 200))::numeric, 2);
      ELSE
        v_price := round((v_cost * (0.92 + (random() * 0.16)))::numeric, 2);
      END IF;

      v_line := round(v_qty * v_price, 2);
      v_total := v_total + v_line;

      IF v_status = 'Completed' THEN
        v_rec := v_qty;
      ELSIF v_status = 'Partially Received' THEN
        v_rec := round(v_qty * (0.35 + (random() * 0.55))::numeric, 2);
      ELSE
        v_rec := 0;
      END IF;

      INSERT INTO purchase_order_items (
        order_id,
        material_id,
        quantity_ordered,
        quantity_received,
        unit_price,
        unit_of_measure,
        sync_price_on_receive
      ) VALUES (
        v_po_id,
        v_mid,
        v_qty,
        v_rec,
        v_price,
        coalesce(v_uom, 'kg'),
        (random() < 0.15)
      );
    END LOOP;

    -- Payment vs total
    IF v_pay = 'Paid' THEN
      v_paid := v_total;
    ELSIF v_pay = 'Partially Paid' THEN
      v_paid := round(v_total * 0.45, 2);
    ELSIF v_pay = 'Overdue' THEN
      v_paid := round(v_total * 0.1, 2);
    ELSE
      v_paid := 0;
    END IF;

    UPDATE purchase_orders
    SET
      total_amount = v_total,
      amount_paid  = v_paid
    WHERE id = v_po_id;
  END LOOP;

  RAISE NOTICE 'raw_material_po_seed: done. Total PO-RM-SEED rows: %',
    (SELECT count(*)::int FROM purchase_orders WHERE po_number LIKE 'PO-RM-SEED-%');
END;
$rm$;
