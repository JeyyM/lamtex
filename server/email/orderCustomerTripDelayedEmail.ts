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

export interface OrderCustomerTripDelayedEmailPayload extends OrderCustomerApprovedEmailPayload {
  tripNumber?: string | null;
  tripScheduledDate?: string | null;
  delayReason?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
}

/** Customer-facing email when their order's delivery trip is marked delayed. */
export function buildOrderCustomerTripDelayedEmailHtml(
  p: OrderCustomerTripDelayedEmailPayload,
): string {
  const greetingName =
    p.customerContactPerson?.trim() ||
    p.customerName?.trim() ||
    'Valued customer';
  const tripLabel = p.tripNumber?.trim() || 'your delivery trip';
  const scheduleDate = p.tripScheduledDate?.trim();
  const reason = p.delayReason?.trim() || null;
  const portalUrl = customerPortalUrl(p);

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', 'Delayed', badge('Delayed', statusBadgeStyle('Delayed'))),
    detailRow('Trip', tripLabel),
    scheduleDate ? detailRow('Planned dispatch date', formatDate(scheduleDate)) : '',
    p.vehicleName?.trim() ? detailRow('Vehicle', p.vehicleName.trim()) : '',
    p.driverName?.trim() ? detailRow('Driver', p.driverName.trim()) : '',
    detailRow('Required delivery', formatDate(p.requiredDate)),
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
    reason ? detailRow('Delay reason', reason) : '',
  ]
    .filter(Boolean)
    .join('');

  const intro = `Delivery trip <strong>${esc(tripLabel)}</strong>${scheduleDate ? ` planned for <strong>${esc(formatDate(scheduleDate))}</strong>` : ''} has been marked delayed. Order <strong>${esc(p.orderNumber)}</strong> is still active — we are working to complete your delivery and will update you when we have a revised ETA.`;

  const portalBlock = portalUrl
    ? `${sectionTitle('View your order online')}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#c2410c;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
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
          <td style="background:linear-gradient(135deg,#c2410c,#b45309);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Delivery delayed</h1>
            <p style="margin:8px 0 0;color:#ffedd5;font-size:14px;">${esc(p.orderNumber)} · ${esc(tripLabel)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard('Order details', orderSummaryRows, `${p.orderNumber} · trip delayed`, { hideMeta: true })}
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
