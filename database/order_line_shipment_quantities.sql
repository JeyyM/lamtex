-- order_line_items: track quantities sent (in transit) and delivered (partial/ full)
-- for stock deduction on "In transit" and later "Mark as delivered" / partial.
-- Safe to re-run on databases that may already have these columns.

ALTER TABLE public.order_line_items
  ADD COLUMN IF NOT EXISTS quantity_shipped INT;

ALTER TABLE public.order_line_items
  ADD COLUMN IF NOT EXISTS quantity_delivered INT;

COMMENT ON COLUMN public.order_line_items.quantity_shipped IS
  'Units removed from branch stock when order went In Transit (per line). NULL if not shipped yet.';

COMMENT ON COLUMN public.order_line_items.quantity_delivered IS
  'Cumulative units recorded as received at consignee (partial or full).';
