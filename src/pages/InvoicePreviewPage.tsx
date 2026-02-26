import React from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { getOrderById } from '@/src/mock/orders';
import { Download, Printer, Send, Mail, MessageSquare, ExternalLink } from 'lucide-react';
import lamtexLogo from '../assets/images.png';

export function InvoicePreviewPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const order = getOrderById(orderId || '');

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600">Unable to generate invoice for this order.</p>
        </div>
      </div>
    );
  }

  // Generate payment link token
  const paymentToken = `PAY-2026-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const paymentUrl = `${window.location.origin}/pay/${paymentToken}`;
  const invoiceNumber = order.invoiceId || `INV-2026-${Math.floor(Math.random() * 9000 + 1000)}`;
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 30); // Net 30 terms

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert('📥 Downloading invoice PDF...\n\nIn production, this would generate and download the PDF file.');
  };

  const handleSendEmail = () => {
    alert('📧 Sending invoice via email...\n\nEmail will include:\n- Invoice PDF attachment\n- Payment link\n- Payment instructions');
  };

  const handleSendSMS = () => {
    alert('📱 Sending invoice via SMS...\n\nSMS will include:\n- Invoice number\n- Amount due\n- Payment link\n- Due date');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Action Bar - Hidden when printing */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Invoice Preview</h1>
              <p className="text-sm text-gray-600 mt-1">Review invoice before sending to customer</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button variant="outline" onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleSendEmail} className="gap-2">
                <Mail className="w-4 h-4" />
                Send Email
              </Button>
              <Button variant="outline" onClick={handleSendSMS} className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Send SMS
              </Button>
            </div>
          </div>
        </div>

        {/* Invoice Document */}
        <div className="bg-white rounded-lg shadow-lg print:shadow-none">
          {/* Invoice Content */}
          <div className="p-12">
            {/* Header */}
            <div className="flex items-start justify-between border-b-4 border-red-600 pb-8 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <img src={lamtexLogo} alt="LAMTEX Logo" className="h-16 w-auto" />
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>456 Industrial Avenue</p>
                  <p>Quezon City, Metro Manila 1100</p>
                  <p>Philippines</p>
                  <p className="mt-2">Tel: (02) 987-6543</p>
                  <p>Email: info@lamtex.com</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-end gap-2">
                    <span className="text-gray-600">Invoice #:</span>
                    <span className="font-semibold text-gray-900">{invoiceNumber}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-gray-600">Order #:</span>
                    <span className="font-semibold text-gray-900">{order.id}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-gray-600">Issue Date:</span>
                    <span className="font-medium text-gray-900">
                      {issueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-medium text-gray-900">
                      {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To & Ship To */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Bill To</h3>
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-gray-900 text-lg">{order.customer}</p>
                  <p className="text-gray-600">123 Business Street</p>
                  <p className="text-gray-600">Makati City, Metro Manila</p>
                  <p className="text-gray-600">Philippines</p>
                  <p className="text-gray-600 mt-2">Contact: (02) 123-4567</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Payment Terms</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Terms:</span>
                    <span className="font-medium text-gray-900">{order.paymentTerms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Agent:</span>
                    <span className="font-medium text-gray-900">{order.agent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Branch:</span>
                    <span className="font-medium text-gray-900">{order.branch}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 text-sm font-semibold text-gray-700 uppercase">Description</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase w-20">Qty</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase w-32">Unit Price</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase w-32">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-3 text-gray-900">
                        {item.productName}
                        {item.variantDescription && (
                          <span className="text-gray-600"> - {item.variantDescription}</span>
                        )}
                      </td>
                      <td className="text-right py-3 text-gray-700">{item.quantity}</td>
                      <td className="text-right py-3 text-gray-700">₱{item.unitPrice.toLocaleString()}</td>
                      <td className="text-right py-3 font-medium text-gray-900">₱{item.lineTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-medium">₱{order.subtotal.toLocaleString()}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span className="font-medium">-₱{order.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-gray-300 pt-2 text-xl font-bold text-gray-900">
                  <span>TOTAL DUE:</span>
                  <span>₱{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Options Section - The Key Addition! */}
            <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50 mb-8">
              <h3 className="text-lg font-bold text-blue-900 mb-4 text-center">Payment Options</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Cash Payment */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Cash Payment</h4>
                  <div className="text-sm space-y-2 text-gray-700">
                    <p className="font-medium">Pay at Office/Warehouse:</p>
                    <p className="text-xs text-gray-600">456 Industrial Avenue</p>
                    <p className="text-xs text-gray-600">Quezon City, Metro Manila</p>
                    <p className="text-xs text-gray-600 mt-2">
                      <span className="font-medium">Hours:</span> Mon-Sat, 8AM-5PM
                    </p>
                    <p className="text-xs text-gray-500 mt-2 italic">
                      Please bring this invoice for reference
                    </p>
                  </div>
                </div>

                {/* Bank Transfer */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Bank Transfer</h4>
                  <div className="text-sm space-y-1 text-gray-700">
                    <p><span className="font-medium">Bank:</span> BDO Unibank</p>
                    <p><span className="font-medium">Account Name:</span> LAMTEX Corp</p>
                    <p><span className="font-medium">Account #:</span> 001234567890</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Include invoice # in reference
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      <span className="font-medium">Terms:</span> {order.paymentTerms}
                    </p>
                  </div>
                </div>

                {/* Online Payment */}
                <div className="bg-white rounded-lg p-4 border-2 border-green-500">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm">Pay Online ⚡</h4>
                    <Badge className="bg-green-100 text-green-700 text-xs">Instant</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-center">
                      {/* QR Code Placeholder */}
                      <div className="w-24 h-24 mx-auto bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center mb-1">
                        <div className="text-xs text-gray-400 text-center">
                          <div className="w-20 h-20 bg-gray-200 rounded grid grid-cols-3 gap-1 p-1.5">
                            {[...Array(9)].map((_, i) => (
                              <div key={i} className="bg-gray-800 rounded-sm"></div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">Scan to pay</p>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-2">
                      <p className="text-xs text-gray-600 mb-1">Payment link:</p>
                      <a
                        href={paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-600 hover:text-blue-700 text-xs font-medium break-all underline"
                      >
                        {paymentUrl.replace(window.location.origin, '').substring(0, 30)}...
                      </a>
                      <button
                        onClick={() => window.open(paymentUrl, '_blank')}
                        className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1 transition-colors print:hidden"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Pay Now
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-600 border-t border-gray-200 pt-2">
                      <p className="font-medium text-gray-700 mb-1">Methods:</p>
                      <p>• GCash, Maya</p>
                      <p>• Credit/Debit Card</p>
                      <p>• Bank Transfer (₱500 + service fee)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-blue-800">
                <p>💡 Pay online for instant confirmation and automatic receipt delivery</p>
              </div>
            </div>

            {/* Notes */}
            {order.orderNotes && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">Notes</h3>
                <p className="text-sm text-gray-600">{order.orderNotes}</p>
              </div>
            )}

            {/* Terms & Conditions */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Terms & Conditions</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p>1. Payment is due within {order.paymentTerms.toLowerCase()} from invoice date</p>
                <p>2. Late payments may incur additional charges</p>
                <p>3. All sales are final unless otherwise stated</p>
                <p>4. Goods remain the property of LAMTEX until full payment is received</p>
                <p>5. For any questions, please contact your sales agent</p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 mt-8 pt-6 text-center text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-2">Thank you for your business!</p>
              <p>For inquiries, contact: {order.agent} or call (02) 987-6543</p>
              <p className="text-xs mt-3 text-gray-500">
                This invoice was generated on {new Date().toLocaleString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions - Hidden when printing */}
        <div className="mt-6 flex justify-center gap-3 print:hidden">
          <Button variant="outline" onClick={() => window.close()}>
            Close Preview
          </Button>
          <Button variant="primary" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Download & Send Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}
