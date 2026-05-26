import type { OrderCreatedEmailPayload } from './orderCreatedEmail';
import {
  badge,
  detailRow,
  emailRefLine,
  esc,
  formatDate,
  infoCard,
  peso,
  sectionTitle,
  statusBadgeStyle,
  urgencyBadgeStyle,
} from './emailHtmlUtils';

export interface OrderPackedEmailPayload extends OrderCreatedEmailPayload {
  markedBy: string | null;
  notifyTarget: 'logistics' | 'agent';
  logisticsEmails?: string[];
  agentEmail?: string | null;
}

function orderUrl(p: OrderPackedEmailPayload): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  if (p.notifyTarget === 'logistics') {
    const base = `${appUrl.replace(/\/$/, '')}/logistics?order=${p.orderId}`;
    if (p.deliveryType === 'Ship') return `${base}&tab=dispatch&mode=interisland`;
    return `${base}&tab=routes`;
  }
  return `${appUrl.replace(/\/$/, '')}/orders/${p.orderId}`;
}

/** Order packed — routed to branch logistics or the assigned agent. */
export function buildOrderPackedEmailHtml(p: OrderPackedEmailPayload): string {
  const target = p.notifyTarget;
  const lineCount = p.lineCount ?? p.items.length;
  const markedLabel = p.markedBy?.trim() || 'Warehouse';
  const ctaUrl = orderUrl(p);

  const headerStyles = {
    logistics: {
      bg: 'background:linear-gradient(135deg,#059669,#047857);',
      sub: 'color:#d1fae5;',
      title: 'Order packed — ready for dispatch',
    },
    agent: {
      bg: 'background:linear-gradient(135deg,#4f46e5,#4338ca);',
      sub: 'color:#e0e7ff;',
      title: 'Your customer order is packed',
    },
  }[target];

  const intro =
    target === 'logistics'
      ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong> has been packed at the warehouse${markedLabel ? ` (${esc(markedLabel)})` : ''}. It is ready for dispatch planning.`
      : `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'your customer')}</strong> has been packed${markedLabel ? ` by ${esc(markedLabel)}` : ''} and is ready for dispatch.`;

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Urgency', p.urgency ?? 'Medium', badge(p.urgency ?? 'Medium', urgencyBadgeStyle(p.urgency))),
    detailRow('Customer', p.customerName ?? '—'),
    detailRow('Sales agent', p.agentName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Order date', formatDate(p.orderDate)),
    detailRow('Required delivery', formatDate(p.requiredDate)),
    detailRow('Line items', String(lineCount)),
    detailRow('Order total', peso(p.totalAmount)),
    detailRow('Packed by', markedLabel),
  ].join('');

  const logisticsRows = [
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
    p.paymentTerms ? detailRow('Payment terms', p.paymentTerms) : '',
  ]
    .filter(Boolean)
    .join('');

  const ctaLabel = target === 'logistics' ? 'Open logistics' : 'View order';
  const ctaColor = target === 'logistics' ? '#059669' : '#4f46e5';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerStyles.bg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headerStyles.title}</h1>
            <p style="margin:8px 0 0;${headerStyles.sub}font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Branch')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, 'Packed')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard('Order summary', orderSummaryRows, `${p.orderNumber} · packed · summary`)}
            ${logisticsRows ? infoCard('Delivery & payment', logisticsRows, `${p.orderNumber} · packed · delivery`) : ''}
            ${sectionTitle('Next step', `${p.orderNumber} · packed`)}
            <div style="text-align:center;margin-top:8px;">
              <a href="${ctaUrl}" style="display:inline-block;background:${ctaColor};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${ctaLabel}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex · Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
