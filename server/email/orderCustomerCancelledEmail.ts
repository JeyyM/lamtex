import type { OrderCustomerApprovedEmailPayload } from './orderCustomerApprovedEmail';
import { agentContactCard, customerPortalUrl } from './orderCustomerApprovedEmail';
import {
  badge,
  detailRow,
  esc,
  formatDate,
  infoCard,
  sectionTitle,
  statusBadgeStyle,
} from './emailHtmlUtils';

export interface OrderCustomerCancelledEmailPayload extends OrderCustomerApprovedEmailPayload {
  cancellationReason: string;
  cancelledBy?: string | null;
  tripNumber?: string | null;
}

export function orderCustomerCancelledSubject(p: Pick<OrderCustomerCancelledEmailPayload, 'orderNumber'>): string {
  return `Order ${p.orderNumber} has been cancelled`;
}

/** Customer-facing email when their order is cancelled (e.g. from a trip). */
export function buildOrderCustomerCancelledEmailHtml(p: OrderCustomerCancelledEmailPayload): string {
  const greetingName =
    p.customerContactPerson?.trim() ||
    p.customerName?.trim() ||
    'Valued customer';
  const portalUrl = customerPortalUrl(p);
  const reason = p.cancellationReason?.trim() || 'No reason provided';
  const tripNote = p.tripNumber?.trim()
    ? `<p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.55;">
         This order was removed from delivery trip <strong>${esc(p.tripNumber.trim())}</strong> and has been cancelled.
       </p>`
    : '';

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', 'Cancelled', badge('Cancelled', statusBadgeStyle('Cancelled'))),
    detailRow('Required delivery', formatDate(p.requiredDate)),
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
  ]
    .filter(Boolean)
    .join('');

  const reasonBlock = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
    <tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
      <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px;">Cancellation reason</div>
      <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${esc(reason)}</div>
    </td></tr>
  </table>`;

  const portalBlock = portalUrl
    ? `${sectionTitle('View your order online')}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order details</a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your order has been cancelled</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Lamtex')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.55;">
              We are writing to confirm that order <strong>${esc(p.orderNumber)}</strong> has been cancelled.
            </p>
            ${tripNote}
            ${reasonBlock}
            ${infoCard('Order details', orderSummaryRows, `${p.orderNumber} · customer · cancelled`, { hideMeta: true })}
            ${agentContactCard(p.agent, p.orderNumber)}
            ${portalBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex · Order cancellation notice
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
