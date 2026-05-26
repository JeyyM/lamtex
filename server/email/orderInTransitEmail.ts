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

export interface OrderInTransitEmailPayload extends OrderCreatedEmailPayload {
  markedBy: string | null;
  tripNumber?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  notifyTarget: 'executive' | 'warehouse' | 'agent';
  warehouseEmails?: string[];
  agentEmail?: string | null;
}

function orderUrl(orderId: string): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/orders/${orderId}`;
}

/** Order in transit — routed to executives, warehouse staff, or the assigned agent. */
export function buildOrderInTransitEmailHtml(p: OrderInTransitEmailPayload): string {
  const target = p.notifyTarget;
  const lineCount = p.lineCount ?? p.items.length;
  const markedLabel = p.markedBy?.trim() || 'Logistics';
  const tripLabel = p.tripNumber?.trim() || '—';
  const vehicleLabel = p.vehicleName?.trim() || '—';
  const driverLabel = p.driverName?.trim() || '—';

  const headerStyles = {
    executive: {
      bg: 'background:linear-gradient(135deg,#0f766e,#115e59);',
      sub: 'color:#ccfbf1;',
      title: 'Order in transit',
    },
    warehouse: {
      bg: 'background:linear-gradient(135deg,#d97706,#b45309);',
      sub: 'color:#fef3c7;',
      title: 'Order departed — in transit',
    },
    agent: {
      bg: 'background:linear-gradient(135deg,#4f46e5,#4338ca);',
      sub: 'color:#e0e7ff;',
      title: 'Your customer order is in transit',
    },
  }[target];

  const intro =
    target === 'executive'
      ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong> is now in transit${markedLabel ? ` (${esc(markedLabel)})` : ''}. Shipment details are below.`
      : target === 'warehouse'
        ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'the customer')}</strong> has left the warehouse and is in transit${markedLabel ? ` — recorded by ${esc(markedLabel)}` : ''}.`
        : `Order <strong>${esc(p.orderNumber)}</strong> for your customer <strong>${esc(p.customerName ?? 'the customer')}</strong> is now in transit and on the way for delivery.`;

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Customer', p.customerName ?? '—'),
    detailRow('Sales agent', p.agentName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Trip / shipment', tripLabel),
    detailRow('Vehicle / container', vehicleLabel),
    p.driverName?.trim() ? detailRow('Driver', driverLabel) : '',
    detailRow('Required delivery', formatDate(p.requiredDate)),
    detailRow('Urgency', p.urgency ?? 'Medium', badge(p.urgency ?? 'Medium', urgencyBadgeStyle(p.urgency))),
    detailRow('Line items', String(lineCount)),
    detailRow('Order total', peso(p.totalAmount)),
    detailRow('Dispatched by', markedLabel),
  ]
    .filter(Boolean)
    .join('');

  const logisticsRows = [
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
    p.paymentTerms ? detailRow('Payment terms', p.paymentTerms) : '',
  ]
    .filter(Boolean)
    .join('');

  const refLabel =
    target === 'executive' ? 'In transit' : target === 'warehouse' ? 'Departed warehouse' : 'In transit for customer';
  const ctaLabel = 'View order';

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
            ${emailRefLine(p.orderNumber, refLabel)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard('Shipment summary', orderSummaryRows, `${p.orderNumber} · in transit · summary`)}
            ${logisticsRows ? infoCard('Delivery & payment', logisticsRows, `${p.orderNumber} · in transit · delivery`) : ''}
            ${sectionTitle('Next step', `${p.orderNumber} · in transit`)}
            <div style="text-align:center;margin-top:8px;">
              <a href="${orderUrl(p.orderId)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${ctaLabel}</a>
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
