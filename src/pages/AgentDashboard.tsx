import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { createDraftOrder } from '@/src/lib/createDraftOrder';
import { AgentPersonalKpiStrip } from '@/src/components/agent/AgentPersonalKpiStrip';
import {
  DashQueueLink,
  DashTableRowLink,
  DashHeaderLink,
  DASH_LINK_CLASS,
} from '@/src/components/executive/executiveLinks';
import {
  ShoppingCart,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  ArrowRight,
  ChevronRight,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  fetchAgentDashboard,
  formatCurrencyShort,
  formatPercent,
  type AgentDashboardBundle,
  type AgentDashboardOrderRow,
  type AgentDashboardCustomerRow,
  type AgentDashboardPendingCommissionRow,
} from '@/src/lib/agentDashboard';

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function orderStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral' {
  if (status === 'Delivered' || status === 'Approved') return 'success';
  if (status === 'Pending' || status === 'Draft' || status === 'Scheduled' || status === 'Loading') return 'warning';
  if (status === 'Cancelled' || status === 'Rejected' || status === 'Delayed') return 'danger';
  if (status === 'In Transit' || status === 'Ready') return 'info';
  return 'default';
}

function paymentStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'Paid') return 'success';
  if (status === 'Overdue' || status === 'Partial') return 'danger';
  if (status === 'Unbilled' || status === 'Pending') return 'warning';
  return 'default';
}

const DASH_LINK_MONO =
  'font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-sm';

export function AgentDashboard(): React.ReactElement {
  const navigate = useNavigate();
  const { branch, employeeId, employeeName, role, session, addAuditLog } = useAppContext();
  const [bundle, setBundle] = useState<AgentDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setRefreshing(silent);
      setError(null);
      try {
        const data = await fetchAgentDashboard({
          agentId: employeeId,
          agentName: employeeName,
          branchName: branch,
        });
        setBundle(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load agent dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branch, employeeId, employeeName],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const branchLabel = useMemo(() => {
    if (bundle?.branchName) return bundle.branchName;
    if (branch?.trim()) return branch;
    return 'All branches';
  }, [bundle?.branchName, branch]);

  const handleNewOrder = async () => {
    setCreating(true);
    try {
      const { id, orderNumber } = await createDraftOrder({
        branchName: branch,
        role,
        actorName: employeeName,
        actorEmail: session?.user?.email,
        ...(role === 'Agent' && employeeId
          ? { agentId: employeeId, agentName: employeeName }
          : {}),
      });
      addAuditLog('Created Order (draft)', 'Order', `${orderNumber} from agent dashboard`);
      navigate(`/orders/${id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-7 h-7 animate-spin text-red-600" />
          <p className="text-sm">Loading your sales overview…</p>
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
          <Button variant="primary" onClick={() => void load()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const noProfile = !bundle.agentId;
  const stats = bundle.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {bundle.agentName.split(' ')[0] || 'Agent'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {branchLabel} · {bundle.periodLabel}
            {stats && bundle.branchRank != null && bundle.branchAgentCount > 1 && (
              <span className="text-gray-400">
                {' '}
                · Rank #{bundle.branchRank} of {bundle.branchAgentCount} in branch
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
          <DashHeaderLink to="/customers">
            <Users className="w-4 h-4" /> My customers
          </DashHeaderLink>
          <Button
            variant="primary"
            className="gap-2"
            onClick={() => void handleNewOrder()}
            disabled={creating}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Create order
          </Button>
        </div>
      </div>

      {noProfile && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900">
              Sign in with an employee account linked to a sales agent to see live quota, commission, and order data.
            </p>
          </CardContent>
        </Card>
      )}

      <AgentPersonalKpiStrip kpis={bundle.kpis} />

      {stats && stats.effectiveTarget > 0 && (
        <QuotaProgressCard stats={stats} periodLabel={bundle.periodLabel} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OrdersCard
          title="Orders"
          icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
          rows={bundle.myOrders}
          emptyText="No orders yet."
          viewAllHref="/orders"
        />
        <OrdersCard
          title="Overdue orders"
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          rows={bundle.overdueOrders}
          emptyText="No overdue orders — collections are current."
          viewAllHref="/finance"
          viewAllLabel="Collections"
          badgeCount={bundle.overdueOrderCount}
          badgeVariant="danger"
        />
        <CustomersAtRiskCard rows={bundle.customersAtRisk} />
        <PendingCommissionsCard rows={bundle.pendingCommissions} />
      </div>

      {bundle.trend.some((p) => p.revenue > 0 || p.target > 0) && (
        <TrendCard trend={bundle.trend} />
      )}

      <p className="text-xs text-gray-400 text-right">
        Generated {new Date(bundle.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function QuotaProgressCard(props: {
  stats: NonNullable<AgentDashboardBundle['stats']>;
  periodLabel: string;
}) {
  const { stats } = props;
  const pct = Math.min(100, stats.attainmentPct);
  const barColor =
    pct >= 100 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-5 h-5 text-emerald-600" />
          Quota progress · {props.periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-bold text-gray-900">{formatPercent(stats.attainmentPct)}</p>
            <p className="text-sm text-gray-500 mt-1">
              {formatCurrencyShort(stats.revenue)} of {formatCurrencyShort(stats.effectiveTarget)} target
            </p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>
              Pacing:{' '}
              <span className={stats.pacingPct >= 90 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                {formatPercent(stats.pacingPct)}
              </span>
            </p>
            {stats.revenueGap > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {formatCurrencyShort(stats.revenueGap)} to quota
              </p>
            )}
            {stats.stretchGoal && (
              <p className="text-xs text-gray-400 mt-1 max-w-xs">{stats.stretchGoal}</p>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersCard(props: {
  title: string;
  icon: React.ReactNode;
  rows: AgentDashboardOrderRow[];
  emptyText: string;
  viewAllHref: string;
  viewAllLabel?: string;
  badgeCount?: number;
  badgeVariant?: 'warning' | 'danger' | 'default';
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {props.icon}
            {props.title}
            {props.badgeCount != null && props.badgeCount > 0 && (
              <Badge variant={props.badgeVariant ?? 'warning'}>{props.badgeCount}</Badge>
            )}
          </CardTitle>
          <DashHeaderLink
            to={props.viewAllHref}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
          >
            {props.viewAllLabel ?? 'Orders'} <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">{props.emptyText}</p>
        ) : (
          <div className="divide-y divide-gray-100 -mx-1">
            {props.rows.map((o) => (
              <DashQueueLink
                key={o.id}
                to={`/orders/${o.id}`}
                title={`${o.orderNumber} — right-click or Ctrl+click to open in new tab`}
                className="group flex items-start gap-3 px-2 py-3 hover:bg-gray-50 rounded-md"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`${DASH_LINK_MONO} group-hover:underline`}>{o.orderNumber}</span>
                    <Badge variant={orderStatusVariant(o.status)} className="text-[10px]">
                      {o.status}
                    </Badge>
                    <Badge variant={paymentStatusVariant(o.paymentStatus)} className="text-[10px]">
                      {o.paymentStatus}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-800 truncate mt-0.5">{o.customerName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrencyShort(o.totalAmount)}
                    {o.balanceDue > 0 && (
                      <span className="text-red-600"> · {formatCurrencyShort(o.balanceDue)} due</span>
                    )}
                    <span className="text-gray-400"> · Req {formatDateShort(o.requiredDate)}</span>
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
              </DashQueueLink>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomersAtRiskCard(props: { rows: AgentDashboardCustomerRow[] }) {
  return (
    <Card className={props.rows.length > 0 ? 'border-amber-200' : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Customers at risk
            {props.rows.length > 0 && <Badge variant="warning">{props.rows.length}</Badge>}
          </CardTitle>
          <DashHeaderLink
            to="/finance"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
          >
            Collections <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">All assigned customers are current on payments.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-2 px-2 text-left font-semibold">Customer</th>
                  <th className="py-2 px-2 text-right font-semibold">Overdue</th>
                  <th className="py-2 px-1 w-8" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {props.rows.map((c) => (
                  <DashTableRowLink
                    key={c.id}
                    to={`/customers/${c.id}`}
                    title={`${c.name} — right-click or Ctrl+click to open in new tab`}
                  >
                    <td className="table-cell py-2 px-2 align-middle">
                      <span className={`${DASH_LINK_CLASS} text-sm block truncate`}>{c.name}</span>
                      {c.city && <span className="block text-xs text-gray-500">{c.city}</span>}
                    </td>
                    <td className="table-cell py-2 px-2 align-middle text-right font-semibold text-red-700">
                      {formatCurrencyShort(c.overdueBalance)}
                    </td>
                    <td className="table-cell py-2 px-1 align-middle text-right">
                      <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
                    </td>
                  </DashTableRowLink>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PendingCommissionsCard(props: { rows: AgentDashboardPendingCommissionRow[] }) {
  const total = props.rows.reduce((s, r) => s + r.commissionAmount, 0);

  return (
    <Card className={props.rows.length > 0 ? 'border-violet-200' : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="w-5 h-5 text-violet-600" />
            Pending commissions
            {props.rows.length > 0 && <Badge variant="warning">{props.rows.length}</Badge>}
          </CardTitle>
          <DashHeaderLink
            to="/finance?tab=commissions"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
          >
            Invoices &amp; payments <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
        {props.rows.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Cash payment proofs submitted — awaiting executive payout · {formatCurrencyShort(total)} total shown
          </p>
        )}
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No payment proofs waiting for commission release.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 -mx-1">
            {props.rows.map((r) => (
              <DashQueueLink
                key={r.proofId}
                to={`/orders/${r.orderId}`}
                title={`${r.orderNumber} — right-click or Ctrl+click to open in new tab`}
                className="group flex items-start gap-3 px-2 py-3 hover:bg-gray-50 rounded-md"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`${DASH_LINK_MONO} group-hover:underline`}>{r.orderNumber}</span>
                    <Badge variant="warning" className="text-[10px]">
                      Awaiting payout
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-800 truncate mt-0.5">{r.customerName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-semibold text-violet-700">{formatCurrencyShort(r.commissionAmount)}</span>
                    <span className="text-gray-400"> commission on </span>
                    {formatCurrencyShort(r.cashAmount)} cash
                    {r.uploadedAt && (
                      <span className="text-gray-400">
                        {' '}
                        · Proof {formatDateShort(r.uploadedAt)}
                      </span>
                    )}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
              </DashQueueLink>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendCard(props: { trend: AgentDashboardBundle['trend'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          6-month sales trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minHeight={0}>
            <BarChart data={props.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
              <Tooltip formatter={(v: number) => formatCurrencyShort(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Collected" fill="#2563eb" radius={[4, 4, 0, 0]} />
              {props.trend.some((p) => p.target > 0) && (
                <ReferenceLine y={props.trend[0]?.target ?? 0} stroke="#10b981" strokeDasharray="4 4" label="Quota" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
