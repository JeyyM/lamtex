import React from 'react';

/** Mirrors `POLogRow` on the PO detail page (snake_case from Supabase). */
export type PoLogRowLike = {
  action: string;
  description: string | null;
  old_value: unknown;
  new_value: unknown;
  metadata: unknown;
  created_at: string;
};

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

function fmtMoneyPhp(n: unknown): string | null {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return `₱${x.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function poLogCardHeadline(log: PoLogRowLike): string {
  const d = log.description?.trim() ?? '';

  switch (log.action) {
    case 'receipt_posted':
      return 'Receipt recorded — quantities received were updated.';
    case 'payment_recorded':
      return 'Payment toward this supplier purchase was recorded.';
    case 'order_confirmed':
      return 'Purchase order confirmed with the supplier (goods can be received against it).';
    case 'proof_uploaded':
      return 'Proof-of-receiving image(s) added.';
    case 'proof_removed':
      return 'A proof-of-receiving image was removed.';
    case 'submitted':
      return 'Submitted for approval — waiting on manager or executive.';
    case 'approved':
      return 'Request approved — next step is confirming with the supplier.';
    case 'rejected': {
      const i = d.indexOf(' — Reason:');
      if (i !== -1) {
        const head = d.slice(0, i).trim();
        return head || 'This purchase request was rejected.';
      }
      return d || 'This purchase request was rejected.';
    }
    case 'requested':
      return 'New purchase order request created.';
    case 'updated':
      return 'Purchase order details were saved.';
    default:
      return d || log.action;
  }
}

function buildWhatChangedLines(log: PoLogRowLike): string[] {
  const lines: string[] = [];
  const oldV = asRecord(log.old_value);
  const newV = asRecord(log.new_value);
  if (!oldV && !newV) return lines;

  const oStatus = strVal(oldV?.status);
  const nStatus = strVal(newV?.status);
  if ((oStatus || nStatus) && oStatus !== nStatus) {
    lines.push(`PO status changed from “${oStatus ?? '—'}” to “${nStatus ?? '—'}”.`);
  }

  const oTotal = oldV?.total_amount;
  const nTotal = newV?.total_amount;
  if (oTotal !== undefined && nTotal !== undefined && oTotal !== nTotal) {
    const o = fmtMoneyPhp(oTotal);
    const n = fmtMoneyPhp(nTotal);
    if (o && n) lines.push(`Order total changed from ${o} to ${n}.`);
  }

  const oPay = strVal(oldV?.payment_status);
  const nPay = strVal(newV?.payment_status);
  if ((oPay || nPay) && oPay !== nPay) {
    lines.push(`Payment status changed from “${oPay ?? '—'}” to “${nPay ?? '—'}”.`);
  }

  const oPaid = oldV?.amount_paid;
  const nPaid = newV?.amount_paid;
  if (oPaid !== undefined && nPaid !== undefined && oPaid !== nPaid) {
    const o = fmtMoneyPhp(oPaid);
    const n = fmtMoneyPhp(nPaid);
    if (o && n) lines.push(`Amount paid changed from ${o} to ${n}.`);
  }

  const oMethod = strVal(oldV?.payment_method);
  const nMethod = strVal(newV?.payment_method);
  if ((oMethod || nMethod) && oMethod !== nMethod) {
    lines.push(`Payment method updated to “${nMethod ?? '—'}”.`);
  }

  if (log.action === 'approved') {
    const ab = strVal(newV?.accepted_by);
    if (ab) lines.push(`Accepted by ${ab}.`);
  }
  if (log.action === 'rejected') {
    const rb = strVal(newV?.rejected_by);
    const rr = strVal(newV?.rejection_reason);
    if (rb) lines.push(`Rejected by ${rb}.`);
    if (rr && !lines.some((l) => l.includes(rr))) lines.push(`Reason: “${rr}”.`);
  }

  const meta = asRecord(log.metadata);
  if (log.action === 'rejected' && meta?.reason && strVal(meta.reason)) {
    const r = strVal(meta.reason)!;
    if (!lines.some((l) => l.includes(r))) lines.push(`Reason: “${r}”.`);
  }

  return lines;
}

function receivedStepLines(log: PoLogRowLike): string[] {
  if (log.action !== 'receipt_posted') return [];
  const meta = asRecord(log.metadata);
  if (!meta) return [];

  const structured = meta.receipt_lines;
  if (Array.isArray(structured) && structured.length > 0) {
    const out: string[] = [];
    for (const raw of structured) {
      const r = asRecord(raw);
      if (!r) continue;
      const label = strVal(r.label) ?? 'Material';
      const q = fmtQtyReadable(r.quantity);
      const u = (strVal(r.unit) ?? 'units').trim();
      out.push(`${label}: ${q} ${u} recorded on this receipt`);
    }
    return out;
  }

  const total = meta.quantity_received_on_event;
  const imgs = meta.receipt_image_count;
  const out: string[] = [];
  if (typeof total === 'number' && total > 0) {
    out.push(`Total units entered on this receipt: ${fmtQtyReadable(total)}.`);
  }
  if (typeof imgs === 'number' && imgs > 0) {
    out.push(`${imgs} receipt photo(s) saved with this entry.`);
  }
  return out;
}

function proofLines(log: PoLogRowLike): string[] {
  if (log.action === 'proof_uploaded') {
    const meta = asRecord(log.metadata);
    if (!meta) return [];
    const lines: string[] = [];
    if (typeof meta.count === 'number') lines.push(`${meta.count} image(s) added.`);
    return lines;
  }
  if (log.action === 'proof_removed') {
    const oldV = asRecord(log.old_value);
    const fn = strVal(oldV?.file_name);
    const lines: string[] = ['A stored receipt photo was deleted.'];
    if (fn) lines.push(`File: ${fn}.`);
    return lines;
  }
  return [];
}

function paymentDetailLines(log: PoLogRowLike): string[] {
  if (log.action !== 'payment_recorded') return [];
  const oldV = asRecord(log.old_value);
  const newV = asRecord(log.new_value);
  const meta = asRecord(log.metadata);
  const lines: string[] = [];

  const oPaid = fmtMoneyPhp(oldV?.amount_paid);
  const nPaid = fmtMoneyPhp(newV?.amount_paid);
  if (oPaid && nPaid) lines.push(`Recorded payment moved balance from ${oPaid} paid to ${nPaid} paid.`);

  const nStatus = strVal(newV?.payment_status);
  if (nStatus) lines.push(`Payment status is now “${nStatus}”.`);

  const method = strVal(newV?.payment_method);
  if (method) lines.push(`Method: ${method}.`);

  const notes = strVal(meta?.notes);
  if (notes) lines.push(`Note: ${notes}.`);

  return lines;
}

export function buildPoLogLaymanSections(log: PoLogRowLike): LaymanSection[] {
  const out: LaymanSection[] = [];

  const what = buildWhatChangedLines(log);
  if (what.length) out.push({ heading: 'What changed', lines: what });

  const recv = receivedStepLines(log);
  if (recv.length) out.push({ heading: 'Received this step', lines: recv });

  const pay = paymentDetailLines(log);
  if (pay.length) out.push({ heading: 'Payment', lines: pay });

  const proof = proofLines(log);
  if (proof.length) {
    const heading =
      log.action === 'proof_removed' ? 'Proof of receiving' : 'Proof of receiving';
    out.push({ heading, lines: proof });
  }

  return out;
}

const PO_LOG_SECTION_THEME: Record<
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
  'Received this step': {
    bar: 'border-l-4 border-l-teal-600',
    title: 'text-teal-900',
    body: 'text-teal-950/90',
    bullet: 'text-teal-600',
    box: 'bg-teal-50/85 border-teal-100',
  },
  Payment: {
    bar: 'border-l-4 border-l-fuchsia-600',
    title: 'text-fuchsia-900',
    body: 'text-fuchsia-950/90',
    bullet: 'text-fuchsia-600',
    box: 'bg-fuchsia-50/80 border-fuchsia-100',
  },
  'Proof of receiving': {
    bar: 'border-l-4 border-l-blue-500',
    title: 'text-blue-800',
    body: 'text-blue-950/90',
    bullet: 'text-blue-500',
    box: 'bg-blue-50/70 border-blue-100',
  },
};

function themeForPoSection(heading: string) {
  return (
    PO_LOG_SECTION_THEME[heading] ?? {
      bar: 'border-l-4 border-l-gray-400',
      title: 'text-gray-700',
      body: 'text-gray-800',
      bullet: 'text-gray-400',
      box: 'bg-gray-50/80 border-gray-200/80',
    }
  );
}

export function PoActivityLogHumanDetails({ log }: { log: PoLogRowLike }) {
  const sections = buildPoLogLaymanSections(log);
  if (sections.length === 0) return null;
  return (
    <div className="mt-3 space-y-2.5 border-t border-gray-200/80 pt-3">
      {sections.map((sec, secIdx) => {
        const th = themeForPoSection(sec.heading);
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
