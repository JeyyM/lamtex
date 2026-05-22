import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  PackageCheck,
  Truck,
  Download,
  Loader2,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Wallet,
  Activity,
  CheckCircle,
  Factory,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  BarChart,
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
  fetchReportsBundle,
  exportReportsOutstanding,
  formatReportsPeso,
  formatReportsPesoFull,
  type ReportsBundle,
  type ReportsTimeRange,
} from '@/src/lib/reportsData';

type ViewMode = 'overview' | 'sales' | 'agents' | 'products' | 'inventory' | 'operations';

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

const TIME_OPTIONS: { value: ReportsTimeRange; label: string }[] = [
  { value: '7D', label: 'Last 7 days' },
  { value: '1M', label: 'Last month' },
  { value: '3M', label: 'Last 3 months' },
  { value: '6M', label: 'Last 6 months' },
  { value: '1Y', label: 'Last 12 months' },
  { value: 'YTD', label: 'Year to date' },
  { value: 'ALL', label: 'All time' },
];

function getGrowthIcon(growth: number) {
  if (growth > 0) return <ArrowUpRight className="w-4 h-4 text-green-600" />;
  if (growth < 0) return <ArrowDownRight className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-gray-600" />;
}

function getGrowthColor(growth: number) {
  if (growth > 0) return 'text-green-600';
  if (growth < 0) return 'text-red-600';
  return 'text-gray-600';
}

function quotaBadgeVariant(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 100) return 'success';
  if (pct >= 75) return 'warning';
  return 'danger';
}

export function ReportsPage(): React.ReactElement {
  const { branch } = useAppContext();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timeRange, setTimeRange] = useState<ReportsTimeRange>('6M');
  const [bundle, setBundle] = useState<ReportsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setRefreshing(silent);
      setError(null);
      try {
        const data = await fetchReportsBundle({ branchName: branch, timeRange });
        setBundle(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load reports');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branch, timeRange],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const branchLabel = useMemo(() => {
    if (bundle?.branchName) return bundle.branchName;
    if (branch && branch.trim() !== '') return branch;
    return 'All branches';
  }, [bundle?.branchName, branch]);

  const handleExport = useCallback(async () => {
    if (exporting || !bundle) return;
    setExporting(true);
    try {
      await exportReportsOutstanding({
        branchName: branch,
        periodLabel: bundle.period.displayLabel,
      });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [exporting, bundle, branch]);

  const reportTabs: Array<{ id: ViewMode; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'sales', label: 'Sales', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'agents', label: 'Agents', icon: <Users className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <PackageCheck className="w-4 h-4" /> },
    { id: 'operations', label: 'Operations', icon: <Truck className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-7 h-7 animate-spin text-red-600" />
          <p className="text-sm">Loading reports…</p>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Could not load reports</h2>
          </div>
          <p className="text-sm text-gray-600">{error ?? 'No data available.'}</p>
          <Button variant="primary" onClick={() => void load()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const { executive, agents, finance, salesSeries, enhancements: enh } = bundle;
  const summary = agents.summary;
  const aov = summary.totalOrders > 0 ? summary.totalRevenue / summary.totalOrders : 0;
  const pipelineMax = Math.max(1, ...enh.orderPipeline.map((s) => s.orderCount));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            {branchLabel} · {bundle.period.displayLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as ReportsTimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => void load(true)} disabled={refreshing} className="gap-2">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
          <Button variant="primary" onClick={() => void handleExport()} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export AR
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="sm:hidden pb-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {reportTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>
        <nav className="hidden sm:flex gap-4 lg:gap-6 overflow-x-auto">
          {reportTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                viewMode === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* OVERVIEW */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Revenue"
              value={formatReportsPeso(summary.totalRevenue)}
              sub={
                <span className={`flex items-center gap-1 ${getGrowthColor(summary.revenueDeltaPct)}`}>
                  {getGrowthIcon(summary.revenueDeltaPct)}
                  {summary.revenueDeltaPct.toFixed(1)}% vs prior · {summary.totalOrders} orders
                </span>
              }
              icon={<DollarSign className="w-5 h-5 text-blue-600" />}
            />
            <KpiCard
              label="Gross profit"
              value={formatReportsPeso(summary.totalProfit)}
              sub={
                <span className={`flex items-center gap-1 ${getGrowthColor(summary.profitDeltaPct)}`}>
                  {getGrowthIcon(summary.profitDeltaPct)}
                  {summary.profitDeltaPct.toFixed(1)}% vs prior · {summary.profitMarginPct.toFixed(1)}% margin
                </span>
              }
              icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            />
            <KpiCard
              label="Outstanding AR"
              value={formatReportsPeso(finance.totalOutstanding)}
              sub={`${finance.overdueCount} overdue · ${formatReportsPeso(finance.totalOverdue)} past due`}
              icon={<Wallet className="w-5 h-5 text-amber-600" />}
            />
            <KpiCard
              label="On-time delivery"
              value={`${enh.periodCounts.onTimeMtd.toFixed(0)}%`}
              sub={
                <span className={getGrowthColor(enh.periodCounts.onTimeDeltaPts)}>
                  {enh.periodCounts.onTimeDeltaPts >= 0 ? '+' : ''}
                  {enh.periodCounts.onTimeDeltaPts.toFixed(1)} pts vs prior month · {executive.logistics.inTransitNow} in transit
                </span>
              }
              icon={<Truck className="w-5 h-5 text-indigo-600" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                Revenue trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {executive.revenueTrend.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No revenue data for this period.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={executive.revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatReportsPeso(v as number)} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Revenue" fill="#3B82F6" fillOpacity={0.2} stroke="#3B82F6" strokeWidth={2} />
                      <Bar dataKey="orderCount" name="Orders" fill="#10B981" barSize={20} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>AR aging</CardTitle></CardHeader>
              <CardContent>
                {enh.arAging.every((b) => b.orderCount === 0) ? (
                  <p className="text-sm text-gray-500">No outstanding receivables.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={enh.arAging} layout="vertical" margin={{ left: 8, right: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tickFormatter={(v) => formatReportsPeso(v as number)} tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="label" width={72} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                          <Bar dataKey="balanceDue" name="Balance due" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="pb-2 pr-3">Bucket</th>
                          <th className="pb-2 pr-3">Orders</th>
                          <th className="pb-2">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enh.arAging.map((b) => (
                          <tr key={b.label} className="border-b border-gray-100">
                            <td className="py-1.5 pr-3">{b.label}</td>
                            <td className="py-1.5 pr-3">{b.orderCount}</td>
                            <td className="py-1.5">{formatReportsPesoFull(b.balanceDue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Order pipeline</CardTitle></CardHeader>
              <CardContent>
                {enh.orderPipeline.length === 0 ? (
                  <p className="text-sm text-gray-500">No active orders in pipeline.</p>
                ) : (
                  <div className="space-y-2">
                    {enh.orderPipeline.map((stage) => (
                      <div key={stage.status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{stage.status}</span>
                          <span className="text-gray-600">
                            {stage.orderCount} · {formatReportsPeso(stage.totalValue)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-600 rounded-full"
                            style={{ width: `${(stage.orderCount / pipelineMax) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {enh.branchScorecard.length > 1 && (
            <Card>
              <CardHeader><CardTitle>Branch scorecard</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 pr-3">Branch</th>
                        <th className="pb-2 pr-3">Health</th>
                        <th className="pb-2 pr-3">Revenue</th>
                        <th className="pb-2 pr-3">Quota</th>
                        <th className="pb-2 pr-3">Margin</th>
                        <th className="pb-2 pr-3">On-time</th>
                        <th className="pb-2">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enh.branchScorecard.map((b) => (
                        <tr key={b.branchId} className="border-b border-gray-100">
                          <td className="py-2 pr-3 font-medium">{b.branchName}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={quotaBadgeVariant(b.healthScore)}>{b.healthScore}</Badge>
                          </td>
                          <td className="py-2 pr-3">{formatReportsPesoFull(b.revenue)}</td>
                          <td className="py-2 pr-3">{b.quotaAttainmentPct.toFixed(0)}%</td>
                          <td className="py-2 pr-3">{b.profitMarginPct.toFixed(1)}%</td>
                          <td className="py-2 pr-3">{b.onTimePct.toFixed(0)}%</td>
                          <td className="py-2">{formatReportsPesoFull(b.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Branch performance (MTD)</CardTitle></CardHeader>
              <CardContent>
                {executive.branchBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-500">No branch data.</p>
                ) : (
                  <div className="space-y-2">
                    {executive.branchBreakdown.slice(0, 6).map((b) => (
                      <div key={b.branchName} className="flex items-center justify-between rounded-md border p-2.5">
                        <div>
                          <p className="font-medium text-sm">{b.branchName}</p>
                          <p className="text-xs text-gray-500">{b.orderCountMTD} orders</p>
                        </div>
                        <p className="font-semibold text-sm">{formatReportsPeso(b.revenueMTD)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Finance snapshot</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <FinanceRow label="Collected this month" value={formatReportsPesoFull(finance.collectedThisMonth)} />
                <FinanceRow label="Total overdue" value={formatReportsPesoFull(finance.totalOverdue)} danger={finance.totalOverdue > 0} />
                <FinanceRow label="Pending proofs" value={String(finance.pendingProofs)} />
                <FinanceRow label="Commission liability" value={formatReportsPesoFull(summary.commissionLiability)} />
                <FinanceRow label="Commission paid (period)" value={formatReportsPesoFull(summary.commissionPaid)} />
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/finance')}>
                  Open Finance
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SALES */}
      {viewMode === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Period revenue" value={formatReportsPeso(summary.totalRevenue)} sub={
              <span className={`flex items-center gap-1 ${getGrowthColor(summary.revenueDeltaPct)}`}>
                {getGrowthIcon(summary.revenueDeltaPct)}
                {summary.revenueDeltaPct.toFixed(1)}% vs prior
              </span>
            } icon={<DollarSign className="w-5 h-5 text-blue-600" />} />
            <KpiCard label="Orders" value={summary.totalOrders.toLocaleString()} sub={
              <span className={`flex items-center gap-1 ${getGrowthColor(enh.periodCounts.ordersDeltaPct)}`}>
                {getGrowthIcon(enh.periodCounts.ordersDeltaPct)}
                {enh.periodCounts.ordersDeltaPct.toFixed(1)}% vs prior
              </span>
            } icon={<ShoppingCart className="w-5 h-5 text-green-600" />} />
            <KpiCard label="Avg order value" value={formatReportsPesoFull(aov)} icon={<Target className="w-5 h-5 text-purple-600" />} />
            <KpiCard label="Profit" value={formatReportsPeso(summary.totalProfit)} sub={
              <span className={getGrowthColor(summary.profitDeltaPct)}>
                {summary.profitDeltaPct >= 0 ? '+' : ''}{summary.profitDeltaPct.toFixed(1)}% vs prior
              </span>
            } icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} />
          </div>

          <Card>
            <CardHeader><CardTitle>Monthly sales ({bundle.period.displayLabel})</CardTitle></CardHeader>
            <CardContent>
              {salesSeries.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No sales in selected period.</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={salesSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis yAxisId="left" tickFormatter={(v) => formatReportsPeso(v as number)} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v: number, name: string) =>
                        name === 'Growth %' ? `${v.toFixed(1)}%` : name === 'Orders' ? v : formatReportsPesoFull(v)
                      } />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" fill="#10B981" fillOpacity={0.2} stroke="#10B981" />
                      <Line yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke="#3B82F6" />
                      <Bar yAxisId="right" dataKey="growth" name="Growth %" fill="#F59E0B" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Collection vs revenue</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <FinanceRow
                  label="Collected (period)"
                  value={formatReportsPesoFull(enh.collectionCompare.collectedCurrent)}
                />
                <FinanceRow
                  label="Prior period collected"
                  value={formatReportsPesoFull(enh.collectionCompare.collectedPrev)}
                />
                <FinanceRow
                  label="Collection rate"
                  value={`${enh.collectionCompare.collectionRateCurrent.toFixed(1)}%`}
                />
                <FinanceRow
                  label="Prior collection rate"
                  value={`${enh.collectionCompare.collectionRatePrev.toFixed(1)}%`}
                />
                <p className={`text-xs flex items-center gap-1 ${getGrowthColor(enh.collectionCompare.collectedDeltaPct)}`}>
                  {getGrowthIcon(enh.collectionCompare.collectedDeltaPct)}
                  {enh.collectionCompare.collectedDeltaPct.toFixed(1)}% change in collections vs prior period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Discount by branch</CardTitle></CardHeader>
              <CardContent>
                {enh.discountByBranch.length === 0 ? (
                  <p className="text-sm text-gray-500">No discount data in period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="pb-2 pr-3">Branch</th>
                          <th className="pb-2 pr-3">Orders</th>
                          <th className="pb-2 pr-3">Avg disc.</th>
                          <th className="pb-2">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enh.discountByBranch.slice(0, 8).map((r) => (
                          <tr key={r.name} className="border-b border-gray-100">
                            <td className="py-2 pr-3 font-medium">{r.name}</td>
                            <td className="py-2 pr-3">{r.orderCount}</td>
                            <td className="py-2 pr-3">{r.avgDiscountPct.toFixed(1)}%</td>
                            <td className="py-2">{formatReportsPesoFull(r.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {executive.branchBreakdown.length > 1 && (
            <Card>
              <CardHeader><CardTitle>Revenue by branch (MTD)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={executive.branchBreakdown.map((b) => ({ name: b.branchName, value: b.revenueMTD }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {executive.branchBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Top customers (YTD)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4">Customer</th>
                      <th className="pb-2 pr-4">Orders</th>
                      <th className="pb-2 pr-4">Purchases</th>
                      <th className="pb-2">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executive.topCustomers.slice(0, 10).map((c) => (
                      <tr key={c.customerId} className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-medium">{c.customerName}</td>
                        <td className="py-2 pr-4">{c.orderCount}</td>
                        <td className="py-2 pr-4">{formatReportsPesoFull(c.totalPurchasesYTD)}</td>
                        <td className="py-2">{formatReportsPesoFull(c.outstandingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AGENTS */}
      {viewMode === 'agents' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Active agents" value={String(summary.totalAgents)} icon={<Users className="w-5 h-5 text-blue-600" />} />
            <KpiCard label="Avg quota attainment" value={`${summary.attainmentAvgPct.toFixed(0)}%`} sub={`${summary.agentsAboveQuota} above quota`} icon={<Target className="w-5 h-5 text-emerald-600" />} />
            <KpiCard label="Commission earned" value={formatReportsPeso(summary.commissionEarned)} icon={<DollarSign className="w-5 h-5 text-amber-600" />} />
            <KpiCard label="Unassigned customers" value={String(summary.customersUnassigned)} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Agent leaderboard</CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate('/agent-analytics')}>Full analytics</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-3">Agent</th>
                      <th className="pb-2 pr-3">Revenue</th>
                      <th className="pb-2 pr-3">Orders</th>
                      <th className="pb-2 pr-3">Quota %</th>
                      <th className="pb-2 pr-3">Profit</th>
                      <th className="pb-2 pr-3">Collection</th>
                      <th className="pb-2 pr-3">Earned</th>
                      <th className="pb-2 pr-3">Paid</th>
                      <th className="pb-2">Accrued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.agents.slice(0, 15).map((a) => (
                      <tr key={a.agentId} className="border-b border-gray-100">
                        <td className="py-2 pr-3 font-medium">{a.agentName}</td>
                        <td className="py-2 pr-3">{formatReportsPesoFull(a.revenue)}</td>
                        <td className="py-2 pr-3">{a.orderCount}</td>
                        <td className="py-2 pr-3">
                          <Badge variant={quotaBadgeVariant(a.attainmentPct)}>{a.attainmentPct.toFixed(0)}%</Badge>
                        </td>
                        <td className="py-2 pr-3">{formatReportsPesoFull(a.profit)}</td>
                        <td className="py-2 pr-3">{a.collectionRate.toFixed(0)}%</td>
                        <td className="py-2 pr-3">{formatReportsPesoFull(a.commissionEarned)}</td>
                        <td className="py-2 pr-3">{formatReportsPesoFull(a.commissionPaid)}</td>
                        <td className="py-2">{formatReportsPesoFull(a.commissionAccrued)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {agents.branches.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Branch comparison</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 pr-3">Branch</th>
                        <th className="pb-2 pr-3">Revenue</th>
                        <th className="pb-2 pr-3">Margin</th>
                        <th className="pb-2 pr-3">Outstanding</th>
                        <th className="pb-2">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.branches.map((b) => (
                        <tr key={b.branchId} className="border-b border-gray-100">
                          <td className="py-2 pr-3 font-medium">{b.branchName}</td>
                          <td className="py-2 pr-3">{formatReportsPesoFull(b.revenue)}</td>
                          <td className="py-2 pr-3">{b.avgMarginPct.toFixed(1)}%</td>
                          <td className="py-2 pr-3">{formatReportsPesoFull(b.outstanding)}</td>
                          <td className="py-2">#{b.rank}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* PRODUCTS */}
      {viewMode === 'products' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Top products ({bundle.period.displayLabel})</CardTitle></CardHeader>
            <CardContent>
              {bundle.productsInPeriod.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No product sales in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 pr-4">Product</th>
                        <th className="pb-2 pr-4">Units</th>
                        <th className="pb-2 pr-4">Orders</th>
                        <th className="pb-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bundle.productsInPeriod.map((p) => (
                        <tr key={p.productName} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium">{p.productName}</td>
                          <td className="py-2 pr-4">{p.unitsSold.toLocaleString()}</td>
                          <td className="py-2 pr-4">{p.orderCount}</td>
                          <td className="py-2">{formatReportsPesoFull(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top products (MTD — executive view)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4">Product family</th>
                      <th className="pb-2 pr-4">Units</th>
                      <th className="pb-2 pr-4">Variants</th>
                      <th className="pb-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executive.topProducts.map((p) => (
                      <tr key={p.productName} className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-medium">{p.productName}</td>
                        <td className="py-2 pr-4">{p.unitsSoldMTD.toLocaleString()}</td>
                        <td className="py-2 pr-4">{p.variantCount}</td>
                        <td className="py-2">{formatReportsPesoFull(p.revenueMTD)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {enh.categoryMargins.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Margin by category ({bundle.period.displayLabel})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 pr-4">Category</th>
                        <th className="pb-2 pr-4">Units</th>
                        <th className="pb-2 pr-4">Revenue</th>
                        <th className="pb-2 pr-4">Profit</th>
                        <th className="pb-2">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enh.categoryMargins.slice(0, 15).map((c) => (
                        <tr key={c.categoryName} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium">{c.categoryName}</td>
                          <td className="py-2 pr-4">{c.unitsSold.toLocaleString()}</td>
                          <td className="py-2 pr-4">{formatReportsPesoFull(c.revenue)}</td>
                          <td className="py-2 pr-4">{formatReportsPesoFull(c.profit)}</td>
                          <td className="py-2">{c.marginPct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* INVENTORY */}
      {viewMode === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard label="Low-stock products" value={String(executive.inventory.lowStockProductCount)} icon={<Package className="w-5 h-5 text-amber-600" />} />
            <KpiCard label="Low-stock materials" value={String(executive.inventory.lowStockMaterialCount)} icon={<Factory className="w-5 h-5 text-orange-600" />} />
            <KpiCard label="Pending POs" value={String(executive.approvals.pendingPurchaseOrderCount)} sub={formatReportsPeso(executive.approvals.pendingPurchaseOrderValue)} icon={<PackageCheck className="w-5 h-5 text-blue-600" />} />
            <KpiCard label="Pending PRs" value={String(executive.approvals.pendingProductionRequestCount)} icon={<Activity className="w-5 h-5 text-purple-600" />} />
            <KpiCard label="Pending IBRs" value={String(executive.approvals.pendingInterBranchRequestCount)} icon={<Truck className="w-5 h-5 text-indigo-600" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Low-stock products</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {executive.inventory.lowStockProducts.length === 0 ? (
                  <p className="text-sm text-gray-500">No low-stock product alerts.</p>
                ) : (
                  executive.inventory.lowStockProducts.map((p) => (
                    <div key={p.variantId} className="rounded-md border p-2.5 text-sm">
                      <p className="font-medium">{p.productName}</p>
                      <p className="text-xs text-gray-500">{p.sku} · {p.daysOfCover != null ? `${p.daysOfCover}d cover` : '—'}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Low-stock materials</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {executive.inventory.lowStockMaterials.length === 0 ? (
                  <p className="text-sm text-gray-500">No low-stock material alerts.</p>
                ) : (
                  executive.inventory.lowStockMaterials.map((m) => (
                    <div key={m.materialId} className="rounded-md border p-2.5 text-sm">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        {m.totalStock} {m.unit} · {m.daysOfCover != null ? `${m.daysOfCover}d cover` : '—'}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* OPERATIONS */}
      {viewMode === 'operations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Trips MTD" value={String(executive.logistics.totalTripsMTD)} icon={<Truck className="w-5 h-5 text-blue-600" />} />
            <KpiCard label="On-time rate" value={`${executive.logistics.onTimeRate.toFixed(0)}%`} icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} />
            <KpiCard label="Delayed MTD" value={String(executive.logistics.delayedTripsMTD)} icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} />
            <KpiCard label="In transit now" value={String(executive.logistics.inTransitNow)} icon={<Activity className="w-5 h-5 text-indigo-600" />} />
          </div>

          <Card>
            <CardHeader><CardTitle>On-time delivery trend (6 months)</CardTitle></CardHeader>
            <CardContent>
              {enh.onTimeTrend.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No trip data for trend.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={enh.onTimeTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                      <Tooltip formatter={(v: number, name: string) =>
                        name === 'On-time %' ? `${v.toFixed(1)}%` : v
                      } />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="onTimePct" name="On-time %" stroke="#10B981" strokeWidth={2} />
                      <Bar yAxisId="right" dataKey="delayed" name="Delayed" fill="#F59E0B" barSize={16} />
                      <Bar yAxisId="right" dataKey="failed" name="Failed" fill="#EF4444" barSize={16} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>Order cycle time</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {enh.cycleTime.sampleSize === 0 ? (
                  <p className="text-gray-500">No delivered orders in period.</p>
                ) : (
                  <>
                    <FinanceRow label="Average" value={`${enh.cycleTime.avgDays.toFixed(1)} days`} />
                    <FinanceRow label="Median" value={`${enh.cycleTime.medianDays.toFixed(1)} days`} />
                    <FinanceRow label="Sample size" value={String(enh.cycleTime.sampleSize)} />
                    <div className="pt-2 space-y-1">
                      {enh.cycleTime.buckets.map((b) => (
                        <div key={b.label} className="flex justify-between text-xs text-gray-600">
                          <span>{b.label}</span>
                          <span>{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Delay root causes</CardTitle></CardHeader>
              <CardContent>
                {enh.delayBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-500">No delay exceptions in period.</p>
                ) : (
                  <div className="space-y-2">
                    {enh.delayBreakdown.map((d) => (
                      <div key={d.type} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                        <span>{d.type}</span>
                        <span className="text-gray-600">
                          {d.count} total{d.openCount > 0 ? ` · ${d.openCount} open` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Procurement pipeline</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <OpsRow label="Pending POs" count={executive.approvals.pendingPurchaseOrderCount} value={formatReportsPeso(executive.approvals.pendingPurchaseOrderValue)} />
                <OpsRow label="Pending PRs" count={executive.approvals.pendingProductionRequestCount} />
                <OpsRow label="Pending IBRs" count={executive.approvals.pendingInterBranchRequestCount} />
                <OpsRow label="Orders awaiting approval" count={executive.approvals.pendingOrderCount} value={formatReportsPeso(executive.approvals.pendingOrderValue)} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Approval backlog</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <OpsRow label="Orders pending approval" count={executive.approvals.pendingOrderCount} value={formatReportsPeso(executive.approvals.pendingOrderValue)} />
                <OpsRow label="Production requests" count={executive.approvals.pendingProductionRequestCount} />
                <OpsRow label="Purchase orders" count={executive.approvals.pendingPurchaseOrderCount} value={formatReportsPeso(executive.approvals.pendingPurchaseOrderValue)} />
                <OpsRow label="Inter-branch requests" count={executive.approvals.pendingInterBranchRequestCount} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Logistics summary (MTD)</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <FinanceRow label="Completed trips" value={String(executive.logistics.completedTripsMTD)} />
                <FinanceRow label="Failed trips" value={String(executive.logistics.failedTripsMTD)} />
                <FinanceRow label="Delayed trips" value={String(executive.logistics.delayedTripsMTD)} />
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/logistics')}>
                  Open Logistics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-right">
        Generated {new Date(bundle.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function KpiCard(props: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{props.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{props.value}</p>
            {props.sub && <div className="text-xs mt-1 text-gray-500">{props.sub}</div>}
          </div>
          <div className="p-2 bg-gray-100 rounded-lg shrink-0">{props.icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function FinanceRow(props: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{props.label}</span>
      <span className={`font-medium ${props.danger ? 'text-red-700' : 'text-gray-900'}`}>{props.value}</span>
    </div>
  );
}

function OpsRow(props: { label: string; count: number; value?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
      <span className="text-gray-600">{props.label}</span>
      <span className="font-medium">
        {props.count}
        {props.value ? ` · ${props.value}` : ''}
      </span>
    </div>
  );
}
