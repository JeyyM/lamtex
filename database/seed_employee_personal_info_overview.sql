-- =============================================================================
-- Seed: employee_personal_info (Overview tab — Personal Information)
-- =============================================================================
-- Fills `employee_personal_info` for every row in `employees` that does not
-- already have one. Safe to re-run: skips existing rows (NOT EXISTS).
--
-- Run in Supabase SQL editor or: psql -f database/seed_employee_personal_info_overview.sql
--
-- After load, optional: refresh stored ages from date_of_birth (see bottom).
-- =============================================================================

INSERT INTO employee_personal_info (
  employee_id,
  date_of_birth,
  age,
  gender,
  nationality,
  civil_status,
  religion,
  blood_type
)
SELECT
  e.id,
  tpl.date_of_birth,
  tpl.age,
  tpl.gender,
  'Filipino',
  tpl.civil_status,
  tpl.religion,
  tpl.blood_type
FROM (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY employee_id) - 1) AS n
  FROM employees
) e
INNER JOIN (
  SELECT * FROM (VALUES
    (0, DATE '1992-05-18', 33, 'Female'::gender_enum, 'Married'::civil_status_enum, 'Roman Catholic', 'O+'),
    (1, DATE '1988-03-12', 38, 'Male'::gender_enum, 'Single'::civil_status_enum, 'Roman Catholic', 'A+'),
    (2, DATE '1995-11-20', 30, 'Male'::gender_enum, 'Married'::civil_status_enum, 'Roman Catholic', 'B+'),
    (3, DATE '1990-04-02', 36, 'Female'::gender_enum, 'Married'::civil_status_enum, 'Roman Catholic', 'AB+'),
    (4, DATE '1985-07-28', 40, 'Male'::gender_enum, 'Married'::civil_status_enum, 'Iglesia ni Cristo', 'O-'),
    (5, DATE '1998-01-15', 28, 'Female'::gender_enum, 'Single'::civil_status_enum, 'Roman Catholic', 'A-'),
    (6, DATE '1993-09-09', 32, 'Male'::gender_enum, 'Married'::civil_status_enum, 'Roman Catholic', 'B-'),
    (7, DATE '1987-12-01', 38, 'Female'::gender_enum, 'Separated'::civil_status_enum, 'Roman Catholic', 'O+'),
    (8, DATE '1991-06-25', 34, 'Male'::gender_enum, 'Single'::civil_status_enum, 'Protestant', 'A+'),
    (9, DATE '1996-02-14', 29, 'Female'::gender_enum, 'Married'::civil_status_enum, 'Roman Catholic', 'B+'),
    (10, DATE '1983-10-30', 42, 'Male'::gender_enum, 'Widowed'::civil_status_enum, 'Roman Catholic', 'O+'),
    (11, DATE '1999-08-08', 26, 'Female'::gender_enum, 'Single'::civil_status_enum, 'Roman Catholic', 'AB-')
  ) AS t(
    idx,
    date_of_birth,
    age,
    gender,
    civil_status,
    religion,
    blood_type
  )
) tpl ON tpl.idx = (e.n % 12)
WHERE NOT EXISTS (
  SELECT 1 FROM employee_personal_info p WHERE p.employee_id = e.id
);

-- Optional: recompute `age` from `date_of_birth` so it stays correct over time.
-- Uncomment to run after seeding:
-- UPDATE employee_personal_info
-- SET
--   age = GREATEST(0,
--     EXTRACT(YEAR FROM age(CURRENT_DATE::timestamp, date_of_birth::timestamp))::integer
--   ),
--   updated_at = NOW()
-- WHERE date_of_birth IS NOT NULL;
