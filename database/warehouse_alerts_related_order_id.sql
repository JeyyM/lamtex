-- Links warehouse loading/stock problem reports to orders for display on order detail, warehouse, and logistics.
ALTER TABLE warehouse_alerts
  ADD COLUMN IF NOT EXISTS related_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_alerts_related_order_id ON warehouse_alerts(related_order_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_alerts_branch_created_at ON warehouse_alerts(branch_id, created_at DESC);
