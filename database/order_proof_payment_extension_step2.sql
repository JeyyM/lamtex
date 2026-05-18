-- STEP 2 of 2 — Run only after order_proof_payment_extension.sql (step 1) succeeded.

UPDATE order_proof_documents
SET type = 'other'::proof_type
WHERE type::text = 'receipt';

ALTER TABLE order_proof_documents ADD COLUMN IF NOT EXISTS title VARCHAR(500);
ALTER TABLE order_proof_documents ADD COLUMN IF NOT EXISTS payment_cash_amount NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE order_proof_documents ADD COLUMN IF NOT EXISTS payment_credit_amount NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE order_proof_documents ADD COLUMN IF NOT EXISTS payment_adjustment NUMERIC(14, 2) DEFAULT 0;

COMMENT ON COLUMN order_proof_documents.title IS 'User-visible label / purpose for the file';
COMMENT ON COLUMN order_proof_documents.payment_cash_amount IS 'Non-credit payment amount attributed to this proof (order detail)';
COMMENT ON COLUMN order_proof_documents.payment_credit_amount IS 'Customer credit applied with this proof';
COMMENT ON COLUMN order_proof_documents.payment_adjustment IS 'Manual correction (may be negative) to amount paid';
