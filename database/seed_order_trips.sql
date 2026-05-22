-- =============================================================================
-- Seed: trips for logistics-eligible orders that have no trip yet
--
-- The PR/PO/IBR seed scripts do NOT create trips. Trips normally come from
-- overhaul_reseed.sql Phase 4, which is skipped when a branch has no trucks or
-- truck drivers. This script backfills trips for any order in the dispatch
-- pipeline (Scheduled → Completed) that is not already on a trip.
--
-- Requires per branch:
--   • ≥ 1 vehicle (status ≠ Out of Service)
--   • ≥ 1 active Truck Driver employee
--   • orders in Scheduled / Loading / Packed / Ready / In Transit / Delivered / Completed
--
-- Safe to re-run: skips orders already referenced in trips.order_ids.
-- Trip/delivery numbers use TRP-SEED-/DLV-SEED- + order_number (unique per order).
-- Also creates delivery_tracking + trip_history rows for completed trips.
-- =============================================================================

DO $$
DECLARE
  r_branch     RECORD;
  r_order      RECORD;
  v_vehicle    RECORD;
  v_driver     RECORD;
  v_trip_id    UUID;
  v_trip_num   TEXT;
  v_dlv_num    TEXT;
  v_dep        TIMESTAMPTZ;
  v_arr        TIMESTAMPTZ;
  v_cap        NUMERIC(5,2);
  v_status     trip_status;
  v_dt_status  delivery_tracking_status;
  v_total      INT := 0;
  v_vehicles   UUID[];
  v_drivers    UUID[];
  v_vidx       INT;
  v_didx       INT;
  v_dest       TEXT;
  v_branch_trips INT;
  v_eligible     INT;
BEGIN
  FOR r_branch IN
    SELECT id, code, name FROM branches WHERE code IN ('MNL', 'CEB', 'BTG', 'QZN') ORDER BY code
  LOOP
    SELECT ARRAY(
      SELECT id FROM vehicles
      WHERE branch_id = r_branch.id
        AND COALESCE(status::TEXT, 'Available') <> 'Out of Service'
      ORDER BY vehicle_id
    ) INTO v_vehicles;

    SELECT ARRAY(
      SELECT id FROM employees
      WHERE branch_id = r_branch.id
        AND role = 'Truck Driver'
        AND status = 'active'
      ORDER BY employee_name
    ) INTO v_drivers;

    IF v_vehicles IS NULL OR array_length(v_vehicles, 1) IS NULL
       OR v_drivers IS NULL OR array_length(v_drivers, 1) IS NULL THEN
      RAISE NOTICE 'seed_order_trips: branch % — no vehicle/driver; skipping (run fleet + driver seeds first)',
        r_branch.code;
      CONTINUE;
    END IF;

    v_vidx := 1;
    v_didx := 1;
    v_branch_trips := 0;

    SELECT count(*)::int INTO v_eligible
    FROM orders o
    WHERE o.branch_id = r_branch.id
      AND o.status IN ('Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit', 'Delivered', 'Completed')
      AND NOT EXISTS (SELECT 1 FROM trips t WHERE o.id = ANY(t.order_ids));

    RAISE NOTICE 'seed_order_trips: branch % — % order(s) eligible for trip backfill',
      r_branch.code, v_eligible;

    FOR r_order IN
      SELECT o.id, o.order_number, o.order_date, o.scheduled_departure_date,
             o.actual_delivery, o.status, o.customer_name,
             COALESCE(o.weight_kg, 0)   AS weight_kg,
             COALESCE(o.volume_cbm, 0)  AS volume_cbm,
             COALESCE(o.delivery_address, o.customer_name) AS dest
      FROM orders o
      WHERE o.branch_id = r_branch.id
        AND o.status IN ('Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit', 'Delivered', 'Completed')
        AND NOT EXISTS (
          SELECT 1 FROM trips t
          WHERE o.id = ANY(t.order_ids)
        )
      ORDER BY o.order_date, o.order_number
    LOOP
      -- One stable id per order — avoids colliding with overhaul_reseed TRP-/DLV- date-seq numbers.
      v_trip_num := 'TRP-SEED-' || r_order.order_number;
      v_dlv_num  := 'DLV-SEED-' || r_order.order_number;

      IF EXISTS (SELECT 1 FROM trips t WHERE t.trip_number = v_trip_num) THEN
        CONTINUE;
      END IF;

      SELECT id, vehicle_name, COALESCE(max_weight_kg, 0) AS max_w, COALESCE(max_volume_cbm, 0) AS max_v
      INTO v_vehicle
      FROM vehicles
      WHERE id = v_vehicles[v_vidx];
      v_vidx := 1 + (v_vidx % array_length(v_vehicles, 1));

      SELECT id, employee_name
      INTO v_driver
      FROM employees
      WHERE id = v_drivers[v_didx];
      v_didx := 1 + (v_didx % array_length(v_drivers, 1));

      v_cap := CASE
        WHEN v_vehicle.max_w > 0 AND v_vehicle.max_v > 0 THEN
          GREATEST(
            LEAST(100, ROUND((r_order.weight_kg  / v_vehicle.max_w) * 100, 2)),
            LEAST(100, ROUND((r_order.volume_cbm / v_vehicle.max_v) * 100, 2))
          )
        WHEN v_vehicle.max_w > 0 THEN
          LEAST(100, ROUND((r_order.weight_kg / v_vehicle.max_w) * 100, 2))
        WHEN v_vehicle.max_v > 0 THEN
          LEAST(100, ROUND((r_order.volume_cbm / v_vehicle.max_v) * 100, 2))
        ELSE 35.00
      END;
      IF v_cap < 8.0 THEN v_cap := 8.0 + (random() * 20)::NUMERIC(5,2); END IF;

      v_status := CASE r_order.status
        WHEN 'Scheduled'  THEN 'Planned'::trip_status
        WHEN 'Loading'    THEN 'Loading'::trip_status
        WHEN 'Packed'     THEN 'Loading'::trip_status
        WHEN 'Ready'      THEN 'Loading'::trip_status
        WHEN 'In Transit' THEN 'In Transit'::trip_status
        WHEN 'Delivered'  THEN 'Completed'::trip_status
        WHEN 'Completed'  THEN 'Completed'::trip_status
        ELSE 'Pending'::trip_status
      END;

      v_dt_status := CASE r_order.status
        WHEN 'Scheduled'  THEN 'Scheduled'::delivery_tracking_status
        WHEN 'Loading'    THEN 'Loading'::delivery_tracking_status
        WHEN 'Packed'     THEN 'Loading'::delivery_tracking_status
        WHEN 'Ready'      THEN 'Loading'::delivery_tracking_status
        WHEN 'In Transit' THEN 'In Transit'::delivery_tracking_status
        WHEN 'Delivered'  THEN 'Delivered'::delivery_tracking_status
        WHEN 'Completed'  THEN 'Delivered'::delivery_tracking_status
        ELSE NULL
      END;

      v_dep := COALESCE(r_order.scheduled_departure_date, r_order.order_date)::TIMESTAMPTZ + INTERVAL '7 hours';
      v_arr := CASE
        WHEN v_status = 'Completed'::trip_status THEN
          COALESCE(r_order.actual_delivery, r_order.order_date + 1)::TIMESTAMPTZ + INTERVAL '14 hours'
        ELSE NULL
      END;
      v_dest := r_order.customer_name;

      INSERT INTO trips (
        trip_number, vehicle_id, vehicle_name, driver_id, driver_name,
        status, scheduled_date, departure_time,
        destinations, order_ids,
        capacity_used_percent, weight_used_kg, volume_used_cbm,
        max_weight_kg, max_volume_cbm,
        eta, actual_arrival,
        branch_id
      ) VALUES (
        v_trip_num, v_vehicle.id, v_vehicle.vehicle_name, v_driver.id, v_driver.employee_name,
        v_status, COALESCE(r_order.scheduled_departure_date, r_order.order_date), v_dep,
        ARRAY[v_dest], ARRAY[r_order.id],
        v_cap, ROUND(r_order.weight_kg, 2), ROUND(r_order.volume_cbm, 3),
        v_vehicle.max_w, v_vehicle.max_v,
        v_arr, v_arr,
        r_branch.id
      ) RETURNING id INTO v_trip_id;

      IF v_dt_status IS NOT NULL THEN
        INSERT INTO delivery_tracking (
          trip_id, delivery_number, vehicle, driver, route, orders_count,
          status, eta, actual_arrival, pod_collected, branch_id
        ) VALUES (
          v_trip_id,
          v_dlv_num,
          v_vehicle.vehicle_name, v_driver.employee_name,
          v_dest, 1,
          v_dt_status, v_arr, v_arr,
          (v_dt_status = 'Delivered'::delivery_tracking_status),
          r_branch.id
        );
      END IF;

      IF v_status = 'Completed'::trip_status
         AND NOT EXISTS (SELECT 1 FROM trip_history th WHERE th.trip_id = v_trip_id) THEN
        INSERT INTO trip_history (
          trip_id, trip_number, vehicle_id, vehicle_name, driver_name,
          scheduled_date, departure_time, arrival_time,
          destinations, orders_count, delivery_success_rate, status,
          branch_id
        ) VALUES (
          v_trip_id, v_trip_num, v_vehicle.id, v_vehicle.vehicle_name, v_driver.employee_name,
          COALESCE(r_order.scheduled_departure_date, r_order.order_date), v_dep, v_arr,
          ARRAY[v_dest], 1, v_cap, v_status,
          r_branch.id
        );
      END IF;

      v_total := v_total + 1;
      v_branch_trips := v_branch_trips + 1;
    END LOOP;

    IF v_branch_trips > 0 THEN
      RAISE NOTICE 'seed_order_trips: branch % — inserted % trip(s)', r_branch.code, v_branch_trips;
    END IF;
  END LOOP;

  -- Refresh vehicle utilization from trip activity
  UPDATE vehicles v SET
    trips_today = COALESCE(t.cnt_today, 0),
    utilization_percent = COALESCE(t.avg_cap, 0),
    status = CASE
      WHEN t.in_transit > 0 THEN 'On Trip'::vehicle_status
      WHEN t.loading    > 0 THEN 'Loading'::vehicle_status
      ELSE                       'Available'::vehicle_status
    END,
    current_trip_id = t.current_trip_id
  FROM (
    SELECT
      vehicle_id,
      COUNT(*) FILTER (WHERE scheduled_date = CURRENT_DATE) AS cnt_today,
      ROUND(AVG(capacity_used_percent), 2) AS avg_cap,
      COUNT(*) FILTER (WHERE status = 'In Transit'::trip_status) AS in_transit,
      COUNT(*) FILTER (WHERE status = 'Loading'::trip_status) AS loading,
      (ARRAY_AGG(id ORDER BY scheduled_date DESC)
        FILTER (WHERE status IN ('In Transit'::trip_status, 'Loading'::trip_status)))[1] AS current_trip_id
    FROM trips
    GROUP BY vehicle_id
  ) t
  WHERE v.id = t.vehicle_id;

  RAISE NOTICE 'seed_order_trips: total new trips = %', v_total;
END $$;

-- Quick sanity check (run after seed):
SELECT b.code,
       count(*) AS trips_total,
       count(*) FILTER (WHERE t.status = 'Completed') AS completed_trips,
       count(*) FILTER (WHERE t.trip_number LIKE 'TRP-SEED-%') AS seed_trips
FROM trips t
JOIN branches b ON b.id = t.branch_id
WHERE b.code IN ('MNL', 'CEB', 'BTG', 'QZN')
GROUP BY b.code
ORDER BY b.code;
