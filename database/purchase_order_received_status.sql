-- Purchase Order: add "Received" status
--
-- A PO is "Received" once all items are fully received but the balance is not
-- yet fully paid. It only becomes "Completed" when it is BOTH fully received
-- AND fully paid. This widens the status CHECK constraint to allow 'Received'.
--
-- Idempotent: safe to re-run.

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN (
    'Draft','Requested','Rejected','Accepted','Sent',
    'Confirmed','Partially Received','Received','Completed','Cancelled'
  ));
