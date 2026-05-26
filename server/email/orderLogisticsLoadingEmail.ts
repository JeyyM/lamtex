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

export interface OrderLogisticsLoadingEmailPayload extends OrderCreatedEmailPayload {
  markedBy: string | null;
  logisticsEmails?: string[];
}

function logisticsOrderUrl(p: OrderLogisticsLoadingEmailPayload): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const base = `${appUrl.replace(/\/$/, '')}/logistics?order=${p.orderId}`;
  if (p.deliveryType === 'Ship') return `${base}&tab=dispatch&mode=interisland`;
  return `${base}&tab=routes`;
}

/** Email to branch logistics when warehouse marks an order as Loading. */
export function buildOrderLogisticsLoadingEmailHtml(p: OrderLogisticsLoadingEmailPayload): string {
  const lineCount = p.lineCount ?? p.items.length;
  const markedLabel = p.markedBy?.trim() || 'Warehouse';
  const logisticsUrl = logisticsOrderUrl(p);

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
    detailRow('Loading started by', markedLabel),
  ].join('');

  const logisticsRows = [
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
    p.paymentTerms ? detailRow('Payment terms', p.paymentTerms) : '',
  ]
    .filter(Boolean)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#d97706,#b45309);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Order loading started</h1>
            <p style="margin:8px 0 0;color:#fef3c7;font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Branch')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, 'Loading at warehouse')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong>
              is now being loaded at the warehouse${markedLabel ? ` (${esc(markedLabel)})` : ''}.
              Track progress in the logistics workspace.
            </p>
            ${infoCard('Order summary', orderSummaryRows, `${p.orderNumber} · loading · summary`)}
            ${logisticsRows ? infoCard('Delivery & payment', logisticsRows, `${p.orderNumber} · loading · delivery`) : ''}
            ${sectionTitle('Next step', `${p.orderNumber} · logistics`)}
            <div style="text-align:center;margin-top:8px;">
              <a href="${logisticsUrl}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Open logistics</a>
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
