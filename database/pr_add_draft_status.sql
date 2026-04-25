-- Add Draft to production_requests.status (idempotent; run in Supabase SQL on existing DBs).
-- Also sets default to Draft for new rows.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'production_requests' AND c.conname = 'production_requests_status_check'
  ) THEN
    ALTER TABLE production_requests DROP CONSTRAINT production_requests_status_check;
  END IF;
END $$;

ALTER TABLE production_requests
  ADD CONSTRAINT production_requests_status_check
  CHECK (status IN ('Draft', 'Requested', 'Rejected', 'Accepted', 'In Progress', 'Completed', 'Cancelled'));

ALTER TABLE production_requests ALTER COLUMN status SET DEFAULT 'Draft';
