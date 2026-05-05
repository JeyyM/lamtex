-- Sync employee_assets with the app (Employee detail: HR assets).
--
-- Run this in the Supabase SQL Editor if you get:
--   Could not find the 'asset_description' column of 'employee_assets' in the schema cache
--
-- PostgREST picks up new columns automatically; refresh the app after running.

ALTER TABLE employee_assets ADD COLUMN IF NOT EXISTS asset_description TEXT;
ALTER TABLE employee_assets ADD COLUMN IF NOT EXISTS category_label VARCHAR(200);

-- Match database/schema.sql (older DBs from original_schema.sql may omit this)
ALTER TABLE employee_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- For rows that already existed when updated_at was added without a backfill
UPDATE employee_assets
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;
