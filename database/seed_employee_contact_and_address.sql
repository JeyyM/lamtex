-- =============================================================================
-- Seed: employee_contact_info + employee_addresses (Contact Info tab)
-- =============================================================================
-- Inserts one HR contact row and one “current” address per employee when that
-- employee has NO row in those tables yet. Re-run safe (NOT EXISTS guards).
--
-- WORK EMAIL (not hardcoded): taken from Supabase Auth — `auth.users.email` —
-- joined through `employees.auth_user_id`. If `auth_user_id` is NULL or the auth
-- row is missing, `work_email` is stored as NULL.
--
-- Phone / personal_email / emergency fields still use rotating seed templates.
-- Run in Supabase SQL Editor (has access to `auth`). Local psql needs a role
-- that can read `auth.users`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Contact information (unique per employee)
-- -----------------------------------------------------------------------------
INSERT INTO employee_contact_info (
  employee_id,
  primary_phone,
  secondary_phone,
  personal_email,
  work_email,
  emergency_contact_name,
  emergency_contact_phone,
  emergency_contact_relationship
)
SELECT
  e.id,
  tpl.primary_phone,
  tpl.secondary_phone,
  tpl.personal_email,
  au.email,
  tpl.emergency_contact_name,
  tpl.emergency_contact_phone,
  tpl.emergency_contact_relationship
FROM (
  SELECT
    emp.id,
    emp.auth_user_id,
    (ROW_NUMBER() OVER (ORDER BY emp.employee_id) - 1) AS n
  FROM employees emp
) e
LEFT JOIN auth.users au ON au.id = e.auth_user_id
INNER JOIN (
  SELECT * FROM (VALUES
    (0, '+63 917 123 4567', '+63 2 8123 4567', 'maria.santos.personal@gmail.com', 'Juan Santos', '+63 917 765 4321', 'Spouse'),
    (1, '+63 918 111 2233', '+63 2 8777 8899', 'rico.delacruz.personal@gmail.com', 'Ana Dela Cruz', '+63 919 444 5566', 'Spouse'),
    (2, '+63 920 555 6677', '+63 2 8333 4455', 'jen.lopez.personal@gmail.com', 'Mark Lopez', '+63 921 888 9900', 'Brother'),
    (3, '+63 922 234 5678', NULL, 'sam.villanueva.personal@gmail.com', 'Elena Villanueva', '+63 923 345 6789', 'Mother'),
    (4, '+63 905 456 7890', '+63 2 8244 1020', 'ben.torres.personal@gmail.com', 'Lisa Torres', '+63 906 567 8901', 'Spouse'),
    (5, '+63 907 678 9012', '+63 2 8566 7788', 'kara.fernandez.personal@gmail.com', 'Paul Fernandez', '+63 908 789 0123', 'Father'),
    (6, '+63 909 890 1234', NULL, 'dex.ramos.personal@gmail.com', 'Grace Ramos', '+63 910 901 2345', 'Sister'),
    (7, '+63 912 012 3456', '+63 2 8111 2233', 'mia.gonzales.personal@gmail.com', 'Noel Gonzales', '+63 913 123 4567', 'Spouse'),
    (8, '+63 914 135 7924', '+63 2 8455 6677', 'alex.bautista.personal@gmail.com', 'Ivy Bautista', '+63 915 246 8135', 'Cousin'),
    (9, '+63 916 357 9246', NULL, 'pat.navarro.personal@gmail.com', 'Chris Navarro', '+63 917 468 0357', 'Spouse'),
    (10, '+63 918 579 1357', '+63 2 8888 9900', 'dan.mendoza.personal@gmail.com', 'Joy Mendoza', '+63 919 680 2468', 'Aunt'),
    (11, '+63 920 791 3579', '+63 2 8222 3344', 'leah.castro.personal@gmail.com', 'Vince Castro', '+63 921 802 4680', 'Spouse')
  ) AS t(
    idx,
    primary_phone,
    secondary_phone,
    personal_email,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship
  )
) tpl ON tpl.idx = (e.n % 12)
WHERE NOT EXISTS (
  SELECT 1 FROM employee_contact_info c WHERE c.employee_id = e.id
);

-- -----------------------------------------------------------------------------
-- 2) One “current” address (only if employee has zero address rows)
-- -----------------------------------------------------------------------------
INSERT INTO employee_addresses (
  employee_id,
  address_label,
  street,
  barangay,
  city,
  province,
  postal_code,
  is_current
)
SELECT
  e.id,
  tpl.address_label,
  tpl.street,
  tpl.barangay,
  tpl.city,
  tpl.province,
  tpl.postal_code,
  TRUE
FROM (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY employee_id) - 1) AS n
  FROM employees
) e
INNER JOIN (
  SELECT * FROM (VALUES
    (0, 'Current', '123 Maligaya Street', 'Barangay Commonwealth', 'Quezon City', 'Metro Manila', '1121'),
    (1, 'Current', '45 Rizal Avenue', 'Barangay Poblacion', 'Makati City', 'Metro Manila', '1200'),
    (2, 'Current', '88 Mabini Extension', 'Barangay Lahug', 'Cebu City', 'Cebu', '6000'),
    (3, 'Current', '7 Bonifacio Road', 'Barangay Matina', 'Davao City', 'Davao del Sur', '8000'),
    (4, 'Current', '210 Aguinaldo Highway', 'Barangay Zapote', 'Bacoor', 'Cavite', '4102'),
    (5, 'Current', '16 Lakeview Drive', 'Barangay San Antonio', 'Taguig City', 'Metro Manila', '1630'),
    (6, 'Current', '502 CM Recto Ave', 'Barangay Zone 1', 'Caloocan City', 'Metro Manila', '1400'),
    (7, 'Current', '9 Arcenas Estate', 'Barangay Cansojong', 'Talisay City', 'Cebu', '6045'),
    (8, 'Current', '41 South Superhighway', 'Barangay Buli', 'Muntinlupa City', 'Metro Manila', '1770'),
    (9, 'Current', '3 Pine Street', 'Barangay San Jose', 'Antipolo City', 'Rizal', '1870'),
    (10, 'Current', '77 Harbor View', 'Barangay Ibayo', 'Navotas City', 'Metro Manila', '1485'),
    (11, 'Current', '555 Katipunan', 'Barangay Loyola Heights', 'Quezon City', 'Metro Manila', '1108')
  ) AS t(
    idx,
    address_label,
    street,
    barangay,
    city,
    province,
    postal_code
  )
) tpl ON tpl.idx = (e.n % 12)
WHERE NOT EXISTS (
  SELECT 1 FROM employee_addresses a WHERE a.employee_id = e.id
);
