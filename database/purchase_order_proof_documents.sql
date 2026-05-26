-- Purchase order proof documents (delivery, payment, other) — mirrors order_proof_documents.
-- Run in Supabase SQL editor, then run notifications_purchase_order_proof_uploaded.sql for executive proof alerts.
CREATE TABLE IF NOT EXISTS purchase_order_proof_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id     UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  type                  proof_type NOT NULL,
  file_name             VARCHAR(500),
  file_url              TEXT NOT NULL DEFAULT '',
  file_size             BIGINT,
  uploaded_by           VARCHAR(200),
  uploaded_by_role      TEXT,
  status                proof_status DEFAULT 'verified',
  notes                 TEXT,
  title                 VARCHAR(500),
  payment_cash_amount   NUMERIC(14, 2) DEFAULT 0,
  payment_credit_amount NUMERIC(14, 2) DEFAULT 0,
  payment_adjustment    NUMERIC(14, 2) DEFAULT 0,
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_proof_docs_po ON purchase_order_proof_documents(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_proof_docs_type ON purchase_order_proof_documents(purchase_order_id, type);

COMMENT ON TABLE purchase_order_proof_documents IS
  'Delivery, payment, and other proof documents for purchase orders (Documents & Proofs UI).';

-- One-time backfill from legacy purchase_order_receipts (delivery only).
INSERT INTO purchase_order_proof_documents (
  purchase_order_id,
  type,
  file_name,
  file_url,
  file_size,
  uploaded_by,
  uploaded_by_role,
  status,
  uploaded_at
)
SELECT
  r.order_id,
  'delivery'::proof_type,
  r.file_name,
  r.file_url,
  r.file_size,
  r.uploaded_by,
  'Warehouse',
  'verified'::proof_status,
  COALESCE(r.created_at, NOW())
FROM purchase_order_receipts r
WHERE NOT EXISTS (
  SELECT 1
  FROM purchase_order_proof_documents d
  WHERE d.purchase_order_id = r.order_id
    AND d.type = 'delivery'::proof_type
    AND d.file_url = r.file_url
);

-- RLS: permissive authenticated CRUD (see database/rls_purchase_order_proof_documents.sql)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_proof_documents TO authenticated;
ALTER TABLE public.purchase_order_proof_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_select_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS auth_insert_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS auth_update_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS auth_delete_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS lamtex_authenticated_select_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS lamtex_authenticated_insert_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS lamtex_authenticated_update_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS lamtex_authenticated_delete_purchase_order_proof_documents ON public.purchase_order_proof_documents;

CREATE POLICY lamtex_authenticated_select_purchase_order_proof_documents
  ON public.purchase_order_proof_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY lamtex_authenticated_insert_purchase_order_proof_documents
  ON public.purchase_order_proof_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY lamtex_authenticated_update_purchase_order_proof_documents
  ON public.purchase_order_proof_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY lamtex_authenticated_delete_purchase_order_proof_documents
  ON public.purchase_order_proof_documents FOR DELETE TO authenticated USING (true);
