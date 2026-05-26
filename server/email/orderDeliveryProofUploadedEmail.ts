import type { OrderCreatedEmailPayload } from './orderCreatedEmail';
import {
  badge,
  detailRow,
  esc,
  formatDate,
  infoCard,
  isOrderFullyPaid,
  peso,
  sectionTitle,
  statusBadgeStyle,
} from './emailHtmlUtils';

export interface OrderDeliveryProofUploadedEmailPayload extends OrderCreatedEmailPayload {
  proofType?: 'delivery' | 'other' | 'payment';
  uploadedBy: string | null;
  proofCount: number;
  agentEmail: string;
  proofTitle?: string | null;
  proofNotes?: string | null;
  paymentCash?: number;
  paymentCredit?: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentStatus?: string;
}

function orderUrl(orderId: string): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/orders/${orderId}`;
}

/** Agent email when delivery proof is uploaded by logistics / another staff member. */
export function buildOrderDeliveryProofUploadedEmailHtml(
  p: OrderDeliveryProofUploadedEmailPayload,
): string {
  const lineCount = p.lineCount ?? p.items.length;
  const uploadedLabel = p.uploadedBy?.trim() || 'Staff';
  const isOther = p.proofType === 'other';
  const isPayment = p.proofType === 'payment';
  const paidInFull =
    isPayment &&
    p.amountPaid != null &&
    p.balanceDue != null &&
    isOrderFullyPaid(p.balanceDue, p.paymentStatus);
  const paymentTotal = (p.paymentCash ?? 0) + (p.paymentCredit ?? 0);
  const proofLabel = isPayment
    ? p.proofCount <= 1
      ? '1 payment proof file'
      : `${p.proofCount} payment proof files`
    : isOther
      ? p.proofCount <= 1
        ? '1 other document'
        : `${p.proofCount} other documents`
      : p.proofCount <= 1
        ? '1 delivery proof file'
        : `${p.proofCount} delivery proof files`;
  const headerTitle = paidInFull
    ? 'Order paid in full'
    : isPayment
      ? 'Payment proof uploaded'
      : isOther
        ? 'Other document uploaded'
        : 'Delivery proof uploaded';
  const headerGradient = paidInFull
    ? 'background:linear-gradient(135deg,#b45309 0%,#059669 55%,#047857 100%);'
    : isPayment
      ? 'background:linear-gradient(135deg,#059669,#047857);'
      : isOther
        ? 'background:linear-gradient(135deg,#d97706,#b45309);'
        : 'background:linear-gradient(135deg,#4f46e5,#4338ca);';
  const headerSubColor = paidInFull ? 'color:#fef3c7;' : isPayment ? 'color:#d1fae5;' : isOther ? 'color:#fef3c7;' : 'color:#e0e7ff;';
  const ctaColor = paidInFull ? '#047857' : isPayment ? '#059669' : isOther ? '#d97706' : '#4f46e5';
  const ctaLabel = paidInFull
    ? 'View completed order'
    : isPayment
      ? 'View order &amp; payment proof'
      : isOther
        ? 'View order &amp; document'
        : 'View order &amp; proof';
  const proofTitle = p.proofTitle?.trim() || null;
  const proofNotes = p.proofNotes?.trim() || null;

  const orderSummaryRows = [
    detailRow('Order number', p.orderNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Customer', p.customerName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Required delivery', formatDate(p.requiredDate)),
    detailRow('Line items', String(lineCount)),
    detailRow('Order total', peso(p.totalAmount)),
    detailRow('Uploaded by', uploadedLabel),
    detailRow('Proof files', String(p.proofCount)),
    isPayment && paymentTotal > 0 ? detailRow('Payment recorded', peso(paymentTotal)) : '',
    isPayment && (p.paymentCash ?? 0) > 0 ? detailRow('Cash / transfer / cheque', peso(p.paymentCash ?? 0)) : '',
    isPayment && (p.paymentCredit ?? 0) > 0 ? detailRow('Customer credit', peso(p.paymentCredit ?? 0)) : '',
    paidInFull
      ? detailRow(
          'Balance due',
          'Fully paid',
          `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#d1fae5;color:#047857;font-size:13px;font-weight:700;">Fully settled</span>`,
        )
      : isPayment && p.balanceDue != null
        ? detailRow('Balance due', peso(p.balanceDue))
        : '',
  ]
    .filter(Boolean)
    .join('');

  const proofDetailRows = [
    detailRow('Title / purpose', proofTitle ?? '—'),
    proofNotes
      ? detailRow(
          'Notes',
          proofNotes,
          `<p style="margin:0;color:#374151;font-size:14px;line-height:1.55;white-space:pre-wrap;">${esc(proofNotes)}</p>`,
        )
      : detailRow('Notes', '—'),
  ]
    .filter(Boolean)
    .join('');

  const logisticsRows = isOther || isPayment
    ? ''
    : [
        p.deliveryType ? detailRow('Delivery type', p.deliveryType) : '',
        p.deliveryAddress ? detailRow('Delivery address', p.deliveryAddress) : '',
      ]
        .filter(Boolean)
        .join('');

  const introCopy = paidInFull
    ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? 'your customer')}</strong> is now <strong>fully paid</strong>. A final payment of <strong>${peso(paymentTotal)}</strong> was recorded by ${esc(uploadedLabel)}.`
    : `${esc(proofLabel)} ${proofLabel.includes('1') ? 'was' : 'were'} added to order
              <strong>${esc(p.orderNumber)}</strong> for your customer
              <strong>${esc(p.customerName ?? 'the customer')}</strong> by ${esc(uploadedLabel)}.`;

  const paidInFullBanner = paidInFull
    ? `<div style="margin:0 0 20px;padding:16px 18px;background:linear-gradient(135deg,#ecfdf5,#fef9c3);border:1px solid #6ee7b7;border-radius:10px;">
         <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:.08em;">Payment complete</p>
         <p style="margin:0;color:#065f46;font-size:15px;line-height:1.55;">This payment clears the order balance for ${esc(p.customerName ?? 'this customer')}.</p>
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
          <td style="${headerGradient}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headerTitle}</h1>
            <p style="margin:8px 0 0;${headerSubColor}font-size:14px;">${esc(p.orderNumber)} · ${paidInFull ? 'Fully settled · ' : ''}${esc(p.branchName ?? 'Lamtex')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${introCopy}</p>
            ${paidInFullBanner}
            ${infoCard(paidInFull ? 'Payment complete' : 'Order summary', orderSummaryRows, `${p.orderNumber} · agent · ${isPayment ? 'payment proof' : isOther ? 'other document' : 'delivery proof'}`, { hideMeta: true })}
            ${sectionTitle('Document details')}
            ${infoCard('', proofDetailRows, '', { hideMeta: true })}
            ${logisticsRows ? sectionTitle('Delivery details') + infoCard('', logisticsRows, '', { hideMeta: true }) : ''}
            <div style="margin-top:24px;text-align:center;">
              <a href="${orderUrl(p.orderId)}" style="display:inline-block;background:${ctaColor};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">${ctaLabel}</a>
            </div>
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
