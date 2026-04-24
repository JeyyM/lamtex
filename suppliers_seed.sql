-- ============================================================
-- LAMTEX — SUPPLIERS SCHEMA & SEED DATA
-- Run this entire script in the Supabase SQL Editor.
-- NOTE: Drops and recreates supplier tables cleanly.
-- Location fields omitted — will be added via Google Maps later.
-- ============================================================

-- ── 1. DROP & RECREATE TABLES ─────────────────────────────

DROP TABLE IF EXISTS supplier_materials CASCADE;
DROP TABLE IF EXISTS supplier_branches  CASCADE;
DROP TABLE IF EXISTS suppliers          CASCADE;

CREATE TABLE suppliers (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT        NOT NULL,
  type                     TEXT        NOT NULL
                             CHECK (type IN ('Raw Materials','Packaging','Chemicals','Equipment','Services')),
  category                 TEXT,
  contact_person           TEXT,
  phone                    TEXT,
  email                    TEXT,
  payment_terms            TEXT        NOT NULL DEFAULT '30 Days',
  currency                 TEXT        NOT NULL DEFAULT 'PHP',
  status                   TEXT        NOT NULL DEFAULT 'Active'
                             CHECK (status IN ('Active','Inactive','Suspended','Under Review')),
  performance_score        NUMERIC     NOT NULL DEFAULT 0,
  quality_rating           NUMERIC     NOT NULL DEFAULT 0,
  delivery_rating          NUMERIC     NOT NULL DEFAULT 0,
  avg_lead_time            INTEGER     NOT NULL DEFAULT 0,
  on_time_delivery_rate    NUMERIC     NOT NULL DEFAULT 0,
  defect_rate              NUMERIC     NOT NULL DEFAULT 0,
  total_purchases_ytd      NUMERIC     NOT NULL DEFAULT 0,
  total_purchases_lifetime NUMERIC     NOT NULL DEFAULT 0,
  order_count              INTEGER     NOT NULL DEFAULT 0,
  avg_order_value          NUMERIC     NOT NULL DEFAULT 0,
  last_purchase_date       DATE,
  account_since            DATE,
  preferred_supplier       BOOLEAN     NOT NULL DEFAULT false,
  risk_level               TEXT        NOT NULL DEFAULT 'Low'
                             CHECK (risk_level IN ('Low','Medium','High')),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Links suppliers to branches (a supplier can serve multiple branches)
CREATE TABLE supplier_branches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID        NOT NULL REFERENCES suppliers(id)  ON DELETE CASCADE,
  branch_id   UUID        NOT NULL REFERENCES branches(id)   ON DELETE CASCADE,
  is_primary  BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, branch_id)
);

-- Links suppliers to specific raw materials with pricing info
CREATE TABLE supplier_materials (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id    UUID        NOT NULL REFERENCES suppliers(id)     ON DELETE CASCADE,
  material_id    UUID        NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  unit_price     NUMERIC     NOT NULL DEFAULT 0,
  lead_time_days INTEGER     NOT NULL DEFAULT 0,
  min_order_qty  NUMERIC     NOT NULL DEFAULT 0,
  is_preferred   BOOLEAN     NOT NULL DEFAULT false,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, material_id)
);


-- ── 2. SEED SUPPLIERS ─────────────────────────────────────

INSERT INTO suppliers (
  name, type, category, contact_person, phone, email,
  payment_terms, currency, status,
  performance_score, quality_rating, delivery_rating,
  avg_lead_time, on_time_delivery_rate, defect_rate,
  total_purchases_ytd, total_purchases_lifetime, order_count, avg_order_value,
  last_purchase_date, account_since,
  preferred_supplier, risk_level, notes
) VALUES

-- 1. Top-tier preferred supplier (Active / Preferred / Low Risk)
(
  'Pacific Resin Industries', 'Raw Materials', 'PVC Resin',
  'Michael Chen', '+63 2 8123 4567', 'michael@pacificresin.com',
  '45 Days', 'PHP', 'Active',
  94, 4.8, 4.9, 5, 96.0, 0.5,
  45000000, 180000000, 48, 937500,
  '2026-04-10', '2020-01-15',
  true, 'Low',
  'Primary PVC resin supplier. ISO 9001 certified. Consistent quality and on-time delivery.'
),

-- 2. International chemicals supplier (Active / Preferred / Low Risk)
(
  'Global Chemicals Corp', 'Chemicals', 'Stabilizers & Additives',
  'Sarah Johnson', '+65 6234 5678', 'sarah@globalchem.com',
  '60 Days', 'USD', 'Active',
  88, 4.5, 4.3, 12, 89.0, 1.2,
  12500000, 52000000, 36, 347222,
  '2026-04-08', '2021-03-10',
  true, 'Low',
  'Sole supplier for calcium-zinc heat stabilizers. Longer lead time due to international shipping.'
),

-- 3. Average packaging supplier (Active / Not Preferred / Medium Risk)
(
  'FlexiPack Solutions', 'Packaging', 'Boxes & Labels',
  'Roberto Garcia', '+63 2 8345 6789', 'roberto@flexipack.ph',
  '30 Days', 'PHP', 'Active',
  76, 3.8, 3.5, 8, 72.0, 3.5,
  8500000, 28000000, 52, 163462,
  '2026-04-05', '2020-08-20',
  false, 'Medium',
  'Frequent quality complaints on carton sealing. Under performance improvement plan.'
),

-- 4. International equipment supplier (Active / Not Preferred / Medium Risk)
(
  'MegaMachinery Inc', 'Equipment', 'Extrusion Machines',
  'David Wang', '+86 21 5678 9012', 'david@megamachinery.cn',
  '90 Days', 'USD', 'Active',
  82, 4.2, 3.8, 45, 75.0, 2.0,
  25000000, 85000000, 12, 2083333,
  '2026-01-15', '2019-05-12',
  false, 'Medium',
  'Long lead times due to customs and shipping. Parts availability can be an issue.'
),

-- 5. Excellent local services supplier (Active / Preferred / Low Risk)
(
  'QuickFix Maintenance Services', 'Services', 'Equipment Maintenance',
  'Carlos Reyes', '+63 917 234 5678', 'carlos@quickfix.ph',
  '15 Days', 'PHP', 'Active',
  91, 4.6, 4.8, 2, 94.0, 0.8,
  3200000, 12000000, 64, 50000,
  '2026-04-12', '2022-02-01',
  true, 'Low',
  'Responsive on-site maintenance team. Covers all Batangas and Cavite plants.'
),

-- 6. Poor performing backup supplier (Active / Not Preferred / High Risk)
(
  'Budget Materials Trading', 'Raw Materials', 'PVC Resin',
  'Juan Dela Cruz', '+63 2 8456 7890', 'juan@budgetmaterials.ph',
  '30 Days', 'PHP', 'Active',
  58, 3.2, 2.8, 14, 58.0, 5.8,
  18000000, 42000000, 28, 642857,
  '2026-02-10', '2021-11-05',
  false, 'High',
  'Used only as last-resort backup. High defect rate; batch testing required on every delivery.'
),

-- 7. Deactivated former chemicals supplier (Inactive / Low Risk)
(
  'ChemSource Asia', 'Chemicals', 'Plasticizers',
  'Linda Tan', '+65 9123 4567', 'linda@chemsource.sg',
  '60 Days', 'USD', 'Inactive',
  79, 4.0, 3.9, 18, 80.0, 2.1,
  0, 31000000, 22, 1409091,
  '2024-11-30', '2019-07-22',
  false, 'Low',
  'Discontinued in late 2024 after Global Chemicals offered better pricing and terms.'
),

-- 8. Suspended supplier (Suspended / High Risk)
(
  'SuperPack Corp', 'Packaging', 'Shrink Wrap & Stretch Film',
  'Tony Aguilar', '+63 2 8567 8901', 'tony@superpack.ph',
  'COD', 'PHP', 'Suspended',
  44, 2.5, 2.0, 10, 45.0, 9.2,
  0, 14500000, 18, 805556,
  '2025-08-20', '2021-04-14',
  false, 'High',
  'Suspended due to three consecutive deliveries with defective shrink film. Awaiting quality audit resolution.'
),

-- 9. New supplier under evaluation (Under Review / Medium Risk)
(
  'NextGen Equipment Ltd', 'Equipment', 'Mixing & Compounding',
  'Grace Lim', '+63 2 8678 9012', 'grace@nextgen-equip.com',
  '60 Days', 'PHP', 'Under Review',
  0, 0.0, 0.0, 30, 0.0, 0.0,
  0, 0, 0, 0,
  NULL, '2026-03-01',
  false, 'Medium',
  'New local supplier being evaluated for compounding line upgrades. First trial order pending approval.'
),

-- 10. Backup raw materials supplier (Active / Not Preferred / Medium Risk)
(
  'Luzon Plastics Supply Co.', 'Raw Materials', 'PVC Compound & Additives',
  'Ramon Villanueva', '+63 44 980 1234', 'ramon@luzonplastics.ph',
  '30 Days', 'PHP', 'Active',
  71, 3.6, 3.7, 7, 74.0, 4.1,
  9800000, 23500000, 19, 515789,
  '2026-03-28', '2022-09-10',
  false, 'Medium',
  'Local backup supplier for PVC compound. Useful during supply crunches. Quality is acceptable but inconsistent.'
);


-- ── 3. BRANCH ASSIGNMENTS ────────────────────────────────

INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
SELECT s.id, b.id, CASE WHEN b.name = 'Batangas' THEN true ELSE false END
FROM suppliers s CROSS JOIN branches b
WHERE s.name = 'Pacific Resin Industries' AND b.name IN ('Batangas', 'Cavite')
ON CONFLICT (supplier_id, branch_id) DO NOTHING;

INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
SELECT s.id, b.id, CASE WHEN b.name = 'Batangas' THEN true ELSE false END
FROM suppliers s CROSS JOIN branches b
WHERE s.name = 'Global Chemicals Corp' AND b.name IN ('Batangas', 'Cebu')
ON CONFLICT (supplier_id, branch_id) DO NOTHING;

INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
SELECT s.id, b.id, CASE WHEN b.name = 'Batangas' THEN true ELSE false END
FROM suppliers s CROSS JOIN branches b
WHERE s.name = 'FlexiPack Solutions' AND b.name IN ('Batangas', 'Manila', 'Cavite')
ON CONFLICT (supplier_id, branch_id) DO NOTHING;

INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
SELECT s.id, b.id, true
FROM suppliers s CROSS JOIN branches b
WHERE s.name = 'MegaMachinery Inc' AND b.name = 'Batangas'
ON CONFLICT (supplier_id, branch_id) DO NOTHING;

INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
SELECT s.id, b.id, CASE WHEN b.name = 'Batangas' THEN true ELSE false END
FROM suppliers s CROSS JOIN branches b
WHERE s.name = 'QuickFix Maintenance Services' AND b.name IN ('Batangas', 'Cavite')
ON CONFLICT (supplier_id, branch_id) DO NOTHING;

INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
SELECT s.id, b.id, CASE WHEN b.name = 'Batangas' THEN true ELSE false END
FROM suppliers s CROSS JOIN branches b
WHERE s.name = 'Budget Materials Trading' AND b.name IN ('Batangas', 'Manila')
ON CONFLICT (supplier_id, branch_id) DO NOTHING;

INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
SELECT s.id, b.id, true
FROM suppliers s CROSS JOIN branches b
WHERE s.name = 'ChemSource Asia' AND b.name = 'Batangas'
ON CONFLICT (supplier_id, branch_id) DO NOTHING;

INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
SELECT s.id, b.id, CASE WHEN b.name = 'Batangas' THEN true ELSE false END
FROM suppliers s CROSS JOIN branches b
WHERE s.name = 'SuperPack Corp' AND b.name IN ('Batangas', 'Manila')
ON CONFLICT (supplier_id, branch_id) DO NOTHING;

INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
SELECT s.id, b.id, true
FROM suppliers s CROSS JOIN branches b
WHERE s.name = 'NextGen Equipment Ltd' AND b.name = 'Batangas'
ON CONFLICT (supplier_id, branch_id) DO NOTHING;

INSERT INTO supplier_branches (supplier_id, branch_id, is_primary)
SELECT s.id, b.id, CASE WHEN b.name = 'Batangas' THEN true ELSE false END
FROM suppliers s CROSS JOIN branches b
WHERE s.name = 'Luzon Plastics Supply Co.' AND b.name IN ('Batangas', 'Cavite')
ON CONFLICT (supplier_id, branch_id) DO NOTHING;


-- ── 4. MATERIAL ASSIGNMENTS ──────────────────────────────

INSERT INTO supplier_materials (supplier_id, material_id, unit_price, lead_time_days, min_order_qty, is_preferred, notes)
SELECT s.id, m.id,
       CASE WHEN m.name ILIKE '%E-68%' THEN 52.00 ELSE 55.00 END,
       5, 5000, true, 'Primary PVC supplier. Price locked quarterly.'
FROM suppliers s CROSS JOIN raw_materials m
WHERE s.name = 'Pacific Resin Industries'
  AND (m.name ILIKE '%PVC%' OR m.name ILIKE '%Resin%')
ON CONFLICT (supplier_id, material_id) DO NOTHING;

INSERT INTO supplier_materials (supplier_id, material_id, unit_price, lead_time_days, min_order_qty, is_preferred, notes)
SELECT s.id, m.id, 61.00, 14, 2000, false, 'Backup source only. Spot market pricing. Subject to batch QC.'
FROM suppliers s CROSS JOIN raw_materials m
WHERE s.name = 'Budget Materials Trading'
  AND (m.name ILIKE '%PVC%' OR m.name ILIKE '%Resin%')
ON CONFLICT (supplier_id, material_id) DO NOTHING;

INSERT INTO supplier_materials (supplier_id, material_id, unit_price, lead_time_days, min_order_qty, is_preferred, notes)
SELECT s.id, m.id, 58.50, 7, 3000, false, 'Regional backup. Good for smaller top-up orders.'
FROM suppliers s CROSS JOIN raw_materials m
WHERE s.name = 'Luzon Plastics Supply Co.'
  AND (m.name ILIKE '%PVC%' OR m.name ILIKE '%Resin%' OR m.name ILIKE '%Plastisol%')
ON CONFLICT (supplier_id, material_id) DO NOTHING;

INSERT INTO supplier_materials (supplier_id, material_id, unit_price, lead_time_days, min_order_qty, is_preferred, notes)
SELECT s.id, m.id, 148.00, 12, 500, true, 'Preferred for all specialty additives. USD-denominated pricing.'
FROM suppliers s CROSS JOIN raw_materials m
WHERE s.name = 'Global Chemicals Corp'
  AND (m.name ILIKE '%Stabilizer%' OR m.name ILIKE '%Plasticizer%'
    OR m.name ILIKE '%DOP%' OR m.name ILIKE '%Calcium%' OR m.name ILIKE '%Additive%')
ON CONFLICT (supplier_id, material_id) DO NOTHING;
