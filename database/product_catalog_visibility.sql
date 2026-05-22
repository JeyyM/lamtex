-- ============================================================================
-- product_catalog_visibility.sql
-- Per-product catalog visibility (categories use existing is_active column).
--
-- Hidden categories grey out in catalog UI and exclude from order pickers.
-- Hidden products can be toggled individually; a hidden category hides all
-- products in it regardless of product.is_hidden.
--
-- Safe to re-run (idempotent).
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_is_hidden
  ON products(is_hidden)
  WHERE is_hidden = TRUE;
