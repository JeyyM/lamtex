-- Inter-branch request workflow: one request with lines (materials +/or products),
-- boss approval, then linked PO (requesting branch / receive) and PR (fulfilling / ship).
-- Run in Supabase after prior migrations. Idempotent where possible.

-- 1) Core tables
CREATE TABLE IF NOT EXISTS inter_branch_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ibr_number        TEXT NOT NULL UNIQUE,
  requesting_branch_id  UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  fulfilling_branch_id  UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status            TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft','Pending','Approved','Rejected','Fulfilled','Cancelled')),
  notes             TEXT,
  created_by        TEXT,
  submitted_at      TIMESTAMPTZ,
  approved_by       TEXT,
  approved_at       TIMESTAMPTZ,
  rejected_by       TEXT,
  rejection_reason  TEXT,
  cancelled_by      TEXT,
  cancelled_at      TIMESTAMPTZ,
  fulfilled_by      TEXT,
  fulfilled_at      TIMESTAMPTZ,
  linked_purchase_order_id   UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  linked_production_request_id UUID REFERENCES production_requests(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ibr_different_branches CHECK (requesting_branch_id IS DISTINCT FROM fulfilling_branch_id)
);

CREATE TABLE IF NOT EXISTS inter_branch_request_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         UUID NOT NULL REFERENCES inter_branch_requests(id) ON DELETE CASCADE,
  line_kind          TEXT NOT NULL
    CHECK (line_kind IN ('raw_material', 'product')),
  raw_material_id    UUID REFERENCES raw_materials(id) ON DELETE RESTRICT,
  product_id         UUID REFERENCES products(id) ON DELETE RESTRICT,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity           NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ibr_item_raw CHECK (
    line_kind <> 'raw_material' OR
    (raw_material_id IS NOT NULL AND product_id IS NULL AND product_variant_id IS NULL)
  ),
  CONSTRAINT ibr_item_product CHECK (
    line_kind <> 'product' OR
    (raw_material_id IS NULL AND product_id IS NOT NULL AND product_variant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ibr_status ON inter_branch_requests(status);
CREATE INDEX IF NOT EXISTS idx_ibr_requesting ON inter_branch_requests(requesting_branch_id);
CREATE INDEX IF NOT EXISTS idx_ibr_fulfilling ON inter_branch_requests(fulfilling_branch_id);
CREATE INDEX IF NOT EXISTS idx_ibr_items_request ON inter_branch_request_items(request_id);

-- 2) Link from PO/PR back to master request
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS inter_branch_request_id UUID REFERENCES inter_branch_requests(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_ibr
  ON purchase_orders(inter_branch_request_id) WHERE inter_branch_request_id IS NOT NULL;

ALTER TABLE production_requests
  ADD COLUMN IF NOT EXISTS inter_branch_request_id UUID REFERENCES inter_branch_requests(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_production_requests_ibr
  ON production_requests(inter_branch_request_id) WHERE inter_branch_request_id IS NOT NULL;

-- 3) RLS (match project pattern: any authenticated user)
ALTER TABLE inter_branch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE inter_branch_request_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY auth_select_inter_branch_requests ON inter_branch_requests FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY auth_insert_inter_branch_requests ON inter_branch_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY auth_update_inter_branch_requests ON inter_branch_requests FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY auth_delete_inter_branch_requests ON inter_branch_requests FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY auth_select_inter_branch_request_items ON inter_branch_request_items FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY auth_insert_inter_branch_request_items ON inter_branch_request_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY auth_update_inter_branch_request_items ON inter_branch_request_items FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY auth_delete_inter_branch_request_items ON inter_branch_request_items FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

