-- Physical address + map pin for suppliers (WGS84). Run in Supabase SQL Editor.
-- UI: src/pages/SuppliersPage.tsx

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS map_lat NUMERIC(10,7);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS map_lng NUMERIC(10,7);

COMMENT ON COLUMN suppliers.address IS 'Mailing / gate address (display + Google Maps search).';
COMMENT ON COLUMN suppliers.map_lat IS 'Optional WGS84 latitude for depot / office pin.';
COMMENT ON COLUMN suppliers.map_lng IS 'Optional WGS84 longitude for depot / office pin.';
