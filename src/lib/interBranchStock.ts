import { SupabaseClient } from '@supabase/supabase-js';
import type { InterBranchItemRow } from './interBranchRequest';

export type IbrStockLine = {
  line_kind: 'raw_material' | 'product';
  raw_material_id: string | null;
  product_variant_id: string | null;
  quantity: number;
};

function toLines(rows: InterBranchItemRow[]): IbrStockLine[] {
  return rows.map((r) => ({
    line_kind: r.line_kind,
    raw_material_id: r.raw_material_id,
    product_variant_id: r.product_variant_id,
    quantity: Number(r.quantity) || 0,
  }));
}

async function branchCode(supabase: SupabaseClient, branchId: string): Promise<string> {
  const { data } = await supabase.from('branches').select('code').eq('id', branchId).maybeSingle();
  return (data as { code?: string } | null)?.code ?? '';
}

async function recalcMaterialTotal(supabase: SupabaseClient, materialId: string) {
  const { data } = await supabase.from('material_stock').select('quantity').eq('material_id', materialId);
  const sum = (data ?? []).reduce((s, r) => s + Number((r as { quantity: number }).quantity), 0);
  await supabase
    .from('raw_materials')
    .update({ total_stock: sum, updated_at: new Date().toISOString() })
    .eq('id', materialId);
}

async function recalcVariantTotal(supabase: SupabaseClient, variantId: string) {
  const { data } = await supabase.from('product_variant_stock').select('quantity').eq('variant_id', variantId);
  const sum = (data ?? []).reduce((s, r) => s + Number((r as { quantity: number }).quantity), 0);
  await supabase
    .from('product_variants')
    .update({ total_stock: sum, updated_at: new Date().toISOString() })
    .eq('id', variantId);
}

/**
 * When goods leave the fulfilling (sender) branch — run when IBR status becomes **In Transit**.
 * Deducts `material_stock` / `product_variant_stock` at the sending branch.
 */
export async function applyIbrShipStock(
  supabase: SupabaseClient,
  params: {
    fulfillingBranchId: string;
    requestId: string;
    ibrNumber: string;
    items: InterBranchItemRow[];
    performedBy: string;
  },
): Promise<void> {
  const lines = toLines(params.items);
  const fromCode = await branchCode(supabase, params.fulfillingBranchId);

  for (const line of lines) {
    const q = line.quantity;
    if (q <= 0) continue;
    if (line.line_kind === 'raw_material' && line.raw_material_id) {
      const { data: pvs, error: q0 } = await supabase
        .from('material_stock')
        .select('id, quantity')
        .eq('material_id', line.raw_material_id)
        .eq('branch_id', params.fulfillingBranchId)
        .maybeSingle();
      if (q0) throw q0;
      if (!pvs) {
        throw new Error(
          `Sending branch has no material stock row for this line (raw material / catalogue id). ` +
            `Ensure stock exists at the fulfilling branch for IBR ${params.ibrNumber}.`,
        );
      }
      const onHand = Number((pvs as { quantity: number }).quantity) || 0;
      if (onHand < q) {
        throw new Error(
          `Insufficient material at sending branch for IBR ${params.ibrNumber}: need ${q}, on hand ${onHand}.`,
        );
      }
      const newQ = onHand - q;
      const { error: u1 } = await supabase
        .from('material_stock')
        .update({ quantity: newQ, updated_at: new Date().toISOString() })
        .eq('id', (pvs as { id: string }).id);
      if (u1) throw u1;
      await recalcMaterialTotal(supabase, line.raw_material_id);
    } else if (line.line_kind === 'product' && line.product_variant_id) {
      const { data: pvs, error: pErr } = await supabase
        .from('product_variant_stock')
        .select('id, quantity')
        .eq('variant_id', line.product_variant_id)
        .eq('branch_id', params.fulfillingBranchId)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!pvs) {
        throw new Error(
          `Sending branch has no product stock for this variant. IBR ${params.ibrNumber}.`,
        );
      }
      const onHand = Number((pvs as { quantity: number }).quantity) || 0;
      if (onHand < q) {
        throw new Error(
          `Insufficient product stock at sending branch for IBR ${params.ibrNumber}: need ${q}, on hand ${onHand}.`,
        );
      }
      const newBranch = Math.max(0, onHand - q);
      const { error: u1 } = await supabase
        .from('product_variant_stock')
        .update({ quantity: newBranch, updated_at: new Date().toISOString() })
        .eq('id', (pvs as { id: string }).id);
      if (u1) throw u1;
      await recalcVariantTotal(supabase, line.product_variant_id);

      const { data: vrow } = await supabase
        .from('product_variants')
        .select('sku')
        .eq('id', line.product_variant_id)
        .single();

      const { error: mErr } = await supabase.from('product_stock_movements').insert({
        variant_id: line.product_variant_id,
        variant_sku: (vrow as { sku?: string })?.sku,
        product_name: null,
        movement_type: 'Out',
        quantity: Math.floor(q),
        from_branch: fromCode || null,
        reason: `Inter-branch request ${params.ibrNumber} — in transit (send)`,
        performed_by: params.performedBy,
        reference_number: params.ibrNumber,
        timestamp: new Date().toISOString(),
      });
      if (mErr && import.meta.env.DEV) console.warn('[IBR stock] product_stock_movements', mErr);
    }
  }
}

/**
 * When goods are received at the requesting branch — run when IBR status becomes **Delivered**.
 * Adds to `material_stock` / `product_variant_stock` at the receiving branch (upsert if missing).
 */
export async function applyIbrReceiveStock(
  supabase: SupabaseClient,
  params: {
    requestingBranchId: string;
    requestId: string;
    ibrNumber: string;
    items: InterBranchItemRow[];
    performedBy: string;
  },
): Promise<void> {
  const lines = toLines(params.items);
  const toCode = await branchCode(supabase, params.requestingBranchId);

  for (const line of lines) {
    const q = line.quantity;
    if (q <= 0) continue;
    if (line.line_kind === 'raw_material' && line.raw_material_id) {
      const { data: row } = await supabase
        .from('material_stock')
        .select('id, quantity')
        .eq('material_id', line.raw_material_id)
        .eq('branch_id', params.requestingBranchId)
        .maybeSingle();
      if (row) {
        const n = Number((row as { quantity: number }).quantity) + q;
        const { error: u1 } = await supabase
          .from('material_stock')
          .update({ quantity: n, updated_at: new Date().toISOString() })
          .eq('id', (row as { id: string }).id);
        if (u1) throw u1;
      } else {
        const { error: ins } = await supabase.from('material_stock').insert({
          material_id: line.raw_material_id,
          branch_id: params.requestingBranchId,
          quantity: q,
        });
        if (ins) throw ins;
      }
      await recalcMaterialTotal(supabase, line.raw_material_id);
    } else if (line.line_kind === 'product' && line.product_variant_id) {
      const { data: row } = await supabase
        .from('product_variant_stock')
        .select('id, quantity')
        .eq('variant_id', line.product_variant_id)
        .eq('branch_id', params.requestingBranchId)
        .maybeSingle();
      const addQ = Math.floor(q);
      if (row) {
        const n = Number((row as { quantity: number }).quantity) + addQ;
        const { error: u1 } = await supabase
          .from('product_variant_stock')
          .update({ quantity: n, updated_at: new Date().toISOString() })
          .eq('id', (row as { id: string }).id);
        if (u1) throw u1;
      } else {
        const { error: ins } = await supabase.from('product_variant_stock').insert({
          variant_id: line.product_variant_id,
          branch_id: params.requestingBranchId,
          quantity: addQ,
        });
        if (ins) throw ins;
      }
      await recalcVariantTotal(supabase, line.product_variant_id);

      const { data: vrow } = await supabase
        .from('product_variants')
        .select('sku')
        .eq('id', line.product_variant_id)
        .single();

      const { error: mErr } = await supabase.from('product_stock_movements').insert({
        variant_id: line.product_variant_id,
        variant_sku: (vrow as { sku?: string })?.sku,
        product_name: null,
        movement_type: 'In',
        quantity: addQ,
        to_branch: toCode || null,
        reason: `Inter-branch request ${params.ibrNumber} — received`,
        performed_by: params.performedBy,
        reference_number: params.ibrNumber,
        timestamp: new Date().toISOString(),
      });
      if (mErr && import.meta.env.DEV) console.warn('[IBR stock] product_stock_movements', mErr);
    }
  }
}
