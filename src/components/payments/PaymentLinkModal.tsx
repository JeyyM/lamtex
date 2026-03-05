import React, { useState } from 'react';
import { X, Link as LinkIcon, Mail, MessageSquare, QrCode, Copy, Check } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Invoice } from '@/src/types/orders';
import { PaymentLink, PAYMENT_METHOD_CONFIGS, calculatePaymentFees } from '@/src/types/payments';

interface PaymentLinkModalProps {
  invoice: Invoice;
  onClose: () => void;
  onGenerate: (paymentLink: PaymentLink) => void;
}

export function PaymentLinkModal({ invoice, onClose, onGenerate }: PaymentLinkModalProps) {
  const [step, setStep] = useState<'setup' | 'generated'>('setup');
  const [customerEmail, setCustomerEmail] = useState(invoice.billTo.email || '');
  const [customerPhone, setCustomerPhone] = useState(invoice.billTo.phone || '');
  const [expiryDays, setExpiryDays] = useState(7);
  const [generatedLink, setGeneratedLink] = useState<PaymentLink | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    // Generate unique token
    const token = `PAY-2026-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const paymentLink: PaymentLink = {
      id: `PL-${Date.now()}`,
      token,
      invoiceId: invoice.invoiceNumber,
      orderId: invoice.orderId,
      customerName: invoice.billTo.name,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      invoiceAmount: invoice.balanceDue,
      paymentMethods: PAYMENT_METHOD_CONFIGS,
      status: 'pending',
      link: `${window.location.origin}/pay/${token}`,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      sentViaEmail: false,
      sentViaSMS: false,
      viewCount: 0,
    };

    setGeneratedLink(paymentLink);
    setStep('generated');
    onGenerate(paymentLink);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendEmail = () => {
    if (generatedLink && customerEmail) {
      alert(`📧 Email sent to ${customerEmail}\n\nIn production, this would send an email with the payment link.`);
    }
  };

  const handleSendSMS = () => {
    if (generatedLink && customerPhone) {
      alert(`📱 SMS sent to ${customerPhone}\n\nIn production, this would send an SMS with the payment link.`);
    }
  };

  // Calculate fee preview for each method
  const feePreview = PAYMENT_METHOD_CONFIGS.filter(m => m.enabled).map(method => {
    const fees = calculatePaymentFees(invoice.balanceDue, method);
    return { method: method.method, fees };
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LinkIcon className="w-6 h-6 text-blue-600" />
            {step === 'setup' ? 'Generate Payment Link' : 'Payment Link Generated'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'setup' ? (
            <div className="space-y-6">
              {/* Invoice Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">Invoice Details</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Invoice:</span>
                    <span className="font-medium text-blue-900">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Customer:</span>
                    <span className="font-medium text-blue-900">{invoice.billTo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Amount Due:</span>
                    <span className="font-bold text-blue-900">₱{invoice.balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Fee Preview */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900 font-medium mb-3">Payment Method Fees</p>
                <div className="space-y-2 text-xs">
                  {feePreview.map(({ method, fees }) => (
                    <div key={method} className="flex justify-between items-center">
                      <span className="text-green-800">{method}:</span>
                      <div className="text-right">
                        <span className="font-medium text-green-900">
                          ₱{fees.totalAmount.toLocaleString()}
                        </span>
                        <span className="text-green-700 ml-2">
                          (Service: ₱{fees.serviceFee.toLocaleString()})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-700 mt-3 italic">
                  * Service fees are LAMTEX's transaction processing fees
                </p>
              </div>

              {/* Customer Contact */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0917-XXX-XXXX"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link Expiry
                  </label>
                  <select
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <p className="text-green-900 font-semibold">Payment Link Generated!</p>
                <p className="text-sm text-green-700 mt-1">
                  Valid until {new Date(generatedLink!.expiresAt).toLocaleDateString()}
                </p>
              </div>

              {/* Payment Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedLink?.link || ''}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <Button variant="outline" onClick={handleCopyLink}>
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* QR Code Placeholder */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">QR Code</p>
                <p className="text-xs text-gray-500 mt-1">Customer can scan to pay</p>
              </div>

              {/* Send Options */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleSendEmail}
                  disabled={!customerEmail}
                  className="w-full justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send via Email
                  {customerEmail && ` (${customerEmail})`}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSendSMS}
                  disabled={!customerPhone}
                  className="w-full justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send via SMS
                  {customerPhone && ` (${customerPhone})`}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          {step === 'setup' ? (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleGenerate} className="flex-1">
                Generate Payment Link
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={onClose} className="w-full">
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
