-- Public read access for the Lamtex Catalogue site (anon key).
-- Exposes only active, non-hidden products/categories/variants via RLS.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_categories'
      AND policyname = 'anon_select_public_product_categories'
  ) THEN
    CREATE POLICY anon_select_public_product_categories
      ON public.product_categories
      FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
      AND policyname = 'anon_select_public_products'
  ) THEN
    CREATE POLICY anon_select_public_products
      ON public.products
      FOR SELECT
      TO anon
      USING (
        NOT is_hidden
        AND status = 'Active'::product_status
        AND category_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.product_categories pc
          WHERE pc.id = products.category_id AND pc.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_variants'
      AND policyname = 'anon_select_public_product_variants'
  ) THEN
    CREATE POLICY anon_select_public_product_variants
      ON public.product_variants
      FOR SELECT
      TO anon
      USING (
        NOT is_hidden
        AND status = 'Active'::product_status
        AND EXISTS (
          SELECT 1 FROM public.products p
          WHERE p.id = product_variants.product_id
            AND NOT p.is_hidden
            AND p.status = 'Active'::product_status
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'branches'
      AND policyname = 'anon_select_public_branches'
  ) THEN
    CREATE POLICY anon_select_public_branches
      ON public.branches
      FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END $$;
