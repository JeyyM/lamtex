-- Migration: store per-item discount breakdown so individual discounts
-- are preserved when editing an order line item.
-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE order_line_items
  ADD COLUMN IF NOT EXISTS discounts_breakdown JSONB DEFAULT NULL;

COMMENT ON COLUMN order_line_items.discounts_breakdown IS
  'JSON array of {name, percentage} objects representing each discount applied to this line item.
   Example: [{"name":"Volume","percentage":10},{"name":"Promo","percentage":5}]';
