-- =============================================================================
-- Seed: Manila (MNL) + Cebu (CEB) inter-branch requests
--
-- Demo IBR history where MNL or CEB is the requesting branch (plus linked
-- transfer PO/PR rows where applicable). Re-runnable via IBR-*-HIST-* prefixes.
--
-- Requires:
--   • branches MNL, CEB, BTG (apply.sql / schema.sql)
--   • inter_branch_overlapping_stock_seed.sql (shared product + branch stock)
--   • seed_mnl_ceb_btg_bom.sql (LMX raw materials + material_stock)
--
-- Re-run: deletes IBR-*-HIST-*, PO-IBR-*-HIST-*, PR-IBR-*-HIST-*
-- =============================================================================

DO $$
DECLARE
  ibr_id     uuid;
  po_id      uuid;
  pr_id      uuid;
  rec        record;
  b_req      uuid;
  b_ful      uuid;
  b_ful_name text;
  v_rm_id    uuid;
  v_pid      uuid;
  v_vid      uuid;
  v_sup_id   uuid;
  v_created  timestamptz;
  v_qty      numeric(14,2);
  v_ship     numeric(14,2);
  v_del      numeric(14,2);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM branches WHERE code = 'MNL') THEN
    RAISE EXCEPTION 'seed_mnl_ceb_inter_branch_requests: branch MNL not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM branches WHERE code = 'CEB') THEN
    RAISE EXCEPTION 'seed_mnl_ceb_inter_branch_requests: branch CEB not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM branches WHERE code = 'BTG') THEN
    RAISE EXCEPTION 'seed_mnl_ceb_inter_branch_requests: branch BTG not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM raw_materials WHERE sku = 'LMX-RM-PVC-001') THEN
    RAISE EXCEPTION 'seed_mnl_ceb_inter_branch_requests: run seed_mnl_ceb_btg_bom.sql first';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM product_variants pv
    WHERE pv.sku = 'IBR-SEED-MNL'
  ) THEN
    RAISE EXCEPTION 'seed_mnl_ceb_inter_branch_requests: run inter_branch_overlapping_stock_seed.sql first';
  END IF;

  DELETE FROM purchase_orders WHERE po_number LIKE 'PO-IBR-%-HIST-%';
  DELETE FROM production_requests WHERE pr_number LIKE 'PR-IBR-%-HIST-%';
  DELETE FROM inter_branch_requests WHERE ibr_number LIKE 'IBR-%-HIST-%';

  SELECT id INTO v_rm_id FROM raw_materials WHERE sku = 'LMX-RM-PVC-001' LIMIT 1;

  SELECT s.id INTO v_sup_id FROM suppliers s WHERE s.status = 'Active' ORDER BY s.name LIMIT 1;
  IF v_sup_id IS NULL THEN
    RAISE EXCEPTION 'seed_mnl_ceb_inter_branch_requests: no active supplier';
  END IF;

  FOR rec IN
    SELECT * FROM (VALUES
      -- req_code, ibr_num, ful_code, created_dt, status, line_kind, qty, shipped, delivered, sched_dep
      ('MNL'::text, 'IBR-MNL-HIST-001'::text, 'CEB'::text, '2025-08-18'::date, 'Completed'::text,
        'product'::text, 80::numeric, 80::numeric, 80::numeric, '2025-08-22'::date),
      ('MNL', 'IBR-MNL-HIST-002', 'BTG', '2025-10-22', 'Delivered', 'raw_material', 520, 520, 520, '2025-10-26'),
      ('MNL', 'IBR-MNL-HIST-003', 'CEB', '2025-12-08', 'In Transit', 'product', 96, 96, 0, '2025-12-12'),
      ('MNL', 'IBR-MNL-HIST-004', 'BTG', '2026-01-20', 'Approved', 'raw_material', 340, 0, 0, '2026-01-28'),
      ('MNL', 'IBR-MNL-HIST-005', 'CEB', '2026-02-24', 'Pending', 'product', 64, 0, 0, NULL::date),
      ('MNL', 'IBR-MNL-HIST-006', 'BTG', '2026-03-12', 'Draft', 'raw_material', 180, 0, 0, NULL),
      ('MNL', 'IBR-MNL-HIST-007', 'CEB', '2026-03-30', 'Rejected', 'product', 40, 0, 0, NULL),
      ('MNL', 'IBR-MNL-HIST-008', 'BTG', '2026-04-10', 'Partially Fulfilled', 'raw_material', 240, 240, 150, '2026-04-14'),

      ('CEB', 'IBR-CEB-HIST-001', 'MNL', '2025-09-04', 'Completed', 'product', 72, 72, 72, '2025-09-08'),
      ('CEB', 'IBR-CEB-HIST-002', 'BTG', '2025-11-14', 'Delivered', 'raw_material', 460, 460, 460, '2025-11-18'),
      ('CEB', 'IBR-CEB-HIST-003', 'MNL', '2026-01-08', 'In Transit', 'product', 110, 110, 0, '2026-01-12'),
      ('CEB', 'IBR-CEB-HIST-004', 'BTG', '2026-02-16', 'Approved', 'raw_material', 290, 0, 0, '2026-02-22'),
      ('CEB', 'IBR-CEB-HIST-005', 'MNL', '2026-03-21', 'Pending', 'product', 55, 0, 0, NULL),
      ('CEB', 'IBR-CEB-HIST-006', 'BTG', '2026-04-02', 'Draft', 'raw_material', 160, 0, 0, NULL),
      ('CEB', 'IBR-CEB-HIST-007', 'MNL', '2026-04-14', 'Cancelled', 'product', 48, 0, 0, NULL),
      ('CEB', 'IBR-CEB-HIST-008', 'MNL', '2026-04-28', 'Scheduled', 'product', 88, 0, 0, '2026-05-05')
    ) AS t(
      req_code, ibr_num, ful_code, created_dt, st, kind, qty, shipped, delivered, sched_dep
    )
  LOOP
    SELECT id INTO b_req FROM branches WHERE code = rec.req_code LIMIT 1;
    SELECT id, name INTO b_ful, b_ful_name FROM branches WHERE code = rec.ful_code LIMIT 1;

    v_qty := rec.qty;
    v_ship := rec.shipped;
    v_del := rec.delivered;
    v_created := (rec.created_dt::timestamp + TIME '09:30:00') AT TIME ZONE 'Asia/Manila';

    po_id := NULL;
    pr_id := NULL;

    INSERT INTO inter_branch_requests (
      ibr_number,
      requesting_branch_id,
      fulfilling_branch_id,
      status,
      notes,
      created_by,
      submitted_at,
      approved_by,
      approved_at,
      rejected_by,
      rejection_reason,
      cancelled_by,
      cancelled_at,
      fulfilled_by,
      fulfilled_at,
      scheduled_departure_date,
      created_at,
      updated_at
    ) VALUES (
      rec.ibr_num,
      b_req,
      b_ful,
      rec.st,
      rec.req_code || ' → ' || rec.ful_code || ' demo inter-branch request (seed)',
      CASE rec.req_code WHEN 'MNL' THEN 'Manila Logistics — Planner' ELSE 'Cebu Logistics — Planner' END,
      CASE WHEN rec.st NOT IN ('Draft') THEN v_created + INTERVAL '2 hours' ELSE NULL END,
      CASE WHEN rec.st IN ('Approved', 'Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit', 'Delivered', 'Partially Fulfilled', 'Completed', 'Fulfilled') THEN
        CASE rec.req_code WHEN 'MNL' THEN 'Manila Approver — Ops' ELSE 'Cebu Approver — Ops' END
      ELSE NULL END,
      CASE WHEN rec.st IN ('Approved', 'Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit', 'Delivered', 'Partially Fulfilled', 'Completed', 'Fulfilled') THEN
        v_created + INTERVAL '1 day'
      ELSE NULL END,
      CASE WHEN rec.st = 'Rejected' THEN
        CASE rec.req_code WHEN 'MNL' THEN 'Manila Approver — Ops' ELSE 'Cebu Approver — Ops' END
      ELSE NULL END,
      CASE WHEN rec.st = 'Rejected' THEN 'Insufficient stock at fulfilling branch (seed)' ELSE NULL END,
      CASE WHEN rec.st = 'Cancelled' THEN
        CASE rec.req_code WHEN 'MNL' THEN 'Manila Logistics — Planner' ELSE 'Cebu Logistics — Planner' END
      ELSE NULL END,
      CASE WHEN rec.st = 'Cancelled' THEN v_created + INTERVAL '6 hours' ELSE NULL END,
      CASE WHEN rec.st IN ('Delivered', 'Completed', 'Fulfilled', 'Partially Fulfilled') THEN
        CASE rec.ful_code WHEN 'MNL' THEN 'Manila Warehouse — Dispatch' WHEN 'CEB' THEN 'Cebu Warehouse — Dispatch' ELSE 'Batangas Warehouse — Dispatch' END
      ELSE NULL END,
      CASE WHEN rec.st IN ('Delivered', 'Completed', 'Fulfilled', 'Partially Fulfilled') THEN
        v_created + INTERVAL '5 days'
      ELSE NULL END,
      rec.sched_dep,
      v_created,
      v_created
    )
    RETURNING id INTO ibr_id;

    IF rec.kind = 'raw_material' THEN
      INSERT INTO inter_branch_request_items (
        request_id, line_kind, raw_material_id, quantity, quantity_shipped, quantity_delivered
      ) VALUES (ibr_id, 'raw_material', v_rm_id, v_qty, v_ship, v_del);

      IF rec.st NOT IN ('Draft', 'Rejected', 'Cancelled') THEN
        INSERT INTO purchase_orders (
          po_number, branch_id, supplier_id, status, order_date,
          total_amount, currency, notes, created_by,
          payment_status, is_transfer_request, transfer_requesting_branch_id, inter_branch_request_id,
          created_at, updated_at
        ) VALUES (
          replace(rec.ibr_num, 'IBR-', 'PO-IBR-'),
          b_req,
          v_sup_id,
          CASE rec.st
            WHEN 'Completed' THEN 'Completed'
            WHEN 'Delivered' THEN 'Completed'
            WHEN 'Partially Fulfilled' THEN 'Partially Received'
            WHEN 'In Transit' THEN 'Confirmed'
            ELSE 'Draft'
          END,
          rec.created_dt,
          0,
          'PHP',
          'Linked PO for ' || rec.ibr_num,
          CASE rec.req_code WHEN 'MNL' THEN 'Manila Procurement' ELSE 'Cebu Procurement' END,
          'Unpaid',
          true,
          b_req,
          ibr_id,
          v_created,
          v_created
        )
        RETURNING id INTO po_id;

        INSERT INTO purchase_order_items (
          order_id, material_id, quantity_ordered, quantity_received, unit_price, unit_of_measure
        )
        SELECT
          po_id,
          v_rm_id,
          v_qty,
          v_del,
          0,
          rm.unit_of_measure
        FROM raw_materials rm
        WHERE rm.id = v_rm_id;

        UPDATE inter_branch_requests
        SET linked_purchase_order_id = po_id, updated_at = v_created
        WHERE id = ibr_id;
      END IF;
    ELSE
      SELECT p.id, pv.id
      INTO v_pid, v_vid
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      JOIN branches b ON b.name = p.branch AND b.code = rec.ful_code
      WHERE pv.sku = 'IBR-SEED-' || rec.ful_code
      LIMIT 1;

      IF v_vid IS NULL THEN
        RAISE EXCEPTION 'seed_mnl_ceb_inter_branch_requests: IBR-SEED-% not found', rec.ful_code;
      END IF;

      INSERT INTO inter_branch_request_items (
        request_id, line_kind, product_id, product_variant_id, quantity, quantity_shipped, quantity_delivered
      ) VALUES (ibr_id, 'product', v_pid, v_vid, v_qty, v_ship, v_del);

      IF rec.st NOT IN ('Draft', 'Rejected', 'Cancelled') THEN
        INSERT INTO production_requests (
          pr_number, branch_id, status, request_date, notes, created_by,
          is_transfer_request, transfer_requesting_branch_id, inter_branch_request_id,
          created_at, updated_at
        ) VALUES (
          replace(rec.ibr_num, 'IBR-', 'PR-IBR-'),
          b_ful,
          CASE rec.st
            WHEN 'Completed' THEN 'Completed'
            WHEN 'Delivered' THEN 'Completed'
            WHEN 'Partially Fulfilled' THEN 'In Progress'
            WHEN 'In Transit' THEN 'In Progress'
            WHEN 'Scheduled' THEN 'Accepted'
            ELSE 'Draft'
          END,
          rec.created_dt,
          'Linked PR for ' || rec.ibr_num,
          CASE rec.ful_code WHEN 'MNL' THEN 'Manila Production — Floor' WHEN 'CEB' THEN 'Cebu Production — Floor' ELSE 'Batangas Production — Floor' END,
          true,
          b_req,
          ibr_id,
          v_created,
          v_created
        )
        RETURNING id INTO pr_id;

        INSERT INTO production_request_items (
          request_id, product_id, product_variant_id, quantity, quantity_completed
        ) VALUES (
          pr_id,
          v_pid,
          v_vid,
          v_qty,
          CASE WHEN rec.st IN ('Completed', 'Delivered') THEN v_qty
               WHEN rec.st = 'Partially Fulfilled' THEN v_del
               WHEN rec.st = 'In Transit' THEN v_ship
               ELSE 0 END
        );

        UPDATE inter_branch_requests
        SET linked_production_request_id = pr_id, updated_at = v_created
        WHERE id = ibr_id;
      END IF;
    END IF;

    INSERT INTO inter_branch_request_logs (
      inter_branch_request_id, action, performed_by, description, created_at
    ) VALUES (
      ibr_id,
      'created',
      CASE rec.req_code WHEN 'MNL' THEN 'Manila Logistics — Planner' ELSE 'Cebu Logistics — Planner' END,
      'Inter-branch request raised (seed)',
      v_created
    );

    IF rec.st NOT IN ('Draft') THEN
      INSERT INTO inter_branch_request_logs (
        inter_branch_request_id, action, performed_by, description, created_at
      ) VALUES (
        ibr_id,
        CASE
          WHEN rec.st = 'Rejected' THEN 'rejected'
          WHEN rec.st = 'Cancelled' THEN 'cancelled'
          WHEN rec.st IN ('Completed', 'Delivered', 'Fulfilled') THEN 'fulfilled'
          WHEN rec.st = 'Pending' THEN 'submitted'
          ELSE 'status_change'
        END,
        CASE rec.req_code WHEN 'MNL' THEN 'Manila Approver — Ops' ELSE 'Cebu Approver — Ops' END,
        'Seed workflow — ' || rec.st,
        v_created + INTERVAL '1 day'
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'seed_mnl_ceb_inter_branch_requests: MNL=% CEB=%',
    (SELECT count(*)::int FROM inter_branch_requests WHERE ibr_number LIKE 'IBR-MNL-HIST-%'),
    (SELECT count(*)::int FROM inter_branch_requests WHERE ibr_number LIKE 'IBR-CEB-HIST-%');
END $$;
