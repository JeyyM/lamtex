import type { OrderLineItem } from '@/src/types/orders';

/** Statuses where a full `quantity_shipped` with zero delivered is treated as not yet loaded. */
const PRE_PACK_STATUSES = new Set(['Approved', 'Scheduled', 'Loading']);

/**
 * Cumulative units already loaded / sent for this line.
 * Ignores stale full-shipped rows when the order never left pre-pack status.
 */
export function cumulativeShippedForLine(
  line: Pick<OrderLineItem, 'quantity' | 'quantityShipped' | 'quantityDelivered'>,
  orderStatus?: string | null,
): number {
  const ordered = Math.max(0, Number(line.quantity) || 0);
  const raw = line.quantityShipped;
  if (raw == null || Number.isNaN(Number(raw))) return 0;

  const shipped = Math.max(0, Math.min(ordered, Number(raw)));
  const delivered = Math.max(0, Number(line.quantityDelivered ?? 0));
  const status = String(orderStatus ?? '').trim();

  if (
    PRE_PACK_STATUSES.has(status) &&
    shipped >= ordered &&
    delivered < ordered
  ) {
    return 0;
  }

  return shipped;
}

/** Units still available to load or send on the next shipment event. */
export function remainingToShipForLine(
  line: Pick<OrderLineItem, 'quantity' | 'quantityShipped' | 'quantityDelivered'>,
  orderStatus?: string | null,
): number {
  const ordered = Math.max(0, Number(line.quantity) || 0);
  return Math.max(0, ordered - cumulativeShippedForLine(line, orderStatus));
}

/** Max units in scope for delivery recording (POD). */
export function fulfillmentCap(
  item: Pick<OrderLineItem, 'quantity' | 'quantityShipped' | 'quantityDelivered'>,
  orderStatus?: string | null,
): number {
  const ordered = Math.max(0, Number(item.quantity) || 0);
  const shipped = cumulativeShippedForLine(item, orderStatus);
  if (shipped <= 0) return ordered;
  return Math.min(ordered, shipped);
}

export function fulfillmentRemaining(
  item: Pick<OrderLineItem, 'quantity' | 'quantityShipped' | 'quantityDelivered'>,
  orderStatus?: string | null,
): number {
  return Math.max(0, fulfillmentCap(item, orderStatus) - (item.quantityDelivered ?? 0));
}
