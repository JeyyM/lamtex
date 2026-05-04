import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Package, AlertCircle, CheckCircle, User, Factory } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { computeStockStatus } from '@/src/lib/stockStatus';
import { applyBomConsumptionDeductions, validateBomConsumption } from '@/src/lib/bomConsumption';
import { refreshParentProductStatus } from '@/src/lib/productAggregateStatus';
import { insertProductLog } from '@/src/lib/domainActivityLog';

type AdjustmentType = 'add' | 'subtract';

export type ProductStockAdjustmentSuccess = {
  variantId: string;
  newDisplayedStock: number;
};

interface ProductStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result?: ProductStockAdjustmentSuccess) => void;
  variant: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    reorderPoint: number;
  };
  productId: string;
  branch: string;
  performedBy: string;
  performedByRole: string;
}

export default function ProductStockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  variant,
  productId,
  branch,
  performedBy,
  performedByRole,
}: ProductStockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'form' | 'confirm' | 'success'>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [consumeRawMaterials, setConsumeRawMaterials] = useState(true);
  /** Shown on success screen (branch math may differ slightly from preview newStock) */
  const [savedDisplayStock, setSavedDisplayStock] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setConsumeRawMaterials(adjustmentType === 'add');
  }, [isOpen, adjustmentType]);

  if (!isOpen) return null;

  const unitsInt = Math.max(0, Math.round(Number(quantity) || 0));
  const newStock =
    adjustmentType === 'add' ? variant.currentStock + unitsInt : variant.currentStock - unitsInt;
  const isValid =
    unitsInt > 0 && (adjustmentType === 'add' || unitsInt <= variant.currentStock);

  const handleClose = () => {
    setAdjustmentType('add');
    setQuantity('');
    setNotes('');
    setSaving(false);
    setView('form');
    setErrorMsg('');
    setConsumeRawMaterials(true);
    setSavedDisplayStock(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    const qty = unitsInt;
    setSaving(true);
    setErrorMsg('');
    try {
      const branchName = branch?.trim() ?? '';
      let newDisplayedStock = newStock;

      if (branchName) {
        const { data: branchRow, error: brErr } = await supabase
          .from('branches')
          .select('id')
          .eq('name', branchName)
          .maybeSingle();
        if (brErr) throw brErr;

        if (!branchRow?.id) {
          throw new Error(
            `Branch "${branchName}" was not found in the database. Stock was not updated — check branch name spelling.`,
          );
        }

        const branchId = branchRow.id;

        if (adjustmentType === 'add' && consumeRawMaterials) {
          await validateBomConsumption(variant.id, branchId, qty);
        }

        const { data: existingRows, error: exErr } = await supabase
          .from('product_variant_stock')
          .select('branch_id, quantity')
          .eq('variant_id', variant.id);
        if (exErr) throw exErr;

        const existing = (existingRows ?? []).find(r => r.branch_id === branchId);
        const prevBranchQty = existing ? Number(existing.quantity) : Number(variant.currentStock);

        if (adjustmentType === 'subtract' && qty > prevBranchQty) {
          throw new Error(`Cannot subtract more than branch stock (${prevBranchQty} units).`);
        }

        newDisplayedStock =
          adjustmentType === 'add' ? prevBranchQty + qty : Math.max(0, prevBranchQty - qty);
        newDisplayedStock = Math.max(0, Math.round(newDisplayedStock));

        const { error: upsertErr } = await supabase.from('product_variant_stock').upsert(
          {
            variant_id: variant.id,
            branch_id: branchId,
            quantity: newDisplayedStock,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'variant_id,branch_id' },
        );
        if (upsertErr) throw upsertErr;

        const { data: sumRows, error: sumErr } = await supabase
          .from('product_variant_stock')
          .select('quantity')
          .eq('variant_id', variant.id);
        if (sumErr) throw sumErr;
        const sumTotal = (sumRows ?? []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
        const newStatus = computeStockStatus(sumTotal, variant.reorderPoint);

        const varPayload: Record<string, unknown> = { total_stock: sumTotal, status: newStatus };
        if (adjustmentType === 'add') {
          varPayload.last_restocked = new Date().toISOString();
        }
        const { error: varErr } = await supabase.from('product_variants').update(varPayload).eq('id', variant.id);
        if (varErr) throw varErr;

        if (adjustmentType === 'add' && consumeRawMaterials) {
          await applyBomConsumptionDeductions(variant.id, branchId, qty);
        }
      } else {
        const newTotal = Math.max(0, Math.round(newStock));
        const st = computeStockStatus(newTotal, variant.reorderPoint);
        const varPayloadGlobal: Record<string, unknown> = { total_stock: newTotal, status: st };
        if (adjustmentType === 'add') {
          varPayloadGlobal.last_restocked = new Date().toISOString();
        }
        const { error: varErr } = await supabase.from('product_variants').update(varPayloadGlobal).eq('id', variant.id);
        if (varErr) throw varErr;
        newDisplayedStock = newTotal;
      }

      await insertProductLog(supabase, {
        productId,
        variantId: variant.id,
        action: 'stock_adjusted',
        description: `${adjustmentType === 'add' ? 'Added' : 'Removed'} ${qty} units — ${variant.sku}${
          branchName ? ` (${branchName})` : ''
        }${notes.trim() ? `. ${notes.trim()}` : ''}`,
        performedBy,
        performedByRole,
        oldValue: { total_stock: variant.currentStock },
        newValue: { total_stock: newDisplayedStock },
        metadata: {
          adjustment_type: adjustmentType,
          branch: branchName || null,
          consume_raw_materials: adjustmentType === 'add' ? consumeRawMaterials : false,
        },
      });

      await refreshParentProductStatus(productId, { performedBy, performedByRole });

      setSavedDisplayStock(newDisplayedStock);
      onSuccess?.({ variantId: variant.id, newDisplayedStock });
      setView('success');
      setTimeout(() => {
        handleClose();
      }, 1600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to adjust stock';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (view === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Stock Adjusted Successfully!</h3>
          <p className="text-gray-600">
            {variant.name} stock has been updated to{' '}
            <strong>{savedDisplayStock ?? newStock} units</strong>.
          </p>
        </div>
      </div>
    );
  }

  if (view === 'confirm') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-red-600" />
                Confirm Stock Adjustment
              </h2>
              <p className="text-sm text-gray-600 mt-1">Product Variant</p>
            </div>
            <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-100 rounded-full mb-3">
                <AlertCircle className="w-7 h-7 text-yellow-600" />
              </div>
              <p className="text-gray-600 text-sm">Please review the changes before confirming.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900">{variant.name}</h4>
              <p className="text-sm text-gray-500 mt-0.5">
                SKU: {variant.sku}
                {branch?.trim() ? ` · ${branch.trim()}` : ''}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Current Stock</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {variant.currentStock} <span className="text-base font-normal text-gray-500">units</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                    adjustmentType === 'add' ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  {adjustmentType === 'add' ? (
                    <Plus className="w-4 h-4 text-green-600" />
                  ) : (
                    <Minus className="w-4 h-4 text-red-600" />
                  )}
                  <span
                    className={`font-semibold ${
                      adjustmentType === 'add' ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {adjustmentType === 'add' ? '+' : '-'}
                    {unitsInt} units
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg">
                <div>
                  <p className="text-sm text-red-700 font-medium">New Stock</p>
                  <p className="text-2xl font-bold text-red-900">
                    {newStock} <span className="text-base font-normal text-red-700">units</span>
                  </p>
                </div>
                {newStock < variant.reorderPoint && <AlertCircle className="w-6 h-6 text-red-600" />}
              </div>
            </div>

            {adjustmentType === 'add' && consumeRawMaterials && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <Factory className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">
                  Raw materials at this branch will drop by BOM × <strong>{unitsInt}</strong> units.
                </p>
              </div>
            )}

            {notes && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                <span className="font-medium">Notes: </span>
                {notes}
              </div>
            )}

            {newStock < variant.reorderPoint && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Low Stock Warning</p>
                  <p>New level will be below reorder point ({variant.reorderPoint} units)</p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errorMsg}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setView('form')}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-red-600" />
              Adjust Stock Quantity
            </h2>
            <p className="text-sm text-gray-600 mt-1">Product Variant</p>
          </div>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 break-words">{variant.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  SKU: {variant.sku}
                  {branch?.trim() ? ` · ${branch.trim()}` : ' · All branches (total)'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-500">Current Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {variant.currentStock}
                  <span className="text-sm font-normal text-gray-600 ml-1">units</span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  adjustmentType === 'add'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Add Stock</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  adjustmentType === 'subtract'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-red-300'
                }`}
              >
                <Minus className="w-5 h-5" />
                <span className="font-semibold">Subtract Stock</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to {adjustmentType === 'add' ? 'Add' : 'Subtract'}
            </label>
            <div className="relative">
              <input
                type="number"
                min={adjustmentType === 'add' ? '0.0001' : '1'}
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                onWheel={e => e.currentTarget.blur()}
                placeholder="Enter quantity…"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">units</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-gray-600 self-center mr-1">Quick:</span>
              {[10, 25, 50, 100, 250, 500].map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setQuantity(a.toString())}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {a}
                </button>
              ))}
            </div>

            {unitsInt > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                  <div>
                    <span className="text-gray-600">Current: </span>
                    <span className="font-semibold text-gray-900">{variant.currentStock} units</span>
                  </div>
                  <div className={`font-semibold ${adjustmentType === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                    {adjustmentType === 'add' ? '+' : '-'}
                    {unitsInt} units
                  </div>
                  <div>
                    <span className="text-gray-600">New: </span>
                    <span className="font-semibold text-gray-900">{newStock} units</span>
                  </div>
                </div>
              </div>
            )}

            {adjustmentType === 'subtract' && unitsInt > variant.currentStock && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-900">Cannot subtract more than available stock</p>
                  <p className="text-red-700 mt-1">Maximum: {variant.currentStock} units</p>
                </div>
              </div>
            )}

            {adjustmentType === 'subtract' &&
              unitsInt > 0 &&
              newStock >= 0 &&
              newStock <= variant.reorderPoint && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-900">Low Stock Warning</p>
                    <p className="text-yellow-700 mt-1">
                      New level ({newStock} units) will be at or below reorder point ({variant.reorderPoint}{' '}
                      units)
                    </p>
                  </div>
                </div>
              )}
          </div>

          {adjustmentType === 'add' && branch?.trim() && (
            <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-amber-50/50 cursor-pointer">
              <input
                type="checkbox"
                className="flex-shrink-0 rounded border-gray-300 text-red-600 focus:ring-red-500"
                checked={consumeRawMaterials}
                onChange={e => setConsumeRawMaterials(e.target.checked)}
              />
              <span>
                <span className="font-medium text-gray-900 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-amber-700" />
                  Consume raw materials (production)
                </span>
                <span className="text-sm text-gray-600 block mt-1">
                  Lowers raw material stock at <strong>{branch.trim()}</strong> by the BOM amount for each unit you add.
                </span>
              </span>
            </label>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes about this adjustment…"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setView('confirm')}
              disabled={!isValid}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                isValid ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirm Adjustment
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <User className="w-3.5 h-3.5" />
            <span>This adjustment will be logged in the audit trail with your user ID and timestamp.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
