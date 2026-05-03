import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
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
  Plane,
  Globe,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import {
  getTripsByBranch,
  getVehiclesByBranch,
  getDeliveriesByBranch,
  getOrdersReadyByBranch,
  getShipmentsByBranch,
} from '@/src/mock/logisticsDashboard';
import {
  fetchLogisticsOrderQueue,
  fetchTripsForBranch,
  createTripFromPlanning,
  fetchDriversForBranch,
  fetchBranchHqCoords,
  updateTrip,
} from '@/src/lib/logisticsScheduling';
import { RoutePlanningView } from '@/src/components/logistics/RoutePlanningView';
import { TripDetailsModal } from '@/src/components/logistics/TripDetailsModal';
import { EditTripModal } from '@/src/components/logistics/EditTripModal';
import { Vehicle, Trip, OrderReadyForDispatch } from '@/src/types/logistics';
import { fetchFleetTrucksForBranch, syncVehicleOnTripStart, syncVehicleOnTripComplete } from '@/src/lib/fleetTrucks';
import { TruckFormModal } from '@/src/components/logistics/TruckFormModal';
import { supabase } from '@/src/lib/supabase';
import {
  localYmd,
  DISPATCH_QUEUE_STATUS_OPTIONS,
  dispatchQueueStatusSelectClass,
  tripStatusDisplay,
  tripStatusIsCompletedUi,
  getDispatchVehicleColor,
} from '@/src/lib/dispatchQueueUi';

type ViewMode = 'dispatch' | 'fleet' | 'routes' | 'shipments';
type TransportType = 'truck' | 'interisland';

export function LogisticsPage() {
  const { branch } = useAppContext();
  const { search } = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    new URLSearchParams(search).get('tab') === 'routes' ? 'routes' : 'dispatch',
  );

  useEffect(() => {
    if (new URLSearchParams(search).get('tab') === 'routes') setViewMode('routes');
  }, [search]);
  const [transportType, setTransportType] = useState<TransportType>('truck');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [showCompleted, setShowCompleted] = useState(false);
  const [tripSortKey, setTripSortKey] = useState<string>('scheduledDate');
  const [tripSortDir, setTripSortDir] = useState<'asc' | 'desc'>('asc');
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
  const [truckFormOpen, setTruckFormOpen] = useState(false);
  const [truckFormMode, setTruckFormMode] = useState<'create' | 'edit'>('create');
  const [truckFormEditId, setTruckFormEditId] = useState<string | null>(null);
  const [scheduleTrips, setScheduleTrips] = useState<Trip[]>([]);
  const [planningOrders, setPlanningOrders] = useState<OrderReadyForDispatch[]>([]);
  const [logisticsFromDb, setLogisticsFromDb] = useState(false);
  const [branchHq, setBranchHq] = useState<{ lat: number; lng: number } | null>(null);

  const [planningDrivers, setPlanningDrivers] = useState<import('@/src/types/logistics').DriverOption[]>([]);
  // Lowest order dispatch-stage per trip (for the dispatch table badge)
  const [tripLowestOrderStatus, setTripLowestOrderStatus] = useState<Record<string, string>>({});
  // Full per-trip order status map — used for real-time badge updates
  const [tripOrderStatusMap, setTripOrderStatusMap] = useState<Record<string, Record<string, string>>>({});
  /** Prefer trip-level Delayed so reporting a delay is not hidden by orders still marked In Transit. */
  const lowestOrderStatus = (tripId: string, tripStatus: string) => {
    if (tripStatus === 'Delayed') return 'Delayed';
    return tripLowestOrderStatus[tripId] ?? tripStatus;
  };

  const routePlanningPrefill = useMemo(() => {
    const q = new URLSearchParams(search);
    const oid = q.get('order')?.trim();
    const ds = q.get('date')?.trim().slice(0, 10) ?? '';
    return {
      orderIds: oid ? [oid] : undefined as string[] | undefined,
      tripDate: /^\d{4}-\d{2}-\d{2}$/.test(ds) ? ds : undefined as string | undefined,
    };
  }, [search]);

  const refreshLogistics = useCallback(async () => {
    if (!branch?.trim()) {
      setScheduleTrips([]);
      setPlanningOrders([]);
      setLogisticsFromDb(false);
      return;
    }
    const [oq, tq] = await Promise.all([fetchLogisticsOrderQueue(branch), fetchTripsForBranch(branch)]);
    if (oq.error || tq.error) {
      setPlanningOrders(getOrdersReadyByBranch(branch));
      setScheduleTrips(getTripsByBranch(branch));
      setLogisticsFromDb(false);
    } else {
      setPlanningOrders(oq.orders);
      setScheduleTrips(tq.trips);
      setLogisticsFromDb(true);
      // Fetch order statuses for all trips to show lowest-stage badge in dispatch table
      const allOrderIds = [...new Set(tq.trips.flatMap((t) => t.orders))];
      if (allOrderIds.length) {
        const { data: orderRows } = await supabase
          .from('orders')
          .select('id, status')
          .in('id', allOrderIds);
        const statusMap: Record<string, string> = {};
        for (const row of orderRows ?? []) statusMap[row.id as string] = (row.status as string) ?? 'Scheduled';
        const RANK: Record<string, number> = { Scheduled: 1, Loading: 2, Packed: 3, Ready: 4, 'In Transit': 5, Delivered: 6, Complete: 7, Delayed: 8, Cancelled: 9 };
        const lowest: Record<string, string> = {};
        const perTripMap: Record<string, Record<string, string>> = {};
        for (const trip of tq.trips) {
          if (!trip.orders.length) continue;
          let lowestRank = Infinity; let lowestSt: string = trip.status;
          perTripMap[trip.id] = {};
          for (const oid of trip.orders) {
            const st = statusMap[oid] ?? 'Scheduled';
            perTripMap[trip.id][oid] = st;
            const rank = RANK[st] ?? 99;
            if (rank < lowestRank) { lowestRank = rank; lowestSt = st; }
          }
          lowest[trip.id] = lowestSt;
        }
        setTripLowestOrderStatus(lowest);
        setTripOrderStatusMap(perTripMap);
      }
    }
  }, [branch]);

  const loadFleet = useCallback(async () => {
    if (!branch?.trim()) {
      setFleetTrucks([]);
      setFleetError(null);
      return;
    }
    setFleetLoading(true);
    setFleetError(null);
    const { vehicles, error } = await fetchFleetTrucksForBranch(branch);
    setFleetLoading(false);
    if (error) {
      setFleetError(error);
      setFleetTrucks([]);
      return;
    }
    setFleetTrucks(vehicles);
  }, [branch]);

  const loadDrivers = useCallback(async () => {
    if (!branch?.trim()) { setPlanningDrivers([]); return; }
    const { drivers } = await fetchDriversForBranch(branch);
    setPlanningDrivers(drivers);
  }, [branch]);

  useEffect(() => { loadFleet(); }, [loadFleet]);
  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  useEffect(() => {
    refreshLogistics();
  }, [refreshLogistics]);

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
  const ordersReady = logisticsFromDb ? planningOrders : getOrdersReadyByBranch(branch ?? '');
  const shipments = getShipmentsByBranch(branch ?? '');
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
      if (!t.scheduledDate) continue;
      if (!m[t.scheduledDate]) m[t.scheduledDate] = [];
      m[t.scheduledDate].push(t);
    }
    return m;
  }, [trips]);

  // Sort + filter helpers
  const handleTripSort = (key: string) => {
    if (tripSortKey === key) setTripSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setTripSortKey(key); setTripSortDir('asc'); }
  };
  const tripSortIcon = (col: string) => {
    if (tripSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return tripSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-red-600 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 text-red-600 inline" />;
  };

  // Filter trips
  const filteredTrips = useMemo(() => {
    const filtered = trips.filter(trip => {
      const matchesSearch = trip.tripNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           trip.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           trip.destinations.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === 'All'
        ? (showCompleted || (trip.status !== 'Complete' && trip.status !== 'Delivered' && trip.status !== 'Cancelled'))
        : trip.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
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
        case 'scheduledDate':
          av = a.departureTime || a.scheduledDate || '';
          bv = b.departureTime || b.scheduledDate || '';
          break;
        case 'orders':
          av = a.orders.length;
          bv = b.orders.length;
          break;
        case 'status':
          av = lowestOrderStatus(a.id, a.status);
          bv = lowestOrderStatus(b.id, b.status);
          break;
        default:
          av = a.scheduledDate || '';
          bv = b.scheduledDate || '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return tripSortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av); const bs = String(bv);
      if (as < bs) return tripSortDir === 'asc' ? -1 : 1;
      if (as > bs) return tripSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [trips, searchQuery, filterStatus, showCompleted, tripSortKey, tripSortDir, tripLowestOrderStatus]);

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

  const viewModeTabs = [
    { id: 'dispatch' as ViewMode, label: 'Schedule & Tracking', icon: <Calendar className="w-4 h-4" /> },
    { id: 'fleet' as ViewMode, label: 'Fleet Management', icon: <Truck className="w-4 h-4" /> },
    { id: 'routes' as ViewMode, label: 'Route Planning', icon: <Route className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="w-full max-w-full">
        <h1 className="text-2xl font-bold text-gray-900">Logistics Management</h1>
      </div>

      {/* Transport Type Toggle */}
      <div className="flex items-start">
        <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-gray-50">
          <button
            onClick={() => setTransportType('truck')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
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
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 md:gap-4 w-full max-w-full">
                <div className="w-full lg:flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={transportType === 'truck' 
                      ? "Search by trip ID or driver..." 
                      : "Search by Shipment ID, Captain, or Port..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                {transportType !== 'truck' && (
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full lg:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Loading">Loading</option>
                  <option value="Packed">Packed</option>
                  <option value="Ready">Ready</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Complete">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                )}
                <Button variant="outline" className="w-full lg:w-auto justify-center">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                </Button>
                <Button variant="outline" className="w-full lg:w-auto justify-center">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <Card className="w-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      {transportType === 'truck' ? 'Active Trips' : 'Active Shipments'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {transportType === 'truck' 
                        ? trips.filter(t => t.status === 'In Transit' || t.status === 'Loading').length
                        : shipments.filter(s => s.status === 'In Transit' || s.status === 'Preparing').length}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${transportType === 'truck' ? 'bg-blue-100' : 'bg-cyan-100'}`}>
                    {transportType === 'truck' ? (
                      <Truck className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Ship className="w-6 h-6 text-cyan-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Orders Ready</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{ordersReady.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Available Trucks</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {vehiclesForStats.filter((v) => v.status === 'Available').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Delayed</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {trips.filter(t => t.status === 'Delayed').length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Calendar - Only for Truck Transport */}
          {transportType === 'truck' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <CardTitle>Dispatch Schedule (14 Days)</CardTitle>
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
                    filteredTrips.forEach((trip) => {
                      const dateKey = trip.scheduledDate;
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
                                    title={`${trip.tripNumber} - ${trip.vehicleName} (${trip.driverName})`}
                                  >
                                    <div className="flex items-center gap-1">
                                      <Truck className="w-3 h-3 flex-shrink-0" style={{ color: colors.text }} />
                                      <span className="font-medium truncate flex-1" style={{ color: colors.text }}>
                                        {trip.vehicleName}
                                      </span>
                                    </div>
                                    <div className="truncate text-[10px] mt-0.5" style={{ color: colors.text, opacity: 0.8 }}>
                                      {trip.driverName}
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
              <CardTitle>{transportType === 'truck' ? 'Dispatch Queue' : 'Shipment Queue'}</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                {transportType === 'truck' && (
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
            <CardContent className="p-0">
              {transportType === 'truck' ? (
                /* TRUCK DISPATCH TABLE */
                <>
                <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        onClick={() => handleTripSort('vehicleName')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Vehicle & Driver{tripSortIcon('vehicleName')}</span>
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
                    {filteredTrips.map((trip) => (
                      <tr
                        key={trip.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => { setSelectedTrip(trip); setShowTripDetails(true); }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{trip.vehicleName}</div>
                              <div className="text-xs text-gray-500">{trip.driverName || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{trip.departureTime || trip.scheduledDate}</div>
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
                {filteredTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-4 space-y-3 w-full cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    onClick={() => { setSelectedTrip(trip); setShowTripDetails(true); }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 break-words">{trip.vehicleName}</p>
                        <p className="text-xs text-gray-500 mt-1 break-words">
                          {trip.orders.length} order{trip.orders.length !== 1 ? 's' : ''} • {trip.driverName || '—'}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(lowestOrderStatus(trip.id, trip.status))} className="flex-shrink-0">
                        {lowestOrderStatus(trip.id, trip.status)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Driver</p>
                        <p className="text-gray-900 break-words">{trip.driverName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Schedule</p>
                        <p className="text-gray-900">{trip.departureTime || trip.scheduledDate}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Capacity</p>
                        <p className="text-gray-900">{trip.capacityUsed}% full</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
                </>
              ) : (
                /* INTER-ISLAND SHIPMENTS TABLE */
                <>
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shipment Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vessel & Captain
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Schedule
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cargo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shipments.map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${
                                shipment.status === 'In Transit' ? 'bg-blue-100' :
                                shipment.status === 'Arrived' ? 'bg-green-100' :
                                shipment.status === 'Delayed' ? 'bg-red-100' :
                                'bg-gray-100'
                              }`}>
                                {shipment.type === 'Sea Freight' ? (
                                  <Ship className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Plane className="w-4 h-4 text-purple-600" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{shipment.shipmentNumber}</div>
                                <div className="text-xs text-gray-500">{shipment.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Ship className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{shipment.carrier || 'Carrier TBD'}</div>
                                <div className="text-xs text-gray-500">{shipment.trackingNumber || 'No tracking'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-900">
                                  {shipment.port} → {shipment.destination}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{shipment.departureDate}</div>
                            <div className="text-xs text-gray-500">ETA: {shipment.eta}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{shipment.orders.length} orders</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={getStatusColor(shipment.status)}>
                              {shipment.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="text-blue-600 hover:text-blue-800"
                                title="View Details"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                className="text-gray-600 hover:text-gray-800"
                                title="Track Shipment"
                              >
                                <Globe className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-200">
                  {shipments.map((shipment) => (
                    <div key={shipment.id} className="p-4 space-y-3 w-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 break-words">{shipment.shipmentNumber}</p>
                          <p className="text-xs text-gray-500 mt-1 break-words">
                            {shipment.orders.length} order{shipment.orders.length > 1 ? 's' : ''} • {shipment.type}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(shipment.status)} className="flex-shrink-0">
                          {shipment.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Carrier</p>
                          <p className="text-gray-900 break-words">{shipment.carrier || 'TBD'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Departure</p>
                          <p className="text-gray-900">{shipment.departureDate}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Route</p>
                          <p className="text-gray-900 break-words">{shipment.port} → {shipment.destination}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tracking</p>
                          <p className="text-gray-900 break-words">{shipment.trackingNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">ETA</p>
                          <p className="text-gray-900">{shipment.eta}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-center"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-center"
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          Track
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* FLEET MANAGEMENT VIEW */}
      {viewMode === 'fleet' && transportType === 'truck' && (
        <div className="space-y-6">
          {fleetError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Could not load fleet from the database ({fleetError}). Check migrations and that you are signed in.
            </div>
          )}
          {fleetLoading && (
            <p className="text-sm text-gray-500">Loading fleet for this branch…</p>
          )}
          {!fleetLoading && !fleetError && fleetList.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-gray-600 text-sm">
                No trucks found for this branch. Apply{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">database/fleet_trucks_extension.sql</code> and{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">database/seed_fleet_trucks.sql</code>.
              </CardContent>
            </Card>
          )}
          {fleetList.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fleet Overview */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Truck fleet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fleetList.map((vehicle) => (
                      <Link
                        key={vehicle.id}
                        to={`/logistics/${vehicle.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow w-full max-w-full block no-underline text-inherit focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        title="Open truck details in new tab"
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
                </CardContent>
              </Card>
            </div>

            {/* Fleet Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fleet Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Total Vehicles</span>
                      <span className="text-gray-900 font-bold">{fleetList.length}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: '100%' }}></div>
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
                    onClick={() => {
                      if (!branch?.trim()) {
                        window.alert('Select a branch in the header first.');
                        return;
                      }
                      setTruckFormMode('create');
                      setTruckFormEditId(null);
                      setTruckFormOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Vehicle
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Schedule Maintenance
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Fleet Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </div>
      )}

      {/* FLEET MANAGEMENT VIEW - INTER-ISLAND */}
      {viewMode === 'fleet' && transportType === 'interisland' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fleet Overview */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vessel Fleet Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {shipments.map((shipment) => (
                      <div key={shipment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow w-full max-w-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg ${
                              shipment.status === 'Arrived' ? 'bg-green-100' :
                              shipment.status === 'In Transit' ? 'bg-blue-100' :
                              shipment.status === 'Preparing' ? 'bg-yellow-100' :
                              'bg-red-100'
                            }`}>
                              {shipment.type === 'Sea Freight' ? (
                                <Ship className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Plane className="w-4 h-4 text-purple-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 break-words">{shipment.carrier || 'Carrier TBD'}</div>
                              <div className="text-xs text-gray-500 break-words">{shipment.shipmentNumber}</div>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(shipment.status)} className="text-xs flex-shrink-0">
                            {shipment.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Type:</span>
                            <span className="text-gray-900 font-medium">{shipment.type}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Route:</span>
                            <span className="text-gray-900 font-medium truncate">{shipment.port} → {shipment.destination}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Cargo:</span>
                            <span className="text-gray-900 font-medium">{shipment.orders.length} orders</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">ETA:</span>
                            <span className="text-gray-900 font-medium">{shipment.eta}</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                        >
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fleet Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vessel Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Total Vessels</span>
                      <span className="text-gray-900 font-bold">{shipments.length}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">In Transit</span>
                      <span className="text-gray-900 font-bold">
                        {shipments.filter(s => s.status === 'In Transit').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(shipments.filter(s => s.status === 'In Transit').length / shipments.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Preparing</span>
                      <span className="text-gray-900 font-bold">
                        {shipments.filter(s => s.status === 'Preparing').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full transition-all"
                        style={{ width: `${(shipments.filter(s => s.status === 'Preparing').length / shipments.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Arrived</span>
                      <span className="text-gray-900 font-bold">
                        {shipments.filter(s => s.status === 'Arrived').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(shipments.filter(s => s.status === 'Arrived').length / shipments.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Book New Shipment
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Globe className="w-4 h-4 mr-2" />
                    Track All Shipments
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Manifest
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ROUTE PLANNING VIEW */}
      {viewMode === 'routes' && (
        <RoutePlanningView
          ordersReady={ordersReady}
          vehicles={fleetTrucks.length > 0 ? fleetTrucks : vehicles}
          existingTrips={trips}
          drivers={planningDrivers}
          initialSelectedOrderIds={routePlanningPrefill.orderIds}
          initialTripDate={routePlanningPrefill.tripDate}
          originLat={branchHq?.lat}
          originLng={branchHq?.lng}
          originTitle={branch?.trim() ? `${branch} (depot)` : 'Depot / branch'}
          onCreateTrip={async (selectedOrderIds, vehicleId, scheduledDate, driverId) => {
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
              scheduledDate,
              totalWeightKg: totalWeight,
              totalVolumeCbm: totalVolume,
              driverUuid: driverId ?? null,
              driverName: driverRecord?.name ?? null,
            });
            if (!res.ok) {
              window.alert(res.error ?? 'Could not create trip');
              return undefined;
            }
            await refreshLogistics();
            loadFleet();
            const vehicleList = fleetTrucks.length > 0 ? fleetTrucks : vehicles;
            const v = vehicleList.find((x) => x.id === vehicleId);
            return {
              tripNumber: res.tripNumber ?? 'New trip',
              scheduledDate: scheduledDate.trim().slice(0, 10),
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
            const result = await updateTrip({ tripId: selectedTrip.id, ...params });
            if (!result.ok) throw new Error(result.error ?? 'Failed to save trip');
            setShowEditTrip(false);
            setSelectedTrip(null);
            refreshLogistics();
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
                        <Truck className="w-4 h-4" style={{ color: colors.text }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{trip.tripNumber}</p>
                        <p className="text-xs text-gray-500 truncate">{trip.vehicleName}{trip.driverName !== '—' ? ` · ${trip.driverName}` : ''}</p>
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
                    Dispatch Calendar
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    All scheduled trips{branch ? ` · ${branch}` : ''}
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
                                title={`${trip.tripNumber} · ${trip.vehicleName} · ${trip.driverName}`}
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
                                  <p className="text-xs text-gray-500 truncate">{trip.vehicleName}{trip.driverName !== '—' ? ` · ${trip.driverName}` : ''}</p>
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
