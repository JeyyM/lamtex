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
  urgencyBadgeStyle,
} from './emailHtmlUtils';

export interface OrderUnscheduledFromTripEmailPayload extends OrderCreatedEmailPayload {
  unscheduledBy: string | null;
  tripNumber?: string | null;
  previousScheduledDate?: string | null;
  cancellationReason?: string | null;
  notifyTarget: 'executive' | 'warehouse' | 'agent';
  warehouseEmails?: string[];
  agentEmail?: string | null;
}

function orderUrl(orderId: string): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/orders/${orderId}`;
}

/** Order unscheduled from a cancelled trip — executives, warehouse, or agent. */
export function buildOrderUnscheduledFromTripEmailHtml(p: OrderUnscheduledFromTripEmailPayload): string {
  const target = p.notifyTarget;
  const lineCount = p.lineCount ?? p.items.length;
  const actorLabel = p.unscheduledBy?.trim() || 'Logistics';
  const previousDate = p.previousScheduledDate?.trim() || '—';
  const tripLabel = p.tripNumber?.trim() || '—';
  const reason = p.cancellationReason?.trim() || null;

  const headerStyles = {
    executive: {
      bg: 'background:linear-gradient(135deg,#7c2d12,#9a3412);',
      sub: 'color:#ffedd5;',
      title: 'Order unscheduled',
    },
    warehouse: {
      bg: 'background:linear-gradient(135deg,#92400e,#78350f);',
      sub: 'color:#fef3c7;',
      title: 'Order removed from cancelled trip',
    },
    agent: {
      bg: 'background:linear-gradient(135deg,#6b21a8,#581c87);',
      sub: 'color:#f3e8ff;',
      title: 'Customer order unscheduled',
    },
  }[target];

  const intro =
    target === 'executive'
      ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong> was returned to <strong>Approved</strong> because trip <strong>${esc(tripLabel)}</strong> was cancelled by ${esc(actorLabel)}.`
      : target === 'warehouse'
        ? `Order <strong>${esc(p.orderNumber)}</strong> is no longer on trip <strong>${esc(tripLabel)}</strong>. It was scheduled for <strong>${esc(formatDate(previousDate))}</strong> and is back in the dispatch queue.`
        : `Trip <strong>${esc(tripLabel)}</strong> was cancelled. Order <strong>${esc(p.orderNumber)}</strong> for your customer <strong>${esc(p.customerName ?? 'the customer')}</strong> is unscheduled and back in the dispatch queue.`;

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Customer', p.customerName ?? '—'),
    detailRow('Sales agent', p.agentName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Previous schedule', formatDate(previousDate)),
    detailRow('Cancelled trip', tripLabel),
    detailRow('Required delivery', formatDate(p.requiredDate)),
    detailRow('Urgency', p.urgency ?? 'Medium', badge(p.urgency ?? 'Medium', urgencyBadgeStyle(p.urgency))),
    detailRow('Line items', String(lineCount)),
    detailRow('Order total', peso(p.totalAmount)),
    reason ? detailRow('Cancellation reason', reason) : '',
    target === 'executive' ? detailRow('Cancelled by', actorLabel) : '',
  ]
    .filter(Boolean)
    .join('');

  const url = orderUrl(p.orderId);

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
            <p style="margin:8px 0 0;${headerStyles.sub}font-size:14px;">${esc(p.orderNumber)} · trip ${esc(tripLabel)} cancelled</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, 'Trip cancelled')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard('Order summary', orderSummaryRows, `${p.orderNumber} · unscheduled`)}
            ${sectionTitle('Next step', `${p.orderNumber} · dispatch queue`)}
            <div style="text-align:center;margin-top:8px;">
              <a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex · Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
