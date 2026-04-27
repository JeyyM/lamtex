-- ============================================================================
-- LAMTEX three sites: descriptive `branches.name` (NCR / Visayas / Calabarzon)
-- Safe to re-run. Keep in sync with `src/constants/lamtexBranches.ts`.
-- ============================================================================

-- Denormalized product/variant `branch` must hold full `branches.name` (was VARCHAR(10) in older DBs).
ALTER TABLE products ALTER COLUMN branch TYPE VARCHAR(100);
ALTER TABLE product_variants ALTER COLUMN branch TYPE VARCHAR(100);

INSERT INTO branches (code, name, is_active) VALUES
  ('MNL', 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market',    TRUE),
  ('CEB', 'Cebu (Visayas) - LAMTEX regional hub & warehouse',  TRUE),
  ('BTG', 'Batangas - LAMTEX plant & Calabarzon staging',       TRUE)
ON CONFLICT (code) DO UPDATE SET
  name      = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

-- `product_categories.branch` = `branches.name` (VARCHAR(50); longest title is 48 chars).
UPDATE product_categories SET branch = 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'   WHERE branch = 'Manila';
UPDATE product_categories SET branch = 'Cebu (Visayas) - LAMTEX regional hub & warehouse'    WHERE branch = 'Cebu';
UPDATE product_categories SET branch = 'Batangas - LAMTEX plant & Calabarzon staging'        WHERE branch = 'Batangas';

-- Map denormalized product/variant `branch` from legacy short names to full titles
UPDATE products p
SET branch = s.new_name
FROM (VALUES
  ('Manila',   'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('Cebu',     'Cebu (Visayas) - LAMTEX regional hub & warehouse'),
  ('Batangas', 'Batangas - LAMTEX plant & Calabarzon staging')
) AS s(old_name, new_name)
WHERE p.branch = s.old_name;

UPDATE product_variants pv
SET branch = s.new_name
FROM (VALUES
  ('Manila',   'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('Cebu',     'Cebu (Visayas) - LAMTEX regional hub & warehouse'),
  ('Batangas', 'Batangas - LAMTEX plant & Calabarzon staging')
) AS s(old_name, new_name)
WHERE pv.branch = s.old_name;
