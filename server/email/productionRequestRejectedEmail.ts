import type { ProductionRequestSubmittedEmailPayload } from './productionRequestApprovalEmail';
import {
  detailRow,
  emailRefLine,
  esc,
  formatDate,
  infoCard,
  sectionTitle,
} from './emailHtmlUtils';

export interface ProductionRequestRejectedEmailPayload extends ProductionRequestSubmittedEmailPayload {
  rejectedBy: string | null;
  rejectionReason?: string | null;
  submitterEmail?: string | null;
}

function productLabel(item: ProductionRequestSubmittedEmailPayload['items'][number]): string {
  const variant = item.variantLabel?.trim();
  return variant ? `${item.productName} — ${variant}` : item.productName;
}

/** Email to the user who submitted a PR when an executive rejects it. */
export function buildProductionRequestRejectedEmailHtml(p: ProductionRequestRejectedEmailPayload): string {
  const lineCount = p.lineCount ?? p.items.length;
  const rejectedLabel = p.rejectedBy?.trim() || 'Executive';
  const totalQty =
    p.totalQuantity > 0 ? p.totalQuantity : p.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const lineRows = p.items
    .map((item) => {
      const skuLine = item.sku?.trim()
        ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>`
        : '';
      return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(productLabel(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${Number(item.quantity) || 0}</td>
        </tr>`;
    })
    .join('');

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const prUrl = `${appUrl.replace(/\/$/, '')}/production-requests/${p.productionRequestId}`;

  const summaryRows = [
    detailRow('PR number', p.prNumber),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Rejected by', rejectedLabel),
    detailRow('Request date', formatDate(p.requestDate)),
    detailRow('Product lines', String(lineCount)),
    detailRow('Total quantity', String(totalQty)),
  ].join('');

  const reasonBlock = p.rejectionReason?.trim()
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px;">Rejection reason</div>
          <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${esc(p.rejectionReason.trim())}</div>
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
          <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your production request was rejected</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.prNumber)} · ${esc(p.branchName ?? 'Branch')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.prNumber, 'Rejected')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">Production request <strong>${esc(p.prNumber)}</strong> was rejected by ${esc(rejectedLabel)}. Review the reason below and resubmit a revised request if needed.</p>
            ${reasonBlock}
            ${infoCard('Production request summary', summaryRows, `${p.prNumber} · rejected · summary`)}
            ${sectionTitle('Products to produce', `${p.prNumber} · ${lineCount} line(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="2" style="padding:20px;color:#6b7280;text-align:center;">No product lines</td></tr>'}</tbody>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${prUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">View production request</a>
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
