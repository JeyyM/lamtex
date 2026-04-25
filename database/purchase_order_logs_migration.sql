-- Run in Supabase SQL editor (once) if `purchase_order_logs` does not exist yet.

CREATE TABLE IF NOT EXISTS purchase_order_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID        NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  action              TEXT        NOT NULL,
  performed_by        TEXT,
  performed_by_role   TEXT,
  description         TEXT,
  old_value           JSONB,
  new_value           JSONB,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_logs_order ON purchase_order_logs(order_id);

ALTER TABLE purchase_order_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "po_logs_auth" ON purchase_order_logs;
CREATE POLICY "po_logs_auth" ON purchase_order_logs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
