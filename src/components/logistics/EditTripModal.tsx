import React, { useEffect, useState } from 'react';
import { X, AlertCircle, Save, Weight, Box, Plus, Minus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import type { Trip, OrderReadyForDispatch, DriverOption, Vehicle } from '@/src/types/logistics';

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  drivers: DriverOption[];
  vehicles: Vehicle[];
  availableOrders: OrderReadyForDispatch[];
  onSave: (params: {
    status: Trip['status'];
    vehicleUuid: string;
    vehicleName: string;
    driverUuid: string | null;
    driverName: string;
    orderUuids: string[];
    previousOrderUuids: string[];
    totalWeightKg: number;
    totalVolumeCbm: number;
    notes: string;
    orderStatuses: Record<string, string>;
  }) => Promise<void>;
}

type OrderDetail = {
  id: string;
  orderNumber: string;
  customer: string;
  destination: string;
  weight: number;
  volume: number;
  status: string;
};

/** App-facing values; `Complete` is shown as "Completed" in the UI (maps to DB `trip_status` Completed). */
const TRIP_STATUSES = ['Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit', 'Delayed', 'Delivered', 'Complete', 'Cancelled'] as const;

function tripStatusChipLabel(s: (typeof TRIP_STATUSES)[number]): string {
  return s === 'Complete' ? 'Completed' : s;
}
/** Statuses allowed for orders already on a trip (post-queue / dispatch lifecycle). */
const ORDER_STATUSES = [
  'Scheduled',
  'Loading',
  'Packed',
  'Ready',
  'In Transit',
  'Delivered',
  'Cancelled',
] as const;

function orderStatusBadge(status: string) {
  switch (status) {
    case 'Scheduled':    return 'bg-blue-100 text-blue-700';
    case 'Loading':      return 'bg-amber-100 text-amber-800';
    case 'Packed':
    case 'Ready':        return 'bg-orange-100 text-orange-800';
    case 'In Transit':   return 'bg-indigo-100 text-indigo-700';
    case 'Delivered':    return 'bg-green-100 text-green-700';
    case 'Approved':     return 'bg-emerald-100 text-emerald-700';
    case 'Pending':      return 'bg-yellow-100 text-yellow-700';
    case 'Cancelled':    return 'bg-red-100 text-red-700';
    case 'On Hold':      return 'bg-orange-100 text-orange-700';
    default:             return 'bg-gray-100 text-gray-600';
  }
}

function num(n: unknown, fallback = 0): number {
  if (n == null || n === '') return fallback;
  const x = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(x) ? x : fallback;
}

export function EditTripModal({
  isOpen,
  onClose,
  trip,
  drivers,
  vehicles,
  availableOrders,
  onSave,
}: EditTripModalProps) {
  const [status, setStatus] = useState<Trip['status']>(trip.status);
  const [vehicleId, setVehicleId] = useState(trip.vehicleId ?? '');
  const [driverId, setDriverId] = useState(trip.driverId ?? '');
  const [tripOrderIds, setTripOrderIds] = useState<string[]>(trip.orders ?? []);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState(trip.delayReason ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [currentOrderDetails, setCurrentOrderDetails] = useState<OrderDetail[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStatus(trip.status);
    setVehicleId(trip.vehicleId ?? '');
    setDriverId(trip.driverId ?? '');
    setTripOrderIds(trip.orders ?? []);
    // initialize per-order statuses from trip orders — will be overwritten once DB fetch completes
    const init: Record<string, string> = {};
    (trip.orders ?? []).forEach((id) => { init[id] = 'Scheduled'; });
    setOrderStatuses(init);
    setNotes(trip.delayReason ?? '');
    setSaveError('');
    setOrderSearch('');
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [isOpen, trip]);

  useEffect(() => {
    if (!isOpen || !trip.orders?.length) { setCurrentOrderDetails([]); return; }
    setOrdersLoading(true);
    supabase
      .from('orders')
      .select('id, order_number, customer_name, delivery_address, weight_kg, volume_cbm, status')
      .in('id', trip.orders)
      .then(({ data }) => {
        setCurrentOrderDetails(
          (data ?? []).map((o) => ({
            id: o.id as string,
            orderNumber: (o.order_number as string) ?? '—',
            customer: (o.customer_name as string) ?? '—',
            destination: ((o.delivery_address as string) || '').split(/[\n,]/)[0]?.trim()?.slice(0, 80) || '—',
            weight: num(o.weight_kg, 10),
            volume: num(o.volume_cbm, 0.05),
            status: (o.status as string) ?? 'Scheduled',
          }))
        );
        // seed per-order statuses from real DB status
        setOrderStatuses((prev) => {
          const next = { ...prev };
          (data ?? []).forEach((o) => {
            next[o.id as string] = (o.status as string) ?? 'Scheduled';
          });
          return next;
        });
        setOrdersLoading(false);
      });
  }, [isOpen, trip.orders]);

  if (!isOpen) return null;

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const maxWeight = num(selectedVehicle?.maxCapacityKg ?? selectedVehicle?.maxWeight, trip.maxWeight || 5000);
  const maxVolume = num(selectedVehicle?.maxCapacityCbm ?? selectedVehicle?.maxVolume, trip.maxVolume || 25);

  const allOrdersMap = new Map<string, OrderDetail>();
  for (const o of currentOrderDetails) allOrdersMap.set(o.id, o);
  for (const o of availableOrders) {
    if (!allOrdersMap.has(o.id)) {
      allOrdersMap.set(o.id, { id: o.id, orderNumber: o.orderNumber, customer: o.customer, destination: o.destination, weight: o.weight, volume: o.volume, status: o.urgency ?? 'Approved' });
    }
  }

  const selectedOrderDetails = tripOrderIds.map((id) => allOrdersMap.get(id)).filter(Boolean) as OrderDetail[];
  const totalWeight = selectedOrderDetails.reduce((s, o) => s + o.weight, 0);
  const totalVolume = selectedOrderDetails.reduce((s, o) => s + o.volume, 0);
  const weightPct = maxWeight > 0 ? (totalWeight / maxWeight) * 100 : 0;
  const volumePct = maxVolume > 0 ? (totalVolume / maxVolume) * 100 : 0;
  const isOverCapacity = weightPct > 100 || volumePct > 100;

  const addableOrders = availableOrders.filter((o) => !tripOrderIds.includes(o.id));
  const filteredAddable = addableOrders.filter((o) => {
    const q = orderSearch.toLowerCase();
    return !q || o.orderNumber.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.destination.toLowerCase().includes(q);
  });

  const handleRemoveOrder = (id: string) => {
    setTripOrderIds((prev) => prev.filter((oid) => oid !== id));
    setOrderStatuses((s) => {
      const copy = { ...s };
      delete copy[id];
      return copy;
    });
  };
  const handleAddOrder = (id: string) => {
    setTripOrderIds((prev) => [...prev, id]);
    setOrderStatuses((s) => ({ ...s, [id]: allOrdersMap.get(id)?.status ?? 'Scheduled' }));
  };

  const handleSave = async () => {
    if (!vehicleId) { setSaveError('Please select a truck.'); return; }
    setSaving(true);
    setSaveError('');
    const veh = selectedVehicle;
    const dr = drivers.find((d) => d.id === driverId);
    try {
      await onSave({
        status,
        vehicleUuid: vehicleId,
        vehicleName: veh?.vehicleName ?? trip.vehicleName,
        driverUuid: driverId || null,
        driverName: dr?.name ?? trip.driverName ?? '',
        orderUuids: tripOrderIds,
        previousOrderUuids: trip.orders ?? [],
        totalWeightKg: Math.round(totalWeight * 100) / 100,
        totalVolumeCbm: Math.round(totalVolume * 1000) / 1000,
        notes,
        orderStatuses,
      });
    } catch (e: unknown) {
      setSaveError((e as Error)?.message ?? 'Save failed.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-0 sm:p-4">
      <div className="bg-white w-full max-w-full h-full max-h-screen sm:h-auto sm:max-w-3xl sm:max-h-[92vh] sm:rounded-lg shadow-xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 sm:rounded-t-lg px-4 sm:px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">Edit Trip: {trip.tripNumber}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Modify status, truck, driver, orders and notes</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Trip Status</label>
            <div className="flex flex-wrap gap-2">
              {TRIP_STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-colors ${
                    status === s ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}>
                  {tripStatusChipLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {/* Truck + Driver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Truck</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
                <option value="">Choose a truck…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleName}{v.plateNumber ? ` · ${v.plateNumber}` : ''}
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <p className="mt-1 text-xs text-gray-500">
                  Max {(selectedVehicle.maxCapacityKg ?? selectedVehicle.maxWeight) ?? '—'} kg · {(selectedVehicle.maxCapacityCbm ?? selectedVehicle.maxVolume) ?? '—'} m³
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Driver</label>
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
                <option value="">No driver assigned…</option>
                {drivers.map((d) => {
                  const inactive = d.status === 'inactive';
                  const onLeave = d.status === 'on-leave';
                  const suffix = inactive ? ' — Inactive' : onLeave ? ' — On Leave' : '';
                  return <option key={d.id} value={d.id} disabled={inactive}>{d.name}{suffix}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Capacity bars */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Load Capacity</h3>
              {isOverCapacity && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Over capacity!
                </span>
              )}
            </div>
            {/* Weight */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><Weight className="w-3.5 h-3.5" /> Weight</span>
                <span className={`text-xs font-bold ${weightPct > 100 ? 'text-red-600' : weightPct > 85 ? 'text-yellow-600' : 'text-green-600'}`}>{weightPct.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full transition-all rounded-full ${weightPct > 100 ? 'bg-red-500' : weightPct > 85 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(weightPct, 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">{totalWeight.toFixed(0)} / {maxWeight} kg</p>
            </div>
            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><Box className="w-3.5 h-3.5" /> Volume</span>
                <span className={`text-xs font-bold ${volumePct > 100 ? 'text-red-600' : volumePct > 85 ? 'text-yellow-600' : 'text-green-600'}`}>{volumePct.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full transition-all rounded-full ${volumePct > 100 ? 'bg-red-500' : volumePct > 85 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(volumePct, 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">{totalVolume.toFixed(2)} / {maxVolume} m³</p>
            </div>
          </div>

          {/* Orders on this trip */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Orders on Trip <span className="ml-2 text-xs font-normal text-gray-400">({tripOrderIds.length} orders)</span>
            </label>
            {ordersLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading orders…
              </div>
            ) : tripOrderIds.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">No orders assigned to this trip yet.</p>
            ) : (
              <div className="space-y-3">
                {tripOrderIds.map((id) => {
                  const o = allOrdersMap.get(id);
                  const orderSt = orderStatuses[id] ?? 'Scheduled';
                  if (!o) return (
                    <div key={id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-400">
                      <span className="font-mono">{id.slice(0, 8)}…</span>
                      <button type="button" onClick={() => handleRemoveOrder(id)}
                        className="ml-2 p-1 rounded hover:bg-red-100 text-red-500 transition-colors" title="Remove order">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                  return (
                    <div key={id} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-3 space-y-2">
                      {/* Top row: order number + remove */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-semibold text-blue-800">{o.orderNumber}</span>
                          <p className="text-xs text-gray-600 mt-0.5">{o.customer}</p>
                          <p className="text-xs text-gray-500 truncate">{o.destination}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-gray-500 hidden sm:block">{o.weight.toFixed(0)} kg · {o.volume.toFixed(2)} m³</span>
                          <button type="button" onClick={() => handleRemoveOrder(id)}
                            className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors" title="Remove from trip">
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Per-order status selector */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Order Status</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ORDER_STATUSES.map((s) => (
                            <button key={s} type="button"
                              onClick={() => setOrderStatuses((prev) => ({ ...prev, [id]: s }))}
                              className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
                                orderSt === s
                                  ? 'border-blue-600 bg-blue-600 text-white font-semibold'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              }`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add orders */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Add Orders <span className="ml-2 text-xs font-normal text-gray-400">({addableOrders.length} approved orders available)</span>
            </label>
            {addableOrders.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">No approved orders available to add.</p>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by order #, customer, destination…"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {filteredAddable.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-2">No results match your search.</p>
                  ) : filteredAddable.map((o) => (
                    <div key={o.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-gray-800">{o.orderNumber}</span>
                        <span className="mx-2 text-gray-400">·</span>
                        <span className="text-sm text-gray-700">{o.customer}</span>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{o.destination}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          o.urgency === 'High' ? 'bg-red-100 text-red-700' : o.urgency === 'Low' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                        }`}>{o.urgency}</span>
                        <span className="text-xs text-gray-500 hidden sm:block">{o.weight.toFixed(0)} kg</span>
                        <button type="button" onClick={() => handleAddOrder(o.id)}
                          className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors" title="Add to trip">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Logistics Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Driver instructions, route changes, special delivery notes…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          {saveError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 sm:rounded-b-lg px-4 sm:px-6 py-4 z-10">
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto justify-center">Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving} className="w-full sm:w-auto justify-center">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

