-- Inter-branch transfer / receive: same PO/PR tables with a flag and requesting branch.
-- Run in Supabase SQL if columns are missing. Idempotent.

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS is_transfer_request BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS transfer_requesting_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_transfer
  ON purchase_orders(is_transfer_request) WHERE is_transfer_request = true;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_req_branch
  ON purchase_orders(transfer_requesting_branch_id) WHERE transfer_requesting_branch_id IS NOT NULL;

ALTER TABLE production_requests
  ADD COLUMN IF NOT EXISTS is_transfer_request BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE production_requests
  ADD COLUMN IF NOT EXISTS transfer_requesting_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_production_requests_transfer
  ON production_requests(is_transfer_request) WHERE is_transfer_request = true;
CREATE INDEX IF NOT EXISTS idx_production_requests_req_branch
  ON production_requests(transfer_requesting_branch_id) WHERE transfer_requesting_branch_id IS NOT NULL;
