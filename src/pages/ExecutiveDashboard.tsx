import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileText,
  Truck,
  ShoppingCart,
  Factory,
  ClipboardList,
  Repeat,
  Loader2,
  RefreshCw,
  ChevronRight,
  Wallet,
  Building2,
  PackageCheck,
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
} from 'recharts';
import {
  fetchExecutiveDashboard,
  formatExecutivePeso,
  formatExecutiveMarginPct,
  type ExecutiveDashboardBundle,
  type PendingOrderApprovalRow,
  type PendingPRRow,
  type PendingPORow,
  type PendingIBRRow,
} from '@/src/lib/executiveDashboard';
import { ExecutiveKpiStrip } from '@/src/components/executive/ExecutiveKpiStrip';
import {
  DashLink,
  DashQueueLink,
  DashTableRowLink,
  DashHeaderLink,
  DASH_LINK_CLASS,
} from '@/src/components/executive/executiveLinks';
import { finishedGoodProductHref } from '@/src/lib/productRoutes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.floor((d.getTime() - start) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ExecutiveDashboard(): React.ReactElement {
  const { branch } = useAppContext();

  const [bundle, setBundle] = useState<ExecutiveDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setRefreshing(silent);
      setError(null);
      try {
        const data = await fetchExecutiveDashboard({ branchName: branch });
        setBundle(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load executive dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branch],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const branchLabel = useMemo(() => {
    if (bundle?.branchName) return bundle.branchName;
    if (branch && branch.trim() !== '') return branch;
    return 'All branches';
  }, [bundle?.branchName, branch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-7 h-7 animate-spin text-red-600" />
          <p className="text-sm">Loading executive overview…</p>
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
            <h2 className="text-lg font-semibold">Could not load dashboard</h2>
          </div>
          <p className="text-sm text-gray-600">{error ?? 'No data available.'}</p>
          <Button variant="primary" onClick={() => void load()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalApprovalCount =
    bundle.approvals.pendingOrderCount +
    bundle.approvals.pendingProductionRequestCount +
    bundle.approvals.pendingPurchaseOrderCount +
    bundle.approvals.pendingInterBranchRequestCount;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            {branchLabel} · Strategic oversight, approvals, finance &amp; performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
          <DashHeaderLink to="/orders">
            <FileText className="w-4 h-4" /> All Orders
          </DashHeaderLink>
        </div>
      </div>

      {/* KPI STRIP */}
      <ExecutiveKpiStrip kpis={bundle.kpis} />

      {/* APPROVAL QUEUE — PENDING ORDERS */}
      <PendingOrdersCard
        rows={bundle.approvals.pendingOrders}
        totalCount={bundle.approvals.pendingOrderCount}
      />

      {/* PROCUREMENT / IBR QUEUES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PendingPRsCard
          rows={bundle.approvals.pendingProductionRequests}
          count={bundle.approvals.pendingProductionRequestCount}
        />
        <PendingPOsCard
          rows={bundle.approvals.pendingPurchaseOrders}
          count={bundle.approvals.pendingPurchaseOrderCount}
          totalValue={bundle.approvals.pendingPurchaseOrderValue}
        />
        <PendingIBRsCard
          rows={bundle.approvals.pendingInterBranchRequests}
          count={bundle.approvals.pendingInterBranchRequestCount}
        />
      </div>

      {/* FINANCE SNAPSHOT */}
      <FinanceSnapshotCard metrics={bundle.finance} revenueTrend={bundle.revenueTrend} />

      {/* BRANCH BREAKDOWN — only meaningful when looking org-wide or 1+ branches exist */}
      {bundle.branchBreakdown.length > 1 && <BranchBreakdownCard rows={bundle.branchBreakdown} />}

      {/* INVENTORY EXCEPTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LowStockProductsCard
          rows={bundle.inventory.lowStockProducts}
          count={bundle.inventory.lowStockProductCount}
        />
        <LowStockMaterialsCard
          rows={bundle.inventory.lowStockMaterials}
          count={bundle.inventory.lowStockMaterialCount}
        />
      </div>

      {/* LOGISTICS HEALTH */}
      <LogisticsHealthCard logistics={bundle.logistics} />

      {/* STRATEGIC INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopProductsCard rows={bundle.topProducts} />
        <TopCustomersCard rows={bundle.topCustomers} />
        <TopAgentsCard rows={bundle.topAgents} />
      </div>

      <p className="text-xs text-gray-400 text-right">
        Generated {new Date(bundle.generatedAt).toLocaleString()} ·{' '}
        {totalApprovalCount > 0 ? `${totalApprovalCount} item${totalApprovalCount === 1 ? '' : 's'} awaiting your approval` : 'All caught up'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ----- Pending orders -----

function PendingOrdersCard(props: {
  rows: PendingOrderApprovalRow[];
  totalCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-600" />
            Pending Sales Approvals
            {props.totalCount > 0 && (
              <Badge variant="warning" className="ml-1">{props.totalCount} pending</Badge>
            )}
          </CardTitle>
          <DashHeaderLink to="/orders">
            All orders <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No orders waiting for executive approval.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[640px] table-fixed text-sm">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[20%]" />
                <col className="w-[15%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[18%]" />
                <col className="w-[3%]" />
              </colgroup>
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-2.5 px-2 text-left font-semibold">Order</th>
                  <th className="py-2.5 px-2 text-left font-semibold">Customer</th>
                  <th className="py-2.5 px-2 text-left font-semibold">Agent · Branch</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Original</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Net · margin</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Est. profit</th>
                  <th className="py-2.5 px-2 text-right font-semibold">Required</th>
                  <th className="py-2.5 px-1" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {props.rows.map((r) => {
                  const days = daysUntil(r.requiredDate);
                  const urgencyClass =
                    days != null && days <= 0
                      ? 'text-red-600 font-semibold'
                      : days != null && days <= 3
                        ? 'text-amber-600 font-medium'
                        : 'text-gray-600';
                  const marginClass =
                    r.lineCount === 0
                      ? 'text-gray-400'
                      : r.profitMarginPct < 0 || r.grossProfit < 0
                        ? 'text-red-700 font-semibold'
                        : r.profitMarginPct < 10
                          ? 'text-red-600 font-semibold'
                          : r.profitMarginPct < 20
                            ? 'text-amber-600 font-medium'
                            : 'text-emerald-700 font-medium';
                  const hasDiscount =
                    r.originalTotalAmount > r.netTotalAmount + 1 &&
                    (r.discountPercent > 0.05 || r.discountAmount > 0);
                  const profitClass =
                    r.lineCount === 0
                      ? 'text-gray-400'
                      : r.grossProfit < 0
                        ? 'text-red-700 font-semibold'
                        : r.grossProfit > 0
                          ? 'text-emerald-700 font-medium'
                          : 'text-gray-600';
                  return (
                    <DashTableRowLink
                      key={r.id}
                      to={`/orders/${r.id}`}
                      title={`${r.orderNumber} — right-click or Ctrl+click to open in new tab`}
                    >
                      <td className="table-cell py-2.5 px-2 align-middle font-mono text-xs text-gray-900 whitespace-nowrap">
                        {r.orderNumber}
                      </td>
                      <td className="table-cell py-2.5 px-2 align-middle text-gray-800">
                        <span className="block truncate" title={r.customerName}>
                          {r.customerName}
                        </span>
                      </td>
                      <td className="table-cell py-2.5 px-2 align-middle text-gray-600">
                        <div className="leading-tight min-w-0">
                          <div className="text-xs truncate" title={r.agentName ?? undefined}>
                            {r.agentName ?? '—'}
                          </div>
                          <div className="text-xs text-gray-400 truncate" title={r.branchName ?? undefined}>
                            {r.branchName ?? '—'}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell py-2.5 px-2 align-middle text-center tabular-nums whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {formatExecutivePeso(r.originalTotalAmount)}
                        </div>
                        {hasDiscount && (
                          <div
                            className="text-[10px] text-amber-600 font-medium mt-0.5"
                            title={`Discount ${r.discountPercent.toFixed(1)}% (${formatExecutivePeso(r.discountAmount)})`}
                          >
                            −{r.discountPercent.toFixed(1)}%
                          </div>
                        )}
                      </td>
                      <td className="table-cell py-2.5 px-2 align-middle text-center tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          {formatExecutivePeso(r.netTotalAmount)}
                        </span>
                        <span className="text-gray-300 mx-1">·</span>
                        <span className={marginClass}>
                          {r.lineCount > 0
                            ? formatExecutiveMarginPct(r.profitMarginPct, r.grossProfit)
                            : '—'}
                        </span>
                      </td>
                      <td className={`table-cell py-2.5 px-2 align-middle text-center tabular-nums whitespace-nowrap ${profitClass}`}>
                        {r.lineCount > 0 ? formatExecutivePeso(r.grossProfit) : '—'}
                      </td>
                      <td className={`table-cell py-2.5 px-2 align-middle text-right whitespace-nowrap ${urgencyClass}`}>
                        {formatDateShort(r.requiredDate)}
                        {days != null && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({days <= 0 ? `${Math.abs(days)}d overdue` : `${days}d`})
                          </span>
                        )}
                      </td>
                      <td className="table-cell py-2.5 px-1 align-middle text-right">
                        <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
                      </td>
                    </DashTableRowLink>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----- Procurement / IBR queues -----

function ApprovalQueueCard(props: {
  icon: React.ReactNode;
  title: string;
  count: number;
  emptyText: string;
  viewAllHref: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {props.icon}
            {props.title}
            {props.count > 0 && <Badge variant="warning">{props.count}</Badge>}
          </CardTitle>
          <DashHeaderLink to={props.viewAllHref} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm">
            <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.count === 0 ? <p className="text-sm text-gray-500 py-4 text-center">{props.emptyText}</p> : props.children}
        {props.footer && props.count > 0 && (
          <p className="text-xs text-gray-500 mt-3 border-t border-gray-100 pt-2">{props.footer}</p>
        )}
      </CardContent>
    </Card>
  );
}

function PendingPRsCard(props: {
  rows: PendingPRRow[];
  count: number;
}) {
  return (
    <ApprovalQueueCard
      icon={<Factory className="w-4 h-4 text-violet-600" />}
      title="Production requests"
      count={props.count}
      emptyText="No PRs awaiting approval"
      viewAllHref="/production-requests"
      footer={props.count > props.rows.length ? `${props.count - props.rows.length} more awaiting review` : undefined}
    >
      <div className="space-y-2">
        {props.rows.map((r) => (
          <DashQueueLink
            key={r.id}
            to={`/production-requests/${r.id}`}
            title={`${r.prNumber} — right-click or Ctrl+click to open in new tab`}
            className="rounded-md border border-gray-200 p-2 hover:border-violet-300 hover:bg-violet-50/30"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-gray-900">{r.prNumber}</span>
              <span className="text-xs text-gray-500">{r.itemCount} items</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {r.branchName ?? '—'} · expect {formatDateShort(r.expectedCompletionDate)}
            </div>
            {r.createdBy && <div className="text-[11px] text-gray-400 mt-0.5">by {r.createdBy}</div>}
          </DashQueueLink>
        ))}
      </div>
    </ApprovalQueueCard>
  );
}

function PendingPOsCard(props: {
  rows: PendingPORow[];
  count: number;
  totalValue: number;
}) {
  return (
    <ApprovalQueueCard
      icon={<PackageCheck className="w-4 h-4 text-amber-600" />}
      title="Purchase orders"
      count={props.count}
      emptyText="No POs awaiting approval"
      viewAllHref="/purchase-orders"
      footer={
        props.count > 0
          ? `Total spend if approved: ${formatExecutivePeso(props.totalValue)}`
          : undefined
      }
    >
      <div className="space-y-2">
        {props.rows.map((r) => (
          <DashQueueLink
            key={r.id}
            to={`/purchase-orders/${r.id}`}
            title={`${r.poNumber} — right-click or Ctrl+click to open in new tab`}
            className="rounded-md border border-gray-200 p-2 hover:border-amber-300 hover:bg-amber-50/30"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-gray-900">{r.poNumber}</span>
              <span className="text-xs font-medium text-gray-900">{formatExecutivePeso(r.totalAmount)}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {r.supplierName ?? '—'} · {r.branchName ?? '—'}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {r.itemCount} item{r.itemCount === 1 ? '' : 's'} · expect {formatDateShort(r.expectedDeliveryDate)}
            </div>
          </DashQueueLink>
        ))}
      </div>
    </ApprovalQueueCard>
  );
}

function PendingIBRsCard(props: {
  rows: PendingIBRRow[];
  count: number;
}) {
  return (
    <ApprovalQueueCard
      icon={<Repeat className="w-4 h-4 text-blue-600" />}
      title="Inter-branch requests"
      count={props.count}
      emptyText="No IBRs awaiting approval"
      viewAllHref="/inter-branch-requests"
      footer={props.count > props.rows.length ? `${props.count - props.rows.length} more awaiting review` : undefined}
    >
      <div className="space-y-2">
        {props.rows.map((r) => (
          <DashQueueLink
            key={r.id}
            to={`/inter-branch-requests/${r.id}`}
            title={`${r.ibrNumber} — right-click or Ctrl+click to open in new tab`}
            className="rounded-md border border-gray-200 p-2 hover:border-blue-300 hover:bg-blue-50/30"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-gray-900">{r.ibrNumber}</span>
              <span className="text-xs text-gray-500">{formatDateShort(r.createdAt)}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {r.requestingBranchName ?? '—'} <ArrowRight className="w-3 h-3 inline" /> {r.fulfillingBranchName ?? '—'}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Depart {formatDateShort(r.scheduledDepartureDate)}
              {r.createdBy && ` · by ${r.createdBy}`}
            </div>
          </DashQueueLink>
        ))}
      </div>
    </ApprovalQueueCard>
  );
}

// ----- Finance snapshot -----

function FinanceSnapshotCard(props: {
  metrics: ExecutiveDashboardBundle['finance'];
  revenueTrend: ExecutiveDashboardBundle['revenueTrend'];
}) {
  const m = props.metrics;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Financial snapshot &amp; revenue trend
          </CardTitle>
          <DashHeaderLink to="/finance">
            Open finance <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <FinanceTile
            label="Outstanding"
            value={formatExecutivePeso(m.totalOutstanding)}
            subtitle={`${m.overdueCount} overdue invoice${m.overdueCount === 1 ? '' : 's'}`}
            tone={m.totalOutstanding > 0 ? 'neutral' : 'good'}
          />
          <FinanceTile
            label="Overdue balance"
            value={formatExecutivePeso(m.totalOverdue)}
            subtitle={m.totalOverdue > 0 ? 'Needs follow-up' : 'On track'}
            tone={m.totalOverdue > 0 ? 'danger' : 'good'}
          />
          <FinanceTile
            label="Collected (MTD)"
            value={formatExecutivePeso(m.collectedThisMonth)}
            subtitle="From payment proofs this month"
            tone="good"
          />
          <FinanceTile
            label="Pending proofs"
            value={String(m.pendingProofs)}
            subtitle={`${formatExecutivePeso(m.pendingCommissions)} commission to release`}
            tone={m.pendingProofs > 0 ? 'warning' : 'good'}
          />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={props.revenueTrend}>
              <defs>
                <linearGradient id="execRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" stroke="#9CA3AF" />
              <YAxis
                stroke="#9CA3AF"
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `₱${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `₱${(v / 1000).toFixed(0)}K` : `₱${v}`
                }
                width={70}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'Revenue' ? formatExecutivePeso(value) : value.toLocaleString()
                }
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" strokeWidth={2.5} fill="url(#execRevenue)" />
              <Bar dataKey="orderCount" name="Orders" fill="#A78BFA" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function FinanceTile(props: {
  label: string;
  value: string;
  subtitle?: string;
  tone: 'good' | 'warning' | 'danger' | 'neutral';
}) {
  const toneClass: Record<typeof props.tone, string> = {
    good: 'border-emerald-200 bg-emerald-50/40 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50/40 text-amber-800',
    danger: 'border-red-200 bg-red-50/40 text-red-800',
    neutral: 'border-gray-200 bg-white text-gray-800',
  };
  return (
    <div className={`rounded-md border p-3 ${toneClass[props.tone]}`}>
      <p className="text-[11px] uppercase tracking-wider opacity-80">{props.label}</p>
      <p className="text-lg font-bold mt-1">{props.value}</p>
      {props.subtitle && <p className="text-[11px] mt-1 opacity-75">{props.subtitle}</p>}
    </div>
  );
}

// ----- Branch breakdown -----

function BranchBreakdownCard(props: { rows: ExecutiveDashboardBundle['branchBreakdown'] }) {
  const data = props.rows.map((r) => ({
    name: r.branchCode ?? r.branchName,
    fullName: r.branchName,
    revenue: r.revenueMTD,
    overdue: r.overdueBalance,
    orders: r.orderCountMTD,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          Branch performance (MTD)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis
                stroke="#9CA3AF"
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `₱${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `₱${(v / 1000).toFixed(0)}K` : `₱${v}`
                }
                width={70}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'Orders' ? value.toLocaleString() : formatExecutivePeso(value)
                }
                labelFormatter={(_l: string, payload?: ReadonlyArray<{ payload?: { fullName?: string } }>) =>
                  payload?.[0]?.payload?.fullName ?? _l
                }
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, border: '1px solid #E5E7EB' }}
              />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={56} />
              <Bar dataKey="overdue" name="Overdue" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-2 pr-3">Branch</th>
                <th className="py-2 pr-3 text-right">Revenue (MTD)</th>
                <th className="py-2 pr-3 text-right">Orders</th>
                <th className="py-2 pr-3 text-right">Outstanding</th>
                <th className="py-2 pr-3 text-right">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((r) => (
                <tr key={r.branchId} className="border-b border-gray-100">
                  <td className="py-2 pr-3 text-gray-800">
                    {r.branchName}
                    {r.branchCode && <span className="text-xs text-gray-400 ml-2">{r.branchCode}</span>}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium text-gray-900">{formatExecutivePeso(r.revenueMTD)}</td>
                  <td className="py-2 pr-3 text-right text-gray-700">{r.orderCountMTD.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right text-gray-700">{formatExecutivePeso(r.outstandingBalance)}</td>
                  <td className={`py-2 pr-3 text-right ${r.overdueBalance > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {formatExecutivePeso(r.overdueBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ----- Inventory exceptions -----

function LowStockProductsCard(props: {
  rows: ExecutiveDashboardBundle['inventory']['lowStockProducts'];
  count: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4 text-orange-600" />
            Low-stock products
            {props.count > 0 && <Badge variant="warning">{props.count}</Badge>}
          </CardTitle>
          <DashHeaderLink to="/warehouse">
            Warehouse <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">All products are above reorder point.</p>
        ) : (
          <div className="space-y-2">
            {props.rows.map((r) => (
              <DashQueueLink
                key={r.variantId}
                to={r.productId ? finishedGoodProductHref(r.productId, r.categorySlug) : '/products'}
                title={`${r.productName} — right-click or Ctrl+click to open in new tab`}
                className="rounded-md border border-gray-200 p-2 hover:border-orange-300 hover:bg-orange-50/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm text-gray-900 truncate">{r.productName}</div>
                  <Badge variant={r.totalStock === 0 ? 'danger' : 'warning'} className="text-[10px] shrink-0">
                    {r.totalStock === 0 ? 'Stockout' : 'Low'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {r.size} · SKU {r.sku}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Stock <span className="font-medium text-gray-900">{r.totalStock}</span> / reorder at {r.reorderPoint}
                </div>
              </DashQueueLink>
            ))}
            {props.count > props.rows.length && (
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                {props.count - props.rows.length} more product variant{props.count - props.rows.length === 1 ? '' : 's'} below reorder point
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LowStockMaterialsCard(props: {
  rows: ExecutiveDashboardBundle['inventory']['lowStockMaterials'];
  count: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            Low-stock raw materials
            {props.count > 0 && <Badge variant="warning">{props.count}</Badge>}
          </CardTitle>
          <DashHeaderLink to="/materials">
            Materials <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">All raw materials are above reorder point.</p>
        ) : (
          <div className="space-y-2">
            {props.rows.map((r) => (
              <DashQueueLink
                key={r.materialId}
                to={`/materials/${r.materialId}`}
                title={`${r.name} — right-click or Ctrl+click to open in new tab`}
                className="rounded-md border border-gray-200 p-2 hover:border-orange-300 hover:bg-orange-50/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm text-gray-900 truncate">{r.name}</div>
                  <Badge variant={r.totalStock === 0 ? 'danger' : 'warning'} className="text-[10px] shrink-0">
                    {r.totalStock === 0 ? 'Stockout' : 'Low'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  SKU {r.sku}
                  {r.primarySupplier && ` · ${r.primarySupplier}`}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Stock <span className="font-medium text-gray-900">{r.totalStock.toLocaleString()}{r.unit && ` ${r.unit}`}</span>
                  {' '}/ reorder at {r.reorderPoint.toLocaleString()}{r.unit && ` ${r.unit}`}
                  {r.daysOfCover != null && (
                    <span className="ml-1 text-gray-400">· {r.daysOfCover}d cover</span>
                  )}
                </div>
              </DashQueueLink>
            ))}
            {props.count > props.rows.length && (
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                {props.count - props.rows.length} more material{props.count - props.rows.length === 1 ? '' : 's'} below reorder point
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----- Logistics health -----

function LogisticsHealthCard(props: {
  logistics: ExecutiveDashboardBundle['logistics'];
}) {
  const l = props.logistics;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            Logistics health (MTD)
          </CardTitle>
          <DashHeaderLink to="/logistics">
            Logistics <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <FinanceTile
            label="Total trips"
            value={l.totalTripsMTD.toLocaleString()}
            subtitle="Scheduled this month"
            tone="neutral"
          />
          <FinanceTile
            label="Completed"
            value={l.completedTripsMTD.toLocaleString()}
            subtitle="On time deliveries"
            tone="good"
          />
          <FinanceTile
            label="Delayed"
            value={l.delayedTripsMTD.toLocaleString()}
            subtitle={l.delayedTripsMTD > 0 ? 'Needs review' : 'No delays'}
            tone={l.delayedTripsMTD > 0 ? 'warning' : 'good'}
          />
          <FinanceTile
            label="Failed"
            value={l.failedTripsMTD.toLocaleString()}
            subtitle={l.failedTripsMTD > 0 ? 'Recover ASAP' : 'No failures'}
            tone={l.failedTripsMTD > 0 ? 'danger' : 'good'}
          />
          <FinanceTile
            label="In transit"
            value={l.inTransitNow.toLocaleString()}
            subtitle="Currently moving"
            tone="neutral"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ----- Strategic insight cards -----

function TopProductsCard(props: {
  rows: ExecutiveDashboardBundle['topProducts'];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" /> Top products (MTD)
          </CardTitle>
          <DashHeaderLink to="/products" className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm">
            <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No revenue recorded this month.</p>
        ) : (
          <div className="space-y-3">
            {props.rows.map((p) => (
              <div
                key={p.productId}
                className="flex items-center justify-between gap-3 hover:bg-gray-50 rounded-md p-2 -mx-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <DashLink
                    to={`/products/${p.productId}`}
                    className={`${DASH_LINK_CLASS} text-sm block truncate`}
                    title={p.productName}
                  >
                    {p.productName}
                  </DashLink>
                  <p className="text-xs text-gray-500 truncate">
                    {p.categoryName ?? 'Uncategorised'} · {p.unitsSoldMTD.toLocaleString()} units · {p.variantCount} variant
                    {p.variantCount === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">{formatExecutivePeso(p.revenueMTD)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopCustomersCard(props: {
  rows: ExecutiveDashboardBundle['topCustomers'];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Top customers (YTD)
          </CardTitle>
          <DashHeaderLink to="/customers" className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm">
            <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No purchases recorded yet this year.</p>
        ) : (
          <div className="space-y-3">
            {props.rows.map((c) => (
              <div
                key={c.customerId}
                className="flex items-center justify-between gap-3 hover:bg-gray-50 rounded-md p-2 -mx-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <DashLink
                    to={`/customers/${c.customerId}`}
                    className={`${DASH_LINK_CLASS} text-sm block truncate`}
                    title={c.customerName}
                  >
                    {c.customerName}
                  </DashLink>
                  <p className="text-xs text-gray-500 truncate">
                    {c.customerCode ?? '—'} · {c.orderCount.toLocaleString()} orders
                    {c.outstandingBalance > 0 && ` · ${formatExecutivePeso(c.outstandingBalance)} owed`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-semibold text-gray-900 block">{formatExecutivePeso(c.totalPurchasesYTD)}</span>
                  {c.paymentBehavior && (
                    <span className="text-[11px] text-gray-500">{c.paymentBehavior}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopAgentsCard(props: {
  rows: ExecutiveDashboardBundle['topAgents'];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Top agents (MTD)
          </CardTitle>
          <DashHeaderLink to="/agents">
            Analytics <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No agent revenue this month.</p>
        ) : (
          <div className="space-y-3">
            {props.rows.map((a) => (
              <div key={a.agentId} className="flex items-center justify-between gap-3 hover:bg-gray-50 rounded-md p-2 -mx-2 transition-colors">
                <div className="min-w-0 flex-1">
                  <DashLink
                    to={`/employees/${a.agentId}`}
                    className={`${DASH_LINK_CLASS} text-sm block truncate`}
                    title={a.agentName}
                  >
                    {a.agentName}
                  </DashLink>
                  <p className="text-xs text-gray-500 truncate">
                    {a.branchName ?? '—'} · {a.orderCountMTD.toLocaleString()} orders
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">{formatExecutivePeso(a.revenueMTD)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
