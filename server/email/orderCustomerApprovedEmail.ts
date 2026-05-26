import type { OrderCreatedEmailPayload } from './orderCreatedEmail';
import {
  badge,
  detailRow,
  esc,
  formatDate,
  formatUnitPriceCell,
  infoCard,
  peso,
  sectionTitle,
  statusBadgeStyle,
} from './emailHtmlUtils';

export interface OrderAgentContact {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface OrderCustomerApprovedEmailPayload extends OrderCreatedEmailPayload {
  customerEmail: string;
  customerContactPerson?: string | null;
  approvedBy?: string | null;
  agent: OrderAgentContact;
  portalToken?: string | null;
}

export function customerPortalUrl(p: { portalToken?: string | null }): string | null {
  if (!p.portalToken?.trim()) return null;
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/order/${encodeURIComponent(p.portalToken.trim())}`;
}

export function agentContactCard(agent: OrderAgentContact, orderNumber: string): string {
  const phone = agent.phone?.trim();
  const email = agent.email?.trim();
  const phoneRow = phone
    ? detailRow(
        'Phone',
        phone,
        `<a href="tel:${phone.replace(/[^\d+]/g, '')}" style="color:#047857;font-weight:600;text-decoration:none;">${esc(phone)}</a>`,
      )
    : '';
  const emailRow = email
    ? detailRow(
        'Email',
        email,
        `<a href="mailto:${encodeURIComponent(email)}" style="color:#047857;font-weight:600;text-decoration:none;">${esc(email)}</a>`,
      )
    : '';

  const fallback =
    !phone && !email
      ? `<p style="margin:12px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">Contact details for your agent are not on file. Please reply to this message or call your Lamtex branch for assistance.</p>`
      : '';

  return infoCard(
    'Your sales agent',
    [
      detailRow('Name', agent.name?.trim() || '—'),
      phoneRow,
      emailRow,
    ]
      .filter(Boolean)
      .join(''),
    `${orderNumber} · customer · agent contact`,
    { hideMeta: true },
  ).concat(fallback);
}

/** Customer-facing email when their order is approved. */
export function buildOrderCustomerApprovedEmailHtml(p: OrderCustomerApprovedEmailPayload): string {
  const lineCount = p.lineCount ?? p.items.length;
  const discountAmount = p.discountAmount ?? Math.max(0, p.subtotal - p.totalAmount);
  const greetingName =
    p.customerContactPerson?.trim() ||
    p.customerName?.trim() ||
    'Valued customer';
  const portalUrl = customerPortalUrl(p);

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

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Order date', formatDate(p.orderDate)),
    detailRow('Required delivery', formatDate(p.requiredDate)),
    detailRow('Line items', String(lineCount)),
    p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
    p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
    p.paymentTerms ? detailRow('Payment terms', p.paymentTerms) : '',
  ]
    .filter(Boolean)
    .join('');

  const discountRow =
    discountAmount > 0
      ? `<tr>
      <td colspan="3" style="padding:6px 14px;color:#6b7280;text-align:right;">Discount${
        p.discountPercent ? ` (${p.discountPercent}%)` : ''
      }</td>
      <td style="padding:6px 14px;text-align:right;color:#059669;">−${peso(discountAmount)}</td>
    </tr>`
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
          <td style="background:linear-gradient(135deg,#059669,#047857);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your order has been approved</h1>
            <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">${esc(p.orderNumber)} · ${esc(p.branchName ?? 'Lamtex')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Good news — your order <strong>${esc(p.orderNumber)}</strong> has been approved and is moving forward.
              Our team will begin preparing your order for delivery. Your sales agent will reach out if anything changes.
            </p>
            ${infoCard('Order summary', orderSummaryRows, `${p.orderNumber} · customer · summary`, { hideMeta: true })}
            ${agentContactCard(p.agent, p.orderNumber)}
            ${sectionTitle('Order details')}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
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
                <tr style="background:#ecfdf5;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#047857;text-align:right;font-size:15px;">Order total</td>
                  <td style="padding:14px;font-weight:700;color:#047857;text-align:right;font-size:17px;">${peso(p.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
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
