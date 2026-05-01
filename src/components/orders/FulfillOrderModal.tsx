import React, { useState, useEffect } from 'react';
import { X, Package, CheckCircle, AlertTriangle, Image as ImageIcon, Upload, ZoomIn, Trash2 } from 'lucide-react';
import { OrderLineItem } from '@/src/types/orders';
import ImageGalleryModal from '@/src/components/ImageGalleryModal';

const ORDER_DELIVERY_PROOFS_FOLDER = 'order-delivery-proofs';

/** Max units in scope for this line (recorded at in transit, or order qty if not yet shipped). */
export function fulfillmentCap(item: OrderLineItem): number {
  if (item.quantityShipped != null) return item.quantityShipped;
  return item.quantity;
}

/** Remaining units that can be marked delivered in this and future sessions. */
export function fulfillmentRemaining(item: OrderLineItem): number {
  return Math.max(0, fulfillmentCap(item) - (item.quantityDelivered ?? 0));
}

/** True when the line was not fully sent vs the original order qty (e.g. 100 ordered, 90 in transit). */
function lineIsShortShipped(item: OrderLineItem): boolean {
  return item.quantityShipped != null && item.quantityShipped < item.quantity;
}

interface FulfillOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Order row UUID (Supabase) — used for storage folder in the image gallery. */
  orderId: string;
  orderNumber: string;
  items: OrderLineItem[];
  onFulfill: (fulfillmentData: FulfillmentData[], proofImageUrls: string[]) => void;
}

export interface FulfillmentData {
  itemId: string;
  orderedQuantity: number;
  deliveredQuantity: number;
}

export function FulfillOrderModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  items,
  onFulfill,
}: FulfillOrderModalProps) {
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentData[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [proofImageUrls, setProofImageUrls] = useState<string[]>([]);
  const [showProofGallery, setShowProofGallery] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProofImageUrls([]);
      const data = items.map((item) => {
        const remaining = fulfillmentRemaining(item);
        return {
          itemId: item.id,
          orderedQuantity: remaining,
          deliveredQuantity: remaining,
        };
      });
      setFulfillmentData(data);
      setInputValues(Object.fromEntries(data.map((d) => [d.itemId, String(d.deliveredQuantity)])));
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const hasLineItems = items.length > 0;

  const handleQuantityChange = (itemId: string, value: string) => {
    setInputValues(prev => ({ ...prev, [itemId]: value }));
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      const ordered = fulfillmentData.find(f => f.itemId === itemId)?.orderedQuantity ?? 0;
      setFulfillmentData(prev =>
        prev.map(item =>
          item.itemId === itemId
            ? { ...item, deliveredQuantity: Math.min(Math.max(0, numValue), ordered) }
            : item
        )
      );
    }
  };

  const handleQuantityBlur = (itemId: string) => {
    const ordered = fulfillmentData.find(f => f.itemId === itemId)?.orderedQuantity ?? 0;
    const raw = inputValues[itemId] ?? '';
    const numValue = parseInt(raw);
    const clamped = isNaN(numValue) ? 0 : Math.min(Math.max(0, numValue), ordered);
    setInputValues(prev => ({ ...prev, [itemId]: String(clamped) }));
    setFulfillmentData(prev =>
      prev.map(item =>
        item.itemId === itemId ? { ...item, deliveredQuantity: clamped } : item
      )
    );
  };

  const handleFulfill = () => {
    onFulfill(fulfillmentData, proofImageUrls);
    onClose();
  };

  const openProofGallery = () => setShowProofGallery(true);
  const handleProofGallerySelect = (urls: string[]) => {
    setProofImageUrls(urls);
    setShowProofGallery(false);
  };
  const removeProofUrl = (url: string) => {
    setProofImageUrls((prev) => prev.filter((u) => u !== url));
  };

  const totalDeliveredAfterSave = (line: OrderLineItem) => {
    const fd = fulfillmentData.find((f) => f.itemId === line.id);
    return (line.quantityDelivered ?? 0) + (fd?.deliveredQuantity ?? 0);
  };

  /** Same rule as order save: Delivered only when every line has total received === original line qty. */
  const isOrderCompleteForStatus =
    hasLineItems && items.every((line) => totalDeliveredAfterSave(line) === line.quantity);

  const isPartialFulfillment = hasLineItems && !isOrderCompleteForStatus;

  const totalItems = items.length;
  const fullyDeliveredItems = items.filter((line) => totalDeliveredAfterSave(line) === line.quantity)
    .length;

  const proofStorageFolder = `${ORDER_DELIVERY_PROOFS_FOLDER}/${orderId || 'unknown'}`;

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Fulfill Order
            </h2>
            <p className="text-sm text-gray-600 mt-1">Order #{orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!hasLineItems && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Nothing left to record on this pass</p>
              <p className="mt-1 text-amber-800/90">
                Shipped amounts are already fully marked as received in the system. You can still attach proof of delivery
                below, then confirm to update order status, or close this dialog.
              </p>
            </div>
          )}

          {/* Summary Stats */}
          {hasLineItems && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 font-medium mb-1">Total Items</div>
              <div className="text-2xl font-bold text-blue-900">{totalItems}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-medium mb-1">Fully Delivered</div>
              <div className="text-2xl font-bold text-green-900">
                {fullyDeliveredItems} / {totalItems}
              </div>
            </div>
          </div>
          )}

          {/* Items List */}
          {hasLineItems && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
            {items.map((item) => {
              const fulfillment = fulfillmentData.find(f => f.itemId === item.id);
              const deliveredQty = fulfillment?.deliveredQuantity || 0;
              const orderedQty = fulfillment?.orderedQuantity || 0;
              const fullReceipt = orderedQty > 0 && deliveredQty === orderedQty;
              const totalForLine = (item.quantityDelivered ?? 0) + deliveredQty;
              const isLineOrderComplete = totalForLine === item.quantity;
              const isLinePartial =
                !isLineOrderComplete &&
                (totalForLine > 0 ||
                  (orderedQty > 0 && deliveredQty > 0 && deliveredQty < orderedQty) ||
                  (fullReceipt && lineIsShortShipped(item)));

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isLineOrderComplete
                      ? 'bg-green-50 border-green-300'
                      : isLinePartial
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                        {isLineOrderComplete && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {isLinePartial && (
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{item.variantDescription}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Unit Price: ₱{item.unitPrice.toLocaleString()}
                        {item.quantityShipped == null && ` · Qty: ${item.quantity}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <label className="mb-1 text-right text-xs font-medium text-gray-600">Received</label>
                        <div className="flex items-baseline gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={orderedQty}
                            value={inputValues[item.id] ?? String(deliveredQty)}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            onBlur={() => handleQuantityBlur(item.id)}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-20 rounded-lg border-2 border-gray-300 px-3 py-2 text-center text-lg font-bold focus:border-blue-500 focus:outline-none"
                          />
                          <span className="text-sm font-bold text-gray-400">/</span>
                          <div className="flex min-w-[3.5rem] flex-col items-center">
                            <span className="text-lg font-bold leading-tight text-gray-900">{orderedQty}</span>
                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">max</span>
                          </div>
                        </div>
                        <p
                          className={`mt-1 max-w-[10rem] text-right text-[11px] ${
                            isLinePartial
                              ? 'text-yellow-800'
                              : isLineOrderComplete
                              ? 'text-green-800'
                              : 'text-gray-500'
                          }`}
                        >
                          {orderedQty === 0
                            ? '—'
                            : isLineOrderComplete
                            ? 'Complete'
                            : isLinePartial
                            ? 'Partial'
                            : 'Not received'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Proof of delivery — same pattern as PO receipts: gallery + storage */}
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Proof of delivery
                {proofImageUrls.length > 0 && (
                  <span className="text-xs font-normal text-gray-400">
                    ({proofImageUrls.length} image{proofImageUrls.length !== 1 ? 's' : ''})
                  </span>
                )}
                <span className="text-xs font-normal text-gray-500">(optional)</span>
              </h3>
              <button
                type="button"
                onClick={openProofGallery}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                {proofImageUrls.length > 0 ? 'Change selection' : 'Add images'}
              </button>
            </div>
            {proofImageUrls.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 text-center rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                onClick={openProofGallery}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openProofGallery()}
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">Click to select from image gallery</p>
                <p className="text-xs text-gray-400 mt-1">Upload new images inside the gallery if needed</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {proofImageUrls.map((url) => (
                  <div
                    key={url}
                    className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center"
                      aria-label="View full size"
                    >
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeProofUrl(url)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow z-[1]"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div
                  onClick={openProofGallery}
                  className="group relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 aspect-square cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center justify-center gap-1 transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openProofGallery()}
                >
                  <Upload className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                  <span className="text-xs text-gray-400 group-hover:text-indigo-500">Add more</span>
                </div>
              </div>
            )}
          </div>

          {/* Fulfillment Status Alert */}
          {isPartialFulfillment && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Partial Fulfillment</h4>
                <p className="text-sm text-yellow-800">
                  This order will be marked as <strong>Partially Fulfilled</strong> because some items
                  are not being delivered in full quantity.
                </p>
              </div>
            </div>
          )}

          {isOrderCompleteForStatus && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900 mb-1">Full Fulfillment</h4>
                <p className="text-sm text-green-700">
                  All ordered quantities are received. The order will be marked as <strong>Delivered</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleFulfill}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <CheckCircle className="w-5 h-5" />
            {!hasLineItems
              ? 'Confirm'
              : isPartialFulfillment
                ? 'Mark as Partially Fulfilled'
                : 'Mark as Delivered'}
          </button>
        </div>
      </div>
    </div>

    <ImageGalleryModal
      isOpen={showProofGallery}
      onClose={() => setShowProofGallery(false)}
      folder={proofStorageFolder}
      maxImages={20}
      currentImages={proofImageUrls}
      onSelectImages={handleProofGallerySelect}
      stackOnTopOfModal
    />
    </>
  );
}
