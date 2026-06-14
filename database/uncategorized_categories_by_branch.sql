-- Per-branch "Uncategorized" product and material categories.
-- Safe to re-run (ON CONFLICT / conditional updates).

-- Slug convention: m-/c-/b- for legacy MNL/CEB/BTG; {lowercase-code}-uncategorized otherwise.
CREATE OR REPLACE FUNCTION public.branch_uncategorized_slug(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE upper(trim(COALESCE(p_code, '')))
    WHEN 'MNL' THEN 'm-uncategorized'
    WHEN 'CEB' THEN 'c-uncategorized'
    WHEN 'BTG' THEN 'b-uncategorized'
    ELSE lower(trim(p_code)) || '-uncategorized'
  END;
$$;

-- Product categories (branch = branches.name)
INSERT INTO product_categories (name, slug, description, sort_order, is_active, branch)
SELECT
  b.code || ' — Uncategorized',
  public.branch_uncategorized_slug(b.code),
  'Default category for products without an assigned category',
  9999,
  true,
  b.name
FROM branches b
WHERE b.is_active IS DISTINCT FROM false
ON CONFLICT (slug) DO UPDATE SET
  branch      = EXCLUDED.branch,
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order,
  is_active   = true;

-- Material categories (scoped by branch_id)
INSERT INTO material_categories (name, slug, description, sort_order, is_active, branch_id)
SELECT
  b.code || ' — Uncategorized',
  public.branch_uncategorized_slug(b.code),
  'Default category for raw materials without an assigned category',
  9999,
  true,
  b.id
FROM branches b
WHERE b.is_active IS DISTINCT FROM false
ON CONFLICT (slug) DO UPDATE SET
  branch_id   = EXCLUDED.branch_id,
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order,
  is_active   = true;

-- Assign uncategorized product category by product.branch (fallback: Manila / MNL)
UPDATE products p
SET category_id = pc.id,
    updated_at  = NOW()
FROM product_categories pc
JOIN branches b ON b.name = pc.branch
WHERE p.category_id IS NULL
  AND pc.slug = public.branch_uncategorized_slug(b.code)
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
  ON pc.slug = public.branch_uncategorized_slug(b.code)
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
   AND mc.slug = public.branch_uncategorized_slug(b.code)
  ORDER BY ms.material_id, ms.quantity DESC NULLS LAST
) picked
WHERE rm.id = picked.material_id
  AND rm.category_id IS NULL;

-- Remaining materials without category → MNL uncategorized
UPDATE raw_materials rm
SET category_id = pc.id,
    updated_at  = NOW()
FROM material_categories pc
WHERE rm.category_id IS NULL
  AND pc.slug = 'm-uncategorized';
