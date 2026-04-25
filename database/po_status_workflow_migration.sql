-- Run once in Supabase SQL editor: worker requests + approval + confirm order workflow
-- If DROP CONSTRAINT fails, find the name with:
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'purchase_orders'::regclass AND contype = 'c';

ALTER TABLE purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN (
    'Draft',
    'Requested',
    'Rejected',
    'Accepted',
    'Sent',
    'Confirmed',
    'Partially Received',
    'Completed',
    'Cancelled'
  ));
