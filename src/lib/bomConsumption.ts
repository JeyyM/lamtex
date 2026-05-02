import { supabase } from '@/src/lib/supabase';

/** material_status enum: no "Critical" — valid values for raw_materials.status */
function materialAggStatus(q: number, reorder: number): string {
  if (q <= 0) return 'Out of Stock';
  if (q <= reorder) return 'Low Stock';
  return 'Active';
}

export async function validateBomConsumption(
  variantId: string,
  branchId: string,
  unitsProduced: number,
): Promise<void> {
  if (unitsProduced <= 0) return;
  const needs = await computeAggregatedBomNeeds([{ variantId, units: unitsProduced }]);
  await validateAggregatedBomNeeds(needs, branchId);
}

export async function applyBomConsumptionDeductions(
  variantId: string,
  branchId: string,
  unitsProduced: number,
): Promise<void> {
  if (unitsProduced <= 0) return;
  const needs = await computeAggregatedBomNeeds([{ variantId, units: unitsProduced }]);
  await applyAggregatedBomDeductions(needs, branchId);
}

/** Per raw_material_id, total quantity to consume at this branch (sums all lines / variants). */
export async function computeAggregatedBomNeeds(
  lines: { variantId: string; units: number }[],
): Promise<Map<string, number>> {
  const needByMaterial = new Map<string, number>();

  for (const { variantId, units } of lines) {
    if (units <= 0) continue;

    const { data: bom, error: bomErr } = await supabase
      .from('product_variant_raw_materials')
      .select('raw_material_id, quantity_needed')
      .eq('variant_id', variantId);

    if (bomErr) throw bomErr;
    if (!bom?.length) {
      continue;
    }

    for (const row of bom) {
      const need = Number(row.quantity_needed) * units;
      if (!Number.isFinite(need) || need <= 0) continue;
      const id = row.raw_material_id;
      needByMaterial.set(id, (needByMaterial.get(id) ?? 0) + need);
    }
  }

  return needByMaterial;
}

export async function validateAggregatedBomNeeds(
  needByMaterial: Map<string, number>,
  branchId: string,
): Promise<void> {
  for (const [materialId, need] of needByMaterial) {
    if (need <= 0) continue;

    const { data: ms, error: msErr } = await supabase
      .from('material_stock')
      .select('quantity')
      .eq('material_id', materialId)
      .eq('branch_id', branchId)
      .maybeSingle();
    if (msErr) throw msErr;

    const have = Number(ms?.quantity ?? 0);
    if (have < need) {
      const { data: rm } = await supabase
        .from('raw_materials')
        .select('name')
        .eq('id', materialId)
        .maybeSingle();
      throw new Error(
        `Insufficient ${rm?.name ?? 'raw material'}: need ${need.toFixed(4)} at this branch, have ${have.toFixed(4)}.`,
      );
    }
  }
}

export async function applyAggregatedBomDeductions(
  needByMaterial: Map<string, number>,
  branchId: string,
): Promise<void> {
  for (const [materialId, need] of needByMaterial) {
    if (need <= 0) continue;

    const { data: ms } = await supabase
      .from('material_stock')
      .select('quantity')
      .eq('material_id', materialId)
      .eq('branch_id', branchId)
      .maybeSingle();
    const prev = Number(ms?.quantity ?? 0);
    const next = Math.max(0, prev - need);

    const { error: upMs } = await supabase
      .from('material_stock')
      .update({ quantity: next, updated_at: new Date().toISOString() })
      .eq('material_id', materialId)
      .eq('branch_id', branchId);
    if (upMs) throw upMs;

    const { data: rmRow } = await supabase
      .from('raw_materials')
      .select('total_stock, reorder_point')
      .eq('id', materialId)
      .maybeSingle();
    if (rmRow) {
      const nextTotal = Math.max(0, Number(rmRow.total_stock) - need);
      const st = materialAggStatus(nextTotal, Number(rmRow.reorder_point) || 0);
      const { error: upRm } = await supabase
        .from('raw_materials')
        .update({
          total_stock: nextTotal,
          status: st,
          updated_at: new Date().toISOString(),
        })
        .eq('id', materialId);
      if (upRm) throw upRm;
    }
  }
}

/** Validate + deduct BOM for multiple variant lines (e.g. entire production request). */
export async function consumeBomForProductionLines(
  branchId: string,
  lines: { variantId: string; units: number }[],
): Promise<void> {
  const needs = await computeAggregatedBomNeeds(lines);
  if (needs.size === 0) return;
  await validateAggregatedBomNeeds(needs, branchId);
  await applyAggregatedBomDeductions(needs, branchId);
}
