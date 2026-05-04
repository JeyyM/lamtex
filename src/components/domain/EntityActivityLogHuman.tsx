import React from 'react';

/** Row shape from `product_logs` / `raw_material_logs` (snake_case from Supabase). */
export type EntityActivityLogRowLike = {
  action: string;
  description: string | null;
  old_value: unknown;
  new_value: unknown;
  metadata?: unknown;
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

function fmtMoneyPhp(n: unknown): string | null {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return `₱${x.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtQty(n: unknown): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Short card title — mirrors `poLogCardHeadline` (friendly line, details live below). */
export function entityLogCardHeadline(log: EntityActivityLogRowLike): string {
  const d = log.description?.trim() ?? '';
  switch (log.action) {
    case 'material_updated':
      return 'Material details were saved.';
    case 'material_created':
      return 'New raw material was added to the catalog.';
    case 'material_deleted':
      return 'Raw material was removed from the catalog.';
    case 'stock_adjusted':
      return 'Stock quantity was adjusted.';
    case 'cost_synced_from_po':
      return 'Catalog unit cost was updated from a purchase order.';
    case 'product_updated':
      return 'Product details were updated.';
    case 'product_created':
      return 'New product was created.';
    case 'product_deleted':
      return 'Product was removed from the catalog.';
    case 'variant_created':
      return 'A new variant (SKU) was added to this product.';
    case 'variant_updated':
      return 'Variant details (and BOM, if any) were saved.';
    case 'variant_deleted':
      return 'A variant was removed from this product.';
    case 'images_updated':
      return 'Product images were updated.';
    case 'status_synced':
      return 'Product status was rolled up from variant stock levels.';
    default:
      return d || log.action.replace(/_/g, ' ');
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  sku: 'SKU',
  description: 'Description',
  brand: 'Brand',
  cost_per_unit: 'Unit cost',
  reorder_point: 'Reorder point',
  total_stock: 'Stock on hand',
  status: 'Status',
  unit_of_measure: 'Unit of measure',
  image_url: 'Primary image',
  gallery_count: 'Gallery images',
  image_count: 'Images',
  unit_price: 'Selling price (unit)',
  cost_price: 'Cost price',
  last_purchase_price: 'Last purchase price',
  size: 'Variant size',
  lead_time_days: 'Lead time',
  min_order_qty: 'Minimum order quantity',
  bom_line_count: 'BOM line count',
  spec_count: 'Specification rows',
};

function sentenceForField(key: string, oldV: unknown, newV: unknown): string | null {
  const label = FIELD_LABELS[key] ?? null;
  if (!label) return null;

  if (key === 'cost_per_unit' || key === 'unit_price' || key === 'cost_price' || key === 'last_purchase_price') {
    const o = fmtMoneyPhp(oldV);
    const n = fmtMoneyPhp(newV);
    if (o && n && o !== n) return `${label} changed from ${o} to ${n}.`;
    if (!o && n) return `${label} set to ${n}.`;
    if (o && !n) return `${label} cleared (was ${o}).`;
    return null;
  }

  if (key === 'total_stock' || key === 'reorder_point' || key === 'lead_time_days' || key === 'min_order_qty') {
    const o = strVal(oldV) ?? fmtQty(oldV);
    const n = strVal(newV) ?? fmtQty(newV);
    if (o !== n && (o || n)) return `${label} changed from ${o ?? '—'} to ${n ?? '—'}.`;
    return null;
  }

  if (key === 'image_url') {
    const had = oldV != null && String(oldV).trim() !== '';
    const has = newV != null && String(newV).trim() !== '';
    if (!had && has) return 'A primary image was added.';
    if (had && !has) return 'Primary image was removed.';
    if (had && has && String(oldV) !== String(newV)) return 'Primary image was replaced.';
    return null;
  }

  if (key === 'gallery_count' || key === 'image_count') {
    const o = strVal(oldV) ?? fmtQty(oldV);
    const n = strVal(newV) ?? fmtQty(newV);
    if (o !== n) return `Image gallery now has ${n} image(s) (was ${o}).`;
    return null;
  }

  const os = strVal(oldV);
  const ns = strVal(newV);
  if (os === ns) return null;
  if (os && ns) {
    const max = 120;
    const trim = (s: string) => (s.length > max ? `${s.slice(0, max)}…` : s);
    return `${label} updated — was “${trim(os)}”, now “${trim(ns)}”.`;
  }
  if (!os && ns) return `${label} set to “${ns.length > 80 ? `${ns.slice(0, 80)}…` : ns}”.`;
  if (os && !ns) return `${label} cleared (previously had a value).`;
  return null;
}

function buildWhatChangedLines(log: EntityActivityLogRowLike): string[] {
  const lines: string[] = [];
  const oldV = asRecord(log.old_value);
  const newV = asRecord(log.new_value);

  if (log.action === 'material_deleted' || log.action === 'product_deleted') {
    const name = strVal(oldV?.name);
    if (name) lines.push(`Removed “${name}”.`);
    return lines;
  }

  if (log.action === 'variant_deleted') {
    const sku = strVal(oldV?.sku);
    if (sku) lines.push(`Removed variant ${sku}.`);
    return lines;
  }

  if (log.action === 'status_synced') {
    const os = strVal(oldV?.status);
    const ns = strVal(newV?.status);
    if (os || ns) lines.push(`Roll-up status went from “${os ?? '—'}” to “${ns ?? '—'}”.`);
    return lines;
  }

  if (!oldV && !newV) return lines;

  const keys = new Set([...Object.keys(oldV ?? {}), ...Object.keys(newV ?? {})]);
  const skip = new Set(['variant_id', 'category_id', 'branch', 'product_id']);
  for (const key of Array.from(keys).sort()) {
    if (skip.has(key)) continue;
    const line = sentenceForField(key, oldV?.[key], newV?.[key]);
    if (line) lines.push(line);
  }

  return lines;
}

function buildContextLines(log: EntityActivityLogRowLike): string[] {
  const meta = asRecord(log.metadata);
  if (!meta) return [];
  const out: string[] = [];
  const branch = strVal(meta.branch) ?? strVal(meta.branch_context);
  if (branch) out.push(`Branch context: ${branch}.`);
  const po = strVal(meta.po_number);
  if (po) out.push(`Purchase order: ${po}.`);
  if (log.action === 'stock_adjusted' && meta.consume_raw_materials === true) {
    out.push('Raw materials were consumed per BOM for this add.');
  }
  const adj = strVal(meta.adjustment_type);
  if (adj && log.action === 'stock_adjusted') {
    out.push(adj === 'add' ? 'Adjustment type: increase.' : 'Adjustment type: decrease.');
  }
  const bomLines = meta.bom_lines;
  if (
    typeof bomLines === 'number' &&
    bomLines >= 0 &&
    (log.action === 'variant_updated' || log.action === 'variant_created')
  ) {
    out.push(`Bill of materials: ${bomLines} line(s).`);
  }
  return out;
}

export function buildEntityLogLaymanSections(log: EntityActivityLogRowLike): LaymanSection[] {
  const out: LaymanSection[] = [];
  const what = buildWhatChangedLines(log);
  if (what.length) out.push({ heading: 'What changed', lines: what });
  const ctx = buildContextLines(log);
  if (ctx.length) out.push({ heading: 'Context', lines: ctx });
  return out;
}

const ENTITY_SECTION_THEME: Record<
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
  Context: {
    bar: 'border-l-4 border-l-slate-500',
    title: 'text-slate-800',
    body: 'text-slate-950/90',
    bullet: 'text-slate-500',
    box: 'bg-slate-50/80 border-slate-100',
  },
};

function themeForEntitySection(heading: string) {
  return (
    ENTITY_SECTION_THEME[heading] ?? {
      bar: 'border-l-4 border-l-gray-400',
      title: 'text-gray-700',
      body: 'text-gray-800',
      bullet: 'text-gray-400',
      box: 'bg-gray-50/80 border-gray-200/80',
    }
  );
}

export function EntityActivityLogHumanDetails({ log }: { log: EntityActivityLogRowLike }) {
  const sections = buildEntityLogLaymanSections(log);
  if (sections.length === 0) return null;
  return (
    <div className="mt-3 space-y-2.5 border-t border-gray-200/80 pt-3">
      {sections.map((sec, secIdx) => {
        const th = themeForEntitySection(sec.heading);
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
