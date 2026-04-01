import React, { useState } from 'react';
import { X, Plus, Minus, Package, AlertCircle, CheckCircle, User } from 'lucide-react';

type AdjustmentType = 'add' | 'subtract';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    sku?: string;
    code?: string;
    currentStock: number;
    unit: string;
    location?: string;
    reorderPoint?: number;
  };
  onAdjust: (adjustment: {
    type: AdjustmentType;
    quantity: number;
    notes: string;
  }) => void;
  itemType: 'finished-good' | 'raw-material';
}

export default function StockAdjustmentModal({ 
  isOpen, 
  onClose, 
  item, 
  onAdjust,
  itemType 
}: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPreConfirmation, setShowPreConfirmation] = useState(false);

  if (!isOpen) return null;

  const numericQuantity = parseFloat(quantity) || 0;
  const newStock = adjustmentType === 'add' 
    ? item.currentStock + numericQuantity 
    : item.currentStock - numericQuantity;

  const isValidAdjustment = numericQuantity > 0 && 
    (adjustmentType === 'add' || numericQuantity <= item.currentStock);

  const stockChange = adjustmentType === 'add' ? `+${numericQuantity}` : `-${numericQuantity}`;
  const stockChangeColor = adjustmentType === 'add' ? 'text-green-600' : 'text-red-600';

  const handleSubmit = () => {
    if (!isValidAdjustment) return;
    
    onAdjust({
      type: adjustmentType,
      quantity: numericQuantity,
      notes,
    });

    // Reset form
    setQuantity('');
    setNotes('');
    setShowPreConfirmation(false);
    setShowConfirmation(true);

    // Auto-close after success
    setTimeout(() => {
      setShowConfirmation(false);
      onClose();
    }, 2000);
  };

  const handleConfirmClick = () => {
    if (!isValidAdjustment) return;
    setShowPreConfirmation(true);
  };

  const handleQuickAmount = (amount: number) => {
    setQuantity(amount.toString());
  };

  const handleClose = () => {
    setShowPreConfirmation(false);
    setShowConfirmation(false);
    setQuantity('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-red-600" />
              Adjust Stock Quantity
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {itemType === 'finished-good' ? 'Finished Good' : 'Raw Material'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showConfirmation ? (
          /* Success Message */
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Stock Adjusted Successfully!
            </h3>
            <p className="text-gray-600">
              {item.name} stock has been updated.
            </p>
          </div>
        ) : showPreConfirmation ? (
          /* Pre-Confirmation Modal */
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Stock Adjustment
              </h3>
              <p className="text-gray-600">
                Please review the changes before confirming
              </p>
            </div>

            {/* Item Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
              <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
              <p className="text-sm text-gray-600">{item.sku || item.code}</p>
            </div>

            {/* Stock Change Summary */}
            <div className="space-y-4 mb-6">
              {/* Current Stock */}
              <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Current Stock</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {item.currentStock} <span className="text-base font-normal text-gray-600">{item.unit}</span>
                  </p>
                </div>
              </div>

              {/* Adjustment Arrow */}
              <div className="flex items-center justify-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  adjustmentType === 'add' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {adjustmentType === 'add' ? (
                    <Plus className="w-4 h-4 text-green-600" />
                  ) : (
                    <Minus className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    adjustmentType === 'add' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {adjustmentType === 'add' ? '+' : '-'}{numericQuantity} {item.unit}
                  </span>
                </div>
              </div>

              {/* New Stock */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg">
                <div>
                  <p className="text-sm text-red-700 font-medium">New Stock</p>
                  <p className="text-2xl font-bold text-red-900">
                    {newStock} <span className="text-base font-normal text-red-700">{item.unit}</span>
                  </p>
                </div>
                {newStock < (item.reorderPoint || 0) && (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>

            {/* Notes Preview */}
            {notes && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700">{notes}</p>
                </div>
              </div>
            )}

            {/* Warning if low stock */}
            {newStock < (item.reorderPoint || 0) && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Low Stock Warning</p>
                  <p>New stock level will be below reorder point ({item.reorderPoint} {item.unit})</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPreConfirmation(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Item Information */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 break-words">{item.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.sku || item.code} {item.location && `• ${item.location}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">Current Stock</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {item.currentStock}
                    <span className="text-sm font-normal text-gray-600 ml-1">{item.unit}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Adjustment Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Adjustment Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentType('add');
                  }}
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
                  onClick={() => {
                    setAdjustmentType('subtract');
                  }}
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

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to {adjustmentType === 'add' ? 'Add' : 'Subtract'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="Enter quantity..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  {item.unit}
                </span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs text-gray-600 self-center mr-2">Quick:</span>
                {[10, 25, 50, 100, 250, 500].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleQuickAmount(amount)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    {amount}
                  </button>
                ))}
              </div>

              {/* Stock Preview */}
              {numericQuantity > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-700">Current: </span>
                      <span className="font-semibold text-gray-900">{item.currentStock} {item.unit}</span>
                    </div>
                    <div className={`font-semibold ${stockChangeColor}`}>
                      {stockChange} {item.unit}
                    </div>
                    <div>
                      <span className="text-gray-700">New: </span>
                      <span className="font-semibold text-gray-900">{newStock} {item.unit}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Warning */}
              {adjustmentType === 'subtract' && numericQuantity > item.currentStock && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-900">Cannot subtract more than available stock</p>
                    <p className="text-red-700 mt-1">
                      Maximum subtraction: {item.currentStock} {item.unit}
                    </p>
                  </div>
                </div>
              )}

              {/* Low Stock Warning */}
              {adjustmentType === 'subtract' && 
               item.reorderPoint && 
               newStock > 0 && 
               newStock <= item.reorderPoint && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-900">Low Stock Warning</p>
                    <p className="text-yellow-700 mt-1">
                      New stock level ({newStock} {item.unit}) will be at or below reorder point ({item.reorderPoint} {item.unit})
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes / Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes / Reason <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this adjustment..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
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
                onClick={handleConfirmClick}
                disabled={!isValidAdjustment}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  isValidAdjustment
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Confirm Adjustment
              </button>
            </div>

            {/* Audit Info */}
            <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
              <User className="w-3.5 h-3.5" />
              <span>This adjustment will be logged in the audit trail with your user ID and timestamp</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
