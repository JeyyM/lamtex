-- Tracks executive payout of agent commission per payment proof (cash portion only).
-- Run in Supabase SQL editor after order_proof_payment_extension_step2.sql.

ALTER TABLE order_proof_documents
  ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_paid_by VARCHAR(200);

COMMENT ON COLUMN order_proof_documents.commission_paid_at IS 'When executive marked agent commission as paid for this proof (cash payments only)';
COMMENT ON COLUMN order_proof_documents.commission_paid_by IS 'Executive name who released commission for this proof';
