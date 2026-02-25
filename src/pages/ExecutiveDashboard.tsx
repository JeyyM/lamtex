import React from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { KpiTile } from '@/src/components/dashboard/KpiTile';
import { ApprovalsTable } from '@/src/components/dashboard/ApprovalsTable';
import { InventoryAlerts } from '@/src/components/dashboard/InventoryAlerts';
import { SalesPerformance } from '@/src/components/dashboard/SalesPerformance';
import { OverviewCalendar } from '@/src/components/dashboard/OverviewCalendar';
import { TrendingUp, DollarSign, Package, Users } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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

  // Prepare chart data - Monthly Revenue & Orders Trend
  const monthlyTrend = [
    { month: 'Jan', revenue: 12500000, orders: 340, profit: 3750000 },
    { month: 'Feb', revenue: 13200000, orders: 365, profit: 3960000 },
    { month: 'Mar', revenue: 14800000, orders: 410, profit: 4440000 },
    { month: 'Apr', revenue: 13900000, orders: 385, profit: 4170000 },
    { month: 'May', revenue: 15600000, orders: 430, profit: 4680000 },
    { month: 'Jun', revenue: 16800000, orders: 465, profit: 5040000 },
  ];

  // Branch performance comparison
  const branchComparison = BRANCH_PERFORMANCE.map(bp => ({
    branch: bp.branch,
    sales: bp.sales / 1000000, // Convert to millions
    quota: bp.quota / 1000000,
    onTimeDelivery: bp.onTimeDelivery,
    stockouts: bp.stockouts,
  }));

  // Product category revenue breakdown
  const categoryRevenue = [
    { name: 'HDPE Products', value: 5200000, percentage: 31 },
    { name: 'UPVC Products', value: 4800000, percentage: 28 },
    { name: 'PPR Products', value: 4200000, percentage: 25 },
    { name: 'Accessories', value: 2680000, percentage: 16 },
  ];

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'];

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

      {/* WOW FACTOR CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Orders Trend - 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              Revenue & Orders Performance (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'Revenue' || name === 'Profit') {
                      return `₱${(value / 1000000).toFixed(2)}M`;
                    }
                    return value;
                  }}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#colorProfit)"
                  name="Profit"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Revenue Breakdown - 1 column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-red-600" />
              Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryRevenue}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name.split(' ')[0]} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₱${(value / 1000000).toFixed(2)}M`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {categoryRevenue.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                    <span className="text-gray-700">{cat.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">₱{(cat.value / 1000000).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600" />
            Branch Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={branchComparison} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="branch" type="category" width={80} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'Sales (₱M)' || name === 'Quota (₱M)') return `₱${value.toFixed(1)}M`;
                  if (name === 'On-Time (%)') return `${value}%`;
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#EF4444" name="Sales (₱M)" />
              <Bar dataKey="quota" fill="#F59E0B" name="Quota (₱M)" />
              <Line dataKey="onTimeDelivery" stroke="#10B981" strokeWidth={3} name="On-Time (%)" dot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
