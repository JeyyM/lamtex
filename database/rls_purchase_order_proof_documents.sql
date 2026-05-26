-- ============================================================================
-- PO proof documents: authenticated CRUD (client inserts via anon key + JWT)
--
-- The bootstrap RLS loop in schema.sql only covers tables that existed at
-- install time. purchase_order_proof_documents was added later, so the app
-- gets "new row violates row-level security policy" on receive / upload proof.
--
-- Safe to re-run. Drops legacy auth_* policies if present and recreates
-- permissive lamtex_* policies (same pattern as rls_inventory_stock_adjustment_writes.sql).
-- ============================================================================

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
  ON public.purchase_order_proof_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY lamtex_authenticated_insert_purchase_order_proof_documents
  ON public.purchase_order_proof_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY lamtex_authenticated_update_purchase_order_proof_documents
  ON public.purchase_order_proof_documents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY lamtex_authenticated_delete_purchase_order_proof_documents
  ON public.purchase_order_proof_documents
  FOR DELETE
  TO authenticated
  USING (true);
