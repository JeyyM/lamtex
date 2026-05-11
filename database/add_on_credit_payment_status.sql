-- Add 'On Credit' to the payment_status enum.
-- Orders whose remaining balance is covered by the customer's credit limit
-- are tagged with this status instead of 'Paid'.
-- Overdue still takes precedence when the payment-terms period elapses.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'On Credit'
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'On Credit';
  END IF;
END $$;
