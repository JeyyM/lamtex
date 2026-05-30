-- Multiple dashboard roles per employee (primary role syncs to employees.user_role).

CREATE TABLE IF NOT EXISTS employee_user_roles (
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_role     user_role NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, user_role)
);

CREATE INDEX IF NOT EXISTS idx_employee_user_roles_employee
  ON employee_user_roles(employee_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_user_roles_one_primary
  ON employee_user_roles(employee_id)
  WHERE is_primary;

ALTER TABLE employee_user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY auth_select_employee_user_roles ON employee_user_roles
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY auth_insert_employee_user_roles ON employee_user_roles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY auth_update_employee_user_roles ON employee_user_roles
    FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY auth_delete_employee_user_roles ON employee_user_roles
    FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON employee_user_roles TO authenticated;

-- Backfill from legacy single user_role column.
INSERT INTO employee_user_roles (employee_id, user_role, is_primary)
SELECT e.id, e.user_role, true
FROM employees e
WHERE e.user_role IS NOT NULL
ON CONFLICT (employee_id, user_role) DO NOTHING;

NOTIFY pgrst, 'reload schema';
