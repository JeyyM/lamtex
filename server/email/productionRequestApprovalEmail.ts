import {
  badge,
  detailRow,
  emailRefLine,
  esc,
  formatDate,
  infoCard,
  sectionTitle,
  statusBadgeStyle,
} from './emailHtmlUtils';

export interface ProductionRequestEmailLineItem {
  productName: string;
  variantLabel?: string | null;
  sku?: string | null;
  quantity: number;
  quantityCompleted?: number | null;
}

export interface ProductionRequestSubmittedEmailPayload {
  productionRequestId: string;
  prNumber: string;
  branchName: string | null;
  submittedBy: string | null;
  createdBy: string | null;
  requestDate: string | null;
  expectedCompletionDate: string | null;
  status: string;
  notes?: string | null;
  totalQuantity: number;
  lineCount?: number | null;
  items: ProductionRequestEmailLineItem[];
}

function productLabel(item: ProductionRequestEmailLineItem): string {
  const variant = item.variantLabel?.trim();
  return variant ? `${item.productName} — ${variant}` : item.productName;
}

/** PR submitted for executive approval — notification email. */
export function buildProductionRequestApprovalEmailHtml(p: ProductionRequestSubmittedEmailPayload): string {
  const lineCount = p.lineCount ?? p.items.length;
  const submitterLabel = p.submittedBy?.trim() || p.createdBy?.trim() || '—';
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
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Request date', formatDate(p.requestDate)),
    detailRow('Expected completion', formatDate(p.expectedCompletionDate)),
    detailRow('Product lines', String(lineCount)),
    detailRow('Total quantity', String(totalQty)),
  ].join('');

  const peopleRows = [
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Submitted by', submitterLabel),
  ].join('');

  const notesBlock = p.notes?.trim()
    ? infoCard('Notes', detailRow('Notes', p.notes.trim()), `${p.prNumber} · pending approval · notes`)
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
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Production request awaiting approval</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.prNumber)} · ${esc(p.branchName ?? 'Branch')} · submitted by ${esc(submitterLabel)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.prNumber, 'Awaiting approval')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">A production request has been submitted for your review. Summary and product lines are below — open the request in Lamtex to accept or reject.</p>
            ${infoCard('Production request summary', summaryRows, `${p.prNumber} · pending approval · summary`)}
            ${infoCard('Branch & submitter', peopleRows, `${p.prNumber} · pending approval · branch`)}
            ${notesBlock}
            ${sectionTitle('Products to produce', `${p.prNumber} · ${lineCount} line(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="2" style="padding:20px;color:#6b7280;text-align:center;">No product lines</td></tr>'}</tbody>
              <tfoot>
                <tr style="background:#fef2f2;">
                  <td style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:15px;">Total quantity</td>
                  <td style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:17px;">${totalQty}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${prUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Review production request</a>
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
