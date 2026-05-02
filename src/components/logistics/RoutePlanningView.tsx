import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import {
  MapPin,
  Package,
  Truck,
  AlertCircle,
  CheckCircle,
  Weight,
  Box,
  Clock,
  Loader2,
} from 'lucide-react';
import { OrderReadyForDispatch, Vehicle, Trip, DriverOption } from '@/src/types/logistics';
import { TripScheduleModal } from './TripScheduleModal';
import { RoutePlanningMap } from '@/src/components/maps/RoutePlanningMap';
import {
  fetchVehicleIdsWithMaintenanceOnDate,
  fetchMaintenanceScheduledDatesForVehicle,
  isFleetVehicleUuid,
} from '@/src/lib/fleetTrucks';
import {
  computeDrivingRoute,
  RouteResult,
  FUEL_COST_PER_KM_PHP,
  formatDuration,
} from '@/src/lib/routePlanning';

interface RoutePlanningViewProps {
  ordersReady: OrderReadyForDispatch[];
  vehicles: Vehicle[];
  /** Scheduled / active trips for this branch (truck + driver + date conflict checks). */
  existingTrips: Trip[];
  /** Truck drivers for this branch (employees with role Truck Driver). */
  drivers: DriverOption[];
  onCreateTrip: (selectedOrders: string[], vehicleId: string, scheduledDate: string, driverId: string | null) => void | Promise<void>;
  /** Deep link: pre-select orders already in `ordersReady` (order UUIDs). */
  initialSelectedOrderIds?: string[];
  /** Deep link: initial trip / departure date (YYYY-MM-DD). */
  initialTripDate?: string;
  /** Branch depot coordinates from company_settings (optional). */
  originLat?: number | null;
  originLng?: number | null;
  originTitle?: string;
}

const TRIP_CONFLICT_STATUSES = ['Pending', 'Scheduled', 'Loading', 'In Transit', 'Delayed'] as const;

const URGENCY_RANK: Record<OrderReadyForDispatch['urgency'], number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

function requiredDateSortKey(s: string): number {
  const t = s?.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return Number.MAX_SAFE_INTEGER;
  return new Date(`${t}T12:00:00`).getTime();
}

type UrgencyFilter = 'All' | OrderReadyForDispatch['urgency'];
type SortOption =
  | 'urgency_desc'
  | 'urgency_asc'
  | 'required_date'
  | 'order_number'
  | 'weight_desc'
  | 'volume_desc';

export const RoutePlanningView: React.FC<RoutePlanningViewProps> = ({
  ordersReady,
  vehicles,
  existingTrips,
  drivers,
  onCreateTrip,
  initialSelectedOrderIds,
  initialTripDate,
  originLat,
  originLng,
  originTitle,
}) => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [tripDateHint, setTripDateHint] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (initialTripDate && /^\d{4}-\d{2}-\d{2}$/.test(initialTripDate)) {
      setTripDateHint(initialTripDate);
    }
  }, [initialTripDate]);

  useEffect(() => {
    if (!initialSelectedOrderIds?.length) return;
    const ids = initialSelectedOrderIds.filter((oid) => ordersReady.some((o) => o.id === oid));
    if (ids.length) setSelectedOrders(ids);
  }, [initialSelectedOrderIds, ordersReady]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('All');
  const [sortBy, setSortBy] = useState<SortOption>('urgency_desc');
  /** Trucks with non-completed maintenance on `tripDateHint` (DB trucks / UUID only). */
  const [maintBlockedIdsForDate, setMaintBlockedIdsForDate] = useState<Set<string>>(new Set());
  /** Scheduled maintenance days for the currently selected truck. */
  const [selectedVehicleMaintDates, setSelectedVehicleMaintDates] = useState<string[]>([]);

  /** Real driving route from Google Maps DirectionsService. */
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const routeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredAndSortedOrders = useMemo(() => {
    let list =
      urgencyFilter === 'All' ? ordersReady.slice() : ordersReady.filter((o) => o.urgency === urgencyFilter);
    list.sort((a, b) => {
      switch (sortBy) {
        case 'urgency_desc':
          return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
        case 'urgency_asc':
          return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
        case 'required_date':
          return requiredDateSortKey(a.requiredDate) - requiredDateSortKey(b.requiredDate);
        case 'order_number':
          return a.orderNumber.localeCompare(b.orderNumber);
        case 'weight_desc':
          return b.weight - a.weight;
        case 'volume_desc':
          return b.volume - a.volume;
        default:
          return 0;
      }
    });
    return list;
  }, [ordersReady, urgencyFilter, sortBy]);

  // Calculate totals for selected orders
  const selectedOrdersData = ordersReady.filter(o => selectedOrders.includes(o.id));
  const totalWeight = selectedOrdersData.reduce((sum, o) => sum + o.weight, 0);
  const totalVolume = selectedOrdersData.reduce((sum, o) => sum + o.volume, 0);

  const mapStops = useMemo(() => {
    return ordersReady
      .filter((o) => selectedOrders.includes(o.id))
      .filter(
        (o) =>
          o.mapLat != null &&
          o.mapLng != null &&
          Number.isFinite(Number(o.mapLat)) &&
          Number.isFinite(Number(o.mapLng)),
      )
      .map((o) => ({
        lat: Number(o.mapLat),
        lng: Number(o.mapLng),
        orderId: o.id,
        title: `${o.orderNumber} — ${o.customer}`,
      }));
  }, [ordersReady, selectedOrders]);

  const selectedMissingPinCount = useMemo(() => {
    return ordersReady.filter((o) => selectedOrders.includes(o.id)).filter((o) => {
      const la = o.mapLat != null ? Number(o.mapLat) : NaN;
      const ln = o.mapLng != null ? Number(o.mapLng) : NaN;
      return !Number.isFinite(la) || !Number.isFinite(ln);
    }).length;
  }, [ordersReady, selectedOrders]);

  /**
   * Recompute the real driving route (debounced 600ms) whenever selected stops
   * with coordinates change. Requires at least 1 stop with a map pin.
   * If origin coords are not set, we use the first stop as origin and skip it.
   */
  useEffect(() => {
    // Clear previous result immediately when selection changes
    setRouteResult(null);
    setRouteError(null);

    if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);

    const hasValidOrigin =
      originLat != null &&
      originLng != null &&
      Number.isFinite(Number(originLat)) &&
      Number.isFinite(Number(originLng));

    // Need origin + at least 1 stop with coordinates
    if (!hasValidOrigin || mapStops.length === 0) return;

    routeDebounceRef.current = setTimeout(() => {
      setRouteLoading(true);
      void computeDrivingRoute({
        origin: { lat: Number(originLat), lng: Number(originLng) },
        stops: mapStops,
        optimizeWaypoints: true,
      }).then((res) => {
        setRouteLoading(false);
        if (res.ok) {
          setRouteResult(res.route);
          setRouteError(null);
        } else {
          setRouteResult(null);
          setRouteError(res.ok === false ? res.error : 'Unknown error');
        }
      });
    }, 600);

    return () => {
      if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStops, originLat, originLng]);

  // Get selected vehicle capacity
  const vehicle = vehicles.find((v) => v.id === selectedVehicle);
  const maxWeight = vehicle?.maxCapacityKg || vehicle?.maxWeight || 5000;
  const maxVolume = vehicle?.maxCapacityCbm || vehicle?.maxVolume || 25;
  const weightUtilization = (totalWeight / maxWeight) * 100;
  const volumeUtilization = (totalVolume / maxVolume) * 100;

  const activeTripCountByVehicleOnDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of existingTrips) {
      if (t.scheduledDate !== tripDateHint) continue;
      if (!TRIP_CONFLICT_STATUSES.includes(t.status as (typeof TRIP_CONFLICT_STATUSES)[number])) continue;
      m.set(t.vehicleId, (m.get(t.vehicleId) ?? 0) + 1);
    }
    return m;
  }, [existingTrips, tripDateHint]);

  const vehicleDayActiveTrips = useMemo(() => {
    if (!selectedVehicle || !tripDateHint) return [];
    return existingTrips.filter(
      (t) =>
        t.vehicleId === selectedVehicle &&
        t.scheduledDate === tripDateHint &&
        TRIP_CONFLICT_STATUSES.includes(t.status as (typeof TRIP_CONFLICT_STATUSES)[number]),
    );
  }, [existingTrips, selectedVehicle, tripDateHint]);

  const tripBookingsForVehicle = useMemo(() => {
    if (!selectedVehicle) return [];
    return existingTrips
      .filter(
        (t) =>
          t.vehicleId === selectedVehicle &&
          TRIP_CONFLICT_STATUSES.includes(t.status as (typeof TRIP_CONFLICT_STATUSES)[number]),
      )
      .map((t) => ({
        date: t.scheduledDate,
        type: 'Trip' as const,
        tripNumber: t.tripNumber,
        status: t.status,
      }));
  }, [existingTrips, selectedVehicle]);

  const assignableVehicles = useMemo(
    () => vehicles.filter((v) => v.status !== 'Maintenance' && v.status !== 'Out of Service'),
    [vehicles],
  );

  /** Drivers that already have an active trip on `tripDateHint`. */
  const driverBusyOnDate = useMemo(() => {
    const busy = new Set<string>();
    for (const t of existingTrips) {
      if (t.scheduledDate !== tripDateHint) continue;
      if (!TRIP_CONFLICT_STATUSES.includes(t.status as (typeof TRIP_CONFLICT_STATUSES)[number])) continue;
      if (t.driverId) busy.add(t.driverId);
    }
    return busy;
  }, [existingTrips, tripDateHint]);

  /** Active trips for the selected driver on `tripDateHint` (for the warning banner). */
  const driverDayActiveTrips = useMemo(() => {
    if (!selectedDriver || !tripDateHint) return [];
    return existingTrips.filter(
      (t) =>
        t.driverId === selectedDriver &&
        t.scheduledDate === tripDateHint &&
        TRIP_CONFLICT_STATUSES.includes(t.status as (typeof TRIP_CONFLICT_STATUSES)[number]),
    );
  }, [existingTrips, selectedDriver, tripDateHint]);

  const selectedDriverConflict = driverDayActiveTrips.length > 0;

  const scheduleModalBookings = useMemo(() => {
    const byDate = new Map<
      string,
      { date: string; type: 'Trip' | 'Maintenance'; tripNumber?: string; status?: string }
    >();
    for (const t of tripBookingsForVehicle) {
      byDate.set(t.date, t);
    }
    for (const date of selectedVehicleMaintDates) {
      byDate.set(date, { date, type: 'Maintenance' });
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [tripBookingsForVehicle, selectedVehicleMaintDates]);

  useEffect(() => {
    const uuidIds = assignableVehicles.map((v) => v.id).filter(isFleetVehicleUuid);
    if (!uuidIds.length || !/^\d{4}-\d{2}-\d{2}$/.test(tripDateHint)) {
      setMaintBlockedIdsForDate(new Set());
      return;
    }
    let cancelled = false;
    void fetchVehicleIdsWithMaintenanceOnDate(uuidIds, tripDateHint).then(({ blockedIds, error }) => {
      if (cancelled) return;
      if (error && import.meta.env.DEV) console.warn('[maintenance on date]', error);
      setMaintBlockedIdsForDate(blockedIds);
    });
    return () => {
      cancelled = true;
    };
  }, [assignableVehicles, tripDateHint]);

  useEffect(() => {
    if (!selectedVehicle || !isFleetVehicleUuid(selectedVehicle)) {
      setSelectedVehicleMaintDates([]);
      return;
    }
    let cancelled = false;
    void fetchMaintenanceScheduledDatesForVehicle(selectedVehicle).then(({ dates, error }) => {
      if (cancelled) return;
      if (error && import.meta.env.DEV) console.warn('[vehicle maintenance dates]', error);
      setSelectedVehicleMaintDates(dates);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedVehicle]);

  const truckScheduleHint = (v: Vehicle): { suffix: string; disabled: boolean; title: string } => {
    const plate = v.plateNumber ? ` · ${v.plateNumber}` : '';
    const base = `${v.vehicleName}${plate}`;
    if (maintBlockedIdsForDate.has(v.id)) {
      const hint = 'Under Maintenance';
      return {
        suffix: ` — ${hint}`,
        disabled: true,
        title: `${base} — ${hint}`,
      };
    }
    const n = activeTripCountByVehicleOnDate.get(v.id) ?? 0;
    const tripParen = n === 1 ? '(1 trip)' : `(${n} trips)`;
    return {
      suffix: ` ${tripParen}`,
      disabled: false,
      title: `${base} ${tripParen}`,
    };
  };

  const selectedTruckBlockedByMaintenance =
    !!selectedVehicle && maintBlockedIdsForDate.has(selectedVehicle);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const getUrgencyColor = (urgency: string) => {
    if (urgency === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (urgency === 'Medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const isOverCapacity = weightUtilization > 100 || volumeUtilization > 100;
  const isOptimalLoad = weightUtilization >= 80 && weightUtilization <= 95 && volumeUtilization >= 80 && volumeUtilization <= 95;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Route Planning & Load Building</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Order Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <RoutePlanningMap
                originLat={originLat}
                originLng={originLng}
                originTitle={originTitle ?? 'Depot / branch'}
                stops={mapStops}
                directionsResult={routeResult?.directionsResult ?? null}
                className="min-h-[320px]"
              />
              {selectedOrders.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-gray-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      Map shows {mapStops.length} of {selectedOrders.length} selected (customer map pin
                      {mapStops.length === 1 ? '' : 's'})
                    </span>
                    {selectedMissingPinCount > 0 && (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-900">
                        {selectedMissingPinCount} selected order{selectedMissingPinCount !== 1 ? 's' : ''} missing a customer
                        map pin — set location on the customer profile.
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right sm:text-left flex items-center gap-2">
                    {routeLoading && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Computing route…
                      </span>
                    )}
                    {!routeLoading && routeResult && (
                      <span className="flex items-center gap-1 text-green-700 font-medium">
                        <CheckCircle className="w-3 h-3" />
                        {routeResult.totalDistanceKm.toFixed(1)} km · {formatDuration(routeResult.totalDurationMinutes)} drive
                        {routeResult.waypointOrder.length > 0 && ' · route optimized'}
                      </span>
                    )}
                    {!routeLoading && routeError && !routeResult && (
                      <span className="text-amber-700">
                        Route unavailable — set customer map pins to enable
                      </span>
                    )}
                    {!routeLoading && !routeResult && !routeError && mapStops.length === 0 && (
                      <span className="text-gray-500">Set customer map pins to compute route</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Orders */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base sm:text-lg">
                    Available Orders ({filteredAndSortedOrders.length})
                  </CardTitle>
                  <p className="text-sm font-medium text-gray-600">
                    {selectedOrders.length} Selected
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[13rem]" aria-label="Order list controls">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="lamtex-route-urgency-filter" className="text-xs font-medium text-gray-600">
                      Filter by
                    </label>
                    <select
                      id="lamtex-route-urgency-filter"
                      value={urgencyFilter}
                      onChange={(e) => setUrgencyFilter(e.target.value as UrgencyFilter)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-56"
                    >
                      <option value="All">All urgencies</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="lamtex-route-sort" className="text-xs font-medium text-gray-600">
                      Order by
                    </label>
                    <select
                      id="lamtex-route-sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-56"
                    >
                      <option value="urgency_desc">Urgency (high → low)</option>
                      <option value="urgency_asc">Urgency (low → high)</option>
                      <option value="required_date">Required date (earliest first)</option>
                      <option value="order_number">Order number (A–Z)</option>
                      <option value="weight_desc">Weight (heaviest first)</option>
                      <option value="volume_desc">Volume (largest first)</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {filteredAndSortedOrders.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    {ordersReady.length === 0
                      ? 'No orders in the planning queue for this branch.'
                      : 'No orders match this urgency filter.'}
                  </p>
                )}
                {filteredAndSortedOrders.map((order) => {
                  const isSelected = selectedOrders.includes(order.id);
                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleOrderSelection(order.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                            <p className="text-sm text-gray-600">{order.customer}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium border ${getUrgencyColor(order.urgency)}`}>
                          {order.urgency}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Destination
                          </span>
                          <p className="font-medium text-gray-900">{order.destination}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Weight className="w-3 h-3" />
                            Weight
                          </span>
                          <p className="font-medium text-gray-900">{order.weight} kg</p>
                        </div>
                        <div>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Box className="w-3 h-3" />
                            Volume
                          </span>
                          <p className="font-medium text-gray-900">{order.volume} m³</p>
                        </div>
                        <div>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Required
                          </span>
                          <p className="font-medium text-gray-900">{order.requiredDate}</p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {order.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Trip Summary */}
        <div className="space-y-4">
          {/* Vehicle Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select truck & check date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <label htmlFor="lamtex-route-date-hint" className="text-sm text-gray-600">
                  Schedule date
                </label>
                <input
                  id="lamtex-route-date-hint"
                  type="date"
                  value={tripDateHint}
                  onChange={(e) => setTripDateHint(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {selectedTruckBlockedByMaintenance && (
                <div className="mb-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    This truck has <strong>maintenance scheduled</strong> on {tripDateHint}. Choose another truck or
                    date.
                  </span>
                </div>
              )}
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full min-w-0 max-w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-left"
              >
                <option value="">Choose a truck...</option>
                {assignableVehicles.map((v) => {
                  const hint = truckScheduleHint(v);
                  return (
                    <option key={v.id} value={v.id} disabled={hint.disabled} title={hint.title}>
                      {v.vehicleName}
                      {v.plateNumber ? ` · ${v.plateNumber}` : ''}
                      {hint.suffix}
                    </option>
                  );
                })}
              </select>

              {/* Driver selection */}
              <div className="mt-4">
                <label className="text-sm text-gray-600">
                  Assign driver <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                {selectedDriverConflict && (
                  <div className="mt-2 mb-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      This driver already has <strong>{driverDayActiveTrips.length} active trip{driverDayActiveTrips.length !== 1 ? 's' : ''}</strong> on {tripDateHint}. Consider assigning another driver.
                    </span>
                  </div>
                )}
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className={`mt-1 w-full min-w-0 max-w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-left ${
                    selectedDriverConflict ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">No driver assigned...</option>
                  {drivers.map((d) => {
                    const busy = driverBusyOnDate.has(d.id);
                    const onLeave = d.status === 'on-leave';
                    const inactive = d.status === 'inactive';
                    const suffix = inactive
                      ? ' — Inactive'
                      : onLeave
                      ? ' — On Leave'
                      : busy
                      ? ' (has trip)'
                      : '';
                    return (
                      <option
                        key={d.id}
                        value={d.id}
                        disabled={inactive}
                        title={`${d.name}${suffix}`}
                      >
                        {d.name}{suffix}
                      </option>
                    );
                  })}
                </select>
              </div>

              {vehicle && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Max weight</span>
                    <span className="font-semibold">{(vehicle.maxCapacityKg ?? vehicle.maxWeight) ?? '—'} kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Max volume</span>
                    <span className="font-semibold">{(vehicle.maxCapacityCbm ?? vehicle.maxVolume) ?? '—'} m³</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Load Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Load Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Weight */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Weight className="w-4 h-4" />
                      Weight
                    </span>
                    <span className={`text-sm font-bold ${
                      weightUtilization > 100 ? 'text-red-600' :
                      weightUtilization > 85 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {weightUtilization.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        weightUtilization > 100 ? 'bg-red-500' :
                        weightUtilization > 85 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(weightUtilization, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {totalWeight.toFixed(0)} / {maxWeight} kg
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Box className="w-4 h-4" />
                      Volume
                    </span>
                    <span className={`text-sm font-bold ${
                      volumeUtilization > 100 ? 'text-red-600' :
                      volumeUtilization > 85 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {volumeUtilization.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        volumeUtilization > 100 ? 'bg-red-500' :
                        volumeUtilization > 85 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(volumeUtilization, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {totalVolume.toFixed(1)} / {maxVolume} m³
                  </div>
                </div>

                {/* Stats */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Orders Selected</span>
                    <span className="font-semibold text-gray-900">{selectedOrders.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      Driving Distance
                      {routeLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {routeResult
                        ? `${routeResult.totalDistanceKm.toFixed(1)} km`
                        : mapStops.length > 0
                        ? '—'
                        : 'No pins set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      Drive Time
                      {routeLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {routeResult
                        ? formatDuration(routeResult.totalDurationMinutes)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Est. Fuel Cost</span>
                    <span className="font-semibold text-gray-900">
                      {routeResult
                        ? `₱${(routeResult.totalDistanceKm * FUEL_COST_PER_KM_PHP).toFixed(0)}`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Status Messages */}
                {isOverCapacity && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">
                        <span className="font-semibold">Over Capacity!</span> Remove some orders or select a larger vehicle.
                      </p>
                    </div>
                  </div>
                )}

                {isOptimalLoad && !isOverCapacity && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-700">
                        <span className="font-semibold">Optimal Load!</span> Truck utilization is efficient.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              variant="primary"
              className="w-full"
              disabled={
                selectedOrders.length === 0 || !selectedVehicle || isOverCapacity || selectedTruckBlockedByMaintenance
              }
              onClick={() => setShowScheduleModal(true)}
            >
              <Truck className="w-4 h-4 mr-2" />
              Create Delivery Trip
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedOrders([])}
              disabled={selectedOrders.length === 0}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <TripScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onConfirm={(selectedDates) => {
          const date = selectedDates[0];
          if (!selectedVehicle || !date) return;
          if (selectedVehicleMaintDates.includes(date)) {
            window.alert(
              `This truck is scheduled for maintenance on ${date}. Choose another date or truck.`,
            );
            return;
          }
          void Promise.resolve(onCreateTrip(selectedOrders, selectedVehicle, date, selectedDriver || null)).finally(() => {
            setShowScheduleModal(false);
            setSelectedOrders([]);
            setSelectedVehicle('');
            setSelectedDriver('');
          });
        }}
        vehicleName={vehicle?.vehicleName || 'Selected Vehicle'}
        orderCount={selectedOrders.length}
        existingBookings={scheduleModalBookings}
      />
    </div>
  );
};
