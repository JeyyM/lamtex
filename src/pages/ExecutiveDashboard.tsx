import React from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { KpiTile } from '@/src/components/dashboard/KpiTile';
import { ApprovalsTable } from '@/src/components/dashboard/ApprovalsTable';
import { InventoryAlerts } from '@/src/components/dashboard/InventoryAlerts';
import { SalesPerformance } from '@/src/components/dashboard/SalesPerformance';
import { OverviewCalendar } from '@/src/components/dashboard/OverviewCalendar';
import { 
  getKPIsByBranch,
  getApprovalsByBranch,
  getSortedApprovals,
  getFinishedGoodsAlertsByBranch,
  getRawMaterialAlertsByBranch,
  getTopProductsByBranch,
  getTopStoresByBranch,
  getAgentPerformanceByBranch,
  BRANCH_PERFORMANCE,
  getCalendarEventsByBranch,
} from '@/src/mock/executiveDashboard';

export function ExecutiveDashboard() {
  const { branch } = useAppContext();

  // Get branch-specific data (limited for dashboard preview)
  const kpis = getKPIsByBranch(branch);
  const approvals = getSortedApprovals(getApprovalsByBranch(branch)).slice(0, 5); // Show top 5 only
  const finishedGoodsAlerts = getFinishedGoodsAlertsByBranch(branch).slice(0, 3); // Show top 3
  const rawMaterialAlerts = getRawMaterialAlertsByBranch(branch).slice(0, 2); // Show top 2
  const topProducts = getTopProductsByBranch(branch).slice(0, 5); // Show top 5
  const topStores = getTopStoresByBranch(branch).slice(0, 5); // Show top 5
  const agentPerformance = getAgentPerformanceByBranch(branch).slice(0, 5); // Show top 5
  const calendarEvents = getCalendarEventsByBranch(branch);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Viewing data for: <span className="font-medium text-gray-700">{branch}</span>
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiTile 
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
            trendUp={kpi.trendUp}
            subtitle={kpi.subtitle}
            status={kpi.status}
            previousValue={kpi.previousValue}
            onClick={() => console.log(`Navigating to details for ${kpi.label}`)}
          />
        ))}
      </div>

      {/* Priority Action Center: Approvals */}
      <ApprovalsTable orders={approvals} showViewAll={true} />

      {/* Inventory Health Alerts */}
      <InventoryAlerts 
        finishedGoods={finishedGoodsAlerts}
        rawMaterials={rawMaterialAlerts}
        showViewAll={true}
      />

      {/* Sales Performance Section */}
      <SalesPerformance 
        topProducts={topProducts}
        topStores={topStores}
        agentPerformance={agentPerformance}
        branchPerformance={BRANCH_PERFORMANCE}
        showViewAll={true}
      />

      {/* Overview Calendar - Full Width */}
      <OverviewCalendar events={calendarEvents} />
    </div>
  );
}
