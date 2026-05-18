import { orderLogCardHeadline } from '@/src/components/orders/OrderActivityLogHuman';
import type { OrderLog, OrderLogAction } from '@/src/types/orders';
import type { PublicOrderActivity } from '@/src/types/orderCustomerPortal';

const CUSTOMER_ACTIONS = new Set<string>([
  'created',
  'item_added',
  'item_removed',
  'item_quantity_changed',
  'item_price_changed',
  'discount_applied',
  'status_changed',
  'payment_status_changed',
  'approved',
  'rejected',
  'cancelled',
  'shipped',
  'delivered',
  'payment_received',
  'invoice_generated',
  'proof_uploaded',
]);

function toOrderLog(activity: PublicOrderActivity): OrderLog {
  return {
    id: '',
    orderId: '',
    timestamp: activity.at,
    action: activity.action as OrderLogAction,
    performedBy: '',
    performedByRole: 'System',
    description: activity.description ?? '',
    oldValue: activity.oldValue,
    newValue: activity.newValue,
    metadata: activity.metadata,
  };
}

function isCustomerVisible(activity: PublicOrderActivity): boolean {
  if (!CUSTOMER_ACTIONS.has(activity.action)) return false;
  const d = (activity.description ?? '').toLowerCase();
  if (activity.action === 'proof_uploaded') {
    if (d.includes('payment')) return false;
    return d.startsWith('proof of delivery');
  }
  return true;
}

/** Plain-language line for the customer order page. */
export function formatPublicOrderActivity(activity: PublicOrderActivity): string {
  if (!isCustomerVisible(activity)) return '';

  const d = activity.description?.trim();
  const log = toOrderLog(activity);

  switch (activity.action) {
    case 'created':
      return d || 'Your order was placed.';
    case 'item_added':
    case 'item_removed':
    case 'item_quantity_changed':
    case 'item_price_changed':
    case 'discount_applied':
    case 'payment_received':
    case 'invoice_generated':
    case 'approved':
    case 'rejected':
    case 'cancelled':
      return d || orderLogCardHeadline(log);
    case 'payment_status_changed': {
      if (d) return d;
      const oldPay = activity.oldValue?.paymentStatus ?? activity.oldValue?.payment_status;
      const newPay = activity.newValue?.paymentStatus ?? activity.newValue?.payment_status;
      if (oldPay != null || newPay != null) {
        return `Payment status updated from “${oldPay ?? '—'}” to “${newPay ?? '—'}”.`;
      }
      return 'Payment status was updated.';
    }
    case 'status_changed':
    case 'shipped':
    case 'delivered':
    case 'proof_uploaded':
      return orderLogCardHeadline(log) || d || 'Order progress was updated.';
    default:
      return d || orderLogCardHeadline(log);
  }
}

export function mapPublicActivities(
  raw: unknown,
): PublicOrderActivity[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        at: String(r.at ?? ''),
        action: String(r.action ?? ''),
        description: r.description != null ? String(r.description) : null,
        oldValue: (r.oldValue ?? r.old_value) as Record<string, unknown> | null | undefined,
        newValue: (r.newValue ?? r.new_value) as Record<string, unknown> | null | undefined,
        metadata: r.metadata as Record<string, unknown> | null | undefined,
      };
    })
    .filter((a) => isCustomerVisible(a));
}
