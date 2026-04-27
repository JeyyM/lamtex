-- ============================================================================
-- IBR / inventory: allow authenticated users to read material stock & materials
--
-- In the SQL editor, queries run with privileges that **bypass RLS**. The Vite
-- app uses the anon key + user JWT, so RLS applies. If `material_stock` (or
-- `raw_materials`) has RLS enabled but no SELECT policy, the client gets 0
-- rows and inter-branch name matching shows |names@A| 0, |names@B| 0.
--
-- Safe to re-run: only creates a policy if that name is missing.
-- After running, reload the app (signed in) and try the raw material picker.
-- ============================================================================

ALTER TABLE public.material_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_stock ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_stock'
      AND policyname = 'lamtex_authenticated_select_material_stock'
  ) THEN
    CREATE POLICY lamtex_authenticated_select_material_stock
      ON public.material_stock
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'raw_materials'
      AND policyname = 'lamtex_authenticated_select_raw_materials'
  ) THEN
    CREATE POLICY lamtex_authenticated_select_raw_materials
      ON public.raw_materials
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_variant_stock'
      AND policyname = 'lamtex_authenticated_select_product_variant_stock'
  ) THEN
    CREATE POLICY lamtex_authenticated_select_product_variant_stock
      ON public.product_variant_stock
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;
