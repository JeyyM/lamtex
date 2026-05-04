/**
 * Warehouse Movements tab: chart + history from real DB data.
 * Product variant monthly series aligns with ProductFamilyPage variant comparison (order lines).
 * Raw material monthly series in Warehouse Movements: production usage (`material_consumption`). PO receipt helpers remain for other pages.
 */
import { supabase } from '@/src/lib/supabase';

const CHART_EXCLUDED_ORDER_STATUSES = new Set(['Cancelled', 'Rejected', 'Draft']);

export type MonthlyMovementChartRow = { month: string; qty: number };

/** PHP revenue per calendar month from order lines (uses `line_total` when set, else qty × unit_price). */
export type MonthlyRevenueChartRow = { month: string; revenue: number };

/**
 * Units + revenue for a variant in one query. Revenue reflects amounts stored on each line at sale time.
 */
export async function fetchVariantMonthlyOrderMetrics(
  variantId: string,
  branchName: string | null | undefined,
): Promise<{ units: MonthlyMovementChartRow[]; revenue: MonthlyRevenueChartRow[] }> {
  const { data, error } = await supabase
    .from('order_line_items')
    .select('quantity, line_total, unit_price, orders!inner(order_date, status, branch_id)')
    .eq('variant_id', variantId);

  if (error || !data) {
    if (import.meta.env.DEV) console.warn('[movements variant chart]', error?.message);
    return { units: [], revenue: [] };
  }

  const { data: branches } = await supabase.from('branches').select('id, name');
  const branchNameById = new Map<string, string>();
  for (const b of branches ?? []) {
    if (b.id && b.name) branchNameById.set(String(b.id), String(b.name));
  }

  const end = new Date();
  const monthSlots: { ymk: string; label: string }[] = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(end.getFullYear(), end.getMonth() - k, 1);
    const ymk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
    monthSlots.push({ ymk, label });
  }
  const monthSet = new Set(monthSlots.map((s) => s.ymk));
  const qtyAgg = new Map<string, number>();
  const revAgg = new Map<string, number>();

  type LineRow = {
    quantity: number | null;
    line_total: number | string | null;
    unit_price: number | string | null;
    orders:
      | { order_date: string; status: string; branch_id: string | null }
      | { order_date: string; status: string; branch_id: string | null }[]
      | null;
  };
  const bnFilter = branchName?.trim() ?? '';
  for (const r of data as LineRow[]) {
    const rawO = r.orders;
    const ord = rawO == null ? null : Array.isArray(rawO) ? rawO[0] : rawO;
    if (!ord?.order_date) continue;
    if (CHART_EXCLUDED_ORDER_STATUSES.has(ord.status)) continue;
    if (bnFilter) {
      const bid = ord.branch_id;
      const bn = bid ? branchNameById.get(bid) : null;
      if (bn !== bnFilter) continue;
    }
    const od = new Date(ord.order_date);
    const ymk = `${od.getFullYear()}-${String(od.getMonth() + 1).padStart(2, '0')}`;
    if (!monthSet.has(ymk)) continue;
    const q = Number(r.quantity) || 0;
    qtyAgg.set(ymk, (qtyAgg.get(ymk) || 0) + q);
    const lt = Number(r.line_total);
    const up = Number(r.unit_price) || 0;
    const lineRevenue = Number.isFinite(lt) && lt > 0 ? lt : q * up;
    revAgg.set(ymk, (revAgg.get(ymk) || 0) + lineRevenue);
  }

  const unitRows: MonthlyMovementChartRow[] = monthSlots.map(({ ymk, label }) => ({
    month: label,
    qty: qtyAgg.get(ymk) ?? 0,
  }));
  const revRows: MonthlyRevenueChartRow[] = monthSlots.map(({ ymk, label }) => ({
    month: label,
    revenue: revAgg.get(ymk) ?? 0,
  }));

  const rowHasActivity = (i: number) => unitRows[i]!.qty > 0 || revRows[i]!.revenue > 0;
  let last = unitRows.length - 1;
  while (last >= 0 && !rowHasActivity(last)) last--;
  let first = 0;
  while (first <= last && !rowHasActivity(first)) first++;
  if (last < 0) return { units: [], revenue: [] };
  return {
    units: unitRows.slice(first, last + 1),
    revenue: revRows.slice(first, last + 1),
  };
}

export async function fetchVariantMonthlyUnitsFromOrders(
  variantId: string,
  branchName: string | null | undefined,
): Promise<MonthlyMovementChartRow[]> {
  const { units } = await fetchVariantMonthlyOrderMetrics(variantId, branchName);
  return units;
}

export type VariantInvolvedOrderRow = {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  status: string;
  orderDate: string | null;
  requiredDate: string | null;
  lineQuantity: number;
};

/** One row per order; line quantities for this variant are summed. Same branch + status filters as variant monthly charts. */
export async function fetchVariantInvolvedOrders(
  variantId: string,
  branchName: string | null | undefined,
  limit = 150,
): Promise<VariantInvolvedOrderRow[]> {
  const { data, error } = await supabase
    .from('order_line_items')
    .select(
      'quantity, orders!inner(id, order_number, customer_name, status, order_date, required_date, branch_id)',
    )
    .eq('variant_id', variantId);

  if (error || !data) {
    if (import.meta.env.DEV) console.warn('[variant involved orders]', error?.message);
    return [];
  }

  const { data: branches } = await supabase.from('branches').select('id, name');
  const branchNameById = new Map<string, string>();
  for (const b of branches ?? []) {
    if (b.id && b.name) branchNameById.set(String(b.id), String(b.name));
  }

  const bnFilter = branchName?.trim() ?? '';
  type LineRow = {
    quantity: number | null;
    orders:
      | {
          id: string;
          order_number: string | null;
          customer_name: string | null;
          status: string;
          order_date: string | null;
          required_date: string | null;
          branch_id: string | null;
        }
      | {
          id: string;
          order_number: string | null;
          customer_name: string | null;
          status: string;
          order_date: string | null;
          required_date: string | null;
          branch_id: string | null;
        }[]
      | null;
  };

  const byOrder = new Map<string, VariantInvolvedOrderRow>();

  for (const r of data as LineRow[]) {
    const rawO = r.orders;
    const ord = rawO == null ? null : Array.isArray(rawO) ? rawO[0] : rawO;
    if (!ord?.id) continue;
    if (CHART_EXCLUDED_ORDER_STATUSES.has(ord.status)) continue;
    if (bnFilter) {
      const bid = ord.branch_id;
      const bn = bid ? branchNameById.get(bid) : null;
      if (bn !== bnFilter) continue;
    }
    const q = Number(r.quantity) || 0;
    const prev = byOrder.get(ord.id);
    if (prev) {
      prev.lineQuantity += q;
    } else {
      byOrder.set(ord.id, {
        orderId: ord.id,
        orderNumber: String(ord.order_number ?? '').trim() || ord.id.slice(0, 8),
        customerName: ord.customer_name,
        status: ord.status,
        orderDate: ord.order_date,
        requiredDate: ord.required_date,
        lineQuantity: q,
      });
    }
  }

  return [...byOrder.values()]
    .sort((a, b) => {
      const ta = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const tb = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      return tb - ta;
    })
    .slice(0, limit);
}

export async function fetchMaterialMonthlyReceiptsFromPo(materialId: string): Promise<MonthlyMovementChartRow[]> {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .select('quantity_received, purchase_orders!inner(order_date)')
    .eq('material_id', materialId);

  if (error || !data) {
    if (import.meta.env.DEV) console.warn('[movements material chart]', error?.message);
    return [];
  }

  const end = new Date();
  const monthSlots: { ymk: string; label: string }[] = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(end.getFullYear(), end.getMonth() - k, 1);
    const ymk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
    monthSlots.push({ ymk, label });
  }
  const monthSet = new Set(monthSlots.map((s) => s.ymk));
  const agg = new Map<string, number>();

  for (const r of data as Array<{
    quantity_received: number | null;
    purchase_orders: { order_date: string } | { order_date: string }[] | null;
  }>) {
    const po = r.purchase_orders;
    const ord = po == null ? null : Array.isArray(po) ? po[0] : po;
    if (!ord?.order_date) continue;
    const rec = Number(r.quantity_received) || 0;
    if (rec <= 0) continue;
    const od = new Date(ord.order_date);
    const ymk = `${od.getFullYear()}-${String(od.getMonth() + 1).padStart(2, '0')}`;
    if (!monthSet.has(ymk)) continue;
    agg.set(ymk, (agg.get(ymk) || 0) + rec);
  }

  const rows: MonthlyMovementChartRow[] = monthSlots.map(({ ymk, label }) => ({
    month: label,
    qty: agg.get(ymk) ?? 0,
  }));

  const rowHas = (row: MonthlyMovementChartRow) => row.qty > 0;
  let last = rows.length - 1;
  while (last >= 0 && !rowHas(rows[last]!)) last--;
  let first = 0;
  while (first <= last && !rowHas(rows[first]!)) first++;
  if (last < 0) return [];
  return rows.slice(first, last + 1);
}

/** Monthly quantity from production consumption records. */
export async function fetchMaterialMonthlyUsageFromConsumption(
  materialId: string,
  branchCode: string | null,
): Promise<MonthlyMovementChartRow[]> {
  const { data, error } = await supabase
    .from('material_consumption')
    .select('quantity_consumed, consumption_date, branch')
    .eq('material_id', materialId);

  if (error || !data) {
    if (import.meta.env.DEV) console.warn('[movements material usage chart]', error?.message);
    return [];
  }

  const end = new Date();
  const monthSlots: { ymk: string; label: string }[] = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(end.getFullYear(), end.getMonth() - k, 1);
    const ymk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
    monthSlots.push({ ymk, label });
  }
  const monthSet = new Set(monthSlots.map((s) => s.ymk));
  const agg = new Map<string, number>();
  const code = branchCode?.trim() ?? '';

  for (const r of data as Array<{
    quantity_consumed: number | string | null;
    consumption_date: string | null;
    branch: string | null;
  }>) {
    if (code) {
      const b = r.branch?.trim() ?? '';
      if (b && b !== code) continue;
    }
    if (!r.consumption_date) continue;
    const q = Number(r.quantity_consumed) || 0;
    if (q <= 0) continue;
    const od = new Date(r.consumption_date);
    const ymk = `${od.getFullYear()}-${String(od.getMonth() + 1).padStart(2, '0')}`;
    if (!monthSet.has(ymk)) continue;
    agg.set(ymk, (agg.get(ymk) || 0) + q);
  }

  const rows: MonthlyMovementChartRow[] = monthSlots.map(({ ymk, label }) => ({
    month: label,
    qty: agg.get(ymk) ?? 0,
  }));

  const rowHas = (row: MonthlyMovementChartRow) => row.qty > 0;
  let last = rows.length - 1;
  while (last >= 0 && !rowHas(rows[last]!)) last--;
  let first = 0;
  while (first <= last && !rowHas(rows[first]!)) first++;
  if (last < 0) return [];
  return rows.slice(first, last + 1);
}

export type MaterialUsageRow = {
  id: string;
  consumption_date: string | null;
  quantity_consumed: number;
  product_id: string | null;
  product_name: string | null;
  /** Stored on row when logged; may be 0 for legacy rows — derive with cost_per_unit × qty when needed. */
  total_cost: number;
  cost_per_unit: number;
};

export async function fetchMaterialUsageRows(
  materialId: string,
  branchCode: string | null,
  limit = 120,
): Promise<MaterialUsageRow[]> {
  const { data, error } = await supabase
    .from('material_consumption')
    .select(
      'id, consumption_date, quantity_consumed, product_id, product_name, total_cost, cost_per_unit, branch, created_at',
    )
    .eq('material_id', materialId)
    .order('consumption_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (import.meta.env.DEV) console.warn('[material usage rows]', error?.message);
    return [];
  }

  const code = branchCode?.trim() ?? '';
  let rows = data as Array<{
    id: string;
    consumption_date: string | null;
    quantity_consumed: number | string | null;
    product_id: string | null;
    product_name: string | null;
    total_cost: number | string | null;
    cost_per_unit: number | string | null;
    branch: string | null;
  }>;

  if (code) {
    rows = rows.filter((r) => {
      const b = r.branch?.trim() ?? '';
      return !b || b === code;
    });
  }

  return rows.map((r) => ({
    id: r.id,
    consumption_date: r.consumption_date,
    quantity_consumed: Number(r.quantity_consumed) || 0,
    product_id: r.product_id,
    product_name: r.product_name,
    total_cost: Number(r.total_cost) || 0,
    cost_per_unit: Number(r.cost_per_unit) || 0,
  }));
}

/** ₱ amount for one consumption line (prefers stored total_cost, else cost_per_unit × qty). */
export function materialUsageRowOverallCost(row: MaterialUsageRow): number | null {
  const stored = Number(row.total_cost);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const cpu = row.cost_per_unit;
  const q = row.quantity_consumed;
  const derived = cpu * q;
  if (Number.isFinite(derived) && derived > 0) return derived;
  return null;
}

export function formatMaterialUsageCostPhp(row: MaterialUsageRow): string {
  const c = materialUsageRowOverallCost(row);
  return c != null
    ? `₱${c.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
}

export type ProductMovementRow = {
  id: string;
  timestamp: string;
  movement_type: string;
  quantity: number;
  from_branch: string | null;
  to_branch: string | null;
  reason: string | null;
  performed_by: string | null;
  reference_number: string | null;
};

export async function fetchProductStockMovementRows(
  variantId: string,
  branchCode: string | null,
  limit = 120,
): Promise<ProductMovementRow[]> {
  const { data, error } = await supabase
    .from('product_stock_movements')
    .select(
      'id, timestamp, movement_type, quantity, from_branch, to_branch, reason, performed_by, reference_number',
    )
    .eq('variant_id', variantId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (import.meta.env.DEV) console.warn('[product stock movements]', error?.message);
    return [];
  }
  let rows = data as ProductMovementRow[];
  if (branchCode) {
    rows = rows.filter((r) => r.from_branch === branchCode || r.to_branch === branchCode);
  }
  return rows;
}

export type MaterialMovementRow = {
  id: string;
  movement_date: string | null;
  movement_type: string;
  quantity: number | string;
  from_branch: string | null;
  to_branch: string | null;
  reason: string | null;
  remarks: string | null;
  reference_number: string | null;
  processed_by: string | null;
};

export async function fetchMaterialStockMovementRows(
  materialId: string,
  branchCode: string | null,
  limit = 120,
): Promise<MaterialMovementRow[]> {
  const { data, error } = await supabase
    .from('material_stock_movements')
    .select(
      'id, movement_date, movement_type, quantity, from_branch, to_branch, reason, remarks, reference_number, processed_by',
    )
    .eq('material_id', materialId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (import.meta.env.DEV) console.warn('[material stock movements]', error?.message);
    return [];
  }
  let rows = data as MaterialMovementRow[];
  if (branchCode) {
    rows = rows.filter((r) => r.from_branch === branchCode || r.to_branch === branchCode);
  }
  return rows;
}

export async function resolveBranchCode(branchName: string | null | undefined): Promise<string | null> {
  if (!branchName?.trim()) return null;
  const { data } = await supabase.from('branches').select('code').eq('name', branchName.trim()).maybeSingle();
  return (data as { code?: string } | null)?.code ?? null;
}

export async function fetchVariantStockAtBranch(
  variantId: string,
  branchName: string | null | undefined,
): Promise<number | null> {
  if (!branchName?.trim()) return null;
  const { data: br } = await supabase.from('branches').select('id').eq('name', branchName.trim()).maybeSingle();
  const bid = (br as { id?: string } | null)?.id;
  if (!bid) return null;
  const { data } = await supabase
    .from('product_variant_stock')
    .select('quantity')
    .eq('variant_id', variantId)
    .eq('branch_id', bid)
    .maybeSingle();
  if (!data) return 0;
  return Number((data as { quantity?: unknown }).quantity ?? 0);
}

export async function fetchMaterialStockAtBranch(
  materialId: string,
  branchName: string | null | undefined,
): Promise<number | null> {
  if (!branchName?.trim()) return null;
  const { data: br } = await supabase.from('branches').select('id').eq('name', branchName.trim()).maybeSingle();
  const bid = (br as { id?: string } | null)?.id;
  if (!bid) return null;
  const { data } = await supabase
    .from('material_stock')
    .select('quantity')
    .eq('material_id', materialId)
    .eq('branch_id', bid)
    .maybeSingle();
  if (!data) return 0;
  return Number((data as { quantity?: unknown }).quantity ?? 0);
}
