import type { PublicOrderDiscountLine, PublicOrderLineItem } from '@/src/types/orderCustomerPortal';

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getItemDiscountLines(
  item: PublicOrderLineItem,
): Array<{ name: string; amount: number; percentage?: number }> {
  if (item.discountLines && item.discountLines.length > 0) {
    return item.discountLines.map((d) => ({
      name: d.name,
      amount: roundMoney(d.amount),
      percentage: d.percentage,
    }));
  }

  const fromBreakdown = discountLinesForItem(
    item.quantity,
    item.unitPrice,
    item.discountsBreakdown ?? [],
  );
  const lineDiscount = roundMoney(item.discountAmount ?? 0);
  const fromBreakdownTotal = roundMoney(fromBreakdown.reduce((s, d) => s + d.amount, 0));
  const unallocated = roundMoney(lineDiscount - fromBreakdownTotal);
  if (unallocated > 0.005) {
    return [...fromBreakdown, { name: 'Discount', amount: unallocated }];
  }
  if (fromBreakdown.length > 0) return fromBreakdown;
  if (lineDiscount > 0) return [{ name: 'Discount', amount: lineDiscount }];
  return [];
}

function discountLinesForItem(
  quantity: number,
  unitPrice: number,
  breakdown: PublicOrderDiscountLine[],
): Array<{ name: string; amount: number; percentage?: number }> {
  const gross = quantity * unitPrice;
  if (gross <= 0 || breakdown.length === 0) return [];

  let running = gross;
  const lines: Array<{ name: string; amount: number; percentage?: number }> = [];

  for (const d of breakdown) {
    const pct = Number(d.percentage);
    if (!Number.isFinite(pct) || pct <= 0) continue;
    const after = running * (1 - pct / 100);
    const amount = roundMoney(running - after);
    if (amount > 0) {
      const name = d.name?.trim() || 'Discount';
      lines.push({ name, amount, percentage: pct });
    }
    running = after;
  }

  return lines;
}

export type PublicOrderTotalsBreakdown = {
  grossItemsTotal: number;
  deductions: Array<{ name: string; amount: number; percentage?: number }>;
  itemsNetTotal: number;
  orderDiscountAmount: number;
};

/** Gross line totals, named discount deductions, and net items subtotal. */
export function buildPublicOrderTotalsBreakdown(
  items: PublicOrderLineItem[],
  orderDiscountAmount: number,
): PublicOrderTotalsBreakdown {
  const grossItemsTotal = roundMoney(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
  const itemsNetTotal = roundMoney(items.reduce((sum, item) => sum + item.total, 0));

  const byName = new Map<string, { amount: number; percentage?: number }>();
  let fromBreakdown = 0;

  for (const item of items) {
    const lines = discountLinesForItem(item.quantity, item.unitPrice, item.discountsBreakdown ?? []);
    for (const line of lines) {
      fromBreakdown = roundMoney(fromBreakdown + line.amount);
      const prev = byName.get(line.name);
      byName.set(line.name, {
        amount: roundMoney((prev?.amount ?? 0) + line.amount),
        percentage: line.percentage ?? prev?.percentage,
      });
    }
  }

  const lineDiscountTotal = roundMoney(
    items.reduce((sum, item) => sum + (item.discountAmount ?? 0), 0),
  );
  const unallocated = roundMoney(lineDiscountTotal - fromBreakdown);
  if (unallocated > 0.005) {
    const prev = byName.get('Line discounts');
    byName.set('Line discounts', {
      amount: roundMoney((prev?.amount ?? 0) + unallocated),
    });
  }

  const deductions = [...byName.entries()]
    .map(([name, v]) => ({ name, amount: v.amount, percentage: v.percentage }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    grossItemsTotal,
    deductions,
    itemsNetTotal,
    orderDiscountAmount: roundMoney(Math.max(0, orderDiscountAmount)),
  };
}
