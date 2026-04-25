-- Product production requests (PR): workers raise requests; leadership approves before work starts.
-- Canonical definitions: database/schema.sql (section 12c + Purchase indexes).
-- Run this file once in the Supabase SQL editor on an existing DB that does not yet have these objects.
-- If you use a full schema.sql bootstrap, these CREATE IF NOT EXISTS / policies are idempotent.

-- ── Header ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number                TEXT NOT NULL UNIQUE,
  branch_id                UUID REFERENCES branches(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Requested', 'Rejected', 'Accepted', 'In Progress', 'Completed', 'Cancelled')),
  request_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_completion_date DATE,
  notes                    TEXT,
  created_by               TEXT,
  accepted_by              TEXT,
  accepted_at              TIMESTAMPTZ,
  rejected_by              TEXT,
  rejection_reason         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Line items (finished SKU / quantity to produce) ─────────
CREATE TABLE IF NOT EXISTS production_request_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id           UUID NOT NULL REFERENCES production_requests(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_variant_id   UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity             NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  quantity_completed   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Activity log (mirrors purchase_order_logs) ─────────────
CREATE TABLE IF NOT EXISTS production_request_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID NOT NULL REFERENCES production_requests(id) ON DELETE CASCADE,
  action              TEXT NOT NULL,
  performed_by        TEXT,
  performed_by_role   TEXT,
  description         TEXT,
  old_value           JSONB,
  new_value           JSONB,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_requests_branch ON production_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_production_requests_status ON production_requests(status);
CREATE INDEX IF NOT EXISTS idx_production_request_items_request ON production_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_production_request_logs_req ON production_request_logs(request_id);

ALTER TABLE production_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pr_auth" ON production_requests;
CREATE POLICY "pr_auth" ON production_requests
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pri_auth" ON production_request_items;
CREATE POLICY "pri_auth" ON production_request_items
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "prl_auth" ON production_request_logs;
CREATE POLICY "prl_auth" ON production_request_logs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
