import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { TripScheduleModal } from '@/src/components/logistics/TripScheduleModal';
import { Package, Ship, Weight, Box, Loader2, CheckCircle, Calendar } from 'lucide-react';
import type { OrderReadyForDispatch, Vehicle, Trip } from '@/src/types/logistics';
import {
  tripOccupiedDateKeys,
  tripsConflictingVehicleOnDates,
} from '@/src/lib/logisticsScheduling';

const TRIP_CONFLICT_STATUSES = ['Pending', 'Scheduled', 'Loading', 'In Transit', 'Delayed'] as const;

export interface ContainerShipmentCreatedFeedback {
  tripNumber: string;
  scheduledDate: string;
  scheduledEndDate?: string;
  dayCount: number;
  orderCount: number;
  containerName: string;
}

interface ContainerScheduleViewProps {
  ordersReady: OrderReadyForDispatch[];
  ordersLoading?: boolean;
  containers: Vehicle[];
  existingTrips: Trip[];
  initialSelectedOrderIds?: string[];
  initialTripDate?: string;
  onCreateShipment: (
    selectedOrders: string[],
    containerId: string,
    scheduledDates: string[],
    routeLabel: string,
  ) => void | Promise<ContainerShipmentCreatedFeedback | void>;
}

export function ContainerScheduleView({
  ordersReady,
  ordersLoading = false,
  containers,
  existingTrips,
  initialSelectedOrderIds,
  initialTripDate,
  onCreateShipment,
}: ContainerScheduleViewProps) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [routeLabel, setRouteLabel] = useState('Manila Port → destination');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ContainerShipmentCreatedFeedback | null>(null);

  useEffect(() => {
    if (!initialSelectedOrderIds?.length) return;
    const ids = initialSelectedOrderIds.filter((oid) => ordersReady.some((o) => o.id === oid));
    if (ids.length) setSelectedOrders(ids);
  }, [initialSelectedOrderIds, ordersReady]);

  const selectedOrderRows = useMemo(
    () => ordersReady.filter((o) => selectedOrders.includes(o.id)),
    [ordersReady, selectedOrders],
  );

  const totals = useMemo(() => {
    return selectedOrderRows.reduce(
      (acc, o) => ({
        weight: acc.weight + o.weight,
        volume: acc.volume + o.volume,
      }),
      { weight: 0, volume: 0 },
    );
  }, [selectedOrderRows]);

  const containerRow = containers.find((c) => c.id === selectedContainer);

  const scheduleModalBookings = useMemo(() => {
    if (!selectedContainer) return [];
    const entries: Array<{
      date: string;
      type: 'Trip';
      tripNumber: string;
      status: string;
    }> = [];
    for (const t of existingTrips) {
      if (t.vehicleId !== selectedContainer) continue;
      if (!TRIP_CONFLICT_STATUSES.includes(t.status as (typeof TRIP_CONFLICT_STATUSES)[number])) continue;
      for (const date of tripOccupiedDateKeys(t)) {
        entries.push({
          date,
          type: 'Trip',
          tripNumber: t.tripNumber,
          status: t.status,
        });
      }
    }
    return entries;
  }, [existingTrips, selectedContainer]);

  const capacityPct = useMemo(() => {
    if (!containerRow) return 0;
    const wPct = containerRow.maxWeight > 0 ? (totals.weight / containerRow.maxWeight) * 100 : 0;
    const vPct = containerRow.maxVolume > 0 ? (totals.volume / containerRow.maxVolume) * 100 : 0;
    return Math.min(100, Math.round(Math.max(wPct, vPct)));
  }, [containerRow, totals]);

  const maxWeight = containerRow?.maxWeight ?? 5000;
  const maxVolume = containerRow?.maxVolume ?? 25;
  const weightUtilization = containerRow && containerRow.maxWeight > 0
    ? (totals.weight / containerRow.maxWeight) * 100
    : 0;
  const volumeUtilization = containerRow && containerRow.maxVolume > 0
    ? (totals.volume / containerRow.maxVolume) * 100
    : 0;

  const utilizationBarClass = (pct: number) =>
    pct > 100 ? 'bg-red-500' : pct > 85 ? 'bg-yellow-500' : 'bg-green-500';

  const utilizationTextClass = (pct: number) =>
    pct > 100 ? 'text-red-600' : pct > 85 ? 'text-yellow-600' : 'text-green-600';

  const toggleOrder = (id: string) => {
    setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleScheduleConfirm = async (selectedDates: string[]) => {
    const scheduledDates = [...new Set(selectedDates.map((d) => d.trim().slice(0, 10)).filter(Boolean))].sort();
    if (!selectedContainer || selectedOrders.length === 0 || scheduledDates.length === 0) {
      window.alert('Select a container, at least one order, and at least one day the container is out.');
      return;
    }
    const conflicts = tripsConflictingVehicleOnDates(existingTrips, selectedContainer, scheduledDates);
    if (conflicts.length > 0) {
      window.alert('This container is already booked on one or more of the selected days.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await onCreateShipment(selectedOrders, selectedContainer, scheduledDates, routeLabel);
      if (result) {
        setFeedback(result);
        setSelectedOrders([]);
        setSelectedContainer('');
        setShowScheduleModal(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-cyan-200 bg-gradient-to-r from-cyan-50/40 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ship className="w-5 h-5 text-cyan-700" />
          Schedule container shipment
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Group approved ship-delivery orders into one container. Pick one or more days the container will be out (e.g. a 3-day voyage).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">
              <p className="font-semibold">{feedback.tripNumber} scheduled</p>
              <p className="mt-0.5">
                {feedback.containerName} · {feedback.orderCount} order{feedback.orderCount === 1 ? '' : 's'} ·{' '}
                {feedback.dayCount > 1 && feedback.scheduledEndDate
                  ? `${feedback.scheduledDate} – ${feedback.scheduledEndDate} (${feedback.dayCount} days)`
                  : feedback.scheduledDate}
              </p>
            </div>
            <button type="button" className="ml-auto text-xs text-emerald-800 underline" onClick={() => setFeedback(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Orders ready to ship</p>
            {ordersLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-500 border border-dashed border-gray-200 rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-700" aria-hidden />
                <p className="text-sm">Loading available orders…</p>
              </div>
            ) : ordersReady.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-lg">
                No approved orders with delivery type Ship are waiting for a container.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {ordersReady.map((o) => {
                  const checked = selectedOrders.includes(o.id);
                  return (
                    <label
                      key={o.id}
                      className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${checked ? 'bg-cyan-50/60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOrder(o.id)}
                        className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900">{o.orderNumber}</span>
                          <Badge variant="outline" className="text-[10px]">{o.urgency}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{o.customer} · {o.destination}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {o.weight.toLocaleString()} kg · {o.volume.toFixed(2)} m³
                          {o.requiredDate ? ` · need by ${o.requiredDate}` : ''}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Shipping container</label>
              <select
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select container…</option>
                {containers.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.status !== 'Available'}>
                    {c.vehicleName} ({c.vehicleId}) — {c.status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Route / destination label</label>
              <input
                type="text"
                value={routeLabel}
                onChange={(e) => setRouteLabel(e.target.value)}
                placeholder="Manila Port → Cebu"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {selectedOrderRows.length > 0 && containerRow && (
              <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Load summary</p>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 inline-flex items-center gap-2">
                      <Weight className="w-4 h-4" />
                      Weight
                    </span>
                    <span className={`text-sm font-bold ${utilizationTextClass(weightUtilization)}`}>
                      {weightUtilization.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${utilizationBarClass(weightUtilization)}`}
                      style={{ width: `${Math.min(weightUtilization, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {totals.weight.toLocaleString()} / {maxWeight.toLocaleString()} kg
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 inline-flex items-center gap-2">
                      <Box className="w-4 h-4" />
                      Volume
                    </span>
                    <span className={`text-sm font-bold ${utilizationTextClass(volumeUtilization)}`}>
                      {volumeUtilization.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${utilizationBarClass(volumeUtilization)}`}
                      style={{ width: `${Math.min(volumeUtilization, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {totals.volume.toFixed(2)} / {maxVolume} m³
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                  <span className="text-gray-600 inline-flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    Overall fill
                  </span>
                  <span className={`font-semibold ${utilizationTextClass(capacityPct)}`}>{capacityPct}%</span>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={submitting || !selectedContainer || selectedOrders.length === 0}
              onClick={() => setShowScheduleModal(true)}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
              {submitting ? 'Scheduling…' : 'Pick date & schedule shipment'}
            </Button>
          </div>
        </div>
      </CardContent>

      <TripScheduleModal
        isOpen={showScheduleModal}
        onClose={() => !submitting && setShowScheduleModal(false)}
        onConfirm={handleScheduleConfirm}
        vehicleName={containerRow?.vehicleName || 'Selected container'}
        orderCount={selectedOrders.length}
        existingBookings={scheduleModalBookings}
        modalTitle="Schedule Container Shipment"
        confirmLabel="Schedule Shipment"
        initialDate={initialTripDate}
      />
    </Card>
  );
}
