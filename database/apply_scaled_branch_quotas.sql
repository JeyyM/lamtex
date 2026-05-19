-- ============================================================================
-- apply_scaled_branch_quotas.sql
--
-- Agent Analytics shows quotas from `branch_sales_targets`. If that table is
-- empty (or the client cannot read it), the app falls back to hardcoded demo
-- values in `src/lib/agentAnalytics.ts` — your divide-by-16 script would then
-- change nothing visible (e.g. Cebu still shows ₱920K).
--
-- This script UPSERTs branch quotas at seed values ÷ 16 (idempotent).
-- After running, hard-refresh the app; targets should drop (~₱57.5K/agent/mo Cebu).
--
-- Optional: run `database/scale_quotas_divide_by_16.sql` only when rows already
-- exist at the OLD full seed amounts and you need another ÷16 pass.
-- ============================================================================

BEGIN;

-- (branch_code, period, monthly, quarterly, stretch)
CREATE TEMP TABLE _scaled_branch_quota_steps (
  branch_code TEXT NOT NULL,
  period      TEXT NOT NULL,
  monthly     NUMERIC(14,2) NOT NULL,
  quarterly   NUMERIC(14,2) NOT NULL,
  stretch     TEXT NOT NULL,
  PRIMARY KEY (branch_code, period)
);

INSERT INTO _scaled_branch_quota_steps (branch_code, period, monthly, quarterly, stretch) VALUES
  ('MNL', '2025-06', 53125.00, 159375.00, '110% of monthly target'),
  ('MNL', '2025-09', 62500.00, 187500.00, '110% of monthly target'),
  ('MNL', '2026-01', 71875.00, 215625.00, '115% of monthly target'),
  ('MNL', '2026-04', 67500.00, 202500.00, '115% of monthly target'),
  ('CEB', '2025-06', 45000.00, 135000.00, '110% of monthly target'),
  ('CEB', '2025-08', 55000.00, 165000.00, '110% of monthly target'),
  ('CEB', '2025-12', 48125.00, 144375.00, '110% of monthly target'),
  ('CEB', '2026-03', 57500.00, 172500.00, '115% of monthly target'),
  ('BTG', '2025-06', 42500.00, 127500.00, '110% of monthly target'),
  ('BTG', '2025-11', 49375.00, 148125.00, '110% of monthly target'),
  ('BTG', '2026-02', 56875.00, 170625.00, '115% of monthly target'),
  ('QZN', '2025-06', 37500.00, 112500.00, '110% of monthly target'),
  ('QZN', '2025-10', 46875.00, 140625.00, '110% of monthly target'),
  ('QZN', '2026-03', 51250.00, 153750.00, '115% of monthly target');

INSERT INTO branch_sales_targets (
  branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status
)
SELECT
  b.id,
  s.period,
  s.monthly,
  s.quarterly,
  s.stretch
FROM _scaled_branch_quota_steps s
JOIN branches b ON b.code = s.branch_code
ON CONFLICT (branch_id, period) DO UPDATE SET
  monthly_sales_target   = EXCLUDED.monthly_sales_target,
  quarterly_sales_target = EXCLUDED.quarterly_sales_target,
  stretch_goal_status    = EXCLUDED.stretch_goal_status,
  updated_at             = NOW();

-- Mirror to per-agent targets where rows already exist
UPDATE agent_targets at
SET
  monthly_sales_target   = bst.monthly_sales_target,
  quarterly_sales_target = bst.quarterly_sales_target,
  stretch_goal_status    = bst.stretch_goal_status,
  updated_at             = NOW()
FROM branch_sales_targets bst
JOIN employees e ON e.branch_id = bst.branch_id
WHERE at.employee_id = e.id
  AND at.period = bst.period
  AND e.role = 'Sales Agent'
  AND e.status = 'active';

COMMIT;

-- Diagnostics
SELECT COUNT(*) AS branch_quota_rows FROM branch_sales_targets;

SELECT b.code, t.period, t.monthly_sales_target, t.quarterly_sales_target
FROM branch_sales_targets t
JOIN branches b ON b.id = t.branch_id
ORDER BY b.code, t.period;
