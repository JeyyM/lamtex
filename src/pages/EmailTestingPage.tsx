import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import {
  Mail,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Send,
  Server,
} from 'lucide-react';

type EmailTestConfig = {
  resendConfigured: boolean;
  fromEmail: string;
  defaultTo: string;
  appUrl: string;
  notifyServerPort: number;
};

type SendResult = {
  ok: boolean;
  at: string;
  label: string;
  sentTo?: string;
  id?: string;
  subject?: string;
  error?: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export function EmailTestingPage(): React.ReactElement {
  const [config, setConfig] = useState<EmailTestConfig | null>(null);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('Lamtex custom test');
  const [body, setBody] = useState('This is a plain-text test from the Email Testing page.');
  const [sending, setSending] = useState<string | null>(null);
  const [results, setResults] = useState<SendResult[]>([]);

  const loadStatus = useCallback(async () => {
    setLoadingConfig(true);
    try {
      await fetchJson<{ ok: boolean }>('/api/health');
      setServerOk(true);
      const cfg = await fetchJson<EmailTestConfig>('/api/email-test/config');
      setConfig(cfg);
      setTo((prev) => prev || cfg.defaultTo);
    } catch {
      setServerOk(false);
      setConfig(null);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const pushResult = (result: Omit<SendResult, 'at'>) => {
    setResults((prev) => [{ ...result, at: new Date().toISOString() }, ...prev].slice(0, 12));
  };

  const sendTemplate = async (
    template:
      | 'plain_welcome'
      | 'order_created'
      | 'order_submitted_for_approval'
      | 'order_approved'
      | 'order_rejected'
      | 'order_revised'
      | 'order_cancelled_agent'
      | 'order_cancelled_executive'
      | 'order_logistics_ready'
      | 'order_logistics_loading'
      | 'order_packed_logistics'
      | 'order_packed_agent'
      | 'order_in_transit_executive'
      | 'order_in_transit_warehouse'
      | 'order_in_transit_agent'
      | 'order_in_transit_customer'
      | 'order_delivery_executive'
      | 'order_delivery_agent'
      | 'order_delivery_customer'
      | 'order_customer_approved'
      | 'order_customer_scheduled'
      | 'order_customer_unscheduled'
      | 'order_customer_portal_share'
      | 'order_scheduled_executive'
      | 'order_scheduled_warehouse'
      | 'order_scheduled_agent'
      | 'trip_driver_assigned'
      | 'product_low_stock_executive'
      | 'product_low_stock_warehouse'
      | 'product_critical_stock_executive'
      | 'product_critical_stock_warehouse'
      | 'product_out_of_stock_executive'
      | 'product_out_of_stock_warehouse'
      | 'material_low_stock_executive'
      | 'material_low_stock_warehouse'
      | 'material_critical_stock_executive'
      | 'material_critical_stock_warehouse'
      | 'material_out_of_stock_executive'
      | 'material_out_of_stock_warehouse'
      | 'purchase_order_submitted_for_approval'
      | 'purchase_order_rejected'
      | 'purchase_order_cancelled'
      | 'purchase_order_accepted'
      | 'purchase_order_confirmed_executive'
      | 'purchase_order_confirmed_warehouse'
      | 'plain_welcome',
    label: string,
  ) => {
    setSending(template);
    try {
      const data = await fetchJson<{ ok: boolean; sentTo: string; id?: string; subject?: string }>(
        '/api/email-test/template',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template, to: to.trim() || undefined }),
        },
      );
      pushResult({ ok: true, label, sentTo: data.sentTo, id: data.id, subject: data.subject });
    } catch (e) {
      pushResult({
        ok: false,
        label,
        error: e instanceof Error ? e.message : 'Send failed',
      });
    } finally {
      setSending(null);
    }
  };

  const sendCustom = async () => {
    setSending('custom');
    try {
      const data = await fetchJson<{ ok: boolean; sentTo: string; id?: string }>('/api/email-test/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim() || undefined,
          subject,
          text: body,
        }),
      });
      pushResult({ ok: true, label: 'Custom email', sentTo: data.sentTo, id: data.id, subject });
    } catch (e) {
      pushResult({
        ok: false,
        label: 'Custom email',
        error: e instanceof Error ? e.message : 'Send failed',
      });
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-7 h-7 text-red-600" />
            Email Testing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Development only — send test emails through Resend via the notify server.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void loadStatus()} disabled={loadingConfig}>
          {loadingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh status
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="w-5 h-5" />
            Notify server status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {loadingConfig ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-600">Server</span>
                {serverOk ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Reachable
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" /> Not reachable — run npm run dev:notify
                  </Badge>
                )}
              </div>
              {config && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <div>
                    <dt className="text-gray-500">Resend API key</dt>
                    <dd className="font-medium">{config.resendConfigured ? 'Configured' : 'Missing in .env'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">From address</dt>
                    <dd className="font-medium">{config.fromEmail}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Default recipient (override)</dt>
                    <dd className="font-medium">{config.defaultTo}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">APP_URL</dt>
                    <dd className="font-medium truncate">{config.appUrl}</dd>
                  </div>
                </dl>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipient</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="text-xs text-gray-500" htmlFor="email-test-to">
            Send to (leave blank for NOTIFICATIONS_EMAIL_OVERRIDE)
          </label>
          <input
            id="email-test-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={config?.defaultTo ?? 'you@example.com'}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick templates</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('plain_welcome', 'Plain welcome test')}
            className="gap-2"
          >
            {sending === 'plain_welcome' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Simple test
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_created', 'Order created template')}
            className="gap-2"
          >
            {sending === 'order_created' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Order created
          </Button>
          <Button
            variant="primary"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_submitted_for_approval', 'Submitted for approval template')}
            className="gap-2"
          >
            {sending === 'order_submitted_for_approval' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submitted for approval
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() =>
              void sendTemplate('purchase_order_submitted_for_approval', 'PO submitted for approval template')
            }
            className="gap-2"
          >
            {sending === 'purchase_order_submitted_for_approval' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            PO submitted for approval
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('purchase_order_rejected', 'PO rejected template')}
            className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
          >
            {sending === 'purchase_order_rejected' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            PO rejected
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('purchase_order_accepted', 'PO accepted template')}
            className="gap-2 border-green-300 text-green-800 hover:bg-green-50"
          >
            {sending === 'purchase_order_accepted' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            PO accepted
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() =>
              void sendTemplate('purchase_order_confirmed_executive', 'PO confirmed (executive) template')
            }
            className="gap-2 border-indigo-300 text-indigo-800 hover:bg-indigo-50"
          >
            {sending === 'purchase_order_confirmed_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            PO confirmed (exec)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() =>
              void sendTemplate('purchase_order_confirmed_warehouse', 'PO confirmed (warehouse) template')
            }
            className="gap-2 border-green-300 text-green-800 hover:bg-green-50"
          >
            {sending === 'purchase_order_confirmed_warehouse' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            PO confirmed (WH)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_approved', 'Order approved (agent) template')}
            className="gap-2 border-green-300 text-green-800 hover:bg-green-50"
          >
            {sending === 'order_approved' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Order approved (agent)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_logistics_ready', 'Order ready for logistics template')}
            className="gap-2 border-blue-300 text-blue-800 hover:bg-blue-50"
          >
            {sending === 'order_logistics_ready' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Order ready (logistics)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_logistics_loading', 'Order loading (logistics) template')}
            className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            {sending === 'order_logistics_loading' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Order loading (logistics)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_packed_logistics', 'Order packed (logistics) template')}
            className="gap-2 border-emerald-300 text-emerald-900 hover:bg-emerald-50"
          >
            {sending === 'order_packed_logistics' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Order packed (logistics)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_packed_agent', 'Order packed (agent) template')}
            className="gap-2 border-indigo-300 text-indigo-900 hover:bg-indigo-50"
          >
            {sending === 'order_packed_agent' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Order packed (agent)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_in_transit_executive', 'Order in transit (executive) template')}
            className="gap-2 border-teal-300 text-teal-900 hover:bg-teal-50"
          >
            {sending === 'order_in_transit_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            In transit (executive)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_in_transit_warehouse', 'Order in transit (warehouse) template')}
            className="gap-2 border-orange-300 text-orange-900 hover:bg-orange-50"
          >
            {sending === 'order_in_transit_warehouse' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            In transit (warehouse)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_in_transit_agent', 'Order in transit (agent) template')}
            className="gap-2 border-indigo-300 text-indigo-900 hover:bg-indigo-50"
          >
            {sending === 'order_in_transit_agent' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            In transit (agent)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_in_transit_customer', 'Order in transit (customer) template')}
            className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            {sending === 'order_in_transit_customer' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            In transit (customer)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_delivery_executive', 'Delivery recorded (executive) template')}
            className="gap-2 border-teal-300 text-teal-900 hover:bg-teal-50"
          >
            {sending === 'order_delivery_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Delivery recorded (executive)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_delivery_agent', 'Delivery recorded (agent) template')}
            className="gap-2 border-indigo-300 text-indigo-900 hover:bg-indigo-50"
          >
            {sending === 'order_delivery_agent' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Delivery recorded (agent)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_delivery_customer', 'Delivery recorded (customer) template')}
            className="gap-2 border-emerald-300 text-emerald-900 hover:bg-emerald-50"
          >
            {sending === 'order_delivery_customer' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Delivery recorded (customer)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_customer_approved', 'Order approved (customer) template')}
            className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            {sending === 'order_customer_approved' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Order approved (customer)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_customer_scheduled', 'Order scheduled (customer) template')}
            className="gap-2 border-sky-300 text-sky-900 hover:bg-sky-50"
          >
            {sending === 'order_customer_scheduled' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Scheduled (customer)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_customer_unscheduled', 'Order unscheduled (customer) template')}
            className="gap-2 border-violet-300 text-violet-900 hover:bg-violet-50"
          >
            {sending === 'order_customer_unscheduled' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Unscheduled (customer)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_customer_portal_share', 'Order portal share (customer) template')}
            className="gap-2 border-teal-300 text-teal-900 hover:bg-teal-50"
          >
            {sending === 'order_customer_portal_share' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Portal share (customer)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_rejected', 'Order rejected (agent) template')}
            className="gap-2 border-red-300 text-red-800 hover:bg-red-50"
          >
            {sending === 'order_rejected' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Order rejected (agent)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_revised', 'Order revised template')}
            className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            {sending === 'order_revised' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Order revised
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_cancelled_agent', 'Cancelled by executive (agent email)')}
            className="gap-2 border-gray-300 text-gray-800 hover:bg-gray-50"
          >
            {sending === 'order_cancelled_agent' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Cancelled → agent
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_cancelled_executive', 'Cancelled by agent (exec email)')}
            className="gap-2 border-violet-300 text-violet-900 hover:bg-violet-50"
          >
            {sending === 'order_cancelled_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Cancelled → executives
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_scheduled_executive', 'Order scheduled (executive)')}
            className="gap-2 border-teal-300 text-teal-900 hover:bg-teal-50"
          >
            {sending === 'order_scheduled_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Scheduled → executives
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_scheduled_warehouse', 'Order scheduled (warehouse)')}
            className="gap-2 border-orange-300 text-orange-900 hover:bg-orange-50"
          >
            {sending === 'order_scheduled_warehouse' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Scheduled → warehouse
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('order_scheduled_agent', 'Order scheduled (agent)')}
            className="gap-2 border-indigo-300 text-indigo-900 hover:bg-indigo-50"
          >
            {sending === 'order_scheduled_agent' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Scheduled → agent
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('trip_driver_assigned', 'Trip assigned (driver)')}
            className="gap-2 border-blue-300 text-blue-900 hover:bg-blue-50"
          >
            {sending === 'trip_driver_assigned' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Trip assigned (driver)
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('product_low_stock_executive', 'Low stock alert (executive)')}
            className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            {sending === 'product_low_stock_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Low stock → executive
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('product_low_stock_warehouse', 'Low stock alert (warehouse)')}
            className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            {sending === 'product_low_stock_warehouse' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Low stock → warehouse
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('product_critical_stock_executive', 'Critical stock alert (executive)')}
            className="gap-2 border-red-300 text-red-900 hover:bg-red-50"
          >
            {sending === 'product_critical_stock_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Critical stock → executive
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('product_critical_stock_warehouse', 'Critical stock alert (warehouse)')}
            className="gap-2 border-red-300 text-red-900 hover:bg-red-50"
          >
            {sending === 'product_critical_stock_warehouse' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Critical stock → warehouse
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('product_out_of_stock_executive', 'Out of stock alert (executive)')}
            className="gap-2 border-red-400 text-red-900 hover:bg-red-50 bg-red-50/40"
          >
            {sending === 'product_out_of_stock_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Out of stock → executive
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('product_out_of_stock_warehouse', 'Out of stock alert (warehouse)')}
            className="gap-2 border-red-400 text-red-900 hover:bg-red-50 bg-red-50/40"
          >
            {sending === 'product_out_of_stock_warehouse' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Out of stock → warehouse
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('material_low_stock_executive', 'Material low stock (executive)')}
            className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            {sending === 'material_low_stock_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Material low → executive
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('material_low_stock_warehouse', 'Material low stock (warehouse)')}
            className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            {sending === 'material_low_stock_warehouse' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Material low → warehouse
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('material_critical_stock_executive', 'Material critical (executive)')}
            className="gap-2 border-red-300 text-red-900 hover:bg-red-50"
          >
            {sending === 'material_critical_stock_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Material critical → executive
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('material_critical_stock_warehouse', 'Material critical (warehouse)')}
            className="gap-2 border-red-300 text-red-900 hover:bg-red-50"
          >
            {sending === 'material_critical_stock_warehouse' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Material critical → warehouse
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('material_out_of_stock_executive', 'Material out of stock (executive)')}
            className="gap-2 border-red-400 text-red-900 hover:bg-red-50 bg-red-50/40"
          >
            {sending === 'material_out_of_stock_executive' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Material out of stock → executive
          </Button>
          <Button
            variant="outline"
            disabled={!!sending || !serverOk}
            onClick={() => void sendTemplate('material_out_of_stock_warehouse', 'Material out of stock (warehouse)')}
            className="gap-2 border-red-400 text-red-900 hover:bg-red-50 bg-red-50/40"
          >
            {sending === 'material_out_of_stock_warehouse' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Material out of stock → warehouse
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-gray-500" htmlFor="email-test-subject">
              Subject
            </label>
            <input
              id="email-test-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500" htmlFor="email-test-body">
              Body (plain text)
            </label>
            <textarea
              id="email-test-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-y"
            />
          </div>
          <Button variant="primary" className="gap-2" disabled={!!sending || !serverOk} onClick={() => void sendCustom()}>
            {sending === 'custom' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send custom
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent sends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((r, i) => (
              <div
                key={`${r.at}-${i}`}
                className={`rounded-lg border px-3 py-2 text-sm ${r.ok ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium">
                    {r.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    {r.label}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(r.at).toLocaleTimeString()}
                  </span>
                </div>
                {r.ok ? (
                  <p className="text-xs text-gray-600 mt-1 pl-6">
                    → {r.sentTo}
                    {r.id ? ` · Resend id: ${r.id}` : ''}
                    {r.subject ? ` · ${r.subject}` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-red-700 mt-1 pl-6">{r.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
