-- ============================================================================
-- orders_history_analytics_seed.sql
-- Large set of customer orders + line items for History & Analytics.
--
-- Prerequisites:
--   * database/schema.sql applied
--   * Branches: Manila, Cebu, Batangas (from apply.sql)
--   * Product variants: run apply.sql (PRODUCT SEED) so product_variants exist
--
-- Idempotent: safe to re-run. Skips if >= 200 rows exist with order_number
-- prefix `SO-HIST-`. To re-seed, delete first:
--   DELETE FROM order_line_items WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'SO-HIST-%');
--   DELETE FROM orders WHERE order_number LIKE 'SO-HIST-%';
--   -- optional: DELETE FROM customers WHERE email LIKE 'hist.analytics.%@seed.lamtex';
-- ============================================================================

BEGIN;

INSERT INTO customers (
  name, type, status, contact_person, phone, email, city, province, branch_id,
  payment_terms, order_count, total_purchases_ytd, total_purchases_lifetime, account_since
)
SELECT
  v.name,
  v.ctype::customer_type,
  'Active'::customer_status,
  v.cperson,
  v.phone,
  v.email,
  v.city,
  v.prov,
  b.id,
  v.pterms,
  0, 0, 0, (CURRENT_DATE - (200 + (random() * 600)::int))
FROM (VALUES
  ('MetroBuild Supply Co',    'Distributor',          'J. Santos',  '09171001001', 'hist.analytics.001@seed.lamtex', 'Makati',         'NCR',      'Manila',   '30 Days'),
  ('Cebu Pipes & Tools',     'Hardware Store',         'L. Go',     '09321001002', 'hist.analytics.002@seed.lamtex', 'Cebu City',     'Cebu',     'Cebu',     '15 Days'),
  ('Batangas Industrials',   'Construction Company',  'R. Cruz',  '04371001003', 'hist.analytics.003@seed.lamtex', 'Batangas City', 'Batangas', 'Batangas',  '30 Days'),
  ('Visayas Contractors Inc','Construction Company',  'A. Neri',  '09331001004', 'hist.analytics.004@seed.lamtex', 'Iloilo City',   'Iloilo',   'Cebu',     '45 Days'),
  ('Davao Hardware Hub',     'Hardware Store',        'B. Lim',   '09381001005', 'hist.analytics.005@seed.lamtex', 'Davao City',    'Davao',   'Cebu',     'COD'),
  ('Laguna MEP Solutions',   'Contractor',            'K. Reyes',  '09391001006', 'hist.analytics.006@seed.lamtex', 'Calamba',      'Laguna',   'Manila',   '30 Days'),
  ('Pampanga Trade Center',  'Distributor',            'M. Bautista','09451001007', 'hist.analytics.007@seed.lamtex', 'Angeles',        'Pampanga','Manila',   '30 Days'),
  ('Bicol Plumbing Depot',  'Hardware Store',         'E. Nolasco','09391001008', 'hist.analytics.008@seed.lamtex', 'Naga',          'Camarines','Manila',  '15 Days'),
  ('Palawan Seaside Const',  'Contractor',            'D. Tiu',   '09051001009', 'hist.analytics.009@seed.lamtex', 'Puerto Princesa','Palawan',  'Cebu',    '30 Days'),
  ('GenSan Industrial',     'Distributor',            'C. Mira',  '09391001010', 'hist.analytics.010@seed.lamtex', 'General Santos', 'South Cot.','Cebu',   '45 Days')
) AS v(name, ctype, cperson, phone, email, city, prov, branch_name, pterms)
JOIN branches b ON b.name = v.branch_name
WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.email = v.email);

INSERT INTO customers (name, type, status, contact_person, email, city, branch_id, payment_terms, order_count, account_since)
SELECT
  'Analytics Demo ' || n,
  (ARRAY['Distributor','Hardware Store','Construction Company','Contractor']::customer_type[])[1 + ((n - 1) % 4)],
  'Active',
  'Contact ' || n,
  'hist.analytics.bulk.' || n || '@seed.lamtex',
  (ARRAY['Quezon City','Cebu','Davao','Batangas','Zamboanga']::text[])[1 + ((n - 1) % 5)],
  b.id,
  (ARRAY['15 Days','30 Days','45 Days','COD']::text[])[1 + ((n - 1) % 4)],
  0,
  CURRENT_DATE - (50 + n)
FROM generate_series(1, 45) n
JOIN LATERAL (
  SELECT br.id
  FROM branches br
  WHERE br.name = (ARRAY['Manila', 'Cebu', 'Batangas']::text[])[1 + ((n - 1) % 3)]
  LIMIT 1
) b ON true
WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.email = 'hist.analytics.bulk.' || n || '@seed.lamtex');

COMMIT;

DO $seed$
DECLARE
  v_have       int;
  v_target     constant int := 1800;
  v_ord_id     uuid;
  v_cust       uuid;
  v_cust_name  varchar(300);
  v_branch     uuid;
  v_agent      uuid;
  v_vid        uuid;
  v_sku        varchar(100);
  v_pname      varchar(300);
  v_pprice     numeric(12,2);
  v_size       text;
  v_lines      int;
  v_l          int;
  v_qty        int;
  v_sub        numeric(14,2);
  v_tax        numeric(14,2);
  v_total      numeric(14,2);
  v_paid       numeric(14,2);
  v_balance    numeric(14,2);
  v_r          double precision;
  v_status     order_status;
  v_pay        payment_status;
  v_del        delivery_status_enum;
  v_dt         date;
  v_onum       text;
  v_pmethod    payment_method_enum;
  v_deltype    delivery_type;
  v_urg        urgency_level;
  v_i          int;
BEGIN
  SELECT count(*)::int INTO v_have FROM orders WHERE order_number LIKE 'SO-HIST-%';
  IF v_have >= 200 THEN
    RAISE NOTICE 'orders_history seed: found % existing SO-HIST-* orders, skip.', v_have;
    RETURN;
  END IF;

  IF (SELECT count(*)::int FROM product_variants WHERE status = 'Active') = 0 THEN
    RAISE EXCEPTION 'No Active product_variants. Run apply.sql (product seed) first.';
  END IF;

  IF (SELECT count(*)::int FROM customers WHERE email LIKE 'hist.analytics.%@seed.lamtex') = 0 THEN
    RAISE EXCEPTION 'No hist.analytics.* customers. Re-run the INSERT section (BEGIN/COMMIT block) first.';
  END IF;

  SELECT id INTO v_agent FROM employees WHERE status = 'active' LIMIT 1;

  FOR v_i IN 1..v_target LOOP
    v_onum := 'SO-HIST-' || lpad(v_i::text, 7, '0');
    v_r := random();

    IF v_r < 0.34 THEN
      v_status := 'Delivered';
    ELSIF v_r < 0.68 THEN
      v_status := 'Completed';
    ELSIF v_r < 0.76 THEN
      v_status := 'In Transit';
    ELSIF v_r < 0.83 THEN
      v_status := 'Ready';
    ELSIF v_r < 0.90 THEN
      v_status := 'Scheduled';
    ELSIF v_r < 0.94 THEN
      v_status := 'Packed';
    ELSIF v_r < 0.97 THEN
      v_status := 'Picking';
    ELSIF v_r < 0.99 THEN
      v_status := 'Pending';
    ELSE
      v_status := 'Cancelled';
    END IF;

    IF v_status IN ('Delivered', 'Completed') THEN
      v_r := random();
      IF v_r < 0.75 THEN
        v_pay := 'Paid';
      ELSIF v_r < 0.90 THEN
        v_pay := 'Partially Paid';
      ELSE
        v_pay := 'Overdue';
      END IF;
    ELSIF v_status = 'Cancelled' THEN
      v_pay := 'Unbilled';
    ELSE
      v_pay := 'Invoiced';
    END IF;

    v_r := random();
    IF v_r < 0.82 THEN
      v_del := 'On Time';
    ELSIF v_r < 0.95 THEN
      v_del := 'Delayed';
    ELSE
      v_del := 'Failed';
    END IF;

    v_dt := date '2024-01-15' + (floor(random() * 730))::int;

    v_r := random();
    v_deltype := (ARRAY['Truck', 'Truck', 'Pickup', 'Ship']::delivery_type[])[1 + (floor(v_r * 4)::int % 4)];
    IF random() < 0.2 THEN
      v_pmethod := 'Online';
    ELSE
      v_pmethod := 'Offline';
    END IF;

    SELECT c.id, c.name, coalesce(c.branch_id, (SELECT id FROM branches WHERE name = 'Manila' LIMIT 1))
    INTO v_cust, v_cust_name, v_branch
    FROM customers c
    WHERE c.email LIKE 'hist.analytics.%@seed.lamtex'
    ORDER BY random()
    LIMIT 1;

    v_urg := (ARRAY['Low', 'Medium', 'High']::urgency_level[])[1 + (floor(random() * 3))::int];

    v_sub := 0;
    v_lines := 1 + (floor(random() * 4))::int;

    INSERT INTO orders (
      order_number,
      customer_id,
      customer_name,
      agent_id,
      branch_id,
      order_date,
      required_date,
      delivery_type,
      delivery_address,
      payment_terms,
      payment_method,
      status,
      payment_status,
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
      estimated_delivery,
      actual_delivery,
      delivery_status,
      urgency
    ) VALUES (
      v_onum,
      v_cust,
      v_cust_name,
      v_agent,
      v_branch,
      v_dt,
      v_dt + (3 + (floor(random() * 12))::int),
      v_deltype,
      'Project site / warehouse (seed)',
      (ARRAY['COD', '15 Days', '30 Days', '45 Days']::payment_terms[])[1 + (floor(random() * 4))::int % 4],
      v_pmethod,
      v_status,
      v_pay,
      0, 0, 0, 0,
      v_dt + 5,
      CASE WHEN v_status IN ('Delivered', 'Completed') THEN v_dt + (1 + (floor(random() * 8))::int) ELSE NULL END,
      v_del,
      v_urg
    ) RETURNING id INTO v_ord_id;

    FOR v_l IN 1..v_lines LOOP
      SELECT
        pv.id,
        pv.sku,
        p.name,
        pv.unit_price,
        coalesce(nullif(trim(pv.size), ''), pv.sku)
      INTO v_vid, v_sku, v_pname, v_pprice, v_size
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.status = 'Active'
      ORDER BY random()
      LIMIT 1;

      v_qty := 1 + (floor(random() * 60))::int;
      v_sub := v_sub + round((v_qty * v_pprice)::numeric, 2);

      INSERT INTO order_line_items (
        order_id,
        variant_id,
        sku,
        product_name,
        variant_description,
        quantity,
        unit_price,
        line_total
      ) VALUES (
        v_ord_id,
        v_vid,
        v_sku,
        v_pname,
        v_size,
        v_qty,
        v_pprice,
        round((v_qty * v_pprice)::numeric, 2)
      );
    END LOOP;

    v_tax   := round(v_sub * 0.12, 2);
    v_total := v_sub + v_tax;

    IF v_pay = 'Paid' THEN
      v_paid := v_total;
      v_balance := 0;
    ELSIF v_pay = 'Partially Paid' THEN
      v_paid := round(v_total * 0.5, 2);
      v_balance := v_total - v_paid;
    ELSIF v_pay = 'Overdue' THEN
      v_paid := round(v_total * 0.2, 2);
      v_balance := v_total - v_paid;
    ELSE
      v_paid := 0;
      v_balance := v_total;
    END IF;

    UPDATE orders
    SET
      subtotal     = v_sub,
      tax_amount   = v_tax,
      total_amount = v_total,
      amount_paid  = v_paid,
      balance_due  = v_balance
    WHERE id = v_ord_id;
  END LOOP;

  RAISE NOTICE 'orders_history: inserted % SO-HIST-* orders.', (SELECT count(*)::int FROM orders WHERE order_number LIKE 'SO-HIST-%');
END;
$seed$;

UPDATE customers c
SET
  order_count = s.n,
  last_order_date = s.d,
  total_purchases_lifetime = coalesce(s.rev, 0)
FROM (
  SELECT o.customer_id, count(*)::int AS n, max(o.order_date) AS d, sum(o.total_amount) AS rev
  FROM orders o
  WHERE o.customer_id IN (SELECT id FROM customers WHERE email LIKE 'hist.analytics.%@seed.lamtex')
  GROUP BY o.customer_id
) s
WHERE c.id = s.customer_id;
