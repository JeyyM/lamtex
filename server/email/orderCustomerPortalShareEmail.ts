import type { OrderCreatedEmailPayload } from './orderCreatedEmail';
import {
  agentContactCard,
  customerPortalUrl,
  type OrderAgentContact,
} from './orderCustomerApprovedEmail';
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

export interface OrderCustomerPortalShareEmailPayload extends OrderCreatedEmailPayload {
  customerEmail: string;
  customerContactPerson?: string | null;
  agent: OrderAgentContact;
  portalToken?: string | null;
}

/** Customer-facing email when staff manually share the order portal link. */
export function buildOrderCustomerPortalShareEmailHtml(
  p: OrderCustomerPortalShareEmailPayload,
): string {
  const greetingName =
    p.customerContactPerson?.trim() ||
    p.customerName?.trim() ||
    'Valued customer';
  const portalUrl = customerPortalUrl(p);

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Order date', formatDate(p.orderDate)),
    detailRow('Required delivery', formatDate(p.requiredDate)),
    detailRow('Order total', peso(p.totalAmount)),
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
  ]
    .filter(Boolean)
    .join('');

  const portalBlock = portalUrl
    ? `${sectionTitle('View your order online')}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
       </div>
       <p style="margin:16px 0 0;color:#6b7280;font-size:13px;line-height:1.5;text-align:center;">
         Or copy this link into your browser:<br>
         <a href="${portalUrl}" style="color:#047857;word-break:break-all;">${esc(portalUrl)}</a>
       </p>`
    : `<p style="margin:16px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">Your order link could not be generated. Please contact your sales agent for assistance.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#047857);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your order is ready to view online</h1>
            <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Lamtex')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Here is a secure link to view the status and details of your order
              <strong>${esc(p.orderNumber)}</strong>. You can track progress, review line items, and see delivery updates at any time.
            </p>
            ${infoCard('Order summary', orderSummaryRows, `${p.orderNumber} · customer · summary`, { hideMeta: true })}
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
