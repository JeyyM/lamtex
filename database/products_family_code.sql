-- Product family code (unique per branch when set).
-- Safe to re-run.

ALTER TABLE products ADD COLUMN IF NOT EXISTS family_code VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_family_code_branch_unique
  ON products (branch, lower(trim(family_code)))
  WHERE family_code IS NOT NULL AND trim(family_code) <> '';

COMMENT ON COLUMN products.family_code IS 'Unique product family identifier within a branch (e.g. HDPE-STD).';
