export function peso(n: number): string {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface LineItemPriceDisplay {
  unitPrice: number;
  lineTotal: number;
  quantity: number;
  discountPercent?: number;
}

/** Unit column: effective price per unit, with (-X%) when discounted. */
export function formatUnitPriceCell(item: LineItemPriceDisplay): string {
  const effectiveUnit = item.quantity > 0 ? item.lineTotal / item.quantity : item.unitPrice;
  const gross = item.unitPrice * item.quantity;
  const pct =
    item.discountPercent && item.discountPercent > 0
      ? item.discountPercent
      : gross > 0 && item.lineTotal < gross - 1e-6
        ? ((gross - item.lineTotal) / gross) * 100
        : 0;

  if (pct > 0.05) {
    const pctLabel = Math.abs(pct - Math.round(pct)) < 0.05 ? String(Math.round(pct)) : pct.toFixed(1);
    return `${peso(effectiveUnit)} <span style="color:#059669;white-space:nowrap;">(-${pctLabel}%)</span>`;
  }
  return peso(effectiveUnit);
}

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export function urgencyBadgeStyle(urgency: string | null | undefined): string {
  switch (urgency) {
    case 'Critical':
      return 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;';
    case 'High':
      return 'background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;';
    case 'Low':
      return 'background:#f3f4f6;color:#4b5563;border:1px solid #e5e7eb;';
    default:
      return 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;';
  }
}

export function statusBadgeStyle(status: string): string {
  if (status === 'Pending') return 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;';
  if (status === 'Draft') return 'background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;';
  if (status === 'Approved') return 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;';
  if (status === 'Rejected') return 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;';
  if (status === 'Cancelled') return 'background:#f3f4f6;color:#374151;border:1px solid #d1d5db;';
  return 'background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;';
}

export function badge(text: string, style: string): string {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;${style}">${esc(text)}</span>`;
}

/** Detail row — must be direct children of infoCard table (no nested tables; Gmail collapses those). */
export function detailRow(label: string, value: string, valueHtml?: string): string {
  return `<tr>
    <td style="padding:5px 0 5px 18px;color:#6b7280;font-size:13px;width:148px;vertical-align:top;border:none;">${esc(label)}</td>
    <td style="padding:5px 18px 5px 0;color:#111827;font-size:13px;font-weight:500;border:none;">${valueHtml ?? esc(value)}</td>
  </tr>`;
}

/** Section heading above tables (plain div — avoid h1/h2 which Gmail may fold). */
export function sectionTitle(title: string, subtitle?: string | null): string {
  const sub = subtitle?.trim()
    ? `<div style="font-size:12px;font-weight:500;color:#9ca3af;text-transform:none;letter-spacing:0;margin-top:4px;">${esc(subtitle.trim())}</div>`
    : '';
  return `<div style="margin:0 0 10px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">${esc(title)}${sub}</div>`;
}

/**
 * Flat info card — single table, rows inlined (no nested tables).
 * sectionId makes each block unique so Gmail does not collapse repeated thread content.
 */
export function infoCard(
  title: string,
  rows: string,
  sectionId: string,
  options?: { hideMeta?: boolean },
): string {
  const uid = esc(sectionId);
  const metaRow = options?.hideMeta
    ? ''
    : `<tr>
      <td colspan="2" style="padding:0 18px 10px;font-size:11px;color:#9ca3af;font-weight:400;text-transform:none;letter-spacing:0;border:none;">
        ${uid}
      </td>
    </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:16px;border-collapse:separate;">
    <tr>
      <td colspan="2" style="padding:14px 18px 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;font-weight:700;border:none;">
        ${esc(title)}
      </td>
    </tr>
    ${metaRow}
    ${rows}
    <tr><td colspan="2" style="padding:0 0 10px;font-size:0;line-height:0;border:none;">&nbsp;</td></tr>
  </table>`;
}

/** Visible reference line — unique per send; reduces Gmail quote-collapse in threads. */
export function emailRefLine(orderNumber: string, label: string): string {
  const sent = new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `<p style="margin:0 0 18px;font-size:12px;color:#9ca3af;line-height:1.4;">${esc(orderNumber)} · ${esc(label)} · ${esc(sent)}</p>`;
}

/** Unique id for Resend / Gmail threading headers. */
export function emailEntityRef(orderId: string, kind: string): string {
  return `lamtex-${kind}-${orderId}-${Date.now()}`;
}

export function isOrderFullyPaid(balanceDue: number, paymentStatus?: string | null): boolean {
  return balanceDue <= 0.01 || paymentStatus === 'Paid';
}
