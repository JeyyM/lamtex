-- ============================================================================
-- customer_code.sql
-- Human-readable customer IDs: CUS-{BRANCH}-{NNNNNN} (e.g. CUS-BTG-000042)
--
-- Run once in Supabase SQL Editor on live DB (existing customers backfilled).
-- New rows get a code automatically via BEFORE INSERT trigger.
--
-- Safe to re-run (idempotent).
-- ============================================================================

BEGIN;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50);

-- Backfill existing rows (stable order per branch)
WITH numbered AS (
  SELECT
    c.id,
    COALESCE(NULLIF(TRIM(b.code), ''), 'GEN') AS branch_code,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(c.branch_id, '00000000-0000-0000-0000-000000000000'::UUID)
      ORDER BY c.created_at NULLS LAST, c.id
    ) AS rn
  FROM customers c
  LEFT JOIN branches b ON b.id = c.branch_id
  WHERE c.customer_code IS NULL OR TRIM(c.customer_code) = ''
)
UPDATE customers c
SET
  customer_code = 'CUS-' || n.branch_code || '-' || lpad(n.rn::TEXT, 6, '0'),
  updated_at    = NOW()
FROM numbered n
WHERE c.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_customer_code
  ON customers(customer_code)
  WHERE customer_code IS NOT NULL AND TRIM(customer_code) <> '';

-- ---------------------------------------------------------------------------
-- next_customer_code(branch_id) — used by trigger and callable from app/RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_customer_code(p_branch_id UUID)
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
  IF p_branch_id IS NOT NULL THEN
    SELECT b.code INTO v_branch_code FROM branches b WHERE b.id = p_branch_id;
  END IF;
  v_prefix := 'CUS-' || COALESCE(NULLIF(TRIM(v_branch_code), ''), 'GEN') || '-';

  SELECT COALESCE(
    MAX(
      NULLIF(
        regexp_replace(substring(c.customer_code FROM char_length(v_prefix) + 1), '[^0-9]', '', 'g'),
        ''
      )::INT
    ),
    0
  ) + 1
  INTO v_next
  FROM customers c
  WHERE c.customer_code LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_next::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_customer_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_customer_code(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_customers_assign_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_code IS NULL OR TRIM(NEW.customer_code) = '' THEN
    NEW.customer_code := public.next_customer_code(NEW.branch_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_assign_customer_code ON customers;
CREATE TRIGGER customers_assign_customer_code
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_customers_assign_customer_code();

COMMIT;

-- Verification
SELECT b.code AS branch, COUNT(*) AS customers, MIN(c.customer_code) AS sample_min, MAX(c.customer_code) AS sample_max
FROM customers c
LEFT JOIN branches b ON b.id = c.branch_id
GROUP BY b.code
ORDER BY b.code;

SELECT COUNT(*) FILTER (WHERE customer_code IS NULL OR TRIM(customer_code) = '') AS missing_code
FROM customers;
