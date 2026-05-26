import type { BadgeProps } from '@/src/components/ui/Badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

/** Distinct badge colors for order workflow status. */
export function orderStatusBadgeVariant(status: string): BadgeVariant {
  const s = status.trim();
  if (['Delivered', 'Approved', 'Completed'].includes(s)) return 'success';
  if (s === 'Scheduled') return 'info';
  if (s === 'In Transit') return 'warning';
  if (['Partially Fulfilled'].includes(s)) return 'info';
  if (['Pending', 'Loading', 'Packed', 'Ready'].includes(s)) return 'warning';
  if (['Rejected', 'Cancelled', 'Delayed'].includes(s)) return 'danger';
  if (s === 'Draft') return 'neutral';
  return 'neutral';
}

/** Distinct badge colors for payment / billing status. */
export function paymentStatusBadgeVariant(status: string): BadgeVariant {
  const s = status.trim().toLowerCase();
  if (s === 'paid' || s === 'on credit' || s === 'completed') return 'success';
  if (s === 'overdue') return 'danger';
  if (['partially paid', 'invoiced'].includes(s) || s.includes('partial')) return 'warning';
  if (s === 'unbilled') return 'neutral';
  return 'neutral';
}
