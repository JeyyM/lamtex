import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import {
  X,
  AlertTriangle,
  User,
  MessageSquare,
} from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';

interface CancelOrderModalProps {
  orderNumber: string;
  customerName: string;
  orderAmount: number;
  onClose: () => void;
  onConfirm: (cancellationData: CancellationData) => void;
}

export interface CancellationData {
  reason: string;
  initiatedBy: string;
  refundRequired: boolean;
  refundAmount: number;
  restockItems: boolean;
  notifyCustomer: boolean;
  additionalNotes: string;
  cancellationDate: string;
}

export function CancelOrderModal({
  orderNumber,
  customerName,
  orderAmount,
  onClose,
  onConfirm,
}: CancelOrderModalProps) {
  const { role, employeeName, session } = useAppContext();

  const actorName = employeeName || session?.user?.email || role || 'Unknown';

  const [refundRequired, setRefundRequired] = useState(false);
  /** Raw input so the field can stay empty until the user enters an amount (validated on submit). */
  const [refundAmountStr, setRefundAmountStr] = useState('');
  const [restockItems, setRestockItems] = useState(true);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let refundAmount = 0;
    if (refundRequired) {
      const trimmed = refundAmountStr.trim();
      if (trimmed === '') {
        alert('Please enter a refund amount.');
        return;
      }
      refundAmount = parseFloat(trimmed);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        alert('Please enter a valid refund amount.');
        return;
      }
      if (refundAmount > orderAmount) {
        alert('Refund amount cannot exceed order amount.');
        return;
      }
    }

    setIsSubmitting(true);

    const reason =
      additionalNotes.trim() !== '' ? additionalNotes.trim() : 'Order cancelled';

    const cancellationData: CancellationData = {
      reason,
      initiatedBy: actorName,
      refundRequired,
      refundAmount: refundRequired ? refundAmount : 0,
      restockItems,
      notifyCustomer,
      additionalNotes,
      cancellationDate: new Date().toISOString(),
    };

    onConfirm(cancellationData);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 lg:p-4">
      <Card className="w-full h-full max-h-screen overflow-y-auto rounded-none lg:rounded-xl lg:w-full lg:max-w-2xl lg:max-h-[90vh]">
        <CardHeader className="border-b border-gray-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-red-900">Cancel Order</CardTitle>
                <p className="text-sm text-red-700 mt-1">
                  Order {orderNumber} - {customerName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 md:p-6 space-y-6">
            {/* Warning Banner */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-1">
                    Cancellation Warning
                  </h4>
                  <p className="text-sm text-yellow-800">
                    This action will permanently cancel order <strong>{orderNumber}</strong> with a total amount of <strong>₱{orderAmount.toLocaleString()}</strong>. 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Order Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Order number</p>
                <p className="font-semibold text-gray-900">{orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-semibold text-gray-900">{customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Amount</p>
                <p className="font-semibold text-gray-900">₱{orderAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cancelled By</p>
                <p className="font-semibold text-gray-900">{actorName}</p>
              </div>
            </div>

            {/* Initiated By — read-only, locked to logged-in user */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Initiated By
              </label>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="font-medium">{actorName}</span>
              </div>
            </div>

            {/* Refund Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="refundRequired"
                  checked={refundRequired}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setRefundRequired(on);
                    if (!on) setRefundAmountStr('');
                  }}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="refundRequired" className="text-sm font-semibold text-gray-700">
                  Refund Required
                </label>
              </div>

              {refundRequired && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Amount (₱)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₱</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={refundAmountStr}
                      onChange={(e) => setRefundAmountStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum refund: ₱{orderAmount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Restock Items */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="restockItems"
                checked={restockItems}
                onChange={(e) => setRestockItems(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="restockItems" className="text-sm font-medium text-gray-700">
                Return items to inventory
                <span className="text-gray-500 ml-2 text-xs">
                  (if items have been allocated or picked)
                </span>
              </label>
            </div>

            {/* Notify Customer */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notifyCustomer"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="notifyCustomer" className="text-sm font-medium text-gray-700">
                Send cancellation notification to customer
              </label>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Notes (optional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Cancellation notes (stored as the cancellation reason if provided)…"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 w-full"
              >
                Keep Order
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Confirm Cancellation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
