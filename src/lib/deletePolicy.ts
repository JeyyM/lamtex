/**
 * Delete / archive / void policy helpers.
 * Tier A = append-only financial & customer-facing records.
 * Tier B = master data → archive (status + archived_at), not hard delete when referenced.
 */

import { supabase } from '@/src/lib/supabase';
import { syncOrderPaymentsFromProofs } from '@/src/lib/orderProofPayments';

/** Order statuses where line items may be replaced via delete-all + re-insert. */
export const ORDER_LINE_ITEM_REPLACEABLE_STATUSES = new Set([
  'Draft',
  'Pending',
  'Rejected',
]);

export function orderAllowsLineItemReplace(status: string | null | undefined): boolean {
  return ORDER_LINE_ITEM_REPLACEABLE_STATUSES.has(String(status ?? '').trim());
}

export function isProofVoided(row: { status?: string | null; voided_at?: string | null }): boolean {
  return row.status === 'voided' || Boolean(row.voided_at);
}

export function canHardDeleteOrderProof(proof: {
  status?: string | null;
  verifiedAt?: string | null;
  verified_at?: string | null;
  commissionPaidAt?: string | null;
  commission_paid_at?: string | null;
}): { allowed: boolean; reason?: string } {
  const verifiedAt = proof.verifiedAt ?? proof.verified_at;
  const commissionPaidAt = proof.commissionPaidAt ?? proof.commission_paid_at;
  if (proof.status === 'verified' || verifiedAt) {
    return { allowed: false, reason: 'Verified proofs cannot be removed. Void the proof instead.' };
  }
  if (commissionPaidAt) {
    return { allowed: false, reason: 'Commission has been released on this proof. Void instead of deleting.' };
  }
  if (proof.status === 'voided') {
    return { allowed: false, reason: 'This proof is already voided.' };
  }
  return { allowed: true };
}

export function canHardDeletePoProof(proof: {
  status?: string | null;
  verified_at?: string | null;
  voided_at?: string | null;
}): { allowed: boolean; reason?: string } {
  if (isProofVoided(proof)) {
    return { allowed: false, reason: 'This proof is already voided.' };
  }
  if (proof.status === 'verified' || proof.verified_at) {
    return { allowed: false, reason: 'Verified PO proofs cannot be removed. Void instead.' };
  }
  return { allowed: true };
}

const PERSISTED_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPersistedUuid(id: string): boolean {
  return PERSISTED_UUID.test(id);
}

export async function countOrderLinesForProduct(productId: string): Promise<number> {
  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  if (vErr) throw new Error(vErr.message);
  const variantIds = (variants ?? []).map((v) => String((v as { id: string }).id));
  if (variantIds.length === 0) return 0;

  const { count, error } = await supabase
    .from('order_line_items')
    .select('id, orders!inner(status)', { count: 'exact', head: true })
    .in('variant_id', variantIds)
    .neq('orders.status', 'Cancelled');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countOrderLinesForVariant(variantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('order_line_items')
    .select('id, orders!inner(status)', { count: 'exact', head: true })
    .eq('variant_id', variantId)
    .neq('orders.status', 'Cancelled');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countOrderLinesForMaterial(materialId: string): Promise<number> {
  const { count, error } = await supabase
    .from('purchase_order_items')
    .select('id, purchase_orders!inner(status)', { count: 'exact', head: true })
    .eq('material_id', materialId)
    .not('purchase_orders.status', 'in', '("Cancelled","Rejected","Draft")');
  if (error) {
    const { count: c2, error: e2 } = await supabase
      .from('purchase_order_items')
      .select('id', { count: 'exact', head: true })
      .eq('material_id', materialId);
    if (e2) throw new Error(e2.message);
    return c2 ?? 0;
  }
  return count ?? 0;
}

export async function archiveProductFamily(
  productId: string,
  actorName: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('products')
    .update({
      status: 'Discontinued',
      is_hidden: true,
      archived_at: new Date().toISOString(),
      archived_by: actorName,
      archive_reason: reason?.trim() || 'Archived from catalog — referenced on orders',
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);
  return { ok: !error, error: error?.message };
}

export async function archiveProductVariant(
  variantId: string,
  actorName: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('product_variants')
    .update({
      status: 'Discontinued',
      is_hidden: true,
      archived_at: new Date().toISOString(),
      archived_by: actorName,
      archive_reason: reason?.trim() || 'Archived from catalog — referenced on orders',
      updated_at: new Date().toISOString(),
    })
    .eq('id', variantId);
  return { ok: !error, error: error?.message };
}

export async function archiveRawMaterial(
  materialId: string,
  actorName: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('raw_materials')
    .update({
      status: 'Discontinued',
      archived_at: new Date().toISOString(),
      archived_by: actorName,
      archive_reason: reason?.trim() || 'Archived — referenced on purchase orders',
      updated_at: new Date().toISOString(),
    })
    .eq('id', materialId);
  return { ok: !error, error: error?.message };
}

export async function updateOrderLineItemsInPlace(
  orderId: string,
  newItems: Array<{
    id: string;
    quantity: number;
    lineTotal: number;
    quantityDelivered?: number | null;
    quantityShipped?: number | null;
    unitPrice?: number;
    discountPercent?: number;
    discountAmount?: number;
  }>,
  oldItems: Array<{ id: string }>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const oldIds = new Set(oldItems.filter((i) => isPersistedUuid(i.id)).map((i) => i.id));
  const newPersisted = newItems.filter((i) => isPersistedUuid(i.id));

  if (newPersisted.length !== oldIds.size) {
    return {
      ok: false,
      error:
        'Line items cannot be added or removed after this order leaves Draft/Pending. Only adjustments on existing lines are allowed.',
    };
  }
  for (const item of newPersisted) {
    if (!oldIds.has(item.id)) {
      return { ok: false, error: 'Cannot add new line items on a settled order.' };
    }
  }
  for (const oldId of oldIds) {
    if (!newPersisted.some((i) => i.id === oldId)) {
      return { ok: false, error: 'Cannot remove line items on a settled order.' };
    }
  }

  for (const item of newPersisted) {
    const { error } = await supabase
      .from('order_line_items')
      .update({
        quantity: item.quantity,
        line_total: item.lineTotal,
        unit_price: item.unitPrice ?? undefined,
        discount_percent: item.discountPercent ?? undefined,
        discount_amount: item.discountAmount ?? undefined,
        quantity_delivered: item.quantityDelivered ?? undefined,
        quantity_shipped: item.quantityShipped ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .eq('order_id', orderId);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function voidOrderProofDocument(params: {
  proofId: string;
  orderUuid: string;
  voidedBy: string;
  reason?: string;
  creditAppliedBefore?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('order_proof_documents')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_by: params.voidedBy,
      void_reason: params.reason?.trim() || 'Voided by staff',
    })
    .eq('id', params.proofId);

  if (error) {
    if (/invalid input value for enum|voided/i.test(error.message)) {
      return {
        ok: false,
        error: 'Proof void requires database migration delete_policy_immutability.sql.',
      };
    }
    return { ok: false, error: error.message };
  }

  const sync = await syncOrderPaymentsFromProofs(params.orderUuid, {
    creditAppliedBefore: params.creditAppliedBefore,
  });
  if (sync.ok === false) return { ok: false, error: sync.error };
  return { ok: true };
}

export async function voidPurchaseOrderProofDocument(params: {
  proofId: string;
  voidedBy: string;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('purchase_order_proof_documents')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_by: params.voidedBy,
      void_reason: params.reason?.trim() || 'Voided by staff',
    })
    .eq('id', params.proofId);

  if (error) {
    if (/invalid input value for enum|voided/i.test(error.message)) {
      return {
        ok: false,
        error: 'Proof void requires database migration delete_policy_immutability.sql.',
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function revokeOrderCustomerPortal(params: {
  portalId: string;
  revokedBy: string;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('order_customer_portals')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: params.revokedBy,
      revoke_reason: params.reason?.trim() || 'Revoked by staff',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.portalId);
  return { ok: !error, error: error?.message };
}

export function tripAllowsHardDelete(trip: {
  status?: string | null;
  departure_time?: string | null;
  departureTime?: string | null;
}): boolean {
  const status = String(trip.status ?? '').trim();
  const departed = Boolean(trip.departure_time ?? trip.departureTime);
  const preDeparture = ['Pending', 'Scheduled', 'Loading'].includes(status);
  return preDeparture && !departed;
}

export async function archiveTripRow(
  tripId: string,
  actorName: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('trips')
    .update({
      status: 'Cancelled',
      archived_at: new Date().toISOString(),
      archived_by: actorName,
      archive_reason: reason?.trim() || 'Trip archived — order removed after departure',
      updated_at: new Date().toISOString(),
    })
    .eq('id', tripId);
  return { ok: !error, error: error?.message };
}

export async function removeOrArchiveTrip(
  tripId: string,
  tripMeta: { status?: string | null; departure_time?: string | null },
  actorName: string,
): Promise<{ ok: boolean; error?: string; archived?: boolean }> {
  if (tripAllowsHardDelete(tripMeta)) {
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    return { ok: !error, error: error?.message, archived: false };
  }
  const r = await archiveTripRow(tripId, actorName);
  return { ...r, archived: true };
}
