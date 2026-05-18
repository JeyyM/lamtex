-- =====================================================================
-- Demo: historical branch quotas (stepped by month) for Agent Analytics
-- trends chart (last ~12 calendar months when run around mid-2026).
--
-- Idempotent: ON CONFLICT (branch_id, period) DO UPDATE.
-- Safe to re-run. Uses branches.code (MNL, CEB, BTG); skips missing codes.
--
-- Run after: database/branch_sales_targets.sql (and agents exist).
-- =====================================================================

BEGIN;

-- Manila — quota steps up then down then up (PHP)
INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2025-06', 850000, 2550000, '110% of monthly target'
FROM branches WHERE code = 'MNL' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2025-09', 1000000, 3000000, '110% of monthly target'
FROM branches WHERE code = 'MNL' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2026-01', 1150000, 3450000, '115% of monthly target'
FROM branches WHERE code = 'MNL' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2026-04', 1080000, 3240000, '115% of monthly target'
FROM branches WHERE code = 'MNL' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

-- Cebu — different step pattern (PHP)
INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2025-06', 720000, 2160000, '110% of monthly target'
FROM branches WHERE code = 'CEB' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2025-08', 880000, 2640000, '110% of monthly target'
FROM branches WHERE code = 'CEB' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2025-12', 770000, 2310000, '110% of monthly target'
FROM branches WHERE code = 'CEB' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2026-03', 920000, 2760000, '115% of monthly target'
FROM branches WHERE code = 'CEB' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

-- Batangas — fewer steps (PHP)
INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2025-06', 680000, 2040000, '110% of monthly target'
FROM branches WHERE code = 'BTG' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2025-11', 790000, 2370000, '110% of monthly target'
FROM branches WHERE code = 'BTG' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2026-02', 910000, 2730000, '115% of monthly target'
FROM branches WHERE code = 'BTG' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

-- Quezon seed branch (optional — only if QZN exists from demo seeds)
INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2025-06', 600000, 1800000, '110% of monthly target'
FROM branches WHERE code = 'QZN' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2025-10', 750000, 2250000, '110% of monthly target'
FROM branches WHERE code = 'QZN' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

INSERT INTO branch_sales_targets (branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status)
SELECT id, '2026-03', 820000, 2460000, '115% of monthly target'
FROM branches WHERE code = 'QZN' LIMIT 1
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status = EXCLUDED.stretch_goal_status,
  updated_at = NOW();

COMMIT;

-- Verify (optional):
-- SELECT b.code, t.period, t.monthly_sales_target
-- FROM branch_sales_targets t
-- JOIN branches b ON b.id = t.branch_id
-- ORDER BY b.code, t.period;
