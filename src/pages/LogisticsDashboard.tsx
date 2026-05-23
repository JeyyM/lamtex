import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { LogisticsKpiStrip } from '@/src/components/logistics/LogisticsKpiStrip';
import {
  DashLink,
  DashTableRowLink,
  DashQueueLink,
  DashHeaderLink,
  DASH_LINK_CLASS,
} from '@/src/components/executive/executiveLinks';
import {
  Truck,
  AlertTriangle,
  Package,
  ArrowRight,
  Activity,
  Calendar,
  Loader2,
  RefreshCw,
  Repeat,
  ChevronRight,
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
} from 'recharts';
import {
  fetchLogisticsDashboard,
  type LogisticsDashboardBundle,
  type LogisticsTripRow,
  type LogisticsOrderToDispatchRow,
  type LogisticsIbrRow,
  type LogisticsDelayRow,
  type LogisticsPerformancePoint,
} from '@/src/lib/logisticsDashboard';

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

const LOGISTICS_DISPATCH = '/logistics?tab=dispatch';
const LOGISTICS_FLEET = '/logistics?tab=fleet';

function tripHref(_tripId: string): string {
  return LOGISTICS_DISPATCH;
}

function vehicleHref(vehicleUuid: string | null | undefined): string {
  return vehicleUuid ? `/logistics/${vehicleUuid}` : LOGISTICS_FLEET;
}

function employeeHref(employeeId: string | null | undefined): string {
  return employeeId ? `/employees/${employeeId}` : '/employees';
}

function orderHref(orderId: string): string {
  return `/orders/${orderId}`;
}

function customerHref(customerId: string | null | undefined, orderId: string): string {
  return customerId ? `/customers/${customerId}` : orderHref(orderId);
}

function ibrHref(ibrId: string): string {
  return `/inter-branch-requests/${ibrId}`;
}

// ---------------------------------------------------------------------------
// Formatting / styling
// ---------------------------------------------------------------------------

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function formatTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function tripStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'Completed':
    case 'Delivered':
      return 'success';
    case 'In Transit':
    case 'Ready':
      return 'info';
    case 'Loading':
    case 'Scheduled':
    case 'Planned':
    case 'Pending':
    case 'Packed':
      return 'warning';
    case 'Delayed':
    case 'Failed':
    case 'Cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

function urgencyVariant(u: 'High' | 'Medium' | 'Low'): 'danger' | 'warning' | 'default' {
  if (u === 'High') return 'danger';
  if (u === 'Medium') return 'warning';
  return 'default';
}

function daysLabel(days: number | null | undefined): string {
  if (days == null) return '—';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days}d`;
}

function daysClass(days: number | null | undefined): string {
  if (days == null) return 'text-gray-500';
  if (days < 0) return 'text-red-700 font-semibold';
  if (days === 0) return 'text-amber-700 font-semibold';
  if (days <= 2) return 'text-amber-600';
  return 'text-gray-500';
}

function TripVehicleCell(props: { trip: LogisticsTripRow }) {
  const { trip } = props;
  const label = [trip.vehicleName, trip.plateNumber].filter(Boolean).join(' · ') || '—';
  if (!trip.vehicleUuid) return <span className="text-gray-600">{label}</span>;
  return (
    <DashLink to={vehicleHref(trip.vehicleUuid)} className={`${DASH_LINK_CLASS} text-sm block truncate`} title={label}>
      {label}
    </DashLink>
  );
}

function TripDriverCell(props: { trip: LogisticsTripRow }) {
  const { trip } = props;
  const label = trip.driverName?.trim() || 'Unassigned';
  if (!trip.driverUuid) return <span className="text-gray-500">{label}</span>;
  return (
    <DashLink to={employeeHref(trip.driverUuid)} className={`${DASH_LINK_CLASS} text-sm block truncate`} title={label}>
      {label}
    </DashLink>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function LogisticsDashboard(): React.ReactElement {
  const { branch } = useAppContext();

  const [bundle, setBundle] = useState<LogisticsDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setRefreshing(silent);
      setError(null);
      try {
        const data = await fetchLogisticsDashboard({ branchName: branch });
        setBundle(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load logistics dashboard');
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
          <p className="text-sm">Loading logistics overview…</p>
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

  const noBranch = bundle.branchId == null;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logistics Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            {branchLabel} · Trips, fleet &amp; deliveries in real time
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
          <DashHeaderLink to={LOGISTICS_DISPATCH}>
            <Truck className="w-4 h-4" /> Open Logistics
          </DashHeaderLink>
        </div>
      </div>

      {noBranch && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900">
              Select a branch from the topbar to see live trips, fleet status and dispatch queue.
            </p>
          </CardContent>
        </Card>
      )}

      <LogisticsKpiStrip kpis={bundle.kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeekScheduleCard rows={bundle.weekSchedule} count={bundle.weekScheduleCount} />
        <OrdersToDispatchCard rows={bundle.ordersAwaitingDispatch} count={bundle.ordersAwaitingDispatchCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IbrCard rows={bundle.ibrs} count={bundle.ibrCount} />
        <DelaysCard rows={bundle.delays} count={bundle.delayCount} />
      </div>

      <PerformanceCard performance={bundle.performance} />

      <p className="text-xs text-gray-400 text-right">
        Generated {new Date(bundle.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared table card shell
// ---------------------------------------------------------------------------

function QueueTableCard(props: {
  icon: React.ReactNode;
  title: string;
  count: number;
  badgeVariant?: 'warning' | 'info' | 'danger' | 'success' | 'default';
  emptyText: string;
  viewAllHref: string;
  viewAllLabel?: string;
  cardClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={props.cardClassName}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {props.icon}
            {props.title}
            <Badge variant={props.badgeVariant ?? (props.count > 0 ? 'warning' : 'default')}>{props.count}</Badge>
          </CardTitle>
          <DashHeaderLink
            to={props.viewAllHref}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
          >
            {props.viewAllLabel ?? 'View all'} <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.count === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">{props.emptyText}</p>
        ) : (
          props.children
        )}
      </CardContent>
    </Card>
  );
}

const DASH_LINK_MONO =
  'font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-sm';

function TripTable(props: {
  rows: LogisticsTripRow[];
  /** When true, right column shows scheduled date (and time if set). */
  showScheduledDate?: boolean;
}) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <th className="py-2 px-2 text-left font-semibold">Trip</th>
            <th className="py-2 px-2 text-left font-semibold">Vehicle</th>
            <th className="py-2 px-2 text-left font-semibold">Driver</th>
            <th className="py-2 px-2 text-center font-semibold">Orders</th>
            <th className="py-2 px-2 text-right font-semibold">
              {props.showScheduledDate ? 'Scheduled' : 'ETA'}
            </th>
            <th className="py-2 px-2 text-right font-semibold">Status</th>
            <th className="py-2 px-1 w-8" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {props.rows.map((t) => (
            <DashTableRowLink
              key={t.id}
              to={tripHref(t.id)}
              title={`${t.tripNumber} — right-click or Ctrl+click to open in new tab`}
            >
              <td className="table-cell py-2 px-2 align-middle font-mono text-xs whitespace-nowrap">
                <DashLink to={tripHref(t.id)} className={DASH_LINK_MONO} title={t.tripNumber}>
                  {t.tripNumber}
                </DashLink>
              </td>
              <td className="table-cell py-2 px-2 align-middle max-w-[140px]">
                <TripVehicleCell trip={t} />
              </td>
              <td className="table-cell py-2 px-2 align-middle max-w-[120px]">
                <TripDriverCell trip={t} />
              </td>
              <td className="table-cell py-2 px-2 align-middle text-center tabular-nums text-gray-700">
                {t.orderCount}
              </td>
              <td className="table-cell py-2 px-2 align-middle text-right text-gray-600 whitespace-nowrap">
                {props.showScheduledDate ? (
                  <>
                    {formatDateShort(t.scheduledDate)}
                    {formatTime(t.departureTime) && (
                      <span className="block text-[11px] text-gray-400">{formatTime(t.departureTime)}</span>
                    )}
                  </>
                ) : (
                  formatTime(t.eta) ?? formatDateShort(t.scheduledDate)
                )}
              </td>
              <td className="table-cell py-2 px-2 align-middle text-right">
                <Badge variant={tripStatusVariant(t.status)} className="text-[10px]">{t.status}</Badge>
              </td>
              <td className="table-cell py-2 px-1 align-middle text-right">
                <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
              </td>
            </DashTableRowLink>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section cards
// ---------------------------------------------------------------------------

function WeekScheduleCard(props: { rows: LogisticsTripRow[]; count: number }) {
  return (
    <QueueTableCard
      icon={<Calendar className="w-5 h-5 text-blue-600" />}
      title="This week's schedule"
      count={props.count}
      badgeVariant={props.count > 0 ? 'info' : 'default'}
      emptyText="No trips scheduled in the next 7 days."
      viewAllHref={LOGISTICS_DISPATCH}
      viewAllLabel="Plan trips"
    >
      <TripTable rows={props.rows.slice(0, 8)} showScheduledDate />
    </QueueTableCard>
  );
}

function OrdersToDispatchCard(props: { rows: LogisticsOrderToDispatchRow[]; count: number }) {
  return (
    <QueueTableCard
      icon={<Package className="w-5 h-5 text-amber-600" />}
      title="Orders awaiting dispatch"
      count={props.count}
      badgeVariant={props.count > 0 ? 'warning' : 'default'}
      emptyText="No approved orders waiting for a trip."
      viewAllHref={LOGISTICS_DISPATCH}
      viewAllLabel="Dispatch board"
    >
      <div className="divide-y divide-gray-100 -mx-1">
        {props.rows.slice(0, 8).map((o) => (
          <DashQueueLink
            key={o.id}
            to={orderHref(o.id)}
            title={`${o.orderNumber} — right-click or Ctrl+click to open in new tab`}
            className="group flex items-start gap-3 px-2 py-3 hover:bg-gray-50 rounded-md"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Order</p>
                  <DashLink
                    to={orderHref(o.id)}
                    className={`${DASH_LINK_MONO} block truncate`}
                    title={o.orderNumber}
                  >
                    {o.orderNumber}
                  </DashLink>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Customer</p>
                  <DashLink
                    to={customerHref(o.customerId, o.id)}
                    className={`${DASH_LINK_CLASS} block truncate`}
                    title={o.customerName}
                  >
                    {o.customerName}
                  </DashLink>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Destination</p>
                  <span className="block truncate text-gray-800" title={o.destination}>
                    {o.destination}
                  </span>
                </div>
              </div>
              <p className={`text-xs ${daysClass(o.daysUntilRequired)}`}>
                <span className="text-gray-500">Required date: </span>
                {o.requiredDate ? (
                  <>
                    <span className="font-medium">{formatDateShort(o.requiredDate)}</span>
                    <span className="text-gray-400"> · {daysLabel(o.daysUntilRequired)}</span>
                  </>
                ) : (
                  <span>—</span>
                )}
                <Badge variant={urgencyVariant(o.urgency)} className="ml-2 text-[10px] align-middle">
                  {o.urgency}
                </Badge>
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1 group-hover:text-gray-600" />
          </DashQueueLink>
        ))}
      </div>
    </QueueTableCard>
  );
}

function IbrCard(props: { rows: LogisticsIbrRow[]; count: number }) {
  return (
    <QueueTableCard
      icon={<Repeat className="w-5 h-5 text-indigo-600" />}
      title="IBR transfers"
      count={props.count}
      badgeVariant={props.count > 0 ? 'info' : 'default'}
      emptyText="No inter-branch transfers in flight."
      viewAllHref="/inter-branch-requests"
      viewAllLabel="All IBRs"
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="py-2 px-2 text-left font-semibold">IBR</th>
              <th className="py-2 px-2 text-left font-semibold">Route</th>
              <th className="py-2 px-2 text-right font-semibold">Depart</th>
              <th className="py-2 px-1 w-8" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {props.rows.map((r) => (
              <DashTableRowLink
                key={r.id}
                to={ibrHref(r.id)}
                title={`${r.ibrNumber} — right-click or Ctrl+click to open in new tab`}
              >
                <td className="table-cell py-2 px-2 align-middle">
                  <DashLink to={ibrHref(r.id)} className={DASH_LINK_MONO} title={r.ibrNumber}>
                    {r.ibrNumber}
                  </DashLink>
                  <Badge variant={tripStatusVariant(r.status)} className="mt-1 text-[10px]">{r.status}</Badge>
                </td>
                <td className="table-cell py-2 px-2 align-middle text-xs text-gray-600">
                  {r.direction === 'outgoing'
                    ? `→ ${r.requestingBranchName ?? '—'}`
                    : `← ${r.fulfillingBranchName ?? '—'}`}
                  <span className="block text-[11px] text-gray-400">
                    {r.itemCount} item{r.itemCount === 1 ? '' : 's'} · {r.direction}
                  </span>
                </td>
                <td className={`table-cell py-2 px-2 align-middle text-right whitespace-nowrap ${daysClass(r.daysUntilDeparture)}`}>
                  {r.scheduledDepartureDate ? (
                    <>
                      {formatDateShort(r.scheduledDepartureDate)}
                      <span className="block text-[11px]">{daysLabel(r.daysUntilDeparture)}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="table-cell py-2 px-1 align-middle text-right">
                  <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
                </td>
              </DashTableRowLink>
            ))}
          </tbody>
        </table>
      </div>
    </QueueTableCard>
  );
}

function DelaysCard(props: { rows: LogisticsDelayRow[]; count: number }) {
  return (
    <QueueTableCard
      icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
      title="Open exceptions"
      count={props.count}
      badgeVariant={props.count > 0 ? 'danger' : 'success'}
      emptyText="All clear — no open delays."
      viewAllHref={LOGISTICS_DISPATCH}
      viewAllLabel="Logistics"
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="py-2 px-2 text-left font-semibold">Type</th>
              <th className="py-2 px-2 text-left font-semibold">Impact</th>
              <th className="py-2 px-2 text-right font-semibold">Late</th>
              <th className="py-2 px-1 w-8" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {props.rows.map((d) => (
              <DashTableRowLink
                key={d.id}
                to={LOGISTICS_DISPATCH}
                title={`${d.type} — right-click or Ctrl+click to open in new tab`}
              >
                <td className="table-cell py-2 px-2 align-middle">
                  <span className="text-sm font-medium text-gray-900">{d.type}</span>
                  {d.affectedTripNumber && (
                    <DashLink to={LOGISTICS_DISPATCH} className={`${DASH_LINK_CLASS} text-[11px] block`}>
                      {d.affectedTripNumber}
                    </DashLink>
                  )}
                </td>
                <td className="table-cell py-2 px-2 align-middle text-xs text-gray-600">
                  {d.affectedOrders} order{d.affectedOrders === 1 ? '' : 's'} · {d.customersAffected} customer
                  {d.customersAffected === 1 ? '' : 's'}
                  {d.owner && <span className="block text-[11px] text-gray-400">{d.owner}</span>}
                </td>
                <td className="table-cell py-2 px-2 align-middle text-right">
                  <Badge variant={d.status === 'Resolved' ? 'success' : 'danger'} className="text-[10px]">{d.status}</Badge>
                  <span className={`block text-[11px] mt-0.5 ${d.daysLate > 0 ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>
                    {d.daysLate > 0 ? `${d.daysLate}d late` : 'Same day'}
                  </span>
                </td>
                <td className="table-cell py-2 px-1 align-middle text-right">
                  <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
                </td>
              </DashTableRowLink>
            ))}
          </tbody>
        </table>
      </div>
    </QueueTableCard>
  );
}

function PerformanceCard(props: {
  performance: {
    points: LogisticsPerformancePoint[];
    completed: number;
    delayed: number;
    failed: number;
    onTimePct: number;
    completionPct: number;
  };
}) {
  const { performance } = props;
  const closed = performance.completed + performance.delayed + performance.failed;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            7-day delivery performance
          </CardTitle>
          <DashHeaderLink to={LOGISTICS_DISPATCH} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm">
            Trips <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Metric label="Completed" value={performance.completed} tone="good" />
          <Metric label="Delayed" value={performance.delayed} tone="warning" />
          <Metric label="Failed" value={performance.failed} tone="danger" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Metric
            label="On-time %"
            value={closed > 0 ? `${performance.onTimePct.toFixed(0)}%` : '—'}
            tone={performance.onTimePct >= 90 ? 'good' : performance.onTimePct >= 75 ? 'warning' : 'danger'}
            subtitle={`${performance.completed}/${closed} on time`}
          />
          <Metric
            label="Completion %"
            value={closed > 0 ? `${performance.completionPct.toFixed(0)}%` : '—'}
            tone={performance.completionPct >= 95 ? 'good' : 'warning'}
            subtitle={`${performance.completed + performance.delayed}/${closed} delivered`}
          />
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performance.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" />
              <Bar dataKey="delayed" name="Delayed" stackId="a" fill="#f59e0b" />
              <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric(props: {
  label: string;
  value: number | string;
  tone: 'good' | 'warning' | 'danger' | 'default';
  subtitle?: string;
}) {
  const cls = {
    good: 'border-emerald-200 bg-emerald-50/40 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50/40 text-amber-700',
    danger: 'border-red-200 bg-red-50/40 text-red-700',
    default: 'border-gray-200 bg-white text-gray-700',
  }[props.tone];
  return (
    <div className={`rounded-md border ${cls} p-3`}>
      <p className="text-xs uppercase tracking-wider opacity-80">{props.label}</p>
      <p className="text-2xl font-bold mt-1">{props.value}</p>
      {props.subtitle && <p className="text-xs text-gray-500 mt-1">{props.subtitle}</p>}
    </div>
  );
}
