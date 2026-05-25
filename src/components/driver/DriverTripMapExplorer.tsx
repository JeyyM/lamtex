import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { DriverTripRoutePanel } from '@/src/components/driver/DriverTripRoutePanel';
import type { DriverOrderStop, DriverTripSummary } from '@/src/lib/driverDashboard';
import {
  Truck,
  Calendar,
  Package,
  MapPin,
  Navigation,
  AlertTriangle,
  Loader2,
  List,
} from 'lucide-react';

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

export type DriverTripMapExplorerProps = {
  branchId: string | null;
  trips: DriverTripSummary[];
  orderStops: DriverOrderStop[];
  /** Trip highlighted on load (e.g. next trip). */
  defaultTripId?: string | null;
  routeMode?: 'pending' | 'all';
  listTitle?: string;
  emptyMessage?: string;
  tripLoading?: boolean;
  onOpenTrip: (tripId: string) => void;
  onReportDelay?: (trip: DriverTripSummary) => void;
  /** Notifies parent when the highlighted trip changes. */
  onSelectedTripIdChange?: (tripId: string | null) => void;
};

export function DriverTripMapExplorer({
  branchId,
  trips,
  orderStops,
  defaultTripId,
  routeMode = 'pending',
  listTitle = 'Your trips',
  emptyMessage = 'No trips to show.',
  tripLoading = false,
  onOpenTrip,
  onReportDelay,
  onSelectedTripIdChange,
}: DriverTripMapExplorerProps): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const da = a.scheduledDate ?? '9999-12-31';
      const db = b.scheduledDate ?? '9999-12-31';
      if (da !== db) return da.localeCompare(db);
      return a.tripNumber.localeCompare(b.tripNumber);
    });
  }, [trips]);

  useEffect(() => {
    if (sortedTrips.length === 0) {
      setSelectedId(null);
      return;
    }
    const preferred =
      (defaultTripId && sortedTrips.some((t) => t.id === defaultTripId) ? defaultTripId : null) ??
      sortedTrips[0].id;
    setSelectedId((cur) => (cur && sortedTrips.some((t) => t.id === cur) ? cur : preferred));
  }, [sortedTrips, defaultTripId]);

  useEffect(() => {
    onSelectedTripIdChange?.(selectedId);
  }, [selectedId, onSelectedTripIdChange]);

  const selectedTrip = sortedTrips.find((t) => t.id === selectedId) ?? null;
  const selectedStops = useMemo(
    () => (selectedId ? orderStops.filter((s) => s.tripId === selectedId) : []),
    [orderStops, selectedId],
  );

  const pendingOnSelected = selectedStops.filter((s) => s.canDeliver).length;

  if (sortedTrips.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">
          <Truck className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p className="font-medium text-gray-700">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2 flex flex-col max-h-[520px] lg:max-h-[640px]">
        <CardHeader className="pb-2 shrink-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <List className="w-5 h-5 text-gray-600" />
            {listTitle}
            <Badge variant="default">{sortedTrips.length}</Badge>
          </CardTitle>
          <p className="text-xs text-gray-500 font-normal mt-1">Select a trip to preview route and details</p>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 pt-0 space-y-1.5">
          {sortedTrips.map((t) => {
            const active = t.id === selectedId;
            const pending = orderStops.filter((s) => s.tripId === t.id && s.canDeliver).length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  active
                    ? 'border-blue-400 bg-blue-50/80 ring-1 ring-blue-200'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-semibold text-sm truncate ${active ? 'text-blue-900' : 'text-gray-900'}`}>
                    {t.tripNumber}
                  </p>
                  <Badge variant={tripStatusVariant(t.status)}>{t.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {formatDateShort(t.scheduledDate)}
                  {t.vehicleName ? ` · ${t.vehicleName}` : ''}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t.orderCount} order{t.orderCount === 1 ? '' : 's'}
                  {pending > 0 && routeMode === 'pending' && (
                    <span className="text-amber-700 font-medium"> · {pending} pending</span>
                  )}
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3 border-2 border-blue-100">
        {selectedTrip ? (
          <>
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50/60 to-white">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-blue-900 text-lg">
                  <Navigation className="w-5 h-5" />
                  {selectedTrip.tripNumber}
                </CardTitle>
                <Badge variant={tripStatusVariant(selectedTrip.status)}>{selectedTrip.status}</Badge>
              </div>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <p>
                  {selectedTrip.vehicleName ?? '—'}
                  {selectedTrip.plateNumber ? ` · ${selectedTrip.plateNumber}` : ''}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateShort(selectedTrip.scheduledDate)}
                  {selectedTrip.departureTime ? ` · Depart ${selectedTrip.departureTime}` : ''}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Package className="w-3.5 h-3.5" />
                  {selectedTrip.orderCount} order{selectedTrip.orderCount === 1 ? '' : 's'}
                  {routeMode === 'pending' && pendingOnSelected > 0 && (
                    <span className="text-amber-700"> · {pendingOnSelected} awaiting delivery</span>
                  )}
                  <span> · {selectedTrip.capacityUsedPercent.toFixed(0)}% capacity</span>
                </p>
                {selectedTrip.destinations.length > 0 && (
                  <p className="flex items-start gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{selectedTrip.destinations.join(' → ')}</span>
                  </p>
                )}
              </div>
              {selectedTrip.delayReason && (
                <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-2">
                  ⚠ {selectedTrip.delayReason}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <DriverTripRoutePanel
                branchId={branchId}
                tripNumber={selectedTrip.tripNumber}
                stops={selectedStops}
                routeMode={routeMode}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="primary"
                  onClick={() => onOpenTrip(selectedTrip.id)}
                  disabled={tripLoading}
                  className="gap-2 flex-1"
                >
                  {tripLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                  Open trip &amp; submit proof
                </Button>
                {onReportDelay &&
                  selectedTrip.status !== 'Complete' &&
                  selectedTrip.status !== 'Cancelled' && (
                    <Button
                      variant="outline"
                      onClick={() => onReportDelay(selectedTrip)}
                      className="gap-2 border-amber-300 text-amber-900"
                    >
                      <AlertTriangle className="w-4 h-4" /> Report delay
                    </Button>
                  )}
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="py-12 text-center text-gray-500 text-sm">
            Select a trip from the list to view its route.
          </CardContent>
        )}
      </Card>
    </div>
  );
}
