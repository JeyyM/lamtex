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

export interface OrderCustomerInTransitEmailPayload extends OrderCustomerApprovedEmailPayload {
  tripNumber?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
}

/** Customer-facing email when their order is in transit. */
export function buildOrderCustomerInTransitEmailHtml(p: OrderCustomerInTransitEmailPayload): string {
  const greetingName =
    p.customerContactPerson?.trim() ||
    p.customerName?.trim() ||
    'Valued customer';
  const portalUrl = customerPortalUrl(p);
  const tripLabel = p.tripNumber?.trim() || null;

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', 'In Transit', badge('In Transit', statusBadgeStyle('In Transit'))),
    tripLabel ? detailRow('Shipment reference', tripLabel) : '',
    p.vehicleName?.trim() ? detailRow('Vehicle', p.vehicleName.trim()) : '',
    detailRow('Required delivery', formatDate(p.requiredDate)),
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
  ]
    .filter(Boolean)
    .join('');

  const portalBlock = portalUrl
    ? `${sectionTitle('Track your order')}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
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
          <td style="background:linear-gradient(135deg,#d97706,#b45309);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your order is on the way</h1>
            <p style="margin:8px 0 0;color:#fef3c7;font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Lamtex')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Your order <strong>${esc(p.orderNumber)}</strong> has left our warehouse and is now <strong>in transit</strong>.
              Our team is working to deliver it to you. Your sales agent can help if you have questions about delivery timing.
            </p>
            ${infoCard('Shipment details', orderSummaryRows, `${p.orderNumber} · customer · in transit`, { hideMeta: true })}
            ${agentContactCard(p.agent, p.orderNumber)}
            ${portalBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex · Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
