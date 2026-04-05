import React, { useState, useEffect } from 'react';
import { X, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { OrderLineItem } from '@/src/types/orders';

interface FulfillOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  items: OrderLineItem[];
  onFulfill: (fulfillmentData: FulfillmentData[]) => void;
}

export interface FulfillmentData {
  itemId: string;
  orderedQuantity: number;
  deliveredQuantity: number;
}

export function FulfillOrderModal({
  isOpen,
  onClose,
  orderNumber,
  items,
  onFulfill,
}: FulfillOrderModalProps) {
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentData[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Initialize fulfillment data with full quantities
      setFulfillmentData(
        items.map(item => ({
          itemId: item.id,
          orderedQuantity: item.quantity,
          deliveredQuantity: item.quantity, // Default to full delivery
        }))
      );
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setFulfillmentData(prev =>
      prev.map(item =>
        item.itemId === itemId
          ? { ...item, deliveredQuantity: Math.min(Math.max(0, numValue), item.orderedQuantity) }
          : item
      )
    );
  };

  const handleFulfill = () => {
    onFulfill(fulfillmentData);
    onClose();
  };

  const isFullFulfillment = fulfillmentData.every(
    item => item.deliveredQuantity === item.orderedQuantity
  );

  const isPartialFulfillment = !isFullFulfillment;

  const totalItems = items.length;
  const fullyDeliveredItems = fulfillmentData.filter(
    item => item.deliveredQuantity === item.orderedQuantity
  ).length;

  return (
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
          {/* Summary Stats */}
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

          {/* Items List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
            {items.map((item, index) => {
              const fulfillment = fulfillmentData.find(f => f.itemId === item.id);
              const deliveredQty = fulfillment?.deliveredQuantity || 0;
              const orderedQty = fulfillment?.orderedQuantity || item.quantity;
              const isFullyDelivered = deliveredQty === orderedQty;
              const isPartial = deliveredQty > 0 && deliveredQty < orderedQty;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isFullyDelivered
                      ? 'bg-green-50 border-green-300'
                      : isPartial
                      ? 'bg-orange-50 border-orange-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                        {isFullyDelivered && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {isPartial && (
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{item.variantDescription}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Unit Price: ₱{item.unitPrice.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Delivered Quantity Input */}
                      <div className="flex flex-col items-end">
                        <label className="text-xs text-gray-500 mb-1">Delivered</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={orderedQty}
                            value={deliveredQty}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center font-bold text-lg focus:border-blue-500 focus:outline-none"
                          />
                          <span className="text-gray-400 font-bold">/</span>
                          <span className="text-lg font-bold text-gray-900 w-16 text-center">
                            {orderedQty}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {isFullyDelivered
                            ? 'Complete ✓'
                            : isPartial
                            ? `${orderedQty - deliveredQty} short`
                            : 'Not delivered'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fulfillment Status Alert */}
          {isPartialFulfillment && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-900 mb-1">Partial Fulfillment</h4>
                <p className="text-sm text-orange-700">
                  This order will be marked as <strong>Partially Fulfilled</strong> because some items
                  are not being delivered in full quantity.
                </p>
              </div>
            </div>
          )}

          {isFullFulfillment && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900 mb-1">Full Fulfillment</h4>
                <p className="text-sm text-green-700">
                  All items will be delivered in full. The order will be marked as <strong>Delivered</strong>.
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
            {isPartialFulfillment ? 'Mark as Partially Fulfilled' : 'Mark as Delivered'}
          </button>
        </div>
      </div>
    </div>
  );
}
