import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, CheckCircle, AlertTriangle, Image as ImageIcon, Upload, ZoomIn, Trash2 } from 'lucide-react';
import type { IbrInTransitModalLine } from '@/src/components/interBranch/MarkIbrInTransitModal';
import type { FulfillmentData } from '@/src/components/orders/FulfillOrderModal';
import ImageGalleryModal from '@/src/components/ImageGalleryModal';

const IBR_DELIVERY_PROOFS_FOLDER = 'ibr-delivery-proofs';

export interface RecordIbrDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** IBR row UUID — storage folder for gallery uploads */
  requestId: string;
  ibrNumber: string;
  lines: IbrInTransitModalLine[];
  submitting?: boolean;
  onConfirm: (fulfillmentData: FulfillmentData[], proofImageUrls: string[]) => void | Promise<void>;
}

function fmtQty(n: number) {
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function pendingInTransit(line: IbrInTransitModalLine): number {
  const shipped = Number(line.quantity_shipped) || 0;
  const delivered = Number(line.quantity_delivered) || 0;
  return Math.max(0, shipped - delivered);
}

function lineIsShortShipped(line: IbrInTransitModalLine): boolean {
  return line.quantity_shipped != null && line.quantity_shipped < line.quantity;
}

export function RecordIbrDeliveryModal({
  isOpen,
  onClose,
  requestId,
  ibrNumber,
  lines,
  submitting = false,
  onConfirm,
}: RecordIbrDeliveryModalProps) {
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentData[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [proofImageUrls, setProofImageUrls] = useState<string[]>([]);
  const [showProofGallery, setShowProofGallery] = useState(false);

  const linesInScope = useMemo(
    () => lines.filter((l) => pendingInTransit(l) > 0),
    [lines],
  );
  const hasLineItems = linesInScope.length > 0;

  useEffect(() => {
    if (isOpen) {
      setProofImageUrls([]);
      const data = linesInScope.map((line) => {
        const remaining = pendingInTransit(line);
        return {
          itemId: line.id,
          orderedQuantity: remaining,
          deliveredQuantity: remaining,
        };
      });
      setFulfillmentData(data);
      setInputValues(
        Object.fromEntries(
          data.map((d) => [d.itemId, d.orderedQuantity === 0 ? '0' : fmtQty(d.deliveredQuantity)]),
        ),
      );
    }
  }, [isOpen, linesInScope]);

  const handleQuantityChange = (itemId: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [itemId]: value }));
    const numValue = parseFloat(value);
    if (!Number.isNaN(numValue)) {
      const ordered = fulfillmentData.find((f) => f.itemId === itemId)?.orderedQuantity ?? 0;
      setFulfillmentData((prev) =>
        prev.map((item) =>
          item.itemId === itemId
            ? { ...item, deliveredQuantity: Math.min(Math.max(0, numValue), ordered) }
            : item,
        ),
      );
    }
  };

  const handleQuantityBlur = (itemId: string) => {
    const ordered = fulfillmentData.find((f) => f.itemId === itemId)?.orderedQuantity ?? 0;
    const raw = inputValues[itemId] ?? '';
    const numValue = parseFloat(raw);
    const clamped = Number.isNaN(numValue) ? 0 : Math.min(Math.max(0, numValue), ordered);
    setInputValues((prev) => ({ ...prev, [itemId]: clamped === 0 ? '0' : fmtQty(clamped) }));
    setFulfillmentData((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, deliveredQuantity: clamped } : item)),
    );
  };

  const totalDeliveredAfterSave = (line: IbrInTransitModalLine) => {
    const fd = fulfillmentData.find((f) => f.itemId === line.id);
    return fd != null ? (Number(line.quantity_delivered) || 0) + fd.deliveredQuantity : Number(line.quantity_delivered) || 0;
  };

  const lineQtyOrdered = (line: IbrInTransitModalLine) => Number(line.quantity) || 0;

  /** Mirrors order modal: completion for status strip uses all lines on the request. */
  const isRequestCompleteForStatus =
    hasLineItems && lines.every((line) => totalDeliveredAfterSave(line) >= lineQtyOrdered(line) - 1e-9);

  const isPartialFulfillment = hasLineItems && !isRequestCompleteForStatus;

  const totalItems = linesInScope.length;
  const fullyDeliveredItems = linesInScope.filter((line) => totalDeliveredAfterSave(line) >= lineQtyOrdered(line) - 1e-9)
    .length;

  const someRecv = fulfillmentData.some((f) => f.deliveredQuantity > 0);
  const canSubmit =
    (hasLineItems && someRecv) || (!hasLineItems && proofImageUrls.length > 0);

  const proofStorageFolder = `${IBR_DELIVERY_PROOFS_FOLDER}/${requestId || 'unknown'}`;

  const openProofGallery = () => setShowProofGallery(true);
  const handleProofGallerySelect = (urls: string[]) => {
    setProofImageUrls(urls);
    setShowProofGallery(false);
  };
  const removeProofUrl = (url: string) => {
    setProofImageUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (hasLineItems && !someRecv && proofImageUrls.length === 0) {
      alert('Enter a quantity received for at least one line, or attach proof if nothing is left in transit.');
      return;
    }
    void onConfirm(fulfillmentData, proofImageUrls);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ibr-delivery-title"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <div>
              <h2 id="ibr-delivery-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                Record delivery
              </h2>
              <p className="text-sm text-gray-600 mt-1">{ibrNumber}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {!hasLineItems && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-medium">Nothing left to receive on this pass</p>
                <p className="mt-1 text-amber-800/90">
                  Shipped amounts are already fully marked as received in the system. You can still attach proof of
                  delivery below, then confirm to save images, or close this dialog.
                </p>
              </div>
            )}

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

            {hasLineItems && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 mb-3">Request items</h3>
                {linesInScope.map((line) => {
                  const fulfillment = fulfillmentData.find((f) => f.itemId === line.id);
                  const deliveredQty = fulfillment?.deliveredQuantity || 0;
                  const orderedQty = fulfillment?.orderedQuantity || 0;
                  const fullReceipt = orderedQty > 0 && deliveredQty === orderedQty;
                  const totalForLine = totalDeliveredAfterSave(line);
                  const isLineOrderComplete = totalForLine >= lineQtyOrdered(line) - 1e-9;
                  const isLinePartial =
                    !isLineOrderComplete &&
                    (totalForLine > 0 ||
                      (orderedQty > 0 && deliveredQty > 0 && deliveredQty < orderedQty) ||
                      (fullReceipt && lineIsShortShipped(line)));

                  return (
                    <div
                      key={line.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isLineOrderComplete
                          ? 'bg-green-50 border-green-300'
                          : isLinePartial
                            ? 'bg-yellow-50 border-yellow-300'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{line.title}</h4>
                            {isLineOrderComplete && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                            {isLinePartial && <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />}
                          </div>
                          <p className="text-sm text-gray-600">{line.subtitle || '—'}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Requested: {fmtQty(line.quantity)} {line.unitLabel}
                            {line.quantity_shipped != null &&
                              ` · Shipped: ${fmtQty(line.quantity_shipped)} · Already received: ${fmtQty(line.quantity_delivered ?? 0)}`}
                          </p>
                          {!line.hasInventoryLink && (
                            <p className="mt-1 text-xs font-medium text-amber-700">No inventory link for this line</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex flex-col items-end">
                            <label className="mb-1 text-right text-xs font-medium text-gray-600">Received</label>
                            <div className="flex items-baseline gap-1.5">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                max={orderedQty}
                                value={inputValues[line.id] ?? String(deliveredQty)}
                                onChange={(e) => handleQuantityChange(line.id, e.target.value)}
                                onBlur={() => handleQuantityBlur(line.id)}
                                onWheel={(e) => e.currentTarget.blur()}
                                disabled={submitting || orderedQty === 0}
                                className="w-20 rounded-lg border-2 border-gray-300 px-3 py-2 text-center text-lg font-bold focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              />
                              <span className="text-sm font-bold text-gray-400">/</span>
                              <div className="flex min-w-[3.5rem] flex-col items-center">
                                <span className="text-lg font-bold leading-tight text-gray-900">{fmtQty(orderedQty)}</span>
                                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">max</span>
                              </div>
                            </div>
                            <p
                              className={`mt-1 max-w-[10rem] text-right text-[11px] ${
                                isLinePartial ? 'text-yellow-800' : isLineOrderComplete ? 'text-green-800' : 'text-gray-500'
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
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
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

            {isPartialFulfillment && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Partial Fulfillment</h4>
                  <p className="text-sm text-yellow-800">
                    This request will be marked as <strong>Partially Fulfilled</strong> because some items are not fully
                    received against the requested quantities yet.
                  </p>
                </div>
              </div>
            )}

            {isRequestCompleteForStatus && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Full Fulfillment</h4>
                  <p className="text-sm text-green-700">
                    All requested quantities are received. The request will be marked as <strong>Delivered</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
            >
              {submitting ? (
                'Saving…'
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  {!hasLineItems
                    ? 'Confirm'
                    : isPartialFulfillment
                      ? 'Mark as Partially Fulfilled'
                      : 'Mark as Delivered'}
                </>
              )}
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
