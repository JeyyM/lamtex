import type { UserRole } from '@/src/types';

export type NotificationChannel = 'in_app' | 'email';

export type NotificationChannelPrefs = {
  in_app: boolean;
  email: boolean;
};

export type NotificationPrefKey = string;

export interface NotificationCatalogItem {
  key: NotificationPrefKey;
  label: string;
  description: string;
  group: string;
  /** Dashboard roles that receive this notification today (shown in settings). */
  roles: UserRole[];
  /** Which channels apply to this notification type. */
  supports: { in_app: boolean; email: boolean };
}

const ALL_STAFF_ROLES: UserRole[] = ['Executive', 'Warehouse', 'Logistics', 'Agent', 'Driver'];

function item(
  key: string,
  label: string,
  description: string,
  group: string,
  roles: UserRole[],
  supports: { in_app: boolean; email: boolean } = { in_app: true, email: true },
): NotificationCatalogItem {
  return { key, label, description, group, roles, supports };
}

/** Canonical list aligned with notifications.event_type values where possible. */
export const NOTIFICATION_CATALOG: NotificationCatalogItem[] = [
  item('order_created', 'New order created', 'When a new order is logged in the system.', 'Orders', ['Executive']),
  item('order_submitted_for_approval', 'Order submitted for approval', 'When an order is sent for executive approval.', 'Orders', ['Executive']),
  item('order_approved', 'Order approved', 'When an order you sold is approved.', 'Orders', ['Agent']),
  item('order_rejected', 'Order rejected', 'When an order you sold is rejected.', 'Orders', ['Agent']),
  item('order_revised', 'Order revised', 'When an approved order is edited.', 'Orders', ['Executive']),
  item('order_cancelled_by_agent', 'Order cancelled by agent', 'When an agent cancels an order.', 'Orders', ['Executive']),
  item('order_cancelled_by_executive', 'Order cancelled by executive', 'When an executive cancels an order.', 'Orders', ['Agent']),
  item('order_cancelled_from_trip', 'Order cancelled on trip', 'When an order is cancelled while on a delivery trip.', 'Orders', ['Agent', 'Logistics', 'Executive']),

  item('order_ready_for_schedule', 'Order ready for scheduling', 'When an approved order enters the dispatch queue.', 'Orders — Fulfillment', ['Logistics']),
  item('order_scheduled', 'Order scheduled on trip', 'When an order is assigned to a delivery trip.', 'Orders — Fulfillment', ['Executive', 'Warehouse', 'Agent']),
  item('order_unscheduled_from_trip', 'Order unscheduled from trip', 'When an order is removed from a trip back to Approved.', 'Orders — Fulfillment', ['Executive', 'Warehouse', 'Agent']),
  item('order_loading', 'Order loading', 'When warehouse starts loading an order.', 'Orders — Fulfillment', ['Logistics']),
  item('order_packed', 'Order packed', 'When an order is packed and ready for dispatch.', 'Orders — Fulfillment', ['Logistics', 'Agent']),
  item('order_in_transit', 'Order in transit', 'When an order departs for delivery.', 'Orders — Fulfillment', ['Executive', 'Warehouse', 'Agent']),
  item('order_delivery_recorded', 'Delivery recorded', 'When a delivery or partial delivery is recorded.', 'Orders — Fulfillment', ['Executive', 'Agent']),
  item('order_delivery_proof_uploaded', 'Delivery proof uploaded', 'When delivery proof is uploaded for your order.', 'Orders — Fulfillment', ['Agent']),
  item('order_other_proof_uploaded', 'Other document uploaded', 'When a non-delivery document is uploaded on an order.', 'Orders — Fulfillment', ['Agent']),

  item('order_payment_proof_uploaded', 'Payment proof uploaded', 'When payment proof is uploaded on an order.', 'Orders — Payments', ['Agent']),
  item('order_payment_recorded', 'Payment recorded', 'When a payment is recorded on an order.', 'Orders — Payments', ['Executive']),
  item('order_payment_overdue', 'Payment overdue', 'When an order passes its payment due date.', 'Orders — Payments', ['Executive', 'Agent']),
  item('order_commission_paid', 'Commission paid', 'When commission is released on your order.', 'Orders — Payments', ['Agent']),

  item('trip_assigned_to_driver', 'Trip assigned to you', 'When you are assigned as driver on a trip.', 'Trips', ['Driver']),
  item('trip_unassigned_from_driver', 'Trip unassigned from you', 'When you are removed as driver from a trip.', 'Trips', ['Driver']),
  item('trip_delayed', 'Trip delayed', 'When a trip is marked delayed.', 'Trips', ['Logistics', 'Agent']),
  item('trip_cancelled', 'Trip cancelled', 'When a delivery trip is cancelled.', 'Trips', ['Executive', 'Logistics', 'Warehouse', 'Driver']),

  item('product_out_of_stock', 'Product out of stock', 'When a product variant reaches zero stock.', 'Inventory', ['Executive', 'Warehouse']),
  item('product_below_reorder_point', 'Product below reorder point', 'When stock falls below the reorder point.', 'Inventory', ['Executive', 'Warehouse']),
  item('material_out_of_stock', 'Material out of stock', 'When a raw material reaches zero stock.', 'Inventory', ['Executive', 'Warehouse']),
  item('material_below_reorder_point', 'Material below reorder point', 'When material stock falls below reorder point.', 'Inventory', ['Executive', 'Warehouse']),

  item('purchase_order_submitted_for_approval', 'PO submitted for approval', 'When a purchase order needs executive approval.', 'Purchase orders', ['Executive']),
  item('purchase_order_cancelled', 'PO cancelled', 'When your purchase order is cancelled.', 'Purchase orders', ['Agent', 'Warehouse', 'Logistics']),
  item('purchase_order_rejected', 'PO rejected', 'When your purchase order is rejected.', 'Purchase orders', ['Agent', 'Warehouse', 'Logistics']),
  item('purchase_order_accepted', 'PO accepted', 'When your purchase order is accepted.', 'Purchase orders', ['Agent', 'Warehouse', 'Logistics']),
  item('purchase_order_confirmed', 'PO confirmed', 'When a purchase order is confirmed with a supplier.', 'Purchase orders', ['Executive', 'Warehouse']),
  item('purchase_order_received', 'PO received', 'When a purchase order is marked received.', 'Purchase orders', ['Executive', 'Warehouse']),
  item('purchase_order_payment_recorded', 'PO payment recorded', 'When payment is recorded on a purchase order.', 'Purchase orders', ['Executive']),
  item('purchase_order_delivery_proof_uploaded', 'PO delivery proof uploaded', 'When delivery proof is uploaded on a PO.', 'Purchase orders', ['Executive']),
  item('purchase_order_payment_proof_uploaded', 'PO payment proof uploaded', 'When payment proof is uploaded on a PO.', 'Purchase orders', ['Executive']),
  item('purchase_order_other_proof_uploaded', 'PO other proof uploaded', 'When other proof is uploaded on a PO.', 'Purchase orders', ['Executive']),

  item('production_request_submitted_for_approval', 'Production request submitted', 'When a production request needs approval.', 'Production requests', ['Executive']),
  item('production_request_cancelled', 'Production request cancelled', 'When your production request is cancelled.', 'Production requests', ['Agent', 'Warehouse']),
  item('production_request_accepted', 'Production request accepted', 'When your production request is accepted.', 'Production requests', ['Agent', 'Warehouse']),
  item('production_request_rejected', 'Production request rejected', 'When your production request is rejected.', 'Production requests', ['Agent', 'Warehouse']),
  item('production_request_started', 'Production started', 'When production work begins.', 'Production requests', ['Executive', 'Warehouse']),
  item('production_request_inventory_added', 'Production inventory added', 'When finished goods are added from production.', 'Production requests', ['Warehouse']),
  item('production_request_completed', 'Production completed', 'When a production request is completed.', 'Production requests', ['Executive', 'Warehouse']),

  item('ibr_submitted_for_approval', 'Inter-branch request submitted', 'When an IBR needs executive approval.', 'Inter-branch requests', ['Executive']),
  item('ibr_approved', 'Inter-branch request approved', 'When an IBR is approved.', 'Inter-branch requests', ['Warehouse', 'Logistics']),
  item('ibr_loading', 'Inter-branch loading', 'IBR logistics milestone: loading.', 'Inter-branch requests', ['Warehouse', 'Logistics']),
  item('ibr_in_transit', 'Inter-branch in transit', 'IBR logistics milestone: in transit.', 'Inter-branch requests', ['Warehouse', 'Logistics']),
  item('ibr_delivery_recorded', 'Inter-branch delivery recorded', 'When IBR delivery is recorded.', 'Inter-branch requests', ['Warehouse']),
  item('ibr_fulfilled', 'Inter-branch request fulfilled', 'When an IBR is fully fulfilled.', 'Inter-branch requests', ['Executive', 'Warehouse']),
  item('ibr_cancelled', 'Inter-branch request cancelled', 'When an IBR is cancelled.', 'Inter-branch requests', ['Warehouse']),
  item('ibr_rejected', 'Inter-branch request rejected', 'When your IBR is rejected.', 'Inter-branch requests', ['Agent', 'Warehouse', 'Logistics']),

  item('chat_message', 'Chat messages', 'New internal chat messages.', 'Messages', ALL_STAFF_ROLES, { in_app: true, email: false }),
];

export const NOTIFICATION_CATALOG_BY_KEY = new Map(
  NOTIFICATION_CATALOG.map((entry) => [entry.key, entry]),
);

export function catalogItemsForRoles(roles: UserRole[]): NotificationCatalogItem[] {
  const roleSet = new Set(roles);
  return NOTIFICATION_CATALOG.filter((entry) => entry.roles.some((r) => roleSet.has(r)));
}

/** Default prefs for a role: all supported channels ON (matches current production behavior). */
export function defaultNotificationPrefsForRoles(roles: UserRole[]): Record<string, NotificationChannelPrefs> {
  const items = catalogItemsForRoles(roles);
  const out: Record<string, NotificationChannelPrefs> = {};
  for (const entry of items) {
    out[entry.key] = {
      in_app: entry.supports.in_app,
      email: entry.supports.email,
    };
  }
  return out;
}

export function mergeNotificationPrefs(
  roles: UserRole[],
  saved: Record<string, Partial<NotificationChannelPrefs>> | null | undefined,
): Record<string, NotificationChannelPrefs> {
  const defaults = defaultNotificationPrefsForRoles(roles);
  const merged = { ...defaults };
  if (!saved) return merged;

  for (const [key, channels] of Object.entries(saved)) {
    const def = merged[key];
    if (!def) continue;
    merged[key] = {
      in_app: typeof channels.in_app === 'boolean' ? channels.in_app : def.in_app,
      email: typeof channels.email === 'boolean' ? channels.email : def.email,
    };
  }
  return merged;
}

export function serializeNotificationPrefs(
  prefs: Record<string, NotificationChannelPrefs>,
): Record<string, NotificationChannelPrefs> {
  const out: Record<string, NotificationChannelPrefs> = {};
  for (const [key, val] of Object.entries(prefs)) {
    out[key] = { in_app: Boolean(val.in_app), email: Boolean(val.email) };
  }
  return out;
}

export function notificationPrefsEqual(
  a: Record<string, NotificationChannelPrefs>,
  b: Record<string, NotificationChannelPrefs>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (Boolean(a[key]?.in_app) !== Boolean(b[key]?.in_app)) return false;
    if (Boolean(a[key]?.email) !== Boolean(b[key]?.email)) return false;
  }
  return true;
}

export function groupCatalogItems(items: NotificationCatalogItem[]): Map<string, NotificationCatalogItem[]> {
  const map = new Map<string, NotificationCatalogItem[]>();
  for (const entry of items) {
    const list = map.get(entry.group) ?? [];
    list.push(entry);
    map.set(entry.group, list);
  }
  return map;
}
