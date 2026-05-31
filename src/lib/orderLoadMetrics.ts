import { supabase } from '@/src/lib/supabase';

export type OrderLoadMetrics = {
  weightKg: number;
  volumeCbm: number;
  orderedUnits: number;
  remainingUnits: number;
};

type VariantShippingRow = {
  weight_kg?: unknown;
  volume_cbm?: unknown;
  outer_diameter_mm?: unknown;
  length_m?: unknown;
};

function num(n: unknown, fallback = 0): number {
  if (n == null || n === '') return fallback;
  const x = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(x) ? x : fallback;
}

/** Matches seed/backfill logic: explicit volume_cbm, else OD² × length, else 0.05 m³. */
export function variantUnitVolume(variant: VariantShippingRow | null | undefined): number {
  const explicit = num(variant?.volume_cbm, NaN);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const odMm = num(variant?.outer_diameter_mm, 0);
  const lengthM = num(variant?.length_m, 1) || 1;
  if (odMm > 0) {
    const d = odMm / 1000;
    return d * d * lengthM;
  }

  return 0.05;
}

export function variantUnitWeight(variant: VariantShippingRow | null | undefined): number {
  const w = num(variant?.weight_kg, NaN);
  return Number.isFinite(w) && w > 0 ? w : 0.5;
}

function normalizeVariant(row: { product_variants?: unknown }): VariantShippingRow | null {
  const v = row.product_variants;
  if (!v) return null;
  if (Array.isArray(v)) return (v[0] as VariantShippingRow | undefined) ?? null;
  return v as VariantShippingRow;
}

/**
 * Sum shipping weight/volume from order line items × variant unit load.
 * For Partially Fulfilled orders, only undelivered quantities count.
 */
export async function fetchOrderLoadByOrderId(
  orderIds: string[],
  orderStatusById: Map<string, string>,
): Promise<Map<string, OrderLoadMetrics>> {
  const out = new Map<string, OrderLoadMetrics>();
  const ids = [...new Set(orderIds.filter(Boolean))];
  if (!ids.length) return out;

  const { data: lineRows, error } = await supabase
    .from('order_line_items')
    .select(
      'order_id, quantity, quantity_delivered, product_variants ( weight_kg, volume_cbm, outer_diameter_mm, length_m )',
    )
    .in('order_id', ids);

  if (error) {
    console.warn('[orderLoadMetrics] line fetch failed:', error.message);
    return out;
  }

  for (const row of lineRows ?? []) {
    const orderId = row.order_id as string;
    if (!orderId) continue;

    const status = orderStatusById.get(orderId) ?? '';
    const qty = Math.max(0, num(row.quantity, 0));
    const delivered = Math.max(0, num(row.quantity_delivered, 0));
    const remainingQty = status === 'Partially Fulfilled' ? Math.max(0, qty - delivered) : qty;
    const loadQty = status === 'Partially Fulfilled' ? remainingQty : qty;

    const variant = normalizeVariant(row);
    const unitWeight = variantUnitWeight(variant);
    const unitVolume = variantUnitVolume(variant);

    const cur = out.get(orderId) ?? { weightKg: 0, volumeCbm: 0, orderedUnits: 0, remainingUnits: 0 };
    cur.weightKg += unitWeight * loadQty;
    cur.volumeCbm += unitVolume * loadQty;
    cur.orderedUnits += qty;
    cur.remainingUnits += remainingQty;
    out.set(orderId, cur);
  }

  return out;
}

export function orderLoadWithFallback(
  orderId: string,
  loadByOrderId: Map<string, OrderLoadMetrics>,
  fallback: { weight_kg?: unknown; volume_cbm?: unknown },
): { weight: number; volume: number } {
  const computed = loadByOrderId.get(orderId);
  if (computed && (computed.weightKg > 0 || computed.volumeCbm > 0)) {
    return {
      weight: Math.max(1, computed.weightKg),
      volume: Math.max(0.01, computed.volumeCbm),
    };
  }
  return {
    weight: Math.max(1, num(fallback.weight_kg, 10)),
    volume: Math.max(0.01, num(fallback.volume_cbm, 0.05)),
  };
}
