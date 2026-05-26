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

export interface OrderLogisticsReadyEmailPayload extends OrderCreatedEmailPayload {
  approvedBy: string | null;
  logisticsEmails?: string[];
}

function logisticsScheduleUrl(p: OrderLogisticsReadyEmailPayload): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const base = `${appUrl.replace(/\/$/, '')}/logistics?order=${p.orderId}`;
  if (p.deliveryType === 'Ship') return `${base}&tab=dispatch&mode=interisland`;
  return `${base}&tab=routes`;
}

/** Email to branch logistics when an order is approved and ready to schedule. */
export function buildOrderLogisticsReadyEmailHtml(p: OrderLogisticsReadyEmailPayload): string {
  const lineCount = p.lineCount ?? p.items.length;
  const approvedLabel = p.approvedBy?.trim() || 'Executive';
  const isShip = p.deliveryType === 'Ship';
  const ctaLabel = isShip ? 'Schedule shipment' : 'Plan route';
  const scheduleUrl = logisticsScheduleUrl(p);

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
    detailRow('Approved by', approvedLabel),
  ].join('');

  const logisticsRows = [
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
    p.paymentTerms ? detailRow('Payment terms', p.paymentTerms) : '',
  ]
    .filter(Boolean)
    .join('');

  const notesBlock = p.orderNotes?.trim()
    ? infoCard('Order notes', detailRow('Notes', p.orderNotes.trim()), `${p.orderNumber} · ready to schedule · notes`)
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Order ready to schedule</h1>
            <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Branch')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, 'Ready to schedule')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong>
              was approved by ${esc(approvedLabel)} and is ready for ${isShip ? 'shipment scheduling' : 'route planning'} in Lamtex.
            </p>
            ${infoCard('Order summary', orderSummaryRows, `${p.orderNumber} · ready to schedule · summary`)}
            ${logisticsRows ? infoCard('Delivery & payment', logisticsRows, `${p.orderNumber} · ready to schedule · delivery`) : ''}
            ${notesBlock}
            ${sectionTitle('Next step', `${p.orderNumber} · logistics`)}
            <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.55;">
              Open the logistics workspace to ${isShip ? 'assign this order to a vessel dispatch' : 'add this order to a delivery route'}.
            </p>
            <div style="text-align:center;">
              <a href="${scheduleUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${ctaLabel}</a>
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
