-- =============================================================================
-- Seed: employee_skills, employee_certifications, employee_trainings
-- =============================================================================
-- Adds demo rows for every employee. Safe to re-run: skips when the same
-- skill name / certification title / training name already exists for that
-- employee.
--
-- Ensures employee_skills.skill_description and date_started exist (ALTER IF NOT EXISTS).
--
-- Run: Supabase SQL editor or psql -f database/seed_employee_skills_certifications_training.sql
-- =============================================================================

ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS skill_description TEXT;
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS date_started DATE;

-- -----------------------------------------------------------------------------
-- Skills (name, level, description, date started)
-- -----------------------------------------------------------------------------
INSERT INTO employee_skills (
  employee_id,
  skill_name,
  skill_level,
  years_experience,
  skill_description,
  date_started
)
SELECT
  e.id,
  t.skill_name,
  t.lvl::skill_level,
  NULL::numeric,
  t.descr,
  t.started
FROM employees e
CROSS JOIN (
  SELECT
    v.skill_name,
    v.lvl,
    v.descr,
    v.started
  FROM (VALUES
    (
      'PVC Pipes Product Knowledge',
      'Expert',
      'Deep knowledge of PVC grades, fittings, pressure classes, and typical construction applications.',
      '2021-03-15'::date
    ),
    (
      'Plastic Tubes Expertise',
      'Expert',
      'Specification and sourcing of industrial plastic tubing for utilities and building projects.',
      '2021-03-15'::date
    ),
    (
      'Negotiation',
      'Advanced',
      'Pricing and contract negotiation with distributors and key accounts.',
      '2018-07-01'::date
    ),
    (
      'Customer Relationship Management',
      'Expert',
      'Account planning, retention, and long-term relationship management.',
      '2019-01-10'::date
    ),
    (
      'English Communication',
      'Advanced',
      'Written and verbal English for proposals, email, and client meetings.',
      '2017-05-20'::date
    ),
    (
      'Filipino (Tagalog)',
      'Expert',
      'Native-level business communication in Filipino.',
      '2016-01-01'::date
    ),
    (
      'Sales Forecasting',
      'Advanced',
      'Pipeline estimation and regional sales planning.',
      '2020-02-01'::date
    ),
    (
      'CRM Software (Salesforce)',
      'Intermediate',
      'Day-to-day use of CRM for leads, opportunities, and reporting.',
      '2022-09-01'::date
    )
  ) AS v(skill_name, lvl, descr, started)
) t
WHERE NOT EXISTS (
  SELECT 1
  FROM employee_skills x
  WHERE x.employee_id = e.id
    AND x.skill_name = t.skill_name
);

-- -----------------------------------------------------------------------------
-- Certifications (title, source, issued, expiry optional)
-- -----------------------------------------------------------------------------
INSERT INTO employee_certifications (
  employee_id,
  certification_name,
  issuing_organization,
  issue_date,
  expiry_date
)
SELECT
  e.id,
  c.title,
  c.src,
  c.issued,
  c.expires
FROM employees e
CROSS JOIN (
  SELECT * FROM (VALUES
    (
      'Certified Sales Professional',
      'Philippine Sales Academy',
      '2024-06-15'::date,
      '2027-06-15'::date
    ),
    (
      'PVC Products Specialist Certification',
      'LAMTEX Training Center',
      '2023-09-20'::date,
      NULL::date
    ),
    (
      'Customer Service Excellence',
      'Asian Customer Service Institute',
      '2024-03-10'::date,
      '2026-03-10'::date
    )
  ) AS x(title, src, issued, expires)
) c
WHERE NOT EXISTS (
  SELECT 1
  FROM employee_certifications y
  WHERE y.employee_id = e.id
    AND y.certification_name = c.title
);

-- -----------------------------------------------------------------------------
-- Training history (no score in UI; score column left NULL)
-- -----------------------------------------------------------------------------
INSERT INTO employee_trainings (
  employee_id,
  training_name,
  training_type,
  completion_date,
  duration,
  instructor,
  score
)
SELECT
  e.id,
  tr.training_name,
  tr.tt::training_type,
  tr.completed,
  tr.dur,
  tr.inst,
  NULL::numeric
FROM employees e
CROSS JOIN (
  SELECT * FROM (VALUES
    (
      'Advanced Sales Techniques',
      'Sales Skills',
      '2025-11-15'::date,
      '2 days',
      'John Martinez'::varchar
    ),
    (
      'New Product Line: Industrial PVC Pipes',
      'Product Knowledge',
      '2026-01-20'::date,
      '1 day',
      'Technical Team'::varchar
    ),
    (
      'Leadership and Team Management',
      'Soft Skills',
      '2025-08-05'::date,
      '3 days',
      'Patricia Valdez'::varchar
    ),
    (
      'Compliance and Ethics Training',
      'Compliance',
      '2025-12-01'::date,
      '4 hours',
      NULL::varchar
    )
  ) AS x(training_name, tt, completed, dur, inst)
) tr
WHERE NOT EXISTS (
  SELECT 1
  FROM employee_trainings y
  WHERE y.employee_id = e.id
    AND y.training_name = tr.training_name
);
