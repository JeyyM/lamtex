-- Fleet trucks: extra columns for fleet management UI + detail page.
-- Safe to re-run (IF NOT EXISTS). Apply after core `vehicles` table exists.

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS make VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year_model INT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS orcr_number VARCHAR(80);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_odometer_km NUMERIC(12, 1) DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_type VARCHAR(120);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_length_m NUMERIC(10, 2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_width_m NUMERIC(10, 2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_height_m NUMERIC(10, 2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fleet_cards TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS date_first_registered DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS date_acquired DATE;

COMMENT ON COLUMN vehicles.make IS 'Truck manufacturer (e.g. Isuzu)';
COMMENT ON COLUMN vehicles.model IS 'Truck model name';
COMMENT ON COLUMN vehicles.year_model IS 'Model year';
COMMENT ON COLUMN vehicles.current_odometer_km IS 'Odometer reading in kilometers';
COMMENT ON COLUMN vehicles.engine_type IS 'Free-text engine label (e.g. Diesel, Euro 5) — user-defined';
COMMENT ON COLUMN vehicles.vehicle_length_m IS 'Body length in meters';
COMMENT ON COLUMN vehicles.vehicle_width_m IS 'Body width in meters';
COMMENT ON COLUMN vehicles.vehicle_height_m IS 'Body height in meters';
COMMENT ON COLUMN vehicles.fleet_cards IS 'Fuel / toll fleet card refs or notes';
COMMENT ON COLUMN vehicles.date_first_registered IS 'LTO / OR-CR registration date (display)';
COMMENT ON COLUMN vehicles.date_acquired IS 'Company acquisition date for the vehicle';

ALTER TABLE trip_history ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trip_history_vehicle_id ON trip_history(vehicle_id);
