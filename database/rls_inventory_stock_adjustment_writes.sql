-- ============================================================================
-- Stock adjustment + BOM consumption (app writes)
--
-- rls_material_stock_authenticated_read.sql enables RLS and adds SELECT only.
-- Without INSERT/UPDATE on product_variant_stock (and material writes when
-- "consume raw materials" is on), the client gets HTTP 403 from PostgREST.
--
-- Run in Supabase SQL Editor. Safe to re-run (skips if policy name exists).
-- ============================================================================

-- product_variant_stock: upsert branch quantities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_variant_stock'
      AND policyname = 'lamtex_authenticated_insert_product_variant_stock'
  ) THEN
    CREATE POLICY lamtex_authenticated_insert_product_variant_stock
      ON public.product_variant_stock
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_variant_stock'
      AND policyname = 'lamtex_authenticated_update_product_variant_stock'
  ) THEN
    CREATE POLICY lamtex_authenticated_update_product_variant_stock
      ON public.product_variant_stock
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- material_stock + raw_materials: deduct on production consumption
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_stock'
      AND policyname = 'lamtex_authenticated_update_material_stock'
  ) THEN
    CREATE POLICY lamtex_authenticated_update_material_stock
      ON public.material_stock
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'raw_materials'
      AND policyname = 'lamtex_authenticated_update_raw_materials'
  ) THEN
    CREATE POLICY lamtex_authenticated_update_raw_materials
      ON public.raw_materials
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- product_variants + products: totals and roll-up status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_variants'
      AND policyname = 'lamtex_authenticated_update_product_variants'
  ) THEN
    CREATE POLICY lamtex_authenticated_update_product_variants
      ON public.product_variants
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
      AND policyname = 'lamtex_authenticated_update_products'
  ) THEN
    CREATE POLICY lamtex_authenticated_update_products
      ON public.products
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
