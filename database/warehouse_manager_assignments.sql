-- Warehouse manager catalog scope: which product families and raw materials each manager may access.

CREATE TABLE IF NOT EXISTS employee_product_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, product_id)
);

CREATE TABLE IF NOT EXISTS employee_material_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  material_id     UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_product_assignments_employee
  ON employee_product_assignments(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_product_assignments_product
  ON employee_product_assignments(product_id);

CREATE INDEX IF NOT EXISTS idx_employee_material_assignments_employee
  ON employee_material_assignments(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_material_assignments_material
  ON employee_material_assignments(material_id);

-- RLS: these tables are created after schema bootstrap; add the same auth policies as other tables.
ALTER TABLE employee_product_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_material_assignments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['employee_product_assignments', 'employee_material_assignments']
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() IS NOT NULL)',
        'auth_select_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)',
        'auth_insert_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR UPDATE USING (auth.uid() IS NOT NULL)',
        'auth_update_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR DELETE USING (auth.uid() IS NOT NULL)',
        'auth_delete_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
