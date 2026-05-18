-- =====================================================================
-- Agent Analytics: Quota management + audit trail
-- =====================================================================
-- This migration adds:
--   1. agent_quota_history    — full audit of every target change
--   2. upsert_agent_target()  — atomic write to agent_targets + history
--   3. bulk_upsert_agent_targets() — bulk-set targets for many agents
--   4. agent_revenue_by_period view — fast period rollup of order revenue
--
-- Safe to run repeatedly (idempotent, CREATE OR REPLACE / IF NOT EXISTS).
-- =====================================================================

-- 1) AUDIT TABLE -------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_quota_history (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id        UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period             VARCHAR(20) NOT NULL,
  prev_monthly       NUMERIC(14,2),
  new_monthly        NUMERIC(14,2),
  prev_quarterly     NUMERIC(14,2),
  new_quarterly      NUMERIC(14,2),
  prev_stretch       VARCHAR(100),
  new_stretch        VARCHAR(100),
  note               TEXT,
  changed_by_email   VARCHAR(255),
  changed_by_name    VARCHAR(200),
  changed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_quota_history_employee
  ON agent_quota_history(employee_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_quota_history_period
  ON agent_quota_history(period, changed_at DESC);

-- 2) UPSERT ONE TARGET -------------------------------------------------
-- Writes/updates agent_targets (period is uniqued per (employee_id, period))
-- and records the change in agent_quota_history. Returns the new row.
CREATE OR REPLACE FUNCTION public.upsert_agent_target(
  p_employee_id    UUID,
  p_period         TEXT,                -- e.g. '2026-03', '2026-Q1', 'yearly-2026'
  p_monthly        NUMERIC DEFAULT NULL,
  p_quarterly      NUMERIC DEFAULT NULL,
  p_stretch        TEXT    DEFAULT NULL,
  p_note           TEXT    DEFAULT NULL,
  p_changed_by     TEXT    DEFAULT NULL,
  p_changed_name   TEXT    DEFAULT NULL
)
RETURNS agent_targets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing agent_targets%ROWTYPE;
  v_result   agent_targets%ROWTYPE;
BEGIN
  IF p_employee_id IS NULL OR p_period IS NULL THEN
    RAISE EXCEPTION 'employee_id and period are required';
  END IF;

  SELECT * INTO v_existing
  FROM agent_targets
  WHERE employee_id = p_employee_id AND period = p_period
  LIMIT 1;

  IF FOUND THEN
    UPDATE agent_targets
    SET
      monthly_sales_target   = COALESCE(p_monthly,   v_existing.monthly_sales_target),
      quarterly_sales_target = COALESCE(p_quarterly, v_existing.quarterly_sales_target),
      stretch_goal_status    = COALESCE(p_stretch,   v_existing.stretch_goal_status),
      updated_at             = NOW()
    WHERE id = v_existing.id
    RETURNING * INTO v_result;
  ELSE
    INSERT INTO agent_targets (
      employee_id, period,
      monthly_sales_target,
      quarterly_sales_target,
      stretch_goal_status
    ) VALUES (
      p_employee_id, p_period,
      COALESCE(p_monthly, 0),
      COALESCE(p_quarterly, 0),
      p_stretch
    )
    RETURNING * INTO v_result;
  END IF;

  -- Audit
  INSERT INTO agent_quota_history (
    employee_id, period,
    prev_monthly, new_monthly,
    prev_quarterly, new_quarterly,
    prev_stretch,  new_stretch,
    note, changed_by_email, changed_by_name
  ) VALUES (
    p_employee_id, p_period,
    v_existing.monthly_sales_target,   v_result.monthly_sales_target,
    v_existing.quarterly_sales_target, v_result.quarterly_sales_target,
    v_existing.stretch_goal_status,    v_result.stretch_goal_status,
    p_note, p_changed_by, p_changed_name
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_agent_target(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_agent_target(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 3) BULK UPSERT --------------------------------------------------------
-- Accepts a JSON array: [{employeeId, monthly, quarterly, stretch}, ...]
-- All rows share the same period and audit note.
CREATE OR REPLACE FUNCTION public.bulk_upsert_agent_targets(
  p_period       TEXT,
  p_rows         JSONB,
  p_note         TEXT DEFAULT NULL,
  p_changed_by   TEXT DEFAULT NULL,
  p_changed_name TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r           JSONB;
  v_count     INT := 0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    PERFORM public.upsert_agent_target(
      (r->>'employeeId')::UUID,
      p_period,
      NULLIF(r->>'monthly','')::NUMERIC,
      NULLIF(r->>'quarterly','')::NUMERIC,
      NULLIF(r->>'stretch',''),
      p_note,
      p_changed_by,
      p_changed_name
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_upsert_agent_targets(TEXT, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_agent_targets(TEXT, JSONB, TEXT, TEXT, TEXT) TO authenticated;

-- 4) FAST PERIOD ROLLUP VIEW -------------------------------------------
-- Aggregates revenue, orders, customers per agent per (year, month).
-- Excludes Cancelled / Rejected orders. The frontend filters this view
-- by date range to compute KPIs without scanning order_line_items.
CREATE OR REPLACE VIEW public.agent_revenue_by_period AS
SELECT
  COALESCE(o.agent_id, cu.assigned_agent_id)             AS agent_id,
  COALESCE(o.agent_name, e.employee_name)               AS agent_name,
  o.branch_id                                           AS branch_id,
  EXTRACT(YEAR  FROM o.order_date)::INT                 AS year,
  EXTRACT(MONTH FROM o.order_date)::INT                 AS month,
  COUNT(*)                                              AS order_count,
  -- Revenue for KPIs: recorded payments when present; otherwise order total (many tenants only fill total_amount).
  COALESCE(SUM(CASE
    WHEN COALESCE(o.amount_paid, 0) > 0 THEN o.amount_paid
    ELSE COALESCE(o.total_amount, 0)
  END), 0)                                             AS revenue,
  COALESCE(SUM(o.total_amount), 0)                      AS gross_sales,
  COALESCE(SUM(o.amount_paid), 0)                       AS amount_paid,
  COALESCE(SUM(o.balance_due), 0)                       AS balance_due,
  COALESCE(AVG(NULLIF(o.discount_percent, 0)), 0)       AS avg_discount_percent,
  COUNT(DISTINCT o.customer_id)                         AS distinct_customers,
  COUNT(*) FILTER (WHERE o.payment_status = 'Overdue')  AS overdue_orders,
  COALESCE(SUM(o.balance_due) FILTER
    (WHERE o.payment_status = 'Overdue'), 0)            AS overdue_balance
FROM orders o
LEFT JOIN customers cu ON cu.id = o.customer_id
LEFT JOIN employees e ON e.id = COALESCE(o.agent_id, cu.assigned_agent_id)
WHERE o.status NOT IN ('Cancelled', 'Rejected', 'Draft')
  AND COALESCE(o.agent_id, cu.assigned_agent_id) IS NOT NULL
GROUP BY
  COALESCE(o.agent_id, cu.assigned_agent_id),
  COALESCE(o.agent_name, e.employee_name),
  o.branch_id,
  EXTRACT(YEAR FROM o.order_date),
  EXTRACT(MONTH FROM o.order_date);

GRANT SELECT ON public.agent_revenue_by_period TO authenticated;

-- 5) NUDGE / COACHING ALERT INSERT -------------------------------------
-- Tiny helper used by the "Send coaching nudge" button.
CREATE OR REPLACE FUNCTION public.send_agent_coaching_nudge(
  p_employee_id UUID,
  p_severity    TEXT,
  p_title       TEXT,
  p_message     TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_employee_id IS NULL THEN
    RAISE EXCEPTION 'employee_id is required';
  END IF;

  -- Stored as a 'Target Alert' since the agent_alert_type enum does not yet
  -- include 'Coaching'. Title is prefixed with "Coaching:" for clarity.
  INSERT INTO agent_alerts (agent_id, severity, type, title, message, action_required)
  VALUES (
    p_employee_id,
    COALESCE(p_severity, 'Medium')::alert_severity,
    'Target Alert'::agent_alert_type,
    'Coaching: ' || COALESCE(p_title, 'Performance review'),
    COALESCE(p_message, 'A manager has flagged you for review.'),
    TRUE
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  -- agent_alerts schema may differ; fail soft so the UI still works.
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.send_agent_coaching_nudge(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_agent_coaching_nudge(UUID, TEXT, TEXT, TEXT) TO authenticated;
