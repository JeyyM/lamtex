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

export interface OrderDeliveryRecordedEmailPayload extends OrderCreatedEmailPayload {
  recordedBy: string | null;
  tripNumber?: string | null;
  actualDelivery?: string | null;
  notifyTarget: 'executive' | 'agent';
  agentEmail?: string | null;
}

function orderUrl(orderId: string): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/orders/${orderId}`;
}

/** Delivery recorded — routed to executives or the assigned agent. */
export function buildOrderDeliveryRecordedEmailHtml(p: OrderDeliveryRecordedEmailPayload): string {
  const target = p.notifyTarget;
  const lineCount = p.lineCount ?? p.items.length;
  const recordedLabel = p.recordedBy?.trim() || 'Logistics';
  const isComplete = p.status === 'Delivered';
  const tripLabel = p.tripNumber?.trim() || '—';

  const headerStyles = {
    executive: {
      bg: 'background:linear-gradient(135deg,#0f766e,#115e59);',
      sub: 'color:#ccfbf1;',
      title: isComplete ? 'Order delivered' : 'Partial delivery recorded',
    },
    agent: {
      bg: 'background:linear-gradient(135deg,#4f46e5,#4338ca);',
      sub: 'color:#e0e7ff;',
      title: isComplete ? 'Your customer order was delivered' : 'Partial delivery recorded',
    },
  }[target];

  const intro = isComplete
    ? target === 'executive'
      ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong> was fully delivered${recordedLabel ? ` (${esc(recordedLabel)})` : ''}.`
      : `Order <strong>${esc(p.orderNumber)}</strong> for your customer <strong>${esc(p.customerName ?? 'the customer')}</strong> was fully delivered${recordedLabel ? ` — recorded by ${esc(recordedLabel)}` : ''}.`
    : target === 'executive'
      ? `A partial delivery was recorded for order <strong>${esc(p.orderNumber)}</strong> (${esc(p.customerName ?? 'the customer')})${recordedLabel ? ` by ${esc(recordedLabel)}` : ''}.`
      : `A partial delivery was recorded for order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'your customer')}</strong>${recordedLabel ? ` by ${esc(recordedLabel)}` : ''}.`;

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Customer', p.customerName ?? '—'),
    detailRow('Sales agent', p.agentName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Trip / shipment', tripLabel),
    p.actualDelivery ? detailRow('Delivery date', formatDate(p.actualDelivery)) : '',
    detailRow('Required delivery', formatDate(p.requiredDate)),
    detailRow('Urgency', p.urgency ?? 'Medium', badge(p.urgency ?? 'Medium', urgencyBadgeStyle(p.urgency))),
    detailRow('Line items', String(lineCount)),
    detailRow('Order total', peso(p.totalAmount)),
    detailRow('Recorded by', recordedLabel),
  ]
    .filter(Boolean)
    .join('');

  const logisticsRows = [
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
    p.paymentTerms ? detailRow('Payment terms', p.paymentTerms) : '',
  ]
    .filter(Boolean)
    .join('');

  const refLabel = isComplete ? 'Delivered' : 'Partial delivery';

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
            ${emailRefLine(p.orderNumber, refLabel)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard('Delivery summary', orderSummaryRows, `${p.orderNumber} · delivery · summary`)}
            ${logisticsRows ? infoCard('Delivery & payment', logisticsRows, `${p.orderNumber} · delivery · details`) : ''}
            ${sectionTitle('Next step', `${p.orderNumber} · delivery`)}
            <div style="text-align:center;margin-top:8px;">
              <a href="${orderUrl(p.orderId)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order</a>
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
