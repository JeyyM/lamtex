-- Separate free-form logistics notes from trip delay explanation (delay_reason).
ALTER TABLE trips ADD COLUMN IF NOT EXISTS logistics_notes TEXT;

COMMENT ON COLUMN trips.logistics_notes IS 'Dispatch / route / driver instructions (not the delay explanation; use delay_reason for delays).';
