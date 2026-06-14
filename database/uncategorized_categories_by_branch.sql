-- Per-branch "Uncategorized" product and material categories.
-- Standard: name = 'Uncategorized', slug = 'uncategorized' (unique per branch).
-- Safe to re-run.

-- ── Product categories: slug unique per branch (not globally) ─────────────
ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_slug_key;
ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_branch_slug_unique;
DROP INDEX IF EXISTS product_categories_slug_key;
DROP INDEX IF EXISTS idx_product_categories_branch_slug;

-- Collapse duplicate (branch, slug) rows before adding uniqueness (keep oldest id).
DELETE FROM product_categories pc
USING product_categories pc2
WHERE pc.branch IS NOT DISTINCT FROM pc2.branch
  AND pc.slug = pc2.slug
  AND pc.id > pc2.id;

ALTER TABLE product_categories
  ADD CONSTRAINT product_categories_branch_slug_unique UNIQUE (branch, slug);

-- ── Material categories: name/slug unique per branch; globals stay unique ───
ALTER TABLE material_categories DROP CONSTRAINT IF EXISTS material_categories_name_key;
ALTER TABLE material_categories DROP CONSTRAINT IF EXISTS material_categories_slug_key;
ALTER TABLE material_categories DROP CONSTRAINT IF EXISTS material_categories_branch_slug_unique;
ALTER TABLE material_categories DROP CONSTRAINT IF EXISTS material_categories_branch_name_unique;
DROP INDEX IF EXISTS idx_material_categories_branch_name;
DROP INDEX IF EXISTS idx_material_categories_branch_slug;
DROP INDEX IF EXISTS idx_material_categories_global_name;
DROP INDEX IF EXISTS idx_material_categories_global_slug;

DELETE FROM material_categories mc
USING material_categories mc2
WHERE mc.branch_id IS NOT DISTINCT FROM mc2.branch_id
  AND mc.slug = mc2.slug
  AND mc.id > mc2.id;

DELETE FROM material_categories mc
USING material_categories mc2
WHERE mc.branch_id IS NOT DISTINCT FROM mc2.branch_id
  AND mc.name = mc2.name
  AND mc.id > mc2.id;

ALTER TABLE material_categories
  ADD CONSTRAINT material_categories_branch_slug_unique UNIQUE (branch_id, slug);

ALTER TABLE material_categories
  ADD CONSTRAINT material_categories_branch_name_unique UNIQUE (branch_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_material_categories_global_name
  ON material_categories (name)
  WHERE branch_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_material_categories_global_slug
  ON material_categories (slug)
  WHERE branch_id IS NULL;

-- Slug for uncategorized buckets (same on every branch; branch column disambiguates).
CREATE OR REPLACE FUNCTION public.branch_uncategorized_slug(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 'uncategorized'::TEXT;
$$;

-- Migrate legacy branch-prefixed uncategorized rows
UPDATE product_categories
SET slug = 'uncategorized',
    name = 'Uncategorized',
    updated_at = NOW()
WHERE slug IN ('m-uncategorized', 'c-uncategorized', 'b-uncategorized')
   OR slug LIKE '%-uncategorized';

UPDATE material_categories
SET slug = 'uncategorized',
    name = 'Uncategorized',
    updated_at = NOW()
WHERE slug IN ('m-uncategorized', 'c-uncategorized', 'b-uncategorized')
   OR slug LIKE '%-uncategorized';

-- Product categories (branch = branches.name) — upsert without ON CONFLICT
INSERT INTO product_categories (name, slug, description, sort_order, is_active, branch)
SELECT
  'Uncategorized',
  'uncategorized',
  'Default category for products without an assigned category',
  9999,
  true,
  b.name
FROM branches b
WHERE b.is_active IS DISTINCT FROM false
  AND NOT EXISTS (
    SELECT 1
    FROM product_categories pc
    WHERE pc.branch = b.name
      AND pc.slug = 'uncategorized'
  );

UPDATE product_categories pc
SET name        = 'Uncategorized',
    description = 'Default category for products without an assigned category',
    sort_order  = 9999,
    is_active   = true,
    updated_at  = NOW()
FROM branches b
WHERE pc.branch = b.name
  AND pc.slug = 'uncategorized'
  AND b.is_active IS DISTINCT FROM false;

-- Material categories (scoped by branch_id)
INSERT INTO material_categories (name, slug, description, sort_order, is_active, branch_id)
SELECT
  'Uncategorized',
  'uncategorized',
  'Default category for raw materials without an assigned category',
  9999,
  true,
  b.id
FROM branches b
WHERE b.is_active IS DISTINCT FROM false
  AND NOT EXISTS (
    SELECT 1
    FROM material_categories mc
    WHERE mc.branch_id = b.id
      AND mc.slug = 'uncategorized'
  );

UPDATE material_categories mc
SET name        = 'Uncategorized',
    description = 'Default category for raw materials without an assigned category',
    sort_order  = 9999,
    is_active   = true,
    updated_at  = NOW()
FROM branches b
WHERE mc.branch_id = b.id
  AND mc.slug = 'uncategorized'
  AND b.is_active IS DISTINCT FROM false;

-- Assign uncategorized product category by product.branch (fallback: Manila / MNL)
UPDATE products p
SET category_id = pc.id,
    updated_at  = NOW()
FROM product_categories pc
JOIN branches b ON b.name = pc.branch
WHERE p.category_id IS NULL
  AND pc.slug = 'uncategorized'
  AND (
    (p.branch IS NOT NULL AND trim(p.branch) = b.name)
    OR (
      p.branch IS NULL
      AND b.code = 'MNL'
    )
  );

-- Products still without category: match via branch name prefix (short names e.g. "Manila")
UPDATE products p
SET category_id = pc.id,
    updated_at  = NOW()
FROM branches b
JOIN product_categories pc
  ON pc.branch = b.name
 AND pc.slug = 'uncategorized'
WHERE p.category_id IS NULL
  AND p.branch IS NOT NULL
  AND (
    b.name ILIKE p.branch || '%'
    OR p.branch ILIKE split_part(b.name, ' ', 1) || '%'
  );

-- Materials without category: primary stock branch (highest quantity)
UPDATE raw_materials rm
SET category_id = picked.category_id,
    updated_at  = NOW()
FROM (
  SELECT DISTINCT ON (ms.material_id)
    ms.material_id,
    mc.id AS category_id
  FROM material_stock ms
  JOIN branches b ON b.id = ms.branch_id
  JOIN material_categories mc
    ON mc.branch_id = b.id
   AND mc.slug = 'uncategorized'
  ORDER BY ms.material_id, ms.quantity DESC NULLS LAST
) picked
WHERE rm.id = picked.material_id
  AND rm.category_id IS NULL;

-- Remaining materials without category → Manila uncategorized
UPDATE raw_materials rm
SET category_id = pc.id,
    updated_at  = NOW()
FROM material_categories pc
JOIN branches b ON b.id = pc.branch_id
WHERE rm.category_id IS NULL
  AND pc.slug = 'uncategorized'
  AND b.code = 'MNL';
