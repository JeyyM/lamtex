import type { SupabaseClient } from '@supabase/supabase-js';
import { refreshParentProductStatus } from '@/src/lib/productAggregateStatus';
import { computePersistedStockStatus } from '@/src/lib/stockStatus';
import { supabase as defaultSupabase } from '@/src/lib/supabase';
import { notifyProductStockAlertEmails } from '@/src/lib/notifications/notificationsData';

export type VariantBranchStockResult = {
  oldBranchQty: number;
  newBranchQty: number;
  totalStock: number;
};

/** Fire in-app Inventory alerts when stock crosses reorder / out-of-stock thresholds. */
export async function notifyProductStockThresholdCrossed(
  params: {
    variantId: string;
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
    p_variant_id: params.variantId,
    p_old_stock: Math.round(params.oldStock),
    p_new_stock: Math.round(params.newStock),
    p_old_rp: params.oldReorderPoint ?? null,
    p_new_rp: params.newReorderPoint ?? null,
    p_branch_id: params.branchId ?? null,
  };
  console.info('[stock-notify] calling notify_product_stock_threshold_rpc', rpcArgs);
  const { data, error } = await client.rpc('notify_product_stock_threshold_rpc', rpcArgs);
  if (error) {
    console.error(
      '[stock-notify] notify_product_stock_threshold_rpc failed — run database/notifications_product_stock_alerts.sql in Supabase',
      error,
    );
    return;
  }
  console.info('[stock-notify] RPC result', data);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lamtex:notifications-refresh'));
  }

  // Email out the same alerts to Executives + Warehouse so they reach inboxes,
  // not just the in-app bell. Severity is derived client-side using the same
  // rules the SQL function uses so we don't double-fire on no-op writes.
  void notifyProductStockAlertEmails({
    variantId: params.variantId,
    branchId: params.branchId,
    oldStock: params.oldStock,
    newStock: params.newStock,
    oldReorderPoint: params.oldReorderPoint,
    newReorderPoint: params.newReorderPoint,
    triggeredBy: params.triggeredBy ?? null,
  }).catch((err) => console.warn('[stock-notify] alert email dispatch failed', err));
}

async function sumVariantBranchStock(
  variantId: string,
  client: SupabaseClient,
): Promise<number> {
  const { data, error } = await client
    .from('product_variant_stock')
    .select('quantity')
    .eq('variant_id', variantId);
  if (error) throw error;
  return (data ?? []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
}

async function readBranchQuantity(
  variantId: string,
  branchId: string,
  client: SupabaseClient,
): Promise<number> {
  const { data, error } = await client
    .from('product_variant_stock')
    .select('quantity')
    .eq('variant_id', variantId)
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error) throw error;
  return data ? Number(data.quantity) || 0 : 0;
}

/** Set branch quantity, rollup total_stock, refresh status, and notify on threshold cross. */
export async function setVariantBranchQuantity(
  params: {
    variantId: string;
    productId: string;
    branchId: string;
    quantity: number;
    reorderPoint: number;
    updateLastRestocked?: boolean;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<VariantBranchStockResult> {
  const qty = Math.max(0, Math.round(params.quantity));
  const oldBranchQty = await readBranchQuantity(params.variantId, params.branchId, client);

  const { error: upsertErr } = await client.from('product_variant_stock').upsert(
    {
      variant_id: params.variantId,
      branch_id: params.branchId,
      quantity: qty,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'variant_id,branch_id' },
  );
  if (upsertErr) throw upsertErr;

  const totalStock = await sumVariantBranchStock(params.variantId, client);
  const newStatus = computePersistedStockStatus(totalStock, params.reorderPoint);
  const varPayload: Record<string, unknown> = {
    total_stock: totalStock,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (params.updateLastRestocked) {
    varPayload.last_restocked = new Date().toISOString();
  }
  const { error: varErr } = await client
    .from('product_variants')
    .update(varPayload)
    .eq('id', params.variantId);
  if (varErr) throw varErr;

  void notifyProductStockThresholdCrossed(
    {
      variantId: params.variantId,
      oldStock: oldBranchQty,
      newStock: qty,
      newReorderPoint: params.reorderPoint,
      oldReorderPoint: params.reorderPoint,
      branchId: params.branchId,
    },
    client,
  ).catch((err) => console.warn('[stock-notify] branch quantity notify failed', err));

  await refreshParentProductStatus(params.productId);
  return { oldBranchQty, newBranchQty: qty, totalStock };
}

/** Apply a signed delta at a branch (negative = deduction). */
export async function applyVariantBranchStockDelta(
  params: {
    variantId: string;
    productId: string;
    branchId: string;
    delta: number;
    reorderPoint: number;
    updateLastRestocked?: boolean;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<VariantBranchStockResult> {
  const oldBranchQty = await readBranchQuantity(params.variantId, params.branchId, client);
  const nextQty = Math.max(0, Math.round(oldBranchQty + params.delta));
  return setVariantBranchQuantity(
    {
      ...params,
      quantity: nextQty,
    },
    client,
  );
}

/** Legacy / inline edit path: set aggregate total_stock directly (no branch rows). */
export async function setVariantTotalStockDirect(
  params: {
    variantId: string;
    productId: string;
    totalStock: number;
    previousTotalStock: number;
    reorderPoint: number;
    previousReorderPoint?: number;
    updateLastRestocked?: boolean;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<void> {
  const totalStock = Math.max(0, Math.round(params.totalStock));
  const newStatus = computePersistedStockStatus(totalStock, params.reorderPoint);
  const varPayload: Record<string, unknown> = {
    total_stock: totalStock,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (params.updateLastRestocked) {
    varPayload.last_restocked = new Date().toISOString();
  }
  const { error: varErr } = await client
    .from('product_variants')
    .update(varPayload)
    .eq('id', params.variantId);
  if (varErr) throw varErr;

  void notifyProductStockThresholdCrossed(
    {
      variantId: params.variantId,
      oldStock: params.previousTotalStock,
      newStock: totalStock,
      oldReorderPoint: params.previousReorderPoint ?? params.reorderPoint,
      newReorderPoint: params.reorderPoint,
    },
    client,
  ).catch((err) => console.warn('[stock-notify] total stock notify failed', err));

  await refreshParentProductStatus(params.productId);
}

/** Shipment / order dispatch: deduct branch stock and notify on threshold cross. */
export async function deductVariantBranchStock(
  params: {
    variantId: string;
    branchId: string;
    quantity: number;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<void> {
  const qty = Math.floor(params.quantity);
  if (qty <= 0) return;

  const { data: variant, error } = await client
    .from('product_variants')
    .select('product_id, reorder_point')
    .eq('id', params.variantId)
    .maybeSingle();
  if (error) throw error;
  if (!variant?.product_id) throw new Error('Product variant not found for stock deduction.');

  await applyVariantBranchStockDelta(
    {
      variantId: params.variantId,
      productId: String(variant.product_id),
      branchId: params.branchId,
      delta: -qty,
      reorderPoint: Number(variant.reorder_point) || 0,
    },
    client,
  );
}

/** Notify when reorder_point alone changes (stock unchanged). */
export async function notifyVariantReorderPointChange(
  params: {
    variantId: string;
    totalStock: number;
    oldReorderPoint: number;
    newReorderPoint: number;
  },
  client: SupabaseClient = defaultSupabase,
): Promise<void> {
  await notifyProductStockThresholdCrossed(
    {
      variantId: params.variantId,
      oldStock: params.totalStock,
      newStock: params.totalStock,
      oldReorderPoint: params.oldReorderPoint,
      newReorderPoint: params.newReorderPoint,
    },
    client,
  );
}
