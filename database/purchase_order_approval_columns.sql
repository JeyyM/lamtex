-- Run once in Supabase if purchase_orders lacks acceptance / rejection audit fields.
-- Safe to re-run: uses IF NOT EXISTS.

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS accepted_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejected_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
