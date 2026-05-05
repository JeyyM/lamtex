-- Social links only. Drops legacy follower column if present; adds is_active + flexible platform labels.

ALTER TABLE company_social_media
  DROP COLUMN IF EXISTS followers;

ALTER TABLE company_social_media
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE company_social_media SET is_active = TRUE WHERE is_active IS NULL;

ALTER TABLE company_social_media
  ALTER COLUMN platform TYPE VARCHAR(100) USING platform::text;
