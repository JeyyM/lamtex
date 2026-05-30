-- Per-employee product module permissions (Employee profile → Access tab).
-- Empty/missing row = full access (handled in app). JSON keys match ProductPermissionKey in TS.

CREATE TABLE IF NOT EXISTS employee_product_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_product_permissions_updated
  ON employee_product_permissions(updated_at DESC);

ALTER TABLE employee_product_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY auth_select_employee_product_permissions ON employee_product_permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY auth_insert_employee_product_permissions ON employee_product_permissions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY auth_update_employee_product_permissions ON employee_product_permissions
    FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY auth_delete_employee_product_permissions ON employee_product_permissions
    FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON employee_product_permissions TO authenticated;

NOTIFY pgrst, 'reload schema';
