import type { SupabaseClient } from '@supabase/supabase-js';
import { recalcMaterialTotal } from '@/src/lib/interBranchStock';

/** `raw_materials.status` enum values — no "Critical" (see bomConsumption). */
function materialAggStatus(q: number, reorder: number): string {
  if (q <= 0) return 'Out of Stock';
  if (q <= reorder) return 'Low Stock';
  return 'Active';
}

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Inbound raw material at a branch: bump `material_stock`, recalc `raw_materials.total_stock`,
 * refresh status, set `last_restock_date`.
 */
export async function addRawMaterialInboundAtBranch(
  supabase: SupabaseClient,
  materialId: string,
  branchId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) return;
  const { data: row } = await supabase
    .from('material_stock')
    .select('id, quantity')
    .eq('material_id', materialId)
    .eq('branch_id', branchId)
    .maybeSingle();
  if (row) {
    const n = Number((row as { quantity: number }).quantity) + quantity;
    const { error: u1 } = await supabase
      .from('material_stock')
      .update({ quantity: n, updated_at: new Date().toISOString() })
      .eq('id', (row as { id: string }).id);
    if (u1) throw u1;
  } else {
    const { error: ins } = await supabase.from('material_stock').insert({
      material_id: materialId,
      branch_id: branchId,
      quantity,
    });
    if (ins) throw ins;
  }
  await recalcMaterialTotal(supabase, materialId);
  const { data: mat, error: mErr } = await supabase
    .from('raw_materials')
    .select('total_stock, reorder_point')
    .eq('id', materialId)
    .single();
  if (mErr) throw mErr;
  const newStatus = materialAggStatus(
    Number((mat as { total_stock: number }).total_stock),
    Number((mat as { reorder_point: number }).reorder_point) || 0,
  );
  const { error: up } = await supabase
    .from('raw_materials')
    .update({
      status: newStatus,
      last_restock_date: todayDateStr(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', materialId);
  if (up) throw up;
}

/** When no branch is on the PO: only aggregate `total_stock` and last restock date. */
export async function addRawMaterialInboundAggregateOnly(
  supabase: SupabaseClient,
  materialId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) return;
  const { data: mat, error: qErr } = await supabase
    .from('raw_materials')
    .select('total_stock, reorder_point')
    .eq('id', materialId)
    .single();
  if (qErr) throw qErr;
  const newTotal = Number((mat as { total_stock: number }).total_stock) + quantity;
  const newStatus = materialAggStatus(
    newTotal,
    Number((mat as { reorder_point: number }).reorder_point) || 0,
  );
  const { error: up } = await supabase
    .from('raw_materials')
    .update({
      total_stock: newTotal,
      status: newStatus,
      last_restock_date: todayDateStr(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', materialId);
  if (up) throw up;
}
