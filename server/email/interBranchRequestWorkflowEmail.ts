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

export interface InterBranchRequestEmailLineItem {
  lineKind: 'raw_material' | 'product';
  label: string;
  sku?: string | null;
  unitOfMeasure?: string | null;
  quantity: number;
  quantityShipped?: number | null;
  quantityDelivered?: number | null;
}

export type InterBranchWorkflowEventType =
  | 'submitted_for_approval'
  | 'approved'
  | 'scheduled'
  | 'loading'
  | 'packed'
  | 'ready'
  | 'in_transit'
  | 'delivery_recorded'
  | 'fulfilled'
  | 'cancelled'
  | 'rejected';

export interface InterBranchRequestWorkflowEmailPayload {
  interBranchRequestId: string;
  ibrNumber: string;
  eventType: InterBranchWorkflowEventType;
  status: string;
  requestingBranchName: string | null;
  fulfillingBranchName: string | null;
  createdBy?: string | null;
  submittedBy?: string | null;
  approvedBy?: string | null;
  fulfilledBy?: string | null;
  cancelledBy?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  actor?: string | null;
  note?: string | null;
  scheduledDepartureDate?: string | null;
  notes?: string | null;
  lineCount?: number | null;
  items: InterBranchRequestEmailLineItem[];
  recipientGroups?: Array<{
    audience: 'executive' | 'warehouse';
    branchName?: string | null;
    emails: string[];
  }>;
}

function eventHeadline(eventType: InterBranchWorkflowEventType): { title: string; subtitle: string } {
  switch (eventType) {
    case 'submitted_for_approval':
      return { title: 'Submitted for approval', subtitle: 'Awaiting executive review' };
    case 'approved':
      return { title: 'Request approved', subtitle: 'Both branches may proceed' };
    case 'scheduled':
      return { title: 'Shipment scheduled', subtitle: 'Planned departure set' };
    case 'loading':
      return { title: 'Loading in progress', subtitle: 'Fulfilling branch is loading stock' };
    case 'packed':
      return { title: 'Shipment packed', subtitle: 'Ready for dispatch preparation' };
    case 'ready':
      return { title: 'Ready for dispatch', subtitle: 'Awaiting in-transit confirmation' };
    case 'in_transit':
      return { title: 'In transit', subtitle: 'Stock is on the way to requesting branch' };
    case 'delivery_recorded':
      return { title: 'Delivery recorded', subtitle: 'Receipt logged at requesting branch' };
    case 'fulfilled':
      return { title: 'Request fulfilled', subtitle: 'Inter-branch transfer closed' };
    case 'cancelled':
      return { title: 'Request cancelled', subtitle: 'This transfer will not proceed' };
    case 'rejected':
      return { title: 'Request rejected', subtitle: 'Review the reason and resubmit if needed' };
    default:
      return { title: 'Inter-branch update', subtitle: 'Status changed' };
  }
}

function qtyLabel(item: InterBranchRequestEmailLineItem): string {
  const unit = item.unitOfMeasure?.trim();
  const q = Number(item.quantity) || 0;
  return unit ? `${q} ${unit}` : String(q);
}

/** IBR workflow notification email (executives or branch warehouse staff). */
export function buildInterBranchRequestWorkflowEmailHtml(p: InterBranchRequestWorkflowEmailPayload): string {
  const headline = eventHeadline(p.eventType);
  const lineCount = p.lineCount ?? p.items.length;
  const routeLabel = `${p.requestingBranchName ?? 'Requesting'} → ${p.fulfillingBranchName ?? 'Fulfilling'}`;

  const lineRows = p.items
    .map((item) => {
      const skuLine = item.sku?.trim()
        ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>`
        : '';
      const kindLabel = item.lineKind === 'raw_material' ? 'Material' : 'Product';
      return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(item.label)}</div>
            ${skuLine}
            <div style="color:#9ca3af;font-size:11px;margin-top:2px;">${kindLabel}</div>
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${qtyLabel(item)}</td>
        </tr>`;
    })
    .join('');

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const ibrUrl = `${appUrl.replace(/\/$/, '')}/inter-branch-requests/${p.interBranchRequestId}`;

  const summaryRows = [
    detailRow('IBR number', p.ibrNumber),
    detailRow('Status', p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow('Requesting branch', p.requestingBranchName ?? '—'),
    detailRow('Fulfilling branch', p.fulfillingBranchName ?? '—'),
    detailRow('Line items', String(lineCount)),
    ...(p.scheduledDepartureDate
      ? [detailRow('Planned departure', formatDate(p.scheduledDepartureDate))]
      : []),
  ].join('');

  const actorRows = [
    ...(p.submittedBy || p.createdBy ? [detailRow('Submitted by', p.submittedBy?.trim() || p.createdBy?.trim() || '—')] : []),
    ...(p.approvedBy ? [detailRow('Approved by', p.approvedBy)] : []),
    ...(p.actor ? [detailRow('Updated by', p.actor)] : []),
    ...(p.fulfilledBy ? [detailRow('Fulfilled by', p.fulfilledBy)] : []),
    ...(p.cancelledBy ? [detailRow('Cancelled by', p.cancelledBy)] : []),
    ...(p.rejectedBy ? [detailRow('Rejected by', p.rejectedBy)] : []),
    ...(p.note?.trim() ? [detailRow('Note', p.note.trim())] : []),
  ].join('');

  const rejectionReasonBlock =
    p.eventType === 'rejected' && p.rejectionReason?.trim()
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px;">Rejection reason</div>
          <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${esc(p.rejectionReason.trim())}</div>
        </td></tr>
      </table>`
      : '';

  const notesBlock = p.notes?.trim()
    ? infoCard('Notes', detailRow('Notes', p.notes.trim()), `${p.ibrNumber} · notes`)
    : '';

  const peopleBlock = actorRows
    ? infoCard('People & notes', actorRows, `${p.ibrNumber} · people`)
    : '';

  const headerBg =
    p.eventType === 'rejected'
      ? 'background:linear-gradient(135deg,#dc2626,#991b1b);'
      : 'background:linear-gradient(135deg,#0d9488,#0f766e);';
  const headerSubColor = p.eventType === 'rejected' ? '#fecaca' : '#ccfbf1';
  const headerSub2Color = p.eventType === 'rejected' ? '#fca5a5' : '#99f6e4';
  const ctaBg = p.eventType === 'rejected' ? '#dc2626' : '#0d9488';
  const introText =
    p.eventType === 'rejected'
      ? `Inter-branch request <strong>${esc(p.ibrNumber)}</strong> (${esc(routeLabel)}) was rejected.`
      : `Inter-branch request <strong>${esc(p.ibrNumber)}</strong> (${esc(routeLabel)}) has been updated.`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerBg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${esc(headline.title)}</h1>
            <p style="margin:8px 0 0;color:${headerSubColor};font-size:14px;">${esc(p.ibrNumber)} · ${esc(routeLabel)}</p>
            <p style="margin:4px 0 0;color:${headerSub2Color};font-size:13px;">${esc(headline.subtitle)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.ibrNumber, p.status)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${introText}</p>
            ${rejectionReasonBlock}
            ${infoCard('Request summary', summaryRows, `${p.ibrNumber} · summary`)}
            ${peopleBlock}
            ${notesBlock}
            ${sectionTitle('Line items')}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">Item</th>
                  <th style="padding:10px 14px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || `<tr><td colspan="2" style="padding:14px;color:#6b7280;">No line items</td></tr>`}</tbody>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${esc(ibrUrl)}" style="display:inline-block;background:${ctaBg};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View inter-branch request</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">This is an automated notification from Lamtex. Do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
