import { roundMoney } from '@/src/lib/orderProofPayments';

export type PoLineForTotal = { quantity_ordered: number; unit_price: number };

/** Sum of quantity_ordered × unit_price across PO lines. */
export function sumPurchaseOrderLineItemsTotal(items: PoLineForTotal[]): number {
  let sum = 0;
  for (const item of items) {
    sum += (Number(item.quantity_ordered) || 0) * (Number(item.unit_price) || 0);
  }
  return roundMoney(sum);
}

/** Use DB total when set; otherwise fall back to line-item sum (many POs store 0 in total_amount). */
export function effectivePurchaseOrderTotal(dbTotal: number, lineItemsTotal: number): number {
  const db = roundMoney(Number(dbTotal) || 0);
  const lines = roundMoney(lineItemsTotal);
  return db > 0 ? db : lines;
}

export function formatPoMoney(amount: number, currency: string): string {
  const sym = currency === 'USD' ? '$' : '₱';
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
