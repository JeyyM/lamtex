-- Grant orderLoading to warehouse-role employees (Mark Loading / Mark Packed on order detail).
-- Safe to re-run: merges into existing JSONB permissions.

UPDATE employee_order_permissions eop
SET
  permissions = COALESCE(eop.permissions, '{}'::jsonb) || '{"orderLoading": true}'::jsonb,
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM employee_user_roles eur
  WHERE eur.employee_id = eop.employee_id
    AND eur.user_role = 'Warehouse'::user_role
)
OR EXISTS (
  SELECT 1
  FROM employees e
  WHERE e.id = eop.employee_id
    AND e.user_role = 'Warehouse'::user_role
);

NOTIFY pgrst, 'reload schema';
