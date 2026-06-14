import {
  detailRow,
  emailRefLine,
  esc,
  formatDate,
  infoCard,
} from './emailHtmlUtils';

export interface TripCancelledEmailPayload {
  tripId: string;
  tripNumber: string;
  scheduledDate: string | null;
  vehicleName: string | null;
  driverName: string | null;
  driverEmail?: string | null;
  branchName?: string | null;
  orderCount: number;
  orderNumbers: string[];
  cancelledBy: string | null;
  cancellationReason?: string | null;
  notifyTarget: 'logistics' | 'driver';
  logisticsEmails?: string[];
}

function logisticsUrl(): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/logistics`;
}

function driverDashboardUrl(): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/`;
}

export function buildTripCancelledEmailHtml(p: TripCancelledEmailPayload): string {
  const scheduleDate = p.scheduledDate?.trim() || '—';
  const cancelledLabel = p.cancelledBy?.trim() || 'Logistics';
  const reason = p.cancellationReason?.trim() || null;
  const isDriver = p.notifyTarget === 'driver';
  const orderList =
    p.orderNumbers.length > 0
      ? p.orderNumbers.map((n) => `<li style="margin:4px 0;color:#374151;">${esc(n)}</li>`).join('')
      : '<li style="color:#6b7280;">No orders listed</li>';

  const intro = isDriver
    ? `Hello ${esc(p.driverName?.trim() || 'Driver')}, trip <strong>${esc(p.tripNumber)}</strong> scheduled for <strong>${esc(formatDate(scheduleDate))}</strong> was cancelled. You are no longer assigned to this route.`
    : `Trip <strong>${esc(p.tripNumber)}</strong> on <strong>${esc(formatDate(scheduleDate))}</strong> was cancelled by ${esc(cancelledLabel)}. ${p.orderCount} order(s) were returned to the dispatch queue.`;

  const summaryRows = [
    detailRow('Trip number', p.tripNumber),
    detailRow('Scheduled date', formatDate(scheduleDate)),
    detailRow('Vehicle', p.vehicleName ?? '—'),
    detailRow('Branch', p.branchName ?? '—'),
    detailRow('Orders affected', String(p.orderCount)),
    detailRow('Cancelled by', cancelledLabel),
    reason ? detailRow('Reason', reason) : '',
  ].join('');

  const url = isDriver ? driverDashboardUrl() : logisticsUrl();
  const cta = isDriver ? 'Open driver dashboard' : 'View logistics';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#991b1b,#7f1d1d);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Trip cancelled</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.tripNumber)} · ${esc(p.branchName ?? 'Lamtex')}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.tripNumber, 'Trip cancelled')}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard('Trip summary', summaryRows, `${p.tripNumber} · cancelled`)}
            ${!isDriver ? `<p style="margin:16px 0 8px;font-size:14px;font-weight:600;color:#374151;">Orders returned to dispatch</p><ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.5;">${orderList}</ul>` : ''}
            <div style="text-align:center;">
              <a href="${url}" style="display:inline-block;background:#991b1b;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${cta}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex · Trip cancellation
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
