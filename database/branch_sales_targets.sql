-- =====================================================================
-- Branch sales targets: one monthly/quarterly quota per branch per period,
-- applied to every Sales Agent in that branch (synced to agent_targets).
-- =====================================================================

CREATE TABLE IF NOT EXISTS branch_sales_targets (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id                UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period                   VARCHAR(20) NOT NULL,
  monthly_sales_target     NUMERIC(14,2) NOT NULL DEFAULT 0,
  quarterly_sales_target   NUMERIC(14,2) NOT NULL DEFAULT 0,
  stretch_goal_status      VARCHAR(100),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, period)
);

CREATE TABLE IF NOT EXISTS branch_quota_history (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id          UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_branch_sales_targets_branch
  ON branch_sales_targets(branch_id, period);
CREATE INDEX IF NOT EXISTS idx_branch_quota_history_branch
  ON branch_quota_history(branch_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.upsert_branch_sales_target(
  p_branch_id    UUID,
  p_period       TEXT,
  p_monthly      NUMERIC DEFAULT NULL,
  p_quarterly    NUMERIC DEFAULT NULL,
  p_stretch      TEXT    DEFAULT NULL,
  p_note         TEXT    DEFAULT NULL,
  p_changed_by   TEXT    DEFAULT NULL,
  p_changed_name TEXT    DEFAULT NULL
)
RETURNS branch_sales_targets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing branch_sales_targets%ROWTYPE;
  v_result   branch_sales_targets%ROWTYPE;
  v_payload  JSONB;
BEGIN
  IF p_branch_id IS NULL OR p_period IS NULL THEN
    RAISE EXCEPTION 'branch_id and period are required';
  END IF;

  SELECT * INTO v_existing
  FROM branch_sales_targets
  WHERE branch_id = p_branch_id AND period = p_period
  LIMIT 1;

  IF FOUND THEN
    UPDATE branch_sales_targets
    SET
      monthly_sales_target   = COALESCE(p_monthly, monthly_sales_target),
      quarterly_sales_target = COALESCE(p_quarterly, quarterly_sales_target),
      stretch_goal_status    = COALESCE(p_stretch, stretch_goal_status),
      updated_at             = NOW()
    WHERE id = v_existing.id
    RETURNING * INTO v_result;
  ELSE
    INSERT INTO branch_sales_targets (
      branch_id, period,
      monthly_sales_target,
      quarterly_sales_target,
      stretch_goal_status
    ) VALUES (
      p_branch_id, p_period,
      COALESCE(p_monthly, 0),
      COALESCE(p_quarterly, 0),
      p_stretch
    )
    RETURNING * INTO v_result;
  END IF;

  INSERT INTO branch_quota_history (
    branch_id, period,
    prev_monthly, new_monthly,
    prev_quarterly, new_quarterly,
    prev_stretch, new_stretch,
    note, changed_by_email, changed_by_name
  ) VALUES (
    p_branch_id, p_period,
    v_existing.monthly_sales_target, v_result.monthly_sales_target,
    v_existing.quarterly_sales_target, v_result.quarterly_sales_target,
    v_existing.stretch_goal_status, v_result.stretch_goal_status,
    p_note, p_changed_by, p_changed_name
  );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'employeeId', e.id::text,
        'monthly', v_result.monthly_sales_target,
        'quarterly', v_result.quarterly_sales_target,
        'stretch', v_result.stretch_goal_status
      )
    ),
    '[]'::jsonb
  )
  INTO v_payload
  FROM employees e
  WHERE e.branch_id = p_branch_id
    AND e.role = 'Sales Agent'::employee_role
    AND e.status = 'active'::employee_status;

  IF jsonb_array_length(v_payload) > 0 THEN
    PERFORM public.bulk_upsert_agent_targets(
      p_period,
      v_payload,
      COALESCE(p_note, 'Synced from branch quota'),
      p_changed_by,
      p_changed_name
    );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_branch_sales_target(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_branch_sales_target(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;
