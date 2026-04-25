import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Factory, CheckCircle, AlertTriangle } from 'lucide-react';

export type ProductionLineRow = {
  id: string;
  productName: string;
  variantLabel: string;
  targetQuantity: number;
  currentCompleted: number;
};

export type ProductionLineResult = {
  itemId: string;
  targetQuantity: number;
  producedQuantity: number;
};

type RecordProductionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  prNumber: string;
  lines: ProductionLineRow[];
  onConfirm: (data: ProductionLineResult[]) => void;
  saving?: boolean;
};

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function parseQty(raw: string): number | null {
  const t = raw.trim();
  if (t === '' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function RecordProductionModal({
  isOpen,
  onClose,
  prNumber,
  lines,
  onConfirm,
  saving = false,
}: RecordProductionModalProps) {
  const [values, setValues] = useState<ProductionLineResult[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const v = lines.map((line) => {
      const target = line.targetQuantity;
      const current = clamp(line.currentCompleted, 0, target);
      return {
        itemId: line.id,
        targetQuantity: target,
        producedQuantity: current,
      };
    });
    setValues(v);
    setInputValues(
      Object.fromEntries(v.map((d) => [d.itemId, String(d.producedQuantity)])),
    );
  }, [isOpen, lines]);

  if (!isOpen) return null;

  const setProduced = (itemId: string, produced: number, target: number) => {
    const p = clamp(produced, 0, target);
    setValues((prev) =>
      prev.map((x) => (x.itemId === itemId ? { ...x, producedQuantity: p } : x)),
    );
    setInputValues((iv) => ({ ...iv, [itemId]: String(p) }));
  };

  const handleChange = (itemId: string, target: number, raw: string) => {
    setInputValues((iv) => ({ ...iv, [itemId]: raw }));
    const n = parseQty(raw);
    if (n != null) {
      setProduced(itemId, n, target);
    }
  };

  const handleBlur = (itemId: string, target: number) => {
    const raw = inputValues[itemId] ?? '';
    const n = parseQty(raw);
    const p = n == null ? 0 : clamp(n, 0, target);
    setProduced(itemId, p, target);
  };

  const handleConfirm = () => {
    onConfirm(values);
  };

  const isFull = values.every(
    (v) => v.producedQuantity + 1e-9 >= v.targetQuantity,
  );
  const isPartial = values.length > 0 && !isFull;

  const fullLines = values.filter(
    (v) => v.producedQuantity + 1e-9 >= v.targetQuantity,
  ).length;

  const el = (
    <div
      className="fixed inset-0 z-[100] flex min-h-[100dvh] w-full items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Factory className="w-6 h-6 text-emerald-600" />
              Record production
            </h2>
            <p className="text-sm text-gray-600 mt-1">{prNumber}</p>
            <p className="text-xs text-gray-500 mt-1">
              Enter how much was produced for each line. Stays in progress if any line is under target.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            disabled={saving}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-sm text-emerald-700 font-medium mb-1">Lines</div>
              <div className="text-2xl font-bold text-emerald-900">{lines.length}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-medium mb-1">Fully produced</div>
              <div className="text-2xl font-bold text-green-900">
                {fullLines} / {lines.length}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Products</h3>
            {lines.map((line) => {
              const row = values.find((v) => v.itemId === line.id);
              const produced = row?.producedQuantity ?? 0;
              const target = line.targetQuantity;
              const done = produced + 1e-9 >= target;
              const partial = produced > 0 && !done;

              return (
                <div
                  key={line.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    done
                      ? 'bg-green-50 border-green-300'
                      : partial
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{line.productName}</h4>
                        {done && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                        {partial && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                      </div>
                      <p className="text-sm text-gray-600">{line.variantLabel}</p>
                    </div>

                    <div className="flex flex-col items-end">
                      <label className="text-xs text-gray-500 mb-1">Produced</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={inputValues[line.id] ?? String(produced)}
                          onChange={(e) => handleChange(line.id, target, e.target.value)}
                          onBlur={() => handleBlur(line.id, target)}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={saving}
                          className="w-24 px-3 py-2 border-2 border-gray-300 rounded-lg text-center font-bold text-lg focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                        />
                        <span className="text-gray-400 font-bold">/</span>
                        <span className="text-lg font-bold text-gray-900 w-20 text-right tabular-nums">
                          {Number(target).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right max-w-[200px]">
                        {done
                          ? 'Target met ✓'
                          : target - produced > 0
                            ? `${Number((target - produced).toFixed(4))} remaining`
                            : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isPartial && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Partial production</h4>
                <p className="text-sm text-amber-800">
                  The request will stay <strong>In progress</strong> until every line meets its
                  target. Quantities you enter are saved as produced to date.
                </p>
              </div>
            </div>
          )}

          {isFull && lines.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900 mb-1">All targets met</h4>
                <p className="text-sm text-green-800">
                  The request will be marked <strong>Completed</strong> when you confirm.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            {saving ? (
              <span>Saving…</span>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {isPartial ? 'Save quantities' : 'Mark complete'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(el, document.body);
}
