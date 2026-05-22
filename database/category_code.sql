-- ============================================================================
-- category_code.sql
-- Human-readable category IDs: CAT-{BRANCH}-{NNNNNN} (e.g. CAT-MNL-000003)
--
-- Run once in Supabase SQL Editor on live DB (existing categories backfilled).
-- New rows get a code automatically via BEFORE INSERT trigger.
--
-- Safe to re-run (idempotent).
-- ============================================================================

BEGIN;

ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS category_code VARCHAR(50);

-- Resolve branch code from `branch` name, else slug prefix (m-/c-/b-), else GEN
CREATE OR REPLACE FUNCTION public.product_category_branch_code(
  p_branch_name TEXT,
  p_slug        TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF p_branch_name IS NOT NULL AND TRIM(p_branch_name) <> '' THEN
    SELECT b.code INTO v_code FROM branches b WHERE b.name = TRIM(p_branch_name);
    IF v_code IS NOT NULL AND TRIM(v_code) <> '' THEN
      RETURN TRIM(v_code);
    END IF;
  END IF;

  IF p_slug IS NOT NULL THEN
    IF p_slug LIKE 'm-%' THEN RETURN 'MNL'; END IF;
    IF p_slug LIKE 'c-%' THEN RETURN 'CEB'; END IF;
    IF p_slug LIKE 'b-%' THEN RETURN 'BTG'; END IF;
  END IF;

  RETURN 'GEN';
END;
$$;

-- Backfill existing rows (stable order per branch code: sort_order, created_at, id)
WITH numbered AS (
  SELECT
    pc.id,
    public.product_category_branch_code(pc.branch, pc.slug) AS branch_code,
    ROW_NUMBER() OVER (
      PARTITION BY public.product_category_branch_code(pc.branch, pc.slug)
      ORDER BY pc.sort_order NULLS LAST, pc.created_at NULLS LAST, pc.id
    ) AS rn
  FROM product_categories pc
  WHERE pc.category_code IS NULL OR TRIM(pc.category_code) = ''
)
UPDATE product_categories pc
SET
  category_code = 'CAT-' || n.branch_code || '-' || lpad(n.rn::TEXT, 6, '0'),
  updated_at    = NOW()
FROM numbered n
WHERE pc.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_category_code
  ON product_categories(category_code)
  WHERE category_code IS NOT NULL AND TRIM(category_code) <> '';

CREATE OR REPLACE FUNCTION public.next_category_code(p_branch_name TEXT, p_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_code TEXT;
  v_prefix      TEXT;
  v_next        INT;
BEGIN
  v_branch_code := public.product_category_branch_code(p_branch_name, p_slug);
  v_prefix := 'CAT-' || v_branch_code || '-';

  SELECT COALESCE(
    MAX(
      NULLIF(
        regexp_replace(substring(pc.category_code FROM char_length(v_prefix) + 1), '[^0-9]', '', 'g'),
        ''
      )::INT
    ),
    0
  ) + 1
  INTO v_next
  FROM product_categories pc
  WHERE pc.category_code LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_next::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_category_code(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_category_code(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_product_categories_assign_category_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category_code IS NULL OR TRIM(NEW.category_code) = '' THEN
    NEW.category_code := public.next_category_code(NEW.branch, NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_categories_assign_category_code ON product_categories;
CREATE TRIGGER product_categories_assign_category_code
  BEFORE INSERT ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_product_categories_assign_category_code();

COMMIT;

-- Verification
SELECT
  public.product_category_branch_code(pc.branch, pc.slug) AS branch_code,
  COUNT(*) AS categories,
  MIN(pc.category_code) AS sample_min,
  MAX(pc.category_code) AS sample_max
FROM product_categories pc
GROUP BY 1
ORDER BY 1;

SELECT COUNT(*) FILTER (WHERE category_code IS NULL OR TRIM(category_code) = '') AS missing_code
FROM product_categories;
