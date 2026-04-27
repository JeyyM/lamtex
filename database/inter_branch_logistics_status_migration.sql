-- Extend inter_branch_requests.status with the same logistics pipeline as orders (after approval).
-- Run once in Supabase SQL editor.

ALTER TABLE inter_branch_requests
  DROP CONSTRAINT IF EXISTS inter_branch_requests_status_check;

ALTER TABLE inter_branch_requests
  ADD CONSTRAINT inter_branch_requests_status_check
  CHECK (
    status IN (
      'Draft',
      'Pending',
      'Approved',
      'Rejected',
      'Cancelled',
      'Fulfilled',
      'Scheduled',
      'Loading',
      'Packed',
      'Ready',
      'In Transit',
      'Delivered',
      'Partially Fulfilled',
      'Completed'
    )
  );
