import type { OrderCreatedEmailPayload } from './orderCreatedEmail';
import {
  badge,
  detailRow,
  emailRefLine,
  esc,
  formatDate,
  formatUnitPriceCell,
  infoCard,
  peso,
  sectionTitle,
  statusBadgeStyle,
  urgencyBadgeStyle,
} from './emailHtmlUtils';
export interface OrderRevisedEmailPayload extends OrderCreatedEmailPayload {
  previousRejectionReason?: string | null;
}

/** Executive notification — agent revised a previously rejected order and resubmitted. */
export function buildOrderRevisedEmailHtml(p: OrderRevisedEmailPayload): string {
  const lineCount = p.lineCount ?? p.items.length;
  const discountAmount = p.discountAmount ?? Math.max(0, p.subtotal - p.totalAmount);

  const lineRows = p.items
    .map((item) => {
      const variantLine = item.variantDescription
        ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.variantDescription)}</div>`
        : '';
      return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(item.productName)}</div>
            ${variantLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${item.quantity}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatUnitPriceCell(item)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${peso(item.lineTotal)}</td>
        </tr>`;
    })
    .join('');

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const orderUrl = `${appUrl.replace(/\/$/, '')}/orders/${p.orderId}`;

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Urgency', p.urgency ?? 'Medium', badge(p.urgency ?? 'Medium', urgencyBadgeStyle(p.urgency))),
    detailRow('Order date', formatDate(p.orderDate)),
    detailRow('Required delivery', formatDate(p.requiredDate)),
    detailRow('Line items', String(lineCount)),
  ].join('');

  const peopleRows = [
    detailRow('Customer', p.customerName ?? '—'),
    detailRow('Sales agent', p.agentName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
  ].join('');

  const logisticsRows = [
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
    p.paymentTerms ? detailRow('Payment terms', p.paymentTerms) : '',
  ]
    .filter(Boolean)
    .join('');

  const agentLabel = p.agentName?.trim() || '—';

  const notesBlock = p.orderNotes?.trim()
    ? infoCard('Order notes', detailRow('Notes', p.orderNotes.trim()), `${p.orderNumber} · revised · notes`)
    : '';
  const previousRejectionBlock = p.previousRejectionReason?.trim()
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#92400e;margin-bottom:4px;">Previous rejection reason</div>
          <div style="font-size:13px;color:#78350f;line-height:1.5;">${esc(p.previousRejectionReason.trim())}</div>
        </td></tr>
      </table>`
    : '';

  const discountRow =
    discountAmount > 0
      ? `<tr>
      <td colspan="3" style="padding:6px 14px;color:#6b7280;text-align:right;">Discount${
        p.discountPercent ? ` (${p.discountPercent}%)` : ''
      }</td>
      <td style="padding:6px 14px;text-align:right;color:#059669;">−${peso(discountAmount)}</td>
    </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#d97706,#b45309);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Revised order by ${esc(agentLabel)}</h1>
            <p style="margin:8px 0 0;color:#fde68a;font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Branch')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, 'Revised & resubmitted')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">This order was previously rejected and has been <strong>revised and resubmitted</strong> for your review. Updated summary and line items are below.</p>
            ${previousRejectionBlock}
            ${infoCard('Order summary', orderSummaryRows, `${p.orderNumber} · revised · summary`)}
            ${infoCard('Customer & agent', peopleRows, `${p.orderNumber} · revised · customer & agent`)}
            ${logisticsRows ? infoCard('Delivery & payment', logisticsRows, `${p.orderNumber} · revised · delivery`) : ''}
            ${notesBlock}
            ${sectionTitle('Line items', `${p.orderNumber} · ${lineCount} item(s)`)}            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:10px 14px;color:#6b7280;text-align:right;border-top:1px solid #e5e7eb;">Subtotal</td>
                  <td style="padding:10px 14px;text-align:right;border-top:1px solid #e5e7eb;">${peso(p.subtotal)}</td>
                </tr>
                ${discountRow}
                <tr style="background:#fffbeb;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#92400e;text-align:right;font-size:15px;">Order total</td>
                  <td style="padding:14px;font-weight:700;color:#92400e;text-align:right;font-size:17px;">${peso(p.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${orderUrl}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Review revised order</a>
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
