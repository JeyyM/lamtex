-- =============================================================================
-- Seed: Warehouse manager PO & PR history
--
-- Creates demo production requests and purchase orders attributed to each active
-- Warehouse Manager (`created_by` = employee_name, matching the Employee detail
-- PO & PR tab and live app actor strings).
--
-- Prerequisites:
--   • schema + warehouse_manager_assignments tables
--   • seed_logistics_warehouse_users.sql (+ seed_quezon_branch_employees.sql)
--   • products / raw materials / suppliers for each branch
--
-- Re-runnable: deletes PR-WH-* / PO-WH-* first.
-- Run after: seed_warehouse_manager_assignments.sql (optional order)
-- =============================================================================

DO $$
DECLARE
  wm            record;
  pr_id         uuid;
  po_id         uuid;
  v_vid         uuid;
  v_pid         uuid;
  v_rm_id       uuid;
  v_rm_uom      text;
  v_rm_price    numeric(14,2);
  v_sup_id      uuid;
  v_acceptor    text;
  v_variant_cnt int;
  v_material_cnt int;
  v_pr_num      text;
  v_po_num      text;
  v_req_dt      date;
  v_done_dt     date;
  v_order_dt    date;
  v_expected_dt date;
  v_actual_dt   date;
  v_pr_status   text;
  v_po_status   text;
  v_pay_status  text;
  v_qty         numeric;
  v_qty_rec     numeric;
  v_qty_ord     numeric;
  v_complete    numeric;
  v_line_total  numeric(14,2);
  v_total_prs   int := 0;
  v_total_pos   int := 0;
  v_pr_statuses text[] := ARRAY[
    'Completed', 'Completed', 'In Progress', 'Requested', 'Draft'
  ];
  v_po_statuses text[] := ARRAY[
    'Completed', 'Completed', 'Partially Received', 'Confirmed', 'Requested'
  ];
  v_pr_seq      int;
  v_po_seq      int;
  v_branch_aliases text[];
  v_mgr_offset  int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM employees
    WHERE role = 'Warehouse Manager' AND status = 'active' AND branch_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'seed_warehouse_manager_po_pr: no active Warehouse Manager employees found';
  END IF;

  DELETE FROM production_requests WHERE pr_number LIKE 'PR-WH-%';
  DELETE FROM purchase_orders WHERE po_number LIKE 'PO-WH-%';

  FOR wm IN
    SELECT
      e.id,
      e.employee_id AS emp_code,
      e.employee_name,
      e.branch_id,
      b.code  AS branch_code,
      b.name  AS branch_name
    FROM employees e
    INNER JOIN branches b ON b.id = e.branch_id
    WHERE e.role = 'Warehouse Manager'
      AND e.status = 'active'
      AND e.branch_id IS NOT NULL
    ORDER BY e.employee_id
  LOOP
    v_branch_aliases := CASE wm.branch_code
      WHEN 'MNL' THEN ARRAY[wm.branch_name, 'Manila']
      WHEN 'CEB' THEN ARRAY[wm.branch_name, 'Cebu']
      WHEN 'BTG' THEN ARRAY[wm.branch_name, 'Batangas']
      WHEN 'QZN' THEN ARRAY[wm.branch_name, 'Quezon']
      ELSE ARRAY[wm.branch_name]
    END;

    v_mgr_offset := (length(wm.emp_code) + ascii(substr(wm.emp_code, length(wm.emp_code), 1))) % 4;

    SELECT employee_name INTO v_acceptor
    FROM employees
    WHERE role = 'Logistics Manager'
      AND branch_id = wm.branch_id
      AND status = 'active'
    ORDER BY employee_id
    LIMIT 1;

    SELECT count(*)::int INTO v_variant_cnt
    FROM product_variants pv
    INNER JOIN products p ON p.id = pv.product_id
    WHERE p.status IS DISTINCT FROM 'Discontinued'
      AND pv.status IS DISTINCT FROM 'Discontinued'
      AND (
        p.branch = ANY (v_branch_aliases)
        OR pv.branch = ANY (v_branch_aliases)
      );

    SELECT count(*)::int INTO v_material_cnt
    FROM raw_materials rm
    WHERE rm.status IS DISTINCT FROM 'Discontinued'
      AND (
        EXISTS (
          SELECT 1
          FROM material_categories mc
          WHERE mc.id = rm.category_id
            AND mc.branch_id = wm.branch_id
        )
        OR EXISTS (
          SELECT 1
          FROM material_stock ms
          WHERE ms.material_id = rm.id
            AND ms.branch_id = wm.branch_id
        )
        OR (wm.branch_code IN ('MNL', 'CEB', 'BTG') AND rm.sku LIKE 'LMX-%')
        OR (wm.branch_code = 'QZN' AND rm.sku LIKE 'QZN-%')
      );

    IF v_variant_cnt = 0 THEN
      RAISE WARNING 'seed_warehouse_manager_po_pr: no product variants for % (%) — skipping PRs',
        wm.employee_name, wm.branch_code;
    END IF;

    IF v_material_cnt = 0 THEN
      RAISE WARNING 'seed_warehouse_manager_po_pr: no raw materials for % (%) — skipping POs',
        wm.employee_name, wm.branch_code;
    END IF;

    -- ── Production requests ────────────────────────────────────────────────
    IF v_variant_cnt > 0 THEN
      FOR v_pr_seq IN 1 .. array_length(v_pr_statuses, 1)
      LOOP
        v_pr_status := v_pr_statuses[v_pr_seq];
        v_pr_num := format('PR-WH-%s-%02s', wm.emp_code, v_pr_seq);
        -- Recent dates so the Employee detail PO & PR tab (default: current month) shows seeded rows.
        v_req_dt := CURRENT_DATE
          - ((array_length(v_pr_statuses, 1) - v_pr_seq) * 3 + v_mgr_offset);
        v_done_dt := CASE
          WHEN v_pr_status IN ('Draft', 'Requested', 'Accepted') THEN v_req_dt + 14
          WHEN v_pr_status = 'In Progress' THEN NULL
          ELSE v_req_dt + 10 + (v_pr_seq % 5)
        END;

        SELECT pv.id, pv.product_id
        INTO v_vid, v_pid
        FROM product_variants pv
        INNER JOIN products p ON p.id = pv.product_id
        WHERE p.status IS DISTINCT FROM 'Discontinued'
          AND pv.status IS DISTINCT FROM 'Discontinued'
          AND (
            p.branch = ANY (v_branch_aliases)
            OR pv.branch = ANY (v_branch_aliases)
          )
        ORDER BY pv.sku
        OFFSET ((v_pr_seq - 1) % v_variant_cnt)
        LIMIT 1;

        v_qty := 120 + (v_pr_seq * 35) + (v_pr_seq % 3) * 10;
        v_complete := CASE
          WHEN v_pr_status = 'Completed' THEN v_qty
          WHEN v_pr_status = 'In Progress' THEN round(v_qty * 0.4, 2)
          ELSE 0
        END;

        INSERT INTO production_requests (
          pr_number, branch_id, status, request_date, expected_completion_date,
          notes, created_by, accepted_by, accepted_at
        ) VALUES (
          v_pr_num,
          wm.branch_id,
          v_pr_status,
          v_req_dt,
          v_done_dt,
          wm.branch_code || ' warehouse manager demo PR — ' || wm.employee_name,
          wm.employee_name,
          CASE
            WHEN v_pr_status IN ('Completed', 'In Progress', 'Accepted') THEN v_acceptor
            ELSE NULL
          END,
          CASE
            WHEN v_pr_status IN ('Completed', 'In Progress', 'Accepted') AND v_acceptor IS NOT NULL THEN
              (v_req_dt::timestamp + TIME '09:30:00') AT TIME ZONE 'Asia/Manila'
            ELSE NULL
          END
        )
        RETURNING id INTO pr_id;

        INSERT INTO production_request_items (
          request_id, product_id, product_variant_id, quantity, quantity_completed
        ) VALUES (pr_id, v_pid, v_vid, v_qty, v_complete);

        INSERT INTO production_request_logs (request_id, action, performed_by, description)
        VALUES (pr_id, 'created', wm.employee_name, 'Production request raised (warehouse manager seed)');

        IF v_pr_status IN ('Completed', 'In Progress', 'Accepted') AND v_acceptor IS NOT NULL THEN
          INSERT INTO production_request_logs (request_id, action, performed_by, description)
          VALUES (
            pr_id,
            CASE v_pr_status
              WHEN 'Completed' THEN 'completed'
              WHEN 'In Progress' THEN 'status_change'
              ELSE 'accepted'
            END,
            v_acceptor,
            'Seed workflow — ' || v_pr_status
          );
        END IF;

        v_total_prs := v_total_prs + 1;
      END LOOP;
    END IF;

    -- ── Purchase orders ────────────────────────────────────────────────────
    IF v_material_cnt > 0 THEN
      SELECT s.id INTO v_sup_id
      FROM suppliers s
      INNER JOIN supplier_branches sb ON sb.supplier_id = s.id
      WHERE sb.branch_id = wm.branch_id
        AND s.status = 'Active'
      ORDER BY s.name
      LIMIT 1;

      IF v_sup_id IS NULL THEN
        SELECT id INTO v_sup_id
        FROM suppliers
        WHERE status = 'Active'
        ORDER BY name
        LIMIT 1;
      END IF;

      IF v_sup_id IS NULL THEN
        RAISE EXCEPTION 'seed_warehouse_manager_po_pr: no active supplier found for branch %', wm.branch_code;
      END IF;

      FOR v_po_seq IN 1 .. array_length(v_po_statuses, 1)
      LOOP
        v_po_status := v_po_statuses[v_po_seq];
        v_po_num := format('PO-WH-%s-%02s', wm.emp_code, v_po_seq);
        v_order_dt := CURRENT_DATE
          - ((array_length(v_po_statuses, 1) - v_po_seq) * 3 + v_mgr_offset + 1);
        v_expected_dt := v_order_dt + 12 + (v_po_seq % 4);
        v_actual_dt := CASE
          WHEN v_po_status IN ('Completed', 'Partially Received') THEN v_expected_dt - 1
          ELSE NULL
        END;

        SELECT rm.id, rm.cost_per_unit, coalesce(rm.unit_of_measure::text, 'kg')
        INTO v_rm_id, v_rm_price, v_rm_uom
        FROM raw_materials rm
        WHERE rm.status IS DISTINCT FROM 'Discontinued'
          AND (
            EXISTS (
              SELECT 1
              FROM material_categories mc
              WHERE mc.id = rm.category_id
                AND mc.branch_id = wm.branch_id
            )
            OR EXISTS (
              SELECT 1
              FROM material_stock ms
              WHERE ms.material_id = rm.id
                AND ms.branch_id = wm.branch_id
            )
            OR (wm.branch_code IN ('MNL', 'CEB', 'BTG') AND rm.sku LIKE 'LMX-%')
            OR (wm.branch_code = 'QZN' AND rm.sku LIKE 'QZN-%')
          )
        ORDER BY rm.sku
        OFFSET ((v_po_seq - 1) % v_material_cnt)
        LIMIT 1;

        v_qty_ord := 800 + (v_po_seq * 120);
        v_qty_rec := CASE
          WHEN v_po_status = 'Completed' THEN v_qty_ord
          WHEN v_po_status = 'Partially Received' THEN round(v_qty_ord * 0.55, 2)
          ELSE 0
        END;

        v_pay_status := CASE
          WHEN v_po_status = 'Completed' THEN 'Paid'
          WHEN v_po_status = 'Partially Received' THEN 'Partially Paid'
          ELSE 'Unpaid'
        END;

        v_line_total := round(v_qty_ord * coalesce(v_rm_price, 50), 2);

        INSERT INTO purchase_orders (
          po_number, branch_id, supplier_id, status,
          order_date, expected_delivery_date, actual_delivery_date,
          total_amount, currency, notes, created_by,
          payment_status, amount_paid
        ) VALUES (
          v_po_num,
          wm.branch_id,
          v_sup_id,
          v_po_status,
          v_order_dt,
          v_expected_dt,
          v_actual_dt,
          v_line_total,
          'PHP',
          wm.branch_code || ' warehouse manager demo PO — ' || wm.employee_name,
          wm.employee_name,
          v_pay_status,
          CASE
            WHEN v_pay_status = 'Paid' THEN v_line_total
            WHEN v_pay_status = 'Partially Paid' THEN round(v_line_total * (v_qty_rec / NULLIF(v_qty_ord, 0)), 2)
            ELSE 0
          END
        )
        RETURNING id INTO po_id;

        INSERT INTO purchase_order_items (
          order_id, material_id, quantity_ordered, quantity_received,
          unit_price, unit_of_measure, sync_price_on_receive
        ) VALUES (
          po_id, v_rm_id, v_qty_ord, v_qty_rec, coalesce(v_rm_price, 50), v_rm_uom, false
        );

        INSERT INTO purchase_order_logs (order_id, action, performed_by, description)
        VALUES (
          po_id,
          'created',
          wm.employee_name,
          'Purchase order created (warehouse manager seed)'
        );

        IF v_po_status IN ('Completed', 'Partially Received') THEN
          INSERT INTO purchase_order_logs (order_id, action, performed_by, description)
          VALUES (
            po_id,
            'received',
            wm.employee_name,
            CASE v_po_status WHEN 'Completed' THEN 'Receipt closed' ELSE 'Partial receipt logged' END
          );
        END IF;

        v_total_pos := v_total_pos + 1;
      END LOOP;
    END IF;
  END LOOP;

  RAISE NOTICE
    'seed_warehouse_manager_po_pr: inserted % production request(s) and % purchase order(s) for warehouse managers',
    v_total_prs, v_total_pos;

  IF v_total_prs = 0 AND v_total_pos = 0 THEN
    RAISE EXCEPTION
      'seed_warehouse_manager_po_pr: inserted nothing. Run product seeds (apply.sql / schema.sql) and raw material seeds (seed_mnl_ceb_btg_bom.sql, seed_quezon_raw_materials_and_supplier_links.sql) first.';
  END IF;
END;
$$;

-- Visible in Supabase Results tab (NOTICE lines are easy to miss)
SELECT
  (SELECT count(*)::int FROM production_requests WHERE pr_number LIKE 'PR-WH-%') AS seeded_production_requests,
  (SELECT count(*)::int FROM purchase_orders WHERE po_number LIKE 'PO-WH-%') AS seeded_purchase_orders,
  (SELECT count(*)::int FROM employees WHERE role = 'Warehouse Manager' AND status = 'active') AS warehouse_managers;
