import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Truck, Package, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';
import { ModuleAccessDenied } from '@/src/components/permissions/ModuleAccessDenied';
import { StatKpiCard } from '@/src/components/ui/StatKpiCard';
import { Button } from '@/src/components/ui/Button';
import { TripDetailsModal } from '@/src/components/logistics/TripDetailsModal';
import { TripsDispatchTable } from '@/src/components/logistics/TripsDispatchTable';
import { useTripsPageAccess } from '@/src/lib/permissions/tripsPageAccess';
import {
  computeTripsBoardKpis,
  fetchOrderIdsMatchingDispatchSearch,
  loadTripsBoard,
  resolveTripDisplayStatus,
} from '@/src/lib/tripsBoardData';
import type { Trip } from '@/src/types/logistics';
import type { DispatchSearchExtras } from '@/src/lib/dispatchQueueUi';
import { dispatchBoardTripsForView } from '@/src/lib/dispatchBoardTripFilters';
import type { DatePeriodKind } from '@/src/lib/datePeriodQuery';

export function TripsPage(): React.ReactElement {
  const { branch } = useAppContext();
  const { canAccess } = useTripsPageAccess();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripLowestOrderStatus, setTripLowestOrderStatus] = useState<Record<string, string>>({});
  const [tripOrderStatusMap, setTripOrderStatusMap] = useState<Record<string, Record<string, string>>>({});
  const [tripOrderMeta, setTripOrderMeta] = useState<Record<string, { orderNumber: string }>>({});
  const [fromDb, setFromDb] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showCompleted, setShowCompleted] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('scheduledDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchMatchedOrderIds, setSearchMatchedOrderIds] = useState<Set<string>>(new Set());
  const [dispatchPeriodKind] = useState<DatePeriodKind>('year');

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);

  const refreshGenRef = useRef(0);

  const resolveStatus = useCallback(
    (trip: Trip) => resolveTripDisplayStatus(trip.id, trip.status, tripLowestOrderStatus),
    [tripLowestOrderStatus],
  );

  const refresh = useCallback(
    async (silent = false) => {
      if (!branch?.trim()) {
        setTrips([]);
        setTripLowestOrderStatus({});
        setTripOrderStatusMap({});
        setTripOrderMeta({});
        setFromDb(false);
        setLoadError(null);
        setLoading(false);
        return;
      }

      const gen = ++refreshGenRef.current;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setLoadError(null);

      try {
        const data = await loadTripsBoard(branch);
        if (gen !== refreshGenRef.current) return;
        setTrips(data.trips);
        setTripLowestOrderStatus(data.tripLowestOrderStatus);
        setTripOrderStatusMap(data.tripOrderStatusMap);
        setTripOrderMeta(data.tripOrderMeta);
        setFromDb(data.fromDb);
        if (data.error) setLoadError(data.error);
      } catch (e) {
        if (gen !== refreshGenRef.current) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load trips');
      } finally {
        if (gen === refreshGenRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [branch],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || !branch?.trim()) {
      setSearchMatchedOrderIds(new Set());
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchOrderIdsMatchingDispatchSearch(branch, q).then((ids) => {
        if (!cancelled) setSearchMatchedOrderIds(new Set(ids));
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, branch]);

  const searchExtras: DispatchSearchExtras = useMemo(
    () => ({
      orderMetaById: tripOrderMeta,
      matchedOrderIds: searchMatchedOrderIds.size > 0 ? searchMatchedOrderIds : undefined,
    }),
    [tripOrderMeta, searchMatchedOrderIds],
  );

  const visibleTrips = useMemo(
    () =>
      dispatchBoardTripsForView(trips, {
        searching: searchQuery.trim().length > 0,
        periodKind: dispatchPeriodKind,
      }),
    [trips, searchQuery, dispatchPeriodKind],
  );

  const kpis = useMemo(
    () => computeTripsBoardKpis(visibleTrips, tripLowestOrderStatus),
    [visibleTrips, tripLowestOrderStatus],
  );

  const emptyMessage = useMemo(() => {
    if (!fromDb) return 'Could not load trips from the database for this branch.';
    if (searchQuery.trim()) {
      return 'No trips match this search. Confirm the order is on a trip and try Show Completed.';
    }
    if (showCompleted) return 'No trips found for this branch.';
    return 'No active trips found. Turn on Show Completed to include finished trips.';
  }, [fromDb, searchQuery, showCompleted]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'scheduledDate' ? 'desc' : 'asc');
    }
  };

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowTripDetails(true);
  };

  if (!canAccess) {
    return <ModuleAccessDenied moduleName="Trips" />;
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
          <p className="text-sm text-gray-500 mt-1">
            View scheduled trips and mark orders loading or packed
            {branch ? ` · ${branch}` : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || refreshing || !branch?.trim()}
          onClick={() => void refresh(true)}
          className="self-start sm:self-auto"
        >
          {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {!branch?.trim() && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Select a branch in the header to view trips.
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        <StatKpiCard label="Active Trips" value={String(kpis.activeTrips)} tone="blue" icon={<Truck />} />
        <StatKpiCard label="Loading" value={String(kpis.loadingTrips)} tone="amber" icon={<Loader2 />} />
        <StatKpiCard label="Packed / Ready" value={String(kpis.packedReadyTrips)} tone="emerald" icon={<CheckCircle />} />
        <StatKpiCard label="Orders on Trips" value={String(kpis.ordersOnTrips)} tone="teal" icon={<Package />} />
      </div>

      <TripsDispatchTable
        trips={visibleTrips}
        loading={loading}
        emptyMessage={emptyMessage}
        searchQuery={searchQuery}
        onSearchQueryChange={(v) => {
          setSearchQuery(v);
          setPage(1);
        }}
        filterStatus={filterStatus}
        onFilterStatusChange={(v) => {
          setFilterStatus(v);
          setPage(1);
        }}
        showCompleted={showCompleted}
        onShowCompletedChange={(v) => {
          setShowCompleted(v);
          setPage(1);
        }}
        page={page}
        onPageChange={setPage}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        resolveStatus={resolveStatus}
        searchExtras={searchExtras}
        onTripClick={handleTripClick}
      />

      {selectedTrip && (
        <TripDetailsModal
          isOpen={showTripDetails}
          onClose={() => {
            setShowTripDetails(false);
            setSelectedTrip(null);
          }}
          trip={selectedTrip}
          onEdit={() => {}}
          onOrderStatusChange={(tripId, orderId, newStatus) => {
            const RANK: Record<string, number> = {
              Scheduled: 1,
              Loading: 2,
              Packed: 3,
              Ready: 4,
              'In Transit': 5,
              Delivered: 6,
              Complete: 7,
              Delayed: 8,
              Cancelled: 9,
            };
            setTripOrderStatusMap((prev) => {
              const updated = {
                ...prev,
                [tripId]: { ...(prev[tripId] ?? {}), [orderId]: newStatus },
              };
              const statuses = Object.values(updated[tripId] ?? {}) as string[];
              let lowestRank = Infinity;
              let lowestSt = newStatus;
              for (const st of statuses) {
                const r = RANK[st] ?? 99;
                if (r < lowestRank) {
                  lowestRank = r;
                  lowestSt = st;
                }
              }
              setTripLowestOrderStatus((s) => ({ ...s, [tripId]: lowestSt }));
              return updated;
            });
          }}
          onTripStatusChange={(tripId, newStatus, extra) => {
            setTrips((prev) =>
              prev.map((t) =>
                t.id === tripId
                  ? {
                      ...t,
                      status: newStatus as Trip['status'],
                      ...(extra?.delayReason != null ? { delayReason: extra.delayReason } : {}),
                    }
                  : t,
              ),
            );
            if (selectedTrip?.id === tripId) {
              setSelectedTrip((t) =>
                t
                  ? {
                      ...t,
                      status: newStatus as Trip['status'],
                      ...(extra?.delayReason != null ? { delayReason: extra.delayReason } : {}),
                    }
                  : t,
              );
            }
          }}
        />
      )}
    </div>
  );
}
