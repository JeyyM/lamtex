import type { OrderCreatedEmailPayload } from './orderCreatedEmail';
import {
  badge,
  detailRow,
  esc,
  formatDate,
  infoCard,
  peso,
  sectionTitle,
  statusBadgeStyle,
} from './emailHtmlUtils';

export type TripDelayedAffectedOrder = {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail?: string | null;
  customerContactPerson?: string | null;
  status: string;
  requiredDate?: string | null;
  orderDate?: string | null;
  totalAmount?: number;
  deliveryType?: string | null;
  deliveryAddress?: string | null;
  agentEmail?: string | null;
  agentName?: string | null;
};

export interface TripDelayedEmailPayload {
  tripId: string;
  tripNumber: string;
  delayReason: string;
  reportedBy: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  branchName?: string | null;
  tripScheduledDate?: string | null;
  affectedOrders: TripDelayedAffectedOrder[];
  notifyTarget: 'logistics' | 'agent' | 'customer';
  logisticsEmails?: string[];
  agentEmail?: string | null;
  /** Single order context when notifyTarget is agent */
  orderId?: string;
  orderNumber?: string;
  customerName?: string | null;
  status?: string;
  requiredDate?: string | null;
  totalAmount?: number;
  agentName?: string | null;
}

function logisticsUrl(): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/logistics?tab=dispatch`;
}

function orderUrl(orderId: string): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/orders/${orderId}`;
}

export function tripDelayedSubject(p: TripDelayedEmailPayload): string {
  if (p.notifyTarget === 'agent' && p.orderNumber) {
    return `Trip delay — order ${p.orderNumber} (${p.tripNumber})`;
  }
  return `Trip delayed — ${p.tripNumber} (${p.affectedOrders.length} order${p.affectedOrders.length !== 1 ? 's' : ''})`;
}

export function buildTripDelayedEmailHtml(p: TripDelayedEmailPayload): string {
  const reporter = p.reportedBy?.trim() || 'Staff';
  const reason = p.delayReason.trim() || 'No reason provided';
  const isAgent = p.notifyTarget === 'agent';

  const header = isAgent
    ? {
        bg: 'background:linear-gradient(135deg,#b45309,#c2410c);',
        sub: 'color:#ffedd5;',
        title: 'Trip delay on your order',
      }
    : {
        bg: 'background:linear-gradient(135deg,#dc2626,#b91c1c);',
        sub: 'color:#fecaca;',
        title: 'Trip marked delayed',
      };

  const intro = isAgent
    ? `Trip <strong>${esc(p.tripNumber)}</strong> was marked delayed for order <strong>${esc(p.orderNumber ?? '—')}</strong> (${esc(p.customerName ?? 'your customer')}).`
    : `Trip <strong>${esc(p.tripNumber)}</strong> was marked delayed with <strong>${p.affectedOrders.length}</strong> order${p.affectedOrders.length !== 1 ? 's' : ''} still outstanding.`;

  const tripRows = [
    detailRow('Trip', p.tripNumber),
    detailRow('Vehicle', p.vehicleName ?? '—'),
    p.driverName?.trim() ? detailRow('Driver', p.driverName) : '',
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Reported by', reporter),
    detailRow('Delay reason', reason),
  ]
    .filter(Boolean)
    .join('');

  const orderRows = isAgent
    ? [
        detailRow('Order number', p.orderNumber ?? '—'),
        detailRow('Status', p.status ?? '—', badge(p.status ?? '—', statusBadgeStyle(p.status ?? 'Delayed'))),
        detailRow('Customer', p.customerName ?? '—'),
        p.agentName?.trim() ? detailRow('Sales agent', p.agentName) : '',
        detailRow('Required delivery', formatDate(p.requiredDate)),
        p.totalAmount != null ? detailRow('Order total', peso(p.totalAmount)) : '',
      ]
        .filter(Boolean)
        .join('')
    : p.affectedOrders
        .map((o) =>
          detailRow(
            o.orderNumber,
            `${o.customerName ?? 'Customer'} · ${o.status}`,
            `<span style="color:#374151;font-size:14px;">Required ${formatDate(o.requiredDate)} · ${peso(o.totalAmount ?? 0)}</span>`,
          ),
        )
        .join('');

  const ctaHref = isAgent && p.orderId ? orderUrl(p.orderId) : logisticsUrl();
  const ctaLabel = isAgent ? 'View order' : 'View dispatch board';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${header.bg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${header.title}</h1>
            <p style="margin:8px 0 0;${header.sub}font-size:14px;">${esc(p.tripNumber)} · ${esc(p.branchName ?? 'Lamtex')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${sectionTitle('Trip details')}
            ${infoCard('', tripRows, '', { hideMeta: true })}
            ${sectionTitle(isAgent ? 'Order' : 'Affected orders')}
            ${infoCard('', orderRows, '', { hideMeta: true })}
            <div style="margin-top:24px;text-align:center;">
              <a href="${ctaHref}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">${ctaLabel}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex · Trip delay notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
