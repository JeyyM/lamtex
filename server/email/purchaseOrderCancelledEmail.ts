import type { PurchaseOrderSubmittedEmailPayload } from './purchaseOrderApprovalEmail';
import {
  detailRow,
  emailRefLine,
  esc,
  formatDate,
  infoCard,
  peso,
  sectionTitle,
} from './emailHtmlUtils';

export interface PurchaseOrderCancelledEmailPayload extends PurchaseOrderSubmittedEmailPayload {
  cancelledBy: string | null;
  cancellationReason?: string | null;
  submitterEmail?: string | null;
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

/** Email to the warehouse user who submitted a PO when it is cancelled by someone else. */
export function buildPurchaseOrderCancelledEmailHtml(p: PurchaseOrderCancelledEmailPayload): string {
  const lineCount = p.lineCount ?? p.items.length;
  const cancelledLabel = p.cancelledBy?.trim() || 'Someone';
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
    detailRow('Supplier', p.supplierName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Cancelled by', cancelledLabel),
    detailRow('Order date', formatDate(p.orderDate)),
    detailRow('Line items', String(lineCount)),
    detailRow('PO total', formatMoney(displayTotal, p.currency)),
  ].join('');

  const reasonBlock = p.cancellationReason?.trim()
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px;">Cancellation note</div>
          <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${esc(p.cancellationReason.trim())}</div>
        </td></tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#6b7280,#374151);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Purchase order cancelled</h1>
            <p style="margin:8px 0 0;color:#d1d5db;font-size:14px;">${esc(p.poNumber)} · ${esc(p.branchName ?? 'Branch')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.poNumber, 'Cancelled')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">Purchase order <strong>${esc(p.poNumber)}</strong> for ${esc(p.supplierName ?? 'your supplier')} was cancelled by ${esc(cancelledLabel)}.</p>
            ${reasonBlock}
            ${infoCard('Purchase order summary', summaryRows, `${p.poNumber} · cancelled · summary`)}
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
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${poUrl}" style="display:inline-block;background:#374151;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">View purchase order</a>
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
