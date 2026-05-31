import { supabase } from '@/src/lib/supabase';

/** Months without an order before a customer is considered dormant. */
export const CUSTOMER_DORMANT_MONTHS = 3;

const STATUSES_PRESERVED = new Set(['Inactive', 'Suspended', 'On Hold']);

function parseDateOnly(value: string): Date | null {
  const trimmed = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Start of day `months` calendar months before `asOf`. */
export function customerDormantCutoffDate(asOf: Date = new Date()): Date {
  const cutoff = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  cutoff.setMonth(cutoff.getMonth() - CUSTOMER_DORMANT_MONTHS);
  return cutoff;
}

/** True when the customer has not ordered in the last 3 calendar months (or never). */
export function isCustomerDormantByLastOrder(
  lastOrderDate: string | null | undefined,
  asOf: Date = new Date(),
): boolean {
  const cutoff = customerDormantCutoffDate(asOf);
  if (!lastOrderDate?.trim()) return true;
  const last = parseDateOnly(lastOrderDate);
  if (!last) return true;
  return last <= cutoff;
}

export function shouldMarkCustomerDormant(
  lastOrderDate: string | null | undefined,
  currentStatus: string,
  asOf: Date = new Date(),
): boolean {
  if (STATUSES_PRESERVED.has(currentStatus)) return false;
  return isCustomerDormantByLastOrder(lastOrderDate, asOf);
}

export function shouldReactivateCustomerFromDormant(
  lastOrderDate: string | null | undefined,
  currentStatus: string,
  asOf: Date = new Date(),
): boolean {
  return currentStatus === 'Dormant' && !isCustomerDormantByLastOrder(lastOrderDate, asOf);
}

export type CustomerDormancyRow = {
  id: string;
  last_order_date: string | null;
  status: string;
};

/** Persist Dormant / Active status from last-order recency (batch). */
export async function syncCustomerDormantStatuses(
  customers: CustomerDormancyRow[],
  asOf: Date = new Date(),
): Promise<{ markedDormant: number; reactivated: number }> {
  const toDormant = customers.filter((c) => shouldMarkCustomerDormant(c.last_order_date, c.status, asOf));
  const toReactivate = customers.filter((c) =>
    shouldReactivateCustomerFromDormant(c.last_order_date, c.status, asOf),
  );

  if (toDormant.length > 0) {
    const { error } = await supabase
      .from('customers')
      .update({ status: 'Dormant', updated_at: new Date().toISOString() })
      .in(
        'id',
        toDormant.map((c) => c.id),
      );
    if (error) throw error;
  }

  if (toReactivate.length > 0) {
    const { error } = await supabase
      .from('customers')
      .update({ status: 'Active', updated_at: new Date().toISOString() })
      .in(
        'id',
        toReactivate.map((c) => c.id),
      );
    if (error) throw error;
  }

  return { markedDormant: toDormant.length, reactivated: toReactivate.length };
}

/** Apply dormancy status changes to an in-memory customer list after sync. */
export function applyDormantStatusLocally<T extends CustomerDormancyRow>(
  customers: T[],
  asOf: Date = new Date(),
): T[] {
  return customers.map((c) => {
    if (shouldMarkCustomerDormant(c.last_order_date, c.status, asOf)) {
      return { ...c, status: 'Dormant' };
    }
    if (shouldReactivateCustomerFromDormant(c.last_order_date, c.status, asOf)) {
      return { ...c, status: 'Active' };
    }
    return c;
  });
}
