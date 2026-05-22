-- ============================================================================
-- variant_catalog_visibility.sql
-- Catalog visibility per SKU (product_variants.is_hidden).
-- A product family is hidden in the UI only when ALL its variants are hidden.
-- (Categories still use product_categories.is_active.)
--
-- Safe to re-run (idempotent).
-- ============================================================================

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate legacy product-level hides to all variants on that product
UPDATE product_variants pv
SET is_hidden = TRUE, updated_at = NOW()
FROM products p
WHERE p.id = pv.product_id
  AND p.is_hidden = TRUE
  AND pv.is_hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_product_variants_is_hidden
  ON product_variants(is_hidden)
  WHERE is_hidden = TRUE;
