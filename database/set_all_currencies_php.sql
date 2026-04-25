-- Normalize all application currency fields to PHP (Philippine peso).
-- Run once after backup if you have legacy USD or other values in the DB.
-- Tables match database/schema.sql currency columns.

BEGIN;

UPDATE suppliers
SET currency = 'PHP'
WHERE currency IS DISTINCT FROM 'PHP';

UPDATE raw_materials
SET currency = 'PHP'
WHERE currency IS DISTINCT FROM 'PHP';

UPDATE purchase_orders
SET currency = 'PHP'
WHERE currency IS DISTINCT FROM 'PHP';

UPDATE company_settings
SET currency = 'PHP'
WHERE currency IS DISTINCT FROM 'PHP';

COMMIT;
