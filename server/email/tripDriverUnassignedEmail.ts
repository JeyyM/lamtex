import {
  detailRow,
  emailRefLine,
  esc,
  formatDate,
  infoCard,
} from './emailHtmlUtils';

export interface TripDriverUnassignedEmailPayload {
  tripId: string;
  tripNumber: string;
  scheduledDate: string | null;
  vehicleName: string | null;
  driverName: string | null;
  driverEmail?: string | null;
  branchName?: string | null;
  assignedBy: string | null;
  newDriverName?: string | null;
  interBranchRequestId?: string | null;
  ibrNumber?: string | null;
}

function driverDashboardUrl(): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/`;
}

/** Email to the previous truck driver when they are removed or reassigned off a trip. */
export function buildTripDriverUnassignedEmailHtml(p: TripDriverUnassignedEmailPayload): string {
  const scheduleDate = p.scheduledDate?.trim() || '—';
  const assignedLabel = p.assignedBy?.trim() || 'Logistics';
  const driverLabel = p.driverName?.trim() || 'Driver';
  const isIbr = Boolean(p.interBranchRequestId || p.ibrNumber);
  const refLabel = isIbr ? (p.ibrNumber?.trim() || p.tripNumber) : p.tripNumber;
  const newDriver = p.newDriverName?.trim() || null;

  const headline = newDriver
    ? 'Trip reassigned to another driver'
    : 'Trip assignment removed';
  const subline = isIbr
    ? `${esc(refLabel)} · inter-branch shipment`
    : `${esc(p.tripNumber)} · ${esc(p.branchName ?? 'Lamtex')}`;

  const introText = newDriver
    ? `Hello ${esc(driverLabel)}, you are no longer assigned to trip <strong>${esc(p.tripNumber)}</strong>
              scheduled for <strong>${esc(formatDate(scheduleDate))}</strong>. The trip was reassigned to
              <strong>${esc(newDriver)}</strong>.`
    : `Hello ${esc(driverLabel)}, you are no longer assigned to trip <strong>${esc(p.tripNumber)}</strong>
              scheduled for <strong>${esc(formatDate(scheduleDate))}</strong> on vehicle
              <strong>${esc(p.vehicleName ?? 'TBD')}</strong>.`;

  const tripSummaryRows = [
    detailRow('Trip number', p.tripNumber),
    detailRow('Scheduled date', formatDate(scheduleDate)),
    detailRow('Vehicle', p.vehicleName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    ...(newDriver ? [detailRow('New driver', newDriver)] : []),
    detailRow('Updated by', assignedLabel),
  ].join('');

  const dashboardUrl = driverDashboardUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#374151,#1f2937);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
            <p style="margin:8px 0 0;color:#d1d5db;font-size:14px;">${subline}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(refLabel, isIbr ? 'Inter-branch assignment' : 'Trip assignment')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              ${introText}
            </p>
            ${infoCard('Trip summary', tripSummaryRows, `${p.tripNumber} · driver update`)}
            <div style="text-align:center;">
              <a href="${dashboardUrl}" style="display:inline-block;background:#374151;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Open driver dashboard</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex · Driver notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
