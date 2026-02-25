import React from 'react';
import { KpiTile } from '@/src/components/dashboard/KpiTile';
import { ApprovalsTable } from '@/src/components/dashboard/ApprovalsTable';
import { InventoryAlerts } from '@/src/components/dashboard/InventoryAlerts';
import { SalesPerformance } from '@/src/components/dashboard/SalesPerformance';
import { OverviewCalendar } from '@/src/components/dashboard/OverviewCalendar';
import { 
  MOCK_KPIS, 
  MOCK_APPROVALS, 
  MOCK_FINISHED_GOODS_ALERTS, 
  MOCK_RAW_MATERIAL_ALERTS,
  MOCK_TOP_PRODUCTS,
  MOCK_TOP_STORES,
  MOCK_AGENT_PERFORMANCE,
  MOCK_BRANCH_PERFORMANCE,
  MOCK_CALENDAR_EVENTS
} from '@/src/mock/executiveDashboard';

export function ExecutiveDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Executive Overview</h1>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_KPIS.map((kpi) => (
          <KpiTile 
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
            trendUp={kpi.trendUp}
            subtitle={kpi.subtitle}
            status={kpi.status}
            onClick={() => console.log(`Navigating to details for ${kpi.label}`)}
          />
        ))}
      </div>

      {/* Priority Action Center: Approvals */}
      <ApprovalsTable orders={MOCK_APPROVALS} />

      {/* Inventory Health Alerts */}
      <InventoryAlerts 
        finishedGoods={MOCK_FINISHED_GOODS_ALERTS}
        rawMaterials={MOCK_RAW_MATERIAL_ALERTS}
      />

      {/* Sales Performance Section */}
      <SalesPerformance 
        topProducts={MOCK_TOP_PRODUCTS}
        topStores={MOCK_TOP_STORES}
        agentPerformance={MOCK_AGENT_PERFORMANCE}
        branchPerformance={MOCK_BRANCH_PERFORMANCE}
      />

      {/* Overview Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverviewCalendar events={MOCK_CALENDAR_EVENTS} />
        {/* Empty space or additional widget can go here */}
      </div>
    </div>
  );
}
