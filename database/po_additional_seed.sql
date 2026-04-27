-- ============================================================
-- ADDITIONAL PO SEED DATA
-- More completed (on-time & late) + overdue orders so that
-- per-supplier avg delivery times can be computed.
-- Safe to run on top of existing data (no DROP).
-- ============================================================

INSERT INTO purchase_orders
  (po_number, branch_id, supplier_id, status, order_date, expected_delivery_date, actual_delivery_date, total_amount, currency, notes, created_by)
VALUES

-- ── Pacific Resin Industries ───────────────────────────────
-- Completed on time (12 days lead)
(
  'PO-2026-011',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Pacific Resin Industries' LIMIT 1),
  'Completed', '2025-10-01', '2025-10-15', '2025-10-13',
  1200000, 'PHP', 'Q4 PVC resin stock-up.', 'Executive Admin'
),
-- Completed on time (14 days lead)
(
  'PO-2026-012',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Pacific Resin Industries' LIMIT 1),
  'Completed', '2025-11-05', '2025-11-20', '2025-11-19',
  980000, 'PHP', 'Resin restock for November production.', 'Executive Admin'
),
-- Completed late (delivered 5 days after expected)
(
  'PO-2026-013',
  (SELECT id FROM branches WHERE code = 'MNL' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Pacific Resin Industries' LIMIT 1),
  'Completed', '2025-12-01', '2025-12-16', '2025-12-21',
  1450000, 'PHP', 'Year-end resin order — delivery delayed by port congestion.', 'Executive Admin'
),
-- Overdue — confirmed but expected delivery has passed
(
  'PO-2026-014',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Pacific Resin Industries' LIMIT 1),
  'Confirmed', '2026-03-28', '2026-04-10', NULL,
  1600000, 'PHP', 'Urgent resin order — awaiting shipment confirmation.', 'Executive Admin'
),

-- ── FlexiPack Solutions ────────────────────────────────────
-- Completed on time (10 days lead)
(
  'PO-2026-015',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'FlexiPack Solutions' LIMIT 1),
  'Completed', '2025-09-10', '2025-09-22', '2025-09-20',
  185000, 'PHP', 'Q3 packaging restock.', 'Executive Admin'
),
-- Completed late (8 days late)
(
  'PO-2026-016',
  (SELECT id FROM branches WHERE code = 'MNL' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'FlexiPack Solutions' LIMIT 1),
  'Completed', '2025-11-15', '2025-11-28', '2025-12-06',
  220000, 'PHP', 'Holiday packaging run — delayed due to supplier backlog.', 'Executive Admin'
),
-- Overdue — sent but not yet delivered
(
  'PO-2026-017',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'FlexiPack Solutions' LIMIT 1),
  'Sent', '2026-03-20', '2026-04-05', NULL,
  130000, 'PHP', 'Box restock. Waiting for supplier acknowledgement.', 'Executive Admin'
),

-- ── Global Chemicals Corp ──────────────────────────────────
-- Completed on time (18 days lead)
(
  'PO-2026-018',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Global Chemicals Corp' LIMIT 1),
  'Completed', '2025-08-01', '2025-08-20', '2025-08-19',
  760000, 'USD', 'Additive and plasticizer bulk order.', 'Executive Admin'
),
-- Completed on time (17 days lead)
(
  'PO-2026-019',
  (SELECT id FROM branches WHERE code = 'MNL' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Global Chemicals Corp' LIMIT 1),
  'Completed', '2025-10-12', '2025-10-30', '2025-10-29',
  830000, 'USD', 'Stabilizer and UV additive reorder.', 'Executive Admin'
),
-- Completed late (4 days late)
(
  'PO-2026-020',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'Global Chemicals Corp' LIMIT 1),
  'Completed', '2025-12-10', '2025-12-28', '2026-01-01',
  920000, 'USD', 'Year-end chemical order — minor customs delay.', 'Executive Admin'
),

-- ── PVC Master Compounds ───────────────────────────────────
-- Completed on time (8 days lead)
(
  'PO-2026-021',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'PVC Master Compounds' LIMIT 1),
  'Completed', '2025-09-20', '2025-09-30', '2025-09-28',
  490000, 'PHP', 'Compound mix batch for pipe production.', 'Executive Admin'
),
-- Completed on time (9 days lead)
(
  'PO-2026-022',
  (SELECT id FROM branches WHERE code = 'MNL' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'PVC Master Compounds' LIMIT 1),
  'Completed', '2025-11-01', '2025-11-12', '2025-11-10',
  510000, 'PHP', 'Monthly compound order.', 'Executive Admin'
),
-- Overdue — confirmed, expected passed
(
  'PO-2026-023',
  (SELECT id FROM branches WHERE code = 'MNL' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'PVC Master Compounds' LIMIT 1),
  'Confirmed', '2026-03-10', '2026-03-22', NULL,
  575000, 'PHP', 'Q1 compound top-up — awaiting dispatch.', 'Executive Admin'
),

-- ── NorthColor Pigments ────────────────────────────────────
-- Completed on time (7 days lead)
(
  'PO-2026-024',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'NorthColor Pigments' LIMIT 1),
  'Completed', '2025-10-05', '2025-10-14', '2025-10-12',
  145000, 'PHP', 'Pigment batch for colored fittings.', 'Executive Admin'
),
-- Completed late (3 days late)
(
  'PO-2026-025',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'NorthColor Pigments' LIMIT 1),
  'Completed', '2025-12-15', '2025-12-24', '2025-12-27',
  168000, 'PHP', 'Holiday pigment restock — slight delay.', 'Executive Admin'
),

-- ── QuickFix Maintenance Services ─────────────────────────
-- Completed on time (5 days lead)
(
  'PO-2026-026',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'QuickFix Maintenance Services' LIMIT 1),
  'Completed', '2025-10-01', '2025-10-07', '2025-10-06',
  72000, 'PHP', 'Quarterly maintenance service.', 'Executive Admin'
),
-- Completed on time (5 days lead)
(
  'PO-2026-027',
  (SELECT id FROM branches WHERE code = 'BTG' LIMIT 1),
  (SELECT id FROM suppliers WHERE name = 'QuickFix Maintenance Services' LIMIT 1),
  'Completed', '2025-12-01', '2025-12-07', '2025-12-06',
  78000, 'PHP', 'Year-end preventive maintenance.', 'Executive Admin'
)

ON CONFLICT (po_number) DO NOTHING;
