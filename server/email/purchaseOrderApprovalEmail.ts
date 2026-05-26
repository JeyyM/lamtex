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

export interface PurchaseOrderSubmittedEmailLineItem {
  materialName: string;
  sku?: string | null;
  brand?: string | null;
  quantity: number;
  unitOfMeasure?: string | null;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrderSubmittedEmailPayload {
  purchaseOrderId: string;
  poNumber: string;
  supplierName: string | null;
  branchName: string | null;
  submittedBy: string | null;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: string;
  currency: string;
  totalAmount: number;
  notes?: string | null;
  lineCount?: number | null;
  items: PurchaseOrderSubmittedEmailLineItem[];
}

function formatMoney(n: number, currency: string): string {
  if (currency === 'USD') {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return peso(n);
}

function materialLabel(item: PurchaseOrderSubmittedEmailLineItem): string {
  const parts = [item.materialName?.trim(), item.brand?.trim()].filter(Boolean);
  return parts.join(' — ') || item.sku?.trim() || 'Material';
}

/** PO submitted for executive approval — notification email. */
export function buildPurchaseOrderApprovalEmailHtml(p: PurchaseOrderSubmittedEmailPayload): string {
  const lineCount = p.lineCount ?? p.items.length;
  const submitterLabel = p.submittedBy?.trim() || '—';
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
    detailRow('Order date', formatDate(p.orderDate)),
    detailRow('Expected delivery', formatDate(p.expectedDeliveryDate)),
    detailRow('Line items', String(lineCount)),
    detailRow('Total', formatMoney(displayTotal, p.currency)),
  ].join('');

  const peopleRows = [
    detailRow('Supplier', p.supplierName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Submitted by', submitterLabel),
  ].join('');

  const notesBlock = p.notes?.trim()
    ? infoCard('Notes', detailRow('Notes', p.notes.trim()), `${p.poNumber} · pending approval · notes`)
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Purchase order awaiting approval</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.poNumber)} · ${esc(p.branchName ?? 'Branch')} · submitted by ${esc(submitterLabel)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.poNumber, 'Awaiting approval')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">A purchase order has been submitted for your review. Summary and line items are below — open the PO in Lamtex to accept or reject.</p>
            ${infoCard('Purchase order summary', summaryRows, `${p.poNumber} · pending approval · summary`)}
            ${infoCard('Supplier & branch', peopleRows, `${p.poNumber} · pending approval · supplier`)}
            ${notesBlock}
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
                <tr style="background:#fef2f2;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:15px;">PO total</td>
                  <td style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:17px;">${formatMoney(displayTotal, p.currency)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${poUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Review purchase order</a>
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
