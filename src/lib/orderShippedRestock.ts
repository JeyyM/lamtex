import { supabase } from '@/src/lib/supabase';

/** Orders that cannot return stock when a trip is cancelled (already finished or cancelled). */
export const ORDER_TRIP_CANCEL_NO_RESTOCK_STATUSES = [
  'Delivered',
  'Partially Fulfilled',
  'Completed',
  'Cancelled',
] as const;

export function canOfferTripCancelRestock(orderStatus: string): boolean {
  const st = String(orderStatus ?? '').trim();
  if (!st) return false;
  return !(ORDER_TRIP_CANCEL_NO_RESTOCK_STATUSES as readonly string[]).includes(st);
}

/** Restore branch + variant stock for shipped line items (In Transit and later). */
export async function restockShippedOrderItems(params: {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  reason: string;
  performedBy: string | null;
  /** Label for stock movement audit trail. */
  context?: 'order' | 'trip';
}): Promise<void> {
  const stockedStatuses = ['In Transit', 'Delivered', 'Partially Fulfilled'];
  if (!stockedStatuses.includes(String(params.orderStatus ?? '').trim())) return;

  const now = new Date().toISOString();
  const { data: lineRows } = await supabase
    .from('order_line_items')
    .select('id, variant_id, product_name, sku, quantity_shipped')
    .eq('order_id', params.orderId);

  const contextLabel = params.context === 'order' ? 'Order cancelled' : 'Trip cancelled';

  for (const li of lineRows ?? []) {
    const row = li as {
      variant_id?: string | null;
      product_name?: string | null;
      sku?: string | null;
      quantity_shipped?: number | null;
    };
    if (!row.variant_id || !row.quantity_shipped) continue;
    const shipped = Number(row.quantity_shipped);
    if (shipped <= 0) continue;

    const { data: pvsList } = await supabase
      .from('product_variant_stock')
      .select('id, quantity, branch_id')
      .eq('variant_id', row.variant_id);
    const pvs = pvsList?.[0];
    if (pvs) {
      await supabase
        .from('product_variant_stock')
        .update({ quantity: Number(pvs.quantity) + shipped, updated_at: now })
        .eq('id', pvs.id);
    }

    const { data: vrow } = await supabase
      .from('product_variants')
      .select('total_stock, sku')
      .eq('id', row.variant_id)
      .maybeSingle();
    if (vrow) {
      await supabase
        .from('product_variants')
        .update({ total_stock: Number(vrow.total_stock ?? 0) + shipped, updated_at: now })
        .eq('id', row.variant_id);
    }

    await supabase.from('product_stock_movements').insert({
      variant_id: row.variant_id,
      variant_sku: vrow?.sku ?? row.sku,
      product_name: row.product_name,
      movement_type: 'In',
      quantity: shipped,
      reason: `${contextLabel} — stock returned (${params.reason})`,
      performed_by: params.performedBy,
      reference_number: params.orderNumber,
      timestamp: now,
    });
  }
}
