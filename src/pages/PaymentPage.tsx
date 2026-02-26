import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { PaymentMethodType, PAYMENT_METHOD_CONFIGS, calculatePaymentFees, PaymentFeeBreakdown } from '@/src/types/payments';
import { 
  Building2, 
  FileText, 
  Calendar, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  Smartphone,
  Banknote,
  Wallet,
  Info,
} from 'lucide-react';
import lamtexLogo from '../assets/images.png';

export function PaymentPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedFees, setSelectedFees] = useState<PaymentFeeBreakdown | null>(null);

  // Mock payment link data (in production, fetch from API using token)
  const mockPaymentLink = {
    token: token || '',
    invoiceNumber: 'INV-2026-1001',
    customerName: 'Mega Hardware Center',
    invoiceAmount: 36550,
    issueDate: '2026-02-24',
    dueDate: '2026-03-27',
    items: [
      { description: '50 pcs UPVC Sanitary Pipe 4"x10ft', quantity: 50, unitPrice: 475, total: 23750 },
      { description: '20 pcs Portland Cement 40kg', quantity: 20, unitPrice: 640, total: 12800 },
    ],
    status: 'pending' as 'pending' | 'paid' | 'expired',
  };

  const handleMethodSelect = (method: PaymentMethodType) => {
    setSelectedMethod(method);
    const methodConfig = PAYMENT_METHOD_CONFIGS.find(m => m.method === method);
    if (methodConfig) {
      const fees = calculatePaymentFees(mockPaymentLink.invoiceAmount, methodConfig);
      setSelectedFees(fees);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedMethod || !selectedFees) return;
    
    // In production, this would redirect to payment gateway
    alert(
      `Processing ${selectedMethod} payment...\n\n` +
      `Invoice Amount: ₱${selectedFees.invoiceAmount.toLocaleString()}\n` +
      `Gateway Fee: ₱${selectedFees.gatewayFee.toLocaleString()}\n` +
      `Service Fee: ₱${selectedFees.serviceFee.toLocaleString()}\n` +
      `Total to Pay: ₱${selectedFees.totalAmount.toLocaleString()}\n\n` +
      `In production, you would be redirected to the payment gateway.`
    );
    
    // Simulate successful payment
    setTimeout(() => {
      navigate(`/payment-success/${token}`);
    }, 1000);
  };

  const getMethodIcon = (method: PaymentMethodType) => {
    switch (method) {
      case 'GCash':
      case 'Maya':
        return <Smartphone className="w-5 h-5" />;
      case 'Bank Transfer':
        return <Building2 className="w-5 h-5" />;
      case 'Credit Card':
      case 'Debit Card':
        return <CreditCard className="w-5 h-5" />;
      case 'Cash':
        return <Banknote className="w-5 h-5" />;
      default:
        return <Wallet className="w-5 h-5" />;
    }
  };

  if (mockPaymentLink.status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Already Received</h2>
            <p className="text-gray-600">This invoice has already been paid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={lamtexLogo} alt="LAMTEX Logo" className="h-16 w-auto" />
          </div>
        </div>

        {/* Invoice Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment Request</CardTitle>
              <Badge variant="warning">Pending Payment</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold text-gray-900">{mockPaymentLink.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bill To</p>
                  <p className="font-semibold text-gray-900">{mockPaymentLink.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Issue Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(mockPaymentLink.issueDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(mockPaymentLink.dueDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              {/* Invoice Items Toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between py-3 border-t border-gray-200 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <span>View Invoice Details</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDetails && (
                <div className="border-t border-gray-200 pt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-gray-600 font-medium">Description</th>
                        <th className="text-right py-2 text-gray-600 font-medium">Qty</th>
                        <th className="text-right py-2 text-gray-600 font-medium">Price</th>
                        <th className="text-right py-2 text-gray-600 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockPaymentLink.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-2">{item.description}</td>
                          <td className="text-right py-2">{item.quantity}</td>
                          <td className="text-right py-2">₱{item.unitPrice.toLocaleString()}</td>
                          <td className="text-right py-2 font-medium">₱{item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Amount Due */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-blue-900">Invoice Amount</span>
                  <span className="text-2xl font-bold text-blue-900">
                    ₱{mockPaymentLink.invoiceAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PAYMENT_METHOD_CONFIGS.filter(m => m.enabled).map((method) => {
                const fees = calculatePaymentFees(mockPaymentLink.invoiceAmount, method);
                const isSelected = selectedMethod === method.method;

                return (
                  <button
                    key={method.method}
                    onClick={() => handleMethodSelect(method.method)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getMethodIcon(method.method)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{method.method}</p>
                          <p className="text-xs text-gray-500">{method.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          ₱{fees.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          +₱{fees.totalFees.toLocaleString()} fees
                        </p>
                      </div>
                    </div>

                    {/* Fee Breakdown */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-red-200 space-y-1 text-sm">
                        <div className="flex justify-between text-gray-700">
                          <span>Invoice Amount:</span>
                          <span className="font-medium">₱{fees.invoiceAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Gateway Processing Fee:</span>
                          <span>₱{fees.gatewayFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Service Fee:</span>
                          <span>₱{fees.serviceFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-red-200 pt-1 mt-1 font-bold text-gray-900">
                          <span>Total to Pay:</span>
                          <span>₱{fees.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Fee Info */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">About Fees</p>
                <p className="text-blue-700">
                  Gateway processing fees are charged by payment providers. Service fees support our secure payment platform and instant reconciliation system.
                </p>
              </div>
            </div>

            {/* Proceed Button */}
            <Button
              variant="primary"
              disabled={!selectedMethod}
              onClick={handleProceedToPayment}
              className="w-full mt-6 py-3 text-lg"
            >
              {selectedMethod && selectedFees
                ? `Pay ₱${selectedFees.totalAmount.toLocaleString()} via ${selectedMethod}`
                : 'Select a payment method to continue'}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Secure payment powered by LAMTEX Payment System</p>
          <p className="mt-1">Questions? Contact your sales agent for assistance.</p>
        </div>
      </div>
    </div>
  );
}
