-- Full reset + seed for Lamtex truck fleet only (type = Truck).
-- Deletes existing trucks and related demo rows, then inserts complete rows including:
--   engine_type (free-text, e.g. "Diesel"), vehicle_length_m / width_m / height_m, fleet_cards
--
-- Applies missing `vehicles` columns if needed (same as fleet_trucks_extension.sql trucks block).
-- Requires: branches (MNL, CEB, BTG). trip_history.vehicle_id: run fleet_trucks_extension.sql if missing.
-- WARNING: Removes ALL vehicles where type = 'Truck', linked trips (see below),
--          trip_history and maintenance_records for those trucks, and driver_assignments on them.

BEGIN;

-- Ensure truck profile columns exist (safe if fleet_trucks_extension.sql was never applied)
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

COMMENT ON COLUMN vehicles.engine_type IS 'Free-text engine label (e.g. Diesel, Euro 5) — user-defined, not an enum';

-- Detach active trips on trucks
UPDATE vehicles SET current_trip_id = NULL WHERE type = 'Truck';

-- History rows pointing at truck UUIDs
DELETE FROM trip_history WHERE vehicle_id IN (SELECT id FROM vehicles WHERE type = 'Truck');

-- Trips assigned to any truck (fleet demo + anything else on trucks)
DELETE FROM trips WHERE vehicle_id IN (SELECT id FROM vehicles WHERE type = 'Truck');

DELETE FROM maintenance_records WHERE vehicle_id IN (SELECT id FROM vehicles WHERE type = 'Truck');

DELETE FROM driver_assignments WHERE vehicle_id IN (SELECT id FROM vehicles WHERE type = 'Truck');

DELETE FROM vehicles WHERE type = 'Truck';

-- ---------------------------------------------------------------------------
-- Trucks (full profile)
-- ---------------------------------------------------------------------------
INSERT INTO vehicles (
  vehicle_id,
  vehicle_name,
  plate_number,
  type,
  status,
  financing_status,
  max_weight_kg,
  max_volume_cbm,
  utilization_percent,
  trips_today,
  maintenance_due,
  alerts,
  branch_id,
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
  fleet_cards
)
SELECT
  x.vehicle_id,
  x.vehicle_name,
  x.plate_number,
  x.type,
  x.status,
  x.financing_status,
  x.max_weight_kg,
  x.max_volume_cbm,
  x.utilization_percent,
  x.trips_today,
  x.maintenance_due,
  x.alerts,
  b.id AS branch_id,
  x.make,
  x.model,
  x.year_model,
  x.color,
  x.orcr_number,
  x.registration_expiry,
  x.current_odometer_km,
  x.engine_type,
  x.vehicle_length_m,
  x.vehicle_width_m,
  x.vehicle_height_m,
  x.fleet_cards
FROM (VALUES
  ('TRK-MNL-001', 'Manila Rigid 001', 'NCR-1001', 'Truck'::vehicle_type, 'On Trip'::vehicle_status, 'Owned'::financing_status,
    5000, 25, 78, 1, '2026-06-15'::date, ARRAY['High weekly utilization']::text[],
    'Isuzu', 'Forward F-Series', 2022, 'White', 'OR-MNL-1001', '2027-03-01'::date, 45230,
    'Diesel', 7.20, 2.30, 2.80, 'Shell Fleet 4412; Easytrip 908821'),
  ('TRK-MNL-002', 'Manila Rigid 002', 'NCR-1002', 'Truck'::vehicle_type, 'Available'::vehicle_status, 'Financed'::financing_status,
    5000, 25, 62, 0, '2026-08-01'::date, NULL,
    'Mitsubishi', 'Fuso Fighter', 2021, 'Blue', 'OR-MNL-1002', '2026-09-10'::date, 62450,
    'Diesel', 7.50, 2.40, 2.90, NULL),
  ('TRK-MNL-003', 'Manila Rigid 003', 'NCR-1003', 'Truck'::vehicle_type, 'Loading'::vehicle_status, 'Owned'::financing_status,
    5000, 25, 71, 0, NULL, NULL,
    'Hino', '500 Series', 2023, 'White', 'OR-MNL-1003', '2028-01-20'::date, 28940,
    'Diesel', 7.00, 2.30, 2.70, 'Petron Superfleet 7721'),
  ('TRK-MNL-004', 'Manila Wing Van 004', 'NCR-1004', 'Truck'::vehicle_type, 'Maintenance'::vehicle_status, 'Owned'::financing_status,
    4000, 22, 45, 0, '2026-04-20'::date, ARRAY['Scheduled service']::text[],
    'Isuzu', 'Giga', 2020, 'Silver', 'OR-MNL-1004', '2026-05-01'::date, 91200,
    'Diesel', 8.10, 2.45, 2.95, 'Autosweep BT-102933'),
  ('TRK-CEB-001', 'Cebu Rigid 001', 'CEB-2001', 'Truck'::vehicle_type, 'On Trip'::vehicle_status, 'Owned'::financing_status,
    5000, 25, 74, 1, '2026-07-01'::date, NULL,
    'Fuso', 'Canter', 2022, 'White', 'OR-CEB-2001', '2027-08-15'::date, 33100,
    'Diesel', 6.20, 2.10, 2.30, 'Caltex StarCard 5566'),
  ('TRK-CEB-002', 'Cebu Rigid 002', 'CEB-2002', 'Truck'::vehicle_type, 'Available'::vehicle_status, 'Leased'::financing_status,
    5000, 25, 58, 0, NULL, NULL,
    'Isuzu', 'NPR', 2021, 'White', 'OR-CEB-2002', '2026-11-01'::date, 40200,
    'Diesel', 6.50, 2.15, 2.35, NULL),
  ('TRK-CEB-003', 'Cebu Wing Van 003', 'CEB-2003', 'Truck'::vehicle_type, 'Available'::vehicle_status, 'Owned'::financing_status,
    3500, 18, 55, 0, '2026-09-15'::date, NULL,
    'Hino', '300 Series', 2019, 'Blue', 'OR-CEB-2003', '2026-10-01'::date, 77800,
    'Diesel', 6.80, 2.20, 2.40, 'Easytrip 771200'),
  ('TRK-BTG-001', 'Batangas Rigid 001', 'BTG-3001', 'Truck'::vehicle_type, 'Available'::vehicle_status, 'Owned'::financing_status,
    8000, 32, 68, 0, '2026-05-30'::date, NULL,
    'Isuzu', 'Giga', 2023, 'White', 'OR-BTG-3001', '2028-02-01'::date, 15400,
    'Diesel', 8.00, 2.35, 2.85, 'Shell Fleet 4413'),
  ('TRK-BTG-002', 'Batangas Trailer 002', 'BTG-3002', 'Truck'::vehicle_type, 'Available'::vehicle_status, 'Financed'::financing_status,
    12000, 45, 52, 0, NULL, NULL,
    'Volvo', 'FM', 2022, 'Red', 'OR-BTG-3002', '2027-06-30'::date, 22100,
    'Diesel', 16.50, 2.55, 4.00, 'RFID Bulk Account BTG-TR-01'),
  ('TRK-BTG-003', 'Batangas Rigid 003', 'BTG-3003', 'Truck'::vehicle_type, 'Loading'::vehicle_status, 'Owned'::financing_status,
    5000, 25, 66, 0, '2026-08-20'::date, NULL,
    'Hino', '700 Series', 2021, 'White', 'OR-BTG-3003', '2026-12-12'::date, 49800,
    'Diesel', 7.80, 2.45, 2.90, NULL)
) AS x(
  vehicle_id, vehicle_name, plate_number, type, status, financing_status,
  max_weight_kg, max_volume_cbm, utilization_percent, trips_today, maintenance_due,
  alerts, make, model, year_model, color, orcr_number, registration_expiry, current_odometer_km,
  engine_type, vehicle_length_m, vehicle_width_m, vehicle_height_m, fleet_cards
)
JOIN branches b ON b.code = CASE
  WHEN x.vehicle_id LIKE 'TRK-MNL-%' THEN 'MNL'
  WHEN x.vehicle_id LIKE 'TRK-CEB-%' THEN 'CEB'
  WHEN x.vehicle_id LIKE 'TRK-BTG-%' THEN 'BTG'
END;

-- ---------------------------------------------------------------------------
-- Active trips (On Trip)
-- ---------------------------------------------------------------------------
INSERT INTO trips (
  trip_number,
  vehicle_id,
  vehicle_name,
  driver_name,
  status,
  scheduled_date,
  destinations,
  capacity_used_percent,
  weight_used_kg,
  volume_used_cbm,
  max_weight_kg,
  max_volume_cbm,
  branch_id
)
SELECT
  vtn.trip_no,
  v.id,
  v.vehicle_name,
  vtn.driver,
  vtn.trip_stat::trip_status,
  CURRENT_DATE,
  vtn.dests::text[],
  vtn.cap,
  vtn.wt,
  vtn.vol,
  v.max_weight_kg,
  v.max_volume_cbm,
  v.branch_id
FROM (VALUES
  ('TRP-MNL-2026-OPEN-01', 'TRK-MNL-001', 'Juan Santos', 'In Transit', ARRAY['Quezon City', 'Manila']::text[], 72::numeric, 3300::numeric, 17.5::numeric),
  ('TRP-CEB-2026-OPEN-01', 'TRK-CEB-001', 'Roberto Reyes', 'In Transit', ARRAY['Cebu City', 'Mandaue']::text[], 68::numeric, 3100::numeric, 16.0::numeric)
) AS vtn(trip_no, veh_code, driver, trip_stat, dests, cap, wt, vol)
JOIN vehicles v ON v.vehicle_id = vtn.veh_code;

UPDATE vehicles v
SET current_trip_id = t.id,
    next_available_time = NOW() + INTERVAL '6 hours'
FROM trips t
WHERE t.trip_number = 'TRP-MNL-2026-OPEN-01'
  AND v.vehicle_id = 'TRK-MNL-001';

UPDATE vehicles v
SET current_trip_id = t.id,
    next_available_time = NOW() + INTERVAL '5 hours'
FROM trips t
WHERE t.trip_number = 'TRP-CEB-2026-OPEN-01'
  AND v.vehicle_id = 'TRK-CEB-001';

-- Loading trips
INSERT INTO trips (
  trip_number,
  vehicle_id,
  vehicle_name,
  driver_name,
  status,
  scheduled_date,
  destinations,
  capacity_used_percent,
  weight_used_kg,
  volume_used_cbm,
  max_weight_kg,
  max_volume_cbm,
  branch_id
)
SELECT
  x.trip_no,
  v.id,
  v.vehicle_name,
  x.driver,
  'Loading'::trip_status,
  CURRENT_DATE,
  x.dests,
  x.cap,
  x.wt,
  x.vol,
  v.max_weight_kg,
  v.max_volume_cbm,
  v.branch_id
FROM (VALUES
  ('TRP-MNL-2026-LOAD-01', 'TRK-MNL-003', 'Pedro Cruz', ARRAY['Pasig City']::text[], 55::numeric, 2600::numeric, 13.5::numeric),
  ('TRP-BTG-2026-LOAD-01', 'TRK-BTG-003', 'Carlos Ramos', ARRAY['Lipa City', 'Batangas City']::text[], 60::numeric, 2900::numeric, 14.2::numeric)
) AS x(trip_no, veh_code, driver, dests, cap, wt, vol)
JOIN vehicles v ON v.vehicle_id = x.veh_code;

UPDATE vehicles v
SET current_trip_id = t.id
FROM trips t
WHERE t.trip_number = 'TRP-MNL-2026-LOAD-01' AND v.vehicle_id = 'TRK-MNL-003';

UPDATE vehicles v
SET current_trip_id = t.id
FROM trips t
WHERE t.trip_number = 'TRP-BTG-2026-LOAD-01' AND v.vehicle_id = 'TRK-BTG-003';

-- ---------------------------------------------------------------------------
-- Trip history
-- ---------------------------------------------------------------------------
INSERT INTO trip_history (
  trip_number,
  vehicle_id,
  vehicle_name,
  driver_name,
  scheduled_date,
  destinations,
  orders_count,
  delivery_success_rate,
  status,
  branch_id
)
SELECT
  h.trip_no,
  v.id,
  v.vehicle_name,
  h.driver,
  h.sdt::date,
  h.dests,
  h.ocount,
  h.rate,
  h.st::trip_status,
  v.branch_id
FROM (VALUES
  ('TRP-MNL-HIST-01', 'TRK-MNL-001', 'Juan Santos', '2026-02-20'::date, ARRAY['Manila']::text[], 3, 100::numeric, 'Completed'::trip_status),
  ('TRP-MNL-HIST-02', 'TRK-MNL-002', 'Carlos Garcia', '2026-02-18'::date, ARRAY['Makati', 'BGC']::text[], 2, 95::numeric, 'Completed'::trip_status),
  ('TRP-CEB-HIST-01', 'TRK-CEB-001', 'Roberto Reyes', '2026-02-22'::date, ARRAY['Cebu City']::text[], 4, 100::numeric, 'Completed'::trip_status),
  ('TRP-BTG-HIST-01', 'TRK-BTG-001', 'Ana Lozada', '2026-02-21'::date, ARRAY['Lipa']::text[], 2, 88::numeric, 'Delayed'::trip_status)
) AS h(trip_no, veh_code, driver, sdt, dests, ocount, rate, st)
JOIN vehicles v ON v.vehicle_id = h.veh_code;

-- ---------------------------------------------------------------------------
-- Maintenance records (sample)
-- ---------------------------------------------------------------------------
INSERT INTO maintenance_records (vehicle_id, category, description, scheduled_date, completed_date, cost, vendor, status)
SELECT v.id, 'Preventive'::maintenance_category, 'Fleet seed: PM oil & brakes', '2026-01-15'::date, '2026-01-16'::date, 18500, 'Lamtex Motor Pool', 'Completed'
FROM vehicles v WHERE v.vehicle_id = 'TRK-MNL-001';

INSERT INTO maintenance_records (vehicle_id, category, description, scheduled_date, cost, vendor, status)
SELECT v.id, 'Preventive'::maintenance_category, 'Fleet seed: Annual inspection due', '2026-04-01'::date, 12000, 'Cebu Fleet Center', 'Scheduled'
FROM vehicles v WHERE v.vehicle_id = 'TRK-CEB-002';

INSERT INTO maintenance_records (vehicle_id, category, description, scheduled_date, completed_date, cost, vendor, status)
SELECT v.id, 'Corrective'::maintenance_category, 'Fleet seed: AC compressor', '2026-02-01'::date, '2026-02-03'::date, 24000, 'Hino Service', 'Completed'
FROM vehicles v WHERE v.vehicle_id = 'TRK-MNL-004';

COMMIT;
