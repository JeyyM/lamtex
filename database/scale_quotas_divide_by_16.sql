-- ============================================================================
-- scale_quotas_divide_by_16.sql
--
-- Lowers EXISTING rows by dividing by 16. If `branch_sales_targets` is empty,
-- this updates 0 rows and Agent Analytics still uses demo fallback — run
-- `database/apply_scaled_branch_quotas.sql` instead (or first).
--
-- Lowers all live sales quota targets by dividing by 16 (one-time adjustment).
-- Agent Analytics reads branch_sales_targets (stepped by period); agent_targets
-- is kept in sync; employee_compensation quotas are included for HR/comp views.
--
-- Does NOT rewrite audit history (agent_quota_history, branch_quota_history).
-- Run once — re-running divides again.
--
-- Run in: Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- ── Before snapshot ─────────────────────────────────────────────────────────
CREATE TEMP TABLE _quota_scale_before AS
SELECT 'branch_sales_targets' AS source,
       COUNT(*) AS rows,
       ROUND(SUM(monthly_sales_target), 2) AS sum_monthly,
       ROUND(SUM(quarterly_sales_target), 2) AS sum_quarterly
FROM branch_sales_targets
WHERE monthly_sales_target > 0 OR quarterly_sales_target > 0
UNION ALL
SELECT 'agent_targets',
       COUNT(*),
       ROUND(SUM(monthly_sales_target), 2),
       ROUND(SUM(quarterly_sales_target), 2)
FROM agent_targets
WHERE monthly_sales_target > 0 OR quarterly_sales_target > 0
UNION ALL
SELECT 'employee_compensation',
       COUNT(*),
       ROUND(SUM(monthly_quota), 2),
       ROUND(SUM(quarterly_quota), 2)
FROM employee_compensation
WHERE monthly_quota > 0 OR quarterly_quota > 0 OR yearly_quota > 0;

-- ── Branch quotas (primary source for Agent Analytics) ──────────────────────
UPDATE branch_sales_targets
SET
  monthly_sales_target   = ROUND(monthly_sales_target / 16.0, 2),
  quarterly_sales_target = ROUND(quarterly_sales_target / 16.0, 2),
  updated_at             = NOW()
WHERE monthly_sales_target > 0
   OR quarterly_sales_target > 0;

-- ── Per-agent targets (mirrored from branch quota UI) ───────────────────────
UPDATE agent_targets
SET
  monthly_sales_target   = ROUND(monthly_sales_target / 16.0, 2),
  quarterly_sales_target = ROUND(quarterly_sales_target / 16.0, 2),
  updated_at             = NOW()
WHERE monthly_sales_target > 0
   OR quarterly_sales_target > 0;

-- ── HR compensation quota fields ──────────────────────────────────────────────
UPDATE employee_compensation
SET
  monthly_quota   = ROUND(monthly_quota / 16.0, 2),
  quarterly_quota = ROUND(quarterly_quota / 16.0, 2),
  yearly_quota    = ROUND(yearly_quota / 16.0, 2),
  updated_at      = NOW()
WHERE monthly_quota > 0
   OR quarterly_quota > 0
   OR yearly_quota > 0;

-- ── Optional: branch performance snapshot quota column (if populated) ─────────
UPDATE branch_performance
SET sales_quota = ROUND(sales_quota / 16.0, 2)
WHERE sales_quota > 0;

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────────
SELECT * FROM _quota_scale_before ORDER BY source;

SELECT 'branch_sales_targets' AS source,
       COUNT(*) AS rows,
       ROUND(SUM(monthly_sales_target), 2) AS sum_monthly,
       ROUND(SUM(quarterly_sales_target), 2) AS sum_quarterly
FROM branch_sales_targets
WHERE monthly_sales_target > 0 OR quarterly_sales_target > 0
UNION ALL
SELECT 'agent_targets',
       COUNT(*),
       ROUND(SUM(monthly_sales_target), 2),
       ROUND(SUM(quarterly_sales_target), 2)
FROM agent_targets
WHERE monthly_sales_target > 0 OR quarterly_sales_target > 0
UNION ALL
SELECT 'employee_compensation',
       COUNT(*),
       ROUND(SUM(monthly_quota), 2),
       ROUND(SUM(quarterly_quota), 2)
FROM employee_compensation
WHERE monthly_quota > 0 OR quarterly_quota > 0 OR yearly_quota > 0
ORDER BY source;

-- Sample: latest period per branch
SELECT b.code,
       t.period,
       t.monthly_sales_target,
       t.quarterly_sales_target
FROM branch_sales_targets t
JOIN branches b ON b.id = t.branch_id
ORDER BY b.code, t.period DESC
LIMIT 20;
