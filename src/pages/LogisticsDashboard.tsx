import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Truck,
  AlertTriangle,
  Clock,
  Package,
  CheckCircle,
  ArrowRight,
  Activity,
  Calendar,
  Loader2,
  RefreshCw,
  Wrench,
  User,
  Repeat,
  Navigation,
  MapPin,
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
  formatLogisticsPeso,
  type LogisticsKPI,
  type LogisticsDashboardBundle,
  type LogisticsTripRow,
  type LogisticsOrderToDispatchRow,
  type LogisticsVehicleRow,
  type LogisticsDriverRow,
  type LogisticsIbrRow,
  type LogisticsDelayRow,
  type LogisticsMaintenanceRow,
  type LogisticsPerformancePoint,
} from '@/src/lib/logisticsDashboard';

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

const STATUS_TILE_STYLES: Record<LogisticsKPI['status'], string> = {
  good: 'border-emerald-200 bg-emerald-50/40',
  warning: 'border-amber-200 bg-amber-50/40',
  danger: 'border-red-200 bg-red-50/40',
  neutral: 'border-gray-200 bg-white',
};

const STATUS_TEXT_COLORS: Record<LogisticsKPI['status'], string> = {
  good: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  neutral: 'text-gray-700',
};

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

function vehicleStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'Available':
      return 'success';
    case 'On Trip':
      return 'info';
    case 'Loading':
      return 'warning';
    case 'Maintenance':
    case 'Out of Service':
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function LogisticsDashboard(): React.ReactElement {
  const { branch } = useAppContext();
  const navigate = useNavigate();

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
          <Button variant="outline" onClick={() => navigate('/logistics')} className="gap-2">
            <Truck className="w-4 h-4" /> Open Logistics
          </Button>
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

      {/* KPI STRIP */}
      <KpiStrip kpis={bundle.kpis} onNavigate={(href) => navigate(href)} />

      {/* ACTIVE TRIPS (highlight if any) */}
      <ActiveTripsCard
        rows={bundle.activeTrips}
        count={bundle.activeTripCount}
        onOpen={() => navigate('/logistics')}
      />

      {/* Today's schedule + Orders to dispatch (2-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TodayScheduleCard
          rows={bundle.todaySchedule}
          count={bundle.todayScheduleCount}
          onOpen={() => navigate('/logistics')}
        />
        <OrdersToDispatchCard
          rows={bundle.ordersAwaitingDispatch}
          count={bundle.ordersAwaitingDispatchCount}
          onOpen={(id) => navigate(`/orders/${id}`)}
          onViewAll={() => navigate('/logistics')}
        />
      </div>

      {/* FLEET + DRIVERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FleetCard
          vehicles={bundle.fleet.vehicles}
          summary={bundle.fleet.summary}
          onViewAll={() => navigate('/logistics')}
        />
        <DriversCard
          drivers={bundle.drivers.drivers}
          summary={bundle.drivers.summary}
          onViewAll={() => navigate('/employees')}
        />
      </div>

      {/* MAINTENANCE + IBRs + DELAYS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MaintenanceCard
          rows={bundle.upcomingMaintenance}
          totalCount={bundle.upcomingMaintenanceCount}
          overdueCount={bundle.overdueMaintenanceCount}
          onOpen={() => navigate('/logistics')}
        />
        <IbrCard
          rows={bundle.ibrs}
          count={bundle.ibrCount}
          onOpen={(id) => navigate(`/inter-branch-requests/${id}`)}
          onViewAll={() => navigate('/inter-branch-requests')}
        />
        <DelaysCard
          rows={bundle.delays}
          count={bundle.delayCount}
          onOpen={() => navigate('/logistics')}
        />
      </div>

      {/* 7-DAY PERFORMANCE */}
      <PerformanceCard performance={bundle.performance} />

      <p className="text-xs text-gray-400 text-right">
        Generated {new Date(bundle.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI strip
// ---------------------------------------------------------------------------

function KpiStrip(props: { kpis: LogisticsKPI[]; onNavigate: (href: string) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3">
      {props.kpis.map((kpi) => (
        <button
          key={kpi.id}
          type="button"
          onClick={() => kpi.href && props.onNavigate(kpi.href)}
          disabled={!kpi.href}
          className={`text-left rounded-lg border ${STATUS_TILE_STYLES[kpi.status]} p-4 transition-all ${
            kpi.href ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</p>
            <KpiIcon id={kpi.id} status={kpi.status} />
          </div>
          <p className={`text-2xl font-bold mt-2 ${STATUS_TEXT_COLORS[kpi.status]}`}>{kpi.value}</p>
          {kpi.subtitle && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{kpi.subtitle}</p>}
        </button>
      ))}
    </div>
  );
}

function KpiIcon(props: { id: string; status: LogisticsKPI['status'] }) {
  const color = STATUS_TEXT_COLORS[props.status];
  const cls = `w-4 h-4 ${color}`;
  switch (props.id) {
    case 'kpi-active-trips':
      return <Activity className={cls} />;
    case 'kpi-today':
      return <Calendar className={cls} />;
    case 'kpi-orders':
      return <Package className={cls} />;
    case 'kpi-fleet':
      return <Truck className={cls} />;
    case 'kpi-drivers':
      return <User className={cls} />;
    case 'kpi-on-time':
      return <CheckCircle className={cls} />;
    case 'kpi-delays':
      return <AlertTriangle className={cls} />;
    case 'kpi-maintenance':
      return <Wrench className={cls} />;
    default:
      return <Activity className={cls} />;
  }
}

// ---------------------------------------------------------------------------
// Active trips card
// ---------------------------------------------------------------------------

function ActiveTripsCard(props: {
  rows: LogisticsTripRow[];
  count: number;
  onOpen: () => void;
}) {
  if (props.count === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Active trips
            </CardTitle>
            <Badge variant="success">{props.count}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-gray-500 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          No trips currently in transit or loading. The fleet is parked.
        </CardContent>
      </Card>
    );
  }

  const delayed = props.rows.filter((t) => t.status === 'Delayed').length;

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50/40 to-blue-50/40">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Active trips
            <Badge variant="info">{props.count}</Badge>
            {delayed > 0 && <Badge variant="danger">{delayed} delayed</Badge>}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onOpen} className="gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {props.rows.slice(0, 6).map((t) => (
            <ActiveTripItem key={t.id} row={t} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveTripItem(props: { row: LogisticsTripRow }) {
  const t = props.row;
  const capacity = Math.max(0, Math.min(100, t.capacityUsedPercent));
  const bar =
    capacity >= 95 ? 'bg-red-500' : capacity >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  const destPreview = t.destinations.slice(0, 3).join(' → ') || '—';

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{t.tripNumber}</p>
          <p className="text-xs text-gray-500 truncate">
            {t.vehicleName ?? '—'}
            {t.plateNumber ? ` · ${t.plateNumber}` : ''} · {t.driverName ?? 'Unassigned driver'}
          </p>
        </div>
        <Badge variant={tripStatusVariant(t.status)}>{t.status}</Badge>
      </div>

      <div className="mt-2 text-xs text-gray-600 flex items-center gap-1.5">
        <Navigation className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="truncate" title={destPreview}>
          {destPreview}
          {t.destinations.length > 3 ? ` (+${t.destinations.length - 3})` : ''}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
        <span>{t.orderCount} order{t.orderCount === 1 ? '' : 's'}</span>
        <span>{formatTime(t.eta) ? `ETA ${formatTime(t.eta)}` : `Dept ${formatTime(t.departureTime) ?? '—'}`}</span>
      </div>

      <div className="mt-1.5">
        <div className="h-1.5 w-full bg-gray-100 rounded">
          <div className={`h-1.5 rounded ${bar}`} style={{ width: `${capacity}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1">Capacity {capacity.toFixed(0)}%</p>
      </div>

      {t.status === 'Delayed' && t.delayReason && (
        <p className="mt-2 text-xs text-red-700 line-clamp-2" title={t.delayReason}>
          ⚠ {t.delayReason}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Today's schedule
// ---------------------------------------------------------------------------

function TodayScheduleCard(props: {
  rows: LogisticsTripRow[];
  count: number;
  onOpen: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Today's schedule
            <Badge variant={props.count > 0 ? 'info' : 'default'}>{props.count}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onOpen} className="gap-1">
            Plan trips <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500">No trips scheduled for today.</p>
        ) : (
          <div className="space-y-2">
            {props.rows.slice(0, 6).map((t) => (
              <div
                key={t.id}
                className="rounded-md border border-gray-200 bg-white p-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{t.tripNumber}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {(t.vehicleName ?? '—')}
                    {t.driverName ? ` · ${t.driverName}` : ''} · {t.orderCount} order
                    {t.orderCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {formatTime(t.departureTime) && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(t.departureTime)}
                    </span>
                  )}
                  <Badge variant={tripStatusVariant(t.status)}>{t.status}</Badge>
                </div>
              </div>
            ))}
            {props.rows.length > 6 && (
              <p className="text-xs text-gray-500 text-center pt-1">
                +{props.rows.length - 6} more trips
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Orders awaiting dispatch
// ---------------------------------------------------------------------------

function OrdersToDispatchCard(props: {
  rows: LogisticsOrderToDispatchRow[];
  count: number;
  onOpen: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            Orders awaiting dispatch
            <Badge variant={props.count > 0 ? 'warning' : 'default'}>{props.count}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onViewAll} className="gap-1">
            Dispatch board <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500">No approved orders waiting for a trip.</p>
        ) : (
          <div className="space-y-2">
            {props.rows.slice(0, 6).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => props.onOpen(o.id)}
                className="w-full text-left rounded-md border border-gray-200 bg-white p-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {o.orderNumber} · {o.customerName}
                    </p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {o.destination}
                    </p>
                  </div>
                  <Badge variant={urgencyVariant(o.urgency)}>{o.urgency}</Badge>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-gray-600">
                  <span>
                    {o.volumeCbm.toFixed(2)} cbm · {o.weightKg.toFixed(0)} kg
                  </span>
                  <span className={daysClass(o.daysUntilRequired)}>
                    {o.requiredDate ? `${formatDateShort(o.requiredDate)} · ${daysLabel(o.daysUntilRequired)}` : '—'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fleet
// ---------------------------------------------------------------------------

function FleetCard(props: {
  vehicles: LogisticsVehicleRow[];
  summary: { total: number; available: number; onTrip: number; loading: number; maintenance: number; outOfService: number };
  onViewAll: () => void;
}) {
  const { summary } = props;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Fleet status
            <Badge variant="default">{summary.total}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onViewAll} className="gap-1">
            Manage <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          <StatusTile label="Available" value={summary.available} tone="good" />
          <StatusTile label="On trip" value={summary.onTrip} tone="info" />
          <StatusTile label="Loading" value={summary.loading} tone="warning" />
          <StatusTile label="Maintenance" value={summary.maintenance} tone="danger" />
          <StatusTile label="OOS" value={summary.outOfService} tone="danger" />
        </div>
        {props.vehicles.length === 0 ? (
          <p className="text-sm text-gray-500">No vehicles assigned to this branch.</p>
        ) : (
          <div className="space-y-2">
            {props.vehicles.slice(0, 6).map((v) => (
              <div
                key={v.id}
                className="rounded-md border border-gray-200 bg-white p-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {v.vehicleId} · {v.vehicleName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {v.plateNumber ?? '—'}
                    {v.maintenanceDue
                      ? ` · Maintenance ${formatDateShort(v.maintenanceDue)}${
                          v.daysUntilMaintenance != null && v.daysUntilMaintenance < 0 ? ' (overdue)' : ''
                        }`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{v.utilizationPercent.toFixed(0)}%</span>
                  <Badge variant={vehicleStatusVariant(v.status)}>{v.status}</Badge>
                </div>
              </div>
            ))}
            {props.vehicles.length > 6 && (
              <p className="text-xs text-gray-500 text-center pt-1">+{props.vehicles.length - 6} more vehicles</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusTile(props: { label: string; value: number; tone: 'good' | 'warning' | 'danger' | 'info' | 'default' }) {
  const cls = {
    good: 'border-emerald-200 bg-emerald-50/40 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50/40 text-amber-700',
    danger: 'border-red-200 bg-red-50/40 text-red-700',
    info: 'border-blue-200 bg-blue-50/40 text-blue-700',
    default: 'border-gray-200 bg-white text-gray-700',
  }[props.tone];
  return (
    <div className={`rounded-md border ${cls} p-2.5 text-center`}>
      <p className="text-xs uppercase tracking-wider opacity-80">{props.label}</p>
      <p className="text-lg font-bold">{props.value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

function DriversCard(props: {
  drivers: LogisticsDriverRow[];
  summary: { total: number; active: number; onLeave: number; inactive: number; onActiveTrip: number; available: number };
  onViewAll: () => void;
}) {
  const { summary } = props;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Drivers
            <Badge variant="default">{summary.total}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onViewAll} className="gap-1">
            Roster <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <StatusTile label="Available" value={summary.available} tone="good" />
          <StatusTile label="On trip" value={summary.onActiveTrip} tone="info" />
          <StatusTile label="On leave" value={summary.onLeave} tone="warning" />
          <StatusTile label="Inactive" value={summary.inactive} tone="default" />
        </div>
        {props.drivers.length === 0 ? (
          <p className="text-sm text-gray-500">No truck drivers registered for this branch.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {props.drivers.slice(0, 8).map((d) => (
              <div
                key={d.id}
                className="rounded-md border border-gray-200 bg-white p-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{d.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {d.activeTripNumber ? `On ${d.activeTripNumber}` : d.status}
                  </p>
                </div>
                {d.activeTripId ? (
                  <Badge variant="info">On trip</Badge>
                ) : d.status.toLowerCase() === 'active' ? (
                  <Badge variant="success">Available</Badge>
                ) : (
                  <Badge variant="default">{d.status}</Badge>
                )}
              </div>
            ))}
            {props.drivers.length > 8 && (
              <p className="text-xs text-gray-500 text-center pt-1">+{props.drivers.length - 8} more drivers</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

function MaintenanceCard(props: {
  rows: LogisticsMaintenanceRow[];
  totalCount: number;
  overdueCount: number;
  onOpen: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-600" />
            Maintenance
            <Badge variant={props.overdueCount > 0 ? 'danger' : 'default'}>{props.totalCount}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onOpen} className="gap-1">
            Fleet <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {props.overdueCount > 0 && (
          <p className="text-xs text-red-700 mb-2">
            ⚠ {props.overdueCount} overdue — please schedule or close out.
          </p>
        )}
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500">No scheduled maintenance.</p>
        ) : (
          <div className="space-y-2">
            {props.rows.map((m) => (
              <div key={m.id} className="rounded-md border border-gray-200 bg-white p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {m.vehicleId} · {m.category}
                  </p>
                  <span className={`text-xs ${daysClass(m.daysUntilScheduled)}`}>
                    {daysLabel(m.daysUntilScheduled)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate" title={m.description}>
                  {m.description}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{m.vendor ?? 'Internal'}</span>
                  <span>{m.cost > 0 ? formatLogisticsPeso(m.cost) : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Inter-branch transfers
// ---------------------------------------------------------------------------

function IbrCard(props: {
  rows: LogisticsIbrRow[];
  count: number;
  onOpen: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-indigo-600" />
            IBR transfers
            <Badge variant={props.count > 0 ? 'info' : 'default'}>{props.count}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onViewAll} className="gap-1">
            All <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500">No inter-branch transfers in flight.</p>
        ) : (
          <div className="space-y-2">
            {props.rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => props.onOpen(r.id)}
                className="w-full text-left rounded-md border border-gray-200 bg-white p-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-gray-900 truncate">{r.ibrNumber}</p>
                  <Badge variant={tripStatusVariant(r.status)}>{r.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {r.direction === 'outgoing'
                    ? `→ ${r.requestingBranchName ?? '—'}`
                    : `← ${r.fulfillingBranchName ?? '—'}`}
                  {' · '}
                  {r.itemCount} item{r.itemCount === 1 ? '' : 's'}
                </p>
                <div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
                  <span>{r.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}</span>
                  {r.scheduledDepartureDate && (
                    <span className={daysClass(r.daysUntilDeparture)}>
                      {formatDateShort(r.scheduledDepartureDate)} · {daysLabel(r.daysUntilDeparture)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Delays
// ---------------------------------------------------------------------------

function DelaysCard(props: { rows: LogisticsDelayRow[]; count: number; onOpen: () => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Open exceptions
            <Badge variant={props.count > 0 ? 'danger' : 'success'}>{props.count}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onOpen} className="gap-1">
            Logistics <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> All clear — no open delays.
          </p>
        ) : (
          <div className="space-y-2">
            {props.rows.map((d) => (
              <div key={d.id} className="rounded-md border border-red-100 bg-red-50/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-gray-900 truncate">{d.type}</p>
                  <Badge variant={d.status === 'Resolved' ? 'success' : 'danger'}>{d.status}</Badge>
                </div>
                <p className="text-xs text-gray-600 truncate">
                  {d.affectedTripNumber ? `${d.affectedTripNumber} · ` : ''}
                  {d.affectedOrders} order{d.affectedOrders === 1 ? '' : 's'} · {d.customersAffected} customer
                  {d.customersAffected === 1 ? '' : 's'}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{d.owner ?? 'Unassigned'}</span>
                  <span className={d.daysLate > 0 ? 'text-red-700 font-semibold' : ''}>
                    {d.daysLate > 0 ? `${d.daysLate}d late` : 'Same day'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

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
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          7-day delivery performance
        </CardTitle>
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
