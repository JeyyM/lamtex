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

export interface OrderCustomerUnscheduledEmailPayload extends OrderCustomerApprovedEmailPayload {
  previousScheduledDate?: string | null;
}

/** Customer-facing email when their order is removed from a planned route. */
export function buildOrderCustomerUnscheduledEmailHtml(p: OrderCustomerUnscheduledEmailPayload): string {
  const greetingName =
    p.customerContactPerson?.trim() ||
    p.customerName?.trim() ||
    'Valued customer';
  const previousDate = p.previousScheduledDate?.trim();
  const portalUrl = customerPortalUrl(p);

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', 'Approved', badge('Approved', statusBadgeStyle('Approved'))),
    previousDate ? detailRow('Previous planned dispatch', formatDate(previousDate)) : '',
    detailRow('Required delivery', formatDate(p.requiredDate)),
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
  ]
    .filter(Boolean)
    .join('');

  const previousDateNote = previousDate
    ? `<p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.55;">
         The previously planned dispatch date was <strong>${esc(formatDate(previousDate))}</strong>.
       </p>`
    : '';

  const portalBlock = portalUrl
    ? `${sectionTitle('View your order online')}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
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
          <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Update on your delivery schedule</h1>
            <p style="margin:8px 0 0;color:#e0e7ff;font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Lamtex')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.55;">
              Your order <strong>${esc(p.orderNumber)}</strong> is no longer on its previously planned delivery route.
              Our logistics team is working to assign a new dispatch date and will confirm it as soon as it is set.
            </p>
            ${previousDateNote}
            <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.55;">
              This update does not necessarily mean your order is delayed — we are adjusting the schedule and will keep you informed.
            </p>
            ${infoCard('Order details', orderSummaryRows, `${p.orderNumber} · customer · schedule update`, { hideMeta: true })}
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
