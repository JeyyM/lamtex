-- Add optional description and start date for employee skills (run on existing DBs).
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS skill_description TEXT;
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS date_started DATE;
