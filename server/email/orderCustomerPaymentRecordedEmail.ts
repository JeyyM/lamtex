import type { OrderCustomerApprovedEmailPayload } from './orderCustomerApprovedEmail';
import { agentContactCard, customerPortalUrl } from './orderCustomerApprovedEmail';
import {
  badge,
  detailRow,
  esc,
  infoCard,
  isOrderFullyPaid,
  peso,
  sectionTitle,
  statusBadgeStyle,
} from './emailHtmlUtils';

export interface OrderCustomerPaymentRecordedEmailPayload extends OrderCustomerApprovedEmailPayload {
  paymentCash: number;
  paymentCredit: number;
  paymentAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
}

function manualRecordingNotice(): string {
  return `<div style="margin:20px 0 16px;padding:16px 18px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;">
    <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:700;line-height:1.45;">Manual payment recording</p>
    <p style="margin:0;color:#78350f;font-size:14px;line-height:1.55;">
      Payment amounts shown here are entered manually by our team. If anything does not match your records,
      please contact your sales agent below to resolve any discrepancy.
    </p>
  </div>`;
}

function agentContactBlock(agent: OrderCustomerPaymentRecordedEmailPayload['agent'], orderNumber: string): string {
  return agentContactCard(agent, orderNumber).replace('margin-bottom:16px', 'margin-bottom:0');
}

function paidInFullBanner(): string {
  return `<div style="margin:0 0 20px;padding:20px 22px;background:linear-gradient(135deg,#ecfdf5 0%,#fef3c7 100%);border:1px solid #6ee7b7;border-radius:12px;text-align:center;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:.08em;">Fully settled</p>
    <p style="margin:0;font-size:16px;font-weight:600;color:#065f46;line-height:1.45;">Your order is paid in full. Thank you for your business with Lamtex.</p>
  </div>`;
}

/** Customer-facing email when a payment is recorded on their order. */
export function buildOrderCustomerPaymentRecordedEmailHtml(
  p: OrderCustomerPaymentRecordedEmailPayload,
): string {
  const greetingName =
    p.customerContactPerson?.trim() ||
    p.customerName?.trim() ||
    'Valued customer';
  const portalUrl = customerPortalUrl(p);
  const isPaid = isOrderFullyPaid(p.balanceDue, p.paymentStatus);

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow(
      'Payment status',
      isPaid ? 'Paid in full' : p.paymentStatus,
      badge(isPaid ? 'Paid' : p.paymentStatus, statusBadgeStyle(isPaid ? 'Paid' : p.paymentStatus)),
    ),
    detailRow('Order total', peso(p.totalAmount)),
    detailRow('This payment', peso(p.paymentAmount)),
    p.paymentCash > 0 ? detailRow('Cash / transfer / cheque', peso(p.paymentCash)) : '',
    p.paymentCredit > 0 ? detailRow('Customer credit applied', peso(p.paymentCredit)) : '',
    detailRow('Total paid to date', peso(p.amountPaid)),
    isPaid
      ? detailRow(
          'Balance due',
          'Fully paid',
          `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#d1fae5;color:#047857;font-size:13px;font-weight:700;">Fully settled</span>`,
        )
      : detailRow('Balance due', peso(p.balanceDue)),
  ]
    .filter(Boolean)
    .join('');

  const portalBlock = portalUrl
    ? `<div style="margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb;">
         ${sectionTitle('View your order')}
         <div style="margin-top:10px;text-align:center;">
           <a href="${portalUrl}" style="display:inline-block;background:${isPaid ? '#047857' : '#059669'};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${isPaid ? 'View your completed order' : 'View order &amp; payment status'}</a>
         </div>
       </div>`
    : '';

  const headerGradient = isPaid
    ? 'background:linear-gradient(135deg,#b45309 0%,#059669 55%,#047857 100%);'
    : 'background:linear-gradient(135deg,#059669,#047857);';
  const headerSubColor = isPaid ? 'color:#fef3c7;' : 'color:#d1fae5;';
  const headline = isPaid ? 'Order paid in full' : 'Payment received on your order';
  const headerSub = isPaid
    ? `${esc(p.orderNumber)} · Fully settled · ${esc(p.branchName ?? 'Lamtex')}`
    : `${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Lamtex')}`;
  const bodyCopy = isPaid
    ? `We received your final payment of <strong>${peso(p.paymentAmount)}</strong> on order <strong>${esc(p.orderNumber)}</strong>. Your account for this order is now <strong>fully settled</strong>.`
    : `We recorded a payment of <strong>${peso(p.paymentAmount)}</strong> on order <strong>${esc(p.orderNumber)}</strong>. Your remaining balance is <strong>${peso(p.balanceDue)}</strong>.`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerGradient}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
            <p style="margin:8px 0 0;${headerSubColor}font-size:14px;">${headerSub}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${bodyCopy}</p>
            ${isPaid ? paidInFullBanner() : ''}
            ${infoCard(isPaid ? 'Payment complete' : 'Payment summary', orderSummaryRows, `${p.orderNumber} · customer · payment`, { hideMeta: true })}
            ${manualRecordingNotice()}
            <div style="margin-bottom:4px;">${agentContactBlock(p.agent, p.orderNumber)}</div>
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
