import type { PurchaseOrderSubmittedEmailPayload } from './purchaseOrderApprovalEmail';

import {

  badge,

  detailRow,

  emailRefLine,

  esc,

  infoCard,

  peso,

  sectionTitle,

  statusBadgeStyle,

} from './emailHtmlUtils';



export interface PurchaseOrderPaymentRecordedEmailPayload extends PurchaseOrderSubmittedEmailPayload {

  recordedBy: string | null;

  paymentAmount: number;

  amountPaid: number;

  paymentStatus: string;

  paidInFull: boolean;

  recipientEmails?: (string | null | undefined)[];

}



function formatMoney(n: number, currency: string): string {

  if (currency === 'USD') {

    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  }

  return peso(n);

}



/** PO payment recorded — executives only. */

export function buildPurchaseOrderPaymentRecordedEmailHtml(p: PurchaseOrderPaymentRecordedEmailPayload): string {

  const lineCount = p.lineCount ?? p.items.length;

  const recordedLabel = p.recordedBy?.trim() || 'Staff';

  const computedTotal = p.items.reduce((sum, item) => sum + item.lineTotal, 0);

  const displayTotal = p.totalAmount > 0 ? p.totalAmount : computedTotal;

  const remaining = Math.max(0, displayTotal - p.amountPaid);



  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

  const poUrl = `${appUrl.replace(/\/$/, '')}/purchase-orders/${p.purchaseOrderId}`;



  const title = p.paidInFull ? 'Purchase order paid in full' : 'PO payment recorded';

  const intro = p.paidInFull

    ? `Payment on PO <strong>${esc(p.poNumber)}</strong> (${esc(p.supplierName ?? 'supplier')}) is now complete.`

    : `A payment of <strong>${formatMoney(p.paymentAmount, p.currency)}</strong> was recorded on PO <strong>${esc(p.poNumber)}</strong> (${esc(p.supplierName ?? 'supplier')}).`;



  const summaryRows = [

    detailRow('PO number', p.poNumber),

    detailRow('Supplier', p.supplierName ?? '—'),

    detailRow('Branch', p.branchName ?? '—'),

    detailRow('Recorded by', recordedLabel),

    detailRow('This payment', formatMoney(p.paymentAmount, p.currency)),

    detailRow('Total paid', formatMoney(p.amountPaid, p.currency)),

    detailRow('PO total', formatMoney(displayTotal, p.currency)),

    detailRow('Remaining', formatMoney(remaining, p.currency)),

    detailRow('Payment status', p.paymentStatus, badge(p.paymentStatus, statusBadgeStyle(p.paymentStatus))),

    detailRow('Line items', String(lineCount)),

  ].join('');



  return `<!DOCTYPE html>

<html lang="en">

<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>

<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 16px;min-height:100vh;">

    <tr><td align="center">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">

        <tr>

          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">

            <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.85);">Lamtex · Executive</p>

            <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${esc(title)}</h1>

          </td>

        </tr>

        <tr>

          <td style="padding:28px 32px;">

            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">${intro}</p>

            ${sectionTitle('Payment summary', p.poNumber)}

            ${infoCard('Payment details', summaryRows, `${p.poNumber} · payment`)}

            <div style="margin-top:24px;text-align:center;">

              <a href="${esc(poUrl)}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;">View purchase order</a>

            </div>

            ${emailRefLine(p.poNumber, 'Payment')}

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

