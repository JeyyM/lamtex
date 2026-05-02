-- =============================================================================
-- Demo data: trucking / shipping fields on product_variants (testing only)
-- Fills weight_kg, length_m, volume_cbm, wall_thickness_mm, outer_diameter_mm
-- with plausible PVC/pipe-ish ranges. Not calibrated to real SKUs.
--
-- Requires: columns from schema + product_variant_shipping_dimensions.sql
--           (especially volume_cbm).
--
-- Usage: Supabase SQL Editor — run once. Uses random(); each run differs slightly.
--        To only backfill missing values, switch to the second UPDATE (commented).
-- =============================================================================

BEGIN;

-- Primary update: overwrite trucking columns for every active variant (sandbox/testing).
UPDATE product_variants
SET
  weight_kg          = round((1.2 + random() * 14.0)::numeric, 3),
  length_m           = round((2.0 + random() * 4.0)::numeric, 2),
  volume_cbm         = round((0.006 + random() * 0.094)::numeric, 6),
  wall_thickness_mm  = round((2.0 + random() * 14.0)::numeric, 2),
  outer_diameter_mm  = round((28 + random() * 222)::numeric, 1),
  updated_at         = now()
WHERE status = 'Active';

-- Rough inner Ø for pipe-shaped SKUs (optional; keep non-negative).
UPDATE product_variants
SET
  inner_diameter_mm = greatest(
    round((outer_diameter_mm - 2 * coalesce(wall_thickness_mm, 0))::numeric, 2),
    0
  ),
  updated_at = now()
WHERE status = 'Active'
  AND outer_diameter_mm IS NOT NULL
  AND wall_thickness_mm IS NOT NULL;

COMMIT;

-- -----------------------------------------------------------------------------
-- Alternative: fill ONLY where shipping volume is still null (keeps manual edits).
-- Comment out the block above and use this instead if you prefer.
-- -----------------------------------------------------------------------------
--
-- BEGIN;
-- UPDATE product_variants
-- SET
--   weight_kg          = coalesce(weight_kg, round((1.2 + random() * 14.0)::numeric, 3)),
--   length_m           = coalesce(length_m, round((2.0 + random() * 4.0)::numeric, 2)),
--   volume_cbm         = coalesce(volume_cbm, round((0.006 + random() * 0.094)::numeric, 6)),
--   wall_thickness_mm  = coalesce(wall_thickness_mm, round((2.0 + random() * 14.0)::numeric, 2)),
--   outer_diameter_mm  = coalesce(outer_diameter_mm, round((28 + random() * 222)::numeric, 1)),
--   updated_at         = now()
-- WHERE status = 'Active'
--   AND (volume_cbm IS NULL OR weight_kg IS NULL);
-- COMMIT;
