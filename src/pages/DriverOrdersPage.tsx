import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { TripDetailsModal } from '@/src/components/logistics/TripDetailsModal';
import { DriverTripMapExplorer } from '@/src/components/driver/DriverTripMapExplorer';
import { DriverTripDeliveryItemsCard } from '@/src/components/driver/DriverTripDeliveryItemsCard';
import type { Trip } from '@/src/types/logistics';
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  fetchDriverDashboard,
  fetchDriverTripDetail,
  type DriverDashboardBundle,
  type DriverTripSummary,
} from '@/src/lib/driverDashboard';

type TabKey = 'active' | 'past';

export function DriverOrdersPage(): React.ReactElement {
  const { branch, employeeId, employeeName, session, sessionLoading } = useAppContext();

  const [tab, setTab] = useState<TabKey>('active');
  const [bundle, setBundle] = useState<DriverDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
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
        setError(e instanceof Error ? e.message : 'Failed to load trips');
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

  const activeTabTrips = useMemo(() => {
    if (!bundle) return [];
    const map = new Map<string, DriverTripSummary>();
    for (const t of bundle.activeTrips) map.set(t.id, t);
    for (const t of bundle.upcomingTrips) map.set(t.id, t);
    return [...map.values()];
  }, [bundle]);

  const currentTabTrips = tab === 'active' ? activeTabTrips : (bundle?.pastTrips ?? []);

  const selectedExplorerTrip = useMemo(
    () => currentTabTrips.find((t) => t.id === selectedExplorerTripId) ?? null,
    [currentTabTrips, selectedExplorerTripId],
  );

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
            <h2 className="text-lg font-semibold">Could not load trips</h2>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My trips</h1>
          <p className="text-sm text-gray-500 mt-1">
            Assigned deliveries, routes, and proof of delivery
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

      <div className="flex gap-1 border-b border-gray-200">
        <TabButton active={tab === 'active'} onClick={() => setTab('active')} count={bundle.activeTrips.length + bundle.upcomingTrips.length}>
          Active &amp; upcoming
        </TabButton>
        <TabButton active={tab === 'past'} onClick={() => setTab('past')} count={bundle.pastTrips.length}>
          Past trips
        </TabButton>
      </div>

      {tab === 'active' ? (
        <DriverTripMapExplorer
          branchId={bundle.branchId}
          trips={activeTabTrips}
          orderStops={bundle.orderStops}
          defaultTripId={bundle.nextTrip?.id ?? null}
          routeMode="pending"
          listTitle="Active & upcoming"
          emptyMessage="No active or upcoming trips assigned to you."
          tripLoading={tripLoading}
          onOpenTrip={(id) => void openTrip(id)}
          onSelectedTripIdChange={setSelectedExplorerTripId}
        />
      ) : (
        <DriverTripMapExplorer
          branchId={bundle.branchId}
          trips={bundle.pastTrips}
          orderStops={bundle.orderStops}
          defaultTripId={bundle.pastTrips[0]?.id ?? null}
          routeMode="all"
          listTitle="Past trips"
          emptyMessage="No completed trips on record."
          tripLoading={tripLoading}
          onOpenTrip={(id) => void openTrip(id)}
          onSelectedTripIdChange={setSelectedExplorerTripId}
        />
      )}

      <DriverTripDeliveryItemsCard trip={selectedExplorerTrip} />

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
    </div>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        props.active
          ? 'border-red-600 text-red-700'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {props.children}
      {props.count > 0 && (
        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${props.active ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
          {props.count}
        </span>
      )}
    </button>
  );
}
