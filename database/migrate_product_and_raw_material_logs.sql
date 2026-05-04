-- Add product / raw material activity logs (mirrors purchase_order_logs).
-- Safe to run on existing databases.

CREATE TABLE IF NOT EXISTS product_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID        REFERENCES products(id) ON DELETE SET NULL,
  variant_id          UUID        REFERENCES product_variants(id) ON DELETE SET NULL,
  action              TEXT        NOT NULL,
  performed_by        TEXT,
  performed_by_role   TEXT,
  description         TEXT,
  old_value           JSONB,
  new_value           JSONB,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_material_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id     UUID        REFERENCES raw_materials(id) ON DELETE SET NULL,
  action              TEXT        NOT NULL,
  performed_by        TEXT,
  performed_by_role   TEXT,
  description         TEXT,
  old_value           JSONB,
  new_value           JSONB,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_logs_product_order ON product_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_material_logs_material_order ON raw_material_logs(raw_material_id, created_at DESC);

-- RLS: required on Supabase when Row Level Security is on — without policies, inserts/selects fail silently from the app.
-- Same pattern as purchase_order_logs_migration.sql (any authenticated user).
ALTER TABLE product_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_logs_auth" ON product_logs;
CREATE POLICY "product_logs_auth" ON product_logs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE raw_material_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "raw_material_logs_auth" ON raw_material_logs;
CREATE POLICY "raw_material_logs_auth" ON raw_material_logs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
