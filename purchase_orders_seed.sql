-- ============================================================
-- PURCHASE ORDERS SYSTEM
-- Run this in the Supabase SQL editor
-- ============================================================

-- Clean slate
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;

-- ── purchase_orders ──────────────────────────────────────────
CREATE TABLE purchase_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number              TEXT NOT NULL UNIQUE,
  branch_id              UUID REFERENCES branches(id) ON DELETE SET NULL,
  supplier_id            UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status                 TEXT NOT NULL DEFAULT 'Draft'
                           CHECK (status IN ('Draft','Requested','Rejected','Accepted','Sent','Confirmed','Partially Received','Completed','Cancelled')),
  order_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date   DATE,
  total_amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency               TEXT NOT NULL DEFAULT 'PHP',
  notes                  TEXT,
  created_by             TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── purchase_order_items ─────────────────────────────────────
CREATE TABLE purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id       UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  quantity_ordered  NUMERIC(14,2) NOT NULL DEFAULT 0,
  quantity_received NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_price        NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_of_measure   TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── purchase_requests ────────────────────────────────────────
CREATE TABLE purchase_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id             UUID REFERENCES branches(id) ON DELETE SET NULL,
  material_id           UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  suggested_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  requested_qty         NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_of_measure       TEXT,
  reason                TEXT,
  raised_by             TEXT,
  status                TEXT NOT NULL DEFAULT 'Pending'
                          CHECK (status IN ('Pending','Approved','Rejected')),
  executive_notes       TEXT,
  linked_po_id          UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS (matches rest of project) ────────────────────────────
ALTER TABLE purchase_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "po_auth"  ON purchase_orders     FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "poi_auth" ON purchase_order_items FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pr_auth"  ON purchase_requests   FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO purchase_orders
  (po_number, branch_id, supplier_id, status, order_date, expected_delivery_date, actual_delivery_date, total_amount, currency, notes, created_by)
VALUES

-- 1. Completed on time (Batangas / Pacific Resin)
(
  'PO-2026-001',
  (SELECT id FROM branches WHERE name = 'Batangas' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Pacific Resin Industries' LIMIT 1),
  'Completed', '2026-01-10', '2026-01-25', '2026-01-23',
  1350000, 'PHP',
  'Regular quarterly PVC resin restock.', 'Executive Admin'
),

-- 2. Completed late (Batangas / FlexiPack)
(
  'PO-2026-002',
  (SELECT id FROM branches WHERE name = 'Batangas' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'FlexiPack Solutions' LIMIT 1),
  'Completed', '2026-01-18', '2026-02-01', '2026-02-07',
  210000, 'PHP',
  'Packaging restock - delivery was delayed by 6 days.', 'Executive Admin'
),

-- 3. Completed on time (Manila / Global Chemicals)
(
  'PO-2026-003',
  (SELECT id FROM branches WHERE name = 'Manila' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Global Chemicals Corp' LIMIT 1),
  'Completed', '2026-02-03', '2026-02-20', '2026-02-19',
  875000, 'USD',
  'Stabilizer and additive bulk order.', 'Executive Admin'
),

-- 4. Partially Received (Batangas / Pacific Resin)
(
  'PO-2026-004',
  (SELECT id FROM branches WHERE name = 'Batangas' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Pacific Resin Industries' LIMIT 1),
  'Partially Received', '2026-03-05', '2026-03-20', NULL,
  1800000, 'PHP',
  'Two-batch delivery. First batch received, awaiting second.', 'Executive Admin'
),

-- 5. Confirmed / awaiting shipment (Manila / PVC Master)
(
  'PO-2026-005',
  (SELECT id FROM branches WHERE name = 'Manila' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'PVC Master Compounds' LIMIT 1),
  'Confirmed', '2026-03-25', '2026-04-15', NULL,
  540000, 'PHP',
  'Compound mix for Q2 production run.', 'Executive Admin'
),

-- 6. Sent (Batangas / Global Chemicals)
(
  'PO-2026-006',
  (SELECT id FROM branches WHERE name = 'Batangas' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Global Chemicals Corp' LIMIT 1),
  'Sent', '2026-04-10', '2026-04-28', NULL,
  320000, 'USD',
  'UV stabilizer reorder triggered by low stock alert.', 'Executive Admin'
),

-- 7. Draft (Batangas / FlexiPack)
(
  'PO-2026-007',
  (SELECT id FROM branches WHERE name = 'Batangas' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'FlexiPack Solutions' LIMIT 1),
  'Draft', '2026-04-18', '2026-05-05', NULL,
  95000, 'PHP',
  'Pending executive review before sending.', 'Executive Admin'
),

-- 8. Cancelled (Manila / MegaMachinery)
(
  'PO-2026-008',
  (SELECT id FROM branches WHERE name = 'Manila' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'MegaMachinery Inc' LIMIT 1),
  'Cancelled', '2026-02-14', '2026-03-30', NULL,
  4200000, 'USD',
  'Equipment upgrade postponed to next fiscal year.', 'Executive Admin'
),

-- 9. Completed on time (Batangas / QuickFix)
(
  'PO-2026-009',
  (SELECT id FROM branches WHERE name = 'Batangas' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'QuickFix Maintenance Services' LIMIT 1),
  'Completed', '2026-03-01', '2026-03-07', '2026-03-06',
  85000, 'PHP',
  'Monthly preventive maintenance service.', 'Executive Admin'
),

-- 10. Confirmed (Batangas / NorthColor)
(
  'PO-2026-010',
  (SELECT id FROM branches WHERE name = 'Batangas' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'NorthColor Pigments' LIMIT 1),
  'Confirmed', '2026-04-15', '2026-04-30', NULL,
  175000, 'PHP',
  'Pigment restock for colored pipe production.', 'Executive Admin'
);

-- ── Line items ───────────────────────────────────────────────
-- PO-2026-001: PVC Resin (Completed)
INSERT INTO purchase_order_items (order_id, material_id, quantity_ordered, quantity_received, unit_price, unit_of_measure)
SELECT
  (SELECT id FROM purchase_orders WHERE po_number = 'PO-2026-001'),
  (SELECT id FROM raw_materials WHERE name ILIKE '%PVC Resin%' LIMIT 1),
  30000, 30000, 45, 'kg'
WHERE (SELECT id FROM raw_materials WHERE name ILIKE '%PVC Resin%' LIMIT 1) IS NOT NULL;

-- PO-2026-002: Packaging boxes (Completed)
INSERT INTO purchase_order_items (order_id, material_id, quantity_ordered, quantity_received, unit_price, unit_of_measure)
SELECT
  (SELECT id FROM purchase_orders WHERE po_number = 'PO-2026-002'),
  (SELECT id FROM raw_materials WHERE name ILIKE '%Carton%' OR name ILIKE '%Box%' LIMIT 1),
  5000, 5000, 42, 'pcs'
WHERE (SELECT id FROM raw_materials WHERE name ILIKE '%Carton%' OR name ILIKE '%Box%' LIMIT 1) IS NOT NULL;

-- PO-2026-003: Stabilizer (Completed)
INSERT INTO purchase_order_items (order_id, material_id, quantity_ordered, quantity_received, unit_price, unit_of_measure)
SELECT
  (SELECT id FROM purchase_orders WHERE po_number = 'PO-2026-003'),
  (SELECT id FROM raw_materials WHERE name ILIKE '%Stabilizer%' LIMIT 1),
  5000, 5000, 175, 'kg'
WHERE (SELECT id FROM raw_materials WHERE name ILIKE '%Stabilizer%' LIMIT 1) IS NOT NULL;

-- PO-2026-004: PVC Resin two batches (Partially Received)
INSERT INTO purchase_order_items (order_id, material_id, quantity_ordered, quantity_received, unit_price, unit_of_measure)
SELECT
  (SELECT id FROM purchase_orders WHERE po_number = 'PO-2026-004'),
  (SELECT id FROM raw_materials WHERE name ILIKE '%PVC Resin%' LIMIT 1),
  40000, 22000, 45, 'kg'
WHERE (SELECT id FROM raw_materials WHERE name ILIKE '%PVC Resin%' LIMIT 1) IS NOT NULL;

-- PO-2026-006: UV Stabilizer (Sent)
INSERT INTO purchase_order_items (order_id, material_id, quantity_ordered, quantity_received, unit_price, unit_of_measure)
SELECT
  (SELECT id FROM purchase_orders WHERE po_number = 'PO-2026-006'),
  (SELECT id FROM raw_materials WHERE name ILIKE '%UV%' OR name ILIKE '%Stabilizer%' LIMIT 1),
  2000, 0, 160, 'kg'
WHERE (SELECT id FROM raw_materials WHERE name ILIKE '%UV%' OR name ILIKE '%Stabilizer%' LIMIT 1) IS NOT NULL;

-- ── purchase_requests seed ───────────────────────────────────
INSERT INTO purchase_requests
  (branch_id, material_id, suggested_supplier_id, requested_qty, unit_of_measure, reason, raised_by, status, executive_notes)
VALUES

-- Approved → became PO-2026-006
(
  (SELECT id FROM branches WHERE name = 'Batangas' LIMIT 1),
  (SELECT id FROM raw_materials WHERE name ILIKE '%UV%' OR name ILIKE '%Stabilizer%' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Global Chemicals Corp' LIMIT 1),
  2000, 'kg', 'UV stabilizer below reorder point. Production will be affected in 5 days.',
  'Warehouse Staff', 'Approved', 'Approved. PO-2026-006 raised.'
),

-- Pending review
(
  (SELECT id FROM branches WHERE name = 'Batangas' LIMIT 1),
  (SELECT id FROM raw_materials WHERE name ILIKE '%PVC Resin%' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Pacific Resin Industries' LIMIT 1),
  15000, 'kg', 'Stock projected to run out in 10 days based on current consumption rate.',
  'Warehouse Staff', 'Pending', NULL
),

-- Pending review (Manila)
(
  (SELECT id FROM branches WHERE name = 'Manila' LIMIT 1),
  (SELECT id FROM raw_materials WHERE name ILIKE '%Stabilizer%' LIMIT 1),
  NULL,
  3000, 'kg', 'Low stock alert triggered. No preferred supplier suggested.',
  'Warehouse Staff', 'Pending', NULL
),

-- Rejected
(
  (SELECT id FROM branches WHERE name = 'Batangas' LIMIT 1),
  (SELECT id FROM raw_materials WHERE name ILIKE '%PVC Resin%' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'FlexiPack Solutions' LIMIT 1),
  50000, 'kg', 'Requested large buffer stock.',
  'Warehouse Staff', 'Rejected', 'Quantity too high for current storage capacity. Reduce to 15,000 kg and resubmit.'
);
