-- Company HQ map pin: first-class nullable columns (optional).
-- Run in Supabase SQL editor or psql after backup.
-- App code mirrors the same values into metadata.hq_map for older consumers.

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS hq_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS hq_longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS hq_location_label VARCHAR(300);

COMMENT ON COLUMN company_settings.hq_latitude IS 'Optional WGS84 latitude for registered HQ / map pin.';
COMMENT ON COLUMN company_settings.hq_longitude IS 'Optional WGS84 longitude for registered HQ / map pin.';
COMMENT ON COLUMN company_settings.hq_location_label IS 'Optional label shown with HQ (e.g. head office name).';

-- Optional structured HQ mailing address (manual entry; independent of map pin)
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS hq_street TEXT,
  ADD COLUMN IF NOT EXISTS hq_city VARCHAR(200),
  ADD COLUMN IF NOT EXISTS hq_province VARCHAR(200),
  ADD COLUMN IF NOT EXISTS hq_postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS hq_country VARCHAR(100);

COMMENT ON COLUMN company_settings.hq_street IS 'Optional HQ street / building line.';
COMMENT ON COLUMN company_settings.hq_city IS 'Optional city or municipality.';
COMMENT ON COLUMN company_settings.hq_province IS 'Optional province or region.';
COMMENT ON COLUMN company_settings.hq_postal_code IS 'Optional ZIP / postal code.';
COMMENT ON COLUMN company_settings.hq_country IS 'Optional country (e.g. Philippines).';

-- One-time backfill from legacy metadata.hq_map when columns are still empty
UPDATE company_settings
SET
  hq_latitude = (metadata->'hq_map'->>'lat')::numeric,
  hq_longitude = (metadata->'hq_map'->>'lng')::numeric,
  hq_location_label = NULLIF(TRIM(metadata->'hq_map'->>'label'), '')
WHERE
  metadata ? 'hq_map'
  AND metadata->'hq_map' ? 'lat'
  AND metadata->'hq_map' ? 'lng'
  AND hq_latitude IS NULL
  AND hq_longitude IS NULL;

-- Optional: ensure a single company_settings row exists (uncomment and set name if you have none)
-- INSERT INTO company_settings (company_name)
-- SELECT 'Your Company Name'
-- WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);
