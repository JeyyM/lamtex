import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { CheckCircle, Download, Mail, MessageSquare, FileText, Calendar, CreditCard } from 'lucide-react';

export function PaymentSuccessPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // Mock receipt data (in production, fetch from API)
  const mockReceipt = {
    receiptNumber: 'REC-2026-001234',
    invoiceNumber: 'INV-2026-1001',
    orderNumber: 'ORD-2026-1001',
    customerName: 'Mega Hardware Center',
    customerEmail: 'megahardware@example.com',
    customerPhone: '0917-XXX-XXXX',
    paymentDate: new Date().toISOString(),
    paymentMethod: 'GCash',
    gatewayReference: 'GCASH-2026-XYZ789',
    invoiceAmount: 36550,
    gatewayFee: 548.25,
    serviceFee: 473.88, // LAMTEX's revenue
    totalFees: 1022.13,
    totalPaid: 37572.13,
    receiptUrl: `/receipt/${token}`,
  };

  const handleDownloadReceipt = () => {
    alert('Downloading receipt PDF...\n\nIn production, this would download the actual PDF file.');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Your payment has been processed successfully</p>
        </div>

        {/* Receipt Card */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Receipt Number</p>
                  <p className="text-xl font-bold text-gray-900">{mockReceipt.receiptNumber}</p>
                </div>
                <Badge variant="success" className="text-sm px-4 py-2">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Paid
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Invoice Number</p>
                  <p className="font-semibold text-gray-900">{mockReceipt.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600">Order Number</p>
                  <p className="font-semibold text-gray-900">{mockReceipt.orderNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(mockReceipt.paymentDate).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Method</p>
                  <p className="font-semibold text-gray-900">{mockReceipt.paymentMethod}</p>
                </div>
              </div>
            </div>

            {/* Amount Breakdown */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-700">
                <span>Invoice Amount</span>
                <span className="font-medium">₱{mockReceipt.invoiceAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Gateway Processing Fee</span>
                <span>₱{mockReceipt.gatewayFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Service Fee</span>
                <span>₱{mockReceipt.serviceFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold text-gray-900">
                <span>Total Paid</span>
                <span>₱{mockReceipt.totalPaid.toLocaleString()}</span>
              </div>
            </div>

            {/* Reference Number */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 font-medium mb-1">Gateway Reference Number</p>
              <p className="text-lg font-mono font-bold text-blue-900">{mockReceipt.gatewayReference}</p>
              <p className="text-xs text-blue-700 mt-2">
                Save this reference number for your records
              </p>
            </div>

            {/* Receipt Delivery Status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-900">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Receipt sent to: {mockReceipt.customerEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-green-900">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Receipt sent via SMS to: {mockReceipt.customerPhone}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            variant="primary"
            onClick={handleDownloadReceipt}
            className="w-full gap-2 py-3 text-lg"
          >
            <Download className="w-5 h-5" />
            Download Receipt (PDF)
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.open(mockReceipt.receiptUrl, '_blank')}
            className="w-full gap-2 py-3"
          >
            <FileText className="w-5 h-5" />
            View Receipt Online
          </Button>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center space-y-2 text-sm text-gray-600">
          <p>Thank you for your payment!</p>
          <p>Your order will be processed and delivered according to the agreed schedule.</p>
          <p className="text-xs mt-4">
            Questions? Contact your sales agent or LAMTEX customer service.
          </p>
        </div>
      </div>
    </div>
  );
}
