-- =============================================================================
-- Suppliers: NCR/Metro Manila address + map pins; link each to all 4 branches
--
-- Run after:
--   • database/alter_suppliers_address_map.sql
--   • branches MNL, CEB, BTG, QZN (Manila, Cebu, Batangas, Quezon)
--
-- Creates the 11 Lamtex demo suppliers if missing, sets mailing address + lat/lng
-- in the Metro Manila area, and ensures supplier_branches includes Manila, Cebu,
-- Batangas, and Quezon (Manila marked primary).
-- Re-runnable.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'map_lat'
  ) THEN
    RAISE EXCEPTION 'seed_suppliers_all_branches: run database/alter_suppliers_address_map.sql first';
  END IF;

  IF (SELECT COUNT(*) FROM branches WHERE code IN ('MNL', 'CEB', 'BTG', 'QZN')) < 4 THEN
    RAISE EXCEPTION 'seed_suppliers_all_branches: need branches MNL, CEB, BTG, QZN';
  END IF;

  -- Raw Materials
  INSERT INTO suppliers (name, type, category, contact_person, phone, email, payment_terms, currency, status,
    performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
    total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  SELECT * FROM (VALUES
    ('Lucena Polymer Supply Co.', 'Raw Materials', 'Resin & PE/PP', 'Ramon Ignacio', '+63 917 555 0101', 'sales@lucenapolymer.example.ph', '14 Days', 'PHP', 'Active',
      82::numeric, 4.2::numeric, 4.1::numeric, 12, 91::numeric, 1.2::numeric, 0::numeric, 0::numeric, 0, 0::numeric, true, 'Low', 'Lamtex seed (NCR depot address)', (CURRENT_DATE - 180)),
    ('Sierra Madre Industrial Minerals', 'Raw Materials', 'Fillers & calcium carbonate', 'Marites Guevarra', '+63 918 555 0102', 'orders@sierraminerals.example.ph', '21 Days', 'PHP', 'Active',
      78::numeric, 4.0::numeric, 3.9::numeric, 18, 88::numeric, 1.8::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Lamtex seed', (CURRENT_DATE - 240)),
    ('South Luzon Rubber & Latex Inc.', 'Raw Materials', 'Natural rubber', 'Paolo Salcedo', '+63 919 555 0103', 'procurement@southluzonrubber.example.ph', '30 Days', 'PHP', 'Active',
      80::numeric, 4.3::numeric, 4.0::numeric, 21, 86::numeric, 1.0::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Medium', 'Lamtex seed', (CURRENT_DATE - 120))
  ) AS v(name, type, category, contact_person, phone, email, payment_terms, currency, status,
        performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
        total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

  INSERT INTO suppliers (name, type, category, contact_person, phone, email, payment_terms, currency, status,
    performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
    total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  SELECT * FROM (VALUES
    ('Bondoc Peninsula Packaging Corp.', 'Packaging', 'Bags & woven sacks', 'Liza Fernandez', '+63 920 555 0201', 'hello@bondocpack.example.ph', '10 Days', 'PHP', 'Active',
      84::numeric, 4.4::numeric, 4.3::numeric, 10, 93::numeric, 0.8::numeric, 0::numeric, 0::numeric, 0, 0::numeric, true, 'Low', 'Lamtex seed', (CURRENT_DATE - 300)),
    ('Tayabas Flexo Print & Film', 'Packaging', 'PE film & labels', 'Jonas Beltran', '+63 921 555 0202', 'sales@tayabasflexo.example.ph', '12 Days', 'PHP', 'Active',
      79::numeric, 4.1::numeric, 4.0::numeric, 14, 89::numeric, 1.1::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Lamtex seed', (CURRENT_DATE - 90)),
    ('Pacific Rim Container Quezon', 'Packaging', 'Drums & IBC totes', 'Karen Ocampo', '+63 922 555 0203', 'orders@pacificrimqzn.example.ph', '18 Days', 'PHP', 'Active',
      76::numeric, 3.9::numeric, 3.8::numeric, 16, 85::numeric, 2.0::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Lamtex seed', (CURRENT_DATE - 60))
  ) AS v(name, type, category, contact_person, phone, email, payment_terms, currency, status,
        performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
        total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

  INSERT INTO suppliers (name, type, category, contact_person, phone, email, payment_terms, currency, status,
    performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
    total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  SELECT * FROM (VALUES
    ('Calabarzon Specialty Chemicals – Quezon Hub', 'Chemicals', 'Adhesives & solvents', 'Dr. Elaine Chu', '+63 923 555 0301', 'hub@calaspecqzn.example.ph', '7 Days', 'PHP', 'Active',
      88::numeric, 4.6::numeric, 4.4::numeric, 9, 94::numeric, 0.6::numeric, 0::numeric, 0::numeric, 0, 0::numeric, true, 'Low', 'Lamtex seed', (CURRENT_DATE - 400)),
    ('Polillo Industrial Solvents Ltd.', 'Chemicals', 'Industrial solvents', 'Fred Villarin', '+63 924 555 0302', 'fv@polillosolv.example.ph', '14 Days', 'PHP', 'Active',
      74::numeric, 3.8::numeric, 3.7::numeric, 20, 84::numeric, 2.2::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Medium', 'Lamtex seed', (CURRENT_DATE - 200))
  ) AS v(name, type, category, contact_person, phone, email, payment_terms, currency, status,
        performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
        total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

  INSERT INTO suppliers (name, type, category, contact_person, phone, email, payment_terms, currency, status,
    performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
    total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  SELECT * FROM (VALUES
    ('LAMI Equipment Services Quezon', 'Equipment', 'Extruder & aux parts', 'Engr. Carlo Magbanua', '+63 925 555 0401', 'service@lamiquezon.example.ph', '45 Days', 'PHP', 'Active',
      81::numeric, 4.2::numeric, 4.1::numeric, 35, 87::numeric, 1.4::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Lamtex seed', (CURRENT_DATE - 500))
  ) AS v(name, type, category, contact_person, phone, email, payment_terms, currency, status,
        performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
        total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

  INSERT INTO suppliers (name, type, category, contact_person, phone, email, payment_terms, currency, status,
    performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
    total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  SELECT * FROM (VALUES
    ('Quezon LabWorks Analytics', 'Services', 'Testing & QA subcontract', 'Iris Magdaleno', '+63 926 555 0501', 'lab@quezonlabworks.example.ph', '5 Days', 'PHP', 'Active',
      90::numeric, 4.7::numeric, 4.5::numeric, 5, 96::numeric, 0.4::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Lamtex seed', (CURRENT_DATE - 150)),
    ('South LP Third-Party Logistics', 'Services', 'Inbound freight & cross-dock', 'Harold Pascual', '+63 927 555 0502', 'ops@southlp3pl.example.ph', '3 Days', 'PHP', 'Active',
      83::numeric, 4.1::numeric, 4.4::numeric, 4, 92::numeric, 0.9::numeric, 0::numeric, 0::numeric, 0, 0::numeric, false, 'Low', 'Lamtex seed', (CURRENT_DATE - 100))
  ) AS v(name, type, category, contact_person, phone, email, payment_terms, currency, status,
        performance_score, quality_rating, delivery_rating, avg_lead_time, on_time_delivery_rate, defect_rate,
        total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value, preferred_supplier, risk_level, notes, account_since)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

  UPDATE suppliers s SET
    address     = v.address,
    city        = v.city,
    province    = v.province,
    postal_code = v.postal_code,
    map_lat     = v.map_lat,
    map_lng     = v.map_lng
  FROM (VALUES
    ('Lucena Polymer Supply Co.', '22 Ayala Avenue', 'Makati', 'Metro Manila', '1226', 14.554729::numeric, 121.024445::numeric),
    ('Sierra Madre Industrial Minerals', '9th Avenue cor 32nd Street', 'Taguig', 'Metro Manila', '1634', 14.552642::numeric, 121.048520::numeric),
    ('South Luzon Rubber & Latex Inc.', 'F. Ortigas Jr. Road', 'Pasig', 'Metro Manila', '1605', 14.583211::numeric, 121.061899::numeric),
    ('Bondoc Peninsula Packaging Corp.', 'Timog Avenue', 'Quezon City', 'Metro Manila', '1103', 14.632301::numeric, 121.030838::numeric),
    ('Tayabas Flexo Print & Film', 'Escolta Street', 'Manila', 'Metro Manila', '1006', 14.596589::numeric, 120.981019::numeric),
    ('Pacific Rim Container Quezon', 'Ortigas Center', 'Pasig', 'Metro Manila', '1600', 14.586775::numeric, 121.071945::numeric),
    ('Calabarzon Specialty Chemicals – Quezon Hub', 'EDSA corner Shaw Boulevard', 'Mandaluyong', 'Metro Manila', '1552', 14.581285::numeric, 121.051996::numeric),
    ('Polillo Industrial Solvents Ltd.', 'Annapolis Street', 'San Juan', 'Metro Manila', '1500', 14.601913::numeric, 121.035453::numeric),
    ('LAMI Equipment Services Quezon', 'Sumulong Highway', 'Marikina', 'Metro Manila', '1800', 14.650731::numeric, 121.102543::numeric),
    ('Quezon LabWorks Analytics', '32nd Street', 'Taguig', 'Metro Manila', '1634', 14.548149::numeric, 121.052083::numeric),
    ('South LP Third-Party Logistics', 'NAIA Road', 'Parañaque', 'Metro Manila', '1700', 14.508958::numeric, 121.012761::numeric)
  ) AS v(name, address, city, province, postal_code, map_lat, map_lng)
  WHERE s.name = v.name;

  INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
  SELECT s.id, b.id, (b.code = 'MNL')
  FROM suppliers s
  CROSS JOIN branches b
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
  AND b.code IN ('MNL', 'CEB', 'BTG', 'QZN')
  ON CONFLICT (supplier_id, branch_id) DO UPDATE SET is_primary = EXCLUDED.is_primary;

END $$;
