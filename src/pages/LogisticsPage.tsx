import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { useLogisticsPermissions } from '@/src/lib/permissions/logisticsPermissions';
import { ModuleAccessDenied } from '@/src/components/permissions/ModuleAccessDenied';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { StatKpiCard } from '@/src/components/ui/StatKpiCard';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import {
  DATE_PERIOD_OPTIONS,
  periodTriggerLabel,
  resolveDatePeriodQuery,
  todayIsoLocal,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';
import {
  Truck,
  MapPin,
  Calendar,
  Clock,
  Package,
  Route,
  Navigation,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Map,
  FileText,
  Phone,
  MessageSquare,
  Users,
  Settings,
  BarChart3,
  TrendingUp,
  ArrowRight,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Camera,
  Ship,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CalendarRange,
} from 'lucide-react';
import {
  getTripsByBranch,
  getVehiclesByBranch,
  getDeliveriesByBranch,
  getOrdersReadyByBranch,
} from '@/src/mock/logisticsDashboard';
import {
  fetchLogisticsOrderQueue,
  fetchTripsForBranch,
  createTripFromPlanning,
  createContainerShipmentFromPlanning,
  fetchDriversForBranch,
  fetchBranchHqCoords,
  updateTrip,
  fetchTripById,
  applyOrderLabelsToTrips,
  fetchOrderIdsMatchingDispatchSearch,
} from '@/src/lib/logisticsScheduling';
import { RoutePlanningView } from '@/src/components/logistics/RoutePlanningView';
import { ContainerScheduleView } from '@/src/components/logistics/ContainerScheduleView';
import { TripDetailsModal } from '@/src/components/logistics/TripDetailsModal';
import { EditTripModal } from '@/src/components/logistics/EditTripModal';
import { Vehicle, Trip, OrderReadyForDispatch } from '@/src/types/logistics';
import { fetchFleetTrucksForBranch, syncVehicleOnTripStart, syncVehicleOnTripComplete } from '@/src/lib/fleetTrucks';
import { fetchFleetContainersForBranch } from '@/src/lib/fleetContainers';
import {
  resolveLogisticsModeAvailability,
  type LogisticsModeAvailability,
} from '@/src/lib/logisticsBranchModes';
import { downloadFleetReportWorkbook, fetchFleetExportBundle } from '@/src/lib/fleetExport';
import { TruckFormModal } from '@/src/components/logistics/TruckFormModal';
import { supabase } from '@/src/lib/supabase';
import {
  localYmd,
  DISPATCH_QUEUE_STATUS_OPTIONS,
  dispatchQueueStatusSelectClass,
  tripStatusDisplay,
  tripStatusIsCompletedUi,
  getDispatchVehicleColor,
  tripMatchesDispatchSearch,
  compareTripScheduleDates,
  formatTripScheduleDate,
} from '@/src/lib/dispatchQueueUi';
import { dispatchBoardTripsForView } from '@/src/lib/dispatchBoardTripFilters';

type ViewMode = 'dispatch' | 'fleet' | 'routes' | 'shipments';
type TransportType = 'truck' | 'interisland';

function tripSubline(trip: Trip, interIsland: boolean): string {
  const suffix = interIsland
    ? (trip.destinations[0] ? ` · ${trip.destinations[0]}` : '')
    : (trip.driverName && trip.driverName !== '—' ? ` · ${trip.driverName}` : '');
  return `${trip.vehicleName}${suffix}`;
}

function parseLogisticsSearch(search: string) {
  const q = new URLSearchParams(search);
  const mode = q.get('mode');
  return {
    tab: q.get('tab'),
    mode: mode === 'interisland' ? ('interisland' as const) : mode === 'truck' ? ('truck' as const) : null,
    orderId: q.get('order')?.trim() || undefined,
    date: q.get('date')?.trim().slice(0, 10) || undefined,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

export function LogisticsPage() {
  const { branch, employeeName } = useAppContext();
  const perms = useLogisticsPermissions();
  const { search } = useLocation();
  const initialParams = useMemo(() => parseLogisticsSearch(search), []);
  const [transportType, setTransportType] = useState<TransportType>(() =>
    initialParams.mode === 'interisland' ? 'interisland' : 'truck',
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (initialParams.mode === 'interisland' || initialParams.tab === 'dispatch') return 'dispatch';
    if (initialParams.tab === 'routes') return 'routes';
    if (initialParams.tab === 'fleet') return 'fleet';
    return 'dispatch';
  });

  useEffect(() => {
    const params = parseLogisticsSearch(search);
    if (params.mode === 'interisland') {
      setTransportType('interisland');
      setViewMode('dispatch');
      return;
    }
    if (params.mode === 'truck') setTransportType('truck');
    if (params.tab === 'routes') setViewMode('routes');
    else if (params.tab === 'fleet') setViewMode('fleet');
    else if (params.tab === 'dispatch' || params.orderId) setViewMode('dispatch');
  }, [search]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [showCompleted, setShowCompleted] = useState(false);
  const [dispatchQueuePage, setDispatchQueuePage] = useState(1);
  const [dispatchPeriodKind, setDispatchPeriodKind] = useState<DatePeriodKind>('year');
  const [dispatchCustomStart, setDispatchCustomStart] = useState('');
  const [dispatchCustomEnd, setDispatchCustomEnd] = useState('');
  const [dispatchPeriodModalOpen, setDispatchPeriodModalOpen] = useState(false);
  const [draftDispatchPeriodKind, setDraftDispatchPeriodKind] = useState<DatePeriodKind>('year');
  const [draftDispatchCustomStart, setDraftDispatchCustomStart] = useState('');
  const [draftDispatchCustomEnd, setDraftDispatchCustomEnd] = useState('');
  const [tripSortKey, setTripSortKey] = useState<string>('scheduledDate');
  const [tripSortDir, setTripSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedCalendarTrip, setSelectedCalendarTrip] = useState<Trip | null>(null);
  const [fleetTrucks, setFleetTrucks] = useState<Vehicle[]>([]);

  // Full month-view dispatch calendar
  const [dispatchCalOpen, setDispatchCalOpen] = useState(false);
  const [dispatchCalYear, setDispatchCalYear] = useState(() => new Date().getFullYear());
  const [dispatchCalMonth, setDispatchCalMonth] = useState(() => new Date().getMonth());
  const [dispatchCalSelectedKey, setDispatchCalSelectedKey] = useState<string | null>(null);

  // 14-day strip day detail
  const [stripDetailDateKey, setStripDetailDateKey] = useState<string | null>(null);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState<string | null>(null);
  const [exportingFleet, setExportingFleet] = useState(false);
  const [truckFormOpen, setTruckFormOpen] = useState(false);
  const [truckFormMode, setTruckFormMode] = useState<'create' | 'edit'>('create');
  const [truckFormEditId, setTruckFormEditId] = useState<string | null>(null);
  const [scheduleTrips, setScheduleTrips] = useState<Trip[]>([]);
  const [planningOrders, setPlanningOrders] = useState<OrderReadyForDispatch[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [logisticsLoading, setLogisticsLoading] = useState(false);
  const [logisticsFromDb, setLogisticsFromDb] = useState(false);
  const [logisticsLoadError, setLogisticsLoadError] = useState<string | null>(null);
  const [branchHq, setBranchHq] = useState<{ lat: number; lng: number } | null>(null);

  const [planningDrivers, setPlanningDrivers] = useState<import('@/src/types/logistics').DriverOption[]>([]);
  const [modeAvailability, setModeAvailability] = useState<LogisticsModeAvailability | null>(null);
  const logisticsRefreshGenRef = useRef(0);
  const isInterIsland = transportType === 'interisland';
  /** Branch selected → use live dispatch UI (calendar, queue, filters). Data source still gated by `logisticsFromDb`. */
  const liveDispatch = Boolean(branch?.trim());
  // Lowest order dispatch-stage per trip (for the dispatch table badge)
  const [tripLowestOrderStatus, setTripLowestOrderStatus] = useState<Record<string, string>>({});
  // Full per-trip order status map — used for real-time badge updates
  const [tripOrderStatusMap, setTripOrderStatusMap] = useState<Record<string, Record<string, string>>>({});
  const [tripOrderMeta, setTripOrderMeta] = useState<Record<string, { orderNumber: string }>>({});
  const [searchMatchedOrderIds, setSearchMatchedOrderIds] = useState<Set<string>>(new Set());
  /** Prefer trip-level Delayed so reporting a delay is not hidden by orders still marked In Transit. */
  const lowestOrderStatus = (tripId: string, tripStatus: string) => {
    if (tripStatus === 'Delayed') return 'Delayed';
    return tripLowestOrderStatus[tripId] ?? tripStatus;
  };

  const routePlanningPrefill = useMemo(() => {
    const params = parseLogisticsSearch(search);
    const ds = params.date ?? '';
    return {
      orderIds: params.orderId ? [params.orderId] : undefined as string[] | undefined,
      tripDate: /^\d{4}-\d{2}-\d{2}$/.test(ds) ? ds : undefined as string | undefined,
    };
  }, [search]);

  const refreshLogistics = useCallback(async () => {
    if (!branch?.trim()) {
      setScheduleTrips([]);
      setPlanningOrders([]);
      setLogisticsFromDb(false);
      setLogisticsLoadError(null);
      setLogisticsLoading(false);
      setOrdersLoading(false);
      return;
    }

    const gen = ++logisticsRefreshGenRef.current;
    setOrdersLoading(true);
    setLogisticsLoading(true);
    setLogisticsLoadError(null);
    try {
      const vehicleKind = transportType === 'interisland' ? 'container' : 'truck';

      // Available orders first — show the planning queue before trips finish loading.
      const orderQueue = await withTimeout(
        fetchLogisticsOrderQueue(branch, { vehicleKind }),
        30000,
        'Available orders',
      );
      if (gen !== logisticsRefreshGenRef.current) return;

      setPlanningOrders(orderQueue.orders);
      setLogisticsFromDb(!orderQueue.error);
      if (orderQueue.error) {
        setLogisticsLoadError(orderQueue.error);
        setScheduleTrips([]);
        setTripLowestOrderStatus({});
        setTripOrderStatusMap({});
        if (import.meta.env.DEV) {
          console.warn('[logistics] order queue load issue:', orderQueue.error);
        }
        return;
      }
      setOrdersLoading(false);

      const tripsResult = await withTimeout(
        fetchTripsForBranch(branch, vehicleKind),
        30000,
        'Trips',
      );
      if (gen !== logisticsRefreshGenRef.current) return;

      setScheduleTrips(tripsResult.trips);
      setLogisticsLoadError(tripsResult.error ?? null);
      setLogisticsLoading(false);

      if (tripsResult.error && import.meta.env.DEV) {
        console.warn('[logistics] trips load issue (orders may still be available):', tripsResult.error);
      }

      const allOrderIds = [...new Set(tripsResult.trips.flatMap((t) => t.orders))];
      if (allOrderIds.length) {
        const { data: orderRows, error: orderStatusErr } = await supabase
          .from('orders')
          .select('id, status, order_number, customer_name')
          .in('id', allOrderIds);
        if (gen !== logisticsRefreshGenRef.current) return;
        if (orderStatusErr) {
          if (import.meta.env.DEV) console.warn('[logistics] trip order status fetch failed:', orderStatusErr.message);
          setTripLowestOrderStatus({});
          setTripOrderStatusMap({});
          setTripOrderMeta({});
          return;
        }

        setScheduleTrips((prev) =>
          applyOrderLabelsToTrips(prev.length ? prev : tripsResult.trips, (orderRows ?? []).map((r) => ({
            id: r.id as string,
            order_number: r.order_number as string | null,
            customer_name: r.customer_name as string | null,
          }))),
        );

        const meta: Record<string, { orderNumber: string }> = {};
        for (const row of orderRows ?? []) {
          const num = String(row.order_number ?? '').trim();
          if (num) meta[row.id as string] = { orderNumber: num };
        }
        setTripOrderMeta(meta);
        const statusMap: Record<string, string> = {};
        for (const row of orderRows ?? []) statusMap[row.id as string] = (row.status as string) ?? 'Scheduled';
        const RANK: Record<string, number> = { Scheduled: 1, Loading: 2, Packed: 3, Ready: 4, 'In Transit': 5, Delivered: 6, Complete: 7, Delayed: 8, Cancelled: 9 };
        const lowest: Record<string, string> = {};
        const perTripMap: Record<string, Record<string, string>> = {};
        for (const trip of tripsResult.trips) {
          if (!trip.orders.length) continue;
          let lowestRank = Infinity;
          let lowestSt: string = trip.status;
          perTripMap[trip.id] = {};
          for (const oid of trip.orders) {
            const st = statusMap[oid] ?? 'Scheduled';
            perTripMap[trip.id][oid] = st;
            const rank = RANK[st] ?? 99;
            if (rank < lowestRank) {
              lowestRank = rank;
              lowestSt = st;
            }
          }
          lowest[trip.id] = lowestSt;
        }
        setTripLowestOrderStatus(lowest);
        setTripOrderStatusMap(perTripMap);
      } else {
        setTripLowestOrderStatus({});
        setTripOrderStatusMap({});
        setTripOrderMeta({});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load logistics data.';
      if (import.meta.env.DEV) console.error('[logistics] refresh failed:', err);
      setScheduleTrips(getTripsByBranch(branch));
      setPlanningOrders([]);
      setLogisticsFromDb(false);
      setLogisticsLoadError(message);
      setTripLowestOrderStatus({});
      setTripOrderStatusMap({});
      setTripOrderMeta({});
    } finally {
      if (gen === logisticsRefreshGenRef.current) {
        setLogisticsLoading(false);
        setOrdersLoading(false);
      }
    }
  }, [branch, transportType]);

  const loadFleet = useCallback(async () => {
    if (!branch?.trim()) {
      setFleetTrucks([]);
      setFleetError(null);
      return;
    }
    setFleetLoading(true);
    setFleetError(null);
    const { vehicles, error } =
      transportType === 'interisland'
        ? await fetchFleetContainersForBranch(branch)
        : await fetchFleetTrucksForBranch(branch);
    setFleetLoading(false);
    if (error) {
      setFleetError(error);
      setFleetTrucks([]);
      return;
    }
    setFleetTrucks(vehicles);
  }, [branch, transportType]);

  useEffect(() => {
    if (!branch?.trim()) {
      setModeAvailability(null);
      setLogisticsLoading(false);
      return;
    }
    let cancelled = false;
    void withTimeout(resolveLogisticsModeAvailability(branch), 12000, 'Mode availability')
      .then((modes) => {
        if (!cancelled) setModeAvailability(modes);
      })
      .catch((err) => {
        if (cancelled) return;
        if (import.meta.env.DEV) console.warn('[logistics] mode availability failed:', err);
        setModeAvailability({
          truck: false,
          interIsland: true,
          availableModes: ['interisland'],
          defaultMode: 'interisland',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [branch]);

  useEffect(() => {
    if (!modeAvailability) return;
    setTransportType((current) => {
      if (current === 'truck' && !modeAvailability.truck) return 'interisland';
      if (modeAvailability.availableModes.length === 1 && modeAvailability.defaultMode) {
        return modeAvailability.defaultMode;
      }
      return current;
    });
  }, [modeAvailability]);

  useEffect(() => {
    if (isInterIsland && viewMode === 'routes') {
      setViewMode('dispatch');
    }
  }, [isInterIsland, viewMode]);

  const openCreateTruckModal = useCallback(() => {
    if (!branch?.trim()) {
      window.alert('Select a branch in the header first.');
      return;
    }
    setTruckFormMode('create');
    setTruckFormEditId(null);
    setTruckFormOpen(true);
  }, [branch]);

  const handleExportFleetReport = useCallback(async () => {
    if (!branch?.trim()) {
      window.alert('Select a branch in the header first.');
      return;
    }
    if (exportingFleet || fleetLoading) return;
    setExportingFleet(true);
    try {
      const bundle = await fetchFleetExportBundle(branch);
      await downloadFleetReportWorkbook(bundle);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not export fleet report.');
    } finally {
      setExportingFleet(false);
    }
  }, [branch, exportingFleet, fleetLoading]);

  const loadDrivers = useCallback(async () => {
    if (!branch?.trim()) { setPlanningDrivers([]); return; }
    const { drivers } = await fetchDriversForBranch(branch);
    setPlanningDrivers(drivers);
  }, [branch]);

  useEffect(() => { loadFleet(); }, [loadFleet]);
  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  useEffect(() => {
    if (!branch?.trim()) return;
    void refreshLogistics();
  }, [branch, transportType, refreshLogistics]);

  useEffect(() => {
    let alive = true;
    if (!branch?.trim()) {
      setBranchHq(null);
      return () => {
        alive = false;
      };
    }
    void fetchBranchHqCoords(branch).then((p) => {
      if (alive) setBranchHq(p);
    });
    return () => {
      alive = false;
    };
  }, [branch]);

  const trips = logisticsFromDb ? scheduleTrips : getTripsByBranch(branch ?? '');
  const vehicles = getVehiclesByBranch(branch ?? '');
  const deliveries = getDeliveriesByBranch(branch ?? '');
  const ordersReady = liveDispatch ? planningOrders : getOrdersReadyByBranch(branch ?? '');
  const vehiclesForStats = fleetTrucks.length > 0 ? fleetTrucks : vehicles;

  const nextFourteenCalendarDays = useMemo(() => {
    const out: { date: string; day: string; dayNum: number; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = localYmd(today);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const date = localYmd(d);
      out.push({
        date,
        day: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: date === todayKey,
      });
    }
    return out;
  }, []);

  // Group all trips by date key for full calendar
  const dispatchCalByDateKey = useMemo(() => {
    const m: Record<string, Trip[]> = {};
    for (const t of trips) {
      const dk = (t.scheduledDate ?? '').slice(0, 10);
      if (!dk) continue;
      if (!m[dk]) m[dk] = [];
      m[dk].push(t);
    }
    return m;
  }, [trips]);

  const calendarStripDateKeys = useMemo(
    () => new Set(nextFourteenCalendarDays.map((d) => d.date)),
    [nextFourteenCalendarDays],
  );

  // Sort + filter helpers
  const handleTripSort = (key: string) => {
    if (tripSortKey === key) setTripSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else {
      setTripSortKey(key);
      setTripSortDir(key === 'scheduledDate' ? 'desc' : 'asc');
    }
  };
  const tripSortIcon = (col: string) => {
    if (tripSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return tripSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-red-600 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 text-red-600 inline" />;
  };

  // Filter trips
  const dispatchPeriodQuery = useMemo(
    () => resolveDatePeriodQuery(dispatchPeriodKind, dispatchCustomStart, dispatchCustomEnd),
    [dispatchPeriodKind, dispatchCustomStart, dispatchCustomEnd],
  );

  const maxDispatchCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftDispatchCustomInvalid = Boolean(
    draftDispatchCustomStart && draftDispatchCustomEnd && draftDispatchCustomStart > draftDispatchCustomEnd,
  );

  const openDispatchPeriodModal = () => {
    setDraftDispatchPeriodKind(dispatchPeriodKind);
    setDraftDispatchCustomStart(dispatchCustomStart);
    setDraftDispatchCustomEnd(dispatchCustomEnd);
    setDispatchPeriodModalOpen(true);
  };

  const handleDispatchPeriodChange = (kind: DatePeriodKind) => {
    setDispatchPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = todayIsoLocal();
      const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
      setDispatchCustomStart(start);
      setDispatchCustomEnd(iso);
    }
  };

  const handleDispatchModalPresetPick = (kind: DatePeriodKind) => {
    if (kind !== 'custom') {
      handleDispatchPeriodChange(kind);
      setDispatchPeriodModalOpen(false);
      return;
    }
    setDraftDispatchPeriodKind('custom');
    const t = new Date();
    const iso = todayIsoLocal();
    const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
    setDraftDispatchCustomStart((prev) => prev || dispatchCustomStart || start);
    setDraftDispatchCustomEnd((prev) => prev || dispatchCustomEnd || iso);
  };

  const applyDispatchModalCustomRange = () => {
    setDispatchPeriodKind('custom');
    setDispatchCustomStart(draftDispatchCustomStart);
    setDispatchCustomEnd(draftDispatchCustomEnd);
    setDispatchPeriodModalOpen(false);
  };

  useEffect(() => {
    if (!dispatchPeriodModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDispatchPeriodModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatchPeriodModalOpen]);

  const dateFilteredTrips = useMemo(() => {
    if (!liveDispatch) return trips;
    return dispatchBoardTripsForView(trips, {
      searching: false,
      periodKind: dispatchPeriodKind,
      customStart: dispatchCustomStart,
      customEnd: dispatchCustomEnd,
    });
  }, [trips, liveDispatch, dispatchPeriodKind, dispatchCustomStart, dispatchCustomEnd]);

  /** 14-day strip shows every trip on those days (including future dates); not limited by queue period end. */
  const calendarTrips = useMemo(
    () =>
      trips.filter((t) => {
        const dk = (t.scheduledDate ?? '').slice(0, 10);
        return dk && calendarStripDateKeys.has(dk);
      }),
    [trips, calendarStripDateKeys],
  );

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || !branch?.trim() || !liveDispatch) {
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
  }, [searchQuery, branch, liveDispatch]);

  const dispatchSearchExtras = useMemo(
    () => ({
      orderMetaById: tripOrderMeta,
      matchedOrderIds: searchMatchedOrderIds.size > 0 ? searchMatchedOrderIds : undefined,
    }),
    [tripOrderMeta, searchMatchedOrderIds],
  );

  const dispatchQueueEmptyMessage = useMemo(() => {
    if (!logisticsFromDb) return 'Could not load trips from the database for this branch.';
    if (searchQuery.trim()) {
      return 'No trips match this search. Confirm the order is on a trip and try Show Completed.';
    }
    if (showCompleted) return 'No trips found for this branch.';
    return 'No active trips found. Turn on Show Completed to include finished trips.';
  }, [logisticsFromDb, searchQuery, showCompleted]);

  const filteredTrips = useMemo(() => {
    const searching = searchQuery.trim().length > 0;
    const source = searching ? trips : dateFilteredTrips;
    const filtered = source.filter((trip) => {
      const matchesSearch = tripMatchesDispatchSearch(trip, searchQuery, dispatchSearchExtras);
      const matchesStatus = filterStatus === 'All'
        ? (showCompleted || (trip.status !== 'Complete' && trip.status !== 'Delivered' && trip.status !== 'Cancelled'))
        : trip.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (tripSortKey === 'scheduledDate' || tripSortKey === 'default') {
        return compareTripScheduleDates(a, b, tripSortDir);
      }

      let av: string | number;
      let bv: string | number;
      switch (tripSortKey) {
        case 'vehicleName':
          av = a.vehicleName.toLowerCase();
          bv = b.vehicleName.toLowerCase();
          break;
        case 'driverName':
          av = (a.driverName || '').toLowerCase();
          bv = (b.driverName || '').toLowerCase();
          break;
        case 'orders':
          av = a.orders.length;
          bv = b.orders.length;
          break;
        case 'customer':
          av = (a.customerLabel ?? a.destinations[0] ?? '').toLowerCase();
          bv = (b.customerLabel ?? b.destinations[0] ?? '').toLowerCase();
          break;
        case 'status':
          av = lowestOrderStatus(a.id, a.status);
          bv = lowestOrderStatus(b.id, b.status);
          break;
        default:
          return compareTripScheduleDates(a, b, tripSortDir);
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return tripSortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av); const bs = String(bv);
      if (as < bs) return tripSortDir === 'asc' ? -1 : 1;
      if (as > bs) return tripSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [trips, dateFilteredTrips, transportType, searchQuery, filterStatus, showCompleted, tripSortKey, tripSortDir, tripLowestOrderStatus, dispatchPeriodQuery, dispatchSearchExtras, liveDispatch]);

  const dispatchQueueTotalPages = Math.max(1, Math.ceil(filteredTrips.length / TABLE_PAGE_SIZE) || 1);
  const pagedDispatchTrips = useMemo(() => {
    const p = Math.min(dispatchQueuePage, dispatchQueueTotalPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return filteredTrips.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredTrips, dispatchQueuePage, dispatchQueueTotalPages]);

  useEffect(() => {
    if (dispatchQueuePage > dispatchQueueTotalPages) setDispatchQueuePage(dispatchQueueTotalPages);
  }, [dispatchQueuePage, dispatchQueueTotalPages]);

  useEffect(() => {
    setDispatchQueuePage(1);
  }, [searchQuery, filterStatus, showCompleted, branch, transportType, dispatchPeriodKind, dispatchCustomStart, dispatchCustomEnd]);

  const getStatusColor = (status: string) => {
    if (status === 'Complete' || status === 'Completed' || status === 'Delivered' || status === 'Available') return 'success';
    if (status === 'In Transit' || status === 'Loading' || status === 'Packed' || status === 'Ready' || status === 'Scheduled' || status === 'On Trip') return 'warning';
    if (status === 'Delayed' || status === 'Failed' || status === 'Blocked' || status === 'Maintenance' || status === 'Out of Service') return 'danger';
    if (status === 'Cancelled') return 'danger';
    return 'default';
  };

  const fleetList = fleetTrucks;
  const fleetStatsCount = fleetList.length || 1;

  const getVehicleStatusIcon = (status: string) => {
    if (status === 'On Trip') return <Truck className="w-4 h-4" />;
    if (status === 'Available') return <CheckCircle className="w-4 h-4" />;
    if (status === 'Loading') return <Package className="w-4 h-4" />;
    if (status === 'Maintenance' || status === 'Out of Service') return <Settings className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getVehicleColor = getDispatchVehicleColor;

  const viewModeTabs = useMemo(() => {
    const tabs = [
      { id: 'dispatch' as ViewMode, label: 'Schedule & Tracking', icon: <Calendar className="w-4 h-4" /> },
      {
        id: 'fleet' as ViewMode,
        label: 'Fleet Management',
        icon: isInterIsland ? <Ship className="w-4 h-4" /> : <Truck className="w-4 h-4" />,
      },
    ];
    if (!isInterIsland) {
      tabs.push({ id: 'routes' as ViewMode, label: 'Route Planning', icon: <Route className="w-4 h-4" /> });
    }
    return tabs;
  }, [isInterIsland]);

  const showTransportToggle = Boolean(branch?.trim());
  const truckModeAvailable = modeAvailability?.truck ?? false;

  if (!perms.pageAccess) {
    return <ModuleAccessDenied moduleName="Logistics" />;
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="w-full max-w-full">
        <h1 className="text-2xl font-bold text-gray-900">Logistics Management</h1>
      </div>

      {/* Transport Type Toggle — inter-island always available when a branch is selected */}
      {showTransportToggle && (
      <div className="flex items-start">
        <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-gray-50">
          <button
            type="button"
            onClick={() => truckModeAvailable && setTransportType('truck')}
            disabled={!truckModeAvailable}
            title={truckModeAvailable ? undefined : 'No trucks in this branch fleet yet'}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              disabled:opacity-45 disabled:cursor-not-allowed
              ${transportType === 'truck'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <Truck className="w-4 h-4" />
            Truck Deliveries
          </button>
          <button
            type="button"
            onClick={() => setTransportType('interisland')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${transportType === 'interisland'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <Ship className="w-4 h-4" />
            Inter-Island Shipments
          </button>
        </div>
      </div>
      )}

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200 w-full max-w-full">
        <div className="md:hidden pb-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {viewModeTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>
        <nav className="hidden md:flex gap-8">
          {viewModeTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`
                flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors
                ${viewMode === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* DISPATCH BOARD VIEW */}
      {viewMode === 'dispatch' && (
        <div className="space-y-6 w-full max-w-full">
          {isInterIsland && liveDispatch && (
            <ContainerScheduleView
              ordersReady={planningOrders}
              ordersLoading={ordersLoading}
              containers={fleetTrucks}
              existingTrips={scheduleTrips}
              initialSelectedOrderIds={routePlanningPrefill.orderIds}
              initialTripDate={routePlanningPrefill.tripDate}
              onCreateShipment={async (selectedOrderIds, containerId, scheduledDates, routeLabel) => {
                if (!branch?.trim()) {
                  window.alert('Select a branch in the header.');
                  return undefined;
                }
                const picked = planningOrders.filter((o) => selectedOrderIds.includes(o.id));
                const totalWeight = picked.reduce((s, o) => s + o.weight, 0);
                const totalVolume = picked.reduce((s, o) => s + o.volume, 0);
                const sortedDates = [...new Set(scheduledDates.map((d) => d.trim().slice(0, 10)).filter(Boolean))].sort();
                const res = await createContainerShipmentFromPlanning({
                  branchName: branch,
                  containerUuid: containerId,
                  orderUuids: selectedOrderIds,
                  scheduledDates: sortedDates,
                  totalWeightKg: totalWeight,
                  totalVolumeCbm: totalVolume,
                  routeLabel,
                  scheduledBy: employeeName?.trim() || null,
                });
                if (!res.ok) {
                  window.alert(res.error ?? 'Could not schedule shipment');
                  return undefined;
                }
                await refreshLogistics();
                loadFleet();
                const c = fleetTrucks.find((x) => x.id === containerId);
                return {
                  tripNumber: res.tripNumber ?? 'New shipment',
                  scheduledDate: sortedDates[0],
                  scheduledEndDate: sortedDates.length > 1 ? sortedDates[sortedDates.length - 1] : undefined,
                  dayCount: sortedDates.length,
                  orderCount: selectedOrderIds.length,
                  containerName: c?.vehicleName?.trim() ? c.vehicleName : 'Selected container',
                };
              }}
            />
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <StatKpiCard
              label={isInterIsland ? 'Active Shipments' : 'Active Trips'}
              value={String(trips.filter((t) => t.status === 'In Transit' || t.status === 'Loading').length)}
              tone={isInterIsland ? 'cyan' : 'blue'}
              icon={isInterIsland ? <Ship /> : <Truck />}
            />
            <StatKpiCard label="Orders Ready" value={String(ordersReady.length)} tone="emerald" icon={<Package />} />
            <StatKpiCard
              label={isInterIsland ? 'Available Containers' : 'Available Trucks'}
              value={String(vehiclesForStats.filter((v) => v.status === 'Available').length)}
              tone="teal"
              icon={<CheckCircle />}
            />
            <StatKpiCard
              label="Delayed"
              value={String(trips.filter((t) => t.status === 'Delayed').length)}
              tone="rose"
              icon={<AlertTriangle />}
            />
          </div>

          {liveDispatch && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <CardTitle>{isInterIsland ? 'Shipment Schedule (14 Days)' : 'Dispatch Schedule (14 Days)'}</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const t = new Date();
                      setDispatchCalYear(t.getFullYear());
                      setDispatchCalMonth(t.getMonth());
                      setDispatchCalSelectedKey(localYmd(t));
                      setDispatchCalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 bg-white"
                  >
                    <Calendar className="w-4 h-4 text-blue-600" />
                    View calendar
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {(() => {
                    const eventsByDate: Record<string, Trip[]> = {};
                    calendarTrips.forEach((trip) => {
                      const dateKey = (trip.scheduledDate ?? '').slice(0, 10);
                      if (!dateKey) return;
                      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
                      eventsByDate[dateKey].push(trip);
                    });

                    return nextFourteenCalendarDays.map((day) => {
                      const dayTrips = eventsByDate[day.date] || [];

                      return (
                        <div
                          key={day.date}
                          onClick={() => dayTrips.length > 0 && setStripDetailDateKey(day.date)}
                          className={`min-h-28 p-2 rounded-lg border transition-all ${
                            day.isToday
                              ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                              : 'bg-white border-gray-200'
                          } ${dayTrips.length > 0 ? 'hover:shadow-md cursor-pointer' : 'opacity-60'}`}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-semibold ${day.isToday ? 'text-red-700' : 'text-gray-500'}`}>
                                {day.day}
                              </span>
                              <span className={`text-sm font-bold ${day.isToday ? 'text-red-700' : 'text-gray-900'}`}>
                                {day.dayNum}
                              </span>
                            </div>
                            
                            <div className="flex-1 space-y-1 overflow-hidden">
                              {dayTrips.slice(0, 2).map((trip, tripIdx) => {
                                const colors = getVehicleColor(trip.vehicleId);
                                return (
                                  <div
                                    key={trip.id + String(tripIdx)}
                                    className="text-xs p-1.5 rounded"
                                    style={{
                                      backgroundColor: colors.bg,
                                      borderLeft: `3px solid ${colors.border}`
                                    }}
                                    title={`${trip.tripNumber} - ${trip.vehicleName}${isInterIsland ? '' : ` (${trip.driverName})`}`}
                                  >
                                    <div className="flex items-center gap-1">
                                      {isInterIsland ? (
                                        <Ship className="w-3 h-3 flex-shrink-0" style={{ color: colors.text }} />
                                      ) : (
                                        <Truck className="w-3 h-3 flex-shrink-0" style={{ color: colors.text }} />
                                      )}
                                      <span className="font-medium truncate flex-1" style={{ color: colors.text }}>
                                        {trip.vehicleName}
                                      </span>
                                    </div>
                                    <div className="truncate text-[10px] mt-0.5" style={{ color: colors.text, opacity: 0.8 }}>
                                      {isInterIsland ? (trip.destinations[0] || trip.tripNumber) : trip.driverName}
                                    </div>
                                  </div>
                                );
                              })}
                              {dayTrips.length > 2 && (
                                <div className="text-[10px] text-gray-500 text-center font-medium pt-0.5">
                                  +{dayTrips.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dispatch Table */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>
                {isInterIsland ? 'Shipment Queue' : 'Dispatch Queue'}
                {liveDispatch && !logisticsLoading && filteredTrips.length > 0
                  ? ` — ${filteredTrips.length} result${filteredTrips.length !== 1 ? 's' : ''}`
                  : ''}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                {liveDispatch && (
                  <select
                    aria-label="Filter dispatch queue by status"
                    value={filterStatus === 'All' ? '' : filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value === '' ? 'All' : e.target.value)}
                    className={`${dispatchQueueStatusSelectClass} w-[min(100%,14rem)] md:hidden`}
                  >
                    <option value="">Status</option>
                    {DISPATCH_QUEUE_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s === 'Complete' ? 'Completed' : s}
                      </option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs text-gray-500 font-medium">Show Completed</span>
                  <div
                    onClick={() => setShowCompleted((v) => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showCompleted ? 'bg-red-600' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showCompleted ? 'translate-x-4' : 'translate-x-1'}`}
                    />
                  </div>
                </label>
              </div>
            </CardHeader>
            {liveDispatch && (
              <div className="px-4 pb-4 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-full sm:flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={isInterIsland ? 'Search shipment, container, customer, order ID, route…' : 'Search trip, driver, customer, order ID, destination…'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={logisticsLoading}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto gap-2 border-gray-300 bg-white max-w-[18rem] justify-start"
                    aria-haspopup="dialog"
                    aria-expanded={dispatchPeriodModalOpen}
                    aria-label="Choose schedule period"
                    disabled={logisticsLoading}
                    onClick={openDispatchPeriodModal}
                  >
                    <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
                    <span className="truncate text-left text-sm font-normal">
                      {periodTriggerLabel(dispatchPeriodKind, dispatchCustomStart, dispatchCustomEnd)}
                    </span>
                  </Button>
                </div>
              </div>
            )}
            <CardContent className="p-0">
              {logisticsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <Loader2 className="w-10 h-10 animate-spin text-red-500" aria-hidden />
                  <p className="mt-4 text-sm text-gray-500">{isInterIsland ? 'Loading shipments…' : 'Loading trips…'}</p>
                </div>
              ) : !liveDispatch ? (
                <div className="py-16 px-4 text-center text-sm text-gray-500">
                  Select a branch in the header to view logistics.
                </div>
              ) : logisticsLoadError && !logisticsFromDb ? (
                <div className="py-16 px-4 text-center space-y-3">
                  <p className="text-sm text-red-700">{logisticsLoadError}</p>
                  <Button type="button" variant="outline" onClick={() => void refreshLogistics()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        onClick={() => handleTripSort('vehicleName')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">{isInterIsland ? 'Container & route' : 'Vehicle & Driver'}{tripSortIcon('vehicleName')}</span>
                      </th>
                      <th
                        onClick={() => handleTripSort('customer')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Customer{tripSortIcon('customer')}</span>
                      </th>
                      <th
                        onClick={() => handleTripSort('scheduledDate')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Schedule{tripSortIcon('scheduledDate')}</span>
                      </th>
                      <th
                        onClick={() => handleTripSort('orders')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Orders{tripSortIcon('orders')}</span>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-top min-w-[10.5rem] max-w-[14rem]">
                        <div className="normal-case">
                          <select
                            aria-label="Filter dispatch queue by status"
                            value={filterStatus === 'All' ? '' : filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value === '' ? 'All' : e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={dispatchQueueStatusSelectClass}
                          >
                            <option value="">Status</option>
                            {DISPATCH_QUEUE_STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s === 'Complete' ? 'Completed' : s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTrips.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                          {dispatchQueueEmptyMessage}
                        </td>
                      </tr>
                    )}
                    {pagedDispatchTrips.map((trip) => (
                      <tr
                        key={trip.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => { setSelectedTrip(trip); setShowTripDetails(true); }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isInterIsland ? (
                              <Ship className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Truck className="w-4 h-4 text-gray-400" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{trip.vehicleName}</div>
                              <div className="text-xs text-gray-500">
                                {isInterIsland ? (trip.destinations[0] || trip.tripNumber) : (trip.driverName || '—')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 max-w-[14rem] truncate" title={trip.customerLabel ?? trip.destinations[0] ?? '—'}>
                            {trip.customerLabel ?? trip.destinations[0] ?? '—'}
                          </div>
                          {trip.orderNumbers && trip.orderNumbers.length > 0 && (
                            <div className="text-xs text-gray-500 truncate max-w-[14rem]" title={trip.orderNumbers.join(', ')}>
                              {trip.orderNumbers.length === 1
                                ? trip.orderNumbers[0]
                                : `${trip.orderNumbers[0]} +${trip.orderNumbers.length - 1}`}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatTripScheduleDate(trip)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{trip.orders.length} order{trip.orders.length !== 1 ? 's' : ''}</div>
                          <div className="text-xs text-gray-500">{trip.capacityUsed}% full</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={getStatusColor(lowestOrderStatus(trip.id, trip.status))}
                            className="min-w-[120px] justify-center"
                          >
                            {lowestOrderStatus(trip.id, trip.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-200">
                {filteredTrips.length === 0 && (
                  <div className="p-8 text-center text-sm text-gray-500">
                    {dispatchQueueEmptyMessage}
                  </div>
                )}
                {pagedDispatchTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-4 space-y-3 w-full cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    onClick={() => { setSelectedTrip(trip); setShowTripDetails(true); }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 break-words">{trip.vehicleName}</p>
                        <p className="text-xs text-gray-500 mt-1 break-words">
                          {trip.customerLabel ?? trip.destinations[0] ?? '—'} • {trip.orders.length} order{trip.orders.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(lowestOrderStatus(trip.id, trip.status))} className="flex-shrink-0">
                        {lowestOrderStatus(trip.id, trip.status)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Customer</p>
                        <p className="text-gray-900 break-words">{trip.customerLabel ?? trip.destinations[0] ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{isInterIsland ? 'Route' : 'Driver'}</p>
                        <p className="text-gray-900 break-words">
                          {isInterIsland ? (trip.destinations[0] || '—') : (trip.driverName || '—')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Schedule</p>
                        <p className="text-gray-900">{formatTripScheduleDate(trip)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Capacity</p>
                        <p className="text-gray-900">{trip.capacityUsed}% full</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filteredTrips.length > 0 && (
                <TablePagination
                  page={dispatchQueuePage}
                  total={filteredTrips.length}
                  onPageChange={setDispatchQueuePage}
                />
              )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <PortalModalOverlay
        open={dispatchPeriodModalOpen}
        onClose={() => setDispatchPeriodModalOpen(false)}
        mobileBottomSheet
      >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dispatch-period-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="dispatch-period-modal-title" className="text-lg font-semibold text-gray-900">
                Schedule period
              </h2>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
                onClick={() => setDispatchPeriodModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Filter dispatch queue by trip scheduled date. Search, status, and Show Completed apply to the queue only. The 14-day calendar shows all trips on those dates, including completed and upcoming.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DATE_PERIOD_OPTIONS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleDispatchModalPresetPick(kind)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      draftDispatchPeriodKind === kind
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draftDispatchPeriodKind === 'custom' && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                    <input
                      type="date"
                      value={draftDispatchCustomStart}
                      max={maxDispatchCustomDate}
                      onChange={(e) => setDraftDispatchCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftDispatchCustomEnd}
                      min={draftDispatchCustomStart || undefined}
                      max={maxDispatchCustomDate}
                      onChange={(e) => setDraftDispatchCustomEnd(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {draftDispatchCustomInvalid && (
                    <p className="text-xs text-red-600">Start must be on or before end.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 bg-white"
                onClick={() => setDispatchPeriodModalOpen(false)}
              >
                Cancel
              </Button>
              {draftDispatchPeriodKind === 'custom' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={draftDispatchCustomInvalid}
                  onClick={applyDispatchModalCustomRange}
                >
                  Apply range
                </Button>
              )}
            </div>
          </div>
      </PortalModalOverlay>

      {/* FLEET MANAGEMENT VIEW */}
      {viewMode === 'fleet' && (transportType === 'truck' || isInterIsland) && (
        <div className="space-y-6">
          {fleetError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Unable to load {isInterIsland ? 'containers' : 'trucks'} for this branch. Please try again in a moment.
            </div>
          )}
          {fleetLoading && (
            <p className="text-sm text-gray-500">Loading fleet for this branch…</p>
          )}
          {!fleetLoading && !fleetError && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fleet Overview */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{isInterIsland ? 'Shipping container fleet' : 'Truck fleet'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {fleetList.length === 0 ? (
                    <div className="py-12 px-4 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                        {isInterIsland ? <Ship className="h-7 w-7" aria-hidden /> : <Truck className="h-7 w-7" aria-hidden />}
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {isInterIsland ? 'No containers yet' : 'No trucks yet'}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                        {isInterIsland
                          ? 'Add shipping containers with capacity and dimensions, then group ship-delivery orders into scheduled shipments.'
                          : 'This branch does not have any trucks in the fleet. Add one to start scheduling deliveries and route planning.'}
                      </p>
                      <Button
                        type="button"
                        variant="primary"
                        className="mt-6 bg-red-600 hover:bg-red-700"
                        onClick={openCreateTruckModal}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add {isInterIsland ? 'container' : 'truck'}
                      </Button>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fleetList.map((vehicle) => (
                      <Link
                        key={vehicle.id}
                        to={`/logistics/${vehicle.id}`}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow w-full max-w-full block no-underline text-inherit focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        title={isInterIsland ? 'View container details' : 'View truck details'}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg ${
                              vehicle.status === 'Available' ? 'bg-green-100' :
                              vehicle.status === 'On Trip' ? 'bg-blue-100' :
                              vehicle.status === 'Loading' ? 'bg-yellow-100' :
                              'bg-red-100'
                            }`}>
                              {getVehicleStatusIcon(vehicle.status)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 break-words">{vehicle.vehicleName}</div>
                              <div className="text-xs text-gray-500 break-words">{vehicle.vehicleId}</div>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(vehicle.status)} className="text-xs flex-shrink-0">
                            {vehicle.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Type:</span>
                            <span className="text-gray-900 font-medium">{vehicle.type}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Utilization:</span>
                            <span className="text-gray-900 font-medium">{vehicle.utilizationPercent}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Trips Today:</span>
                            <span className="text-gray-900 font-medium">{vehicle.tripsToday}</span>
                          </div>
                          {vehicle.currentTrip && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Current Trip:</span>
                              <span className="text-blue-600 font-medium text-xs break-words text-right">{vehicle.currentTrip}</span>
                            </div>
                          )}
                          {vehicle.nextAvailableTime && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Available at:</span>
                              <span className="text-gray-900 font-medium text-xs break-words text-right">{vehicle.nextAvailableTime}</span>
                            </div>
                          )}
                          {vehicle.maintenanceDue && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Maintenance:</span>
                              <span className="text-orange-600 font-medium text-xs break-words text-right">{vehicle.maintenanceDue}</span>
                            </div>
                          )}
                        </div>

                        {vehicle.alerts && vehicle.alerts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-2">Notes</p>
                            {vehicle.alerts.map((line, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-orange-600">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="break-words">{line}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Fleet Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{isInterIsland ? 'Container statistics' : 'Fleet Statistics'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Total {isInterIsland ? 'Containers' : 'Vehicles'}</span>
                      <span className="text-gray-900 font-bold">{fleetList.length}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: fleetList.length > 0 ? '100%' : '0%' }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Available</span>
                      <span className="text-green-600 font-bold">
                        {fleetList.filter(v => v.status === 'Available').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600"
                        style={{ width: `${(fleetList.filter(v => v.status === 'Available').length / fleetStatsCount) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">On Trip</span>
                      <span className="text-blue-600 font-bold">
                        {fleetList.filter(v => v.status === 'On Trip').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${(fleetList.filter(v => v.status === 'On Trip').length / fleetStatsCount) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Maintenance</span>
                      <span className="text-red-600 font-bold">
                        {fleetList.filter(v => v.status === 'Maintenance' || v.status === 'Out of Service').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600"
                        style={{ width: `${(fleetList.filter(v => v.status === 'Maintenance' || v.status === 'Out of Service').length / fleetStatsCount) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Avg. Utilization</span>
                      <span className="text-gray-900 font-bold">
                        {Math.round(fleetList.reduce((sum, v) => sum + v.utilizationPercent, 0) / fleetStatsCount)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-600"
                        style={{ width: `${Math.round(fleetList.reduce((sum, v) => sum + v.utilizationPercent, 0) / fleetStatsCount)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={openCreateTruckModal}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New {isInterIsland ? 'Container' : 'Vehicle'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={exportingFleet || fleetLoading || !branch?.trim()}
                    onClick={() => void handleExportFleetReport()}
                  >
                    {exportingFleet ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {exportingFleet ? 'Exporting…' : 'Export Fleet Report'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ROUTE PLANNING VIEW — trucks only */}
      {viewMode === 'routes' && transportType === 'truck' && (
        <RoutePlanningView
          ordersReady={ordersReady}
          ordersLoading={ordersLoading}
          vehicles={fleetTrucks.length > 0 ? fleetTrucks : vehicles}
          existingTrips={trips}
          drivers={planningDrivers}
          initialSelectedOrderIds={routePlanningPrefill.orderIds}
          initialTripDate={routePlanningPrefill.tripDate}
          originLat={branchHq?.lat}
          originLng={branchHq?.lng}
          originTitle={branch?.trim() ? `${branch} (depot)` : 'Depot / branch'}
          onCreateTrip={async (selectedOrderIds, vehicleId, scheduledDates, driverId) => {
            if (!branch?.trim()) {
              window.alert('Select a branch in the header.');
              return undefined;
            }
            const picked = ordersReady.filter((o) => selectedOrderIds.includes(o.id));
            const totalWeight = picked.reduce((s, o) => s + o.weight, 0);
            const totalVolume = picked.reduce((s, o) => s + o.volume, 0);
            const driverRecord = driverId ? planningDrivers.find((d) => d.id === driverId) : null;
            const res = await createTripFromPlanning({
              branchName: branch,
              vehicleUuid: vehicleId,
              orderUuids: selectedOrderIds,
              scheduledDates,
              totalWeightKg: totalWeight,
              totalVolumeCbm: totalVolume,
              driverUuid: driverId ?? null,
              driverName: driverRecord?.name ?? null,
              scheduledBy: employeeName?.trim() || null,
            });
            if (!res.ok) {
              window.alert(res.error ?? 'Could not create trip');
              return undefined;
            }
            void refreshLogistics();
            void loadFleet();
            const vehicleList = fleetTrucks.length > 0 ? fleetTrucks : vehicles;
            const v = vehicleList.find((x) => x.id === vehicleId);
            const sorted = [...new Set(scheduledDates.map((d) => d.trim().slice(0, 10)).filter(Boolean))].sort();
            const start = sorted[0] ?? '';
            const end = sorted.length > 1 ? sorted[sorted.length - 1] : undefined;
            return {
              tripNumber: res.tripNumber ?? 'New trip',
              scheduledDate: start,
              scheduledEndDate: end !== start ? end : undefined,
              orderCount: selectedOrderIds.length,
              vehicleName: v?.vehicleName?.trim() ? v.vehicleName : 'Selected truck',
            };
          }}
        />
      )}

      {/* Trip Details Modal */}
      {selectedTrip && (
        <TripDetailsModal
          isOpen={showTripDetails}
          onClose={() => {
            setShowTripDetails(false);
            setSelectedTrip(null);
          }}
          trip={selectedTrip}
          onEdit={() => {
            setShowTripDetails(false);
            setShowEditTrip(true);
          }}
          onOrderStatusChange={(tripId, orderId, newStatus) => {
            const RANK: Record<string, number> = { Scheduled: 1, Loading: 2, Packed: 3, Ready: 4, 'In Transit': 5, Delivered: 6, Complete: 7, Delayed: 8, Cancelled: 9 };
            setTripOrderStatusMap((prev) => {
              const updated = {
                ...prev,
                [tripId]: { ...(prev[tripId] ?? {}), [orderId]: newStatus },
              };
              const statuses = Object.values(updated[tripId] ?? {}) as string[];
              let lowestRank = Infinity; let lowestSt = newStatus;
              for (const st of statuses) {
                const r = RANK[st] ?? 99;
                if (r < lowestRank) { lowestRank = r; lowestSt = st; }
              }
              setTripLowestOrderStatus((s) => ({ ...s, [tripId]: lowestSt }));
              return updated;
            });
          }}
          onTripStatusChange={(tripId, newStatus, extra) => {
            setScheduleTrips((prev) => prev.map((t) =>
              t.id === tripId
                ? {
                    ...t,
                    status: newStatus as Trip['status'],
                    ...(extra?.delayReason != null ? { delayReason: extra.delayReason } : {}),
                  }
                : t
            ));
            if (selectedTrip?.id === tripId) {
              setSelectedTrip((t) =>
                t
                  ? {
                      ...t,
                      status: newStatus as Trip['status'],
                      ...(extra?.delayReason != null ? { delayReason: extra.delayReason } : {}),
                    }
                  : t
              );
            }
            // Sync vehicle status with trip lifecycle
            const trip = selectedTrip?.id === tripId ? selectedTrip : scheduleTrips.find((t) => t.id === tripId);
            if (trip?.vehicleId) {
              if (newStatus === 'In Transit' || newStatus === 'Loading') {
                syncVehicleOnTripStart({ vehicleId: trip.vehicleId, tripId }).then(() => loadFleet());
              } else if (newStatus === 'Complete' || newStatus === 'Delivered' || newStatus === 'Cancelled') {
                syncVehicleOnTripComplete(
                  {
                    vehicleId: trip.vehicleId,
                    tripId,
                    tripNumber: trip.tripNumber,
                    driverName: trip.driverName ?? '',
                    scheduledDate: trip.scheduledDate,
                    destinations: trip.destinations ?? [],
                    ordersCount: trip.orderIds?.length ?? 0,
                    capacityUsedPercent: trip.capacityUsed ?? 0,
                    branchId: branch ?? '',
                  },
                  newStatus,
                ).then(() => loadFleet());
              }
            }
          }}
        />
      )}

      {/* Edit Trip Modal */}
      {selectedTrip && (
        <EditTripModal
          isOpen={showEditTrip}
          onClose={() => {
            setShowEditTrip(false);
            setSelectedTrip(null);
          }}
          trip={selectedTrip}
          drivers={planningDrivers}
          vehicles={fleetTrucks}
          availableOrders={planningOrders}
          onSave={async (params) => {
            const tripId = selectedTrip.id;
            const result = await updateTrip({
              tripId,
              ...params,
              scheduledBy: employeeName?.trim() || null,
            });
            if (!result.ok) throw new Error(result.error ?? 'Failed to save trip');
            setShowEditTrip(false);
            await refreshLogistics();
            const { trip: freshTrip } = await fetchTripById(tripId);
            if (freshTrip) {
              setSelectedTrip(freshTrip);
              setShowTripDetails(true);
            } else {
              setSelectedTrip(null);
            }
          }}
        />
      )}

      {/* Calendar Trip Detail Modal — replaced by TripDetailsModal */}
      {selectedCalendarTrip && (() => {
        // Immediately open the full TripDetailsModal and clear this state
        setSelectedTrip(selectedCalendarTrip);
        setShowTripDetails(true);
        setSelectedCalendarTrip(null);
        return null;
      })()}
      <TruckFormModal
        key={`${truckFormMode}-${truckFormEditId ?? 'new'}`}
        isOpen={truckFormOpen}
        onClose={() => setTruckFormOpen(false)}
        mode={truckFormMode}
        branchName={branch}
        vehicleUuid={truckFormEditId}
        onSaved={() => loadFleet()}
        fleetKind={isInterIsland ? 'container' : 'truck'}
      />

      {/* ── 14-day Strip: Day Detail Modal ────────────────────── */}
      {stripDetailDateKey && (() => {
        const [y, mo, d] = stripDetailDateKey.split('-').map(Number);
        const dateLabel = new Date(y, mo - 1, d).toLocaleDateString('en-PH', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        const dayTrips = dispatchCalByDateKey[stripDetailDateKey] ?? [];

        // Single trip → skip the picker and open TripDetailsModal directly
        if (dayTrips.length === 1) {
          setSelectedTrip(dayTrips[0]);
          setShowTripDetails(true);
          setStripDetailDateKey(null);
          return null;
        }

        return (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setStripDetailDateKey(null)}
          >
            <div
              className="bg-white rounded-xl shadow-xl w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-3">
                <h3 className="font-bold text-gray-900 text-base">{dateLabel}</h3>
                <button
                  type="button"
                  onClick={() => setStripDetailDateKey(null)}
                  className="text-gray-400 hover:text-gray-600 shrink-0 p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2">
                {dayTrips.map((trip) => {
                  const colors = getVehicleColor(trip.vehicleId);
                  return (
                    <button
                      key={trip.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      onClick={() => {
                        setSelectedTrip(trip);
                        setShowTripDetails(true);
                        setStripDetailDateKey(null);
                      }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: colors.bg }}>
                        {isInterIsland ? (
                          <Ship className="w-4 h-4" style={{ color: colors.text }} />
                        ) : (
                          <Truck className="w-4 h-4" style={{ color: colors.text }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{trip.tripNumber}</p>
                        <p className="text-xs text-gray-500 truncate">{tripSubline(trip, isInterIsland)}</p>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border shrink-0 ${
                        tripStatusIsCompletedUi(trip.status)  ? 'bg-green-100 text-green-800 border-green-300' :
                        trip.status === 'In Transit' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        trip.status === 'Loading'    ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        trip.status === 'Delayed'    ? 'bg-red-100 text-red-800 border-red-300' :
                                                       'bg-gray-100 text-gray-800 border-gray-300'
                      }`}>
                        {tripStatusDisplay(trip.status)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Full Dispatch Calendar Modal ───────────────────────── */}
      {dispatchCalOpen && (() => {
        const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const todayKey = localYmd(new Date());

        // Build month grid
        const firstDay = new Date(dispatchCalYear, dispatchCalMonth, 1);
        const lastDay = new Date(dispatchCalYear, dispatchCalMonth + 1, 0);
        const cells: (Date | null)[] = [];
        for (let i = 0; i < firstDay.getDay(); i++) cells.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(dispatchCalYear, dispatchCalMonth, d));

        const shiftMonth = (delta: number) => {
          const d = new Date(dispatchCalYear, dispatchCalMonth + delta, 1);
          setDispatchCalYear(d.getFullYear());
          setDispatchCalMonth(d.getMonth());
        };

        const selectedTrips = dispatchCalSelectedKey ? (dispatchCalByDateKey[dispatchCalSelectedKey] ?? []) : [];

        return (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDispatchCalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="dispatch-cal-title"
              className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-gray-200">
                <div>
                  <h2 id="dispatch-cal-title" className="text-lg md:text-xl font-bold text-gray-900">
                    {isInterIsland ? 'Shipment Calendar' : 'Dispatch Calendar'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    All scheduled {isInterIsland ? 'shipments' : 'trips'}{branch ? ` · ${branch}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void refreshLogistics()}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchCalOpen(false)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
                {/* Nav + legend */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => shiftMonth(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Previous month">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <select value={dispatchCalMonth} onChange={(e) => setDispatchCalMonth(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {MONTH_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                    </select>
                    <input
                      type="number"
                      value={dispatchCalYear}
                      onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== '' && Number.isFinite(n)) setDispatchCalYear(Math.trunc(n)); }}
                      className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      aria-label="Year"
                    />
                    <button type="button" onClick={() => shiftMonth(1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Next month">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                    {(['Scheduled','Loading','Packed','Ready','In Transit','Delayed','Delivered','Complete','Cancelled'] as Trip['status'][]).map((s) => (
                      <span key={s} className="inline-flex items-center gap-1">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          s === 'Delivered' || s === 'Complete' ? 'bg-green-500' :
                          s === 'In Transit' ? 'bg-blue-500' :
                          s === 'Loading' || s === 'Packed' || s === 'Ready' ? 'bg-amber-500' :
                          s === 'Delayed' ? 'bg-red-500' :
                          s === 'Cancelled' ? 'bg-gray-500' : 'bg-gray-400'
                        }`} />
                        {s === 'Complete' ? 'Completed' : s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {DAY_NAMES.map((d) => <div key={d} className="py-2">{d}</div>)}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((cell, idx) => {
                    if (!cell) return <div key={`pad-${idx}`} className="min-h-[4.5rem] rounded-lg bg-gray-50/50" />;
                    const cellKey = localYmd(cell);
                    const isToday = cellKey === todayKey;
                    const isSelected = cellKey === dispatchCalSelectedKey;
                    const dayTrips = dispatchCalByDateKey[cellKey] ?? [];
                    const shown = dayTrips.slice(0, 2);
                    const overflow = dayTrips.length - shown.length;

                    return (
                      <button
                        key={cellKey}
                        type="button"
                        onClick={() => setDispatchCalSelectedKey(cellKey === dispatchCalSelectedKey ? null : cellKey)}
                        className={`min-h-[4.5rem] rounded-lg border p-1.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/60'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/20'
                        }`}
                      >
                        <div className={`text-sm font-semibold mb-0.5 ${isToday ? 'text-red-600' : 'text-gray-900'}`}>
                          {cell.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {shown.map((trip) => {
                            const chipColor =
                              tripStatusIsCompletedUi(trip.status) ? 'bg-green-600 text-white' :
                              trip.status === 'In Transit' ? 'bg-blue-600 text-white' :
                              trip.status === 'Loading' ? 'bg-amber-500 text-white' :
                              trip.status === 'Delayed' ? 'bg-red-500 text-white' :
                              'bg-gray-500 text-white';
                            return (
                              <div
                                key={trip.id}
                                className={`truncate rounded px-0.5 py-0.5 text-[10px] leading-tight font-medium ${chipColor}`}
                                title={`${trip.tripNumber} · ${tripSubline(trip, isInterIsland)}`}
                              >
                                {trip.vehicleName}
                              </div>
                            );
                          })}
                          {overflow > 0 && (
                            <div className="text-[10px] text-gray-500 font-medium text-center">+{overflow}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected date detail panel */}
                {dispatchCalSelectedKey && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      {(() => {
                        const [y, mo, d] = dispatchCalSelectedKey.split('-').map(Number);
                        return new Date(y, mo - 1, d).toLocaleDateString('en-PH', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        });
                      })()}
                    </h3>
                    {selectedTrips.length === 0 ? (
                      <p className="text-sm text-gray-500">No trips scheduled on this date.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {selectedTrips.map((trip) => {
                          const colors = getVehicleColor(trip.vehicleId);
                          return (
                            <li key={trip.id}>
                              <button
                                type="button"
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                                onClick={() => {
                                  setSelectedTrip(trip);
                                  setShowTripDetails(true);
                                  setDispatchCalOpen(false);
                                }}
                              >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: colors.bg }}>
                                  <Truck className="w-4 h-4" style={{ color: colors.text }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-gray-900 text-sm">{trip.tripNumber}</p>
                                  <p className="text-xs text-gray-500 truncate">{tripSubline(trip, isInterIsland)}</p>
                                </div>
                                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border shrink-0 ${
                                  tripStatusIsCompletedUi(trip.status)  ? 'bg-green-100 text-green-800 border-green-300' :
                                  trip.status === 'In Transit' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                  trip.status === 'Loading'    ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                  trip.status === 'Delayed'    ? 'bg-red-100 text-red-800 border-red-300' :
                                                                  'bg-gray-100 text-gray-800 border-gray-300'
                                }`}>
                                  {tripStatusDisplay(trip.status)}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 bg-gray-50 px-4 md:px-5 py-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDispatchCalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
