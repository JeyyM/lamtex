-- ============================================================================
-- Inter-Branch Request ↔ Trip linkage
--
-- Lets an IBR departure be assigned to a fleet vehicle (truck) so the shipment
-- shows on the logistics / truck schedule and the same truck cannot be
-- double-booked on a date that already holds an order trip or another IBR.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- A trip row can belong to an inter-branch request instead of (or in addition
-- to) customer orders. When set, the trip reserves the vehicle for the IBR.
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS inter_branch_request_id UUID
  REFERENCES inter_branch_requests(id) ON DELETE SET NULL;

-- The IBR points back at the trip created when its departure was scheduled.
ALTER TABLE inter_branch_requests
  ADD COLUMN IF NOT EXISTS linked_trip_id UUID
  REFERENCES trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trips_inter_branch_request
  ON trips(inter_branch_request_id);

CREATE INDEX IF NOT EXISTS idx_ibr_linked_trip
  ON inter_branch_requests(linked_trip_id);

COMMENT ON COLUMN trips.inter_branch_request_id IS
  'When set, this trip reserves the vehicle for an inter-branch request shipment (no customer orders).';
COMMENT ON COLUMN inter_branch_requests.linked_trip_id IS
  'Trip created when this IBR departure was scheduled to a fleet vehicle.';
