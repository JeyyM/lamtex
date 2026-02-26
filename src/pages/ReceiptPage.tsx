import React from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { CheckCircle, Download, Printer } from 'lucide-react';
import lamtexLogo from '../assets/images.png';

export function ReceiptPage() {
  const { id } = useParams<{ id: string }>();

  // Mock receipt data (in production, fetch from API)
  const mockReceipt = {
    receiptNumber: 'REC-2026-001234',
    invoiceNumber: 'INV-2026-1001',
    orderNumber: 'ORD-2026-1001',
    
    // Customer
    customerName: 'Mega Hardware Center',
    customerAddress: '123 Hardware Street, Makati City, Metro Manila',
    customerContact: '(02) 123-4567',
    customerEmail: 'megahardware@example.com',
    
    // Payment details
    paymentDate: '2026-02-26T14:45:00',
    paymentMethod: 'GCash',
    gatewayReference: 'GCASH-2026-XYZ789',
    
    // Amounts
    invoiceAmount: 36550.00,
    gatewayFee: 548.25,
    serviceFee: 473.88,
    totalFees: 1022.13,
    totalPaid: 37572.13,
    
    // Invoice items
    items: [
      { description: '50 pcs UPVC Sanitary Pipe 4"x10ft', quantity: 50, unitPrice: 475.00, total: 23750.00 },
      { description: '20 pcs Portland Cement 40kg', quantity: 20, unitPrice: 640.00, total: 12800.00 },
    ],
    
    // Company details
    companyName: 'LAMTEX Construction Supplies',
    companyAddress: '456 Industrial Ave, Quezon City, Metro Manila',
    companyPhone: '(02) 987-6543',
    companyEmail: 'info@lamtex.com',
    
    generatedAt: '2026-02-26T14:45:30',
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert('Downloading PDF receipt...\n\nIn production, this would download the actual PDF file.');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Action Bar (hidden when printing) */}
        <div className="flex gap-3 mb-6 print:hidden">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Print Receipt
          </Button>
          <Button variant="primary" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>

        {/* Receipt Container */}
        <div className="bg-white rounded-lg shadow-lg p-12 print:shadow-none">
          {/* Header */}
          <div className="border-b-4 border-red-600 pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <img src={lamtexLogo} alt="LAMTEX Logo" className="h-16 w-auto" />
                </div>
                <p className="text-sm text-gray-600">{mockReceipt.companyAddress}</p>
                <p className="text-sm text-gray-600">{mockReceipt.companyPhone} • {mockReceipt.companyEmail}</p>
              </div>
              <div className="text-right">
                <Badge variant="success" className="mb-3">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  PAID
                </Badge>
                <h2 className="text-2xl font-bold text-gray-900">RECEIPT</h2>
                <p className="text-sm text-gray-600 mt-1">#{mockReceipt.receiptNumber}</p>
              </div>
            </div>
          </div>

          {/* Payment and Customer Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">BILL TO</h3>
              <p className="font-semibold text-gray-900 text-lg">{mockReceipt.customerName}</p>
              <p className="text-sm text-gray-600 mt-1">{mockReceipt.customerAddress}</p>
              <p className="text-sm text-gray-600">{mockReceipt.customerContact}</p>
              <p className="text-sm text-gray-600">{mockReceipt.customerEmail}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">PAYMENT DETAILS</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Date:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(mockReceipt.paymentDate).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium text-gray-900">{mockReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-medium text-gray-900">{mockReceipt.gatewayReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice #:</span>
                  <span className="font-medium text-gray-900">{mockReceipt.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order #:</span>
                  <span className="font-medium text-gray-900">{mockReceipt.orderNumber}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">INVOICE ITEMS</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 text-sm font-semibold text-gray-700">Description</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">Unit Price</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {mockReceipt.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-3 text-gray-900">{item.description}</td>
                    <td className="text-right py-3 text-gray-700">{item.quantity}</td>
                    <td className="text-right py-3 text-gray-700">₱{item.unitPrice.toLocaleString()}</td>
                    <td className="text-right py-3 font-medium text-gray-900">₱{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Breakdown */}
          <div className="flex justify-end mb-8">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Invoice Amount:</span>
                <span className="font-medium">₱{mockReceipt.invoiceAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Gateway Processing Fee:</span>
                <span>₱{mockReceipt.gatewayFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Service Fee:</span>
                <span>₱{mockReceipt.serviceFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-300 pt-2 text-xl font-bold text-gray-900">
                <span>TOTAL PAID:</span>
                <span>₱{mockReceipt.totalPaid.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-600">
            <p className="mb-2">This is an official receipt of payment processed through LAMTEX Payment System.</p>
            <p>Receipt generated on: {new Date(mockReceipt.generatedAt).toLocaleString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
            <p className="mt-4 text-xs">For inquiries, please contact your sales agent or LAMTEX customer service.</p>
          </div>
        </div>

        {/* Digital Note */}
        <div className="text-center mt-6 text-sm text-gray-500 print:hidden">
          <p>🌿 This is a digital receipt. No physical paper needed.</p>
          <p className="mt-1">Save this page or download the PDF for your records.</p>
        </div>
      </div>
    </div>
  );
}
