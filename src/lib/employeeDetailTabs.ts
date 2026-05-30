import type { UserRole } from '@/src/types';

/** Tabs shown for every employee regardless of dashboard role. */
export const EMPLOYEE_DETAIL_COMMON_TAB_IDS = [
  'overview',
  'contact',
  'employment',
  'compensation',
  'skills',
  'documents',
  'assets',
  'activity',
  'access',
] as const;

export type EmployeeDetailCommonTabId = (typeof EMPLOYEE_DETAIL_COMMON_TAB_IDS)[number];

const COMMON_TAB_SET = new Set<string>(EMPLOYEE_DETAIL_COMMON_TAB_IDS);

const AGENT_TAB_IDS = new Set(['customers', 'orders']);
const TRIP_HISTORY_TAB_IDS = new Set(['trips']);
const WAREHOUSE_TAB_IDS = new Set(['requests', 'catalog']);

export function employeeHasAgentDetailTabs(roles: UserRole[]): boolean {
  return roles.includes('Agent');
}

export function employeeHasTripHistoryDetailTabs(roles: UserRole[]): boolean {
  return roles.includes('Logistics') || roles.includes('Driver');
}

export function employeeHasWarehouseDetailTabs(roles: UserRole[]): boolean {
  return roles.includes('Warehouse');
}

/** Driver role uses personal trip history; Logistics uses branch-wide history. */
export function employeeUsesDriverTripHistoryView(roles: UserRole[]): boolean {
  return roles.includes('Driver');
}

export function isEmployeeDetailTabVisible(tabId: string, roles: UserRole[]): boolean {
  if (COMMON_TAB_SET.has(tabId)) return true;
  if (AGENT_TAB_IDS.has(tabId)) return employeeHasAgentDetailTabs(roles);
  if (TRIP_HISTORY_TAB_IDS.has(tabId)) return employeeHasTripHistoryDetailTabs(roles);
  if (WAREHOUSE_TAB_IDS.has(tabId)) return employeeHasWarehouseDetailTabs(roles);
  return false;
}

export function filterEmployeeDetailTabs<T extends { id: string }>(
  tabs: T[],
  roles: UserRole[],
): T[] {
  return tabs.filter((t) => isEmployeeDetailTabVisible(t.id, roles));
}
