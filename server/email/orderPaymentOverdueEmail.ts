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
} from './emailHtmlUtils';

export interface OrderPaymentOverdueEmailPayload extends OrderCreatedEmailPayload {
  dueDate: string | null;
  daysOverdue: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  notifyTarget: 'executive' | 'agent';
  agentEmail?: string | null;
}

function orderUrl(orderId: string): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/orders/${orderId}`;
}

/** Order payment overdue — routed to executives or the assigned agent. */
export function buildOrderPaymentOverdueEmailHtml(p: OrderPaymentOverdueEmailPayload): string {
  const target = p.notifyTarget;
  const lineCount = p.lineCount ?? p.items.length;
  const daysLabel = p.daysOverdue === 1 ? '1 day' : `${p.daysOverdue} days`;

  const headerStyles = {
    executive: {
      bg: 'background:linear-gradient(135deg,#b91c1c,#991b1b);',
      sub: 'color:#fecaca;',
      title: 'Order payment overdue',
    },
    agent: {
      bg: 'background:linear-gradient(135deg,#c2410c,#9a3412);',
      sub: 'color:#ffedd5;',
      title: 'Customer payment overdue',
    },
  }[target];

  const intro =
    target === 'executive'
      ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong> is <strong>${esc(daysLabel)} past payment terms</strong> with <strong>${peso(p.balanceDue)}</strong> still outstanding.`
      : `Your customer order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong> is <strong>${esc(daysLabel)} past payment terms</strong>. Outstanding balance: <strong>${peso(p.balanceDue)}</strong>.`;

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Customer', p.customerName ?? '—'),
    detailRow('Sales agent', p.agentName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Payment terms', p.paymentTerms ?? '—'),
    detailRow('Due date', formatDate(p.dueDate)),
    detailRow('Days overdue', daysLabel),
    detailRow('Order total', peso(p.totalAmount)),
    detailRow('Amount paid', peso(p.amountPaid)),
    detailRow(
      'Balance due',
      peso(p.balanceDue),
      `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:13px;font-weight:700;">Overdue</span>`,
    ),
    detailRow(
      'Payment status',
      p.paymentStatus ?? 'Overdue',
      badge(p.paymentStatus ?? 'Overdue', statusBadgeStyle('Overdue')),
    ),
    detailRow('Line items', String(lineCount)),
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
          <td style="${headerStyles.bg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headerStyles.title}</h1>
            <p style="margin:8px 0 0;${headerStyles.sub}font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Branch')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, 'Payment overdue')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard('Overdue order summary', orderSummaryRows, `${p.orderNumber} · payment overdue · summary`)}
            ${sectionTitle('Products ordered', `${p.orderNumber} · ${lineCount} line(s)`)}
            <div style="margin-top:28px;text-align:center;">
              <a href="${orderUrl(p.orderId)}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP · Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
