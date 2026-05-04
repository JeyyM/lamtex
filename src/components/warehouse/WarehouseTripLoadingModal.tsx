import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, Clock, Package, CheckCircle, Truck, CheckCircle2, Pencil } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import type { OrderLineItem } from '@/src/types/orders';
import { finishedGoodProductHref } from '@/src/lib/productRoutes';
import { tripStatusBadgeClass } from '@/src/lib/logisticsScheduling';

export type WarehouseTripSummary = {
  id: string;
  tripNumber: string;
  vehicleName: string;
  driverName: string;
  scheduledDate: string | null;
  status: string;
  /** Current trip delay note from `trips.delay_reason` (single message; edited in-place). */
  delayReason?: string | null;
};

export type WarehouseOrderRowLite = {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string | null;
  requiredDate: string | null;
  status: string;
  urgency: string;
  items: OrderLineItem[];
  hasShortage: boolean;
};

function orderLineRemaining(li: OrderLineItem): number {
  return Math.max(0, li.quantity - (li.quantityShipped ?? 0));
}

function LineItemThumb({ imageUrl, productName }: { imageUrl?: string; productName: string }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(imageUrl && !broken);
  return showImg ? (
    <img
      src={imageUrl}
      alt={productName}
      className="w-10 h-10 rounded-md object-cover border border-gray-200 shrink-0 bg-gray-50"
      onError={() => setBroken(true)}
    />
  ) : (
    <div
      className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0"
      aria-hidden
    >
      <Package className="w-5 h-5 text-gray-400" />
    </div>
  );
}

function orderDeliveryStatusBadge(status: string): string {
  switch (status) {
    case 'Delivered':
    case 'Completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'In Transit':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Ready':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'Packed':
      return 'bg-violet-100 text-violet-900 border-violet-300';
    case 'Loading':
      return 'bg-orange-100 text-orange-900 border-orange-300';
    case 'Scheduled':
    case 'Partially Fulfilled':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'Approved':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'Cancelled':
    case 'Rejected':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

type WarehouseTripLoadingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  trip: WarehouseTripSummary | null;
  orders: WarehouseOrderRowLite[];
  stockByVariant: Record<string, number>;
  /** Updates `trips.delay_reason` and sets status to Delayed (same pattern as logistics). */
  onReportTripDelay: (payload: { message: string }) => Promise<void>;
  warehouseStatusOrderId: string | null;
  inTransitSubmitting: boolean;
  advanceWarehouseOrderStatus: (order: WarehouseOrderRowLite, nextStatus: string) => void | Promise<void>;
  confirmInTransit: (order: WarehouseOrderRowLite) => void | Promise<void>;
  onRecordDelivery: (order: WarehouseOrderRowLite) => void;
  /** Opens full trip edit (status, truck, driver, orders) — same flow as Logistics. */
  onEditTrip?: () => void;
  editTripOpening?: boolean;
};

export function WarehouseTripLoadingModal({
  isOpen,
  onClose,
  trip,
  orders,
  stockByVariant,
  onReportTripDelay,
  warehouseStatusOrderId,
  inTransitSubmitting,
  advanceWarehouseOrderStatus,
  confirmInTransit,
  onRecordDelivery,
  onEditTrip,
  editTripOpening = false,
}: WarehouseTripLoadingModalProps) {
  const [problemMessage, setProblemMessage] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (trip?.id) {
      setProblemMessage(trip.delayReason?.trim() ? trip.delayReason.trim() : '');
      setReportSent(false);
    } else {
      setProblemMessage('');
      setReportSent(false);
    }
  }, [isOpen, trip?.id, trip?.delayReason]);

  if (!isOpen) return null;

  const resetReport = () => {
    setProblemMessage(trip?.delayReason?.trim() ?? '');
    setReportSent(false);
  };

  const handleClose = () => {
    resetReport();
    onClose();
  };

  const handleSubmitReport = async () => {
    const msg = problemMessage.trim();
    if (!msg) {
      alert('Describe what is delaying this trip.');
      return;
    }
    if (!trip?.id) {
      alert('Report a delay only when these orders are open under a trip from Ongoing Trips.');
      return;
    }
    setReportSubmitting(true);
    setReportSent(false);
    try {
      await onReportTripDelay({
        message: msg,
      });
      setReportSent(true);
      setProblemMessage(msg);
    } catch {
      /* onReportProblem alerts */
    } finally {
      setReportSubmitting(false);
    }
  };

  const title = trip
    ? `Trip ${trip.tripNumber} — loading & stock`
    : 'Orders not on a trip — loading & stock';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
      onKeyDown={(e) => e.key === 'Escape' && handleClose()}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-loading-modal-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 id="trip-loading-modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            {trip && (
              <p className="text-sm text-gray-600 mt-1">
                {trip.vehicleName} · {trip.driverName}
                {trip.scheduledDate ? ` · ${trip.scheduledDate}` : ''}
                <span
                  className={`ml-2 inline-flex px-2 py-0.5 rounded text-xs font-semibold uppercase border ${tripStatusBadgeClass(trip.status)}`}
                >
                  {trip.status}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {trip && onEditTrip && (
              <button
                type="button"
                onClick={() => onEditTrip()}
                disabled={editTripOpening}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Edit trip — status, truck, driver, orders"
              >
                <Pencil className="w-4 h-4" />
                Edit trip
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-8">
          {orders.map((ord) => (
            <div key={ord.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/orders/${encodeURIComponent(ord.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ord.orderNumber}
                    </a>
                    {ord.hasShortage && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {ord.customerName} · Urgency: {ord.urgency || '—'}
                  </p>
                </div>
                <span
                  className={`inline-flex text-xs font-semibold uppercase px-2 py-0.5 rounded border ${orderDeliveryStatusBadge(ord.status)}`}
                >
                  {ord.status}
                </span>
              </div>

              <div className="px-4 py-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="pb-2 pr-2">Product</th>
                      <th className="pb-2 pr-2 text-right">Ordered</th>
                      <th className="pb-2 pr-2 text-right">Shipped</th>
                      <th className="pb-2 pr-2 text-right">To ship</th>
                      <th className="pb-2 pr-2 text-right">On hand</th>
                      <th className="pb-2 text-right">Gap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ord.items.map((li) => {
                      const rem = orderLineRemaining(li);
                      const onHand = li.variantId ? Number(stockByVariant[li.variantId] ?? 0) : null;
                      const gap =
                        li.variantId && rem > 0 && onHand != null ? onHand - rem : null;
                      const short = gap != null && gap < 0;
                      return (
                        <tr key={li.id} className={short ? 'bg-red-50/80' : ''}>
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <LineItemThumb imageUrl={li.imageUrl} productName={li.productName} />
                              <div className="min-w-0">
                                {li.productId ? (
                                  <a
                                    href={finishedGoodProductHref(li.productId, li.categorySlug)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {li.productName}
                                  </a>
                                ) : (
                                  <div className="font-medium text-gray-900">{li.productName}</div>
                                )}
                                {li.variantDescription && (
                                  <div className="text-xs text-gray-500">{li.variantDescription}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">{li.quantity}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{li.quantityShipped ?? 0}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{rem}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {onHand == null ? '—' : onHand}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {gap == null ? '—' : <span className={short ? 'font-semibold text-red-700' : ''}>{gap}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-200 flex flex-wrap gap-2">
                {ord.status === 'Scheduled' && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={warehouseStatusOrderId === ord.id || inTransitSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void advanceWarehouseOrderStatus(ord, 'Loading');
                    }}
                  >
                    {warehouseStatusOrderId === ord.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Package className="w-3.5 h-3.5 mr-1" />
                    )}
                    Start loading
                  </Button>
                )}
                {ord.status === 'Loading' && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700"
                    disabled={warehouseStatusOrderId === ord.id || inTransitSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void advanceWarehouseOrderStatus(ord, 'Packed');
                    }}
                  >
                    {warehouseStatusOrderId === ord.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    )}
                    Mark packed
                  </Button>
                )}
                {ord.status === 'Packed' && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={warehouseStatusOrderId === ord.id || inTransitSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void advanceWarehouseOrderStatus(ord, 'Ready');
                    }}
                  >
                    {warehouseStatusOrderId === ord.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    )}
                    Ready to depart
                  </Button>
                )}
                {ord.status === 'Ready' && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    disabled={inTransitSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void confirmInTransit(ord);
                    }}
                  >
                    {inTransitSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Truck className="w-3.5 h-3.5 mr-1" />
                    )}
                    Mark in Transit
                  </Button>
                )}
                {ord.status === 'In Transit' && (
                  <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onRecordDelivery(ord)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Record delivery
                  </Button>
                )}
                {ord.status === 'Approved' && (
                  <span className="text-xs text-gray-500 self-center">Awaiting scheduled trip from logistics</span>
                )}
              </div>
            </div>
          ))}

          <div className="border border-red-200 bg-red-50/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-900 font-medium text-sm mb-2">
              <Clock className="w-4 h-4" />
              Report trip delay
            </div>
            {!trip?.id ? (
              <p className="text-xs text-red-900/85">
                Open this screen from an <span className="font-medium">Ongoing Trip</span> row so the delay is saved on
                that trip (same as logistics). Orphan orders here cannot be marked delayed until they are on a trip.
              </p>
            ) : (
              <>
                <label className="block text-xs font-medium text-gray-700 mb-1">Delay explanation</label>
                <textarea
                  value={problemMessage}
                  onChange={(e) => setProblemMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y bg-white"
                  placeholder="What is holding up this trip?"
                  disabled={!trip?.id}
                />
              </>
            )}
            {reportSent && (
              <p className="text-sm text-green-700 mt-2">Delay saved on this trip.</p>
            )}
            {trip?.id ? (
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetReport}>
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  disabled={reportSubmitting}
                  onClick={() => void handleSubmitReport()}
                >
                  {reportSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark trip delayed'}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
