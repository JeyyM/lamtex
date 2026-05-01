import React from 'react';
import type { OrderLog } from '@/src/types/orders';

type LaymanSection = { heading: string; lines: string[] };

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function strVal(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

function fmtQtyReadable(n: unknown): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function fmtDateReadable(v: unknown): string | null {
  const s = strVal(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function logisticsStepLayman(prev: string, next: string): string | null {
  const pretty: Record<string, string> = {
    Approved: 'Approved and ready to plan shipping',
    Scheduled: 'A departure / pickup date is on the calendar',
    Loading: 'Goods are being loaded',
    Packed: 'Order is packed',
    Ready: 'Ready to go out for delivery',
    'In Transit': 'On the road to the customer',
  };
  const a = pretty[prev] ?? `Previous step: ${prev}`;
  const b = pretty[next] ?? `Now: ${next}`;
  if (prev === next) return null;
  return `${a}. ${b}.`;
}

/** Short card title; details live in colored sections below. */
export function orderLogCardHeadline(log: OrderLog): string {
  const d = log.description?.trim() ?? '';

  if (log.action === 'shipped') {
    return 'Shipment recorded — order is In Transit (warehouse stock was deducted).';
  }

  if (log.action === 'delivered') {
    const meta = asRecord(log.metadata);
    const lines = meta?.received_lines;
    const st = strVal(asRecord(log.newValue)?.status);
    if (st === 'Delivered') return 'Delivery recorded — order is fully Delivered.';
    if (st === 'Partially Fulfilled') return 'Delivery recorded — order is Partially Fulfilled (more to deliver later).';
    if (Array.isArray(lines) && lines.length) {
      return `Delivery recorded — ${lines.length} line(s) updated.`;
    }
    return d || 'Delivery recorded';
  }

  if (log.action === 'status_changed' && d.startsWith('Logistics:')) {
    const m = d.match(/Logistics:\s*([^→]+)\s*→\s*(.+?)(?:\s*\(|$)/);
    if (m) {
      const prev = m[1].trim();
      const next = m[2].trim();
      const hint = logisticsStepLayman(prev, next);
      if (hint) return hint;
    }
    return 'Order progress updated along the logistics steps.';
  }

  if (log.action === 'proof_uploaded') {
    if (d.toLowerCase().startsWith('proof of delivery')) return 'Proof of delivery added.';
    if (d.toLowerCase().startsWith('proof of payment')) return 'Proof of payment added.';
    if (d.toLowerCase().startsWith('receipt')) return 'Receipt / proof document added.';
  }

  if (log.action === 'rejected') {
    const i = d.indexOf(' — Reason:');
    if (i !== -1) {
      const head = d.slice(0, i).trim();
      return head || 'Order was rejected.';
    }
  }

  return d || log.action;
}

function buildWhatChangedLines(log: OrderLog): string[] {
  const lines: string[] = [];
  const oldV = asRecord(log.oldValue);
  const newV = asRecord(log.newValue);
  if (!oldV && !newV) return lines;

  const oStatus = strVal(oldV?.status);
  const nStatus = strVal(newV?.status);
  if ((oStatus || nStatus) && oStatus !== nStatus) {
    lines.push(`Order status changed from “${oStatus ?? '—'}” to “${nStatus ?? '—'}”.`);
  }

  const oPay = strVal(oldV?.paymentStatus);
  const nPay = strVal(newV?.paymentStatus);
  if ((oPay || nPay) && oPay !== nPay) {
    lines.push(`Payment status changed from “${oPay ?? '—'}” to “${nPay ?? '—'}”.`);
  }

  const oSched = fmtDateReadable(oldV?.scheduled_departure_date);
  const nSched = fmtDateReadable(newV?.scheduled_departure_date);
  if ((oSched || nSched) && oSched !== nSched) {
    if (!oSched && nSched) lines.push(`Planned departure date set to ${nSched}.`);
    else if (oSched && !nSched) lines.push(`Planned departure date was cleared (was ${oSched}).`);
    else lines.push(`Planned departure date changed from ${oSched} to ${nSched}.`);
  }

  const oAd = fmtDateReadable(oldV?.actual_delivery);
  const nAd = fmtDateReadable(newV?.actual_delivery);
  if ((oAd || nAd) && oAd !== nAd) {
    if (!oAd && nAd) lines.push(`Actual delivery date recorded: ${nAd}.`);
    else lines.push(`Actual delivery date updated to ${nAd ?? '—'}.`);
  }

  const oPaid = oldV?.amount_paid;
  const nPaid = newV?.amount_paid;
  if (oPaid !== undefined && nPaid !== undefined && oPaid !== nPaid) {
    const o = Number(oPaid);
    const n = Number(nPaid);
    if (Number.isFinite(o) && Number.isFinite(n)) {
      lines.push(
        `Amount paid updated from ₱${o.toLocaleString('en-PH', { minimumFractionDigits: 2 })} to ₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
      );
    }
  }

  return lines;
}

function shipmentLinesFromLog(log: OrderLog): string[] {
  const meta = asRecord(log.metadata);
  const structured = meta?.shipment_lines;
  if (Array.isArray(structured) && structured.length > 0) {
    const out: string[] = [];
    for (const raw of structured) {
      const r = asRecord(raw);
      if (!r) continue;
      const label = strVal(r.label) ?? 'Item';
      const q = fmtQtyReadable(r.quantity);
      const u = (strVal(r.unit) ?? 'units').trim();
      out.push(`${label}: ${q} ${u} sent this shipment`);
    }
    return out;
  }

  const legacy = meta?.inTransit;
  if (Array.isArray(legacy) && legacy.length > 0) {
    let total = 0;
    for (const raw of legacy) {
      const r = asRecord(raw);
      if (!r) continue;
      total += Number(r.shippedQuantity ?? r.quantity) || 0;
    }
    if (legacy.length === 1) {
      const r = asRecord(legacy[0]);
      const q = fmtQtyReadable(r?.shippedQuantity ?? r?.quantity);
      return [`${q} units sent this shipment (details in stock movements).`];
    }
    return [
      `${legacy.length} product line(s) updated; ${fmtQtyReadable(total)} units total sent this shipment.`,
    ];
  }

  return [];
}

function receivedLinesFromLog(log: OrderLog): string[] {
  const meta = asRecord(log.metadata);
  const structured = meta?.received_lines;
  if (Array.isArray(structured) && structured.length > 0) {
    const out: string[] = [];
    for (const raw of structured) {
      const r = asRecord(raw);
      if (!r) continue;
      const label = strVal(r.label) ?? 'Item';
      const variant = strVal(r.variant);
      const head = variant ? `${label} (${variant})` : label;
      const q = fmtQtyReadable(r.quantity);
      const u = (strVal(r.unit) ?? 'units').trim();
      out.push(`${head}: ${q} ${u} received this time`);
    }
    return out;
  }

  const fd = meta?.fulfillmentData;
  if (Array.isArray(fd) && fd.length > 0) {
    const out: string[] = [];
    for (const raw of fd) {
      const r = asRecord(raw);
      if (!r) continue;
      const q = fmtQtyReadable(r.deliveredQuantity);
      out.push(`${q} units marked received on one line.`);
    }
    return out;
  }

  return [];
}

function proofSectionLines(log: OrderLog): string[] {
  if (log.action !== 'proof_uploaded') return [];
  const meta = asRecord(log.metadata);
  if (!meta) return [];
  const lines: string[] = [];
  if (typeof meta.count === 'number') lines.push(`${meta.count} file(s) attached.`);
  const names = strVal(meta.fileNames);
  if (names) lines.push(`Files: ${names}.`);
  const src = strVal(meta.source);
  if (src) lines.push(`Source: ${src.replace(/_/g, ' ')}.`);
  return lines;
}

export function buildOrderLogLaymanSections(log: OrderLog): LaymanSection[] {
  const out: LaymanSection[] = [];
  const meta = asRecord(log.metadata);

  const what: string[] = buildWhatChangedLines(log);

  if (log.action === 'approved') {
    const approver = strVal(asRecord(log.newValue)?.approved_by);
    if (approver && !what.some((l) => l.toLowerCase().includes(approver.toLowerCase()))) {
      what.push(`Approved by ${approver}.`);
    }
  }
  if (log.action === 'rejected') {
    const reason = strVal(meta?.reason);
    if (reason && !what.some((l) => l.includes('Reason'))) what.push(`Reason: “${reason}”.`);
    else if (!reason && log.description) {
      const reasonSepIdx = log.description.indexOf(' — Reason: ');
      if (reasonSepIdx !== -1) {
        const legacyReason = log.description.slice(reasonSepIdx + ' — Reason: '.length).trim();
        if (legacyReason && !what.some((l) => l.includes('Reason'))) {
          what.push(`Reason: “${legacyReason}”.`);
        }
      }
    }
  }

  if (what.length) {
    out.push({ heading: 'What changed', lines: what });
  }

  if (log.action === 'shipped') {
    const ship = shipmentLinesFromLog(log);
    if (ship.length) out.push({ heading: 'Shipped this step', lines: ship });
  }

  if (log.action === 'delivered') {
    const recv = receivedLinesFromLog(log);
    if (recv.length) out.push({ heading: 'Received this step', lines: recv });
  }

  const proofLines = proofSectionLines(log);
  if (proofLines.length) {
    const dl = log.description?.toLowerCase() ?? '';
    const heading = dl.includes('payment')
      ? 'Proof of payment'
      : dl.includes('receipt')
        ? 'Receipt or document'
        : 'Proof of delivery';
    out.push({ heading, lines: proofLines });
  }

  return out;
}

const ORDER_LOG_SECTION_THEME: Record<
  string,
  { bar: string; title: string; body: string; bullet: string; box: string }
> = {
  'What changed': {
    bar: 'border-l-4 border-l-violet-500',
    title: 'text-violet-800',
    body: 'text-violet-950/90',
    bullet: 'text-violet-500',
    box: 'bg-violet-50/70 border-violet-100',
  },
  'Shipped this step': {
    bar: 'border-l-4 border-l-orange-500',
    title: 'text-orange-900',
    body: 'text-orange-950/90',
    bullet: 'text-orange-600',
    box: 'bg-orange-50/85 border-orange-100',
  },
  'Received this step': {
    bar: 'border-l-4 border-l-teal-600',
    title: 'text-teal-900',
    body: 'text-teal-950/90',
    bullet: 'text-teal-600',
    box: 'bg-teal-50/85 border-teal-100',
  },
  'Proof of delivery': {
    bar: 'border-l-4 border-l-blue-500',
    title: 'text-blue-800',
    body: 'text-blue-950/90',
    bullet: 'text-blue-500',
    box: 'bg-blue-50/70 border-blue-100',
  },
  'Proof of payment': {
    bar: 'border-l-4 border-l-emerald-600',
    title: 'text-emerald-900',
    body: 'text-emerald-950/90',
    bullet: 'text-emerald-600',
    box: 'bg-emerald-50/70 border-emerald-100',
  },
  'Receipt or document': {
    bar: 'border-l-4 border-l-indigo-500',
    title: 'text-indigo-900',
    body: 'text-indigo-950/90',
    bullet: 'text-indigo-500',
    box: 'bg-indigo-50/70 border-indigo-100',
  },
};

function themeForOrderSection(heading: string) {
  return (
    ORDER_LOG_SECTION_THEME[heading] ?? {
      bar: 'border-l-4 border-l-gray-400',
      title: 'text-gray-700',
      body: 'text-gray-800',
      bullet: 'text-gray-400',
      box: 'bg-gray-50/80 border-gray-200/80',
    }
  );
}

export function OrderActivityLogHumanDetails({ log }: { log: OrderLog }) {
  const sections = buildOrderLogLaymanSections(log);
  if (sections.length === 0) return null;
  return (
    <div className="mt-3 space-y-2.5 border-t border-gray-200/80 pt-3">
      {sections.map((sec, secIdx) => {
        const th = themeForOrderSection(sec.heading);
        return (
          <div
            key={`${sec.heading}-${secIdx}`}
            className={`rounded-lg border py-2.5 pl-3 pr-2.5 ${th.bar} ${th.box}`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${th.title}`}>{sec.heading}</p>
            <ul className={`text-sm space-y-1.5 list-none pl-0 ${th.body}`}>
              {sec.lines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`shrink-0 select-none font-bold ${th.bullet}`} aria-hidden>
                    ·
                  </span>
                  <span className="min-w-0 leading-snug">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
