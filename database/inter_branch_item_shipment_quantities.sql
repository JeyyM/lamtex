-- Per-line cumulative shipped / delivered (mirrors order line shipment pattern).
-- Run in Supabase SQL Editor; safe to re-run (IF NOT EXISTS / guarded constraints).

ALTER TABLE inter_branch_request_items
  ADD COLUMN IF NOT EXISTS quantity_shipped NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_delivered NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Backfill rows on requests that already moved stock under the legacy "full line" behavior.
UPDATE inter_branch_request_items i
SET
  quantity_shipped = i.quantity,
  quantity_delivered = i.quantity
FROM inter_branch_requests r
WHERE i.request_id = r.id
  AND r.status IN ('Delivered', 'Fulfilled', 'Completed');

UPDATE inter_branch_request_items i
SET
  quantity_shipped = i.quantity,
  quantity_delivered = 0
FROM inter_branch_requests r
WHERE i.request_id = r.id
  AND r.status IN ('In Transit', 'Partially Fulfilled');

DO $$
BEGIN
  ALTER TABLE inter_branch_request_items
    ADD CONSTRAINT ibr_item_shipped_lte_ordered CHECK (quantity_shipped <= quantity);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE inter_branch_request_items
    ADD CONSTRAINT ibr_item_delivered_lte_shipped CHECK (quantity_delivered <= quantity_shipped);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
