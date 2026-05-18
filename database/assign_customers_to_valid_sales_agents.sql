-- One-time: assign every customer to a valid agent (active Sales Agent).
--
-- Updates customers where:
--   - assigned_agent_id IS NULL, OR
--   - FK was broken (should not happen), OR
--   - assigned employee is not a Sales Agent, OR
--   - assigned employee is not active (on-leave / inactive)
--
-- Distribution: round-robin across all active Sales Agents (stable order by employee_id).
--
-- Before running: backup DB. Requires at least one row in employees with
--   role = 'Sales Agent' AND status = 'active'
--
-- Optional: set a default agent for everyone by replacing the UPDATE with:
--   SET assigned_agent_id = '<employee-uuid>'::uuid
--
BEGIN;

DO $$
DECLARE
  n_agents integer;
BEGIN
  SELECT COUNT(*)::integer INTO n_agents
  FROM employees
  WHERE role = 'Sales Agent'
    AND status = 'active';

  IF n_agents = 0 THEN
    RAISE EXCEPTION 'assign_customers_to_valid_sales_agents: need at least one active Sales Agent';
  END IF;

  RAISE NOTICE 'assign_customers_to_valid_sales_agents: % active Sales Agent(s)', n_agents;
END $$;

WITH valid_agents AS (
  SELECT id,
         row_number() OVER (ORDER BY employee_id) AS rn
  FROM employees
  WHERE role = 'Sales Agent'
    AND status = 'active'
),
agent_total AS (
  SELECT COUNT(*)::integer AS total FROM valid_agents
),
needs_assignment AS (
  SELECT c.id,
         row_number() OVER (ORDER BY c.created_at NULLS LAST, c.id) AS cn
  FROM customers c
  LEFT JOIN employees e ON e.id = c.assigned_agent_id
  WHERE c.assigned_agent_id IS NULL
     OR e.id IS NULL
     OR e.role IS DISTINCT FROM 'Sales Agent'::employee_role
     OR e.status IS DISTINCT FROM 'active'::employee_status
)
UPDATE customers AS c
SET assigned_agent_id = va.id,
    updated_at = NOW()
FROM needs_assignment AS n
CROSS JOIN agent_total AS at
JOIN valid_agents AS va ON va.rn = ((n.cn - 1) % at.total) + 1
WHERE c.id = n.id;

COMMIT;

-- Verify (run separately):
-- SELECT COUNT(*) AS customers_without_valid_agent
-- FROM customers c
-- LEFT JOIN employees e ON e.id = c.assigned_agent_id
-- WHERE c.assigned_agent_id IS NULL
--    OR e.role IS DISTINCT FROM 'Sales Agent'::employee_role
--    OR e.status IS DISTINCT FROM 'active'::employee_status;
-- Expect 0.
