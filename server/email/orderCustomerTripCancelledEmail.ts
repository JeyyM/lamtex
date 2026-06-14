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

export interface OrderCustomerTripCancelledEmailPayload extends OrderCustomerApprovedEmailPayload {
  tripNumber?: string | null;
  tripScheduledDate?: string | null;
  cancellationReason?: string | null;
}

/** Customer-facing email when their order's delivery trip is cancelled. */
export function buildOrderCustomerTripCancelledEmailHtml(
  p: OrderCustomerTripCancelledEmailPayload,
): string {
  const greetingName =
    p.customerContactPerson?.trim() ||
    p.customerName?.trim() ||
    'Valued customer';
  const tripLabel = p.tripNumber?.trim() || 'your delivery trip';
  const scheduleDate = p.tripScheduledDate?.trim();
  const reason = p.cancellationReason?.trim() || null;
  const portalUrl = customerPortalUrl(p);
  const orderStatus = p.status?.trim() || 'Approved';
  const wasDelivered = orderStatus === 'Delivered' || orderStatus === 'Partially Fulfilled';

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', orderStatus, badge(orderStatus, statusBadgeStyle(orderStatus))),
    detailRow('Cancelled trip', tripLabel),
    scheduleDate ? detailRow('Planned dispatch date', formatDate(scheduleDate)) : '',
    detailRow('Required delivery', formatDate(p.requiredDate)),
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
    reason ? detailRow('Reason', reason) : '',
  ]
    .filter(Boolean)
    .join('');

  const intro = wasDelivered
    ? `Delivery trip <strong>${esc(tripLabel)}</strong>${scheduleDate ? ` planned for <strong>${esc(formatDate(scheduleDate))}</strong>` : ''} was cancelled. Your order <strong>${esc(p.orderNumber)}</strong> was already marked delivered — this notice is for your records.`
    : `Delivery trip <strong>${esc(tripLabel)}</strong>${scheduleDate ? ` planned for <strong>${esc(formatDate(scheduleDate))}</strong>` : ''} was cancelled. Order <strong>${esc(p.orderNumber)}</strong> is back in our dispatch queue and we will confirm a new delivery date as soon as possible.`;

  const portalBlock = portalUrl
    ? `${sectionTitle('View your order online')}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#991b1b;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
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
          <td style="background:linear-gradient(135deg,#991b1b,#7f1d1d);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Delivery trip cancelled</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.orderNumber)} · ${esc(tripLabel)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard('Order details', orderSummaryRows, `${p.orderNumber} · trip cancelled`, { hideMeta: true })}
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
