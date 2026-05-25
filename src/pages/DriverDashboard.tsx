import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { TripDetailsModal } from '@/src/components/logistics/TripDetailsModal';
import { DriverTripMapExplorer } from '@/src/components/driver/DriverTripMapExplorer';
import { DriverTripDeliveryItemsCard } from '@/src/components/driver/DriverTripDeliveryItemsCard';
import { DriverPastTripsTable } from '@/src/components/driver/DriverPastTripsTable';
import type { Trip } from '@/src/types/logistics';
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  fetchDriverDashboard,
  fetchDriverTripDetail,
  reportDriverTripDelay,
  DRIVER_DELAY_TYPES,
  type DriverDashboardBundle,
  type DriverTripSummary,
  type DriverDelayType,
} from '@/src/lib/driverDashboard';

export function DriverDashboard(): React.ReactElement {
  const { branch, employeeId, employeeName, session, sessionLoading, addAuditLog } = useAppContext();

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
  const [selectedExplorerTripId, setSelectedExplorerTripId] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (sessionLoading) return;
      if (!silent) setLoading(true);
      setRefreshing(silent);
      setError(null);
      try {
        const data = await fetchDriverDashboard({
          driverId: employeeId,
          driverName: employeeName,
          branchName: branch,
          sessionEmail: session?.user?.email ?? null,
        });
        setBundle(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load driver dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branch, employeeId, employeeName, session?.user?.email, sessionLoading],
  );

  useEffect(() => {
    if (sessionLoading) return;
    void load();
  }, [load, sessionLoading]);

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

  const mapExplorerTrips = useMemo(() => {
    if (!bundle) return [];
    const map = new Map<string, DriverTripSummary>();
    for (const t of bundle.activeTrips) map.set(t.id, t);
    for (const t of bundle.upcomingTrips) map.set(t.id, t);
    return [...map.values()];
  }, [bundle]);

  const selectedExplorerTrip = useMemo(
    () => mapExplorerTrips.find((t) => t.id === selectedExplorerTripId) ?? null,
    [mapExplorerTrips, selectedExplorerTripId],
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (loading || sessionLoading) {
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

  const noProfile = !bundle.driverId && !bundle.driverName;

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
        <div className="flex flex-wrap gap-2 self-start">
          <Button
            variant="outline"
            onClick={() => void load(true)}
            disabled={refreshing || tripLoading}
            className="gap-2"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
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

      {/* Trip map explorer — pick which trip to preview */}
      <DriverTripMapExplorer
        branchId={bundle.branchId}
        trips={mapExplorerTrips}
        orderStops={bundle.orderStops}
        defaultTripId={bundle.nextTrip?.id ?? null}
        routeMode="pending"
        listTitle="Select trip"
        emptyMessage="No active or upcoming trips assigned to you."
        tripLoading={tripLoading}
        onOpenTrip={(id) => void openTrip(id)}
        onReportDelay={(t) => setDelayTrip(t)}
        onSelectedTripIdChange={setSelectedExplorerTripId}
      />

      <DriverTripDeliveryItemsCard trip={selectedExplorerTrip} />

      <DriverPastTripsTable
        pastTrips={bundle.pastTrips}
        orderStops={bundle.orderStops}
        onOpenTrip={(id) => void openTrip(id)}
      />

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
