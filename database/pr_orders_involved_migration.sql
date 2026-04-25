-- Links customer orders to a production request (context: what sales orders the run is for).
-- Run in Supabase SQL if `production_request_orders` does not exist yet.

CREATE TABLE IF NOT EXISTS production_request_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES production_requests(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_production_request_orders_request
  ON production_request_orders(request_id);
CREATE INDEX IF NOT EXISTS idx_production_request_orders_order
  ON production_request_orders(order_id);

ALTER TABLE production_request_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pro_auth" ON production_request_orders;
CREATE POLICY "pro_auth" ON production_request_orders
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
