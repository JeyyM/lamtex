-- Map coordinates per company address (WGS84). Run in Supabase SQL Editor.

ALTER TABLE company_addresses
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

COMMENT ON COLUMN company_addresses.latitude IS 'Optional WGS84 latitude (map pin).';
COMMENT ON COLUMN company_addresses.longitude IS 'Optional WGS84 longitude (map pin).';
