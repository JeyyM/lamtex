-- IBR delivery proof document type (delivery | other only).

ALTER TABLE inter_branch_delivery_proofs
  ADD COLUMN IF NOT EXISTS proof_type TEXT NOT NULL DEFAULT 'delivery';

DO $$ BEGIN
  ALTER TABLE inter_branch_delivery_proofs
    ADD CONSTRAINT inter_branch_delivery_proofs_type_check
    CHECK (proof_type IN ('delivery', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_ibr_delivery_proofs_type
  ON inter_branch_delivery_proofs(inter_branch_request_id, proof_type);
