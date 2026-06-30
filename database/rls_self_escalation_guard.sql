-- ============================================================================
-- RLS HARDENING — self-escalation / self-dealing guard
-- ----------------------------------------------------------------------------
-- Context: the app's authorization model is fail-open and enforced client-side
-- (a user with no permission row defaults to full access — see
-- src/lib/permissions/*). Flipping the whole database to fail-closed per-role /
-- per-branch RLS is a large, test-heavy migration that would lock out real
-- users on production, so it is intentionally NOT done here.
--
-- What this migration DOES do (airtight, non-breaking): it stops any logged-in
-- employee from modifying *their own* privilege or financial rows via the API
-- (browser console / direct PostgREST call). Specifically, for the permission,
-- assignment, and sensitive HR tables below:
--
--     INSERT / UPDATE / DELETE allowed only when
--         is_executive()  OR  the row belongs to SOMEONE ELSE
--
-- This closes:
--   * privilege self-escalation (granting yourself module permissions)
--   * scope self-escalation (assigning yourself more products/materials)
--   * financial self-dealing (editing your own salary / bank / government IDs)
--
-- It does NOT change reads, and admins/HR editing OTHER employees keep working
-- exactly as before. Executives can still edit anyone (including themselves).
--
-- NOTE (still open): SELECT on employee_compensation / employee_bank_details /
-- employee_government_ids is still the blanket "any authenticated user" policy,
-- so salaries/bank/gov-IDs remain readable by any logged-in employee. Tightening
-- reads requires migrating the permission model to fail-closed first (seeding
-- explicit permission rows for every user). Tracked in security_audit.md.
-- ============================================================================

-- 1) Helper functions --------------------------------------------------------
-- SECURITY DEFINER so they bypass RLS on `employees` (no recursion) and work
-- when called from inside another table's policy.

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.employees e
  WHERE e.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_executive()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.status = 'active'
      AND e.user_role IS NOT DISTINCT FROM 'Executive'::public.user_role
  );
$$;

REVOKE ALL ON FUNCTION public.current_employee_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_executive() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_executive() TO authenticated;

-- 2) Apply the self-guard to every privilege / financial table ---------------
-- All listed tables key on `employee_id`. Reads (auth_select_*) are untouched.

DO $$
DECLARE
  tbl TEXT;
  guard CONSTANT TEXT :=
    '(public.is_executive() OR employee_id IS DISTINCT FROM public.current_employee_id())';
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    -- Module permission grants
    'employee_order_permissions',
    'employee_product_permissions',
    'employee_material_permissions',
    'employee_warehouse_permissions',
    'employee_production_request_permissions',
    'employee_purchase_order_permissions',
    'employee_inter_branch_request_permissions',
    'employee_logistics_permissions',
    'employee_customer_permissions',
    'employee_supplier_permissions',
    'employee_finance_permissions',
    'employee_employees_permissions',
    'employee_agent_analytics_permissions',
    'employee_reports_permissions',
    'employee_settings_permissions',
    -- Data-scope assignments
    'employee_product_assignments',
    'employee_material_assignments',
    -- Sensitive HR / financial records
    'employee_compensation',
    'employee_bank_details',
    'employee_government_ids'
  ]
  LOOP
    -- Drop the permissive blanket write policies (from the bootstrap RLS loops).
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_insert_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_update_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_delete_' || tbl, tbl);
    -- Drop our own policies too, so this script is re-runnable.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'sec_insert_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'sec_update_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'sec_delete_' || tbl, tbl);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK %s',
      'sec_insert_' || tbl, tbl, guard
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING %s WITH CHECK %s',
      'sec_update_' || tbl, tbl, guard, guard
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING %s',
      'sec_delete_' || tbl, tbl, guard
    );
  END LOOP;
END $$;

-- Refresh PostgREST schema cache.
NOTIFY pgrst, 'reload schema';
