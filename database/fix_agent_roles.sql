-- =============================================================================
-- Fix: Remove invalid 'Team Lead' and 'Senior Agent' roles → set to Agent
-- Affected employees: AGT-MNL-002, AGT-CEB-001, AGT-BTG-001
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

UPDATE employees
SET
  role      = 'Sales Agent',
  user_role = 'Agent'
WHERE employee_id IN ('AGT-MNL-002', 'AGT-CEB-001', 'AGT-BTG-001');
