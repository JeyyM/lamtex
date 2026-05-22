import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { TripDetailsModal } from '@/src/components/logistics/TripDetailsModal';
import type { Trip } from '@/src/types/logistics';
import {
  Truck,
  AlertTriangle,
  Package,
  MapPin,
  Loader2,
  RefreshCw,
  Navigation,
  Calendar,
  CheckCircle,
  Camera,
  Bell,
  Phone,
  ChevronRight,
  Activity,
} from 'lucide-react';
import {
  fetchDriverDashboard,
  fetchDriverTripDetail,
  reportDriverTripDelay,
  DRIVER_DELAY_TYPES,
  type DriverDashboardBundle,
  type DriverKPI,
  type DriverTripSummary,
  type DriverOrderStop,
  type DriverDelayType,
} from '@/src/lib/driverDashboard';

const STATUS_TILE_STYLES: Record<DriverKPI['status'], string> = {
  good: 'border-emerald-200 bg-emerald-50/40',
  warning: 'border-amber-200 bg-amber-50/40',
  danger: 'border-red-200 bg-red-50/40',
  neutral: 'border-gray-200 bg-white',
};

const STATUS_TEXT_COLORS: Record<DriverKPI['status'], string> = {
  good: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  neutral: 'text-gray-700',
};

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function tripStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'Complete':
    case 'Completed':
    case 'Delivered':
      return 'success';
    case 'In Transit':
      return 'info';
    case 'Loading':
    case 'Scheduled':
      return 'warning';
    case 'Delayed':
    case 'Cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

export function DriverDashboard(): React.ReactElement {
  const { branch, employeeId, employeeName, addAuditLog } = useAppContext();
  const navigate = useNavigate();

  const [bundle, setBundle] = useState<DriverDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);

  const [delayTrip, setDelayTrip] = useState<DriverTripSummary | null>(null);
  const [delayType, setDelayType] = useState<DriverDelayType>('Traffic');
  const [delayExplanation, setDelayExplanation] = useState('');
  const [delaySaving, setDelaySaving] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setRefreshing(silent);
      setError(null);
      try {
        const data = await fetchDriverDashboard({
          driverId: employeeId,
          driverName: employeeName,
          branchName: branch,
        });
        setBundle(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load driver dashboard');
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

  const openTrip = useCallback(async (tripId: string) => {
    setTripLoading(true);
    try {
      const { trip, error: tripErr } = await fetchDriverTripDetail(tripId);
      if (tripErr || !trip) {
        window.alert(tripErr ?? 'Could not load trip details.');
        return;
      }
      setSelectedTrip(trip);
      setTripModalOpen(true);
    } finally {
      setTripLoading(false);
    }
  }, []);

  const handleReportDelay = useCallback(async () => {
    if (!delayTrip || !bundle) return;
    setDelaySaving(true);
    try {
      const orderNums = bundle.orderStops.filter((s) => s.tripId === delayTrip.id).map((s) => s.orderNumber);
      const customers = bundle.orderStops.filter((s) => s.tripId === delayTrip.id).map((s) => s.customerName);
      const result = await reportDriverTripDelay({
        tripId: delayTrip.id,
        tripNumber: delayTrip.tripNumber,
        branchId: bundle.branchId,
        driverName: employeeName || 'Driver',
        delayType,
        explanation: delayExplanation,
        orderNumbers: orderNums,
        customerNames: customers,
      });
      if (!result.ok) {
        window.alert(result.error ?? 'Could not report delay.');
        return;
      }
      addAuditLog('Reported trip delay', 'Trip', `${delayTrip.tripNumber}: ${delayType}`);
      setDelayTrip(null);
      setDelayExplanation('');
      setDelayType('Traffic');
      await load(true);
    } finally {
      setDelaySaving(false);
    }
  }, [delayTrip, bundle, delayType, delayExplanation, employeeName, addAuditLog, load]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-7 h-7 animate-spin text-red-600" />
          <p className="text-sm">Loading your trips…</p>
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

  const noProfile = !bundle.driverId;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}{employeeName ? `, ${employeeName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {bundle.branchName ?? branch ?? 'Your branch'} · Assigned trips &amp; deliveries
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load(true)}
          disabled={refreshing || tripLoading}
          className="gap-2 self-start"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {noProfile && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900">
              Sign in with a driver employee account linked in HR to see your assigned trips.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI strip */}
      <KpiStrip kpis={bundle.kpis} />

      {/* Active trip hero */}
      {bundle.activeTrip ? (
        <ActiveTripCard
          trip={bundle.activeTrip}
          onOpen={() => void openTrip(bundle.activeTrip!.id)}
          onReportDelay={() => setDelayTrip(bundle.activeTrip)}
          loading={tripLoading}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="font-medium text-gray-700">No active trip right now</p>
            <p className="text-sm mt-1">Check upcoming assignments below.</p>
          </CardContent>
        </Card>
      )}

      {/* Delivery stops */}
      {bundle.orderStops.length > 0 && (
        <DeliveryStopsCard
          stops={bundle.orderStops}
          onOpenTrip={(tripId) => void openTrip(tripId)}
          onOpenOrder={(orderId) => navigate(`/orders/${orderId}`)}
        />
      )}

      {/* Upcoming + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TripListCard
          title="Upcoming trips"
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
          trips={bundle.upcomingTrips}
          emptyMessage="Nothing scheduled ahead."
          onOpen={(id) => void openTrip(id)}
        />
        <TripListCard
          title="Recent completed"
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          trips={bundle.recentTrips}
          emptyMessage="No completed trips in the last 7 days."
          onOpen={(id) => void openTrip(id)}
        />
      </div>

      {/* Notifications placeholder */}
      <Card className="border-dashed border-gray-300 bg-gray-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Bell className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-700">Customer status updates</p>
            <p className="text-xs text-gray-500 mt-1">
              Automated SMS / push notifications to customers will be available here soon. For now, use
              Report Delay to alert logistics when something goes wrong.
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-right">
        Generated {new Date(bundle.generatedAt).toLocaleString()}
      </p>

      {/* Trip detail modal — full POD + order workflow */}
      {tripModalOpen && selectedTrip && (
        <TripDetailsModal
          isOpen={tripModalOpen}
          onClose={() => {
            setTripModalOpen(false);
            setSelectedTrip(null);
            void load(true);
          }}
          trip={selectedTrip}
          onEdit={() => {}}
          onTripStatusChange={() => void load(true)}
          onOrderStatusChange={() => void load(true)}
        />
      )}

      {/* Report delay modal */}
      {delayTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-lg shadow-xl">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Report delay
              </h2>
              <p className="text-sm text-gray-500 mt-1">{delayTrip.tripNumber}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={delayType}
                  onChange={(e) => setDelayType(e.target.value as DriverDelayType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {DRIVER_DELAY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What happened?</label>
                <textarea
                  value={delayExplanation}
                  onChange={(e) => setDelayExplanation(e.target.value)}
                  rows={4}
                  placeholder="Describe the delay so logistics can respond…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => !delaySaving && setDelayTrip(null)}
                disabled={delaySaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleReportDelay()}
                disabled={delaySaving || !delayExplanation.trim()}
                className="gap-2"
              >
                {delaySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                Submit delay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiStrip(props: { kpis: DriverKPI[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
      {props.kpis.map((kpi) => (
        <div
          key={kpi.id}
          className={`rounded-lg border ${STATUS_TILE_STYLES[kpi.status]} p-3 sm:p-4`}
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${STATUS_TEXT_COLORS[kpi.status]}`}>{kpi.value}</p>
          {kpi.subtitle && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{kpi.subtitle}</p>}
        </div>
      ))}
    </div>
  );
}

function ActiveTripCard(props: {
  trip: DriverTripSummary;
  onOpen: () => void;
  onReportDelay: () => void;
  loading: boolean;
}) {
  const t = props.trip;
  const route = t.destinations.slice(0, 3).join(' → ') || '—';

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/60 to-white overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Activity className="w-5 h-5" />
            Current trip
          </CardTitle>
          <Badge variant={tripStatusVariant(t.status)}>{t.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-lg font-bold text-gray-900">{t.tripNumber}</p>
          <p className="text-sm text-gray-600 mt-1">
            {t.vehicleName ?? '—'}
            {t.plateNumber ? ` · ${t.plateNumber}` : ''}
          </p>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-700">
          <Navigation className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <span>{route}{t.destinations.length > 3 ? ` (+${t.destinations.length - 3})` : ''}</span>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {formatDateShort(t.scheduledDate)}
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> {t.orderCount} order{t.orderCount === 1 ? '' : 's'}
          </span>
          <span>{t.capacityUsedPercent.toFixed(0)}% capacity</span>
        </div>

        {t.delayReason && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-2">
            ⚠ {t.delayReason}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button variant="primary" onClick={props.onOpen} disabled={props.loading} className="gap-2 flex-1">
            {props.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            Open trip &amp; deliver
          </Button>
          {t.status !== 'Complete' && t.status !== 'Cancelled' && (
            <Button variant="outline" onClick={props.onReportDelay} className="gap-2 border-amber-300 text-amber-900">
              <AlertTriangle className="w-4 h-4" /> Report delay
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DeliveryStopsCard(props: {
  stops: DriverOrderStop[];
  onOpenTrip: (tripId: string) => void;
  onOpenOrder: (orderId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          Delivery stops
          <Badge variant="warning">{props.stops.filter((s) => s.canDeliver).length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.stops.map((stop) => (
          <div
            key={stop.id}
            className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {stop.orderNumber} · {stop.customerName}
                </p>
                <p className="text-xs text-gray-500">{stop.tripNumber}</p>
              </div>
              <Badge variant={tripStatusVariant(stop.status)}>{stop.status}</Badge>
            </div>

            {stop.deliveryAddress && (
              <p className="text-sm text-gray-600 mt-2 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{stop.deliveryAddress}</span>
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {stop.phone && (
                <a
                  href={`tel:${stop.phone}`}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => props.onOpenOrder(stop.id)}
                className="gap-1.5 text-xs h-8"
              >
                View order
              </Button>
              {stop.canDeliver && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => props.onOpenTrip(stop.tripId)}
                  className="gap-1.5 text-xs h-8"
                >
                  <Camera className="w-3.5 h-3.5" /> Proof of delivery
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TripListCard(props: {
  title: string;
  icon: React.ReactNode;
  trips: DriverTripSummary[];
  emptyMessage: string;
  onOpen: (tripId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {props.icon}
          {props.title}
          {props.trips.length > 0 && <Badge variant="default">{props.trips.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {props.trips.length === 0 ? (
          <p className="text-sm text-gray-500">{props.emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {props.trips.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => props.onOpen(t.id)}
                className="w-full text-left rounded-md border border-gray-200 bg-white p-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{t.tripNumber}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {formatDateShort(t.scheduledDate)} · {t.orderCount} order{t.orderCount === 1 ? '' : 's'}
                    {t.vehicleName ? ` · ${t.vehicleName}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={tripStatusVariant(t.status)}>{t.status}</Badge>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
