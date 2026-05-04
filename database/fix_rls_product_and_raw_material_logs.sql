-- Run once if you already created product_logs / raw_material_logs but activity is empty.
-- (Tables existed without RLS policies — Supabase blocks reads/writes when RLS is on and no policy matches.)

ALTER TABLE IF EXISTS product_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_logs_auth" ON product_logs;
CREATE POLICY "product_logs_auth" ON product_logs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE IF EXISTS raw_material_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "raw_material_logs_auth" ON raw_material_logs;
CREATE POLICY "raw_material_logs_auth" ON raw_material_logs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
