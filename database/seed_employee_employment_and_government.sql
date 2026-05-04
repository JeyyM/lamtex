-- =============================================================================
-- Seed: employee_employment_info + employee_government_ids (Employment tab)
-- =============================================================================
-- One employment row and one government-ID row per employee that does not
-- already have them. Safe to re-run (NOT EXISTS).
--
-- `employment_status` uses type employment_status enum: Full-time, Part-time,
-- Contract, Probationary.
--
-- Run in Supabase SQL editor or: psql -f database/seed_employee_employment_and_government.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Employment (schedule + org details)
-- -----------------------------------------------------------------------------
INSERT INTO employee_employment_info (
  employee_id,
  employment_status,
  position,
  department,
  reporting_to,
  branch_manager_name,
  work_schedule_days,
  work_start_time,
  work_end_time,
  shift
)
SELECT
  e.id,
  tpl.employment_status,
  tpl.position,
  tpl.department,
  tpl.reporting_to,
  tpl.branch_manager_name,
  tpl.work_schedule_days,
  tpl.work_start_time,
  tpl.work_end_time,
  tpl.shift
FROM (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY employee_id) - 1) AS n
  FROM employees
) e
INNER JOIN (
  SELECT * FROM (VALUES
    (0, 'Full-time'::employment_status, 'Senior Sales Agent', 'Sales', 'Patricia Valdez', 'Patricia Valdez', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']::text[], TIME '08:00', TIME '17:00', 'Day Shift'),
    (1, 'Full-time'::employment_status, 'Sales Agent', 'Sales', 'Patricia Valdez', 'Patricia Valdez', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']::text[], TIME '09:00', TIME '18:00', 'Day Shift'),
    (2, 'Full-time'::employment_status, 'Logistics Coordinator', 'Logistics', 'Miguel Torres', 'Miguel Torres', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']::text[], TIME '07:00', TIME '16:00', 'Morning Shift'),
    (3, 'Full-time'::employment_status, 'Warehouse Lead', 'Warehouse', 'Jose Ramos', 'Jose Ramos', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']::text[], TIME '08:00', TIME '17:00', 'Day Shift'),
    (4, 'Full-time'::employment_status, 'Truck Driver', 'Logistics', 'Ramon Dela Cruz', 'Ramon Dela Cruz', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']::text[], TIME '06:00', TIME '15:00', 'Early Shift'),
    (5, 'Part-time'::employment_status, 'Field Associate', 'Sales', 'Patricia Valdez', 'Patricia Valdez', ARRAY['Monday','Wednesday','Friday']::text[], TIME '10:00', TIME '15:00', 'Part Day'),
    (6, 'Full-time'::employment_status, 'Inventory Specialist', 'Warehouse', 'Jose Ramos', 'Antonio Garces', ARRAY['Tuesday','Wednesday','Thursday','Friday','Saturday']::text[], TIME '13:00', TIME '22:00', 'Night Shift'),
    (7, 'Probationary'::employment_status, 'Junior Sales Agent', 'Sales', 'Rico Dela Cruz', 'Patricia Valdez', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']::text[], TIME '08:30', TIME '17:30', 'Day Shift'),
    (8, 'Contract'::employment_status, 'Route Planner', 'Logistics', 'Elena Reyes', 'Miguel Torres', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']::text[], TIME '08:00', TIME '17:00', 'Day Shift'),
    (9, 'Full-time'::employment_status, 'Forklift Operator', 'Warehouse', 'Robert Mendoza', 'Jose Ramos', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']::text[], TIME '20:00', TIME '05:00', 'Graveyard Shift'),
    (10, 'Full-time'::employment_status, 'Branch Supervisor', 'Operations', 'Patricia Valdez', 'Patricia Valdez', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']::text[], TIME '08:00', TIME '17:00', 'Day Shift'),
    (11, 'Full-time'::employment_status, 'Customer Success Agent', 'Sales', 'Jen Lopez', 'Patricia Valdez', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']::text[], TIME '10:00', TIME '19:00', 'Mid Shift')
  ) AS t(
    idx,
    employment_status,
    position,
    department,
    reporting_to,
    branch_manager_name,
    work_schedule_days,
    work_start_time,
    work_end_time,
    shift
  )
) tpl ON tpl.idx = (e.n % 12)
WHERE NOT EXISTS (
  SELECT 1 FROM employee_employment_info x WHERE x.employee_id = e.id
);

-- -----------------------------------------------------------------------------
-- 2) Government IDs
-- -----------------------------------------------------------------------------
INSERT INTO employee_government_ids (
  employee_id,
  tin,
  sss,
  phil_health,
  pag_ibig
)
SELECT
  e.id,
  tpl.tin,
  tpl.sss,
  tpl.phil_health,
  tpl.pag_ibig
FROM (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY employee_id) - 1) AS n
  FROM employees
) e
INNER JOIN (
  SELECT * FROM (VALUES
    (0, '123-456-789-000', '34-1234567-8', '12-345678901-2', '1234-5678-9012'),
    (1, '456-789-012-111', '12-7654321-0', '12-111222333-4', '2345-6789-0123'),
    (2, '789-012-345-222', '55-9988776-5', '12-444555666-7', '3456-7890-1234'),
    (3, '321-654-987-333', '88-1122334-4', '12-777888999-0', '4567-8901-2345'),
    (4, '111-222-333-444', '22-3344556-7', '12-000111222-3', '5678-9012-3456'),
    (5, '555-666-777-888', '66-7788990-1', '12-333444555-6', '6789-0123-4567'),
    (6, '999-888-777-999', '44-5566778-9', '12-666777888-1', '7890-1234-5678'),
    (7, '147-258-369-000', '33-4455667-2', '12-999000111-4', '8901-2345-6789'),
    (8, '258-369-147-111', '77-8899001-3', '12-222333444-5', '9012-3456-7890'),
    (9, '369-147-258-222', '11-2233445-6', '12-555666777-8', '0123-4567-8901'),
    (10, '741-852-963-333', '99-0011223-4', '12-888999000-2', '1234-5678-9013'),
    (11, '852-963-741-444', '55-6677889-0', '12-111222333-6', '2345-6789-0124')
  ) AS t(idx, tin, sss, phil_health, pag_ibig)
) tpl ON tpl.idx = (e.n % 12)
WHERE NOT EXISTS (
  SELECT 1 FROM employee_government_ids x WHERE x.employee_id = e.id
);
