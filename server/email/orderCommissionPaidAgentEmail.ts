import type { OrderCreatedEmailPayload } from './orderCreatedEmail';
import {
  badge,
  detailRow,
  esc,
  infoCard,
  peso,
  sectionTitle,
  statusBadgeStyle,
} from './emailHtmlUtils';

export interface OrderCommissionPaidAgentEmailPayload extends OrderCreatedEmailPayload {
  paidBy: string | null;
  agentEmail: string;
  commissionAmount: number;
  cashAmount: number;
  proofCount: number;
  paymentStatus?: string | null;
}

function orderUrl(orderId: string): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/orders/${orderId}`;
}

/** Agent email when commission is marked paid out on payment proof(s). */
export function buildOrderCommissionPaidAgentEmailHtml(p: OrderCommissionPaidAgentEmailPayload): string {
  const paidLabel = p.paidBy?.trim() || 'Finance';
  const isBulk = (p.proofCount ?? 1) > 1;
  const headline = isBulk ? 'Commissions paid out' : 'Commission paid out';
  const intro = isBulk
    ? `Commission totaling <strong>${peso(p.commissionAmount)}</strong> was released for <strong>${p.proofCount}</strong> cash payment proof(s) on order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'your customer')}</strong> by ${esc(paidLabel)}.`
    : `Commission of <strong>${peso(p.commissionAmount)}</strong> was released for a cash payment of <strong>${peso(p.cashAmount)}</strong> on order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'your customer')}</strong> by ${esc(paidLabel)}.`;

  const summaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Customer', p.customerName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Payment proofs', String(p.proofCount ?? 1)),
    detailRow('Cash payments', peso(p.cashAmount)),
    detailRow('Commission paid out', peso(p.commissionAmount)),
    detailRow('Released by', paidLabel),
    p.paymentStatus ? detailRow('Payment status', p.paymentStatus, badge(p.paymentStatus, statusBadgeStyle(p.paymentStatus))) : '',
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
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
            <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Lamtex')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${sectionTitle('Payout summary')}
            ${infoCard('', summaryRows, `${p.orderNumber} · agent · commission`, { hideMeta: true })}
            <div style="margin-top:24px;text-align:center;">
              <a href="${orderUrl(p.orderId)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">View order</a>
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
