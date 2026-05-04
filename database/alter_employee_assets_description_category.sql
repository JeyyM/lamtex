-- Optional description and free-text category label for employee assets (simplified HR UI).
ALTER TABLE employee_assets ADD COLUMN IF NOT EXISTS asset_description TEXT;
ALTER TABLE employee_assets ADD COLUMN IF NOT EXISTS category_label VARCHAR(200);
