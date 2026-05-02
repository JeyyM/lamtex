import type { SupabaseClient } from '@supabase/supabase-js';
import { computeStockStatus } from '@/src/lib/stockStatus';
import { refreshParentProductStatus } from '@/src/lib/productAggregateStatus';

/**
 * Add finished units at a branch (e.g. production recorded), rollup totals, set `last_restocked`.
 */
export async function addFinishedVariantUnitsAtBranch(
  supabase: SupabaseClient,
  params: {
    variantId: string;
    productId: string;
    branchId: string;
    units: number;
    reorderPoint: number;
  },
): Promise<void> {
  const { variantId, productId, branchId, units, reorderPoint } = params;
  const delta = Math.floor(units);
  if (delta <= 0) return;

  const { data: row } = await supabase
    .from('product_variant_stock')
    .select('id, quantity')
    .eq('variant_id', variantId)
    .eq('branch_id', branchId)
    .maybeSingle();
  if (row) {
    const n = Number((row as { quantity: number }).quantity) + delta;
    const { error: u1 } = await supabase
      .from('product_variant_stock')
      .update({ quantity: n, updated_at: new Date().toISOString() })
      .eq('id', (row as { id: string }).id);
    if (u1) throw u1;
  } else {
    const { error: ins } = await supabase.from('product_variant_stock').insert({
      variant_id: variantId,
      branch_id: branchId,
      quantity: delta,
    });
    if (ins) throw ins;
  }

  const { data: sumRows, error: sumErr } = await supabase
    .from('product_variant_stock')
    .select('quantity')
    .eq('variant_id', variantId);
  if (sumErr) throw sumErr;
  const sumTotal = (sumRows ?? []).reduce(
    (s, r) => s + (Number((r as { quantity: number }).quantity) || 0),
    0,
  );
  const newStatus = computeStockStatus(sumTotal, reorderPoint);
  const now = new Date().toISOString();
  const { error: varErr } = await supabase
    .from('product_variants')
    .update({
      total_stock: sumTotal,
      status: newStatus,
      last_restocked: now,
    })
    .eq('id', variantId);
  if (varErr) throw varErr;
  await refreshParentProductStatus(productId);
}
