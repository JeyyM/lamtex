-- Delete / immutability policy: void proofs, revoke portals, archive master data, block Tier A deletes.
-- Folded into database/schema.sql — run this migration on live Supabase before deploying app changes.

-- ── proof_status: add voided ─────────────────────────────────────────────
ALTER TYPE proof_status ADD VALUE IF NOT EXISTS 'voided';

-- ── Proof void columns ─────────────────────────────────────────────────────
ALTER TABLE order_proof_documents
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

ALTER TABLE purchase_order_proof_documents
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- ── Customer portal revoke ─────────────────────────────────────────────────
ALTER TABLE order_customer_portals
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS revoke_reason TEXT;

-- ── Master-data archive ────────────────────────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE raw_materials
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- ── Trip archive (keep row after ops history) ────────────────────────────────
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_archived_at ON customers(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_archived_at ON employees(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_archived_at ON suppliers(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_archived_at ON products(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_archived_at ON product_variants(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_materials_archived_at ON raw_materials(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trips_archived_at ON trips(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_customer_portals_revoked ON order_customer_portals(revoked_at) WHERE revoked_at IS NOT NULL;

-- Portal revoke is enforced in get_public_order_summary (see database/schema.sql).

-- ── Tier A: block DELETE for authenticated app users ───────────────────────
CREATE OR REPLACE FUNCTION public.deny_authenticated_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Direct DELETE on % is not permitted. Use cancel, void, or archive instead.', TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders',
    'order_line_items',
    'order_proof_documents',
    'order_logs',
    'order_customer_portals',
    'digital_receipts',
    'invoices',
    'agent_commissions'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_deny_delete_%I ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_deny_delete_%I BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION public.deny_authenticated_delete()',
      t, t
    );
  END LOOP;
END $$;

-- Employees: block hard delete when commission history exists (extra guard beyond UI)
CREATE OR REPLACE FUNCTION public.deny_employee_delete_with_commissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN OLD;
  END IF;
  IF EXISTS (SELECT 1 FROM agent_commissions ac WHERE ac.employee_id = OLD.id LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot delete employee with commission history. Archive instead.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_deny_employee_delete_commissions ON employees;
CREATE TRIGGER trg_deny_employee_delete_commissions
  BEFORE DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION public.deny_employee_delete_with_commissions();
