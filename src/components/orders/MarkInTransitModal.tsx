import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, Package } from 'lucide-react';
import { OrderLineItem } from '@/src/types/orders';

export type MarkInTransitModalPurpose = 'markPacked' | 'inTransit';

export interface MarkInTransitModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  items: OrderLineItem[];
  submitting?: boolean;
  /** markPacked: Loading→Packed (record loaded qty). inTransit: Packed→In Transit (default). */
  purpose?: MarkInTransitModalPurpose;
  /** Per line, units on this shipment (added to cumulative quantity_shipped). */
  onConfirm: (rows: { itemId: string; shippedQuantity: number }[]) => void | Promise<void>;
}

function remainingToSend(line: OrderLineItem): number {
  const ordered = line.quantity;
  const cum = line.quantityShipped ?? 0;
  return Math.max(0, ordered - cum);
}

export function MarkInTransitModal({
  isOpen,
  onClose,
  orderNumber,
  items,
  submitting = false,
  purpose = 'inTransit',
  onConfirm,
}: MarkInTransitModalProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      const next: Record<string, number> = {};
      const raw: Record<string, string> = {};
      items.forEach((item) => {
        const rem = remainingToSend(item);
        const q = rem;
        next[item.id] = q;
        raw[item.id] = String(q);
      });
      setQuantities(next);
      setInputValues(raw);
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const isPacked = purpose === 'markPacked';
  const title = isPacked ? 'Record loaded quantities' : 'Confirm in transit';
  const hint = isPacked
    ? 'Enter what is loaded for this shipment. Stock is deducted and the order moves to Packed. You can send a follow-up shipment from Mark in transit if needed.'
    : "This shipment is added to the line's in-transit total. What you enter below is only for this send; limits are the remaining to fulfill the order line.";
  const sectionTitle = isPacked ? 'Quantity loaded (this shipment)' : 'Quantity to send (this shipment)';
  const inputLabel = isPacked ? 'Loaded (this time)' : 'Sent (this time)';
  const confirmLabel = isPacked ? 'Confirm packed' : 'Confirm in transit';

  const setQty = (itemId: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [itemId]: value }));
    const n = parseInt(value, 10);
    if (isNaN(n)) return;
    const line = items.find((i) => i.id === itemId);
    const cap = line ? remainingToSend(line) : 0;
    const clamped = Math.min(Math.max(0, n), cap);
    setQuantities((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const onBlur = (itemId: string) => {
    const line = items.find((i) => i.id === itemId);
    const cap = line ? remainingToSend(line) : 0;
    const raw = inputValues[itemId] ?? '';
    const n = parseInt(raw, 10);
    const clamped = isNaN(n) ? 0 : Math.min(Math.max(0, n), cap);
    setInputValues((prev) => ({ ...prev, [itemId]: String(clamped) }));
    setQuantities((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const handleSubmit = () => {
    const rows = items.map((item) => ({
      itemId: item.id,
      shippedQuantity: quantities[item.id] ?? 0,
    }));
    if (rows.every((r) => r.shippedQuantity <= 0)) {
      alert('Enter a quantity to send for at least one line.');
      return;
    }
    void onConfirm(rows);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-black/50 p-4">
      <div
        className="max-h-[min(90dvh,900px)] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="in-transit-title"
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-amber-50 to-white p-6">
          <div>
            <h2 id="in-transit-title" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Truck className="h-6 w-6 text-amber-600" />
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-600">Order #{orderNumber}</p>
            <p className="mt-1 text-sm text-gray-500">{hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="max-h-[calc(min(90dvh,900px)-200px)] overflow-y-auto p-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">{sectionTitle}</h3>
            {items.map((item) => {
              const v = quantities[item.id] ?? 0;
              const hasVariant = Boolean(item.variantId);
              const ordered = item.quantity;
              const delivered = item.quantityDelivered ?? 0;
              const rem = remainingToSend(item);
              return (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 shrink-0 text-gray-400" />
                        <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{item.variantDescription || '—'}</p>
                      <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                        <p>
                          <span className="text-gray-500">Ordered:</span>{' '}
                          <span className="font-medium text-gray-800">{ordered}</span>
                        </p>
                        <p>
                          <span className="text-gray-500">Delivered (total, all shipments):</span>{' '}
                          <span className="font-medium text-gray-800">
                            {delivered} / {ordered}
                          </span>
                        </p>
                        <p className="text-gray-500">
                          Remaining to send to complete the line:{' '}
                          <span className="font-semibold text-amber-900">{rem}</span>
                        </p>
                      </div>
                      {!hasVariant && (
                        <p className="mt-1 text-xs font-medium text-amber-700">No inventory link (variant missing)</p>
                      )}
                    </div>
                    <div className="flex flex-col items-stretch sm:items-end">
                      <label className="mb-1 text-xs text-gray-500">{inputLabel}</label>
                      <div className="flex items-baseline justify-end gap-1.5 sm:gap-2">
                        <input
                          type="number"
                          min={0}
                          max={rem}
                          value={inputValues[item.id] ?? String(v)}
                          onChange={(e) => setQty(item.id, e.target.value)}
                          onBlur={() => onBlur(item.id)}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={submitting || rem === 0}
                          className="w-[4.5rem] rounded-lg border-2 border-gray-300 px-2 py-2 text-center text-lg font-bold focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <span className="text-lg font-bold text-gray-400">/</span>
                        <span className="min-w-[2.5rem] text-center text-lg font-bold text-gray-900 tabular-nums">
                          {rem}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 p-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {submitting ? (
              'Saving…'
            ) : (
              <>
                <Truck className="h-5 w-5" />
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
