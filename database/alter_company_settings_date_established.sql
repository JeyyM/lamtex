-- Date established (full calendar date) for company profile. Run in Supabase SQL Editor.
-- Keeps founded_year populated from the year of this date for backward compatibility.

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS date_established DATE;

COMMENT ON COLUMN company_settings.date_established IS 'Company incorporation / establishment date (calendar day).';

-- Optional: seed from existing founded_year (January 1 of that year)
UPDATE company_settings
SET date_established = make_date(founded_year, 1, 1)
WHERE date_established IS NULL
  AND founded_year IS NOT NULL
  AND founded_year BETWEEN 1000 AND 9999;
