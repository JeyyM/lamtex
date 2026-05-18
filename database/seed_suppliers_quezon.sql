-- =============================================================================
-- Seed: Suppliers for Quezon branch (code QZN, name Quezon)
--
-- Inserts diverse Active suppliers if missing, then links each to Quezon via
-- supplier_branches so the Suppliers page shows them when Quezon is selected
-- (see branch filter in src/pages/SuppliersPage.tsx).
--
-- Re-runnable: skips existing supplier names; ON CONFLICT for branch links.
-- Requires: branches row QZN (run database/seed_quezon_branch_employees.sql first).
-- =============================================================================

DO $$
DECLARE
  b_id uuid;
BEGIN
  SELECT id INTO b_id FROM branches WHERE code = 'QZN' LIMIT 1;
  IF b_id IS NULL THEN
    RAISE EXCEPTION 'seed_suppliers_quezon: branch QZN not found — create Quezon branch first';
  END IF;

  -- Raw Materials
  INSERT INTO suppliers (name, type, category, contact_person, phone, email, payment_terms, currency, status,
    performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
    total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  SELECT * FROM (VALUES
    ('Lucena Polymer Supply Co.', 'Raw Materials', 'Resin & PE/PP', 'Ramon Ignacio', '+63 917 555 0101', 'sales@lucenapolymer.example.ph', '14 Days', 'PHP', 'Active',
      82::numeric, 4.2::numeric, 4.1::numeric, 12, 91::numeric, 1.2::numeric, 0::numeric, 0::numeric, 0, 0::numeric, true, 'Low', 'Quezon seed: primary resin local distributor', (CURRENT_DATE - 180)),
    ('Sierra Madre Industrial Minerals', 'Raw Materials', 'Fillers & calcium carbonate', 'Marites Guevarra', '+63 918 555 0102', 'orders@sierraminerals.example.ph', '21 Days', 'PHP', 'Active',
      78::numeric, 4.0::numeric, 3.9::numeric, 18, 88::numeric, 1.8::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Quezon seed', (CURRENT_DATE - 240)),
    ('South Luzon Rubber & Latex Inc.', 'Raw Materials', 'Natural rubber', 'Paolo Salcedo', '+63 919 555 0103', 'procurement@southluzonrubber.example.ph', '30 Days', 'PHP', 'Active',
      80::numeric, 4.3::numeric, 4.0::numeric, 21, 86::numeric, 1.0::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Medium', 'Quezon seed', (CURRENT_DATE - 120))
  ) AS v(name, type, category, contact_person, phone, email, payment_terms, currency, status,
        performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
        total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

  -- Packaging
  INSERT INTO suppliers (name, type, category, contact_person, phone, email, payment_terms, currency, status,
    performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
    total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  SELECT * FROM (VALUES
    ('Bondoc Peninsula Packaging Corp.', 'Packaging', 'Bags & woven sacks', 'Liza Fernandez', '+63 920 555 0201', 'hello@bondocpack.example.ph', '10 Days', 'PHP', 'Active',
      84::numeric, 4.4::numeric, 4.3::numeric, 10, 93::numeric, 0.8::numeric, 0::numeric, 0::numeric, 0, 0::numeric, true, 'Low', 'Quezon seed', (CURRENT_DATE - 300)),
    ('Tayabas Flexo Print & Film', 'Packaging', 'PE film & labels', 'Jonas Beltran', '+63 921 555 0202', 'sales@tayabasflexo.example.ph', '12 Days', 'PHP', 'Active',
      79::numeric, 4.1::numeric, 4.0::numeric, 14, 89::numeric, 1.1::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Quezon seed', (CURRENT_DATE - 90)),
    ('Pacific Rim Container Quezon', 'Packaging', 'Drums & IBC totes', 'Karen Ocampo', '+63 922 555 0203', 'orders@pacificrimqzn.example.ph', '18 Days', 'PHP', 'Active',
      76::numeric, 3.9::numeric, 3.8::numeric, 16, 85::numeric, 2.0::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Quezon seed', (CURRENT_DATE - 60))
  ) AS v(name, type, category, contact_person, phone, email, payment_terms, currency, status,
        performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
        total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

  -- Chemicals
  INSERT INTO suppliers (name, type, category, contact_person, phone, email, payment_terms, currency, status,
    performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
    total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  SELECT * FROM (VALUES
    ('Calabarzon Specialty Chemicals – Quezon Hub', 'Chemicals', 'Adhesives & solvents', 'Dr. Elaine Chu', '+63 923 555 0301', 'hub@calaspecqzn.example.ph', '7 Days', 'PHP', 'Active',
      88::numeric, 4.6::numeric, 4.4::numeric, 9, 94::numeric, 0.6::numeric, 0::numeric, 0::numeric, 0, 0::numeric, true, 'Low', 'Quezon seed', (CURRENT_DATE - 400)),
    ('Polillo Industrial Solvents Ltd.', 'Chemicals', 'Industrial solvents', 'Fred Villarin', '+63 924 555 0302', 'fv@polillosolv.example.ph', '14 Days', 'PHP', 'Active',
      74::numeric, 3.8::numeric, 3.7::numeric, 20, 84::numeric, 2.2::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Medium', 'Quezon seed', (CURRENT_DATE - 200))
  ) AS v(name, type, category, contact_person, phone, email, payment_terms, currency, status,
        performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
        total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

  -- Equipment
  INSERT INTO suppliers (name, type, category, contact_person, phone, email, payment_terms, currency, status,
    performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
    total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  SELECT * FROM (VALUES
    ('LAMI Equipment Services Quezon', 'Equipment', 'Extruder & aux parts', 'Engr. Carlo Magbanua', '+63 925 555 0401', 'service@lamiquezon.example.ph', '45 Days', 'PHP', 'Active',
      81::numeric, 4.2::numeric, 4.1::numeric, 35, 87::numeric, 1.4::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Quezon seed', (CURRENT_DATE - 500))
  ) AS v(name, type, category, contact_person, phone, email, payment_terms, currency, status,
        performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
        total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

  -- Services
  INSERT INTO suppliers (name, type, category, contact_person, phone, email, payment_terms, currency, status,
    performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
    total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  SELECT * FROM (VALUES
    ('Quezon LabWorks Analytics', 'Services', 'Testing & QA subcontract', 'Iris Magdaleno', '+63 926 555 0501', 'lab@quezonlabworks.example.ph', '5 Days', 'PHP', 'Active',
      90::numeric, 4.7::numeric, 4.5::numeric, 5, 96::numeric, 0.4::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Quezon seed', (CURRENT_DATE - 150)),
    ('South LP Third-Party Logistics', 'Services', 'Inbound freight & cross-dock', 'Harold Pascual', '+63 927 555 0502', 'ops@southlp3pl.example.ph', '3 Days', 'PHP', 'Active',
      83::numeric, 4.1::numeric, 4.4::numeric, 4, 92::numeric, 0.9::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Quezon seed', (CURRENT_DATE - 100))
  ) AS v(name, type, category, contact_person, phone, email, payment_terms, currency, status,
        performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
        total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

  INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
  SELECT s.id, b_id, true
  FROM suppliers s
  WHERE s.name IN (
    'Lucena Polymer Supply Co.',
    'Sierra Madre Industrial Minerals',
    'South Luzon Rubber & Latex Inc.',
    'Bondoc Peninsula Packaging Corp.',
    'Tayabas Flexo Print & Film',
    'Pacific Rim Container Quezon',
    'Calabarzon Specialty Chemicals – Quezon Hub',
    'Polillo Industrial Solvents Ltd.',
    'LAMI Equipment Services Quezon',
    'Quezon LabWorks Analytics',
    'South LP Third-Party Logistics'
  )
  ON CONFLICT (supplier_id, branch_id) DO NOTHING;

END $$;
