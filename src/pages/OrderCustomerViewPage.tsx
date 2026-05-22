import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/src/components/ui/Badge';
import { Loader2, Printer, Truck, User, Package, History, Phone, Mail } from 'lucide-react';
import type { PublicOrderContact, PublicOrderLineItem } from '@/src/types/orderCustomerPortal';
import { formatPublicOrderActivity } from '@/src/lib/publicOrderActivity';
import { buildPublicOrderTotalsBreakdown, getItemDiscountLines } from '@/src/lib/publicOrderTotals';
import lamtexLogo from '../assets/Lamtex Logo.png';
import {
  fetchPublicOrderSummary,
  publicOrderErrorMessage,
} from '@/src/lib/orderCustomerPortal';
import type { PublicOrderSummary } from '@/src/types/orderCustomerPortal';

function formatDate(value?: string | null): string {
  if (!value) return '\u2014';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value?: string | null): string {
  if (!value) return '\u2014';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMoney(n: number): string {
  return `\u20B1${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function paymentStatusVariant(status: string): 'success' | 'warning' | 'default' {
  const s = status.toLowerCase();
  if (s === 'paid' || s === 'completed') return 'success';
  if (s.includes('partial') || s.includes('overdue') || s.includes('credit')) return 'warning';
  return 'default';
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function ContactCard({
  title,
  icon: Icon,
  person,
  meta,
}: {
  title: string;
  icon: typeof User;
  person: PublicOrderContact;
  meta?: string[];
}) {
  if (!person.name?.trim()) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      <p className="font-semibold text-gray-900">{person.name}</p>
      {meta?.map((line) => (
        <p key={line} className="text-sm text-gray-600 mt-0.5">
          {line}
        </p>
      ))}
      <div className="mt-2 space-y-1">
        {person.phone && (
          <a
            href={`tel:${person.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 text-sm text-red-700 hover:text-red-800"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            {person.phone}
          </a>
        )}
        {person.email && (
          <a
            href={`mailto:${person.email}`}
            className="flex items-center gap-2 text-sm text-red-700 hover:text-red-800 break-all"
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            {person.email}
          </a>
        )}
        {!person.phone && !person.email && (
          <p className="text-xs text-gray-500">Contact details not on file.</p>
        )}
      </div>
    </div>
  );
}

export function OrderCustomerViewPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PublicOrderSummary | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await fetchPublicOrderSummary(token);
      if (!cancelled) {
        setSummary(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!summary?.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <p className="text-gray-900 font-semibold text-lg">Order unavailable</p>
          <p className="text-gray-600 mt-2 text-sm">{publicOrderErrorMessage(summary?.error)}</p>
        </div>
      </div>
    );
  }

  const s = summary;
  const totals = buildPublicOrderTotalsBreakdown(s.items, s.discountAmount);
  const companyLine = [s.company.address, s.company.phone, s.company.email].filter(Boolean).join(' \u00b7 ');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3 mb-6 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 sm:p-12 print:shadow-none print:rounded-none">
          <header className="border-b-4 border-red-600 pb-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <img src={lamtexLogo} alt="LAMTEX" className="h-14 w-auto mb-2" />
                <p className="text-sm text-gray-600">{s.company.name}</p>
                {companyLine && <p className="text-sm text-gray-600">{companyLine}</p>}
              </div>
              <div className="text-left sm:text-right">
                <h1 className="text-2xl font-bold text-gray-900">Order Summary</h1>
                {s.invoiceNumber && (
                  <p className="text-sm text-gray-600 mt-1">Invoice #{s.invoiceNumber}</p>
                )}
                <p className="text-sm text-gray-600">Order #{s.orderNumber}</p>
                <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
                  <Badge variant={paymentStatusVariant(s.paymentStatus)}>{s.paymentStatus}</Badge>
                  <Badge variant="default">{s.status}</Badge>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bill to</h2>
              <p className="font-semibold text-gray-900 text-lg">{s.customer.name}</p>
              {s.customer.contactPerson && (
                <p className="text-sm text-gray-600">Attn: {s.customer.contactPerson}</p>
              )}
              {s.customer.address && <p className="text-sm text-gray-600 mt-1">{s.customer.address}</p>}
              {s.customer.phone && <p className="text-sm text-gray-600">{s.customer.phone}</p>}
              {s.customer.email && <p className="text-sm text-gray-600">{s.customer.email}</p>}
            </section>
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order details</h2>
              <dl className="space-y-1.5 text-sm">
                <DetailRow label="Order date" value={formatDate(s.orderDate)} />
                {s.requiredDate && <DetailRow label="Required by" value={formatDate(s.requiredDate)} />}
                {s.issueDate && <DetailRow label="Invoice date" value={formatDate(s.issueDate)} />}
                {s.dueDate && <DetailRow label="Due date" value={formatDate(s.dueDate)} />}
                {s.paymentTerms && <DetailRow label="Payment terms" value={s.paymentTerms} />}
                {s.branchName && <DetailRow label="Branch" value={s.branchName} />}
                {s.deliveryType && <DetailRow label="Delivery" value={s.deliveryType} />}
              </dl>
            </section>
          </div>

          {(s.agent?.name || s.assignedDriver) && (
            <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {s.agent?.name && (
                <ContactCard title="Sales agent" icon={User} person={s.agent} />
              )}
              {s.assignedDriver && (
                <ContactCard title="Assigned driver" icon={Truck} person={s.assignedDriver} />
              )}
            </section>
          )}

          <section className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Package className="w-4 h-4" /> Items
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 text-sm font-semibold text-gray-700">Description</th>
                    <th className="text-right py-2 text-sm font-semibold text-gray-700">Qty</th>
                    <th className="text-right py-2 text-sm font-semibold text-gray-700">Unit price</th>
                    <th className="text-right py-2 text-sm font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {s.items.map((item, idx) => {
                    const discountLines = getItemDiscountLines(item);
                    const lineGross = item.quantity * item.unitPrice;
                    const hasDiscount = discountLines.length > 0 || lineGross > item.total + 1e-6;
                    return (
                      <React.Fragment key={idx}>
                        <tr className={hasDiscount ? 'border-b-0' : 'border-b border-gray-200'}>
                          <td className="py-3 text-gray-900 text-sm align-top">{item.description}</td>
                          <td className="text-right py-3 text-gray-700 text-sm align-top">{item.quantity}</td>
                          <td className="text-right py-3 text-gray-900 text-sm align-top tabular-nums">
                            {formatMoney(item.unitPrice)}
                          </td>
                          <td className="text-right py-3 font-medium text-gray-900 text-sm align-top tabular-nums">
                            {formatMoney(item.total)}
                          </td>
                        </tr>
                        {hasDiscount && (
                          <tr className="border-b border-gray-200">
                            <td colSpan={3} />
                            <td className="pb-3 pt-0 pl-4">
                              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 space-y-1 print:break-inside-avoid">
                                <div className="flex justify-between gap-6 text-xs text-blue-800">
                                  <span>Subtotal</span>
                                  <span className="tabular-nums font-medium">{formatMoney(lineGross)}</span>
                                </div>
                                {discountLines.map((d, di) => (
                                  <div key={di} className="flex justify-between gap-6 text-xs text-green-700">
                                    <span className="min-w-0">
                                      {d.name}{d.percentage != null && d.percentage > 0 ? ` (${d.percentage}%)` : ''}
                                    </span>
                                    <span className="tabular-nums font-semibold shrink-0">-{formatMoney(d.amount)}</span>
                                  </div>
                                ))}
                                {discountLines.length === 0 && lineGross > item.total + 1e-6 && (
                                  <div className="flex justify-between gap-6 text-xs text-green-700">
                                    <span>Discount</span>
                                    <span className="tabular-nums font-semibold shrink-0">-{formatMoney(lineGross - item.total)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between gap-6 text-xs font-semibold text-blue-900 pt-1 border-t border-blue-200">
                                  <span>Line total</span>
                                  <span className="tabular-nums">{formatMoney(item.total)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex justify-end mb-8">
            <div className="w-full max-w-md space-y-3 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span className="font-medium tabular-nums">{formatMoney(totals.itemsNetTotal)}</span>
              </div>
              {totals.orderDiscountAmount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>
                    Order discount
                    {s.discountPercent > 0 ? ` (${s.discountPercent}%)` : ''}
                  </span>
                  <span className="font-medium tabular-nums">-{formatMoney(totals.orderDiscountAmount)}</span>
                </div>
              )}
              {s.taxAmount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tax</span>
                  <span className="font-medium tabular-nums">{formatMoney(s.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-gray-300 pt-2 text-lg font-bold text-gray-900">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(s.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Amount paid</span>
                <span className="font-medium text-green-700 tabular-nums">{formatMoney(s.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Balance due</span>
                <span className="tabular-nums">{formatMoney(s.balanceDue)}</span>
              </div>
            </div>
          </div>

          {(() => {
            const activityLines = s.activities
              .map((a) => ({ at: a.at, message: formatPublicOrderActivity(a) }))
              .filter((row) => row.message.trim().length > 0);
            if (activityLines.length === 0) return null;
            return (
              <section className="mb-8 border-t border-gray-200 pt-6">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <History className="w-4 h-4" />
                  Order updates
                </h2>
                <ul className="space-y-2">
                  {activityLines.map((row, i) => (
                    <li
                      key={`${row.at}-${i}`}
                      className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <span className="text-gray-900">{row.message}</span>
                      <span className="text-gray-500 text-xs sm:text-sm shrink-0">
                        {formatDateTime(row.at)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  Updates to items, pricing, delivery status, and other changes on your order.
                </p>
              </section>
            );
          })()}

          {(s.orderNotes || s.invoiceNotes) && (
            <section className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-lg">
              <h2 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Notes</h2>
              {s.orderNotes && <p className="text-sm text-amber-900 whitespace-pre-wrap">{s.orderNotes}</p>}
              {s.invoiceNotes && s.invoiceNotes !== s.orderNotes && (
                <p className="text-sm text-amber-900 whitespace-pre-wrap mt-2">{s.invoiceNotes}</p>
              )}
            </section>
          )}

          <footer className="border-t border-gray-200 pt-6 text-center text-sm text-gray-600">
            <p>Thank you for your business.</p>
            <p className="mt-2 text-xs">
              For questions about this order, contact{' '}
              {s.agent?.name ? (
                <>
                  {s.agent.name}
                  {s.agent.phone ? ` (${s.agent.phone})` : ''}
                  {s.agent.email ? (
                    <>
                      {' \u00B7 '}
                      {s.agent.email}
                    </>
                  ) : null}
                  {' or '}
                </>
              ) : null}
              {s.company.name}
              {s.company.phone ? ` at ${s.company.phone}` : ''}.
            </p>
            <p className="mt-4 text-xs text-gray-400">
              Generated {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}


