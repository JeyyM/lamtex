import type { PurchaseOrderSubmittedEmailPayload } from './purchaseOrderApprovalEmail';
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

export type PurchaseOrderConfirmedAudience = 'executive' | 'warehouse';

export interface PurchaseOrderConfirmedEmailPayload extends PurchaseOrderSubmittedEmailPayload {
  confirmedBy: string | null;
  audience: PurchaseOrderConfirmedAudience;
  recipientEmails?: (string | null | undefined)[];
}

function formatMoney(n: number, currency: string): string {
  if (currency === 'USD') {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return peso(n);
}

function materialLabel(item: PurchaseOrderSubmittedEmailPayload['items'][number]): string {
  const parts = [item.materialName?.trim(), item.brand?.trim()].filter(Boolean);
  return parts.join(' — ') || item.sku?.trim() || 'Material';
}

/** PO confirmed with supplier — executive or warehouse audience. */
export function buildPurchaseOrderConfirmedEmailHtml(p: PurchaseOrderConfirmedEmailPayload): string {
  const isWarehouse = p.audience === 'warehouse';
  const lineCount = p.lineCount ?? p.items.length;
  const confirmedLabel = p.confirmedBy?.trim() || 'Executive';
  const computedTotal = p.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const displayTotal = p.totalAmount > 0 ? p.totalAmount : computedTotal;

  const lineRows = p.items
    .map((item) => {
      const skuLine = item.sku?.trim()
        ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>`
        : '';
      const qtyLabel = item.unitOfMeasure?.trim()
        ? `${item.quantity} ${esc(item.unitOfMeasure.trim())}`
        : String(item.quantity);
      return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(materialLabel(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${qtyLabel}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatMoney(item.unitPrice, p.currency)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${formatMoney(item.lineTotal, p.currency)}</td>
        </tr>`;
    })
    .join('');

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const poUrl = `${appUrl.replace(/\/$/, '')}/purchase-orders/${p.purchaseOrderId}`;

  const summaryRows = [
    detailRow('PO number', p.poNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Supplier', p.supplierName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Confirmed by', confirmedLabel),
    detailRow('Order date', formatDate(p.orderDate)),
    detailRow('Expected delivery', formatDate(p.expectedDeliveryDate)),
    detailRow('Line items', String(lineCount)),
    detailRow('PO total', formatMoney(displayTotal, p.currency)),
  ].join('');

  const title = isWarehouse ? 'Purchase order ready to receive' : 'Purchase order confirmed with supplier';
  const intro = isWarehouse
    ? `Purchase order <strong>${esc(p.poNumber)}</strong> for ${esc(p.supplierName ?? 'the supplier')} has been confirmed${p.branchName ? ` for ${esc(p.branchName)}` : ''}. Materials are incoming — you can receive stock and record payment when delivery arrives.`
    : `Purchase order <strong>${esc(p.poNumber)}</strong> for ${esc(p.supplierName ?? 'the supplier')} was confirmed with the supplier by ${esc(confirmedLabel)}. Warehouse staff have been notified to receive incoming materials.`;

  const ctaLabel = isWarehouse ? 'Open PO to receive' : 'View purchase order';
  const headerBg = isWarehouse
    ? 'background:linear-gradient(135deg,#059669,#047857);'
    : 'background:linear-gradient(135deg,#4f46e5,#3730a3);';
  const headerSub = isWarehouse ? 'color:#d1fae5;' : 'color:#c7d2fe;';
  const ctaBg = isWarehouse ? '#059669' : '#4f46e5';
  const footerBg = isWarehouse ? '#ecfdf5' : '#eef2ff';
  const footerText = isWarehouse ? '#047857' : '#3730a3';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerBg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${title}</h1>
            <p style="margin:8px 0 0;${headerSub}font-size:14px;">${esc(p.poNumber)} · ${esc(p.branchName ?? 'Branch')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.poNumber, 'Confirmed')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard('Purchase order summary', summaryRows, `${p.poNumber} · confirmed · summary`)}
            ${sectionTitle('Materials', `${p.poNumber} · ${lineCount} item(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Material</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr style="background:${footerBg};">
                  <td colspan="3" style="padding:14px;font-weight:700;color:${footerText};text-align:right;font-size:15px;">PO total</td>
                  <td style="padding:14px;font-weight:700;color:${footerText};text-align:right;font-size:17px;">${formatMoney(displayTotal, p.currency)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${poUrl}" style="display:inline-block;background:${ctaBg};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${ctaLabel}</a>
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
