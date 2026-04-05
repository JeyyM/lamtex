import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Package, User, Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';

interface OrderItem {
  productName: string;
  variantSize: string;
  variantDescription: string;
  quantity: number;
  basePrice: number;
  negotiatedPrice: number;
  discounts: Array<{ name: string; percentage: number }>;
  finalPrice: number;
  subtotal: number;
}

interface OrderApprovalModalProps {
  orderNumber: string;
  customer: string;
  agent: string;
  orderValue: number;
  requestedDiscount: number;
  deliveryDate: string;
  customerTrustRating: number; // 0-100
  hasOverdueBalance: boolean;
  overdueAmount?: number;
  items: OrderItem[];
  onClose: () => void;
}

export function OrderApprovalModal({
  orderNumber,
  customer,
  agent,
  orderValue,
  requestedDiscount,
  deliveryDate,
  customerTrustRating,
  hasOverdueBalance,
  overdueAmount,
  items,
  onClose,
}: OrderApprovalModalProps) {
  const navigate = useNavigate();

  const handleGoToOrder = () => {
    navigate(`/orders/${orderNumber}`);
    onClose();
  };

  const calculateOriginalTotal = () => {
    return items.reduce((sum, item) => sum + (item.negotiatedPrice * item.quantity), 0);
  };

  const getTrustRatingColor = (rating: number) => {
    if (rating >= 80) return 'text-green-600';
    if (rating >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrustRatingLabel = (rating: number) => {
    if (rating >= 80) return 'Excellent';
    if (rating >= 60) return 'Good';
    if (rating >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-50 to-rose-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600">{orderNumber}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGoToOrder}
                className="flex items-center gap-1 text-xs"
              >
                <ExternalLink className="w-3 h-3" />
                View Full Order
              </Button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-semibold text-gray-900">{customer}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Agent</p>
                <p className="font-semibold text-gray-900">{agent}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Required Delivery</p>
                <p className="font-semibold text-gray-900">{deliveryDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Customer Trust Rating</p>
                <div className="flex items-center gap-2">
                  <p className={`font-bold text-lg ${getTrustRatingColor(customerTrustRating)}`}>
                    {customerTrustRating}/100
                  </p>
                  <Badge 
                    variant={customerTrustRating >= 80 ? 'success' : customerTrustRating >= 60 ? 'warning' : 'danger'}
                    className="text-xs"
                  >
                    {getTrustRatingLabel(customerTrustRating)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Balance Alert */}
          {hasOverdueBalance && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900">Overdue Balance Warning</p>
                  <p className="text-sm text-red-700 mt-1">
                    This customer has an overdue balance of{' '}
                    <span className="font-bold">₱{(overdueAmount || 0).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Order Items</h3>
            </div>
            
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{item.productName}</span>
                        <Badge variant="default" className="text-xs">{item.variantSize}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{item.variantDescription}</p>
                      
                      <div className="flex items-center gap-3 text-sm">
                        <div className="text-gray-500">
                          Base: ₱{item.basePrice.toLocaleString()}/unit
                        </div>
                        {item.negotiatedPrice !== item.basePrice && (
                          <>
                            <div className="text-gray-400">•</div>
                            <div className="text-red-600 font-medium">
                              Custom: ₱{item.negotiatedPrice.toLocaleString()}/unit
                            </div>
                          </>
                        )}
                      </div>

                      {item.discounts && item.discounts.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-500 font-medium">Applied Discounts:</p>
                          {item.discounts.map((discount, dIdx) => {
                            // Calculate the price before this discount
                            const priceBeforeDiscount = item.discounts
                              .slice(0, dIdx)
                              .reduce(
                                (price, d) => price * (1 - d.percentage / 100),
                                item.negotiatedPrice
                              );
                            const priceAfterDiscount = priceBeforeDiscount * (1 - discount.percentage / 100);
                            const discountAmount = priceBeforeDiscount - priceAfterDiscount;

                            return (
                              <div key={dIdx} className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded border border-gray-200">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {discount.name} ({discount.percentage}%)
                                  </Badge>
                                </div>
                                <span className="text-red-600 font-medium">
                                  -₱{discountAmount.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-2 text-sm text-gray-600">
                        Qty: {item.quantity} × ₱{item.finalPrice.toLocaleString()}/unit
                      </div>
                    </div>

                    <div className="text-right">
                      {item.discounts && item.discounts.length > 0 && (
                        <div className="text-sm text-gray-400 line-through mb-1">
                          ₱{(item.negotiatedPrice * item.quantity).toLocaleString()}
                        </div>
                      )}
                      <div className="text-lg font-bold text-gray-900">
                        ₱{item.subtotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Summary */}
          <div className="border-t border-gray-300 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Original Total:</span>
              <span className="text-gray-500 line-through">₱{calculateOriginalTotal().toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Discount:</span>
              <span className="text-red-600 font-semibold">
                -₱{(calculateOriginalTotal() - orderValue).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xl font-bold">
              <span className="text-gray-900">Final Total:</span>
              <span className="text-gray-900">₱{orderValue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Button 
            variant="danger" 
            onClick={() => {
              alert(`Rejecting order ${orderNumber}`);
              onClose();
            }}
            className="flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </Button>
          <Button 
            variant="success" 
            onClick={() => {
              alert(`Approving order ${orderNumber}`);
              onClose();
            }}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
