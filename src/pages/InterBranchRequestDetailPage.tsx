import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import {
  approveInterBranchRequest,
  assertAllInterBranchItemsInBothBranches,
  assertMaterialStockAtBothBranches,
  assertVariantStockAtBothBranches,
  ensureInterBranchLinkedDocuments,
  fetchInterBranchRequestItemRows,
  type IBRStatus,
  type InterBranchItemRow,
  type InterBranchRequestItemDbRow,
} from '@/src/lib/interBranchRequest';
import { applyIbrReceiveStock, applyIbrShipStock } from '@/src/lib/interBranchStock';
import { MarkIbrInTransitModal } from '@/src/components/interBranch/MarkIbrInTransitModal';
import { RecordIbrDeliveryModal } from '@/src/components/interBranch/RecordIbrDeliveryModal';
import type { FulfillmentData } from '@/src/components/orders/FulfillOrderModal';
import RawMaterialPickerModal from '@/src/components/products/RawMaterialPickerModal';
import {
  OrderProductSelectionModal,
  type OrderProductSelectionConfirm,
  type OrderProductInitialEdit,
} from '@/src/components/orders/OrderProductSelectionModal';
import {
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  GitBranch,
  Plus,
  Trash2,
  AlertTriangle,
  Factory,
  RefreshCw,
  ClipboardList,
  ThumbsUp,
  Ban,
  FileText,
  Calendar,
  User,
  StickyNote,
  Building2,
  Package,
  Edit,
  Save,
  Truck,
  PackageCheck,
  CheckCircle2,
  Clock,
  ImageIcon,
} from 'lucide-react';

type RawMaterialMeta = {
  name: string;
  sku: string;
  unit_of_measure: string;
  cost_per_unit: number;
  image_url: string | null;
};

const getStatusVariant = (s: IBRStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'default' | 'info' => {
  if (s === 'Fulfilled' || s === 'Completed' || s === 'Delivered') return 'success';
  if (s === 'Cancelled' || s === 'Rejected') return 'danger';
  if (s === 'Pending') return 'warning';
  if (s === 'Approved' || s === 'Scheduled') return 'info';
  if (s === 'Draft') return 'neutral';
  if (['Loading', 'Packed', 'Ready', 'In Transit', 'Partially Fulfilled'].includes(s)) return 'warning';
  return 'neutral';
};

const getIBRStatusIcon = (status: IBRStatus) => {
  if (status === 'Fulfilled' || status === 'Completed' || status === 'Delivered') return <CheckCircle className="w-4 h-4" />;
  if (status === 'Cancelled') return <Ban className="w-4 h-4" />;
  if (status === 'Draft') return <FileText className="w-4 h-4" />;
  if (status === 'Pending') return <ClipboardList className="w-4 h-4" />;
  if (status === 'Rejected') return <XCircle className="w-4 h-4" />;
  if (status === 'Approved') return <ThumbsUp className="w-4 h-4" />;
  if (status === 'Scheduled') return <Calendar className="w-4 h-4" />;
  if (status === 'Loading' || status === 'Packed' || status === 'Ready') return <Package className="w-4 h-4" />;
  if (status === 'In Transit') return <Truck className="w-4 h-4" />;
  if (status === 'Partially Fulfilled') return <GitBranch className="w-4 h-4" />;
  return <GitBranch className="w-4 h-4" />;
};

/** After approval, same idea as `OrderDetailPage` logistics strip (without customer delivery wording). */
const IBR_LOGISTICS_STEPS: IBRStatus[] = [
  'Approved',
  'Scheduled',
  'Loading',
  'Packed',
  'Ready',
  'In Transit',
  'Delivered',
];

function ibrLogisticsStepVisual(stepIndex: number, current: IBRStatus): 'complete' | 'current' | 'upcoming' {
  if (current === 'Fulfilled' || current === 'Completed') return 'complete';
  const effective: IBRStatus = current === 'Partially Fulfilled' ? 'In Transit' : current;
  const cur = IBR_LOGISTICS_STEPS.indexOf(effective);
  if (cur < 0) return 'upcoming';
  if (stepIndex < cur) return 'complete';
  if (stepIndex === cur) return 'current';
  return 'upcoming';
}

/** Same idea as `OrderDetailPage` `allStatuses` — any status can be set while editing (admin / corrections). */
const IBR_ALL_STATUSES: IBRStatus[] = [
  'Draft',
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
  'Fulfilled',
  'Scheduled',
  'Loading',
  'Packed',
  'Ready',
  'In Transit',
  'Delivered',
  'Partially Fulfilled',
  'Completed',
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

type RawPickPayload = {
  materialId: string;
  name: string;
  sku: string;
  unit: string;
  cost: number;
  imageUrl: string | null;
};

const canBossApprove = (r: string) => ['Executive', 'Manager'].includes(r as string);

/** Activity log row (mirrors purchase_order_logs). */
type IbrLogRow = {
  id: string;
  action: string;
  performed_by: string | null;
  performed_by_role: string | null;
  description: string | null;
  created_at: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

/** Serializable line snapshot for IBR activity metadata (avoid transient temp- ids in “added”). */
type IbrLineLogSnap = {
  id?: string;
  line_kind: 'raw_material' | 'product';
  raw_material_id: string | null;
  product_id: string | null;
  product_variant_id: string | null;
  quantity: number;
  quantity_shipped: number;
  quantity_delivered: number;
  label?: string;
};

function snapFromServerRow(r: InterBranchRequestItemDbRow, label?: string): IbrLineLogSnap {
  return {
    id: r.id,
    line_kind: r.line_kind,
    raw_material_id: r.raw_material_id,
    product_id: r.product_id,
    product_variant_id: r.product_variant_id,
    quantity: Number(r.quantity) || 0,
    quantity_shipped: Number(r.quantity_shipped) || 0,
    quantity_delivered: Number(r.quantity_delivered) || 0,
    label,
  };
}

function snapFromUiLine(i: {
  id: string;
  line_kind: 'raw_material' | 'product';
  raw_material_id: string | null;
  product_id: string | null;
  product_variant_id: string | null;
  quantity: number;
  quantity_shipped: number;
  quantity_delivered: number;
  mat_label?: string;
  prod_label?: string;
}): IbrLineLogSnap {
  return {
    ...(i.id.startsWith('temp-') ? {} : { id: i.id }),
    line_kind: i.line_kind,
    raw_material_id: i.raw_material_id,
    product_id: i.product_id,
    product_variant_id: i.product_variant_id,
    quantity: Number(i.quantity) || 0,
    quantity_shipped: Number(i.quantity_shipped) || 0,
    quantity_delivered: Number(i.quantity_delivered) || 0,
    label: i.mat_label ?? i.prod_label,
  };
}

function ibrLineSnapsEqual(a: IbrLineLogSnap, b: IbrLineLogSnap): boolean {
  return (
    a.line_kind === b.line_kind &&
    a.raw_material_id === b.raw_material_id &&
    a.product_id === b.product_id &&
    a.product_variant_id === b.product_variant_id &&
    Math.abs(a.quantity - b.quantity) < 1e-9 &&
    Math.abs(a.quantity_shipped - b.quantity_shipped) < 1e-9 &&
    Math.abs(a.quantity_delivered - b.quantity_delivered) < 1e-9
  );
}

function diffIbrLineSnaps(before: IbrLineLogSnap[], after: IbrLineLogSnap[]) {
  const beforeById = new Map(before.filter((x) => x.id).map((x) => [x.id!, x]));
  const afterIdSet = new Set(after.map((x) => x.id).filter(Boolean) as string[]);
  const added: IbrLineLogSnap[] = [];
  const removed: IbrLineLogSnap[] = [];
  const changed: { before: IbrLineLogSnap; after: IbrLineLogSnap }[] = [];

  for (const a of after) {
    if (!a.id) {
      added.push(a);
      continue;
    }
    const prev = beforeById.get(a.id);
    if (!prev) added.push(a);
    else if (!ibrLineSnapsEqual(prev, a)) changed.push({ before: prev, after: a });
  }
  for (const b of before) {
    if (b.id && !afterIdSet.has(b.id)) removed.push(b);
  }
  return { added, removed, changed };
}

function summarizeIbrLineDiffMeta(metadata: Record<string, unknown> | null): string | null {
  if (!metadata?.lines || typeof metadata.lines !== 'object' || metadata.lines === null) return null;
  const L = metadata.lines as { added?: unknown[]; removed?: unknown[]; changed?: unknown[] };
  const a = Array.isArray(L.added) ? L.added.length : 0;
  const r = Array.isArray(L.removed) ? L.removed.length : 0;
  const c = Array.isArray(L.changed) ? L.changed.length : 0;
  if (a === 0 && r === 0 && c === 0) return null;
  const parts: string[] = [];
  if (a) parts.push(`+${a} line${a === 1 ? '' : 's'}`);
  if (r) parts.push(`−${r} line${r === 1 ? '' : 's'}`);
  if (c) parts.push(`${c} line${c === 1 ? '' : 's'} updated`);
  return parts.join(' · ');
}

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

function lineKindFriendly(k: unknown): string {
  if (k === 'raw_material') return 'Material';
  if (k === 'product') return 'Product';
  return 'Item';
}

function describeLineAddedOrRemoved(s: Record<string, unknown>, verb: 'Added' | 'Removed'): string {
  const kind = lineKindFriendly(s.line_kind);
  const name = strVal(s.label) || 'Unnamed item';
  const q = fmtQtyReadable(s.quantity);
  return `${verb} ${kind.toLowerCase()}: ${name} — ordered quantity: ${q}.`;
}

function describeLineChangedPair(pair: Record<string, unknown>): string {
  const b = asRecord(pair.before);
  const a = asRecord(pair.after);
  if (!b || !a) return 'One line on the request was updated.';
  const name = strVal(a.label) || strVal(b.label) || 'Item';
  const bits: string[] = [];
  if (b.quantity !== a.quantity) {
    bits.push(
      `ordered quantity changed from ${fmtQtyReadable(b.quantity)} to ${fmtQtyReadable(a.quantity)}`,
    );
  }
  if (b.quantity_shipped !== a.quantity_shipped) {
    bits.push(
      `amount shipped changed from ${fmtQtyReadable(b.quantity_shipped)} to ${fmtQtyReadable(a.quantity_shipped)}`,
    );
  }
  if (b.quantity_delivered !== a.quantity_delivered) {
    bits.push(
      `amount received changed from ${fmtQtyReadable(b.quantity_delivered)} to ${fmtQtyReadable(a.quantity_delivered)}`,
    );
  }
  if (bits.length === 0) return `${name}: line details were updated.`;
  return `${name}: ${bits.join('; ')}.`;
}

type IbrLogLaymanSection = { heading: string; lines: string[] };

/** Legacy in_transit rows stored the whole list in description after this prefix. */
function legacyInTransitShippedParts(description: string | null): string[] {
  if (!description) return [];
  const prefix = 'Shipment / in transit recorded:';
  if (!description.includes(prefix)) return [];
  const rest = description.slice(description.indexOf(prefix) + prefix.length).trim();
  if (!rest) return [];
  return rest
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Legacy delivery rows appended "label: +qty" after the first sentence. */
function legacyDeliveryReceivedParts(description: string | null): string[] {
  if (!description) return [];
  const marker = 'Recorded delivery at requesting branch';
  if (!description.includes(marker)) return [];
  const dot = description.indexOf('.', description.indexOf(marker));
  if (dot < 0) return [];
  const rest = description.slice(dot + 1).trim();
  if (!rest) return [];
  return rest
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
}

/** One-line title for the timeline card (hides legacy long descriptions). */
function ibrLogCardHeadline(log: IbrLogRow): string {
  const d = log.description?.trim() ?? '';
  if (log.action === 'in_transit') {
    if (d.includes('Shipment / in transit recorded:')) {
      return 'Shipment recorded — status set to In Transit';
    }
    return d || 'In transit';
  }
  if (log.action === 'delivery_recorded' && d.startsWith('Recorded delivery at requesting branch')) {
    const cut = d.indexOf('.');
    if (cut > 0 && d.slice(cut + 1).trim().length > 0) {
      return d.slice(0, cut + 1).trim();
    }
    return d || 'Delivery recorded';
  }
  return d || log.action;
}

/** Plain-language breakdown of a log row for the activity timeline (no JSON / IDs). */
function buildIbrLogLaymanSections(log: IbrLogRow): IbrLogLaymanSection[] {
  const out: IbrLogLaymanSection[] = [];
  const meta = asRecord(log.metadata);
  const oldV = asRecord(log.old_value);
  const newV = asRecord(log.new_value);

  if (log.action === 'created' && newV) {
    const lines: string[] = [];
    const num = strVal(newV.ibr_number);
    if (num) lines.push(`Reference number: ${num}.`);
    const st = strVal(newV.status);
    if (st) lines.push(`Starting status: ${st}.`);
    if (meta) {
      const reqN = strVal(meta.requesting_branch_name);
      const fulN = strVal(meta.fulfilling_branch_name);
      if (reqN) lines.push(`Receiving branch: ${reqN}.`);
      if (fulN) lines.push(`Sending branch: ${fulN}.`);
    }
    if (lines.length) out.push({ heading: 'Summary', lines });
    return out;
  }

  const detailLines: string[] = [];

  if (oldV || newV) {
    const oS = strVal(oldV?.status);
    const nS = strVal(newV?.status);
    if (oS !== nS && (oS || nS)) {
      detailLines.push(`Status changed from “${oS ?? '—'}” to “${nS ?? '—'}”.`);
    }

    const oName = strVal(oldV?.fulfilling_branch_name);
    const nName = strVal(newV?.fulfilling_branch_name);
    const oId = strVal(oldV?.fulfilling_branch_id);
    const nId = strVal(newV?.fulfilling_branch_id);
    const fulfillingIdChanged = oId !== nId && Boolean(oId || nId);
    const fulfillingNameChanged = oName !== nName && Boolean(oName || nName);
    if (fulfillingIdChanged || fulfillingNameChanged) {
      if (oName != null && oName !== '' && nName != null && nName !== '') {
        detailLines.push(`Fulfilling branch changed from “${oName}” to “${nName}”.`);
      } else if (oName != null && oName !== '') {
        detailLines.push(`Fulfilling branch changed from “${oName}” to “${nName ?? '—'}”.`);
      } else if (nName != null && nName !== '') {
        detailLines.push(`Fulfilling branch changed from “${oName ?? '—'}” to “${nName}”.`);
      } else if (fulfillingIdChanged) {
        detailLines.push('Fulfilling branch (sending location) was changed.');
      }
    }

    const oN = strVal(oldV?.notes);
    const nN = strVal(newV?.notes);
    if (oN !== nN) {
      if (!oN && nN) {
        const snippet = nN.length > 220 ? `${nN.slice(0, 220)}…` : nN;
        detailLines.push(`Notes added: “${snippet}”.`);
      } else if (oN && !nN) {
        detailLines.push('Notes were cleared.');
      } else if (oN && nN) {
        const oSnip = oN.length > 120 ? `${oN.slice(0, 120)}…` : oN;
        const nSnip = nN.length > 120 ? `${nN.slice(0, 120)}…` : nN;
        detailLines.push(`Notes changed from “${oSnip}” to “${nSnip}”.`);
      }
    }

    const appr = strVal(newV?.approved_by);
    if (log.action === 'approved' && appr) detailLines.push(`Approved by ${appr}.`);

    const rej = strVal(newV?.rejected_by);
    if (log.action === 'rejected' && rej) detailLines.push(`Rejected by ${rej}.`);

    const fulB = strVal(newV?.fulfilled_by);
    if (log.action === 'fulfilled' && fulB) detailLines.push(`Closed out by ${fulB}.`);
  }

  if (meta && typeof meta.reason === 'string' && log.action === 'rejected' && meta.reason.trim()) {
    detailLines.push(`Reason: “${meta.reason.trim()}”.`);
  }

  const sched = strVal(newV?.scheduled_departure_date);
  if (sched) {
    detailLines.push(`Planned departure date: ${sched}.`);
  }

  if (detailLines.length) {
    out.push({ heading: 'What changed', lines: detailLines });
  }

  if (log.action === 'in_transit' && meta) {
    const shipLines: string[] = [];
    const structured = meta.shipment_lines;
    if (Array.isArray(structured) && structured.length > 0) {
      for (const raw of structured) {
        const r = asRecord(raw);
        if (!r) continue;
        const label = strVal(r.label) ?? 'Item';
        const q = fmtQtyReadable(r.quantity);
        const u = (strVal(r.unit) ?? '').trim();
        shipLines.push(u ? `${label}: ${q} ${u}` : `${label}: ${q}`);
      }
    }
    if (shipLines.length === 0) {
      for (const part of legacyInTransitShippedParts(log.description)) {
        shipLines.push(part.endsWith('.') ? part.slice(0, -1) : part);
      }
    }
    if (shipLines.length) {
      out.push({ heading: 'Shipped this step', lines: shipLines });
    }
  }

  if (log.action === 'delivery_recorded' && meta) {
    const recvLines: string[] = [];
    const structured = meta.received_lines;
    if (Array.isArray(structured) && structured.length > 0) {
      for (const raw of structured) {
        const r = asRecord(raw);
        if (!r) continue;
        const label = strVal(r.label) ?? 'Item';
        const q = fmtQtyReadable(r.quantity);
        const u = (strVal(r.unit) ?? '').trim();
        recvLines.push(u ? `${label}: ${q} ${u} received` : `${label}: ${q} received`);
      }
    }
    if (recvLines.length === 0) {
      for (const part of legacyDeliveryReceivedParts(log.description)) {
        recvLines.push(part);
      }
    }
    if (recvLines.length) {
      out.push({ heading: 'Received this step', lines: recvLines });
    }
  }

  const linesMeta = meta?.lines;
  if (linesMeta != null && typeof linesMeta === 'object' && !Array.isArray(linesMeta)) {
    const L = linesMeta as { added?: unknown[]; removed?: unknown[]; changed?: unknown[] };
    const itemLines: string[] = [];
    for (const raw of Array.isArray(L.added) ? L.added : []) {
      const s = asRecord(raw);
      if (s) itemLines.push(describeLineAddedOrRemoved(s, 'Added'));
    }
    for (const raw of Array.isArray(L.removed) ? L.removed : []) {
      const s = asRecord(raw);
      if (s) itemLines.push(describeLineAddedOrRemoved(s, 'Removed'));
    }
    for (const raw of Array.isArray(L.changed) ? L.changed : []) {
      const p = asRecord(raw);
      if (p && 'before' in p && 'after' in p) itemLines.push(describeLineChangedPair(p));
    }
    if (itemLines.length) {
      out.push({ heading: 'Items', lines: itemLines });
    }
  }

  const ld = asRecord(meta?.linked_documents);
  if (ld) {
    const before = asRecord(ld.before);
    const after = asRecord(ld.after);
    if (before && after) {
      const linkLines: string[] = [];
      const poB = before.linked_purchase_order_id;
      const poA = after.linked_purchase_order_id;
      const prB = before.linked_production_request_id;
      const prA = after.linked_production_request_id;
      if (poB !== poA) {
        if (!poB && poA) {
          linkLines.push('A purchase order was linked so the receiving branch can process incoming raw materials.');
        } else if (poB && !poA) {
          linkLines.push('The linked purchase order was removed.');
        } else {
          linkLines.push('The linked purchase order was replaced.');
        }
      }
      if (prB !== prA) {
        if (!prB && prA) {
          linkLines.push('A production request was linked so the sending branch can ship finished products.');
        } else if (prB && !prA) {
          linkLines.push('The linked production request was removed.');
        } else {
          linkLines.push('The linked production request was replaced.');
        }
      }
      if (linkLines.length) {
        out.push({ heading: 'Linked orders', lines: linkLines });
      }
    }
  }

  if (log.action === 'proof_uploaded' && meta) {
    const lines: string[] = [];
    if (typeof meta.count === 'number') lines.push(`${meta.count} delivery photo(s) were added.`);
    const names = strVal(meta.fileNames);
    if (names) lines.push(`File names: ${names}.`);
    if (lines.length) out.push({ heading: 'Proof of delivery', lines });
  }

  if (log.action === 'submitted' && typeof meta?.line_count === 'number') {
    out.push({
      heading: 'Size',
      lines: [`This submission includes ${meta.line_count} line item(s).`],
    });
  }

  return out;
}

const IBR_LOG_SECTION_THEME: Record<
  string,
  { bar: string; title: string; body: string; bullet: string; box: string }
> = {
  Summary: {
    bar: 'border-l-4 border-l-sky-500',
    title: 'text-sky-800',
    body: 'text-sky-950/90',
    bullet: 'text-sky-500',
    box: 'bg-sky-50/70 border-sky-100',
  },
  'What changed': {
    bar: 'border-l-4 border-l-violet-500',
    title: 'text-violet-800',
    body: 'text-violet-950/90',
    bullet: 'text-violet-500',
    box: 'bg-violet-50/70 border-violet-100',
  },
  Items: {
    bar: 'border-l-4 border-l-emerald-500',
    title: 'text-emerald-800',
    body: 'text-emerald-950/90',
    bullet: 'text-emerald-600',
    box: 'bg-emerald-50/70 border-emerald-100',
  },
  'Linked orders': {
    bar: 'border-l-4 border-l-amber-500',
    title: 'text-amber-900',
    body: 'text-amber-950/90',
    bullet: 'text-amber-600',
    box: 'bg-amber-50/70 border-amber-100',
  },
  'Proof of delivery': {
    bar: 'border-l-4 border-l-blue-500',
    title: 'text-blue-800',
    body: 'text-blue-950/90',
    bullet: 'text-blue-500',
    box: 'bg-blue-50/70 border-blue-100',
  },
  Size: {
    bar: 'border-l-4 border-l-slate-400',
    title: 'text-slate-700',
    body: 'text-slate-900',
    bullet: 'text-slate-500',
    box: 'bg-slate-50/80 border-slate-200/80',
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
};

function themeForIbrLogSection(heading: string) {
  return (
    IBR_LOG_SECTION_THEME[heading] ?? {
      bar: 'border-l-4 border-l-gray-400',
      title: 'text-gray-700',
      body: 'text-gray-800',
      bullet: 'text-gray-400',
      box: 'bg-gray-50/80 border-gray-200/80',
    }
  );
}

function IbrActivityLogHumanDetails({ log }: { log: IbrLogRow }) {
  const sections = buildIbrLogLaymanSections(log);
  if (sections.length === 0) return null;
  return (
    <div className="mt-3 space-y-2.5 border-t border-gray-200/80 pt-3">
      {sections.map((sec, secIdx) => {
        const th = themeForIbrLogSection(sec.heading);
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

type IbrDeliveryProofRow = {
  id: string;
  file_url: string;
  file_name: string;
  created_at: string;
  uploaded_by: string | null;
};

const logRoleMap: Record<string, string> = {
  Executive: 'Admin',
  Manager: 'Manager',
  Agent: 'Agent',
  Warehouse: 'Warehouse Staff',
  Logistics: 'Logistics',
  Driver: 'Logistics',
};

/** Staged (edit-mode) line ids — never sent to the DB; replaced after Save Changes. */
const isLocalIbrItemId = (itemId: string) => itemId.startsWith('temp-');
const newLocalIbrItemId = () => `temp-${globalThis.crypto.randomUUID()}`;

/** Optional `brand` / `Brand` string in `products.specifications` JSON (for display: Name · Brand). */
function brandFromProductSpecifications(spec: unknown): string | null {
  if (spec == null || typeof spec !== 'object' || Array.isArray(spec)) return null;
  const o = spec as Record<string, unknown>;
  const raw = o.brand ?? o.Brand;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
}

function ibrProductLineLabel(
  productName: string,
  sku: string,
  variantSizeLabel: string,
  specifications?: unknown,
): string {
  const brand = brandFromProductSpecifications(specifications);
  const head = brand ? `${productName} · ${brand}` : productName;
  return `${head} — ${sku} (${variantSizeLabel})`;
}

const fmtVariantStockUnits = (n: number) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString() : '—';

type IbrRawLineCardProps = {
  mode: 'new' | 'existing';
  name: string;
  sku: string;
  uom: string;
  costPerUnit: number;
  quantityOrdered: number;
  imageUrl: string | null;
  stock?: { requesting: number; fulfilling: number };
  requestingLabel: string;
  fulfillingLabel: string;
  isOpen: boolean;
  onHeaderClick?: () => void;
  editQty: string;
  setEditQty: (v: string) => void;
  editUom: string;
  setEditUom: (v: string) => void;
  editReceived: string;
  setEditReceived: (v: string) => void;
  saving: boolean;
  onAdd?: () => void;
  onApply?: () => void;
  onCancel: () => void;
  onRemove?: () => void;
  canEdit?: boolean;
  readOnly?: boolean;
};

function IbrRawMaterialLineCard(p: IbrRawLineCardProps) {
  const lineTotal = p.isOpen
    ? (Number(p.editQty) || 0) * p.costPerUnit
    : p.quantityOrdered * p.costPerUnit;
  const st = p.stock;
  const fmtStock = (n: number) =>
    Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—';

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        p.isOpen ? 'border-indigo-300 shadow-sm' : 'border-gray-100'
      }`}
    >
      <div
        role={p.onHeaderClick ? 'button' : undefined}
        tabIndex={p.onHeaderClick ? 0 : undefined}
        className={`flex items-center gap-3 p-3 ${
          p.onHeaderClick ? 'cursor-pointer' : ''
        } ${p.isOpen ? 'bg-indigo-50' : p.onHeaderClick ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-50'}`}
        onClick={p.onHeaderClick}
        onKeyDown={(e) => {
          if (!p.onHeaderClick) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            p.onHeaderClick();
          }
        }}
      >
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt=""
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
          <div className="text-xs text-gray-400 font-mono">{p.sku}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Ordered:{' '}
            <span className="font-medium text-gray-700">
              {p.quantityOrdered.toLocaleString()} {p.uom || 'unit'}
            </span>
          </div>
          {st && (
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-gray-600">
              <span className="font-medium text-gray-700 shrink-0">Stock in hand ·</span>
              <span>
                <span className="text-gray-500">{p.requestingLabel}:</span>{' '}
                <span className="font-semibold tabular-nums text-gray-900">{fmtStock(st.requesting)}</span>
                {p.uom ? ` ${p.uom}` : ''}
              </span>
              <span className="text-gray-300" aria-hidden>
                |
              </span>
              <span>
                <span className="text-gray-500">{p.fulfillingLabel}:</span>{' '}
                <span className="font-semibold tabular-nums text-gray-900">{fmtStock(st.fulfilling)}</span>
                {p.uom ? ` ${p.uom}` : ''}
              </span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-gray-900">
            ₱{p.costPerUnit.toLocaleString()}/{p.uom || 'unit'}
          </div>
          <div className="text-xs text-gray-500">₱{lineTotal.toLocaleString()} total</div>
        </div>
        {p.mode === 'existing' && p.canEdit && p.onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              p.onRemove?.();
            }}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg ml-1 shrink-0"
            title="Remove line"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {p.isOpen && p.canEdit !== false && (
        <div className="px-4 pb-4 pt-3 bg-sky-50/80 border-t border-sky-100 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qty ordered</label>
              <input
                type="number"
                min="0"
                step="any"
                value={p.editQty}
                onChange={(e) => p.setEditQty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit of measure</label>
              <input
                value={p.editUom}
                onChange={(e) => p.setEditUom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit price (₱) — catalog</label>
              <p className="w-full border border-dashed border-gray-200 bg-white/60 rounded-lg px-3 py-2 text-sm text-gray-800 tabular-nums">
                ₱{p.costPerUnit.toLocaleString()} / {p.uom || 'unit'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qty received</label>
              <input
                type="number"
                min="0"
                step="any"
                value={p.readOnly ? '0' : p.editReceived}
                readOnly
                className="w-full border border-dashed border-gray-200 bg-white/60 rounded-lg px-3 py-2 text-sm text-gray-500"
                title="Not tracked on IBR — use the linked purchase order"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Tracked on the linked PO (created when you save lines)</p>
            </div>
          </div>

          <div className="flex gap-2">
            {p.mode === 'new' && p.onAdd && (
              <button
                type="button"
                onClick={p.onAdd}
                disabled={p.saving}
                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-1 disabled:opacity-60"
              >
                {p.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add to request
              </button>
            )}
            {p.mode === 'existing' && p.onApply && (
              <button
                type="button"
                onClick={p.onApply}
                disabled={p.saving}
                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-1 disabled:opacity-60"
              >
                {p.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Apply
              </button>
            )}
            <button
              type="button"
              onClick={p.onCancel}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-white bg-white/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export function InterBranchRequestDetailPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { branch, employeeName, session, role } = useAppContext();

  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);
  const [logisticsLoading, setLogisticsLoading] = useState(false);

  const [id, setId] = useState<string | null>(routeId === 'new' ? null : (routeId ?? null));
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createdRef = useRef(false);

  const [ibr, setIbr] = useState<{
    ibr_number: string;
    status: IBRStatus;
    requesting_branch_id: string;
    fulfilling_branch_id: string;
    notes: string | null;
    created_by: string | null;
    submitted_at: string | null;
    approved_by: string | null;
    approved_at: string | null;
    rejected_by: string | null;
    rejection_reason: string | null;
    linked_purchase_order_id: string | null;
    linked_production_request_id: string | null;
    scheduled_departure_date: string | null;
    created_at: string;
    req_br: { name: string } | null;
    ful_br: { name: string } | null;
  } | null>(null);
  const [items, setItems] = useState<
    {
      id: string;
      line_kind: 'raw_material' | 'product';
      raw_material_id: string | null;
      product_id: string | null;
      product_variant_id: string | null;
      quantity: number;
      quantity_shipped: number;
      quantity_delivered: number;
      mat_label?: string;
      prod_label?: string;
    }[]
  >([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [fulfillingId, setFulfillingId] = useState('');
  const [notes, setNotes] = useState('');
  const [showRawPicker, setShowRawPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  /** Full row from DB for each raw_material_id on this request */
  const [rawMaterialById, setRawMaterialById] = useState<Record<string, RawMaterialMeta>>({});
  /** Per-material stock at requesting vs fulfilling warehouse (branch ids from IBR + selector) */
  const [materialStockById, setMaterialStockById] = useState<
    Record<string, { requesting: number; fulfilling: number }>
  >({});
  /** Per-variant stock at requesting vs fulfilling branch (Products to send). */
  const [productVariantStockById, setProductVariantStockById] = useState<
    Record<string, { requesting: number; fulfilling: number }>
  >({});
  /** null | line item id | 'new' (picker draft before insert) */
  const [editingMaterialLineId, setEditingMaterialLineId] = useState<string | null>(null);
  const [draftRaw, setDraftRaw] = useState<RawPickPayload | null>(null);
  const [editMatQty, setEditMatQty] = useState('1');
  const [editMatUom, setEditMatUom] = useState('');
  const [editMatReceived, setEditMatReceived] = useState('0');
  const lastFulfillingId = useRef<string>('');
  /** Full edit mode (order-style): status, lines, branch, notes — any status. */
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<IBRStatus | null>(null);
  /** `inter_branch_request_items.id` when the product modal is opened to edit that line; `null` = add. */
  const [editingProductLineId, setEditingProductLineId] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [pickScheduleDate, setPickScheduleDate] = useState('');
  const [showIbrInTransitModal, setShowIbrInTransitModal] = useState(false);
  const [showIbrDeliveryModal, setShowIbrDeliveryModal] = useState(false);
  /** False when DB has no `quantity_shipped` / `quantity_delivered` columns (migration not applied). */
  const [ibrShipmentTrackingAvailable, setIbrShipmentTrackingAvailable] = useState<boolean | null>(null);
  const [deliveryProofs, setDeliveryProofs] = useState<IbrDeliveryProofRow[]>([]);
  const [ibrLogs, setIbrLogs] = useState<IbrLogRow[]>([]);

  const loadRefs = useCallback(async () => {
    const { data: br } = await supabase.from('branches').select('id, name').eq('is_active', true).order('name');
    setBranches(br ?? []);
  }, []);

  useEffect(() => {
    if (!branch) {
      setResolvedBranchId(null);
      return;
    }
    void (async () => {
      const { data } = await supabase.from('branches').select('id').eq('name', branch).single();
      setResolvedBranchId(data?.id ?? null);
    })();
  }, [branch]);

  const alreadyAddedMaterialIds = useMemo(
    () => items.filter((i) => i.line_kind === 'raw_material' && i.raw_material_id).map((i) => i.raw_material_id!),
    [items],
  );
  const materialLines = useMemo(() => items.filter((i) => i.line_kind === 'raw_material'), [items]);
  const productLines = useMemo(() => items.filter((i) => i.line_kind === 'product'), [items]);

  const hasRemainingToShip = useMemo(
    () => items.some((i) => (Number(i.quantity) || 0) > (Number(i.quantity_shipped) || 0)),
    [items],
  );
  const hasPendingReceive = useMemo(
    () => items.some((i) => (Number(i.quantity_shipped) || 0) > (Number(i.quantity_delivered) || 0)),
    [items],
  );
  const ibrInTransitModalLines = useMemo(() => {
    return items.map((i) => {
      if (i.line_kind === 'raw_material') {
        const meta = i.raw_material_id ? rawMaterialById[i.raw_material_id] : null;
        return {
          id: i.id,
          line_kind: 'raw_material' as const,
          title: meta?.name ?? i.mat_label ?? 'Raw material',
          subtitle: meta?.sku ? `SKU ${meta.sku}` : '',
          unitLabel: (meta?.unit_of_measure && String(meta.unit_of_measure).trim()) || 'unit',
          quantity: Number(i.quantity) || 0,
          quantity_shipped: Number(i.quantity_shipped) || 0,
          quantity_delivered: Number(i.quantity_delivered) || 0,
          hasInventoryLink: Boolean(i.raw_material_id),
        };
      }
      return {
        id: i.id,
        line_kind: 'product' as const,
        title: i.prod_label ?? 'Product',
        subtitle: '',
        unitLabel: 'units',
        quantity: Number(i.quantity) || 0,
        quantity_shipped: Number(i.quantity_shipped) || 0,
        quantity_delivered: Number(i.quantity_delivered) || 0,
        hasInventoryLink: Boolean(i.product_variant_id),
      };
    });
  }, [items, rawMaterialById]);
  const excludeProductVariantIds = useMemo(() => {
    const s = new Set(
      items.filter((i) => i.line_kind === 'product' && i.product_variant_id).map((i) => i.product_variant_id!),
    );
    if (editingProductLineId) {
      const line = items.find((i) => i.id === editingProductLineId);
      if (line?.product_variant_id) s.delete(line.product_variant_id);
    }
    return s;
  }, [items, editingProductLineId]);

  const productModalInitial = useMemo((): OrderProductInitialEdit | null => {
    if (!editingProductLineId) return null;
    const line = items.find((i) => i.id === editingProductLineId && i.line_kind === 'product');
    if (!line?.product_id || !line?.product_variant_id) return null;
    return {
      productId: line.product_id,
      variantId: line.product_variant_id,
      quantity: Math.max(1, Math.floor(Number(line.quantity) || 1)),
    };
  }, [editingProductLineId, items]);

  const materialSubtotal = useMemo(() => {
    let s = 0;
    for (const line of materialLines) {
      const mid = line.raw_material_id;
      if (!mid) continue;
      const m = rawMaterialById[mid];
      if (!m) continue;
      s += (Number(line.quantity) || 0) * (Number(m.cost_per_unit) || 0);
    }
    return s;
  }, [materialLines, rawMaterialById]);

  const fulfillingBranchName = useMemo(
    () => branches.find((b) => b.id === fulfillingId)?.name ?? 'Fulfilling branch',
    [branches, fulfillingId],
  );

  const ibrProductPickLock = useRef(false);
  /** Prevents mass-click on raw material Add / Apply while async validation runs. */
  const ibrMaterialLineLockRef = useRef(false);

  useEffect(() => {
    const reqId = ibr?.requesting_branch_id;
    const fulId = fulfillingId;
    if (!reqId || !fulId) {
      setMaterialStockById({});
      return;
    }
    const fromLines = materialLines.map((l) => l.raw_material_id).filter(Boolean) as string[];
    const mids = [...new Set([...fromLines, draftRaw?.materialId].filter(Boolean) as string[])];
    if (mids.length === 0) {
      setMaterialStockById({});
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from('material_stock')
        .select('material_id, branch_id, quantity')
        .in('material_id', mids)
        .in('branch_id', [reqId, fulId]);
      if (error) {
        console.warn('[IBR] material_stock fetch', error);
        return;
      }
      const next: Record<string, { requesting: number; fulfilling: number }> = {};
      for (const id of mids) {
        next[id] = { requesting: 0, fulfilling: 0 };
      }
      for (const row of data ?? []) {
        const r = row as { material_id: string; branch_id: string; quantity: string | number };
        const id = r.material_id;
        if (!next[id]) next[id] = { requesting: 0, fulfilling: 0 };
        const q = Number(r.quantity) || 0;
        if (r.branch_id === reqId) next[id].requesting = q;
        if (r.branch_id === fulId) next[id].fulfilling = q;
      }
      setMaterialStockById(next);
    })();
  }, [ibr?.requesting_branch_id, fulfillingId, materialLines, draftRaw?.materialId]);

  useEffect(() => {
    const reqId = ibr?.requesting_branch_id;
    const fulId = fulfillingId;
    if (!reqId || !fulId) {
      setProductVariantStockById({});
      return;
    }
    const vids = [...new Set(productLines.map((l) => l.product_variant_id).filter(Boolean) as string[])];
    if (vids.length === 0) {
      setProductVariantStockById({});
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from('product_variant_stock')
        .select('variant_id, branch_id, quantity')
        .in('variant_id', vids)
        .in('branch_id', [reqId, fulId]);
      if (error) {
        if (import.meta.env.DEV) console.warn('[IBR] product_variant_stock fetch', error);
        return;
      }
      const next: Record<string, { requesting: number; fulfilling: number }> = {};
      for (const id of vids) {
        next[id] = { requesting: 0, fulfilling: 0 };
      }
      for (const row of data ?? []) {
        const r = row as { variant_id: string; branch_id: string; quantity: string | number };
        const vid = r.variant_id;
        if (!next[vid]) next[vid] = { requesting: 0, fulfilling: 0 };
        const q = Number(r.quantity) || 0;
        if (r.branch_id === reqId) next[vid].requesting = q;
        if (r.branch_id === fulId) next[vid].fulfilling = q;
      }
      setProductVariantStockById(next);
    })();
  }, [ibr?.requesting_branch_id, fulfillingId, productLines]);

  useEffect(() => {
    const cur = fulfillingId;
    const prev = lastFulfillingId.current;
    if (prev !== '' && cur !== '' && prev !== cur) {
      setDraftRaw(null);
      setEditingMaterialLineId(null);
      setEditingProductLineId(null);
      setEditMatQty('1');
      setEditMatUom('');
      setEditMatReceived('0');
    }
    lastFulfillingId.current = cur;
  }, [fulfillingId]);

  const loadRequest = useCallback(async (requestId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: q0 } = await supabase
        .from('inter_branch_requests')
        .select(
          'ibr_number, status, notes, created_by, created_at, submitted_at, approved_by, approved_at, rejected_by, rejection_reason, linked_purchase_order_id, linked_production_request_id, scheduled_departure_date, requesting_branch_id, fulfilling_branch_id, req_br:branches!requesting_branch_id(name), ful_br:branches!fulfilling_branch_id(name)',
        )
        .eq('id', requestId)
        .single();
      if (q0) throw q0;
      if (!data) {
        setError('Not found');
        setIbr(null);
        return;
      }
      const header = data as any;
      const { rows: base, supportsShipmentTracking } = await fetchInterBranchRequestItemRows(supabase, requestId);
      const rawIds = base.map((b) => b.raw_material_id).filter(Boolean) as string[];
      let meta: Record<string, RawMaterialMeta> = {};
      if (rawIds.length) {
        const { data: mats } = await supabase
          .from('raw_materials')
          .select('id, name, sku, unit_of_measure, cost_per_unit, image_url')
          .in('id', rawIds);
        for (const m of mats ?? []) {
          const row = m as RawMaterialMeta & { id: string };
          meta[row.id] = {
            name: row.name,
            sku: row.sku,
            unit_of_measure: row.unit_of_measure,
            cost_per_unit: Number(row.cost_per_unit) || 0,
            image_url: row.image_url,
          };
        }
      }
      setRawMaterialById(meta);
      const mBy = new Map(Object.entries(meta).map(([id, v]) => [id, v.name]));
      const varIds = base.map((b) => b.product_variant_id).filter(Boolean) as string[];
      const { data: vrows } = varIds.length
        ? await supabase
            .from('product_variants')
            .select('id, sku, size, product_id, products!inner(name, specifications)')
            .in('id', varIds)
        : { data: [] as { id: string; sku: string; size: string; products: { name: string; specifications?: unknown } }[] };
      const vBy = new Map(
        (vrows ?? []).map((v: { id: string; sku: string; size: string; products: { name: string; specifications?: unknown } | { name: string; specifications?: unknown }[] }) => {
          const p = Array.isArray(v.products) ? v.products[0] : v.products;
          const label = ibrProductLineLabel(p?.name ?? '', v.sku, v.size, p?.specifications);
          return [v.id, label] as const;
        }),
      );
      setItems(
        base.map((r) => ({
          ...r,
          mat_label: r.raw_material_id ? mBy.get(r.raw_material_id) : undefined,
          prod_label: r.product_variant_id ? vBy.get(r.product_variant_id) : undefined,
        })),
      );
      setIbr(header);
      setFulfillingId(header.fulfilling_branch_id);
      setNotes(header.notes ?? '');
      setIbrShipmentTrackingAvailable(supportsShipmentTracking);

      const [logsRes, proofsRes] = await Promise.all([
        supabase
          .from('inter_branch_request_logs')
          .select('id, action, performed_by, performed_by_role, description, created_at, old_value, new_value, metadata')
          .eq('inter_branch_request_id', requestId)
          .order('created_at', { ascending: false }),
        supabase
          .from('inter_branch_delivery_proofs')
          .select('id, file_url, file_name, created_at, uploaded_by')
          .eq('inter_branch_request_id', requestId)
          .order('created_at', { ascending: false }),
      ]);
      if (!logsRes.error) {
        const rawLogs = (logsRes.data ?? []) as IbrLogRow[];
        setIbrLogs(
          rawLogs.map((row) => ({
            ...row,
            old_value: row.old_value ?? null,
            new_value: row.new_value ?? null,
            metadata: row.metadata ?? null,
          })),
        );
      } else setIbrLogs([]);
      if (!proofsRes.error) setDeliveryProofs((proofsRes.data ?? []) as IbrDeliveryProofRow[]);
      else setDeliveryProofs([]);
    } catch (e: unknown) {
      setIbrShipmentTrackingAvailable(null);
      setIbrLogs([]);
      setDeliveryProofs([]);
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const insertIbrLog = useCallback(
    async (
      action: string,
      description: string,
      oldValue?: object | null,
      newValue?: object | null,
      metadata?: object | null,
      requestIdOverride?: string | null,
    ) => {
      const rid = requestIdOverride ?? id;
      if (!rid) return;
      const actorName = employeeName || session?.user?.email || 'User';
      const { error } = await supabase.from('inter_branch_request_logs').insert({
        inter_branch_request_id: rid,
        action,
        performed_by: actorName,
        performed_by_role: logRoleMap[role ?? ''] ?? role ?? 'System',
        description,
        old_value: oldValue ?? null,
        new_value: newValue ?? null,
        metadata: metadata ?? null,
      });
      if (error) {
        if (import.meta.env.DEV) console.warn('[insertIbrLog]', error.message);
        return;
      }
      const { data } = await supabase
        .from('inter_branch_request_logs')
        .select('id, action, performed_by, performed_by_role, description, created_at, old_value, new_value, metadata')
        .eq('inter_branch_request_id', rid)
        .order('created_at', { ascending: false });
      const rawLogs = (data ?? []) as IbrLogRow[];
      setIbrLogs(
        rawLogs.map((row) => ({
          ...row,
          old_value: row.old_value ?? null,
          new_value: row.new_value ?? null,
          metadata: row.metadata ?? null,
        })),
      );
    },
    [id, role, employeeName, session?.user?.email],
  );

  // Create new draft
  useEffect(() => {
    if (routeId !== 'new' || createdRef.current) return;
    createdRef.current = true;
    (async () => {
      setLoading(true);
      try {
        const actor = employeeName || session?.user?.email || 'User';
        const { data: me } = branch
          ? await supabase.from('branches').select('id').eq('name', branch).single()
          : { data: null };
        if (!me?.id) {
          setError('Select a branch in the header first');
          setLoading(false);
          return;
        }
        const { data: all } = await supabase.from('branches').select('id, name').eq('is_active', true);
        const other = (all ?? []).find((b) => b.id !== me.id) ?? (all ?? [])[1];
        if (!other) {
          setError('Need at least two active branches to create a request');
          setLoading(false);
          return;
        }
        const ibrN = `IBR-${Date.now()}`;
        const { data: ins, error: insE } = await supabase
          .from('inter_branch_requests')
          .insert({
            ibr_number: ibrN,
            requesting_branch_id: me.id,
            fulfilling_branch_id: other.id,
            status: 'Draft',
            notes: null,
            created_by: actor,
          })
          .select('id')
          .single();
        if (insE) throw insE;
        const newId = ins!.id as string;
        const { error: logE } = await supabase.from('inter_branch_request_logs').insert({
          inter_branch_request_id: newId,
          action: 'created',
          performed_by: actor,
          performed_by_role: logRoleMap[role ?? ''] ?? role ?? 'System',
          description: `Inter-branch request ${ibrN} created (Draft).`,
          old_value: null,
          new_value: {
            ibr_number: ibrN,
            status: 'Draft',
            requesting_branch_id: me.id,
            fulfilling_branch_id: other.id,
          },
          metadata: {
            requesting_branch_name: branch ?? null,
            fulfilling_branch_name: other.name,
          },
        });
        if (logE && import.meta.env.DEV) console.warn('[IBR create log]', logE);
        await loadRefs();
        navigate(`/inter-branch-requests/${newId}`, { replace: true });
        setLoading(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not create request');
        setLoading(false);
      }
    })();
  }, [routeId, branch, employeeName, session, role, navigate, loadRefs, loadRequest]);

  useEffect(() => {
    if (routeId === 'new' || !routeId) return;
    setId(routeId);
    void (async () => {
      await loadRefs();
      await loadRequest(routeId);
    })();
  }, [routeId, loadRequest, loadRefs]);

  const buildIbrItemRows = (): InterBranchItemRow[] => {
    if (!id) return [];
    return items.map((i) => ({
      id: i.id,
      request_id: id,
      line_kind: i.line_kind,
      raw_material_id: i.raw_material_id,
      product_id: i.product_id,
      product_variant_id: i.product_variant_id,
      quantity: i.quantity,
      quantity_shipped: Number(i.quantity_shipped) || 0,
      quantity_delivered: Number(i.quantity_delivered) || 0,
    }));
  };

  /** Order-style: persist header + lines for any status (inventory from logistics is separate). */
  const saveIbrChanges = async () => {
    if (!id || !ibr) return;
    if (!isEditing) return;
    setSaving(true);
    try {
      for (const line of items) {
        if ((Number(line.quantity) || 0) < (Number(line.quantity_shipped) || 0)) {
          throw new Error('Requested quantity on a line cannot be less than the amount already shipped.');
        }
      }
      const nextStatus = (editStatus ?? ibr.status) as IBRStatus;
      if (items.length > 0) {
        await assertAllInterBranchItemsInBothBranches(
          supabase,
          buildIbrItemRows(),
          ibr.requesting_branch_id,
          fulfillingId,
        );
      }

      const { rows: serverBeforeRows } = await fetchInterBranchRequestItemRows(supabase, id);
      const prevPo = ibr.linked_purchase_order_id;
      const prevPr = ibr.linked_production_request_id;

      const beforeSnaps = serverBeforeRows.map((r) => {
        const local = items.find((x) => x.id === r.id);
        return snapFromServerRow(r, local?.mat_label ?? local?.prod_label);
      });
      const afterSnaps = items.map(snapFromUiLine);
      const lineDiff = diffIbrLineSnaps(beforeSnaps, afterSnaps);

      const fulfillingNameOld =
        ibr.ful_br?.name ?? branches.find((b) => b.id === ibr.fulfilling_branch_id)?.name ?? null;
      const fulfillingNameNew = branches.find((b) => b.id === fulfillingId)?.name ?? fulfillingNameOld;

      const oldHeader = {
        status: ibr.status,
        fulfilling_branch_id: ibr.fulfilling_branch_id,
        fulfilling_branch_name: fulfillingNameOld,
        notes: ibr.notes,
      };
      const newHeader = {
        status: nextStatus,
        fulfilling_branch_id: fulfillingId,
        fulfilling_branch_name: fulfillingNameNew,
        notes: notes || null,
      };

      const now = new Date().toISOString();
      const updatePayload: {
        status: IBRStatus;
        fulfilling_branch_id: string;
        notes: string | null;
        updated_at: string;
        submitted_at?: string;
      } = {
        status: nextStatus,
        fulfilling_branch_id: fulfillingId,
        notes: notes || null,
        updated_at: now,
      };
      if (ibr.status === 'Draft' && nextStatus === 'Pending' && !ibr.submitted_at) {
        updatePayload.submitted_at = now;
      }
      const { error: e0 } = await supabase.from('inter_branch_requests').update(updatePayload).eq('id', id);
      if (e0) throw e0;

      const trackShipmentCols = ibrShipmentTrackingAvailable === true;

      const { data: serverRows, error: eList } = await supabase
        .from('inter_branch_request_items')
        .select('id')
        .eq('request_id', id);
      if (eList) throw eList;
      const localIdSet = new Set(items.map((i) => i.id));
      for (const r of serverRows ?? []) {
        const sid = (r as { id: string }).id;
        if (!localIdSet.has(sid)) {
          const { error: dErr } = await supabase.from('inter_branch_request_items').delete().eq('id', sid);
          if (dErr) throw dErr;
        }
      }
      for (const line of items) {
        if (isLocalIbrItemId(line.id)) {
          const { error: iErr } = await supabase.from('inter_branch_request_items').insert({
            request_id: id,
            line_kind: line.line_kind,
            raw_material_id: line.line_kind === 'raw_material' ? line.raw_material_id : null,
            product_id: line.line_kind === 'product' ? line.product_id : null,
            product_variant_id: line.line_kind === 'product' ? line.product_variant_id : null,
            quantity: line.quantity,
            ...(trackShipmentCols
              ? {
                  quantity_shipped: line.quantity_shipped ?? 0,
                  quantity_delivered: line.quantity_delivered ?? 0,
                }
              : {}),
          });
          if (iErr) throw iErr;
        } else {
          const { error: uErr } = await supabase
            .from('inter_branch_request_items')
            .update(
              line.line_kind === 'raw_material'
                ? {
                    line_kind: 'raw_material' as const,
                    raw_material_id: line.raw_material_id,
                    product_id: null,
                    product_variant_id: null,
                    quantity: line.quantity,
                    ...(trackShipmentCols
                      ? {
                          quantity_shipped: line.quantity_shipped ?? 0,
                          quantity_delivered: line.quantity_delivered ?? 0,
                        }
                      : {}),
                  }
                : {
                    line_kind: 'product' as const,
                    raw_material_id: null,
                    product_id: line.product_id,
                    product_variant_id: line.product_variant_id,
                    quantity: line.quantity,
                    ...(trackShipmentCols
                      ? {
                          quantity_shipped: line.quantity_shipped ?? 0,
                          quantity_delivered: line.quantity_delivered ?? 0,
                        }
                      : {}),
                  },
            )
            .eq('id', line.id);
          if (uErr) throw uErr;
        }
      }

      const actor = employeeName || session?.user?.email || 'User';
      const { poId, prId } = await ensureInterBranchLinkedDocuments(supabase, { requestId: id, actor });
      const linkChanged = poId !== prevPo || prId !== prevPr;
      const logMetadata: Record<string, unknown> = {
        lines: {
          added: lineDiff.added,
          removed: lineDiff.removed,
          changed: lineDiff.changed,
        },
      };
      if (linkChanged) {
        logMetadata.linked_documents = {
          before: { linked_purchase_order_id: prevPo, linked_production_request_id: prevPr },
          after: { linked_purchase_order_id: poId, linked_production_request_id: prId },
        };
      }
      const descParts: string[] = ['Saved changes'];
      if (ibr.status !== nextStatus) descParts.push(`status ${ibr.status} → ${nextStatus}`);
      if (ibr.fulfilling_branch_id !== fulfillingId) descParts.push('fulfilling branch updated');
      if ((ibr.notes ?? '') !== (notes || '')) descParts.push('notes updated');
      const lineSummary = summarizeIbrLineDiffMeta({ lines: lineDiff } as Record<string, unknown>);
      if (lineSummary) descParts.push(lineSummary);
      if (linkChanged) descParts.push('linked PO/PR updated');
      await insertIbrLog('updated', `${descParts.join('. ')}.`, oldHeader, newHeader, logMetadata);

      setIsEditing(false);
      setEditStatus(null);
      await loadRequest(id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRawMaterialPicked = (m: RawPickPayload) => {
    if (!id || !ibr || !isEditing) return;
    setShowRawPicker(false);
    if (items.some((i) => i.line_kind === 'raw_material' && i.raw_material_id === m.materialId)) {
      alert('This material is already on the request. Remove the line first to change the quantity.');
      return;
    }
    setDraftRaw(m);
    setEditingMaterialLineId('new');
    setEditMatQty('1');
    setEditMatUom(m.unit);
    setEditMatReceived('0');
  };

  const openEditMaterialLine = (lineId: string) => {
    const it = materialLines.find((l) => l.id === lineId);
    if (!it?.raw_material_id) return;
    const meta = rawMaterialById[it.raw_material_id];
    setEditingMaterialLineId(lineId);
    setDraftRaw(null);
    setEditMatQty(String(it.quantity));
    setEditMatUom(meta?.unit_of_measure ?? '');
    setEditMatReceived('0');
  };

  const cancelMaterialEdit = () => {
    setEditingMaterialLineId(null);
    setDraftRaw(null);
  };

  const confirmAddRawLine = async () => {
    if (!id || !ibr || !draftRaw || !isEditing) return;
    if (ibrMaterialLineLockRef.current) return;
    const q = parseFloat(editMatQty);
    if (Number.isNaN(q) || q <= 0) {
      alert('Enter a valid quantity');
      return;
    }
    ibrMaterialLineLockRef.current = true;
    setSaving(true);
    try {
      await assertMaterialStockAtBothBranches(supabase, draftRaw.materialId, ibr.requesting_branch_id, fulfillingId);
      setRawMaterialById((prev) => ({
        ...prev,
        [draftRaw.materialId]: {
          name: draftRaw.name,
          sku: draftRaw.sku,
          unit_of_measure: editMatUom || draftRaw.unit,
          cost_per_unit: Number(draftRaw.cost) || 0,
          image_url: draftRaw.imageUrl,
        },
      }));
      setItems((prev) => [
        ...prev,
        {
          id: newLocalIbrItemId(),
          line_kind: 'raw_material' as const,
          raw_material_id: draftRaw.materialId,
          product_id: null,
          product_variant_id: null,
          quantity: q,
          quantity_shipped: 0,
          quantity_delivered: 0,
          mat_label: draftRaw.name,
        },
      ]);
      setDraftRaw(null);
      setEditingMaterialLineId(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to add line');
    } finally {
      ibrMaterialLineLockRef.current = false;
      setSaving(false);
    }
  };

  const saveExistingMaterialLine = async (lineId: string) => {
    if (!id || !ibr || !isEditing) return;
    if (ibrMaterialLineLockRef.current) return;
    const q = parseFloat(editMatQty);
    if (Number.isNaN(q) || q <= 0) {
      alert('Enter a valid quantity');
      return;
    }
    const line = materialLines.find((l) => l.id === lineId);
    if (!line?.raw_material_id) return;
    const ship = Number(line.quantity_shipped) || 0;
    if (q < ship) {
      alert(`Quantity cannot be less than already shipped (${ship}).`);
      return;
    }
    ibrMaterialLineLockRef.current = true;
    setSaving(true);
    try {
      await assertMaterialStockAtBothBranches(supabase, line.raw_material_id, ibr.requesting_branch_id, fulfillingId);
      setItems((prev) => prev.map((row) => (row.id === lineId ? { ...row, quantity: q } : row)));
      setEditingMaterialLineId(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update line');
    } finally {
      ibrMaterialLineLockRef.current = false;
      setSaving(false);
    }
  };

  const handleProductLinePicked = async (p: OrderProductSelectionConfirm) => {
    if (!id || !ibr || !isEditing) return;
    if (ibrProductPickLock.current) return;
    ibrProductPickLock.current = true;
    setSaving(true);
    try {
      const duplicateOtherLine = items.some(
        (i) =>
          i.line_kind === 'product' &&
          i.product_variant_id === p.variantId &&
          i.id !== editingProductLineId,
      );
      if (duplicateOtherLine) {
        alert('This variant is already on the request. Remove the existing line first if you need to change it.');
        return;
      }
      await assertVariantStockAtBothBranches(supabase, p.variantId, ibr.requesting_branch_id, fulfillingId);
      const { data: prodRow } = await supabase.from('products').select('specifications').eq('id', p.productId).maybeSingle();
      const label = ibrProductLineLabel(p.productName, p.sku, p.variantSizeLabel, prodRow?.specifications);
      if (editingProductLineId) {
        const existing = items.find((r) => r.id === editingProductLineId);
        const ship = Number(existing?.quantity_shipped) || 0;
        if (p.quantity < ship) {
          alert(`Quantity cannot be less than already shipped (${ship}).`);
          return;
        }
        setItems((prev) =>
          prev.map((row) =>
            row.id === editingProductLineId
              ? {
                  ...row,
                  product_id: p.productId,
                  product_variant_id: p.variantId,
                  quantity: p.quantity,
                  prod_label: label,
                }
              : row,
          ),
        );
      } else {
        setItems((prev) => [
          ...prev,
          {
            id: newLocalIbrItemId(),
            line_kind: 'product' as const,
            raw_material_id: null,
            product_id: p.productId,
            product_variant_id: p.variantId,
            quantity: p.quantity,
            quantity_shipped: 0,
            quantity_delivered: 0,
            prod_label: label,
          },
        ]);
      }
      setShowProductPicker(false);
      setEditingProductLineId(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to save line');
    } finally {
      ibrProductPickLock.current = false;
      setSaving(false);
    }
  };

  const removeLine = (lineId: string) => {
    if (!id || !ibr || !isEditing) return;
    setItems((prev) => prev.filter((row) => row.id !== lineId));
    if (editingProductLineId === lineId) {
      setEditingProductLineId(null);
      setShowProductPicker(false);
    }
    if (editingMaterialLineId === lineId) {
      setEditingMaterialLineId(null);
    }
  };

  const submit = async () => {
    if (!id || !ibr) return;
    if (ibr.status !== 'Draft') return;
    if (items.length === 0) {
      alert('Add at least one line before submitting');
      return;
    }
    setSaving(true);
    try {
      await assertAllInterBranchItemsInBothBranches(
        supabase,
        buildIbrItemRows(),
        ibr.requesting_branch_id,
        fulfillingId,
      );
      const { error: e0 } = await supabase
        .from('inter_branch_requests')
        .update({
          fulfilling_branch_id: fulfillingId,
          notes: notes || null,
          status: 'Pending',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (e0) throw e0;
      await insertIbrLog(
        'submitted',
        'Submitted for approval (Draft → Pending)',
        {
          status: 'Draft',
          fulfilling_branch_id: ibr.fulfilling_branch_id,
          fulfilling_branch_name:
            ibr.ful_br?.name ?? branches.find((b) => b.id === ibr.fulfilling_branch_id)?.name ?? null,
          notes: ibr.notes,
        },
        {
          status: 'Pending',
          fulfilling_branch_id: fulfillingId,
          fulfilling_branch_name: branches.find((b) => b.id === fulfillingId)?.name ?? null,
          notes: notes || null,
        },
        { line_count: items.length },
      );
      const actor = employeeName || session?.user?.email || 'User';
      await ensureInterBranchLinkedDocuments(supabase, { requestId: id, actor });
      await loadRequest(id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  const doApprove = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const name = employeeName || session?.user?.email || 'User';
      await approveInterBranchRequest(supabase, { requestId: id, approvedBy: name });
      await insertIbrLog(
        'approved',
        `Inter-branch request approved by ${name}.`,
        { status: 'Pending' },
        { status: 'Approved', approved_by: name },
      );
      await loadRequest(id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setSaving(false);
    }
  };

  const doReject = async () => {
    if (!id || !ibr) return;
    const reason = window.prompt('Reason for rejection?');
    if (reason == null) return;
    setSaving(true);
    try {
      const name = employeeName || session?.user?.email || 'User';
      const prevStatus = ibr.status;
      const { error: e0 } = await supabase
        .from('inter_branch_requests')
        .update({
          status: 'Rejected',
          rejected_by: name,
          rejection_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (e0) throw e0;
      await insertIbrLog(
        'rejected',
        `Rejected${reason ? `: ${reason}` : ''}`,
        { status: prevStatus },
        { status: 'Rejected', rejected_by: name },
        reason ? { reason } : null,
      );
      await loadRequest(id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setSaving(false);
    }
  };

  const advanceIbrLogistics = async (
    next: IBRStatus,
    extra?: { scheduled_departure_date?: string | null },
  ) => {
    if (!id || !ibr) return;
    const prev = ibr.status;
    setLogisticsLoading(true);
    try {
      const updatePayload: Record<string, unknown> = {
        status: next,
        updated_at: new Date().toISOString(),
      };
      if (extra?.scheduled_departure_date !== undefined) {
        updatePayload.scheduled_departure_date = extra.scheduled_departure_date;
      }
      const { error: e0 } = await supabase.from('inter_branch_requests').update(updatePayload).eq('id', id);
      if (e0) throw e0;
      await insertIbrLog(
        'status_changed',
        `Logistics: ${prev} → ${next}${extra?.scheduled_departure_date ? ` (planned departure ${extra.scheduled_departure_date})` : ''}.`,
        { status: prev },
        { status: next, scheduled_departure_date: extra?.scheduled_departure_date ?? undefined },
      );
      await loadRequest(id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setLogisticsLoading(false);
    }
  };

  const handleConfirmIbrInTransit = async (shipRows: { itemId: string; shippedQuantity: number }[]) => {
    if (!id || !ibr) return;
    if (ibrShipmentTrackingAvailable !== true) {
      alert(
        'Mark in transit requires shipment columns on inter-branch lines. Run database/inter_branch_item_shipment_quantities.sql in the Supabase SQL editor, then refresh this page.',
      );
      return;
    }
    const shipQuantitiesByItemId = Object.fromEntries(shipRows.map((r) => [r.itemId, r.shippedQuantity]));
    const anyShipThisEvent = Object.values(shipQuantitiesByItemId).some((q) => (Number(q) || 0) > 0);
    setLogisticsLoading(true);
    try {
      const performedBy = employeeName || session?.user?.email || 'User';
      if (anyShipThisEvent) {
        await applyIbrShipStock(supabase, {
          fulfillingBranchId: ibr.fulfilling_branch_id,
          requestId: id,
          ibrNumber: ibr.ibr_number,
          items: buildIbrItemRows(),
          shipQuantitiesByItemId,
          performedBy,
        });
      }
      const { error: e0 } = await supabase
        .from('inter_branch_requests')
        .update({
          status: 'In Transit',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (e0) throw e0;
      const shipParts = shipRows
        .filter((r) => (Number(r.shippedQuantity) || 0) > 0)
        .map((r) => {
          const line = items.find((i) => i.id === r.itemId);
          const label = line?.mat_label ?? line?.prod_label ?? r.itemId;
          return `${label}: ${r.shippedQuantity}`;
        });
      const shipmentLines = shipRows
        .filter((r) => (Number(r.shippedQuantity) || 0) > 0)
        .map((r) => {
          const line = items.find((i) => i.id === r.itemId);
          const label = line?.mat_label ?? line?.prod_label ?? 'Item';
          const unit =
            line?.line_kind === 'raw_material' && line.raw_material_id
              ? rawMaterialById[line.raw_material_id]?.unit_of_measure?.trim() || 'unit'
              : 'units';
          return {
            label,
            quantity: Number(r.shippedQuantity) || 0,
            unit,
          };
        });
      await insertIbrLog(
        'in_transit',
        anyShipThisEvent
          ? 'Shipment recorded and status set to In Transit.'
          : 'Set to In Transit (lines already fully marked shipped).',
        { status: ibr.status },
        { status: 'In Transit' },
        { shipQuantitiesByItemId, ...(shipmentLines.length ? { shipment_lines: shipmentLines } : {}) },
      );
      setShowIbrInTransitModal(false);
      await loadRequest(id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setLogisticsLoading(false);
    }
  };

  const handleConfirmIbrDelivery = async (
    fulfillmentData: FulfillmentData[],
    proofImageUrls: string[] = [],
  ) => {
    if (!id || !ibr) return;
    if (ibrShipmentTrackingAvailable !== true) {
      alert(
        'Receiving requires shipment columns on inter-branch lines. Run database/inter_branch_item_shipment_quantities.sql in the Supabase SQL editor, then refresh this page.',
      );
      return;
    }
    const recvRows = fulfillmentData.map((f) => ({
      itemId: f.itemId,
      receivedQuantity: f.deliveredQuantity,
    }));
    const receiveQuantitiesByItemId = Object.fromEntries(recvRows.map((r) => [r.itemId, r.receivedQuantity]));
    const anyRecv = Object.values(receiveQuantitiesByItemId).some((q) => (Number(q) || 0) > 0);
    if (!anyRecv && proofImageUrls.length === 0) return;

    setLogisticsLoading(true);
    try {
      const performedBy = employeeName || session?.user?.email || 'User';
      const itemRows = buildIbrItemRows();
      if (anyRecv) {
        await applyIbrReceiveStock(supabase, {
          requestingBranchId: ibr.requesting_branch_id,
          requestId: id,
          ibrNumber: ibr.ibr_number,
          items: itemRows,
          receiveQuantitiesByItemId,
          performedBy,
        });
      }

      if (anyRecv) {
        const isComplete = itemRows.every(
          (r) => (Number(r.quantity_delivered) || 0) >= (Number(r.quantity) || 0) - 1e-9,
        );
        const newStatus: IBRStatus = isComplete ? 'Delivered' : 'Partially Fulfilled';
        const { error: e0 } = await supabase
          .from('inter_branch_requests')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (e0) throw e0;

        const receivedLines = recvRows
          .filter((r) => (Number(r.receivedQuantity) || 0) > 0)
          .map((r) => {
            const line = items.find((i) => i.id === r.itemId);
            const label = line?.mat_label ?? line?.prod_label ?? 'Item';
            const unit =
              line?.line_kind === 'raw_material' && line.raw_material_id
                ? rawMaterialById[line.raw_material_id]?.unit_of_measure?.trim() || 'unit'
                : 'units';
            return {
              label,
              quantity: Number(r.receivedQuantity) || 0,
              unit,
            };
          });
        await insertIbrLog(
          'delivery_recorded',
          `Recorded delivery at requesting branch → ${newStatus}.`,
          { status: ibr.status },
          { status: newStatus },
          {
            receiveQuantitiesByItemId,
            ...(receivedLines.length ? { received_lines: receivedLines } : {}),
          },
        );
      }

      if (proofImageUrls.length > 0) {
        for (let i = 0; i < proofImageUrls.length; i++) {
          const url = proofImageUrls[i]!;
          const raw = url.split('/').pop()?.split('?')[0] ?? `delivery-proof-${i}`;
          let fileName = raw;
          try {
            fileName = decodeURIComponent(raw);
          } catch {
            fileName = raw;
          }
          const { error: pe } = await supabase.from('inter_branch_delivery_proofs').insert({
            inter_branch_request_id: id,
            file_url: url,
            file_name: fileName,
            uploaded_by: performedBy,
          });
          if (pe) throw pe;
        }
        const names = proofImageUrls
          .map((u, i) => {
            const raw = u.split('/').pop()?.split('?')[0] ?? `image-${i}`;
            try {
              return decodeURIComponent(raw);
            } catch {
              return raw;
            }
          })
          .join(', ');
        await insertIbrLog(
          'proof_uploaded',
          `Proof of delivery: ${proofImageUrls.length} image(s) — ${names}`,
          null,
          null,
          { count: proofImageUrls.length, fileNames: names, source: 'image_gallery' },
        );
      }

      setShowIbrDeliveryModal(false);
      await loadRequest(id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setLogisticsLoading(false);
    }
  };

  const openScheduleDepartureModal = () => {
    if (!ibr) return;
    const d =
      (ibr.scheduled_departure_date ? String(ibr.scheduled_departure_date).slice(0, 10) : '') ||
      new Date().toISOString().slice(0, 10);
    setPickScheduleDate(d);
    setShowScheduleModal(true);
  };

  const confirmScheduleDeparture = async () => {
    if (!pickScheduleDate) {
      alert('Choose a date.');
      return;
    }
    await advanceIbrLogistics('Scheduled', { scheduled_departure_date: pickScheduleDate });
    setShowScheduleModal(false);
  };

  const markIbrFulfilledAfterDelivery = async () => {
    if (!id) return;
    if (ibr?.status !== 'Delivered') return;
    if (!window.confirm('Mark this inter-branch request as fully fulfilled and closed?')) return;
    setLogisticsLoading(true);
    try {
      const name = employeeName || session?.user?.email || 'User';
      const { error: e0 } = await supabase
        .from('inter_branch_requests')
        .update({
          status: 'Fulfilled' as IBRStatus,
          fulfilled_by: name,
          fulfilled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (e0) throw e0;
      await insertIbrLog(
        'fulfilled',
        `Marked fulfilled and closed by ${name}.`,
        { status: 'Delivered' },
        { status: 'Fulfilled', fulfilled_by: name },
      );
      await loadRequest(id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setLogisticsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditStatus(null);
    if (id) void loadRequest(id);
  };

  const handleEdit = () => {
    if (!ibr) return;
    setIsEditing(true);
    setEditStatus(ibr.status);
  };

  if (loading && !ibr && routeId === 'new') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-500">Creating inter-branch request…</p>
        </div>
      </div>
    );
  }
  if (error && !ibr) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-1">Failed to load inter-branch request</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const rid = id ?? routeId;
                if (rid && rid !== 'new') void loadRequest(rid);
              }}
              className="gap-2 w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate('/inter-branch-requests')} className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4" />
              Back to list
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (!ibr || !id) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading inter-branch request…</p>
        </div>
      </div>
    );
  }

  const draft = ibr.status === 'Draft';
  const editingLines = isEditing;
  const displayStatus: IBRStatus = (isEditing ? (editStatus ?? ibr.status) : ibr.status) as IBRStatus;
  const pending = ibr.status === 'Pending';
  const showLinkedDocs = !['Draft', 'Pending', 'Rejected', 'Cancelled'].includes(ibr.status);
  const boss = canBossApprove(role);
  /** Cancelled / rejected are read-only; everything else matches order-style full edit. */
  const canOpenEdit = !['Cancelled', 'Rejected'].includes(ibr.status);
  const canUseLogisticsUi = !['Agent', 'Driver', 'Customer'].includes(role ?? '');
  const isFulfillingBranch = !!resolvedBranchId && resolvedBranchId === ibr.fulfilling_branch_id;
  const isRequestingBranch = !!resolvedBranchId && resolvedBranchId === ibr.requesting_branch_id;
  const senderLogistics = canUseLogisticsUi && isFulfillingBranch;
  /** Sender steps (Schedule → In transit) + strip: only the fulfilling / “ship from” branch. Requester sees strip from In transit onward. */
  const ibrLogisticsPostApproval = ibr
    ? !['Draft', 'Pending', 'Rejected', 'Cancelled'].includes(ibr.status)
    : false;
  const ibrRequesterSeesLogistics =
    ibr && ['In Transit', 'Delivered', 'Fulfilled', 'Completed', 'Partially Fulfilled'].includes(ibr.status);
  const showIbrLogisticsStrip =
    canUseLogisticsUi &&
    !isEditing &&
    ibr &&
    ibrLogisticsPostApproval &&
    (senderLogistics || (isRequestingBranch && ibrRequesterSeesLogistics) || boss || !resolvedBranchId);
  const totalLineQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const logisticsBusy = logisticsLoading || saving;
  const ibrShipmentTrackingReady = ibrShipmentTrackingAvailable === true;

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6">
      {showIbrLogisticsStrip && (
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-y-2 gap-x-0.5 sm:justify-start">
          {IBR_LOGISTICS_STEPS.map((step, i) => {
            const st = ibrLogisticsStepVisual(i, displayStatus);
            return (
              <span key={step} className="inline-flex max-w-full items-center">
                {i > 0 && (
                  <span className="px-0.5 text-gray-300 sm:px-1" aria-hidden>
                    →
                  </span>
                )}
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-left text-[10px] font-medium leading-tight sm:text-xs ${
                    st === 'complete'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : st === 'current'
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : 'border-gray-200 bg-gray-50 text-gray-400'
                  }`}
                >
                  {step}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {ibrShipmentTrackingAvailable === false && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium text-amber-900">Database migration needed for shipping and receiving</p>
          <p className="mt-1 text-amber-900/90">
            This project adds columns <code className="rounded bg-amber-100/80 px-1">quantity_shipped</code> and{' '}
            <code className="rounded bg-amber-100/80 px-1">quantity_delivered</code> on{' '}
            <code className="rounded bg-amber-100/80 px-1">inter_branch_request_items</code>. Run the script{' '}
            <code className="rounded bg-amber-100/80 px-1">database/inter_branch_item_shipment_quantities.sql</code> in
            the Supabase SQL editor, then reload. You can still edit and save this request; in-transit and delivery
            actions stay disabled until then.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/inter-branch-requests')}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            aria-label="Back to inter-branch requests"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
              <Factory className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{ibr.ibr_number}</h1>
              <p className="text-sm text-gray-500">
                {ibr.req_br?.name ?? '—'} → {ibr.ful_br?.name ?? '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex min-h-[2.75rem] w-full min-w-0 flex-wrap items-center justify-end gap-2 self-center sm:flex-1 sm:justify-end md:gap-3">
            {draft && !isEditing && (
              <Button variant="primary" onClick={() => void submit()} disabled={saving} className="gap-2 flex-1 min-[480px]:flex-initial sm:flex-initial">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit for approval
              </Button>
            )}
            {pending && boss && (
              <>
                <Button variant="primary" onClick={() => void doApprove()} disabled={saving} className="gap-2 flex-1 min-[480px]:flex-initial sm:flex-initial">
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
                <Button variant="outline" onClick={() => void doReject()} disabled={saving} className="gap-2 border-red-300 text-red-700 hover:bg-red-50 flex-1 min-[480px]:flex-initial sm:flex-initial">
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </>
            )}
            {senderLogistics &&
              !isEditing &&
              (ibr.status === 'Approved' ||
                (ibr.status === 'Partially Fulfilled' && hasRemainingToShip)) && (
              <Button
                variant="primary"
                className="gap-2 flex-1 min-[480px]:flex-initial sm:flex-initial"
                disabled={logisticsBusy}
                onClick={() => openScheduleDepartureModal()}
              >
                {logisticsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Schedule
              </Button>
            )}
            {senderLogistics && ibr.status === 'Scheduled' && !isEditing && (
              <Button
                variant="primary"
                className="gap-2 flex-1 min-[480px]:flex-initial sm:flex-initial"
                disabled={logisticsBusy}
                onClick={() => void advanceIbrLogistics('Loading')}
              >
                {logisticsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Mark Loading
              </Button>
            )}
            {senderLogistics && ibr.status === 'Loading' && !isEditing && (
              <Button
                variant="primary"
                className="gap-2 flex-1 min-[480px]:flex-initial sm:flex-initial"
                disabled={logisticsBusy}
                onClick={() => void advanceIbrLogistics('Packed')}
              >
                {logisticsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Mark Packed
              </Button>
            )}
            {senderLogistics && ibr.status === 'Packed' && !isEditing && (
              <Button
                variant="primary"
                className="gap-2 flex-1 min-[480px]:flex-initial sm:flex-initial"
                disabled={logisticsBusy}
                onClick={() => void advanceIbrLogistics('Ready')}
              >
                {logisticsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark Ready
              </Button>
            )}
            {senderLogistics && ibr.status === 'Ready' && !isEditing && (
              <Button
                variant="primary"
                className="gap-2 flex-1 min-[480px]:flex-initial sm:flex-initial"
                disabled={logisticsBusy}
                title="Confirm shipment quantities, or advance to In Transit if lines are already fully shipped."
                onClick={() => {
                  if (logisticsBusy) return;
                  if (ibrShipmentTrackingAvailable !== true) {
                    alert(
                      'Mark in transit requires shipment columns on inter-branch lines. Run database/inter_branch_item_shipment_quantities.sql in the Supabase SQL editor, then refresh this page.',
                    );
                    return;
                  }
                  setShowIbrInTransitModal(true);
                }}
              >
                {logisticsBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                Mark in transit
              </Button>
            )}
            {senderLogistics && ibr.status === 'In Transit' && !isEditing && hasRemainingToShip && (
              <Button
                variant="primary"
                className="gap-2 flex-1 min-[480px]:flex-initial sm:flex-initial"
                disabled={logisticsBusy || !ibrShipmentTrackingReady}
                onClick={() => setShowIbrInTransitModal(true)}
              >
                {logisticsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                Send follow-up
              </Button>
            )}
            {canUseLogisticsUi &&
              isRequestingBranch &&
              (ibr.status === 'In Transit' || ibr.status === 'Partially Fulfilled') &&
              !isEditing && (
              <Button
                variant="primary"
                className="gap-2 flex-1 min-[480px]:flex-initial sm:flex-initial"
                disabled={logisticsLoading}
                title="Record goods received at this branch. Switch the branch selector to the requesting branch if you do not see this button."
                onClick={() => {
                  if (logisticsLoading) return;
                  if (ibrShipmentTrackingAvailable !== true) {
                    alert(
                      'Receiving needs shipment columns on each line. Run database/inter_branch_item_shipment_quantities.sql in the Supabase SQL editor, then refresh this page.',
                    );
                    return;
                  }
                  if (!hasPendingReceive) {
                    alert(
                      `Nothing is recorded as in transit yet. The fulfilling branch (${ibr.ful_br?.name ?? 'sender'}) must use Mark in transit / Send follow-up so shipped quantities are saved — not only changing the status badge.`,
                    );
                    return;
                  }
                  setShowIbrDeliveryModal(true);
                }}
              >
                {logisticsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Record delivery
              </Button>
            )}
            {canUseLogisticsUi && isRequestingBranch && ibr.status === 'Delivered' && !isEditing && (
              <Button
                variant="primary"
                onClick={() => void markIbrFulfilledAfterDelivery()}
                disabled={logisticsBusy}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 flex-1 min-[480px]:flex-initial sm:flex-initial"
              >
                {logisticsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Mark fulfilled
              </Button>
            )}
            {isEditing && (
              <>
                <Button variant="outline" onClick={handleCancelEdit} disabled={saving} className="gap-1 flex-1 min-[480px]:flex-initial sm:flex-initial">
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void saveIbrChanges()} disabled={saving} className="gap-2 flex-1 min-[480px]:flex-initial sm:flex-initial">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save changes
                </Button>
              </>
            )}
            {canOpenEdit && !isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={handleEdit}
                disabled={saving}
                className="gap-2 shrink-0"
              >
                <Edit className="w-4 h-4" />
                Edit request
              </Button>
            )}
        </div>
      </div>

      {showScheduleModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ibr-schedule-departure-title"
          >
            <div className="my-auto w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
              <h2 id="ibr-schedule-departure-title" className="text-lg font-semibold text-gray-900">
                Set departure date
              </h2>
              <p className="text-sm text-gray-600">
                Choose the date the shipment is planned to leave the fulfilling branch. The request will move to{' '}
                <strong>Scheduled</strong>
                .
              </p>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="ibr-schedule-date">
                  Date
                </label>
                <input
                  id="ibr-schedule-date"
                  type="date"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={pickScheduleDate}
                  onChange={(e) => setPickScheduleDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowScheduleModal(false)}
                  disabled={logisticsBusy}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void confirmScheduleDeparture()}
                  disabled={logisticsBusy}
                  className="gap-2"
                >
                  {logisticsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  Confirm
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <MarkIbrInTransitModal
        isOpen={showIbrInTransitModal && !!ibr}
        onClose={() => setShowIbrInTransitModal(false)}
        ibrNumber={ibr?.ibr_number ?? ''}
        lines={ibrInTransitModalLines}
        submitting={logisticsLoading}
        onConfirm={handleConfirmIbrInTransit}
      />

      <RecordIbrDeliveryModal
        isOpen={showIbrDeliveryModal && !!ibr}
        onClose={() => !logisticsLoading && setShowIbrDeliveryModal(false)}
        requestId={id ?? ''}
        ibrNumber={ibr?.ibr_number ?? ''}
        lines={ibrInTransitModalLines}
        submitting={logisticsLoading}
        onConfirm={handleConfirmIbrDelivery}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-start">
        <Card>
          <CardContent className="p-4 min-w-0">
            <p className="text-xs text-gray-500 mb-1">Requesting (receives)</p>
            <p className="text-sm font-semibold text-gray-900 truncate" title={ibr.req_br?.name ?? ''}>
              {ibr.req_br?.name ?? '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Total quantity</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{totalLineQty.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Created</p>
            <p className="text-sm font-semibold text-gray-900">{fmtDate(ibr.created_at)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Line items</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{items.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Request details</h2>
              <div className="pb-3 border-b border-gray-100">
                <p className="text-xs text-gray-500 mb-1.5">Status</p>
                {isEditing ? (
                  <select
                    className="mt-0.5 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    value={editStatus ?? ibr.status}
                    onChange={(e) => setEditStatus(e.target.value as IBRStatus)}
                  >
                    {IBR_ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge variant={getStatusVariant(ibr.status)} className="inline-flex items-center gap-1 whitespace-nowrap">
                    {getIBRStatusIcon(ibr.status)} {ibr.status}
                  </Badge>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-500">Requesting branch (receives / PO)</div>
                    <div className="text-sm font-medium text-gray-900">{ibr.req_br?.name ?? '—'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Factory className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500">Fulfilling branch (sends / PR)</div>
                    {editingLines ? (
                      <select
                        className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        value={fulfillingId}
                        onChange={(e) => setFulfillingId(e.target.value)}
                      >
                        {branches
                          .filter((b) => b.id !== ibr.requesting_branch_id)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-gray-900 mt-0.5">{ibr.ful_br?.name ?? '—'}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Created</div>
                    <div className="text-sm font-medium text-gray-900">{fmtDate(ibr.created_at)}</div>
                  </div>
                </div>
                {ibr.scheduled_departure_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Planned departure</div>
                      <div className="text-sm font-medium text-gray-900">
                        {fmtDate(
                          `${String(ibr.scheduled_departure_date).replace(/T.*/, '').slice(0, 10)}T12:00:00`,
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {ibr.submitted_at && (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Submitted</div>
                      <div className="text-sm font-medium text-gray-900">{fmtDateTime(ibr.submitted_at)}</div>
                    </div>
                  </div>
                )}
                {ibr.approved_by &&
                  ibr.approved_at &&
                  !['Draft', 'Pending', 'Rejected', 'Cancelled'].includes(ibr.status) && (
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Approved by</div>
                      <div className="text-sm font-medium text-gray-900">
                        {ibr.approved_by} · {fmtDateTime(ibr.approved_at)}
                      </div>
                    </div>
                  </div>
                )}
                {ibr.rejected_by && (
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-500">Rejected by</div>
                      <div className="text-sm font-medium text-gray-900">{ibr.rejected_by}</div>
                      {ibr.rejection_reason && <p className="text-xs text-red-800 mt-1">{ibr.rejection_reason}</p>}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Created by</div>
                    <div className="text-sm font-medium text-gray-900">{ibr.created_by ?? '—'}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5" />
                    Notes
                  </label>
                  {isEditing ? (
                    <textarea
                      id="ibr-request-notes"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[88px] focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Optional notes for approvers and branches…"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 mt-1 bg-gray-50 border border-gray-100 rounded-lg p-2 min-h-[2.5rem]">
                      {ibr.notes?.trim() ? ibr.notes : '—'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Raw Materials
                  <span className="text-xs font-normal text-gray-400">
                    ({materialLines.length} item{materialLines.length !== 1 ? 's' : ''})
                  </span>
                </h2>
                <span className="text-sm font-bold text-gray-900">Subtotal: ₱{materialSubtotal.toLocaleString()}</span>
              </div>

              {materialLines.length === 0 && !(editingLines && draftRaw && editingMaterialLineId === 'new') ? (
                <div className="text-center py-6 space-y-2 max-w-md mx-auto">
                  <p className="text-sm text-gray-500">No materials on this request yet.</p>
                  <p className="text-xs text-gray-400">Materials your branch will receive (linked PO is created when you save).</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {editingLines && draftRaw && editingMaterialLineId === 'new' && (
                    <IbrRawMaterialLineCard
                      mode="new"
                      name={draftRaw.name}
                      sku={draftRaw.sku}
                      uom={draftRaw.unit}
                      costPerUnit={Number(draftRaw.cost) || 0}
                      quantityOrdered={Number(editMatQty) || 0}
                      imageUrl={draftRaw.imageUrl}
                      stock={materialStockById[draftRaw.materialId]}
                      requestingLabel={ibr.req_br?.name ?? 'Requesting'}
                      fulfillingLabel={fulfillingBranchName}
                      isOpen
                      editQty={editMatQty}
                      setEditQty={setEditMatQty}
                      editUom={editMatUom}
                      setEditUom={setEditMatUom}
                      editReceived={editMatReceived}
                      setEditReceived={setEditMatReceived}
                      saving={saving}
                      onAdd={() => void confirmAddRawLine()}
                      onCancel={cancelMaterialEdit}
                    />
                  )}

                  {materialLines.map((it) => {
                    const mid = it.raw_material_id;
                    if (!mid) return null;
                    const meta = rawMaterialById[mid];
                    const isOpen = editingMaterialLineId === it.id;
                    const uom = meta?.unit_of_measure ?? '';
                    const cost = meta?.cost_per_unit ?? 0;
                    return (
                      <div key={it.id}>
                        <IbrRawMaterialLineCard
                        mode="existing"
                        name={meta?.name ?? it.mat_label ?? '—'}
                        sku={meta?.sku ?? '—'}
                        uom={uom}
                        costPerUnit={cost}
                        quantityOrdered={isOpen ? Number(editMatQty) || 0 : Number(it.quantity) || 0}
                        imageUrl={meta?.image_url ?? null}
                        stock={materialStockById[mid]}
                        requestingLabel={ibr.req_br?.name ?? 'Requesting'}
                        fulfillingLabel={fulfillingBranchName}
                        isOpen={isOpen}
                        onHeaderClick={editingLines ? () => (isOpen ? cancelMaterialEdit() : openEditMaterialLine(it.id)) : undefined}
                        editQty={editMatQty}
                        setEditQty={setEditMatQty}
                        editUom={editMatUom}
                        setEditUom={setEditMatUom}
                        editReceived={editMatReceived}
                        setEditReceived={setEditMatReceived}
                        saving={saving}
                        onApply={() => void saveExistingMaterialLine(it.id)}
                        onRemove={() => void removeLine(it.id)}
                        onCancel={cancelMaterialEdit}
                        canEdit={editingLines}
                        readOnly={!editingLines}
                      />
                      </div>
                    );
                  })}
                </div>
              )}

              {editingLines && (
                <button
                  type="button"
                  onClick={() => setShowRawPicker(true)}
                  disabled={saving}
                  className="mt-3 w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-indigo-700">Add a Raw Material</p>
                    <p className="text-xs text-gray-400 mt-0.5">Browse by category · Set qty &amp; price before adding to the request</p>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Products to send
                  <span className="text-xs font-normal text-gray-400">({productLines.length})</span>
                </h2>
                {editingLines && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setEditingProductLineId(null);
                      setShowProductPicker(true);
                    }}
                    disabled={saving}
                  >
                    <Plus className="w-4 h-4" />
                    Add product
                  </Button>
                )}
              </div>
              {productLines.length === 0 ? (
                <p className="text-center py-6 text-sm text-gray-500">No product lines. Add variants the fulfilling branch will produce or ship (linked PR is created when you save).</p>
              ) : (
                <div className="space-y-2">
                  {productLines.map((it) => (
                    <div
                      key={it.id}
                      className={`border rounded-xl overflow-hidden ${
                        editingLines ? 'border-gray-100 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30' : 'border-gray-100'
                      }`}
                    >
                      <div
                        role={editingLines ? 'button' : undefined}
                        tabIndex={editingLines ? 0 : undefined}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4"
                        onClick={
                          editingLines
                            ? () => {
                                setEditingProductLineId(it.id);
                                setShowProductPicker(true);
                              }
                            : undefined
                        }
                        onKeyDown={
                          editingLines
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setEditingProductLineId(it.id);
                                  setShowProductPicker(true);
                                }
                              }
                            : undefined
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{it.prod_label ?? it.product_variant_id}</p>
                          {(() => {
                            const vid = it.product_variant_id;
                            const st = vid ? productVariantStockById[vid] : undefined;
                            if (!st || !ibr) return null;
                            return (
                              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-gray-600">
                                <span className="font-medium text-gray-700 shrink-0">Stock in hand ·</span>
                                <span>
                                  <span className="text-gray-500">{ibr.req_br?.name ?? 'Requesting'}:</span>{' '}
                                  <span className="font-semibold tabular-nums text-gray-900">
                                    {fmtVariantStockUnits(st.requesting)}
                                  </span>{' '}
                                  units
                                </span>
                                <span className="text-gray-300" aria-hidden>
                                  |
                                </span>
                                <span>
                                  <span className="text-gray-500">{fulfillingBranchName}:</span>{' '}
                                  <span className="font-semibold tabular-nums text-gray-900">
                                    {fmtVariantStockUnits(st.fulfilling)}
                                  </span>{' '}
                                  units
                                </span>
                              </div>
                            );
                          })()}
                          <p className="text-xs text-gray-500 mt-0.5">
                            {editingLines ? 'Product · click row to edit' : 'Product'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-6">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Quantity to send</p>
                            <p className="font-medium text-gray-900 tabular-nums">
                              {Number(it.quantity).toLocaleString()}{' '}
                              <span className="text-xs font-normal text-gray-500">units</span>
                            </p>
                          </div>
                          {editingLines && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void removeLine(it.id);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Remove line"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="w-5 h-5" />
                Proof of delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deliveryProofs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No proof photos yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {deliveryProofs.map((p) => (
                    <a
                      key={p.id}
                      href={p.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square"
                    >
                      <img
                        src={p.file_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                        <p className="text-white text-[10px] truncate">{p.file_name}</p>
                        <p className="text-white/70 text-[9px]">
                          {new Date(p.created_at).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {p.uploaded_by ? ` · ${p.uploaded_by}` : ''}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-5 h-5" />
                Activity log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ibrLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No activity recorded yet. Creating a request, saving changes, submit, approval, logistics, delivery, and
                    proofs will appear here.
                  </p>
                ) : (
                  ibrLogs.map((log, index) => {
                    const isLast = index === ibrLogs.length - 1;
                    const getActionIcon = () => {
                      switch (log.action) {
                        case 'created':
                          return <Plus className="w-4 h-4" />;
                        case 'submitted':
                          return <Send className="w-4 h-4" />;
                        case 'approved':
                          return <ThumbsUp className="w-4 h-4" />;
                        case 'rejected':
                          return <XCircle className="w-4 h-4" />;
                        case 'updated':
                          return <FileText className="w-4 h-4" />;
                        case 'status_changed':
                          return <Truck className="w-4 h-4" />;
                        case 'in_transit':
                          return <Truck className="w-4 h-4" />;
                        case 'delivery_recorded':
                          return <PackageCheck className="w-4 h-4" />;
                        case 'proof_uploaded':
                          return <ImageIcon className="w-4 h-4" />;
                        case 'fulfilled':
                          return <CheckCircle className="w-4 h-4" />;
                        default:
                          return <Clock className="w-4 h-4" />;
                      }
                    };
                    const getActionColor = () => {
                      switch (log.action) {
                        case 'approved':
                        case 'fulfilled':
                          return 'text-green-600 bg-green-50';
                        case 'rejected':
                          return 'text-red-600 bg-red-50';
                        case 'delivery_recorded':
                          return 'text-emerald-600 bg-emerald-50';
                        case 'proof_uploaded':
                          return 'text-blue-600 bg-blue-50';
                        case 'submitted':
                          return 'text-amber-600 bg-amber-50';
                        case 'created':
                          return 'text-sky-600 bg-sky-50';
                        default:
                          return 'text-gray-600 bg-gray-50';
                      }
                    };
                    const getRoleBadgeColor = () => {
                      switch (log.performed_by_role) {
                        case 'Agent':
                          return 'bg-blue-100 text-blue-800';
                        case 'Manager':
                          return 'bg-purple-100 text-purple-800';
                        case 'Warehouse Staff':
                          return 'bg-orange-100 text-orange-800';
                        case 'Logistics':
                          return 'bg-green-100 text-green-800';
                        case 'Admin':
                          return 'bg-red-100 text-red-800';
                        case 'System':
                          return 'bg-gray-100 text-gray-800';
                        default:
                          return 'bg-gray-100 text-gray-800';
                      }
                    };
                    const t = new Date(log.created_at);
                    const timeStr = t.toLocaleString('en-PH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    });
                    return (
                      <div key={log.id} className="relative pl-8 pb-3">
                        {!isLast && <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" aria-hidden />}
                        <div
                          className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${getActionColor()}`}
                        >
                          {getActionIcon()}
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 flex-1">{ibrLogCardHeadline(log)}</p>
                            {log.performed_by_role && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getRoleBadgeColor()}`}
                              >
                                {log.performed_by_role}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 mb-1">
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-medium text-gray-700">{log.performed_by ?? '—'}</span>
                            <span>· {timeStr}</span>
                          </div>
                          <IbrActivityLogHumanDetails log={log} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showLinkedDocs && (
        <Card>
          <CardHeader>
            <CardTitle>Linked documents</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {ibr.linked_purchase_order_id && (
              <Button variant="outline" onClick={() => navigate(`/purchase-orders/${ibr.linked_purchase_order_id}`)}>
                Open PO
              </Button>
            )}
            {ibr.linked_production_request_id && (
              <Button variant="outline" onClick={() => navigate(`/production-requests/${ibr.linked_production_request_id}`)}>
                Open PR
              </Button>
            )}
            {!ibr.linked_purchase_order_id && !ibr.linked_production_request_id && (
              <p className="text-gray-500">No linked PO/PR (material-only or product-only request)</p>
            )}
          </CardContent>
        </Card>
      )}

      <RawMaterialPickerModal
        isOpen={showRawPicker}
        onClose={() => !saving && setShowRawPicker(false)}
        branch={branch ?? ''}
        alreadyAdded={alreadyAddedMaterialIds}
        onSelect={(m) => handleRawMaterialPicked(m)}
        interBranchRequestingBranchId={ibr?.requesting_branch_id}
        interBranchFulfillingBranchId={fulfillingId || ibr?.fulfilling_branch_id || null}
      />

      <OrderProductSelectionModal
        open={showProductPicker}
        onClose={() => {
          if (saving) return;
          setShowProductPicker(false);
          setEditingProductLineId(null);
        }}
        purpose="interBranch"
        excludeVariantIds={excludeProductVariantIds}
        initialEdit={editingProductLineId ? productModalInitial : null}
        onConfirm={(p) => void handleProductLinePicked(p)}
        interBranchRequestingBranchId={ibr?.requesting_branch_id}
        interBranchFulfillingBranchId={fulfillingId || ibr?.fulfilling_branch_id || null}
        confirmBusy={saving}
      />

    </div>
  );
}
