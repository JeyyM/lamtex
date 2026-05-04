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

/** Optional row-level context written to `material_consumption` for analytics. */
export type MaterialConsumptionLogMeta = {
  productId?: string | null;
  productName?: string | null;
  remarks?: string | null;
};

export async function applyBomConsumptionDeductions(
  variantId: string,
  branchId: string,
  unitsProduced: number,
): Promise<void> {
  if (unitsProduced <= 0) return;
  const needs = await computeAggregatedBomNeeds([{ variantId, units: unitsProduced }]);
  const { data: pv } = await supabase
    .from('product_variants')
    .select('product_id, products(name)')
    .eq('id', variantId)
    .maybeSingle();
  const rawP = pv?.products as { name?: string } | { name?: string }[] | null | undefined;
  const productName =
    rawP == null ? null : Array.isArray(rawP) ? rawP[0]?.name ?? null : rawP.name ?? null;
  await applyAggregatedBomDeductions(needs, branchId, {
    productId: pv?.product_id ?? null,
    productName,
    remarks: 'BOM: finished good stock increase',
  });
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

/**
 * Branch-aware quantity for BOM checks:
 * - If `material_stock` exists for (material, branch), use it.
 * - Else if **any** per-branch row exists for this material, treat this branch as 0 (stock lives elsewhere).
 * - Else (legacy: no `material_stock` rows) use `raw_materials.total_stock` so aggregate-only inventory still works.
 */
async function availableRawMaterialQtyForBranch(materialId: string, branchId: string): Promise<number> {
  const { data: ms, error: msErr } = await supabase
    .from('material_stock')
    .select('quantity')
    .eq('material_id', materialId)
    .eq('branch_id', branchId)
    .maybeSingle();
  if (msErr) throw msErr;
  if (ms && ms.quantity != null) return Number(ms.quantity) || 0;

  const { count, error: cErr } = await supabase
    .from('material_stock')
    .select('id', { count: 'exact', head: true })
    .eq('material_id', materialId);
  if (cErr) throw cErr;
  if ((count ?? 0) > 0) return 0;

  const { data: rm, error: rmErr } = await supabase
    .from('raw_materials')
    .select('total_stock')
    .eq('id', materialId)
    .maybeSingle();
  if (rmErr) throw rmErr;
  return Number(rm?.total_stock ?? 0);
}

export async function validateAggregatedBomNeeds(
  needByMaterial: Map<string, number>,
  branchId: string,
): Promise<void> {
  for (const [materialId, need] of needByMaterial) {
    if (need <= 0) continue;

    const have = await availableRawMaterialQtyForBranch(materialId, branchId);
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

async function insertMaterialConsumptionLedger(
  branchId: string,
  entries: { materialId: string; quantity: number }[],
  logMeta?: MaterialConsumptionLogMeta | null,
): Promise<void> {
  if (entries.length === 0) return;
  const { data: br } = await supabase.from('branches').select('code').eq('id', branchId).maybeSingle();
  const branchCode = (br as { code?: string } | null)?.code ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const remark = (logMeta?.remarks?.trim() || 'BOM consumption') as string;

  const ids = [...new Set(entries.map((e) => e.materialId))];
  const { data: rms } = await supabase.from('raw_materials').select('id, cost_per_unit').in('id', ids);
  const costById = new Map<string, number>();
  for (const r of rms ?? []) {
    const id = (r as { id: string }).id;
    costById.set(id, Number((r as { cost_per_unit?: unknown }).cost_per_unit) || 0);
  }

  const { error } = await supabase.from('material_consumption').insert(
    entries.map((e) => {
      const cpu = costById.get(e.materialId) ?? 0;
      const qty = e.quantity;
      return {
        material_id: e.materialId,
        quantity_consumed: qty,
        consumption_date: today,
        branch: branchCode,
        product_id: logMeta?.productId ?? null,
        product_name: logMeta?.productName ?? null,
        remarks: remark,
        cost_per_unit: cpu,
        total_cost: Math.round(cpu * qty * 100) / 100,
      };
    }),
  );
  if (error) throw error;
}

export async function applyAggregatedBomDeductions(
  needByMaterial: Map<string, number>,
  branchId: string,
  logMeta?: MaterialConsumptionLogMeta | null,
): Promise<void> {
  const ledger: { materialId: string; quantity: number }[] = [];

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

    ledger.push({ materialId, quantity: need });
  }

  await insertMaterialConsumptionLedger(branchId, ledger, logMeta);
}

/** Validate + deduct BOM for multiple variant lines (e.g. entire production request). */
export async function consumeBomForProductionLines(
  branchId: string,
  lines: { variantId: string; units: number }[],
): Promise<void> {
  const needs = await computeAggregatedBomNeeds(lines);
  if (needs.size === 0) return;
  await validateAggregatedBomNeeds(needs, branchId);
  await applyAggregatedBomDeductions(needs, branchId, { remarks: 'BOM: production request' });
}
