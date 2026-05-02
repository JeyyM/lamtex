import { SupabaseClient } from '@supabase/supabase-js';
import type { InterBranchItemRow } from './interBranchRequest';

async function branchCode(supabase: SupabaseClient, branchId: string): Promise<string> {
  const { data } = await supabase.from('branches').select('code').eq('id', branchId).maybeSingle();
  return (data as { code?: string } | null)?.code ?? '';
}

export async function recalcMaterialTotal(supabase: SupabaseClient, materialId: string) {
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

async function deductMaterialFromBranch(
  supabase: SupabaseClient,
  params: { fulfillingBranchId: string; ibrNumber: string; materialId: string; q: number },
) {
  const { q, fulfillingBranchId, ibrNumber, materialId } = params;
  const { data: pvs, error: q0 } = await supabase
    .from('material_stock')
    .select('id, quantity')
    .eq('material_id', materialId)
    .eq('branch_id', fulfillingBranchId)
    .maybeSingle();
  if (q0) throw q0;
  if (!pvs) {
    throw new Error(
      `Sending branch has no material stock row for this line (raw material / catalogue id). ` +
        `Ensure stock exists at the fulfilling branch for IBR ${ibrNumber}.`,
    );
  }
  const onHand = Number((pvs as { quantity: number }).quantity) || 0;
  if (onHand < q) {
    throw new Error(
      `Insufficient material at sending branch for IBR ${ibrNumber}: need ${q}, on hand ${onHand}.`,
    );
  }
  const newQ = onHand - q;
  const { error: u1 } = await supabase
    .from('material_stock')
    .update({ quantity: newQ, updated_at: new Date().toISOString() })
    .eq('id', (pvs as { id: string }).id);
  if (u1) throw u1;
  await recalcMaterialTotal(supabase, materialId);
}

async function deductProductFromBranch(
  supabase: SupabaseClient,
  params: {
    fulfillingBranchId: string;
    ibrNumber: string;
    variantId: string;
    q: number;
    performedBy: string;
    fromCode: string;
  },
) {
  const { fulfillingBranchId, ibrNumber, variantId, q, performedBy, fromCode } = params;
  const { data: pvs, error: pErr } = await supabase
    .from('product_variant_stock')
    .select('id, quantity')
    .eq('variant_id', variantId)
    .eq('branch_id', fulfillingBranchId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!pvs) {
    throw new Error(`Sending branch has no product stock for this variant. IBR ${ibrNumber}.`);
  }
  const onHand = Number((pvs as { quantity: number }).quantity) || 0;
  if (onHand < q) {
    throw new Error(
      `Insufficient product stock at sending branch for IBR ${ibrNumber}: need ${q}, on hand ${onHand}.`,
    );
  }
  const newBranch = Math.max(0, onHand - q);
  const { error: u1 } = await supabase
    .from('product_variant_stock')
    .update({ quantity: newBranch, updated_at: new Date().toISOString() })
    .eq('id', (pvs as { id: string }).id);
  if (u1) throw u1;
  await recalcVariantTotal(supabase, variantId);

  const { data: vrow } = await supabase.from('product_variants').select('sku').eq('id', variantId).single();

  const { error: mErr } = await supabase.from('product_stock_movements').insert({
    variant_id: variantId,
    variant_sku: (vrow as { sku?: string })?.sku,
    product_name: null,
    movement_type: 'Out',
    quantity: Math.floor(q),
    from_branch: fromCode || null,
    reason: `Inter-branch request ${ibrNumber} — in transit (send)`,
    performed_by: performedBy,
    reference_number: ibrNumber,
    timestamp: new Date().toISOString(),
  });
  if (mErr && import.meta.env.DEV) console.warn('[IBR stock] product_stock_movements', mErr);
}

function clampShipForLine(item: InterBranchItemRow, requested: number): number {
  const ordered = Number(item.quantity) || 0;
  const shippedBefore = Number(item.quantity_shipped) || 0;
  const remaining = Math.max(0, ordered - shippedBefore);
  if (requested < 0) return 0;
  return Math.min(requested, remaining);
}

/**
 * When goods leave the fulfilling (sender) branch — run when IBR status becomes **In Transit**
 * (each partial shipment). Deducts `material_stock` / `product_variant_stock` at the sending branch
 * and increments `inter_branch_request_items.quantity_shipped`.
 */
export async function applyIbrShipStock(
  supabase: SupabaseClient,
  params: {
    fulfillingBranchId: string;
    requestId: string;
    ibrNumber: string;
    items: InterBranchItemRow[];
    /** Per item id: units to ship on this event (clamped to ordered − quantity_shipped). */
    shipQuantitiesByItemId: Record<string, number>;
    performedBy: string;
  },
): Promise<void> {
  const fromCode = await branchCode(supabase, params.fulfillingBranchId);

  for (const item of params.items) {
    const rawQ = Number(params.shipQuantitiesByItemId[item.id] ?? 0) || 0;
    const shipQ = clampShipForLine(item, rawQ);
    if (shipQ <= 0) continue;

    if (item.line_kind === 'raw_material' && item.raw_material_id) {
      await deductMaterialFromBranch(supabase, {
        fulfillingBranchId: params.fulfillingBranchId,
        ibrNumber: params.ibrNumber,
        materialId: item.raw_material_id,
        q: shipQ,
      });
    } else if (item.line_kind === 'product' && item.product_variant_id) {
      await deductProductFromBranch(supabase, {
        fulfillingBranchId: params.fulfillingBranchId,
        ibrNumber: params.ibrNumber,
        variantId: item.product_variant_id,
        q: shipQ,
        performedBy: params.performedBy,
        fromCode,
      });
    }

    const shippedBefore = Number(item.quantity_shipped) || 0;
    const newShipped = shippedBefore + shipQ;
    const { error: uItem } = await supabase
      .from('inter_branch_request_items')
      .update({ quantity_shipped: newShipped })
      .eq('id', item.id);
    if (uItem) throw uItem;
    item.quantity_shipped = newShipped;
  }
}

/**
 * When goods are received at the requesting branch. Adds stock at the receiving branch and
 * increments `quantity_delivered` by the amount received **this event** (clamped to pending in transit:
 * `quantity_shipped - quantity_delivered`).
 */
export async function applyIbrReceiveStock(
  supabase: SupabaseClient,
  params: {
    requestingBranchId: string;
    requestId: string;
    ibrNumber: string;
    items: InterBranchItemRow[];
    performedBy: string;
    /** Per line id: units to receive now. Omitted = receive full pending per line. */
    receiveQuantitiesByItemId?: Record<string, number>;
  },
): Promise<void> {
  const toCode = await branchCode(supabase, params.requestingBranchId);
  const explicit = params.receiveQuantitiesByItemId;

  for (const item of params.items) {
    const shipped = Number(item.quantity_shipped) || 0;
    const deliveredBefore = Number(item.quantity_delivered) || 0;
    const pending = Math.max(0, shipped - deliveredBefore);
    if (pending <= 0) continue;

    let recv: number;
    if (explicit && Object.prototype.hasOwnProperty.call(explicit, item.id)) {
      const raw = Number(explicit[item.id] ?? 0) || 0;
      recv = Math.min(Math.max(0, raw), pending);
    } else {
      recv = pending;
    }
    if (recv <= 0) continue;

    if (item.line_kind === 'raw_material' && item.raw_material_id) {
      const { data: row } = await supabase
        .from('material_stock')
        .select('id, quantity')
        .eq('material_id', item.raw_material_id)
        .eq('branch_id', params.requestingBranchId)
        .maybeSingle();
      if (row) {
        const n = Number((row as { quantity: number }).quantity) + recv;
        const { error: u1 } = await supabase
          .from('material_stock')
          .update({ quantity: n, updated_at: new Date().toISOString() })
          .eq('id', (row as { id: string }).id);
        if (u1) throw u1;
      } else {
        const { error: ins } = await supabase.from('material_stock').insert({
          material_id: item.raw_material_id,
          branch_id: params.requestingBranchId,
          quantity: recv,
        });
        if (ins) throw ins;
      }
      await recalcMaterialTotal(supabase, item.raw_material_id);
      const today = new Date().toISOString().split('T')[0];
      const { error: matTouchErr } = await supabase
        .from('raw_materials')
        .update({ last_restock_date: today, updated_at: new Date().toISOString() })
        .eq('id', item.raw_material_id);
      if (matTouchErr) throw matTouchErr;
    } else if (item.line_kind === 'product' && item.product_variant_id) {
      const stockRecv = Math.floor(recv);
      const { data: row } = await supabase
        .from('product_variant_stock')
        .select('id, quantity')
        .eq('variant_id', item.product_variant_id)
        .eq('branch_id', params.requestingBranchId)
        .maybeSingle();
      const addQ = stockRecv;
      if (row) {
        const n = Number((row as { quantity: number }).quantity) + addQ;
        const { error: u1 } = await supabase
          .from('product_variant_stock')
          .update({ quantity: n, updated_at: new Date().toISOString() })
          .eq('id', (row as { id: string }).id);
        if (u1) throw u1;
      } else {
        const { error: ins } = await supabase.from('product_variant_stock').insert({
          variant_id: item.product_variant_id,
          branch_id: params.requestingBranchId,
          quantity: addQ,
        });
        if (ins) throw ins;
      }
      await recalcVariantTotal(supabase, item.product_variant_id);
      const { error: pvTouchErr } = await supabase
        .from('product_variants')
        .update({ last_restocked: new Date().toISOString() })
        .eq('id', item.product_variant_id);
      if (pvTouchErr) throw pvTouchErr;

      const { data: vrow } = await supabase
        .from('product_variants')
        .select('sku')
        .eq('id', item.product_variant_id)
        .single();

      const { error: mErr } = await supabase.from('product_stock_movements').insert({
        variant_id: item.product_variant_id,
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

    const deliveredDelta =
      item.line_kind === 'product' && item.product_variant_id ? Math.floor(recv) : recv;
    const newDelivered = deliveredBefore + deliveredDelta;
    const { error: uItem } = await supabase
      .from('inter_branch_request_items')
      .update({ quantity_delivered: newDelivered })
      .eq('id', item.id);
    if (uItem) throw uItem;
    item.quantity_delivered = newDelivered;
  }
}
