import React from 'react';
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  PlayCircle,
  Send,
  ShoppingCart,
  ThumbsUp,
  Trash2,
  XCircle,
} from 'lucide-react';

/** Matches `production_request_logs` rows from Supabase. */
export type PrLogRowLike = {
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

export function prLogCardHeadline(log: PrLogRowLike): string {
  const d = log.description?.trim() ?? '';
  switch (log.action) {
    case 'submitted':
      return 'Submitted for approval — waiting on manager or executive.';
    case 'approved':
      return 'Request approved — floor can start production when ready.';
    case 'rejected':
      return 'Request was rejected.';
    case 'cancelled':
      return 'Production request was cancelled.';
    case 'in_progress':
      return 'Production started.';
    case 'completed':
      return 'All target quantities marked complete.';
    case 'updated':
      if (d.startsWith('Status changed')) return 'Request status was updated.';
      if (d.includes('partial') || d.includes('Recorded production')) return 'Production output recorded (partial).';
      return d || 'Request was updated.';
    case 'line_added':
      return 'A product line was added.';
    case 'line_removed':
      return 'A product line was removed.';
    case 'line_updated':
      return 'A product line was updated.';
    case 'order_linked':
      return 'A sales order was linked for context.';
    case 'order_unlinked':
      return 'A linked sales order was removed.';
    case 'drafted':
      return 'Draft saved.';
    default:
      return d || log.action;
  }
}

function buildWhatChangedLines(log: PrLogRowLike): string[] {
  const lines: string[] = [];
  const meta = asRecord(log.metadata);

  if (log.action === 'updated' && meta) {
    const from = strVal(meta.from);
    const to = strVal(meta.to);
    if (from != null || to != null) {
      lines.push(`Status changed from “${from ?? '—'}” to “${to ?? '—'}”.`);
    }
    const exp = strVal(meta.expected_completion_date);
    if (exp && log.description?.includes('expected date')) {
      lines.push(`Expected completion date set to ${exp.slice(0, 10)}.`);
    }
    const notes = strVal(meta.notes);
    if (notes && log.description?.includes('notes')) {
      lines.push(`Notes updated.`);
    }
  }

  if (log.action === 'approved') {
    const ab = strVal(meta?.accepted_by);
    if (ab) lines.push(`Accepted by ${ab}.`);
    const st = strVal(meta?.status);
    if (st) lines.push(`New status: ${st}.`);
  }

  if (log.action === 'rejected') {
    const st = strVal(meta?.status);
    if (st) lines.push(`Status set to ${st}.`);
    const tail = (log.description ?? '')
      .replace(/^Rejected by\s+[^.]+\.?\s*/i, '')
      .trim();
    if (tail) lines.push(tail.endsWith('.') ? tail : `${tail}.`);
  }

  if (log.action === 'cancelled') {
    const note = strVal(meta?.note);
    if (note) lines.push(`Note: ${note}`);
  }

  const oldV = asRecord(log.old_value);
  const newV = asRecord(log.new_value);
  if (oldV || newV) {
    const oStatus = strVal(oldV?.status);
    const nStatus = strVal(newV?.status);
    if ((oStatus || nStatus) && oStatus !== nStatus && !lines.some((l) => l.includes('Status changed'))) {
      lines.push(`Status changed from “${oStatus ?? '—'}” to “${nStatus ?? '—'}”.`);
    }
  }

  return lines;
}

function buildProductionLines(log: PrLogRowLike): string[] {
  if (log.action !== 'completed' && log.action !== 'updated') return [];
  const meta = asRecord(log.metadata);
  const rawLines = meta?.lines;
  if (!Array.isArray(rawLines) || rawLines.length === 0) return [];

  const out: string[] = [];
  if (log.action === 'completed') {
    out.push(`Completion saved for ${rawLines.length} product line(s).`);
    for (const raw of rawLines) {
      const r = asRecord(raw);
      if (!r) continue;
      const produced = r.produced ?? r.producedQuantity;
      if (produced != null && Number.isFinite(Number(produced))) {
        out.push(`Recorded ${fmtQtyReadable(produced)} units produced on one line.`);
      }
    }
    return out;
  }

  // partial production log.action === 'updated' with lines
  if (log.description?.includes('partial') || log.description?.includes('Recorded production')) {
    out.push('Per-line amounts from this recording:');
    for (const raw of rawLines) {
      const r = asRecord(raw);
      if (!r) continue;
      const p = Number(r.producedQuantity ?? r.produced);
      const t = Number(r.targetQuantity);
      if (Number.isFinite(p)) {
        out.push(
          Number.isFinite(t)
            ? `${fmtQtyReadable(p)} units this run (line target ${fmtQtyReadable(t)}).`
            : `${fmtQtyReadable(p)} units recorded this run.`,
        );
      }
    }
  }
  return out;
}

function buildOrderContextLines(log: PrLogRowLike): string[] {
  if (log.action !== 'order_linked' && log.action !== 'order_unlinked') return [];
  const d = log.description?.trim();
  return d ? [d] : [];
}

export function buildPrLogLaymanSections(log: PrLogRowLike): LaymanSection[] {
  const out: LaymanSection[] = [];
  const what = buildWhatChangedLines(log);
  if (what.length) out.push({ heading: 'What changed', lines: what });
  const prod = buildProductionLines(log);
  if (prod.length) out.push({ heading: 'Production output', lines: prod });
  const ord = buildOrderContextLines(log);
  if (ord.length) out.push({ heading: 'Order link', lines: ord });
  return out;
}

const PR_LOG_SECTION_THEME: Record<
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
  'Production output': {
    bar: 'border-l-4 border-l-teal-600',
    title: 'text-teal-900',
    body: 'text-teal-950/90',
    bullet: 'text-teal-600',
    box: 'bg-teal-50/85 border-teal-100',
  },
  'Order link': {
    bar: 'border-l-4 border-l-cyan-600',
    title: 'text-cyan-900',
    body: 'text-cyan-950/90',
    bullet: 'text-cyan-600',
    box: 'bg-cyan-50/80 border-cyan-100',
  },
};

function themeForPrSection(heading: string) {
  return (
    PR_LOG_SECTION_THEME[heading] ?? {
      bar: 'border-l-4 border-l-gray-400',
      title: 'text-gray-700',
      body: 'text-gray-800',
      bullet: 'text-gray-400',
      box: 'bg-gray-50/80 border-gray-200/80',
    }
  );
}

export function PrActivityLogHumanDetails({ log }: { log: PrLogRowLike }) {
  const sections = buildPrLogLaymanSections(log);
  if (sections.length === 0) return null;
  return (
    <div className="mt-3 space-y-2.5 border-t border-gray-200/80 pt-3">
      {sections.map((sec, secIdx) => {
        const th = themeForPrSection(sec.heading);
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

export function getPrLogActionIcon(action: string): React.ReactNode {
  switch (action) {
    case 'drafted':
      return <FileText className="w-4 h-4" />;
    case 'submitted':
      return <Send className="w-4 h-4" />;
    case 'requested':
    case 'line_added':
      return <ClipboardList className="w-4 h-4" />;
    case 'approved':
      return <ThumbsUp className="w-4 h-4" />;
    case 'rejected':
    case 'order_unlinked':
      return <XCircle className="w-4 h-4" />;
    case 'in_progress':
      return <PlayCircle className="w-4 h-4" />;
    case 'completed':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'cancelled':
      return <Ban className="w-4 h-4" />;
    case 'line_removed':
      return <Trash2 className="w-4 h-4" />;
    case 'line_updated':
      return <FileText className="w-4 h-4" />;
    case 'order_linked':
      return <ShoppingCart className="w-4 h-4" />;
    case 'updated':
      return <FileText className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

export function getPrLogActionColor(action: string): string {
  switch (action) {
    case 'drafted':
      return 'text-sky-600 bg-sky-50';
    case 'submitted':
    case 'requested':
      return 'text-amber-600 bg-amber-50';
    case 'approved':
    case 'completed':
      return 'text-green-600 bg-green-50';
    case 'rejected':
    case 'cancelled':
      return 'text-red-600 bg-red-50';
    case 'in_progress':
      return 'text-violet-600 bg-violet-50';
    case 'line_added':
      return 'text-blue-600 bg-blue-50';
    case 'line_removed':
    case 'order_unlinked':
      return 'text-orange-600 bg-orange-50';
    case 'line_updated':
      return 'text-gray-600 bg-gray-50';
    case 'order_linked':
      return 'text-cyan-600 bg-cyan-50';
    case 'updated':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}
