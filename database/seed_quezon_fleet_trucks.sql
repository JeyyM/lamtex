-- =============================================================================
-- Seed: Quezon (QZN) demo trucks — “freshly added” fleet units
--
-- Inserts a small set of rigid trucks for branch QZN. Each row matches the
-- state after manual create in the app: available, no current trip, zero trips
-- today, zero utilization, no maintenance due, no alerts, odometer at 0.
--
-- Requires:
--   • branch QZN (seed_quezon_branch_employees.sql)
--   • vehicles table — script adds missing profile columns (same as fleet_trucks_extension.sql)
--
-- Re-runnable:
--   • Upserts on vehicle_id TRK-QZN-SEED-* and resets operational fields so
--     trucks stay in a clean “new” state.
-- =============================================================================

DO $$
DECLARE
  b_id uuid;
BEGIN
  SELECT id INTO b_id FROM branches WHERE code = 'QZN' LIMIT 1;
  IF b_id IS NULL THEN
    RAISE EXCEPTION 'seed_quezon_fleet_trucks: branch QZN not found (run seed_quezon_branch_employees.sql)';
  END IF;

  -- Ensure truck profile columns exist (idempotent; mirrors database/fleet_trucks_extension.sql)
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS make VARCHAR(100);
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model VARCHAR(100);
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year_model INT;
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color VARCHAR(50);
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS orcr_number VARCHAR(80);
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_expiry DATE;
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_odometer_km NUMERIC(12, 1) DEFAULT 0;
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_type VARCHAR(120);
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_length_m NUMERIC(10, 2);
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_width_m NUMERIC(10, 2);
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_height_m NUMERIC(10, 2);
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fleet_cards TEXT;
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS date_first_registered DATE;
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS date_acquired DATE;

  INSERT INTO vehicles (
    vehicle_id,
    vehicle_name,
    plate_number,
    type,
    status,
    financing_status,
    current_trip_id,
    trips_today,
    next_available_time,
    utilization_percent,
    max_weight_kg,
    max_volume_cbm,
    maintenance_due,
    alerts,
    make,
    model,
    year_model,
    color,
    orcr_number,
    registration_expiry,
    current_odometer_km,
    engine_type,
    vehicle_length_m,
    vehicle_width_m,
    vehicle_height_m,
    date_first_registered,
    date_acquired,
    branch_id
  )
  SELECT
    x.vehicle_id,
    x.vehicle_name,
    x.plate_number,
    x.type,
    x.status,
    x.financing_status,
    NULL::uuid,
    0,
    NULL::timestamptz,
    0,
    x.max_weight_kg,
    x.max_volume_cbm,
    NULL::date,
    NULL::text[],
    x.make,
    x.model,
    x.year_model,
    x.color,
    x.orcr_number,
    x.registration_expiry,
    0,
    x.engine_type,
    x.vehicle_length_m,
    x.vehicle_width_m,
    x.vehicle_height_m,
    CURRENT_DATE,
    CURRENT_DATE,
    b_id
  FROM (VALUES
    (
      'TRK-QZN-SEED-01',
      'Quezon Rigid 01',
      'QZN-7001',
      'Truck'::vehicle_type,
      'Available'::vehicle_status,
      'Owned'::financing_status,
      5000::numeric,
      25::numeric,
      'Isuzu',
      'NPR 75L',
      2025,
      'White',
      'OR-QZN-7001',
      (CURRENT_DATE + INTERVAL '3 years')::date,
      'Diesel',
      6.20::numeric,
      2.35::numeric,
      2.45::numeric
    ),
    (
      'TRK-QZN-SEED-02',
      'Quezon Rigid 02',
      'QZN-7002',
      'Truck'::vehicle_type,
      'Available'::vehicle_status,
      'Owned'::financing_status,
      5000::numeric,
      25::numeric,
      'Mitsubishi',
      'Fuso Canter',
      2025,
      'Silver',
      'OR-QZN-7002',
      (CURRENT_DATE + INTERVAL '3 years')::date,
      'Diesel',
      6.15::numeric,
      2.30::numeric,
      2.40::numeric
    ),
    (
      'TRK-QZN-SEED-03',
      'Quezon Wing Van 03',
      'QZN-7003',
      'Truck'::vehicle_type,
      'Available'::vehicle_status,
      'Owned'::financing_status,
      4000::numeric,
      22::numeric,
      'Hino',
      '300 Series',
      2025,
      'Blue',
      'OR-QZN-7003',
      (CURRENT_DATE + INTERVAL '3 years')::date,
      'Diesel',
      6.80::numeric,
      2.45::numeric,
      2.55::numeric
    )
  ) AS x(
    vehicle_id,
    vehicle_name,
    plate_number,
    type,
    status,
    financing_status,
    max_weight_kg,
    max_volume_cbm,
    make,
    model,
    year_model,
    color,
    orcr_number,
    registration_expiry,
    engine_type,
    vehicle_length_m,
    vehicle_width_m,
    vehicle_height_m
  )
  ON CONFLICT (vehicle_id) DO UPDATE SET
    vehicle_name         = EXCLUDED.vehicle_name,
    plate_number         = EXCLUDED.plate_number,
    type                 = EXCLUDED.type,
    status               = EXCLUDED.status,
    financing_status     = EXCLUDED.financing_status,
    current_trip_id      = NULL,
    trips_today          = 0,
    next_available_time  = NULL,
    utilization_percent  = 0,
    max_weight_kg        = EXCLUDED.max_weight_kg,
    max_volume_cbm       = EXCLUDED.max_volume_cbm,
    maintenance_due      = NULL,
    alerts               = NULL,
    make                 = EXCLUDED.make,
    model                = EXCLUDED.model,
    year_model           = EXCLUDED.year_model,
    color                = EXCLUDED.color,
    orcr_number          = EXCLUDED.orcr_number,
    registration_expiry  = EXCLUDED.registration_expiry,
    current_odometer_km  = 0,
    engine_type          = EXCLUDED.engine_type,
    vehicle_length_m     = EXCLUDED.vehicle_length_m,
    vehicle_width_m      = EXCLUDED.vehicle_width_m,
    vehicle_height_m     = EXCLUDED.vehicle_height_m,
    date_first_registered = EXCLUDED.date_first_registered,
    date_acquired        = EXCLUDED.date_acquired,
    branch_id            = EXCLUDED.branch_id,
    updated_at           = NOW();

  RAISE NOTICE 'seed_quezon_fleet_trucks: upserted Quezon demo trucks (TRK-QZN-SEED-01 to 03).';
END $$;
