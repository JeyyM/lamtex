import {
  detailRow,
  emailRefLine,
  esc,
  formatDate,
  infoCard,
  sectionTitle,
} from './emailHtmlUtils';

export interface TripDriverAssignedEmailPayload {
  tripId: string;
  tripNumber: string;
  scheduledDate: string | null;
  vehicleName: string | null;
  driverName: string | null;
  driverEmail?: string | null;
  branchName?: string | null;
  orderCount: number;
  orderNumbers: string[];
  assignedBy: string | null;
  interBranchRequestId?: string | null;
  ibrNumber?: string | null;
  destinationLabel?: string | null;
}

function driverDashboardUrl(): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/`;
}

/** Email to the assigned truck driver when a trip/route is assigned to them. */
export function buildTripDriverAssignedEmailHtml(p: TripDriverAssignedEmailPayload): string {
  const scheduleDate = p.scheduledDate?.trim() || '—';
  const assignedLabel = p.assignedBy?.trim() || 'Logistics';
  const driverLabel = p.driverName?.trim() || 'Driver';
  const isIbr = Boolean(p.interBranchRequestId || p.ibrNumber);
  const refLabel = isIbr ? (p.ibrNumber?.trim() || p.tripNumber) : p.tripNumber;
  const headline = isIbr ? 'Inter-branch shipment assigned to you' : 'New trip assigned to you';
  const subline = isIbr
    ? `${esc(refLabel)} · ${esc(p.destinationLabel ?? 'Inter-branch delivery')}`
    : `${esc(p.tripNumber)} · ${esc(p.branchName ?? 'Lamtex')}`;

  const tripSummaryRows = isIbr
    ? [
        detailRow('Request', p.ibrNumber ?? p.tripNumber),
        detailRow('Scheduled date', formatDate(scheduleDate)),
        detailRow('Deliver to', p.destinationLabel ?? '—'),
        detailRow('Truck', p.vehicleName ?? '—'),
        detailRow('Driver', p.driverName ?? '—'),
        detailRow('Branch', p.branchName ?? '—'),
        detailRow('Assigned by', assignedLabel),
      ].join('')
    : [
        detailRow('Trip number', p.tripNumber),
        detailRow('Scheduled date', formatDate(scheduleDate)),
        detailRow('Vehicle', p.vehicleName ?? '—'),
        detailRow('Branch', p.branchName ?? '—'),
        detailRow('Orders on trip', String(p.orderCount)),
        detailRow('Assigned by', assignedLabel),
      ].join('');

  const introText = isIbr
    ? `Hello ${esc(driverLabel)}, you have been assigned to inter-branch shipment <strong>${esc(refLabel)}</strong>
              scheduled for <strong>${esc(formatDate(scheduleDate))}</strong>, delivering to
              <strong>${esc(p.destinationLabel ?? 'the requesting branch')}</strong> on truck
              <strong>${esc(p.vehicleName ?? 'TBD')}</strong> with driver
              <strong>${esc(p.driverName ?? driverLabel)}</strong>.`
    : `Hello ${esc(driverLabel)}, you have been assigned to trip <strong>${esc(p.tripNumber)}</strong>
              scheduled for <strong>${esc(formatDate(scheduleDate))}</strong> on vehicle
              <strong>${esc(p.vehicleName ?? 'TBD')}</strong>.`;

  const orderList =
    p.orderNumbers.length > 0
      ? p.orderNumbers.map((n) => `<li style="margin:4px 0;color:#374151;">${esc(n)}</li>`).join('')
      : '<li style="color:#6b7280;">No orders listed</li>';

  const detailSection = isIbr
    ? `${infoCard('Shipment summary', tripSummaryRows, `${refLabel} · driver assignment`)}`
    : `${infoCard('Trip summary', tripSummaryRows, `${p.tripNumber} · driver assignment`)}
            ${sectionTitle('Orders on this trip', p.tripNumber)}
            <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.5;">${orderList}</ul>`;

  const dashboardUrl = driverDashboardUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
            <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">${subline}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(refLabel, isIbr ? 'Inter-branch assignment' : 'Trip assignment')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              ${introText}
            </p>
            ${detailSection}
            <div style="text-align:center;">
              <a href="${dashboardUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Open driver dashboard</a>
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
