-- Planned departure for IBR logistics (mirrors orders.scheduled_departure_date; set when moving to Scheduled).
ALTER TABLE inter_branch_requests
  ADD COLUMN IF NOT EXISTS scheduled_departure_date DATE;
