import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import {
  buildOrderCustomerPortalUrl,
  ensureOrderCustomerPortal,
  recordOrderPortalEmailSent,
} from '@/src/lib/orderCustomerPortal';
import type { OrderCustomerPortalRow } from '@/src/types/orderCustomerPortal';
import { Copy, Check, Mail, ExternalLink, QrCode, Loader2 } from 'lucide-react';

type Props = {
  orderUuid: string;
  customerEmail?: string | null;
};

export function OrderCustomerPortalCard({ orderUuid, customerEmail }: Props) {
  const [portal, setPortal] = useState<OrderCustomerPortalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState(customerEmail ?? '');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setEmailInput(customerEmail ?? '');
  }, [customerEmail]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { portal: row, error: err } = await ensureOrderCustomerPortal(orderUuid, customerEmail);
      if (!cancelled) {
        setPortal(row);
        setError(err ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderUuid, customerEmail]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Preparing customer link…
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Could not create customer link. Run <code className="text-xs">database/order_customer_portal.sql</code> in Supabase, then refresh.
        {error && <p className="mt-1 text-xs">{error}</p>}
      </div>
    );
  }

  const url = buildOrderCustomerPortalUrl(portal.token);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    const email = emailInput.trim();
    if (!email) return;
    setSending(true);
    const result = await recordOrderPortalEmailSent(portal.id, email);
    setSending(false);
    if (result.ok) {
      setPortal({ ...portal, sentViaEmail: true, lastEmailSent: new Date().toISOString(), customerEmail: email });
      alert(
        `Email queued for ${email}.\n\n` +
          'Automated delivery needs a Supabase Edge Function (e.g. Resend). For now, copy the link or use your mail client.',
      );
    } else {
      alert(result.error ?? 'Could not record email send.');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <QRCodeSVG value={url} size={160} level="M" includeMargin />
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <QrCode className="w-3 h-3" />
            Scan to view order
          </p>
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Customer order page</h4>
            <p className="text-xs text-gray-600 mt-1">
              Read-only summary for your customer (items, dates, agent, delivery, payments received). No online checkout.
            </p>
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 mt-2">
              Per-discount names on the customer page need{' '}
              <code className="text-[10px]">order_customer_portal_contacts.sql</code> in Supabase, then re-open each
              line item here and click <strong>Update item</strong> (or Save order).
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {portal.sentViaEmail && (
                <Badge variant="success" className="text-xs">
                  Email sent
                </Badge>
              )}
              {portal.viewCount > 0 && (
                <span className="text-xs text-gray-500">Viewed {portal.viewCount}×</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            />
            <Button variant="outline" size="sm" onClick={handleCopy} title="Copy link">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')} title="Open">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="customer@email.com"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              disabled={!emailInput.trim() || sending}
              onClick={handleSendEmail}
            >
              <Mail className="w-4 h-4" />
              {sending ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

