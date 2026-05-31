import { supabase } from '@/src/lib/supabase';

function dateOnly(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const head = String(value).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : null;
}

function maxDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

type PrJoin = {
  updated_at?: string | null;
  request_date?: string | null;
  branch_id?: string | null;
};

type PoJoin = {
  updated_at?: string | null;
  order_date?: string | null;
  actual_delivery_date?: string | null;
  branch_id?: string | null;
};

/** Latest production receipt date per variant (PR lines with quantity_completed > 0). */
export async function fetchLatestRestockDatesForVariants(
  variantIds: string[],
  branchId: string | null,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!variantIds.length) return out;

  const { data, error } = await supabase
    .from('production_request_items')
    .select(`
      product_variant_id,
      quantity_completed,
      production_requests!inner (
        updated_at,
        request_date,
        branch_id
      )
    `)
    .in('product_variant_id', variantIds)
    .gt('quantity_completed', 0);

  if (error) {
    if (import.meta.env.DEV) console.warn('[warehouse restock] variant PR lookup', error.message);
    return out;
  }

  for (const row of data ?? []) {
    const vid = String((row as { product_variant_id?: string }).product_variant_id ?? '');
    if (!vid) continue;
    const qty = Number((row as { quantity_completed?: number }).quantity_completed) || 0;
    if (qty <= 0) continue;

    const prRaw = (row as { production_requests?: PrJoin | PrJoin[] | null }).production_requests;
    const pr = Array.isArray(prRaw) ? prRaw[0] : prRaw;
    if (!pr) continue;
    if (branchId && pr.branch_id && pr.branch_id !== branchId) continue;

    const d = dateOnly(pr.updated_at) ?? dateOnly(pr.request_date);
    if (!d) continue;
    out.set(vid, maxDate(out.get(vid) ?? null, d) ?? d);
  }

  return out;
}

/** Latest PO receipt date per raw material (lines with quantity_received > 0). */
export async function fetchLatestRestockDatesForMaterials(
  materialIds: string[],
  branchId: string | null,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!materialIds.length) return out;

  const { data, error } = await supabase
    .from('purchase_order_items')
    .select(`
      material_id,
      quantity_received,
      purchase_orders!inner (
        updated_at,
        order_date,
        actual_delivery_date,
        branch_id
      )
    `)
    .in('material_id', materialIds)
    .gt('quantity_received', 0);

  if (error) {
    if (import.meta.env.DEV) console.warn('[warehouse restock] material PO lookup', error.message);
    return out;
  }

  for (const row of data ?? []) {
    const mid = String((row as { material_id?: string }).material_id ?? '');
    if (!mid) continue;
    const qty = Number((row as { quantity_received?: number }).quantity_received) || 0;
    if (qty <= 0) continue;

    const poRaw = (row as { purchase_orders?: PoJoin | PoJoin[] | null }).purchase_orders;
    const po = Array.isArray(poRaw) ? poRaw[0] : poRaw;
    if (!po) continue;
    if (branchId && po.branch_id && po.branch_id !== branchId) continue;

    const d =
      dateOnly(po.actual_delivery_date) ??
      dateOnly(po.updated_at) ??
      dateOnly(po.order_date);
    if (!d) continue;
    out.set(mid, maxDate(out.get(mid) ?? null, d) ?? d);
  }

  return out;
}

export function formatRestockDateLabel(iso: string | null | undefined): string {
  const d = dateOnly(iso);
  return d ?? '—';
}
