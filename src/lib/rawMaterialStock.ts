import type { SupabaseClient } from '@supabase/supabase-js';
import { computePersistedStockStatus } from '@/src/lib/stockStatus';
import { supabase as defaultSupabase } from '@/src/lib/supabase';
import { notifyMaterialStockAlertEmails } from '@/src/lib/notifications/notificationsData';

export type MaterialBranchStockResult = {
  oldBranchQty: number;
  newBranchQty: number;
  totalStock: number;
};

/**
 * Fire in-app Inventory alerts (RPC) and corresponding emails when a raw
 * material's stock crosses reorder / out-of-stock thresholds.
 *
 * Mirrors `notifyProductStockThresholdCrossed` in `productVariantStock.ts`.
 */
export async function notifyMaterialStockThresholdCrossed(
  params: {
    materialId: string;
    oldStock: number;
    newStock: number;
    oldReorderPoint?: number;
    newReorderPoint?: number;
    branchId?: string | null;
    triggeredBy?: string | null;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<void> {
  const rpcArgs = {
    p_material_id: params.materialId,
    p_old_stock: params.oldStock,
    p_new_stock: params.newStock,
    p_old_rp: params.oldReorderPoint ?? null,
    p_new_rp: params.newReorderPoint ?? null,
    p_branch_id: params.branchId ?? null,
  };
  console.info('[material-stock-notify] calling notify_material_stock_threshold_rpc', rpcArgs);
  const { data, error } = await client.rpc('notify_material_stock_threshold_rpc', rpcArgs);
  if (error) {
    console.error(
      '[material-stock-notify] notify_material_stock_threshold_rpc failed — run database/notifications_material_stock_alerts.sql in Supabase',
      error,
    );
    return;
  }
  console.info('[material-stock-notify] RPC result', data);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lamtex:notifications-refresh'));
  }

  void notifyMaterialStockAlertEmails({
    materialId: params.materialId,
    branchId: params.branchId,
    oldStock: params.oldStock,
    newStock: params.newStock,
    oldReorderPoint: params.oldReorderPoint,
    newReorderPoint: params.newReorderPoint,
    triggeredBy: params.triggeredBy ?? null,
  }).catch((err) => console.warn('[material-stock-notify] alert email dispatch failed', err));
}

export async function readMaterialAggregateStock(
  materialId: string,
  client: SupabaseClient = defaultSupabase,
): Promise<{ totalStock: number; reorderPoint: number } | null> {
  const { data, error } = await client
    .from('raw_materials')
    .select('total_stock, reorder_point')
    .eq('id', materialId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    totalStock: Number((data as { total_stock?: number }).total_stock) || 0,
    reorderPoint: Number((data as { reorder_point?: number }).reorder_point) || 0,
  };
}

export async function readMaterialBranchQuantity(
  materialId: string,
  branchId: string,
  client: SupabaseClient = defaultSupabase,
): Promise<number> {
  const { data, error } = await client
    .from('material_stock')
    .select('quantity')
    .eq('material_id', materialId)
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error || !data) return 0;
  return Number((data as { quantity?: number }).quantity) || 0;
}

async function sumMaterialBranchStock(
  materialId: string,
  client: SupabaseClient,
): Promise<number> {
  const { data, error } = await client
    .from('material_stock')
    .select('quantity')
    .eq('material_id', materialId);
  if (error) throw error;
  return (data ?? []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
}

/** Set branch quantity, rollup total_stock, refresh status, and notify on threshold cross. */
export async function setMaterialBranchQuantity(
  params: {
    materialId: string;
    branchId: string;
    quantity: number;
    reorderPoint: number;
    updateLastRestocked?: boolean;
    triggeredBy?: string | null;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<MaterialBranchStockResult> {
  const qty = Math.max(0, params.quantity);
  const oldBranchQty = await readMaterialBranchQuantity(params.materialId, params.branchId, client);

  const { error: upsertErr } = await client.from('material_stock').upsert(
    {
      material_id: params.materialId,
      branch_id: params.branchId,
      quantity: qty,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'material_id,branch_id' },
  );
  if (upsertErr) {
    const msg = upsertErr.message ?? '';
    if (msg.includes('row-level security') || (upsertErr as { code?: string }).code === '42501') {
      throw new Error(
        'Cannot write branch stock — missing INSERT permission on material_stock. ' +
          'Run database/rls_inventory_stock_adjustment_writes.sql in the Supabase SQL editor.',
      );
    }
    throw upsertErr;
  }

  const totalStock = await sumMaterialBranchStock(params.materialId, client);
  const newStatus = computePersistedStockStatus(totalStock, params.reorderPoint);
  const matPayload: Record<string, unknown> = {
    total_stock: totalStock,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (params.updateLastRestocked) {
    matPayload.last_restock_date = new Date().toISOString().split('T')[0];
  }
  const { error: matErr } = await client
    .from('raw_materials')
    .update(matPayload)
    .eq('id', params.materialId);
  if (matErr) throw matErr;

  void notifyMaterialStockThresholdCrossed(
    {
      materialId: params.materialId,
      oldStock: oldBranchQty,
      newStock: qty,
      oldReorderPoint: params.reorderPoint,
      newReorderPoint: params.reorderPoint,
      branchId: params.branchId,
      triggeredBy: params.triggeredBy ?? null,
    },
    client,
  ).catch((err) => console.warn('[material-stock-notify] branch quantity notify failed', err));

  return { oldBranchQty, newBranchQty: qty, totalStock };
}

/** Apply a signed delta at a branch (negative = deduction). */
export async function applyMaterialBranchStockDelta(
  params: {
    materialId: string;
    branchId: string;
    delta: number;
    reorderPoint: number;
    updateLastRestocked?: boolean;
    triggeredBy?: string | null;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<MaterialBranchStockResult> {
  const oldBranchQty = await readMaterialBranchQuantity(params.materialId, params.branchId, client);
  const nextQty = Math.max(0, oldBranchQty + params.delta);
  return setMaterialBranchQuantity(
    {
      materialId: params.materialId,
      branchId: params.branchId,
      quantity: nextQty,
      reorderPoint: params.reorderPoint,
      updateLastRestocked: params.updateLastRestocked,
      triggeredBy: params.triggeredBy,
    },
    client,
  );
}

/** Org-wide edit path: set aggregate total_stock directly (no branch rows). */
export async function setMaterialTotalStockDirect(
  params: {
    materialId: string;
    totalStock: number;
    previousTotalStock: number;
    reorderPoint: number;
    previousReorderPoint?: number;
    updateLastRestocked?: boolean;
    triggeredBy?: string | null;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<void> {
  const totalStock = Math.max(0, params.totalStock);
  const newStatus = computePersistedStockStatus(totalStock, params.reorderPoint);
  const matPayload: Record<string, unknown> = {
    total_stock: totalStock,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (params.updateLastRestocked) {
    matPayload.last_restock_date = new Date().toISOString().split('T')[0];
  }
  const { error: matErr } = await client
    .from('raw_materials')
    .update(matPayload)
    .eq('id', params.materialId);
  if (matErr) throw matErr;

  void notifyMaterialStockThresholdCrossed(
    {
      materialId: params.materialId,
      oldStock: params.previousTotalStock,
      newStock: totalStock,
      oldReorderPoint: params.previousReorderPoint ?? params.reorderPoint,
      newReorderPoint: params.reorderPoint,
      triggeredBy: params.triggeredBy ?? null,
    },
    client,
  ).catch((err) => console.warn('[material-stock-notify] total stock notify failed', err));
}

/** Overwrite stock from the material edit form (branch-scoped or org-wide). */
export async function overwriteMaterialStock(
  params: {
    materialId: string;
    branchName: string | null | undefined;
    newQuantity: number;
    previousQuantity: number;
    reorderPoint: number;
    triggeredBy?: string | null;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<number> {
  const qty = Math.max(0, params.newQuantity);
  let resolvedBranchId: string | null = null;
  const branchName = params.branchName?.trim();
  if (branchName) {
    const { data: branchRow } = await client
      .from('branches')
      .select('id')
      .eq('name', branchName)
      .maybeSingle();
    resolvedBranchId = branchRow?.id ?? null;
  }

  if (resolvedBranchId) {
    const result = await setMaterialBranchQuantity(
      {
        materialId: params.materialId,
        branchId: resolvedBranchId,
        quantity: qty,
        reorderPoint: params.reorderPoint,
        triggeredBy: params.triggeredBy ?? null,
      },
      client,
    );
    return result.totalStock;
  }

  await setMaterialTotalStockDirect(
    {
      materialId: params.materialId,
      totalStock: qty,
      previousTotalStock: params.previousQuantity,
      reorderPoint: params.reorderPoint,
      triggeredBy: params.triggeredBy ?? null,
    },
    client,
  );
  return qty;
}

/** Shipment / BOM / IBR: deduct branch stock and notify on threshold cross. */
export async function deductMaterialBranchStock(
  params: {
    materialId: string;
    branchId: string;
    quantity: number;
    triggeredBy?: string | null;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<void> {
  const qty = params.quantity;
  if (qty <= 0) return;

  const { data: material, error } = await client
    .from('raw_materials')
    .select('reorder_point')
    .eq('id', params.materialId)
    .maybeSingle();
  if (error) throw error;
  if (!material) throw new Error('Raw material not found for stock deduction.');

  await applyMaterialBranchStockDelta(
    {
      materialId: params.materialId,
      branchId: params.branchId,
      delta: -qty,
      reorderPoint: Number(material.reorder_point) || 0,
      triggeredBy: params.triggeredBy ?? null,
    },
    client,
  );
}

/** Notify when reorder_point alone changes (stock unchanged). */
export async function notifyMaterialReorderPointChange(
  params: {
    materialId: string;
    stock: number;
    oldReorderPoint: number;
    newReorderPoint: number;
    branchId?: string | null;
    triggeredBy?: string | null;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<void> {
  await notifyMaterialStockThresholdCrossed(
    {
      materialId: params.materialId,
      oldStock: params.stock,
      newStock: params.stock,
      oldReorderPoint: params.oldReorderPoint,
      newReorderPoint: params.newReorderPoint,
      branchId: params.branchId,
      triggeredBy: params.triggeredBy,
    },
    client,
  );
}
