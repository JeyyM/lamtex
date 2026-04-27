-- order_status: rename Picking → Loading (PostgreSQL 10+)
-- fulfillment_status: rename Picking → Loading
-- Optional departure date for logistics (set when status becomes Scheduled)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'Picking'
  ) THEN
    ALTER TYPE order_status RENAME VALUE 'Picking' TO 'Loading';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'fulfillment_status' AND e.enumlabel = 'Picking'
  ) THEN
    ALTER TYPE fulfillment_status RENAME VALUE 'Picking' TO 'Loading';
  END IF;
END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_departure_date DATE;

COMMENT ON COLUMN orders.scheduled_departure_date IS 'Planned date the order leaves the branch (set when status moves to Scheduled).';
