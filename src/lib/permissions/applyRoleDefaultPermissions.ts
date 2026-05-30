import { saveEmployeeOrderPermissions } from './employeeOrderPermissions';
import { saveEmployeeProductPermissions } from './employeeProductPermissions';
import { saveEmployeeMaterialPermissions } from './employeeMaterialPermissions';
import { saveEmployeeWarehousePermissions } from './employeeWarehousePermissions';
import { saveEmployeeProductionRequestPermissions } from './employeeProductionRequestPermissions';
import { saveEmployeePurchaseOrderPermissions } from './employeePurchaseOrderPermissions';
import { saveEmployeeInterBranchRequestPermissions } from './employeeInterBranchRequestPermissions';
import { saveEmployeeLogisticsPermissions } from './employeeLogisticsPermissions';
import { saveEmployeeSupplierPermissions } from './employeeSupplierPermissions';
import { saveEmployeeCustomerPermissions } from './employeeCustomerPermissions';
import { saveEmployeeFinancePermissions } from './employeeFinancePermissions';
import { saveEmployeeEmployeesPermissions } from './employeeEmployeesPermissions';
import { saveEmployeeAgentAnalyticsPermissions } from './employeeAgentAnalyticsPermissions';
import { saveEmployeeReportsPermissions } from './employeeReportsPermissions';
import { saveEmployeeSettingsPermissions } from './employeeSettingsPermissions';
import { mergeDefaultPermissionsForRoles } from './roleDefaultPermissions';
import type { UserRole } from '@/src/types';
import { clearEmployeePermissionRoleFallbackCache } from './employeePermissionRoleFallback';

/** Persist merged role-default permission sets for a new or updated employee. */
export async function applyDefaultPermissionsForRoles(
  employeeId: string,
  roles: UserRole[],
): Promise<void> {
  const id = employeeId.trim();
  if (!id || roles.length === 0) return;

  const merged = mergeDefaultPermissionsForRoles(roles);

  await Promise.all([
    saveEmployeeOrderPermissions(id, merged.orders),
    saveEmployeeProductPermissions(id, merged.products),
    saveEmployeeMaterialPermissions(id, merged.materials),
    saveEmployeeWarehousePermissions(id, merged.warehouse),
    saveEmployeeProductionRequestPermissions(id, merged.productionRequest),
    saveEmployeePurchaseOrderPermissions(id, merged.purchaseOrder),
    saveEmployeeInterBranchRequestPermissions(id, merged.interBranchRequest),
    saveEmployeeLogisticsPermissions(id, merged.logistics),
    saveEmployeeSupplierPermissions(id, merged.suppliers),
    saveEmployeeCustomerPermissions(id, merged.customers),
    saveEmployeeFinancePermissions(id, merged.finance),
    saveEmployeeEmployeesPermissions(id, merged.employees),
    saveEmployeeAgentAnalyticsPermissions(id, merged.agentAnalytics),
    saveEmployeeReportsPermissions(id, merged.reports),
    saveEmployeeSettingsPermissions(id, merged.settings),
  ]);

  clearEmployeePermissionRoleFallbackCache(id);
}
