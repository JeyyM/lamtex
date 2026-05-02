-- Product variants: shipping / trucking attributes (per inventory unit).
-- Safe to re-run. Apply after `product_variants` exists.
-- weight_kg, length_m, wall_thickness_mm already on product_variants; this adds explicit volume.

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS volume_cbm NUMERIC(12, 6);

COMMENT ON COLUMN product_variants.weight_kg IS 'Mass per inventory unit (kg), e.g. one stick, bundle, or piece—same unit as stock qty';
COMMENT ON COLUMN product_variants.length_m IS 'Longest shipping dimension per unit (m), e.g. pipe stick length';
COMMENT ON COLUMN product_variants.volume_cbm IS 'Shipping/stowage volume per inventory unit (m³); for truck capacity vs max_volume_cbm';
COMMENT ON COLUMN product_variants.outer_diameter_mm IS 'Outside diameter (mm) where applicable (pipe)';
COMMENT ON COLUMN product_variants.inner_diameter_mm IS 'Inside diameter (mm) where applicable';
COMMENT ON COLUMN product_variants.wall_thickness_mm IS 'Wall thickness (mm) where applicable (pipe)';
