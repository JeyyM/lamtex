-- ============================================================================
-- overhaul_reseed.sql
-- Full reseed of customers + orders + downstream operational data after
-- `overhaul_wipe.sql`.
--
-- Targets (per user direction):
--   • 4 branches: Manila, Cebu, Batangas, Quezon
--   • ~12 customers per active Sales Agent (range 10–15)
--     → also populates customer_assignments (one row per customer)
--     → customers.created_at aligned to account_since (Agent Analytics new-customer KPI)
--   • ~450 orders per branch (range 400–500), spread across the last 24 months
--     → ~5 orders/customer on average; realistic active-vs-dormant mix
--   • Order number format: YYYY-MM-DD-NNNNNN
--   • Status mix: full lifecycle, ~70% in terminal states (Delivered/Completed)
--   • Payment mix: mostly Paid, with Partially Paid / On Credit / Overdue / Unbilled
--   • BOM-aware: write material_consumption rows on every line × BOM row
--     (no stock decrement — stocks remain untouched)
--   • Fleet: 1 trip per logistics-active order, rotating drivers + trucks
--   • Invoices + receivables + delivery proofs; payment proofs optional (not auto-seeded)
--   • Customer aggregates (order_count, ytd, outstanding, overdue, etc.)
--   • Agent performance snapshots (monthly, per agent, with ranks)
--   • Agent commissions ledger (one row per agent × month, with breakdown
--     JSONB) — uses live formula: payment_cash_amount × agent rate
--   • agent_commissions ledger from order.amount_paid (no proof files required)
--   • employee_compensation backfill for any Sales Agent without one
--
-- Run in: Supabase Dashboard → SQL Editor AFTER `overhaul_wipe.sql`.
-- ============================================================================

-- Determinism: seed Postgres random() so reruns line up.
SELECT setseed(0.2026);


-- ============================================================================
-- PHASE 0: EMPLOYEE COMPENSATION BACKFILL
-- The live finance code (`recordOrderProofCommission` in financeMutations.ts)
-- reads `employee_compensation.commission_rate` per agent. If the row is
-- missing the live commission ledger silently skips. We backfill the row for
-- every active Sales Agent that doesn't already have one, using a tier
-- rotation: Bronze 1.0%, Silver 1.5%, Gold 2.0%, Platinum 2.5%.
-- Idempotent (UNIQUE on employee_compensation.employee_id).
-- ============================================================================

DO $phase0$
DECLARE
  v_added INT;
BEGIN
  WITH new_comp AS (
    SELECT
      e.id AS employee_id,
      CASE row_number() OVER (ORDER BY e.employee_name) % 4
        WHEN 0 THEN 'Platinum'::commission_tier
        WHEN 1 THEN 'Bronze'::commission_tier
        WHEN 2 THEN 'Silver'::commission_tier
        ELSE        'Gold'::commission_tier
      END AS tier,
      CASE row_number() OVER (ORDER BY e.employee_name) % 4
        WHEN 0 THEN 2.5::NUMERIC(5,2)
        WHEN 1 THEN 1.0::NUMERIC(5,2)
        WHEN 2 THEN 1.5::NUMERIC(5,2)
        ELSE        2.0::NUMERIC(5,2)
      END AS rate
    FROM employees e
    JOIN branches  b ON b.id = e.branch_id
    WHERE e.role = 'Sales Agent'
      AND e.status = 'active'
      AND b.is_active = TRUE
      AND b.code IN ('MNL','CEB','BTG','QZN')
      AND NOT EXISTS (SELECT 1 FROM employee_compensation ec WHERE ec.employee_id = e.id)
  )
  INSERT INTO employee_compensation (
    employee_id, base_salary, commission_rate, commission_tier,
    bonus_eligibility, monthly_quota, quarterly_quota, yearly_quota,
    allowance_transport, allowance_meal, allowance_communication, allowance_other,
    total_monthly_compensation
  )
  SELECT
    employee_id, 30000, rate, tier,
    TRUE, 250000, 750000, 3000000,
    2500, 2000, 1000, 0,
    30000 + 2500 + 2000 + 1000
  FROM new_comp;

  GET DIAGNOSTICS v_added = ROW_COUNT;
  RAISE NOTICE 'Phase 0: backfilled employee_compensation on % sales agents', v_added;
END;
$phase0$;


-- ============================================================================
-- PHASE 1: CUSTOMERS
-- 10–15 customers per active Sales Agent in {Manila, Cebu, Batangas, Quezon}.
-- Executive users (user_role = 'Executive') are excluded by filtering on
-- employee_role = 'Sales Agent' AND status = 'active'.
-- ============================================================================

DO $phase1$
DECLARE
  r_agent       RECORD;
  v_n_customers INT;
  v_branch_code TEXT;
  v_city        TEXT;
  v_province    TEXT;
  v_type        customer_type;
  v_terms       TEXT;
  v_credit      NUMERIC(14,2);
  v_first       TEXT;
  v_last        TEXT;
  v_business    TEXT;
  v_name        TEXT;
  v_email       TEXT;
  v_phone       TEXT;
  v_account     DATE;
  v_lat         NUMERIC(10,7);
  v_lng         NUMERIC(10,7);
  v_business_pool TEXT[];
  v_first_pool    TEXT[];
  v_last_pool     TEXT[];
  v_city_pool     TEXT[];
  v_province_pool TEXT[];
  v_lat_center    NUMERIC(10,7);
  v_lng_center    NUMERIC(10,7);
  v_total_inserted INT := 0;
  v_seq INT;
  v_cust_id_just_inserted UUID;
BEGIN
  -- Business name parts and city pools per branch
  v_first_pool := ARRAY[
    'Jose','Maria','Juan','Anna','Mark','Liza','Paolo','Rosa','Carlo','Grace',
    'Rico','Mira','Don','Ella','Jay','Bea','Noel','Anya','Tom','Ria',
    'Ben','Cora','Eric','Fely','Greg','Hana','Ian','Jenny','Kevin','Lilia'
  ];
  v_last_pool := ARRAY[
    'Reyes','Cruz','Bautista','Garcia','Santos','Mendoza','Tan','Lim','Dela Cruz','Aquino',
    'Villanueva','Morales','Castillo','Ramos','Navarro','Pascual','Lopez','Aguilar','Domingo','Ocampo'
  ];

  FOR r_agent IN
    SELECT
      e.id           AS agent_id,
      e.employee_name AS agent_name,
      e.branch_id,
      b.code         AS branch_code,
      b.name         AS branch_name
    FROM employees e
    JOIN branches  b ON b.id = e.branch_id
    WHERE e.role   = 'Sales Agent'
      AND e.status = 'active'
      AND b.is_active = TRUE
      AND b.code IN ('MNL','CEB','BTG','QZN')
    ORDER BY b.code, e.employee_name
  LOOP
    -- Branch-specific city / province pools + map center for jitter
    IF r_agent.branch_code = 'MNL' THEN
      v_business_pool := ARRAY[
        'MetroBuild Supply','NCR Hardware Depot','Greater Manila Pipes','Capital Construction',
        'Northstar Trade','Bayanihan Builders','Aurora Industrial','EDSA Plumbing Supply',
        'Makati Construction','Pasig Riverline Hardware','QC Builders Mart','Caloocan Tools',
        'Marikina Industrial','Mandaluyong Trade Co','Taguig Pipes & Fittings'
      ];
      v_city_pool     := ARRAY['Quezon City','Makati','Pasig','Caloocan','Manila','Mandaluyong','Pasay','Marikina','Taguig','Valenzuela','Las Piñas','Parañaque'];
      v_province_pool := ARRAY['NCR','NCR','NCR','NCR','NCR','NCR','NCR','NCR','NCR','NCR','NCR','NCR'];
      v_lat_center    := 14.5995;
      v_lng_center    := 120.9842;
    ELSIF r_agent.branch_code = 'CEB' THEN
      v_business_pool := ARRAY[
        'Cebu Pipes & Tools','Visayas Construction','Mactan Builders','Mandaue Industrial',
        'Talisay Hardware','Lapu-Lapu Trade Co','Iloilo Supply House','Bacolod Plumbing',
        'Dumaguete Tools','Tagbilaran Hardware Hub','Bohol Building Center','Negros MEP Supply',
        'Cebu Construction Mart','Visayas Pipes Inc','Southern Hardware'
      ];
      v_city_pool     := ARRAY['Cebu City','Mandaue','Lapu-Lapu','Talisay','Iloilo City','Bacolod','Dumaguete','Tagbilaran','Bogo','Toledo'];
      v_province_pool := ARRAY['Cebu','Cebu','Cebu','Cebu','Iloilo','Negros Occ.','Negros Or.','Bohol','Cebu','Cebu'];
      v_lat_center    := 10.3157;
      v_lng_center    := 123.8854;
    ELSIF r_agent.branch_code = 'BTG' THEN
      v_business_pool := ARRAY[
        'Batangas Industrials','Calabarzon Construction','Lipa Hardware','Tanauan Trade',
        'Sto. Tomas Builders','Cavite Pipes Co','Tagaytay Construction','Calamba MEP',
        'Sta. Rosa Industrial','Laguna Plumbing Depot','Southern Tagalog Tools','Batangas Bay Hardware',
        'Lipa City Construction','Batangas Pipes & Fittings','CALABARZON Supply'
      ];
      v_city_pool     := ARRAY['Batangas City','Lipa','Tanauan','Sto. Tomas','Bauan','Calamba','Sta. Rosa','Tagaytay','Cavite City','Imus'];
      v_province_pool := ARRAY['Batangas','Batangas','Batangas','Batangas','Batangas','Laguna','Laguna','Cavite','Cavite','Cavite'];
      v_lat_center    := 13.7565;
      v_lng_center    := 121.0583;
    ELSE -- QZN
      v_business_pool := ARRAY[
        'Lucena Builders Supply','Quezon Province Hardware','Tayabas Construction','Sariaya Industrial',
        'Atimonan Trade Co','Pagbilao Pipes','Mauban Hardware','Calauag Construction',
        'Gumaca MEP Supply','Tagkawayan Builders','Quezon Plumbing Depot','Southern Quezon Tools',
        'Lucena Industrial Hub','Bondoc Peninsula Hardware','Sierra Madre Trade'
      ];
      v_city_pool     := ARRAY['Lucena','Tayabas','Sariaya','Atimonan','Pagbilao','Mauban','Calauag','Gumaca','Tagkawayan','Candelaria'];
      v_province_pool := ARRAY['Quezon','Quezon','Quezon','Quezon','Quezon','Quezon','Quezon','Quezon','Quezon','Quezon'];
      v_lat_center    := 13.9367;
      v_lng_center    := 121.6175;
    END IF;

    -- Random 10..15 customers for this agent
    v_n_customers := 10 + (random() * 5)::INT;

    FOR v_seq IN 1..v_n_customers LOOP
      -- Pick customer type weighted: Hardware 35%, Contractor 25%, Distributor 25%, Construction 15%
      v_type := CASE
        WHEN random() < 0.35 THEN 'Hardware Store'::customer_type
        WHEN random() < 0.60 THEN 'Contractor'::customer_type
        WHEN random() < 0.85 THEN 'Distributor'::customer_type
        ELSE                       'Construction Company'::customer_type
      END;

      -- Payment terms: COD 15%, 15d 20%, 30d 35%, 45d 20%, 60d 10%
      v_terms := CASE
        WHEN random() < 0.15 THEN 'COD'
        WHEN random() < 0.35 THEN '15 Days'
        WHEN random() < 0.70 THEN '30 Days'
        WHEN random() < 0.90 THEN '45 Days'
        ELSE                     '60 Days'
      END;

      -- Credit limit varies by type
      v_credit := CASE v_type
        WHEN 'Distributor'         THEN 250000 + (random() * 250000)::INT
        WHEN 'Construction Company' THEN 200000 + (random() * 200000)::INT
        WHEN 'Contractor'          THEN 100000 + (random() * 150000)::INT
        ELSE                            50000  + (random() * 100000)::INT
      END;

      -- Pick city from pool
      v_city     := v_city_pool[1 + (random() * array_length(v_city_pool, 1))::INT % array_length(v_city_pool, 1)];
      v_province := v_province_pool[
        COALESCE(array_position(v_city_pool, v_city), 1)
      ];

      -- Map jitter around branch center
      v_lat := v_lat_center + ((random() - 0.5) * 0.6);
      v_lng := v_lng_center + ((random() - 0.5) * 0.6);

      -- Business name + contact + email
      v_business := v_business_pool[1 + (random() * array_length(v_business_pool, 1))::INT % array_length(v_business_pool, 1)];
      v_first    := v_first_pool[1 + (random() * array_length(v_first_pool, 1))::INT % array_length(v_first_pool, 1)];
      v_last     := v_last_pool[1 + (random() * array_length(v_last_pool, 1))::INT % array_length(v_last_pool, 1)];

      -- Distinct business identifier per row so the seed isn't full of duplicate names
      v_name  := v_business || ' '
                 || (CASE v_type
                      WHEN 'Distributor'         THEN 'Distribution'
                      WHEN 'Construction Company' THEN 'Construction Inc'
                      WHEN 'Contractor'          THEN 'Contracting'
                      ELSE                            'Hardware'
                    END)
                 || ' ' || (1000 + (random() * 8999)::INT)::TEXT;

      v_email := lower(replace(v_name, ' ', '.')) || '@' ||
                 lower(replace(v_business_pool[1], ' ', '')) || '.ph';
      v_phone := '09' || (10 + (random() * 89)::INT)::TEXT
                       || '-' || lpad((random() * 9999999)::INT::TEXT, 7, '0');

      -- account_since: random across last 1.5 years
      v_account := CURRENT_DATE - (30 + (random() * 540)::INT);

      INSERT INTO customers (
        name, type, client_type, status, risk_level, payment_behavior,
        contact_person, phone, email,
        address, city, province, postal_code, map_lat, map_lng,
        credit_limit, available_credit, payment_terms, payment_score,
        assigned_agent_id, branch_id,
        account_since, created_at,
        tags
      ) VALUES (
        v_name,
        v_type,
        CASE WHEN random() < 0.85 THEN 'Office'::client_type ELSE 'Personal'::client_type END,
        'Active'::customer_status,
        'Low'::risk_level,
        'Good'::payment_behavior,
        v_first || ' ' || v_last,
        v_phone,
        v_email,
        ((random() * 999)::INT + 1)::TEXT || ' ' ||
          (ARRAY['Main','Quirino','Rizal','Mabini','Bonifacio','Aguinaldo','Magsaysay','Roxas','Burgos','Recto'])[1 + (random() * 10)::INT % 10] ||
          ' Street',
        v_city,
        v_province,
        (1000 + (random() * 8999)::INT)::TEXT,
        v_lat,
        v_lng,
        ROUND(v_credit, 2),
        ROUND(v_credit, 2),
        v_terms,
        70 + (random() * 25)::INT,  -- starting payment_score 70–95
        r_agent.agent_id,
        r_agent.branch_id,
        v_account,
        -- Agent Analytics "new customers" uses created_at, not account_since.
        v_account::TIMESTAMPTZ + (random() * INTERVAL '12 hours'),
        ARRAY['overhaul-seed']
      )
      RETURNING id INTO v_cust_id_just_inserted;

      -- Mirror the assignment into customer_assignments (agent CRM source-of-truth).
      INSERT INTO customer_assignments (
        employee_id, customer_id, customer_name, company,
        contact_number, email,
        total_orders, lifetime_revenue, last_order_date,
        status, assigned_date
      ) VALUES (
        r_agent.agent_id, v_cust_id_just_inserted, v_name, v_name,
        v_phone, v_email,
        0, 0, NULL,
        'Active'::customer_assignment_status, v_account
      );

      v_total_inserted := v_total_inserted + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Phase 1: inserted % customers', v_total_inserted;
END;
$phase1$;


-- ============================================================================
-- PHASE 2: ORDERS + LINE ITEMS
-- ~400–500 orders per branch (by branches.code MNL/CEB/BTG/QZN), spread over 24 months.
-- Order number: YYYY-MM-DD-NNNNNN (per-day sequence reset).
-- Status mix and payment mix are weighted; recent orders are biased toward
-- in-progress statuses.
-- ============================================================================

DO $phase2$
DECLARE
  r_branch        RECORD;
  v_orders_target INT;
  v_o             INT;
  v_cust_id       UUID;
  v_cust_name     VARCHAR(300);
  v_cust_addr     TEXT;
  v_cust_terms    TEXT;
  v_agent_id      UUID;
  v_agent_name    VARCHAR(200);
  v_order_id      UUID;
  v_order_date    DATE;
  v_days_ago      INT;
  v_is_recent     BOOLEAN;
  v_status        order_status;
  v_pay_status    payment_status;
  v_n_lines       INT;
  v_l             INT;
  v_variant_id    UUID;
  v_sku           VARCHAR(100);
  v_pname         VARCHAR(300);
  v_psize         TEXT;
  v_unit_price    NUMERIC(12,2);
  v_qty           INT;
  v_line_total    NUMERIC(14,2);
  v_v_weight      NUMERIC(10,3);
  v_v_volume      NUMERIC(10,3);
  v_subtotal      NUMERIC(14,2);
  v_total         NUMERIC(14,2);
  v_total_weight  NUMERIC(10,3);
  v_total_volume  NUMERIC(10,3);
  v_required_date DATE;
  v_scheduled     DATE;
  v_actual_del    DATE;
  v_due_date      DATE;
  v_amount_paid   NUMERIC(14,2);
  v_balance       NUMERIC(14,2);
  v_onum          TEXT;
  v_daily_seq     INT;
  v_total_orders  INT := 0;
  v_status_r      DOUBLE PRECISION;
  v_pay_r         DOUBLE PRECISION;
BEGIN
  -- Daily sequence tracking via temp table so we honor YYYY-MM-DD-NNNNNN per date.
  DROP TABLE IF EXISTS _tmp_daily_seq;
  CREATE TEMP TABLE _tmp_daily_seq (d DATE PRIMARY KEY, seq INT NOT NULL);

  FOR r_branch IN
    SELECT id, code, name FROM branches
    WHERE code IN ('MNL','CEB','BTG','QZN')
    ORDER BY code
  LOOP
    v_orders_target := 400 + (random() * 101)::INT;  -- 400..500

    FOR v_o IN 1..v_orders_target LOOP
      -- Pick a random customer from this branch (must have one)
      SELECT c.id, c.name,
             COALESCE(c.address, '') || ', ' || COALESCE(c.city, '') || ', ' || COALESCE(c.province, ''),
             c.payment_terms,
             c.assigned_agent_id
      INTO   v_cust_id, v_cust_name, v_cust_addr, v_cust_terms, v_agent_id
      FROM customers c
      WHERE c.branch_id = r_branch.id
      ORDER BY random()
      LIMIT 1;

      IF v_cust_id IS NULL THEN CONTINUE; END IF;

      SELECT employee_name INTO v_agent_name FROM employees WHERE id = v_agent_id;

      -- Order date over last 24 months, slight recency bias (skew sqrt)
      v_days_ago   := (730.0 * power(random(), 0.8))::INT;
      v_order_date := CURRENT_DATE - v_days_ago;
      v_is_recent  := v_days_ago < 60;

      -- Daily sequence
      INSERT INTO _tmp_daily_seq (d, seq) VALUES (v_order_date, 1)
      ON CONFLICT (d) DO UPDATE SET seq = _tmp_daily_seq.seq + 1
      RETURNING seq INTO v_daily_seq;

      v_onum := to_char(v_order_date, 'YYYY-MM-DD') || '-' || lpad(v_daily_seq::TEXT, 6, '0');

      -- Status mix.
      -- - Old orders (>60 days): >95% terminal (Delivered/Completed/Cancelled/Rejected).
      -- - Recent orders: full mix of in-progress.
      v_status_r := random();
      IF v_is_recent THEN
        -- Recent orders: full spread
        v_status := CASE
          WHEN v_status_r < 0.05 THEN 'Draft'
          WHEN v_status_r < 0.10 THEN 'Pending'
          WHEN v_status_r < 0.17 THEN 'Approved'
          WHEN v_status_r < 0.24 THEN 'Scheduled'
          WHEN v_status_r < 0.30 THEN 'Loading'
          WHEN v_status_r < 0.35 THEN 'Packed'
          WHEN v_status_r < 0.40 THEN 'Ready'
          WHEN v_status_r < 0.50 THEN 'In Transit'
          WHEN v_status_r < 0.70 THEN 'Delivered'
          WHEN v_status_r < 0.92 THEN 'Completed'
          WHEN v_status_r < 0.97 THEN 'Cancelled'
          ELSE                       'Rejected'
        END::order_status;
      ELSE
        -- Older orders: mostly terminal
        v_status := CASE
          WHEN v_status_r < 0.30 THEN 'Delivered'
          WHEN v_status_r < 0.90 THEN 'Completed'
          WHEN v_status_r < 0.95 THEN 'Cancelled'
          WHEN v_status_r < 0.98 THEN 'Rejected'
          ELSE                       'In Transit'
        END::order_status;
      END IF;

      -- Required date: 5..21 days after order_date
      v_required_date := v_order_date + (5 + (random() * 16)::INT);

      -- Scheduled + actual_delivery depend on status
      v_scheduled := NULL;
      v_actual_del := NULL;
      IF v_status IN ('Scheduled','Loading','Packed','Ready','In Transit','Delivered','Completed') THEN
        v_scheduled := v_order_date + (2 + (random() * 5)::INT);
      END IF;
      IF v_status IN ('Delivered','Completed') THEN
        -- Actual delivery: scheduled +/- a couple of days
        v_actual_del := v_scheduled + ((random() * 4)::INT - 1);
        IF v_actual_del > CURRENT_DATE THEN v_actual_del := CURRENT_DATE - 1; END IF;
      END IF;

      -- Create order shell; subtotal/total filled after line items
      INSERT INTO orders (
        order_number, customer_id, customer_name, agent_id, agent_name, branch_id,
        order_date, required_date, scheduled_departure_date,
        delivery_type, delivery_address,
        payment_terms, payment_method,
        status, payment_status,
        subtotal, discount_percent, discount_amount, tax_amount, total_amount,
        estimated_delivery, actual_delivery,
        order_notes, urgency,
        created_at, updated_at
      ) VALUES (
        v_onum, v_cust_id, v_cust_name, v_agent_id, v_agent_name, r_branch.id,
        v_order_date, v_required_date, v_scheduled,
        'Truck'::delivery_type, v_cust_addr,
        COALESCE(v_cust_terms, '30 Days')::payment_terms, 'Offline'::payment_method_enum,
        v_status, 'Unbilled'::payment_status,  -- payment_status finalized later
        0, 0, 0, 0, 0,
        v_required_date, v_actual_del,
        CASE WHEN random() < 0.20 THEN 'Customer requested expedited handling.' ELSE NULL END,
        CASE
          WHEN random() < 0.10 THEN 'High'::urgency_level
          WHEN random() < 0.30 THEN 'Medium'::urgency_level
          ELSE                       'Low'::urgency_level
        END,
        v_order_date::TIMESTAMPTZ + (random() * INTERVAL '8 hours'),
        v_order_date::TIMESTAMPTZ + (random() * INTERVAL '8 hours')
      ) RETURNING id INTO v_order_id;

      -- 1..4 line items from any active variant
      v_n_lines      := 1 + (random() * 3)::INT;
      v_subtotal     := 0;
      v_total_weight := 0;
      v_total_volume := 0;

      FOR v_l IN 1..v_n_lines LOOP
        -- Prefer variants tagged to this branch; fall back to any Active variant.
        SELECT pv.id, pv.sku,
               COALESCE(p.name, 'Unknown Product'),
               pv.size,
               pv.unit_price,
               COALESCE(pv.weight_kg, 0.5),
               COALESCE(
                 pv.volume_cbm,
                 (pv.outer_diameter_mm / 1000.0)
                  * (pv.outer_diameter_mm / 1000.0)
                  * COALESCE(pv.length_m, 1.0),
                 0.05
               )
        INTO   v_variant_id, v_sku, v_pname, v_psize, v_unit_price, v_v_weight, v_v_volume
        FROM   product_variants pv
        JOIN   products p ON p.id = pv.product_id
        WHERE  pv.status = 'Active'
          AND  pv.branch = r_branch.name
        ORDER BY random()
        LIMIT 1;

        IF v_variant_id IS NULL THEN
          -- Branch has no active variants of its own → fall back to anything Active
          SELECT pv.id, pv.sku,
                 COALESCE(p.name, 'Unknown Product'),
                 pv.size,
                 pv.unit_price,
                 COALESCE(pv.weight_kg, 0.5),
                 COALESCE(
                   pv.volume_cbm,
                   (pv.outer_diameter_mm / 1000.0)
                    * (pv.outer_diameter_mm / 1000.0)
                    * COALESCE(pv.length_m, 1.0),
                   0.05
                 )
          INTO   v_variant_id, v_sku, v_pname, v_psize, v_unit_price, v_v_weight, v_v_volume
          FROM   product_variants pv
          JOIN   products p ON p.id = pv.product_id
          WHERE  pv.status = 'Active'
          ORDER BY random()
          LIMIT 1;
        END IF;

        IF v_variant_id IS NULL THEN CONTINUE; END IF;

        v_qty        := 1 + (random() * 30)::INT;
        v_line_total := ROUND(v_unit_price * v_qty, 2);

        INSERT INTO order_line_items (
          order_id, variant_id, sku, product_name, variant_description,
          quantity, unit_price, original_price, discount_percent, discount_amount,
          line_total,
          stock_hint, available_stock,
          quantity_shipped, quantity_delivered
        ) VALUES (
          v_order_id, v_variant_id, v_sku, v_pname, v_psize,
          v_qty, v_unit_price, v_unit_price, 0, 0,
          v_line_total,
          'Available'::stock_hint, 999,
          CASE WHEN v_status IN ('In Transit','Delivered','Completed') THEN v_qty ELSE NULL END,
          CASE WHEN v_status IN ('Delivered','Completed') THEN v_qty ELSE NULL END
        );

        v_subtotal     := v_subtotal + v_line_total;
        v_total_weight := v_total_weight + (v_v_weight * v_qty);
        v_total_volume := v_total_volume + (v_v_volume * v_qty);
      END LOOP;

      v_total := v_subtotal;  -- no tax/discount at the order level for seed

      -- Determine due_date based on payment_terms
      v_due_date := CASE COALESCE(v_cust_terms, '30 Days')
        WHEN 'COD'      THEN v_order_date
        WHEN '15 Days'  THEN COALESCE(v_actual_del, v_required_date) + 15
        WHEN '30 Days'  THEN COALESCE(v_actual_del, v_required_date) + 30
        WHEN '45 Days'  THEN COALESCE(v_actual_del, v_required_date) + 45
        WHEN '60 Days'  THEN COALESCE(v_actual_del, v_required_date) + 60
        ELSE                 COALESCE(v_actual_del, v_required_date) + 30
      END;

      -- Payment status logic
      -- - Pending/Draft/Rejected/Cancelled  -> Unbilled (0/0)
      -- - Approved/Scheduled/Loading/Packed/Ready -> Invoiced (0/total)
      -- - In Transit -> Invoiced (0/total)
      -- - Delivered/Completed -> Paid (70%) / Partially Paid (12%) / On Credit (8%) / Overdue (10%)
      v_pay_r := random();
      IF v_status IN ('Draft','Pending','Cancelled','Rejected') THEN
        v_pay_status  := 'Unbilled'::payment_status;
        v_amount_paid := 0;
        v_balance     := 0;
      ELSIF v_status IN ('Approved','Scheduled','Loading','Packed','Ready','In Transit') THEN
        v_pay_status  := 'Invoiced'::payment_status;
        v_amount_paid := 0;
        v_balance     := v_total;
      ELSE
        -- Delivered or Completed
        IF v_pay_r < 0.70 THEN
          v_pay_status  := 'Paid'::payment_status;
          v_amount_paid := v_total;
          v_balance     := 0;
        ELSIF v_pay_r < 0.82 THEN
          v_pay_status  := 'Partially Paid'::payment_status;
          v_amount_paid := ROUND((v_total * (0.30 + random() * 0.50))::NUMERIC, 2);
          v_balance     := ROUND((v_total - v_amount_paid)::NUMERIC, 2);
        ELSIF v_pay_r < 0.90 THEN
          v_pay_status  := 'On Credit'::payment_status;
          v_amount_paid := 0;
          v_balance     := v_total;
        ELSE
          -- Overdue: due_date pushed into the past
          v_pay_status  := 'Overdue'::payment_status;
          v_amount_paid := CASE WHEN random() < 0.4 THEN ROUND((v_total * random() * 0.3)::NUMERIC, 2) ELSE 0 END;
          v_balance     := ROUND((v_total - v_amount_paid)::NUMERIC, 2);
          IF v_due_date >= CURRENT_DATE THEN
            v_due_date := CURRENT_DATE - (15 + (random() * 60)::INT);
          END IF;
        END IF;
      END IF;

      -- Backfill order totals + payment + delivery + invoice metadata.
      UPDATE orders SET
        subtotal           = v_subtotal,
        total_amount       = v_total,
        amount_paid        = v_amount_paid,
        balance_due        = v_balance,
        payment_status     = v_pay_status,
        weight_kg          = ROUND(v_total_weight, 3),
        volume_cbm         = ROUND(v_total_volume, 3),
        invoice_date       = CASE WHEN v_pay_status <> 'Unbilled' THEN v_scheduled ELSE NULL END,
        due_date           = CASE WHEN v_pay_status <> 'Unbilled' THEN v_due_date ELSE NULL END,
        delivery_status    = CASE
          WHEN v_status IN ('Delivered','Completed') AND v_actual_del <= v_required_date THEN 'On Time'::delivery_status_enum
          WHEN v_status IN ('Delivered','Completed')                                     THEN 'Delayed'::delivery_status_enum
          ELSE NULL
        END,
        approved_by   = CASE WHEN v_status NOT IN ('Draft','Pending','Cancelled','Rejected') THEN COALESCE(v_agent_name, 'System') END,
        approved_date = CASE WHEN v_status NOT IN ('Draft','Pending','Cancelled','Rejected') THEN v_order_date + INTERVAL '4 hours' END,
        rejected_by   = CASE WHEN v_status = 'Rejected' THEN COALESCE(v_agent_name, 'System') END,
        rejected_date = CASE WHEN v_status = 'Rejected' THEN v_order_date + INTERVAL '6 hours' END,
        rejection_reason = CASE WHEN v_status = 'Rejected' THEN 'Customer cancelled / credit hold.' END,
        cancelled_at  = CASE WHEN v_status = 'Cancelled' THEN v_order_date + INTERVAL '5 hours' END,
        cancellation_reason = CASE WHEN v_status = 'Cancelled' THEN 'Customer cancelled request.' END
      WHERE id = v_order_id;

      -- Order created log
      INSERT INTO order_logs (order_id, action, performed_by, performed_by_role, description, timestamp)
      VALUES (
        v_order_id, 'created', COALESCE(v_agent_name, 'System'), 'Agent',
        'Order created (seed)',
        v_order_date::TIMESTAMPTZ + (random() * INTERVAL '8 hours')
      );

      -- Optional status changed log for terminal statuses
      IF v_status IN ('Delivered','Completed','Cancelled','Rejected') THEN
        INSERT INTO order_logs (order_id, action, performed_by, performed_by_role, description, timestamp, new_value)
        VALUES (
          v_order_id, 'status_changed', 'System', 'System',
          'Status changed to ' || v_status::TEXT,
          (COALESCE(v_actual_del, v_order_date + 7)::TIMESTAMPTZ),
          jsonb_build_object('status', v_status::TEXT)
        );
      END IF;

      v_total_orders := v_total_orders + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Phase 2: inserted % orders', v_total_orders;
END;
$phase2$;


-- ============================================================================
-- PHASE 3: BOM-AWARE MATERIAL CONSUMPTION
-- For each line item × matching BOM row, insert a material_consumption row.
-- consumption_date = actual_delivery (fallback order_date).
-- Stocks are NOT touched (per user direction).
-- Only orders that actually reached the floor get consumption rows:
--   In Transit / Delivered / Completed.
-- ============================================================================

DO $phase3$
DECLARE
  v_inserted INT;
BEGIN
  INSERT INTO material_consumption (
    material_id, material_name,
    quantity_consumed, unit_of_measure, consumption_date,
    product_id, product_name,
    branch,
    cost_per_unit, total_cost,
    issued_by, approved_by,
    remarks
  )
  SELECT
    rm.id,
    rm.name,
    ROUND(bom.quantity_needed * li.quantity, 4),
    bom.unit_of_measure,
    COALESCE(o.actual_delivery, o.order_date),
    p.id,
    p.name,
    b.code,
    rm.cost_per_unit,
    ROUND(bom.quantity_needed * li.quantity * COALESCE(rm.cost_per_unit, 0), 2),
    'Warehouse Staff',
    'Warehouse Manager',
    'Auto-generated from overhaul reseed (BOM × line items)'
  FROM order_line_items li
  JOIN orders                       o   ON o.id = li.order_id
  JOIN branches                     b   ON b.id = o.branch_id
  JOIN product_variants             pv  ON pv.id = li.variant_id
  JOIN products                     p   ON p.id = pv.product_id
  JOIN product_variant_raw_materials bom ON bom.variant_id = pv.id
  JOIN raw_materials                rm  ON rm.id = bom.raw_material_id
  WHERE o.status IN ('In Transit','Delivered','Completed');

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE 'Phase 3: inserted % material_consumption rows', v_inserted;
END;
$phase3$;


-- ============================================================================
-- PHASE 4: FLEET — TRIPS + TRIP HISTORY + DELIVERY TRACKING
-- One trip per order whose status is Scheduled / Loading / Packed / Ready /
-- In Transit / Delivered / Completed.
-- Vehicles + drivers rotate (round-robin via row_number / random pick).
-- Capacity %, weight, volume come from the order's totals.
-- ============================================================================

DO $phase4$
DECLARE
  r_branch     RECORD;
  r_order      RECORD;
  v_vehicle    RECORD;
  v_driver     RECORD;
  v_trip_id    UUID;
  v_trip_num   TEXT;
  v_seq        INT;
  v_dep        TIMESTAMPTZ;
  v_arr        TIMESTAMPTZ;
  v_cap        NUMERIC(5,2);
  v_status     trip_status;
  v_dt_status  delivery_tracking_status;
  v_total      INT := 0;
  v_vehicles   UUID[];
  v_drivers    UUID[];
  v_vidx       INT;
  v_didx       INT;
  v_dest       TEXT;
BEGIN
  FOR r_branch IN
    SELECT id, code, name FROM branches WHERE code IN ('MNL','CEB','BTG','QZN') ORDER BY code
  LOOP
    -- Cache vehicles and drivers for this branch (so rotation is cheap)
    SELECT ARRAY(
      SELECT id FROM vehicles
      WHERE branch_id = r_branch.id
        AND COALESCE(status::TEXT, 'Available') <> 'Out of Service'
      ORDER BY vehicle_id
    ) INTO v_vehicles;

    SELECT ARRAY(
      SELECT id FROM employees
      WHERE branch_id = r_branch.id
        AND role = 'Truck Driver'
        AND status = 'active'
      ORDER BY employee_name
    ) INTO v_drivers;

    IF v_vehicles IS NULL OR array_length(v_vehicles, 1) IS NULL
       OR v_drivers IS NULL OR array_length(v_drivers, 1) IS NULL THEN
      RAISE NOTICE 'Phase 4: branch % has no vehicles/drivers — skipping trips', r_branch.code;
      CONTINUE;
    END IF;

    v_seq  := 0;
    v_vidx := 1;
    v_didx := 1;

    FOR r_order IN
      SELECT o.id, o.order_number, o.order_date, o.scheduled_departure_date,
             o.actual_delivery, o.status, o.customer_name,
             COALESCE(o.weight_kg, 0)   AS weight_kg,
             COALESCE(o.volume_cbm, 0)  AS volume_cbm,
             COALESCE(o.delivery_address, o.customer_name) AS dest
      FROM orders o
      WHERE o.branch_id = r_branch.id
        AND o.status IN ('Scheduled','Loading','Packed','Ready','In Transit','Delivered','Completed')
      ORDER BY o.order_date
    LOOP
      v_seq    := v_seq + 1;
      v_trip_num := 'TRP-' || r_branch.code || '-' || to_char(COALESCE(r_order.scheduled_departure_date, r_order.order_date), 'YYYYMMDD') || '-' || lpad(v_seq::TEXT, 5, '0');

      -- Rotate vehicle and driver
      SELECT id, vehicle_name, COALESCE(max_weight_kg, 0) AS max_w, COALESCE(max_volume_cbm, 0) AS max_v
      INTO v_vehicle
      FROM vehicles
      WHERE id = v_vehicles[v_vidx];
      v_vidx := 1 + (v_vidx % array_length(v_vehicles, 1));

      SELECT id, employee_name
      INTO v_driver
      FROM employees
      WHERE id = v_drivers[v_didx];
      v_didx := 1 + (v_didx % array_length(v_drivers, 1));

      -- Capacity % (whichever is larger between weight and volume)
      v_cap := CASE
        WHEN v_vehicle.max_w > 0 AND v_vehicle.max_v > 0 THEN
          GREATEST(
            LEAST(100, ROUND((r_order.weight_kg  / v_vehicle.max_w) * 100, 2)),
            LEAST(100, ROUND((r_order.volume_cbm / v_vehicle.max_v) * 100, 2))
          )
        WHEN v_vehicle.max_w > 0 THEN
          LEAST(100, ROUND((r_order.weight_kg / v_vehicle.max_w) * 100, 2))
        WHEN v_vehicle.max_v > 0 THEN
          LEAST(100, ROUND((r_order.volume_cbm / v_vehicle.max_v) * 100, 2))
        ELSE 35.00
      END;
      IF v_cap < 8.0 THEN v_cap := 8.0 + (random() * 20)::NUMERIC(5,2); END IF;

      -- Trip status follows order status
      v_status := CASE r_order.status
        WHEN 'Scheduled'  THEN 'Planned'::trip_status
        WHEN 'Loading'    THEN 'Loading'::trip_status
        WHEN 'Packed'     THEN 'Loading'::trip_status
        WHEN 'Ready'      THEN 'Loading'::trip_status
        WHEN 'In Transit' THEN 'In Transit'::trip_status
        WHEN 'Delivered'  THEN 'Completed'::trip_status
        WHEN 'Completed'  THEN 'Completed'::trip_status
        ELSE 'Pending'::trip_status
      END;

      v_dt_status := CASE r_order.status
        WHEN 'Scheduled'  THEN 'Scheduled'::delivery_tracking_status
        WHEN 'Loading'    THEN 'Loading'::delivery_tracking_status
        WHEN 'Packed'     THEN 'Loading'::delivery_tracking_status
        WHEN 'Ready'      THEN 'Loading'::delivery_tracking_status
        WHEN 'In Transit' THEN 'In Transit'::delivery_tracking_status
        WHEN 'Delivered'  THEN 'Delivered'::delivery_tracking_status
        WHEN 'Completed'  THEN 'Delivered'::delivery_tracking_status
        ELSE NULL
      END;

      v_dep := COALESCE(r_order.scheduled_departure_date, r_order.order_date)::TIMESTAMPTZ + INTERVAL '7 hours';
      v_arr := CASE
        WHEN v_status = 'Completed' THEN COALESCE(r_order.actual_delivery, r_order.order_date + 1)::TIMESTAMPTZ + INTERVAL '14 hours'
        ELSE NULL
      END;
      v_dest := r_order.customer_name;

      INSERT INTO trips (
        trip_number, vehicle_id, vehicle_name, driver_id, driver_name,
        status, scheduled_date, departure_time,
        destinations, order_ids,
        capacity_used_percent, weight_used_kg, volume_used_cbm,
        max_weight_kg, max_volume_cbm,
        eta, actual_arrival,
        branch_id
      ) VALUES (
        v_trip_num, v_vehicle.id, v_vehicle.vehicle_name, v_driver.id, v_driver.employee_name,
        v_status, COALESCE(r_order.scheduled_departure_date, r_order.order_date), v_dep,
        ARRAY[v_dest], ARRAY[r_order.id],
        v_cap, ROUND(r_order.weight_kg, 2), ROUND(r_order.volume_cbm, 3),
        v_vehicle.max_w, v_vehicle.max_v,
        v_arr, v_arr,
        r_branch.id
      ) RETURNING id INTO v_trip_id;

      -- Delivery tracking row for any logistics-active trip
      IF v_dt_status IS NOT NULL THEN
        INSERT INTO delivery_tracking (
          trip_id, delivery_number, vehicle, driver, route, orders_count,
          status, eta, actual_arrival, pod_collected, branch_id
        ) VALUES (
          v_trip_id,
          'DLV-' || r_branch.code || '-' || to_char(COALESCE(r_order.scheduled_departure_date, r_order.order_date), 'YYYYMMDD') || '-' || lpad(v_seq::TEXT, 5, '0'),
          v_vehicle.vehicle_name, v_driver.employee_name,
          v_dest, 1,
          v_dt_status, v_arr, v_arr,
          (v_dt_status = 'Delivered'),
          r_branch.id
        );
      END IF;

      -- Trip history for completed trips
      IF v_status = 'Completed' THEN
        INSERT INTO trip_history (
          trip_id, trip_number, vehicle_id, vehicle_name, driver_name,
          scheduled_date, departure_time, arrival_time,
          destinations, orders_count, delivery_success_rate, status,
          branch_id
        ) VALUES (
          v_trip_id, v_trip_num, v_vehicle.id, v_vehicle.vehicle_name, v_driver.employee_name,
          COALESCE(r_order.scheduled_departure_date, r_order.order_date), v_dep, v_arr,
          ARRAY[v_dest], 1, v_cap, v_status,
          r_branch.id
        );
      END IF;

      v_total := v_total + 1;
    END LOOP;
  END LOOP;

  -- Refresh vehicle utilization + status from current trip activity
  UPDATE vehicles v SET
    trips_today = COALESCE(t.cnt_today, 0),
    utilization_percent = COALESCE(t.avg_cap, 0),
    status = CASE
      WHEN t.in_transit > 0 THEN 'On Trip'::vehicle_status
      WHEN t.loading    > 0 THEN 'Loading'::vehicle_status
      ELSE                       'Available'::vehicle_status
    END,
    current_trip_id = t.current_trip_id
  FROM (
    SELECT
      vehicle_id,
      COUNT(*) FILTER (WHERE scheduled_date = CURRENT_DATE)              AS cnt_today,
      ROUND(AVG(capacity_used_percent), 2)                               AS avg_cap,
      COUNT(*) FILTER (WHERE status = 'In Transit')                      AS in_transit,
      COUNT(*) FILTER (WHERE status = 'Loading')                         AS loading,
      (ARRAY_AGG(id ORDER BY scheduled_date DESC) FILTER (WHERE status IN ('In Transit','Loading')))[1] AS current_trip_id
    FROM trips
    GROUP BY vehicle_id
  ) t
  WHERE v.id = t.vehicle_id;

  RAISE NOTICE 'Phase 4: inserted % trips', v_total;
END;
$phase4$;


-- ============================================================================
-- PHASE 5: INVOICES + RECEIVABLES (+ optional delivery proofs only)
-- For every invoiced order: invoice + receivable from orders.amount_paid / balance_due.
-- Payment proofs are NOT auto-seeded — agents can record cash/credit on the order
-- without attachments in the app (optional payment proof inputs).
-- Delivered/Completed orders still get a delivery proof for POD-style history.
-- ============================================================================

DO $phase5$
DECLARE
  r_order   RECORD;
  v_inv_id  UUID;
  v_inv_num TEXT;
  v_seq     INT := 0;
  v_total_invoices INT := 0;
  v_total_proofs   INT := 0;
BEGIN
  FOR r_order IN
    SELECT o.id, o.order_number, o.order_date, o.actual_delivery, o.scheduled_departure_date,
           o.customer_id, o.customer_name, o.agent_id, o.agent_name, o.branch_id,
           o.subtotal, o.total_amount, o.amount_paid, o.balance_due,
           o.payment_status, o.payment_terms, o.payment_method, o.delivery_address,
           o.due_date, o.status,
           c.contact_person, c.phone, c.email
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.payment_status IN ('Invoiced','Partially Paid','Paid','Overdue','On Credit')
    ORDER BY o.order_date
  LOOP
    v_seq    := v_seq + 1;
    v_inv_num := 'INV-' || to_char(r_order.order_date, 'YYYYMM') || '-' || lpad(v_seq::TEXT, 6, '0');

    INSERT INTO invoices (
      invoice_number, order_id,
      issue_date, due_date,
      bill_to_name, bill_to_address, bill_to_contact, bill_to_phone, bill_to_email,
      subtotal, discount_amount, tax_amount, total_amount, amount_paid, balance_due,
      payment_terms, payment_method, payment_status,
      notes, generated_by
    ) VALUES (
      v_inv_num, r_order.id,
      COALESCE(r_order.scheduled_departure_date, r_order.order_date), COALESCE(r_order.due_date, r_order.order_date + 30),
      r_order.customer_name, r_order.delivery_address, r_order.contact_person, r_order.phone, r_order.email,
      r_order.subtotal, 0, 0, r_order.total_amount, r_order.amount_paid, r_order.balance_due,
      r_order.payment_terms, r_order.payment_method, r_order.payment_status,
      'Generated by overhaul reseed.', COALESCE(r_order.agent_name, 'System')
    ) RETURNING id INTO v_inv_id;

    UPDATE orders SET invoice_id = v_inv_id WHERE id = r_order.id;

    -- Receivable
    INSERT INTO receivables (
      invoice_id, order_id, customer_id, customer_name,
      invoice_date, due_date, invoice_amount, amount_paid, balance_due,
      status, days_overdue,
      payment_terms,
      assigned_agent_id, assigned_agent_name, branch_id
    ) VALUES (
      v_inv_id, r_order.id, r_order.customer_id, r_order.customer_name,
      COALESCE(r_order.scheduled_departure_date, r_order.order_date),
      COALESCE(r_order.due_date, r_order.order_date + 30),
      r_order.total_amount, r_order.amount_paid, r_order.balance_due,
      CASE
        WHEN r_order.payment_status = 'Paid'            THEN 'Collected'::collection_status
        WHEN r_order.payment_status = 'Partially Paid'  THEN 'Partially Paid'::collection_status
        WHEN r_order.payment_status = 'Overdue'         THEN 'Overdue'::collection_status
        WHEN COALESCE(r_order.due_date, r_order.order_date + 30) < CURRENT_DATE + 7 THEN 'Due Soon'::collection_status
        ELSE                                                  'Current'::collection_status
      END,
      GREATEST(0, CURRENT_DATE - COALESCE(r_order.due_date, r_order.order_date + 30)),
      r_order.payment_terms,
      r_order.agent_id, r_order.agent_name, r_order.branch_id
    );

    v_total_invoices := v_total_invoices + 1;

    -- Delivery proof for Delivered/Completed
    IF r_order.status IN ('Delivered','Completed') THEN
      INSERT INTO order_proof_documents (
        order_id, type, file_name, file_url, uploaded_by, uploaded_by_role,
        status, verified_by, verified_at, title, uploaded_at
      ) VALUES (
        r_order.id, 'delivery'::proof_type,
        'delivery-' || r_order.order_number || '.pdf',
        '/seed/delivery/' || r_order.order_number || '.pdf',
        'Logistics Staff', 'Logistics'::proof_uploader_role,
        'verified'::proof_status, 'Operations Manager',
        COALESCE(r_order.actual_delivery, r_order.order_date + 7)::TIMESTAMPTZ + INTERVAL '15 hours',
        'Delivery confirmation for ' || r_order.order_number,
        COALESCE(r_order.actual_delivery, r_order.order_date + 7)::TIMESTAMPTZ + INTERVAL '14 hours'
      );
      v_total_proofs := v_total_proofs + 1;
    END IF;

    -- Payment proofs: intentionally omitted (optional in UI — use orders.amount_paid).
  END LOOP;

  RAISE NOTICE 'Phase 5: inserted % invoices and % proofs', v_total_invoices, v_total_proofs;
END;
$phase5$;


-- ============================================================================
-- PHASE 6: CUSTOMER AGGREGATE RECOMPUTE
-- Recalculate order_count, ytd, lifetime, last_order_date, outstanding_balance,
-- available_credit, overdue_amount from the new order/invoice rows so the
-- Customer CRM, Agent Analytics, and Finance dashboards line up immediately.
-- ============================================================================

DO $phase6$
DECLARE
  v_updated INT;
BEGIN
  WITH agg AS (
    SELECT
      o.customer_id,
      COUNT(*) FILTER (WHERE o.status NOT IN ('Draft','Cancelled','Rejected'))                       AS n_orders,
      MAX(o.order_date) FILTER (WHERE o.status NOT IN ('Draft','Cancelled','Rejected'))              AS last_order_date,
      COALESCE(SUM(o.total_amount) FILTER (
        WHERE o.status NOT IN ('Draft','Cancelled','Rejected')
        AND   o.order_date >= date_trunc('year', CURRENT_DATE)::DATE
      ), 0) AS ytd_revenue,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.status NOT IN ('Draft','Cancelled','Rejected')), 0) AS lifetime_revenue,
      COALESCE(SUM(o.balance_due)  FILTER (WHERE o.payment_status IN ('Invoiced','Partially Paid','On Credit','Overdue')), 0) AS outstanding,
      COALESCE(SUM(o.balance_due)  FILTER (WHERE o.payment_status = 'Overdue'), 0) AS overdue
    FROM orders o
    WHERE o.customer_id IS NOT NULL
    GROUP BY o.customer_id
  )
  UPDATE customers c SET
    order_count               = COALESCE(a.n_orders, 0),
    last_order_date           = a.last_order_date,
    total_purchases_ytd       = COALESCE(a.ytd_revenue, 0),
    total_purchases_lifetime  = COALESCE(a.lifetime_revenue, 0),
    outstanding_balance       = COALESCE(a.outstanding, 0),
    overdue_amount            = COALESCE(a.overdue, 0),
    available_credit          = GREATEST(0, c.credit_limit - COALESCE(a.outstanding, 0)),
    payment_behavior          = CASE
      WHEN COALESCE(a.overdue, 0)     > c.credit_limit * 0.3 THEN 'Risk'::payment_behavior
      WHEN COALESCE(a.overdue, 0)     > 0                    THEN 'Watchlist'::payment_behavior
      ELSE                                                        'Good'::payment_behavior
    END,
    risk_level                = CASE
      WHEN COALESCE(a.overdue, 0)     > c.credit_limit * 0.5 THEN 'High'::risk_level
      WHEN COALESCE(a.overdue, 0)     > 0                    THEN 'Medium'::risk_level
      ELSE                                                        'Low'::risk_level
    END,
    payment_score             = CASE
      WHEN COALESCE(a.lifetime_revenue, 0) = 0 THEN 75
      ELSE GREATEST(20, LEAST(100,
        100 - ROUND( (COALESCE(a.overdue, 0) / NULLIF(a.lifetime_revenue, 0)) * 100 )::INT
      ))
    END,
    updated_at = NOW()
  FROM agg a
  WHERE a.customer_id = c.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Phase 6: refreshed aggregates on % customers', v_updated;

  -- Mirror the aggregates onto customer_assignments so the Agent CRM view shows
  -- accurate per-customer totals + status without waiting on app code.
  WITH agg AS (
    SELECT
      o.customer_id,
      o.agent_id,
      COUNT(*) FILTER (WHERE o.status NOT IN ('Draft','Cancelled','Rejected'))                       AS n_orders,
      MAX(o.order_date) FILTER (WHERE o.status NOT IN ('Draft','Cancelled','Rejected'))              AS last_order_date,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.status NOT IN ('Draft','Cancelled','Rejected')), 0) AS lifetime_revenue,
      COALESCE(SUM(o.balance_due)  FILTER (WHERE o.payment_status = 'Overdue'), 0) AS overdue_amount
    FROM orders o
    WHERE o.customer_id IS NOT NULL AND o.agent_id IS NOT NULL
    GROUP BY o.customer_id, o.agent_id
  ),
  ranked AS (
    SELECT a.*,
           NTILE(10) OVER (ORDER BY a.lifetime_revenue DESC NULLS LAST) AS revenue_decile
    FROM agg a
  )
  UPDATE customer_assignments ca SET
    total_orders     = r.n_orders,
    lifetime_revenue = r.lifetime_revenue,
    last_order_date  = r.last_order_date,
    status           = CASE
      WHEN r.overdue_amount  > 0                                          THEN 'At Risk'::customer_assignment_status
      WHEN r.revenue_decile  = 1                                          THEN 'VIP'::customer_assignment_status
      WHEN r.last_order_date IS NULL
        OR r.last_order_date < CURRENT_DATE - INTERVAL '6 months'         THEN 'Inactive'::customer_assignment_status
      ELSE                                                                     'Active'::customer_assignment_status
    END,
    updated_at = NOW()
  FROM ranked r
  WHERE ca.customer_id = r.customer_id
    AND ca.employee_id = r.agent_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Phase 6: refreshed % customer_assignments rows', v_updated;
END;
$phase6$;


-- ============================================================================
-- PHASE 7: AGENT PERFORMANCE SNAPSHOTS (monthly, per agent)
-- One row per (agent_id, period 'YYYY-MM') across the 24-month horizon.
-- Computes revenue, order counts, active/new customers, retention, commission,
-- collection rate, outstanding receivables, and per-period rank columns.
-- Commission uses Finance display rates on order.amount_paid (Office 0.5% / Personal 1%),
-- bucketed by COALESCE(actual_delivery, order_date) — no payment proof rows required.
-- ============================================================================

DO $phase7$
DECLARE
  v_inserted INT;
BEGIN
  WITH activity AS (
    SELECT
      o.id                AS order_id,
      o.agent_id,
      o.agent_name,
      o.branch_id,
      to_char(o.order_date, 'YYYY-MM') AS period,
      o.customer_id,
      o.total_amount,
      o.amount_paid,
      o.balance_due,
      o.status,
      o.payment_status,
      c.client_type
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.agent_id IS NOT NULL
      AND o.status NOT IN ('Draft','Cancelled','Rejected')
  ),
  -- Commission per (agent, period) from paid order totals (no payment proof rows required).
  proof_commission AS (
    SELECT
      o.agent_id,
      to_char(COALESCE(o.actual_delivery, o.order_date), 'YYYY-MM') AS period,
      SUM(
        o.amount_paid
        * CASE WHEN c.client_type = 'Personal' THEN 0.01 ELSE 0.005 END
      ) AS commission
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.agent_id IS NOT NULL
      AND o.amount_paid > 0
      AND o.status NOT IN ('Draft','Cancelled','Rejected')
    GROUP BY o.agent_id, to_char(COALESCE(o.actual_delivery, o.order_date), 'YYYY-MM')
  ),
  base_agg AS (
    SELECT
      a.agent_id,
      MAX(a.agent_name) AS agent_name,
      (array_agg(a.branch_id ORDER BY a.order_id))[1] AS branch_id,
      a.period,
      COUNT(*)                                                              AS n_orders,
      COUNT(DISTINCT a.customer_id)                                         AS active_customers,
      SUM(a.total_amount)                                                   AS revenue,
      SUM(a.amount_paid)                                                    AS collected,
      SUM(CASE WHEN a.payment_status IN ('Paid','Partially Paid','Overdue','Invoiced','On Credit') THEN a.total_amount ELSE 0 END) AS billed,
      SUM(CASE WHEN a.payment_status IN ('Invoiced','Partially Paid','Overdue','On Credit') THEN a.balance_due ELSE 0 END)         AS outstanding,
      SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END)               AS completed_orders
    FROM activity a
    GROUP BY a.agent_id, a.period
  ),
  -- Customers whose first-ever order with this agent landed in this period
  first_seen AS (
    SELECT agent_id, customer_id, MIN(period) AS first_period
    FROM activity
    GROUP BY agent_id, customer_id
  ),
  new_per_period AS (
    SELECT agent_id, first_period AS period, COUNT(*) AS n_new
    FROM first_seen
    GROUP BY agent_id, first_period
  ),
  -- Retention: customers active in both the period and the previous month
  active_cust AS (
    SELECT DISTINCT agent_id, period, customer_id FROM activity
  ),
  retention_calc AS (
    SELECT
      cur.agent_id,
      cur.period,
      COUNT(DISTINCT cur.customer_id) AS active_this_period,
      COUNT(DISTINCT prev.customer_id) FILTER (WHERE prev.customer_id IS NOT NULL) AS retained_from_prev,
      COUNT(DISTINCT prev_active.customer_id) AS prev_active_total
    FROM active_cust cur
    LEFT JOIN active_cust prev
      ON prev.agent_id = cur.agent_id
     AND prev.customer_id = cur.customer_id
     AND prev.period = to_char(date_trunc('month', to_date(cur.period, 'YYYY-MM')) - INTERVAL '1 month', 'YYYY-MM')
    LEFT JOIN active_cust prev_active
      ON prev_active.agent_id = cur.agent_id
     AND prev_active.period   = to_char(date_trunc('month', to_date(cur.period, 'YYYY-MM')) - INTERVAL '1 month', 'YYYY-MM')
    GROUP BY cur.agent_id, cur.period
  ),
  combined AS (
    SELECT
      ba.agent_id,
      ba.agent_name,
      ba.branch_id,
      ba.period,
      ba.revenue,
      ba.n_orders,
      ROUND(ba.revenue / NULLIF(ba.n_orders, 0), 2)                                AS avg_order_value,
      ROUND(CASE WHEN ba.n_orders = 0 THEN 0
                 ELSE (ba.completed_orders::NUMERIC / ba.n_orders) * 100 END, 2)   AS sell_rate,
      ba.active_customers,
      COALESCE(np.n_new, 0)                                                        AS new_customers,
      ROUND(CASE WHEN rc.prev_active_total = 0 THEN 0
                 ELSE (rc.retained_from_prev::NUMERIC / rc.prev_active_total) * 100 END, 2)
                                                                                   AS retention_rate,
      ROUND(COALESCE(pc.commission, 0), 2)                                         AS commission_earned,
      30.0::NUMERIC(5,2)                                                           AS avg_profit_margin,  -- placeholder; refine when cost data is available
      ROUND(CASE WHEN ba.billed = 0 THEN 0
                 ELSE (ba.collected / ba.billed) * 100 END, 2)                     AS collection_rate,
      ROUND(ba.outstanding, 2)                                                     AS outstanding_receivables
    FROM base_agg ba
    LEFT JOIN new_per_period  np ON np.agent_id = ba.agent_id AND np.period = ba.period
    LEFT JOIN retention_calc  rc ON rc.agent_id = ba.agent_id AND rc.period = ba.period
    LEFT JOIN proof_commission pc ON pc.agent_id = ba.agent_id AND pc.period = ba.period
  ),
  with_ranks AS (
    SELECT
      c.*,
      DENSE_RANK() OVER (PARTITION BY c.period ORDER BY c.revenue        DESC NULLS LAST) AS rank_by_revenue,
      DENSE_RANK() OVER (PARTITION BY c.period ORDER BY c.n_orders       DESC NULLS LAST) AS rank_by_orders,
      DENSE_RANK() OVER (PARTITION BY c.period ORDER BY c.retention_rate DESC NULLS LAST) AS rank_by_retention
    FROM combined c
  )
  INSERT INTO agent_performance_snapshots (
    agent_id, agent_name, branch_id, period,
    total_revenue, number_of_orders, avg_order_value, sell_rate,
    active_customers, new_customers, retention_rate,
    commission_earned, avg_profit_margin, collection_rate, outstanding_receivables,
    rank_by_revenue, rank_by_orders, rank_by_retention
  )
  SELECT
    agent_id, agent_name, branch_id, period,
    revenue, n_orders, avg_order_value, sell_rate,
    active_customers, new_customers, retention_rate,
    commission_earned, avg_profit_margin, collection_rate, outstanding_receivables,
    rank_by_revenue, rank_by_orders, rank_by_retention
  FROM with_ranks;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE 'Phase 7: inserted % agent_performance_snapshots rows', v_inserted;
END;
$phase7$;


-- ============================================================================
-- PHASE 8: AGENT COMMISSIONS LEDGER (from order payments, no proof files required)
-- Populates `agent_commissions` from orders.amount_paid × client_type rate.
-- Finance → Commissions tab lists orders that have payment proofs on file;
-- users can add optional amount-only proofs later, or use Outstanding for balances.
--
-- Status & paid_date by period age:
--   • period > 90 days ago  → 'Paid'      + paid_date = period + 45 days
--   • period > 30 days ago  → 'Approved'
--   • otherwise             → 'Pending'
-- ============================================================================

DO $phase8$
DECLARE
  v_count INT;
BEGIN
  WITH order_payments AS (
    SELECT
      o.agent_id,
      o.id              AS order_id,
      o.order_number,
      o.customer_name,
      o.amount_paid     AS payment_amount,
      COALESCE(o.actual_delivery, o.order_date) AS paid_on,
      to_char(COALESCE(o.actual_delivery, o.order_date), 'YYYY-MM') AS period,
      CASE WHEN c.client_type = 'Personal' THEN 0.01 ELSE 0.005 END::NUMERIC AS client_rate
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.agent_id IS NOT NULL
      AND o.amount_paid > 0
      AND o.status NOT IN ('Draft','Cancelled','Rejected')
  ),
  with_commission AS (
    SELECT *, ROUND(payment_amount * client_rate, 2) AS commission
    FROM order_payments
  ),
  per_period AS (
    SELECT
      agent_id,
      period,
      MAX(client_rate * 100)                   AS rate,
      SUM(payment_amount)                      AS sales_amount,
      SUM(commission)                          AS commission_earned,
      jsonb_agg(
        jsonb_build_object(
          'orderNumber',   order_number,
          'customerName',  customer_name,
          'paymentAmount', payment_amount,
          'commission',    commission,
          'paidAt',        to_char(paid_on::TIMESTAMPTZ, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
        ORDER BY paid_on
      )                                        AS breakdown
    FROM with_commission
    GROUP BY agent_id, period
  )
  INSERT INTO agent_commissions (
    employee_id, period, sales_amount, commission_rate, commission_earned,
    status, paid_date, breakdown
  )
  SELECT
    agent_id, period, sales_amount, rate, commission_earned,
    CASE
      WHEN to_date(period || '-01', 'YYYY-MM-DD') < (CURRENT_DATE - INTERVAL '90 days') THEN 'Paid'::commission_status
      WHEN to_date(period || '-01', 'YYYY-MM-DD') < (CURRENT_DATE - INTERVAL '30 days') THEN 'Approved'::commission_status
      ELSE                                                                                   'Pending'::commission_status
    END,
    CASE
      WHEN to_date(period || '-01', 'YYYY-MM-DD') < (CURRENT_DATE - INTERVAL '90 days')
        THEN (to_date(period || '-01', 'YYYY-MM-DD') + INTERVAL '45 days')::DATE
      ELSE NULL
    END,
    breakdown
  FROM per_period;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Phase 8: inserted % agent_commissions rows (from order payments)', v_count;
END;
$phase8$;


-- ============================================================================
-- VERIFY
-- ============================================================================

SELECT
  (SELECT COUNT(*) FROM customers)                                                  AS customers_total,
  (SELECT COUNT(*) FROM customers WHERE assigned_agent_id IS NOT NULL)              AS customers_with_agent,
  (SELECT COUNT(*) FROM customer_assignments)                                       AS customer_assignments_total,
  (SELECT COUNT(*) FROM orders)                                                     AS orders_total,
  (SELECT COUNT(*) FROM order_line_items)                                           AS line_items_total,
  (SELECT COUNT(*) FROM material_consumption)                                       AS consumption_rows,
  (SELECT COUNT(*) FROM trips)                                                      AS trips_total,
  (SELECT COUNT(*) FROM trip_history)                                               AS trip_history_total,
  (SELECT COUNT(*) FROM delivery_tracking)                                          AS delivery_tracking_rows,
  (SELECT COUNT(*) FROM invoices)                                                   AS invoices_total,
  (SELECT COUNT(*) FROM receivables)                                                AS receivables_total,
  (SELECT COUNT(*) FROM order_proof_documents)                                      AS proofs_total,
  (SELECT COUNT(*) FROM agent_performance_snapshots)                                AS perf_snapshots_total,
  (SELECT COUNT(*) FROM agent_commissions)                                          AS agent_commissions_total,
  (SELECT COUNT(*) FROM order_proof_documents
     WHERE type = 'payment' AND commission_paid_at IS NOT NULL)                     AS proofs_commission_paid;

-- Per-branch order distribution
SELECT b.code, b.name, COUNT(o.id) AS orders, COUNT(DISTINCT o.customer_id) AS distinct_customers
FROM branches b
LEFT JOIN orders o ON o.branch_id = b.id
WHERE b.code IN ('MNL','CEB','BTG','QZN')
GROUP BY b.code, b.name
ORDER BY b.code;

-- Per-status order distribution
SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY n DESC;

-- Per-payment-status order distribution
SELECT payment_status, COUNT(*) AS n FROM orders GROUP BY payment_status ORDER BY n DESC;

-- Per-agent customer counts (sanity check 10..15)
SELECT e.employee_name, b.code AS branch, COUNT(c.id) AS customer_count
FROM employees e
LEFT JOIN customers c ON c.assigned_agent_id = e.id
JOIN branches b ON b.id = e.branch_id
WHERE e.role = 'Sales Agent' AND e.status = 'active'
  AND b.code IN ('MNL','CEB','BTG','QZN')
GROUP BY e.employee_name, b.code
ORDER BY b.code, e.employee_name;

-- Per-agent total revenue across the 24-month horizon (top earners first)
SELECT e.employee_name, b.code AS branch,
       ROUND(SUM(s.total_revenue), 2) AS revenue_24mo,
       SUM(s.number_of_orders)        AS orders_24mo,
       ROUND(AVG(s.collection_rate), 1) AS avg_collection_pct,
       ROUND(SUM(s.commission_earned), 2) AS commission_24mo
FROM agent_performance_snapshots s
JOIN employees e ON e.id = s.agent_id
JOIN branches  b ON b.id = e.branch_id
GROUP BY e.employee_name, b.code
ORDER BY revenue_24mo DESC NULLS LAST
LIMIT 30;

-- Commission ledger sanity check: status mix and totals
SELECT status, COUNT(*) AS rows, ROUND(SUM(commission_earned), 2) AS total_commission
FROM agent_commissions
GROUP BY status
ORDER BY status;

-- Cross-check: Phase 7 snapshot commission should equal Phase 8 ledger commission
-- per (agent, period). The diff column should be ≈ 0 for every row.
SELECT
  e.employee_name,
  s.period,
  ROUND(s.commission_earned, 2)             AS snapshot_commission,
  ROUND(c.commission_earned, 2)             AS ledger_commission,
  ROUND(s.commission_earned - c.commission_earned, 2) AS diff
FROM agent_performance_snapshots s
JOIN agent_commissions c ON c.employee_id = s.agent_id AND c.period = s.period
JOIN employees e ON e.id = s.agent_id
WHERE ABS(s.commission_earned - c.commission_earned) > 0.01
ORDER BY diff DESC NULLS LAST
LIMIT 20;
