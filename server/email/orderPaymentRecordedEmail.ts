import type { OrderCreatedEmailPayload } from './orderCreatedEmail';
import {
  badge,
  detailRow,
  esc,
  formatDate,
  infoCard,
  isOrderFullyPaid,
  peso,
  sectionTitle,
  statusBadgeStyle,
} from './emailHtmlUtils';

export interface OrderPaymentRecordedEmailPayload extends OrderCreatedEmailPayload {
  recordedBy: string | null;
  paymentCash: number;
  paymentCredit: number;
  paymentAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
}

function orderUrl(orderId: string): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/orders/${orderId}`;
}

function paidInFullBanner(): string {
  return `<div style="margin:0 0 20px;padding:16px 18px;background:linear-gradient(135deg,#ecfdf5,#fef9c3);border:1px solid #6ee7b7;border-radius:10px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:.08em;">Payment complete</p>
    <p style="margin:0;color:#065f46;font-size:15px;line-height:1.55;">This payment clears the order balance — the order is now <strong>fully paid</strong>.</p>
  </div>`;
}

/** Executive email when a payment is recorded on an order. */
export function buildOrderPaymentRecordedEmailHtml(p: OrderPaymentRecordedEmailPayload): string {
  const lineCount = p.lineCount ?? p.items.length;
  const recordedLabel = p.recordedBy?.trim() || 'Staff';
  const isPaid = isOrderFullyPaid(p.balanceDue, p.paymentStatus);

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Customer', p.customerName ?? '—'),
    detailRow('Sales agent', p.agentName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Required delivery', formatDate(p.requiredDate)),
    detailRow('Line items', String(lineCount)),
    detailRow('Order total', peso(p.totalAmount)),
    detailRow('Recorded by', recordedLabel),
  ]
    .filter(Boolean)
    .join('');

  const paymentRows = [
    detailRow('This payment', peso(p.paymentAmount)),
    detailRow('Cash / transfer / cheque', peso(p.paymentCash)),
    detailRow('Customer credit', peso(p.paymentCredit)),
    detailRow('Total paid (order)', peso(p.amountPaid)),
    isPaid
      ? detailRow(
          'Balance due',
          'Fully paid',
          `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#d1fae5;color:#047857;font-size:13px;font-weight:700;">Fully settled</span>`,
        )
      : detailRow('Balance due', peso(p.balanceDue)),
    detailRow(
      'Payment status',
      isPaid ? 'Paid in full' : (p.paymentStatus ?? '—'),
      badge(isPaid ? 'Paid' : (p.paymentStatus ?? '—'), statusBadgeStyle(isPaid ? 'Paid' : p.paymentStatus)),
    ),
  ]
    .filter(Boolean)
    .join('');

  const headerGradient = isPaid
    ? 'background:linear-gradient(135deg,#b45309 0%,#059669 55%,#047857 100%);'
    : 'background:linear-gradient(135deg,#059669,#047857);';
  const headerSubColor = isPaid ? 'color:#fef3c7;' : 'color:#d1fae5;';
  const headline = isPaid ? 'Order paid in full' : 'Payment received';
  const intro = isPaid
    ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong> is now <strong>fully paid</strong>. A final payment of <strong>${peso(p.paymentAmount)}</strong> was recorded by ${esc(recordedLabel)}.`
    : `A payment of <strong>${peso(p.paymentAmount)}</strong> was recorded on order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong> by ${esc(recordedLabel)}.`;

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
            <p style="margin:8px 0 0;${headerSubColor}font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Lamtex')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${isPaid ? paidInFullBanner() : ''}
            ${infoCard('Order summary', orderSummaryRows, `${p.orderNumber} · payment`, { hideMeta: true })}
            ${sectionTitle(isPaid ? 'Final payment details' : 'Payment details')}
            ${infoCard('', paymentRows, '', { hideMeta: true })}
            <div style="margin-top:24px;text-align:center;">
              <a href="${orderUrl(p.orderId)}" style="display:inline-block;background:${isPaid ? '#047857' : '#059669'};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">View order</a>
            </div>
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
