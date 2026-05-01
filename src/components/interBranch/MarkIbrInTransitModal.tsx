import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, Package } from 'lucide-react';

export type IbrInTransitModalLine = {
  id: string;
  line_kind: 'raw_material' | 'product';
  title: string;
  subtitle: string;
  unitLabel: string;
  quantity: number;
  quantity_shipped: number;
  quantity_delivered: number;
  hasInventoryLink: boolean;
};

export interface MarkIbrInTransitModalProps {
  isOpen: boolean;
  onClose: () => void;
  ibrNumber: string;
  lines: IbrInTransitModalLine[];
  submitting?: boolean;
  onConfirm: (rows: { itemId: string; shippedQuantity: number }[]) => void | Promise<void>;
}

function fmtQty(n: number) {
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function remainingToSend(line: IbrInTransitModalLine): number {
  const ordered = Number(line.quantity) || 0;
  const cum = Number(line.quantity_shipped) || 0;
  return Math.max(0, ordered - cum);
}

export function MarkIbrInTransitModal({
  isOpen,
  onClose,
  ibrNumber,
  lines,
  submitting = false,
  onConfirm,
}: MarkIbrInTransitModalProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      const next: Record<string, number> = {};
      const raw: Record<string, string> = {};
      lines.forEach((line) => {
        const rem = remainingToSend(line);
        next[line.id] = rem;
        raw[line.id] = rem === 0 ? '0' : fmtQty(rem);
      });
      setQuantities(next);
      setInputValues(raw);
    }
  }, [isOpen, lines]);

  if (!isOpen) return null;

  const parseShipInput = (value: string): number => {
    const n = parseFloat(value);
    if (Number.isNaN(n)) return NaN;
    return Math.max(0, n);
  };

  const setQty = (itemId: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [itemId]: value }));
    const n = parseShipInput(value);
    if (Number.isNaN(n)) return;
    const line = lines.find((i) => i.id === itemId);
    const cap = line ? remainingToSend(line) : 0;
    const clamped = Math.min(n, cap);
    setQuantities((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const onBlur = (itemId: string) => {
    const line = lines.find((i) => i.id === itemId);
    const cap = line ? remainingToSend(line) : 0;
    const rawVal = inputValues[itemId] ?? '';
    const n = parseShipInput(rawVal);
    const clamped = Number.isNaN(n) ? 0 : Math.min(Math.max(0, n), cap);
    setInputValues((prev) => ({ ...prev, [itemId]: clamped === 0 ? '0' : fmtQty(clamped) }));
    setQuantities((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const allLinesAlreadyShipped =
    lines.length > 0 && lines.every((line) => remainingToSend(line) <= 0);

  const handleSubmit = () => {
    const rows = lines.map((line) => ({
      itemId: line.id,
      shippedQuantity: quantities[line.id] ?? 0,
    }));
    const anyPositive = rows.some((r) => r.shippedQuantity > 0);
    if (!allLinesAlreadyShipped && !anyPositive) {
      alert('Enter a quantity to send for at least one line.');
      return;
    }
    if (allLinesAlreadyShipped && !anyPositive) {
      if (
        !window.confirm(
          'Shipped totals already cover every requested quantity. Continue to set this request to In Transit only? No additional stock will be deducted.',
        )
      ) {
        return;
      }
    }
    void onConfirm(rows);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50">
      <div className="flex min-h-dvh items-center justify-center p-4 py-8">
        <div
          className="w-full max-w-3xl max-h-[min(90dvh,900px)] overflow-y-auto overscroll-contain rounded-lg bg-white shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ibr-in-transit-title"
        >
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-amber-50 to-white p-6">
          <div>
            <h2 id="ibr-in-transit-title" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Truck className="h-6 w-6 text-amber-600" />
              Confirm in transit
            </h2>
            <p className="mt-1 text-sm text-gray-600">{ibrNumber}</p>
            <p className="mt-1 text-sm text-gray-500">
              Amounts below are for <strong>this</strong> shipment only. They add to each line&apos;s shipped total;
              you cannot send more than the remaining quantity on the request. If everything is already marked shipped
              but the status is still earlier (e.g. Ready), you can confirm with zeros to move to In Transit only.
            </p>
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

        <div className="p-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Quantity to send (this shipment)</h3>
            {lines.map((line) => {
              const v = quantities[line.id] ?? 0;
              const ordered = line.quantity;
              const shippedTot = line.quantity_shipped;
              const deliveredTot = line.quantity_delivered;
              const rem = remainingToSend(line);
              const kindLabel = line.line_kind === 'raw_material' ? 'Raw material' : 'Product';
              return (
                <div key={line.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Package className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          {kindLabel}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900">{line.title}</h4>
                      <p className="text-sm text-gray-600">{line.subtitle || '—'}</p>
                      <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                        <p>
                          <span className="text-gray-500">Requested:</span>{' '}
                          <span className="font-medium text-gray-800">
                            {fmtQty(ordered)} {line.unitLabel}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Shipped (total, all shipments):</span>{' '}
                          <span className="font-medium text-gray-800">
                            {fmtQty(shippedTot)} / {fmtQty(ordered)}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Received at requesting branch (total):</span>{' '}
                          <span className="font-medium text-gray-800">{fmtQty(deliveredTot)}</span>
                        </p>
                        <p className="text-gray-500">
                          Remaining to send:{' '}
                          <span className="font-semibold text-amber-900">
                            {fmtQty(rem)} {line.unitLabel}
                          </span>
                        </p>
                      </div>
                      {!line.hasInventoryLink && (
                        <p className="mt-1 text-xs font-medium text-amber-700">No inventory link for this line</p>
                      )}
                    </div>
                    <div className="flex flex-col items-stretch sm:items-end">
                      <label className="mb-1 text-xs text-gray-500">Send (this time)</label>
                      <div className="flex items-baseline justify-end gap-1.5 sm:gap-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          max={rem}
                          value={inputValues[line.id] ?? String(v)}
                          onChange={(e) => setQty(line.id, e.target.value)}
                          onBlur={() => onBlur(line.id)}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={submitting || rem === 0}
                          className="w-[5.5rem] rounded-lg border-2 border-gray-300 px-2 py-2 text-center text-lg font-bold focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <span className="text-lg font-bold text-gray-400">/</span>
                        <span className="min-w-[2.5rem] text-center text-lg font-bold text-gray-900 tabular-nums">
                          {fmtQty(rem)}
                        </span>
                      </div>
                      <span className="mt-0.5 text-[10px] text-gray-500">{line.unitLabel}</span>
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
                Confirm in transit
              </>
            )}
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
