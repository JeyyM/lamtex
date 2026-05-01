-- Run in Supabase SQL editor (once): IBR activity log + proof-of-delivery images (requesting branch).

CREATE TABLE IF NOT EXISTS inter_branch_request_logs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inter_branch_request_id  UUID NOT NULL REFERENCES inter_branch_requests(id) ON DELETE CASCADE,
  action                   TEXT NOT NULL,
  performed_by             TEXT,
  performed_by_role        TEXT,
  description              TEXT,
  old_value                JSONB,
  new_value                JSONB,
  metadata                 JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ibr_logs_request ON inter_branch_request_logs(inter_branch_request_id);

CREATE TABLE IF NOT EXISTS inter_branch_delivery_proofs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inter_branch_request_id  UUID NOT NULL REFERENCES inter_branch_requests(id) ON DELETE CASCADE,
  file_url                 TEXT NOT NULL,
  file_name                TEXT NOT NULL,
  file_size                INTEGER,
  note                     TEXT,
  uploaded_by              TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ibr_delivery_proofs_request ON inter_branch_delivery_proofs(inter_branch_request_id);

ALTER TABLE inter_branch_request_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ibr_logs_auth" ON inter_branch_request_logs;
CREATE POLICY "ibr_logs_auth" ON inter_branch_request_logs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE inter_branch_delivery_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ibr_delivery_proofs_auth" ON inter_branch_delivery_proofs;
CREATE POLICY "ibr_delivery_proofs_auth" ON inter_branch_delivery_proofs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
