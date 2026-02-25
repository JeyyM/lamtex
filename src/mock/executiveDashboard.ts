// Re-export all executive dashboard data from organized modules
export * from './kpis';
export * from './inventory';
export * from './salesPerformance';
export * from './notifications';
export * from './branches';

// Legacy exports for backward compatibility (deprecated)
import { getKPIsByBranch } from './kpis';
import { getFinishedGoodsAlertsByBranch, getRawMaterialAlertsByBranch } from './inventory';
import { getTopProductsByBranch, getTopStoresByBranch, getAgentPerformanceByBranch, BRANCH_PERFORMANCE } from './salesPerformance';
import { getNotificationsByBranch, getCalendarEventsByBranch } from './notifications';

// Default exports using 'All' branch for backward compatibility
export const MOCK_KPIS = getKPIsByBranch('All');
export const MOCK_APPROVALS = []; // Now imported from kpis.ts via getApprovalsByBranch
export const MOCK_FINISHED_GOODS_ALERTS = getFinishedGoodsAlertsByBranch('All');
export const MOCK_RAW_MATERIAL_ALERTS = getRawMaterialAlertsByBranch('All');
export const MOCK_TOP_PRODUCTS = getTopProductsByBranch('All');
export const MOCK_TOP_STORES = getTopStoresByBranch('All');
export const MOCK_AGENT_PERFORMANCE = getAgentPerformanceByBranch('All');
export const MOCK_BRANCH_PERFORMANCE = BRANCH_PERFORMANCE;
export const MOCK_NOTIFICATIONS = getNotificationsByBranch('All');
export const MOCK_CALENDAR_EVENTS = getCalendarEventsByBranch('All');

