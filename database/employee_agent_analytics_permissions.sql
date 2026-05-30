-- Per-employee Agent Analytics module permissions (Employee profile → Access tab).

CREATE TABLE IF NOT EXISTS employee_agent_analytics_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_agent_analytics_permissions_updated
  ON employee_agent_analytics_permissions(updated_at DESC);

ALTER TABLE employee_agent_analytics_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY auth_select_employee_agent_analytics_permissions ON employee_agent_analytics_permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY auth_insert_employee_agent_analytics_permissions ON employee_agent_analytics_permissions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY auth_update_employee_agent_analytics_permissions ON employee_agent_analytics_permissions
    FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY auth_delete_employee_agent_analytics_permissions ON employee_agent_analytics_permissions
    FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON employee_agent_analytics_permissions TO authenticated;

NOTIFY pgrst, 'reload schema';
