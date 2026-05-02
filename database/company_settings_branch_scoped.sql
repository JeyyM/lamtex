-- Company settings scoped per branch + profile fields for Settings UI.
-- Run after company_settings exists. Backup first.

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS employee_count VARCHAR(80),
  ADD COLUMN IF NOT EXISTS company_description TEXT;

COMMENT ON COLUMN company_settings.branch_id IS 'Branch this company_settings row belongs to; one row per branch.';

-- Backfill: only when a single row has no branch yet (avoid violating unique if multiple orphans exist).
UPDATE company_settings cs
SET branch_id = b.id
FROM (SELECT id FROM branches WHERE is_active = true ORDER BY name LIMIT 1) b
WHERE cs.branch_id IS NULL
  AND (SELECT COUNT(*)::int FROM company_settings WHERE branch_id IS NULL) = 1;

-- One settings row per branch (requires populated branch_id for all rows you keep)
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_branch_id_key ON company_settings(branch_id);

-- If index creation fails due to duplicate branch_id or NULLs, clean data then re-run.
