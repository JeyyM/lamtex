/**
 * Reports & Analytics data layer.
 * Composes existing executive, agent analytics, and finance fetchers
 * into a single bundle for ReportsPage.
 */

import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import { fetchExecutiveDashboard, type ExecutiveDashboardBundle } from '@/src/lib/executiveDashboard';
import {
  fetchAgentAnalyticsBundle,
  getPeriodRange,
  getPreviousPeriodRange,
  type PeriodRange,
  type AgentAnalyticsBundle,
  type BranchAnalyticsRow,
} from '@/src/lib/agentAnalytics';
import {
  resolveDatePeriodQuery,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';
import {
  fetchFinanceMetrics,
  fetchOutstandingOrders,
  computeDueDateFromDelivery,
  deriveOrderDueDateForPersistence,
  formatDateOnlyLocal,
  parseDateOnly,
  type FinanceMetrics,
  type OutstandingOrderRow,
} from '@/src/lib/financeData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportsSalesMonthRow {
  period: string;
  monthKey: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  growth: number;
}

export interface ReportsProductRow {
  /** Product family id — null when line has no variant/product link */
  productId: string | null;
  productName: string;
  categoryName: string;
  categorySlug: string | null;
  unitsSold: number;
  revenue: number;
  orderCount: number;
  profit: number;
  marginPct: number;
}

export interface ReportsProductMonthlyLine {
  productId: string;
  productName: string;
  categoryName: string;
  revenueByMonth: number[];
  unitsByMonth: number[];
}

export interface ReportsProductMonthlySeries {
  monthKeys: string[];
  labels: string[];
  lines: ReportsProductMonthlyLine[];
}

/** One revenue line per order × product × customer — used to roll up top customers for selected products. */
export interface ReportsProductCustomerLineRow {
  productId: string;
  customerId: string;
  customerCode: string | null;
  customerName: string;
  agentId: string | null;
  agentName: string | null;
  orderId: string;
  unitsSold: number;
  revenue: number;
}

export interface ReportsProductVariantRow {
  variantId: string;
  productId: string;
  productName: string;
  categorySlug: string | null;
  sku: string;
  size: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  marginPct: number;
  orderCount: number;
}

export interface ReportsCategoryMonthlyLine {
  categoryName: string;
  categorySlug: string | null;
  revenueByMonth: number[];
  unitsByMonth: number[];
}

export interface ReportsCategoryMonthlySeries {
  monthKeys: string[];
  labels: string[];
  lines: ReportsCategoryMonthlyLine[];
}

export interface ReportsArAgingBucket {
  label: string;
  orderCount: number;
  balanceDue: number;
}

export interface ReportsPipelineStage {
  status: string;
  orderCount: number;
  totalValue: number;
}

export interface ReportsOnTimeTrendPoint {
  label: string;
  monthKey: string;
  completed: number;
  delayed: number;
  failed: number;
  onTimePct: number;
}

export interface ReportsDiscountRow {
  dimension: 'branch' | 'agent';
  name: string;
  orderCount: number;
  avgDiscountPct: number;
  revenue: number;
}

export interface ReportsCollectionCompare {
  /** Value of matured period orders collected on or before due date. */
  collectedCurrent: number;
  collectedPrev: number;
  /** On-time collection rate (% of matured order value paid by due date). */
  collectionRateCurrent: number;
  collectionRatePrev: number;
  /** Point change in on-time rate vs prior period. */
  collectionRateDeltaPts: number;
  /** Still-outstanding balance on matured orders past due (current snapshot). */
  overdueBalanceCurrent: number;
  overdueOrderCountCurrent: number;
  /** Total billed value on matured orders in period. */
  maturedGrossCurrent: number;
  /** @deprecated Alias for collectionRateDeltaPts — kept for older UI references. */
  collectedDeltaPct: number;
}

export interface ReportsCategoryMarginRow {
  categoryName: string;
  categorySlug: string | null;
  revenue: number;
  profit: number;
  marginPct: number;
  unitsSold: number;
}

export interface ReportsCycleTimeStats {
  avgDays: number;
  medianDays: number;
  sampleSize: number;
  buckets: { label: string; count: number }[];
}

export interface ReportsDelayBreakdownRow {
  type: string;
  count: number;
  openCount: number;
}

export interface ReportsBranchScorecardRow {
  branchId: string;
  branchName: string;
  revenue: number;
  profitMarginPct: number;
  quotaAttainmentPct: number;
  onTimePct: number;
  outstanding: number;
  overdueRatioPct: number;
  healthScore: number;
}

export interface ReportsPeriodCounts {
  ordersCurrent: number;
  ordersPrev: number;
  ordersDeltaPct: number;
  onTimeMtd: number;
  onTimePrevMtd: number;
  onTimeDeltaPts: number;
}

export interface ReportsCustomerArRow {
  customerId: string;
  customerCode: string | null;
  customerName: string;
  agentId: string | null;
  agentName: string | null;
  branchName: string | null;
  outstandingBalance: number;
  overdueBalance: number;
  overdueOrderCount: number;
  openOrderCount: number;
  maxDaysOverdue: number;
  oldestDueDate: string | null;
}

export interface ReportsCustomerPeriodRow {
  customerId: string;
  customerCode: string | null;
  customerName: string;
  agentId: string | null;
  agentName: string | null;
  branchName: string | null;
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
  outstandingBalance: number;
  overdueBalance: number;
  overdueOrderCount: number;
  openOrderCount: number;
  maxDaysOverdue: number;
  oldestDueDate: string | null;
  creditLimit: number;
  creditUsed: number;
  /** null when customer has no credit limit configured */
  creditUtilizationPct: number | null;
}

export interface ReportsCustomerSalesSnapshot {
  activeCustomers: number;
  customersWithOverdue: number;
  totalOutstanding: number;
  totalOverdueBalance: number;
}

export interface ReportsEnhancements {
  arAging: ReportsArAgingBucket[];
  orderPipeline: ReportsPipelineStage[];
  onTimeTrend: ReportsOnTimeTrendPoint[];
  discountByBranch: ReportsDiscountRow[];
  discountByAgent: ReportsDiscountRow[];
  collectionCompare: ReportsCollectionCompare;
  categoryMargins: ReportsCategoryMarginRow[];
  cycleTime: ReportsCycleTimeStats;
  delayBreakdown: ReportsDelayBreakdownRow[];
  branchScorecard: ReportsBranchScorecardRow[];
  periodCounts: ReportsPeriodCounts;
  customerArRows: ReportsCustomerArRow[];
  customersInPeriod: ReportsCustomerPeriodRow[];
  customerSalesSnapshot: ReportsCustomerSalesSnapshot;
}

export interface ReportsBranchTrendLine {
  branchId: string;
  branchName: string;
  /** Index into `branchChartColorAt` — revenue rank order, same as Agent Analytics. */
  colorIndex: number;
  revenueByMonth: number[];
  ordersByMonth: number[];
}

export interface ReportsBranchTrendCompare {
  labels: string[];
  monthKeys: string[];
  branches: ReportsBranchTrendLine[];
  totalOrdersByMonth: number[];
}

export interface ReportsBranchRevenueShareRow {
  branchId: string;
  branchName: string;
  revenue: number;
}

export interface ReportsInventorySummary {
  purchaseOrderSpend: number;
  purchaseOrderCount: number;
  purchaseOrderPaid: number;
  productionRequestCount: number;
  rawMaterialCount: number;
  lowStockMaterialCount: number;
  inventoryValue: number;
  activeSupplierCount: number;
  pendingPurchaseOrderCount: number;
  pendingPurchaseOrderValue: number;
  pendingProductionRequestCount: number;
}

export interface ReportsInventoryExpenditurePoint {
  label: string;
  monthKey: string;
  poSpend: number;
  poCount: number;
}

export interface ReportsInventorySupplierRow {
  supplierId: string;
  supplierName: string;
  poCount: number;
  spend: number;
}

export interface ReportsInventoryMaterialSpendPoint {
  label: string;
  monthKey: string;
  materialSpend: number;
  lineCount: number;
}

export interface ReportsInventoryMaterialCategorySpendRow {
  categoryName: string;
  spend: number;
  lineCount: number;
  sharePct: number;
}

export interface ReportsInventoryMaterialCategoryMonthlyLine {
  categoryName: string;
  spendByMonth: number[];
}

export interface ReportsInventoryMaterialCategoryMonthlySeries {
  monthKeys: string[];
  labels: string[];
  lines: ReportsInventoryMaterialCategoryMonthlyLine[];
}

export interface ReportsInventorySupplierTypeSpendRow {
  supplierType: string;
  spend: number;
  poCount: number;
  sharePct: number;
}

export interface ReportsInventoryMaterialRow {
  materialId: string;
  name: string;
  sku: string;
  categoryName: string;
  categorySlug: string | null;
  unit: string;
  totalStock: number;
  reorderPoint: number;
  monthlyConsumption: number;
  daysOfCover: number | null;
  totalValue: number;
  supplierId: string | null;
  supplierName: string | null;
  isLowStock: boolean;
}

export interface ReportsInventoryPurchaseOrderRow {
  id: string;
  poNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  status: string;
  orderDate: string;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: string;
  itemCount: number;
}

export interface ReportsInventoryProductionRequestRow {
  id: string;
  prNumber: string;
  status: string;
  requestDate: string;
  expectedCompletionDate: string | null;
  itemCount: number;
  quantityTotal: number;
  createdBy: string | null;
}

export interface ReportsInventoryReport {
  summary: ReportsInventorySummary;
  expenditureSeries: ReportsInventoryExpenditurePoint[];
  materialSpendSeries: ReportsInventoryMaterialSpendPoint[];
  materialCategorySpend: ReportsInventoryMaterialCategorySpendRow[];
  materialCategoryMonthlySeries: ReportsInventoryMaterialCategoryMonthlySeries;
  supplierTypeSpend: ReportsInventorySupplierTypeSpendRow[];
  suppliers: ReportsInventorySupplierRow[];
  materials: ReportsInventoryMaterialRow[];
  purchaseOrders: ReportsInventoryPurchaseOrderRow[];
  productionRequests: ReportsInventoryProductionRequestRow[];
}

export interface ReportsBundle {
  branchId: string | null;
  branchName: string | null;
  period: PeriodRange;
  generatedAt: string;
  executive: ExecutiveDashboardBundle;
  agents: AgentAnalyticsBundle;
  /** Org-wide agent stats when topbar branch is filtered (Agents tab comparison toggle). */
  agentsAllBranches: AgentAnalyticsBundle | null;
  finance: FinanceMetrics;
  salesSeries: ReportsSalesMonthRow[];
  productsInPeriod: ReportsProductRow[];
  productMonthlySeries: ReportsProductMonthlySeries;
  productCustomerLines: ReportsProductCustomerLineRow[];
  productVariantSales: ReportsProductVariantRow[];
  categoryMonthlySeries: ReportsCategoryMonthlySeries;
  enhancements: ReportsEnhancements;
  branchTrendCompare: ReportsBranchTrendCompare;
  /** Period revenue by branch — always org-wide (ignores topbar branch filter). */
  branchRevenueShare: ReportsBranchRevenueShareRow[];
  inventoryReport: ReportsInventoryReport;
}

const REVENUE_ORDER_STATUSES = [
  'Approved',
  'Scheduled',
  'Loading',
  'Packed',
  'Ready',
  'In Transit',
  'Delivered',
  'Completed',
];

// ---------------------------------------------------------------------------
// Period mapping
// ---------------------------------------------------------------------------

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function mapDatePeriodToReportsPeriod(
  kind: DatePeriodKind,
  customStart: string,
  customEnd: string,
): PeriodRange {
  const q = resolveDatePeriodQuery(kind, customStart, customEnd);
  if (q.invalid) {
    return getPeriodRange('month');
  }
  if (kind === 'all') {
    return getPeriodRange('custom', { start: '2020-01-01', end: isoDate(new Date()) });
  }
  if (kind === 'custom') {
    return getPeriodRange('custom', { start: q.from, end: q.to });
  }
  if (
    kind === 'day' ||
    kind === 'week' ||
    kind === 'month' ||
    kind === 'sixMonths' ||
    kind === 'ytd' ||
    kind === 'year'
  ) {
    return getPeriodRange(kind);
  }
  return getPeriodRange('custom', { start: q.from, end: q.to });
}

// ---------------------------------------------------------------------------
// Sub-fetchers
// ---------------------------------------------------------------------------

function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function fetchSalesMonthlySeries(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsSalesMonthRow[]> {
  try {
    let q = supabase
      .from('orders')
      .select('order_date, total_amount, status')
      .gte('order_date', from)
      .lte('order_date', to)
      .in('status', REVENUE_ORDER_STATUSES);
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    const byMonth = new Map<string, { revenue: number; orders: number }>();
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const raw = toStr(r.order_date);
      if (!raw) continue;
      const key = raw.slice(0, 7);
      const cur = byMonth.get(key) ?? { revenue: 0, orders: 0 };
      cur.revenue += toNumber(r.total_amount);
      cur.orders += 1;
      byMonth.set(key, cur);
    }

    const keys = [...byMonth.keys()].sort();
    const rows: ReportsSalesMonthRow[] = keys.map((monthKey, i) => {
      const agg = byMonth.get(monthKey)!;
      const [y, m] = monthKey.split('-').map(Number);
      const label = `${MONTH_LABELS[(m ?? 1) - 1]} ${y}`;
      const prevKey = keys[i - 1];
      const prevRev = prevKey ? byMonth.get(prevKey)?.revenue ?? 0 : 0;
      const growth = prevRev > 0 ? ((agg.revenue - prevRev) / prevRev) * 100 : 0;
      return {
        period: label,
        monthKey,
        revenue: agg.revenue,
        orders: agg.orders,
        avgOrderValue: agg.orders > 0 ? agg.revenue / agg.orders : 0,
        growth,
      };
    });
    return rows;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] sales series', e);
    return [];
  }
}

function toStr(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return null;
}

type VariantProductMeta = {
  productId: string;
  productName: string;
  categoryName: string;
  categorySlug: string | null;
  costPrice: number;
  sku: string;
  size: string;
};

async function loadVariantProductMeta(variantIds: string[]): Promise<Map<string, VariantProductMeta>> {
  const out = new Map<string, VariantProductMeta>();
  const ids = [...new Set(variantIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += 200) {
    const slice = ids.slice(i, i + 200);
    const { data: pvs } = await supabase
      .from('product_variants')
      .select('id, sku, size, cost_price, product_id, products(id, name, product_categories(name, slug))')
      .in('id', slice);
    for (const pv of (pvs ?? []) as Array<Record<string, unknown>>) {
      const variantId = String(pv.id);
      const products = pv.products;
      let productId = toStr(pv.product_id) ?? '';
      let productName = 'Unknown product';
      let categoryName = 'Uncategorized';
      let categorySlug: string | null = null;
      if (products && typeof products === 'object' && !Array.isArray(products)) {
        const p = products as Record<string, unknown>;
        productId = toStr(p.id) ?? productId;
        productName = toStr(p.name) ?? productName;
        const cats = p.product_categories;
        if (cats && typeof cats === 'object' && !Array.isArray(cats)) {
          categoryName = toStr((cats as Record<string, unknown>).name) ?? categoryName;
          categorySlug = toStr((cats as Record<string, unknown>).slug);
        }
      }
      out.set(variantId, {
        productId,
        productName,
        categoryName,
        categorySlug,
        costPrice: toNumber(pv.cost_price),
        sku: toStr(pv.sku) ?? '—',
        size: toStr(pv.size) ?? '—',
      });
    }
  }
  return out;
}

function monthKeysInRange(from: string, to: string): { monthKeys: string[]; labels: string[] } {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { monthKeys: [], labels: [] };
  }
  const monthKeys: string[] = [];
  const labels: string[] = [];
  let d = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (d <= endMonth) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    monthKeys.push(`${y}-${String(m).padStart(2, '0')}`);
    labels.push(`${MONTH_LABELS[m - 1]} ${y}`);
    d = new Date(y, m, 1);
  }
  return { monthKeys, labels };
}

async function fetchOrderIdsInPeriod(
  branchId: string | null,
  from: string,
  to: string,
): Promise<Map<string, string>> {
  let orderQ = supabase
    .from('orders')
    .select('id, order_date')
    .gte('order_date', from)
    .lte('order_date', to)
    .in('status', REVENUE_ORDER_STATUSES);
  if (branchId) orderQ = orderQ.eq('branch_id', branchId);
  const { data: orders, error } = await orderQ;
  if (error) throw error;
  const map = new Map<string, string>();
  for (const o of (orders ?? []) as Array<Record<string, unknown>>) {
    const id = String(o.id);
    const od = toStr(o.order_date);
    if (od) map.set(id, od.slice(0, 7));
  }
  return map;
}

async function fetchProductsInPeriod(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsProductRow[]> {
  try {
    const orderMonthById = await fetchOrderIdsInPeriod(branchId, from, to);
    if (orderMonthById.size === 0) return [];

    const orderIds = [...orderMonthById.keys()];
    const lineChunks: Array<Record<string, unknown>> = [];
    for (let i = 0; i < orderIds.length; i += 200) {
      const { data: lines, error: lErr } = await supabase
        .from('order_line_items')
        .select('product_name, quantity, line_total, order_id, variant_id')
        .in('order_id', orderIds.slice(i, i + 200));
      if (lErr) throw lErr;
      lineChunks.push(...((lines ?? []) as Array<Record<string, unknown>>));
    }

    const variantIds = lineChunks
      .map((row) => toStr(row.variant_id))
      .filter((id): id is string => Boolean(id));
    const metaByVariant = await loadVariantProductMeta(variantIds);

    type Agg = {
      productId: string | null;
      productName: string;
      categoryName: string;
      categorySlug: string | null;
      units: number;
      revenue: number;
      profit: number;
      orders: Set<string>;
    };
    const agg = new Map<string, Agg>();

    for (const row of lineChunks) {
      const orderId = String(row.order_id);
      const qty = toNumber(row.quantity);
      const revenue = toNumber(row.line_total);
      const vid = toStr(row.variant_id);
      const meta = vid ? metaByVariant.get(vid) : null;
      const productId = meta?.productId ?? null;
      const productName = meta?.productName ?? toStr(row.product_name) ?? 'Unknown';
      const categoryName = meta?.categoryName ?? 'Uncategorized';
      const categorySlug = meta?.categorySlug ?? null;
      const key = productId ?? `name:${productName.toLowerCase()}`;
      const cost = meta ? meta.costPrice * qty : 0;
      const cur =
        agg.get(key) ??
        ({
          productId,
          productName,
          categoryName,
          categorySlug,
          units: 0,
          revenue: 0,
          profit: 0,
          orders: new Set<string>(),
        } satisfies Agg);
      cur.units += qty;
      cur.revenue += revenue;
      cur.profit += revenue - cost;
      cur.orders.add(orderId);
      agg.set(key, cur);
    }

    return [...agg.values()]
      .map((v) => ({
        productId: v.productId,
        productName: v.productName,
        categoryName: v.categoryName,
        categorySlug: v.categorySlug,
        unitsSold: v.units,
        revenue: v.revenue,
        orderCount: v.orders.size,
        profit: v.profit,
        marginPct: v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] products in period', e);
    return [];
  }
}

async function fetchProductMonthlySeries(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsProductMonthlySeries> {
  const empty: ReportsProductMonthlySeries = { monthKeys: [], labels: [], lines: [] };
  try {
    const { monthKeys, labels } = monthKeysInRange(from, to);
    if (monthKeys.length === 0) return empty;

    const orderMonthById = await fetchOrderIdsInPeriod(branchId, from, to);
    if (orderMonthById.size === 0) return { monthKeys, labels, lines: [] };

    const orderIds = [...orderMonthById.keys()];
    const lineChunks: Array<Record<string, unknown>> = [];
    for (let i = 0; i < orderIds.length; i += 200) {
      const { data: lines, error: lErr } = await supabase
        .from('order_line_items')
        .select('quantity, line_total, order_id, variant_id, product_name')
        .in('order_id', orderIds.slice(i, i + 200));
      if (lErr) throw lErr;
      lineChunks.push(...((lines ?? []) as Array<Record<string, unknown>>));
    }

    const variantIds = lineChunks
      .map((row) => toStr(row.variant_id))
      .filter((id): id is string => Boolean(id));
    const metaByVariant = await loadVariantProductMeta(variantIds);

    type LineAgg = {
      productId: string;
      productName: string;
      categoryName: string;
      revenueByMonth: number[];
      unitsByMonth: number[];
    };
    const byProduct = new Map<string, LineAgg>();

    for (const row of lineChunks) {
      const orderId = String(row.order_id);
      const monthKey = orderMonthById.get(orderId);
      if (!monthKey) continue;
      const mi = monthKeys.indexOf(monthKey);
      if (mi < 0) continue;

      const vid = toStr(row.variant_id);
      const meta = vid ? metaByVariant.get(vid) : null;
      if (!meta?.productId) continue;

      const cur =
        byProduct.get(meta.productId) ??
        ({
          productId: meta.productId,
          productName: meta.productName,
          categoryName: meta.categoryName,
          revenueByMonth: monthKeys.map(() => 0),
          unitsByMonth: monthKeys.map(() => 0),
        } satisfies LineAgg);
      cur.revenueByMonth[mi] += toNumber(row.line_total);
      cur.unitsByMonth[mi] += toNumber(row.quantity);
      byProduct.set(meta.productId, cur);
    }

    const lines = [...byProduct.values()].sort(
      (a, b) =>
        b.revenueByMonth.reduce((s, v) => s + v, 0) - a.revenueByMonth.reduce((s, v) => s + v, 0),
    );
    return { monthKeys, labels, lines };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] product monthly series', e);
    return empty;
  }
}

async function fetchProductCustomerLines(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsProductCustomerLineRow[]> {
  try {
    const orderMonthById = await fetchOrderIdsInPeriod(branchId, from, to);
    if (orderMonthById.size === 0) return [];

    const orderIds = [...orderMonthById.keys()];
    type OrderMeta = {
      customerId: string;
      customerName: string;
      customerCode: string | null;
      agentId: string | null;
      agentName: string | null;
    };
    const orderCustomerById = new Map<string, OrderMeta>();
    for (let i = 0; i < orderIds.length; i += 200) {
      const { data: orders, error: oErr } = await supabase
        .from('orders')
        .select('id, customer_id, customer_name, agent_id, agent_name, customers(customer_code)')
        .in('id', orderIds.slice(i, i + 200));
      if (oErr) throw oErr;
      for (const row of (orders ?? []) as Array<Record<string, unknown>>) {
        const id = String(row.id);
        let customerCode: string | null = null;
        const customers = row.customers;
        if (customers && typeof customers === 'object' && !Array.isArray(customers)) {
          customerCode = toStr((customers as Record<string, unknown>).customer_code);
        }
        orderCustomerById.set(id, {
          customerId: toStr(row.customer_id) ?? toStr(row.customer_name) ?? id,
          customerName: toStr(row.customer_name) ?? 'Unknown customer',
          customerCode,
          agentId: toStr(row.agent_id),
          agentName: toStr(row.agent_name),
        });
      }
    }

    const lineChunks: Array<Record<string, unknown>> = [];
    for (let i = 0; i < orderIds.length; i += 200) {
      const { data: lines, error: lErr } = await supabase
        .from('order_line_items')
        .select('quantity, line_total, order_id, variant_id')
        .in('order_id', orderIds.slice(i, i + 200));
      if (lErr) throw lErr;
      lineChunks.push(...((lines ?? []) as Array<Record<string, unknown>>));
    }

    const variantIds = lineChunks
      .map((row) => toStr(row.variant_id))
      .filter((id): id is string => Boolean(id));
    const metaByVariant = await loadVariantProductMeta(variantIds);

    type Agg = {
      productId: string;
      customerId: string;
      customerCode: string | null;
      customerName: string;
      agentId: string | null;
      agentName: string | null;
      orderId: string;
      unitsSold: number;
      revenue: number;
    };
    const agg = new Map<string, Agg>();

    for (const row of lineChunks) {
      const orderId = String(row.order_id);
      const customer = orderCustomerById.get(orderId);
      const vid = toStr(row.variant_id);
      const meta = vid ? metaByVariant.get(vid) : null;
      if (!customer || !meta?.productId) continue;

      const key = `${meta.productId}:${customer.customerId}:${orderId}`;
      const cur =
        agg.get(key) ??
        ({
          productId: meta.productId,
          customerId: customer.customerId,
          customerCode: customer.customerCode,
          customerName: customer.customerName,
          agentId: customer.agentId,
          agentName: customer.agentName,
          orderId,
          unitsSold: 0,
          revenue: 0,
        } satisfies Agg);
      cur.unitsSold += toNumber(row.quantity);
      cur.revenue += toNumber(row.line_total);
      if (!cur.customerCode && customer.customerCode) cur.customerCode = customer.customerCode;
      if (!cur.agentId && customer.agentId) cur.agentId = customer.agentId;
      if (!cur.agentName && customer.agentName) cur.agentName = customer.agentName;
      agg.set(key, cur);
    }

    return [...agg.values()];
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] product customer lines', e);
    return [];
  }
}

async function fetchProductVariantSales(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsProductVariantRow[]> {
  try {
    const orderMonthById = await fetchOrderIdsInPeriod(branchId, from, to);
    if (orderMonthById.size === 0) return [];

    const orderIds = [...orderMonthById.keys()];
    const lineChunks: Array<Record<string, unknown>> = [];
    for (let i = 0; i < orderIds.length; i += 200) {
      const { data: lines, error: lErr } = await supabase
        .from('order_line_items')
        .select('quantity, line_total, order_id, variant_id')
        .in('order_id', orderIds.slice(i, i + 200));
      if (lErr) throw lErr;
      lineChunks.push(...((lines ?? []) as Array<Record<string, unknown>>));
    }

    const variantIds = lineChunks
      .map((row) => toStr(row.variant_id))
      .filter((id): id is string => Boolean(id));
    const metaByVariant = await loadVariantProductMeta(variantIds);

    type Agg = {
      variantId: string;
      productId: string;
      productName: string;
      categorySlug: string | null;
      sku: string;
      size: string;
      units: number;
      revenue: number;
      profit: number;
      orders: Set<string>;
    };
    const agg = new Map<string, Agg>();

    for (const row of lineChunks) {
      const orderId = String(row.order_id);
      const vid = toStr(row.variant_id);
      const meta = vid ? metaByVariant.get(vid) : null;
      if (!vid || !meta?.productId) continue;

      const qty = toNumber(row.quantity);
      const revenue = toNumber(row.line_total);
      const cur =
        agg.get(vid) ??
        ({
          variantId: vid,
          productId: meta.productId,
          productName: meta.productName,
          categorySlug: meta.categorySlug,
          sku: meta.sku,
          size: meta.size,
          units: 0,
          revenue: 0,
          profit: 0,
          orders: new Set<string>(),
        } satisfies Agg);
      cur.units += qty;
      cur.revenue += revenue;
      cur.profit += revenue - meta.costPrice * qty;
      cur.orders.add(orderId);
      agg.set(vid, cur);
    }

    return [...agg.values()]
      .map((v) => ({
        variantId: v.variantId,
        productId: v.productId,
        productName: v.productName,
        categorySlug: v.categorySlug,
        sku: v.sku,
        size: v.size,
        unitsSold: v.units,
        revenue: v.revenue,
        profit: v.profit,
        marginPct: v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0,
        orderCount: v.orders.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] product variant sales', e);
    return [];
  }
}

async function fetchCategoryMonthlySeries(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsCategoryMonthlySeries> {
  const empty: ReportsCategoryMonthlySeries = { monthKeys: [], labels: [], lines: [] };
  try {
    const { monthKeys, labels } = monthKeysInRange(from, to);
    if (monthKeys.length === 0) return empty;

    const orderMonthById = await fetchOrderIdsInPeriod(branchId, from, to);
    if (orderMonthById.size === 0) return { monthKeys, labels, lines: [] };

    const orderIds = [...orderMonthById.keys()];
    const lineChunks: Array<Record<string, unknown>> = [];
    for (let i = 0; i < orderIds.length; i += 200) {
      const { data: lines, error: lErr } = await supabase
        .from('order_line_items')
        .select('quantity, line_total, order_id, variant_id')
        .in('order_id', orderIds.slice(i, i + 200));
      if (lErr) throw lErr;
      lineChunks.push(...((lines ?? []) as Array<Record<string, unknown>>));
    }

    const variantIds = lineChunks
      .map((row) => toStr(row.variant_id))
      .filter((id): id is string => Boolean(id));
    const metaByVariant = await loadVariantProductMeta(variantIds);

    type LineAgg = {
      categoryName: string;
      categorySlug: string | null;
      revenueByMonth: number[];
      unitsByMonth: number[];
    };
    const byCategory = new Map<string, LineAgg>();

    for (const row of lineChunks) {
      const orderId = String(row.order_id);
      const monthKey = orderMonthById.get(orderId);
      if (!monthKey) continue;
      const mi = monthKeys.indexOf(monthKey);
      if (mi < 0) continue;

      const vid = toStr(row.variant_id);
      const meta = vid ? metaByVariant.get(vid) : null;
      const categoryName = meta?.categoryName ?? 'Uncategorized';
      const categorySlug = meta?.categorySlug ?? null;

      const cur =
        byCategory.get(categoryName) ??
        ({
          categoryName,
          categorySlug,
          revenueByMonth: monthKeys.map(() => 0),
          unitsByMonth: monthKeys.map(() => 0),
        } satisfies LineAgg);
      cur.revenueByMonth[mi] += toNumber(row.line_total);
      cur.unitsByMonth[mi] += toNumber(row.quantity);
      byCategory.set(categoryName, cur);
    }

    const lines = [...byCategory.values()].sort(
      (a, b) =>
        b.revenueByMonth.reduce((s, v) => s + v, 0) - a.revenueByMonth.reduce((s, v) => s + v, 0),
    );
    return { monthKeys, labels, lines };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] category monthly series', e);
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Enhancement fetchers (Batch 1–3)
// ---------------------------------------------------------------------------

export function deltaPct(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

const PIPELINE_STATUS_ORDER = [
  'Pending',
  'Approved',
  'Scheduled',
  'Loading',
  'Packed',
  'Ready',
  'In Transit',
  'Partially Fulfilled',
  'Delivered',
  'Completed',
  'Cancelled',
] as const;

const AR_AGING_LABELS = ['Current', '1–30 days', '31–60 days', '61–90 days', '90+ days'] as const;

function bucketArAging(daysOverdue: number): number {
  if (daysOverdue <= 0) return 0;
  if (daysOverdue <= 30) return 1;
  if (daysOverdue <= 60) return 2;
  if (daysOverdue <= 90) return 3;
  return 4;
}

export function buildArAgingBuckets(rows: OutstandingOrderRow[]): ReportsArAgingBucket[] {
  const buckets = AR_AGING_LABELS.map((label) => ({
    label,
    orderCount: 0,
    balanceDue: 0,
  }));

  for (const row of rows) {
    if (row.balanceDue <= 0) continue;
    const idx = bucketArAging(row.daysOverdue);
    buckets[idx].orderCount += 1;
    buckets[idx].balanceDue += row.balanceDue;
  }

  return buckets;
}

type CustomerArBucket = {
  customerId: string;
  customerCode: string | null;
  customerName: string;
  agentId: string | null;
  agentName: string | null;
  branchName: string | null;
  outstandingBalance: number;
  overdueBalance: number;
  overdueOrderCount: number;
  openOrderCount: number;
  maxDaysOverdue: number;
  oldestDueDate: string | null;
};

export function buildCustomerArRows(rows: OutstandingOrderRow[]): ReportsCustomerArRow[] {
  const map = new Map<string, CustomerArBucket>();

  for (const row of rows) {
    if (row.balanceDue <= 0) continue;

    const customerId = row.customerId ?? row.orderNumber;
    const cur =
      map.get(customerId) ??
      ({
        customerId,
        customerCode: row.customerCode,
        customerName: row.customerName ?? row.customerCode ?? 'Unknown customer',
        agentId: row.agentId,
        agentName: row.agentName,
        branchName: row.branchName,
        outstandingBalance: 0,
        overdueBalance: 0,
        overdueOrderCount: 0,
        openOrderCount: 0,
        maxDaysOverdue: 0,
        oldestDueDate: null,
      } satisfies CustomerArBucket);

    cur.outstandingBalance += row.balanceDue;
    cur.openOrderCount += 1;

    const isOverdue = row.daysOverdue > 0 || row.paymentStatus === 'Overdue';
    if (isOverdue) {
      cur.overdueBalance += row.balanceDue;
      cur.overdueOrderCount += 1;
      cur.maxDaysOverdue = Math.max(cur.maxDaysOverdue, row.daysOverdue);
      if (row.dueDate) {
        if (!cur.oldestDueDate || row.dueDate < cur.oldestDueDate) {
          cur.oldestDueDate = row.dueDate;
        }
      }
    }

    if (!cur.agentId && row.agentId) cur.agentId = row.agentId;
    if (!cur.agentName && row.agentName) cur.agentName = row.agentName;
    if (!cur.branchName && row.branchName) cur.branchName = row.branchName;
    if (!cur.customerCode && row.customerCode) cur.customerCode = row.customerCode;

    map.set(customerId, cur);
  }

  return [...map.values()].sort((a, b) => b.overdueBalance - a.overdueBalance || b.outstandingBalance - a.outstandingBalance);
}

export function buildCustomerSalesSnapshot(
  customerArRows: ReportsCustomerArRow[],
  customersInPeriod: ReportsCustomerPeriodRow[],
): ReportsCustomerSalesSnapshot {
  const customersWithOverdue = customerArRows.filter((c) => c.overdueBalance > 0).length;
  return {
    activeCustomers: customersInPeriod.length,
    customersWithOverdue,
    totalOutstanding: customerArRows.reduce((s, c) => s + c.outstandingBalance, 0),
    totalOverdueBalance: customerArRows.reduce((s, c) => s + c.overdueBalance, 0),
  };
}

async function fetchCustomersInPeriod(
  branchId: string | null,
  from: string,
  to: string,
): Promise<
  Array<{
    customerId: string;
    customerName: string;
    orderCount: number;
    revenue: number;
    agentId: string | null;
    agentName: string | null;
  }>
> {
  try {
    let q = supabase
      .from('orders')
      .select('customer_id, customer_name, agent_id, agent_name, total_amount')
      .gte('order_date', from)
      .lte('order_date', to)
      .not('status', 'in', '("Cancelled","Rejected","Draft")');
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    type Agg = {
      customerId: string;
      customerName: string;
      agentId: string | null;
      agentName: string | null;
      orders: number;
      revenue: number;
    };
    const map = new Map<string, Agg>();

    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const customerId = toStr(row.customer_id) ?? toStr(row.customer_name) ?? 'unknown';
      const customerName = toStr(row.customer_name) ?? 'Unknown customer';
      const agentId = toStr(row.agent_id);
      const agentName = toStr(row.agent_name);
      const cur =
        map.get(customerId) ??
        ({ customerId, customerName, agentId: null, agentName: null, orders: 0, revenue: 0 } satisfies Agg);
      cur.orders += 1;
      cur.revenue += toNumber(row.total_amount);
      if (!cur.agentId && agentId) cur.agentId = agentId;
      if (!cur.agentName && agentName) cur.agentName = agentName;
      map.set(customerId, cur);
    }

    return [...map.values()]
      .map((c) => ({
        customerId: c.customerId,
        customerName: c.customerName,
        orderCount: c.orders,
        revenue: c.revenue,
        agentId: c.agentId,
        agentName: c.agentName,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] customers in period', e);
    return [];
  }
}

function buildSalesCustomerRows(
  periodRows: Array<{
    customerId: string;
    customerName: string;
    orderCount: number;
    revenue: number;
    agentId: string | null;
    agentName: string | null;
  }>,
  arRows: ReportsCustomerArRow[],
): ReportsCustomerPeriodRow[] {
  const arByCustomer = new Map(arRows.map((c) => [c.customerId, c]));

  return periodRows
    .map((p) => {
      const ar = arByCustomer.get(p.customerId);
      return {
        customerId: p.customerId,
        customerCode: ar?.customerCode ?? null,
        customerName: p.customerName,
        agentId: ar?.agentId ?? p.agentId,
        agentName: ar?.agentName ?? p.agentName,
        branchName: ar?.branchName ?? null,
        orderCount: p.orderCount,
        revenue: p.revenue,
        averageOrderValue: p.orderCount > 0 ? p.revenue / p.orderCount : 0,
        outstandingBalance: ar?.outstandingBalance ?? 0,
        overdueBalance: ar?.overdueBalance ?? 0,
        overdueOrderCount: ar?.overdueOrderCount ?? 0,
        openOrderCount: ar?.openOrderCount ?? 0,
        maxDaysOverdue: ar?.maxDaysOverdue ?? 0,
        oldestDueDate: ar?.oldestDueDate ?? null,
        creditLimit: 0,
        creditUsed: 0,
        creditUtilizationPct: null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

async function fetchCustomerCreditMap(
  customerIds: string[],
): Promise<Map<string, { creditLimit: number; creditUsed: number }>> {
  const out = new Map<string, { creditLimit: number; creditUsed: number }>();
  const ids = [...new Set(customerIds.filter((id) => id && id !== 'unknown'))];
  if (ids.length === 0) return out;

  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('customers')
      .select('id, credit_limit, outstanding_balance')
      .in('id', chunk);
    if (error) {
      if (import.meta.env.DEV) console.warn('[reports] customer credit', error);
      continue;
    }
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      out.set(String(row.id), {
        creditLimit: toNumber(row.credit_limit),
        creditUsed: toNumber(row.outstanding_balance),
      });
    }
  }
  return out;
}

async function attachCustomerCredit(rows: ReportsCustomerPeriodRow[]): Promise<ReportsCustomerPeriodRow[]> {
  const creditMap = await fetchCustomerCreditMap(rows.map((r) => r.customerId));
  return rows.map((r) => {
    const credit = creditMap.get(r.customerId);
    const creditLimit = credit?.creditLimit ?? 0;
    const creditUsed = credit?.creditUsed ?? 0;
    return {
      ...r,
      creditLimit,
      creditUsed,
      creditUtilizationPct:
        creditLimit > 0 ? Math.min(100, (creditUsed / creditLimit) * 100) : null,
    };
  });
}

async function fetchBranchRevenueShare(from: string, to: string): Promise<ReportsBranchRevenueShareRow[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, branch_id, branches(name)')
      .gte('order_date', from)
      .lte('order_date', to)
      .in('status', [...REVENUE_ORDER_STATUSES]);
    if (error) throw error;

    type Agg = { branchId: string; branchName: string; revenue: number };
    const map = new Map<string, Agg>();

    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const branchId = toStr(row.branch_id);
      if (!branchId) continue;
      const branchEmbed = row.branches;
      const branchName =
        branchEmbed && typeof branchEmbed === 'object' && !Array.isArray(branchEmbed)
          ? toStr((branchEmbed as Record<string, unknown>).name) ?? 'Unknown'
          : 'Unknown';
      const cur = map.get(branchId) ?? { branchId, branchName, revenue: 0 };
      cur.revenue += toNumber(row.total_amount);
      map.set(branchId, cur);
    }

    return [...map.values()]
      .filter((b) => b.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] branch revenue share', e);
    return [];
  }
}

async function fetchOrderPipeline(branchId: string | null): Promise<ReportsPipelineStage[]> {
  try {
    let q = supabase
      .from('orders')
      .select('status, total_amount')
      .not('status', 'in', '("Draft","Rejected")');
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    const agg = new Map<string, { count: number; value: number }>();
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const status = toStr(r.status) ?? 'Unknown';
      const cur = agg.get(status) ?? { count: 0, value: 0 };
      cur.count += 1;
      cur.value += toNumber(r.total_amount);
      agg.set(status, cur);
    }

    const ordered: ReportsPipelineStage[] = [];
    for (const status of PIPELINE_STATUS_ORDER) {
      const hit = agg.get(status);
      if (hit && hit.count > 0) {
        ordered.push({ status, orderCount: hit.count, totalValue: hit.value });
      }
    }
    for (const [status, hit] of agg) {
      if (!(PIPELINE_STATUS_ORDER as readonly string[]).includes(status)) {
        ordered.push({ status, orderCount: hit.count, totalValue: hit.value });
      }
    }
    return ordered;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] order pipeline', e);
    return [];
  }
}

function computeOnTimePct(completed: number, delayed: number, failed: number): number {
  const closed = completed + delayed + failed;
  return closed > 0 ? (completed / closed) * 100 : 0;
}

async function fetchOnTimeTrend(branchId: string | null, months = 6): Promise<ReportsOnTimeTrendPoint[]> {
  try {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
    const from = isoDate(start);

    let q = supabase
      .from('trips')
      .select('status, scheduled_date, branch_id')
      .gte('scheduled_date', from);
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    const byMonth = new Map<string, { completed: number; delayed: number; failed: number }>();
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const raw = toStr(r.scheduled_date);
      if (!raw) continue;
      const key = raw.slice(0, 7);
      const cur = byMonth.get(key) ?? { completed: 0, delayed: 0, failed: 0 };
      const status = toStr(r.status);
      if (status === 'Completed') cur.completed += 1;
      else if (status === 'Delayed') cur.delayed += 1;
      else if (status === 'Failed') cur.failed += 1;
      byMonth.set(key, cur);
    }

    const keys = [...byMonth.keys()].sort().slice(-months);
    return keys.map((monthKey) => {
      const agg = byMonth.get(monthKey)!;
      const [y, m] = monthKey.split('-').map(Number);
      return {
        label: `${MONTH_LABELS[(m ?? 1) - 1]} ${y}`,
        monthKey,
        completed: agg.completed,
        delayed: agg.delayed,
        failed: agg.failed,
        onTimePct: computeOnTimePct(agg.completed, agg.delayed, agg.failed),
      };
    });
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] on-time trend', e);
    return [];
  }
}

async function fetchOnTimeByBranch(branchId: string | null): Promise<Map<string, number>> {
  try {
    const today = new Date();
    const from = isoDate(new Date(today.getFullYear(), today.getMonth() - 5, 1));

    let q = supabase
      .from('trips')
      .select('status, scheduled_date, branch_id')
      .gte('scheduled_date', from);
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    const byBranch = new Map<string, { completed: number; delayed: number; failed: number }>();
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const bid = toStr(r.branch_id);
      if (!bid) continue;
      const cur = byBranch.get(bid) ?? { completed: 0, delayed: 0, failed: 0 };
      const status = toStr(r.status);
      if (status === 'Completed') cur.completed += 1;
      else if (status === 'Delayed') cur.delayed += 1;
      else if (status === 'Failed') cur.failed += 1;
      byBranch.set(bid, cur);
    }

    const out = new Map<string, number>();
    for (const [bid, agg] of byBranch) {
      out.set(bid, computeOnTimePct(agg.completed, agg.delayed, agg.failed));
    }
    return out;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] on-time by branch', e);
    return new Map();
  }
}

async function fetchOnTimeMtdComparison(branchId: string | null): Promise<{
  mtd: number;
  prevMtd: number;
}> {
  try {
    const now = new Date();
    const thisStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const nextStart = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    const prevStart = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    let q = supabase
      .from('trips')
      .select('status, scheduled_date, branch_id')
      .gte('scheduled_date', prevStart)
      .lt('scheduled_date', nextStart);
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    const mtd = { completed: 0, delayed: 0, failed: 0 };
    const prev = { completed: 0, delayed: 0, failed: 0 };

    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const raw = toStr(r.scheduled_date);
      if (!raw) continue;
      const bucket = raw >= thisStart && raw < nextStart ? mtd : raw >= prevStart && raw < thisStart ? prev : null;
      if (!bucket) continue;
      const status = toStr(r.status);
      if (status === 'Completed') bucket.completed += 1;
      else if (status === 'Delayed') bucket.delayed += 1;
      else if (status === 'Failed') bucket.failed += 1;
    }

    return {
      mtd: computeOnTimePct(mtd.completed, mtd.delayed, mtd.failed),
      prevMtd: computeOnTimePct(prev.completed, prev.delayed, prev.failed),
    };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] on-time mtd compare', e);
    return { mtd: 0, prevMtd: 0 };
  }
}

async function fetchOrderCountsForPeriods(
  branchId: string | null,
  current: PeriodRange,
  prev: PeriodRange,
): Promise<ReportsPeriodCounts> {
  try {
    const countInRange = async (from: string, to: string): Promise<number> => {
      let q = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('order_date', from)
        .lte('order_date', to)
        .not('status', 'in', '("Cancelled","Rejected","Draft")');
      if (branchId) q = q.eq('branch_id', branchId);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    };

    const [ordersCurrent, ordersPrev, onTime] = await Promise.all([
      countInRange(current.start, current.end),
      countInRange(prev.start, prev.end),
      fetchOnTimeMtdComparison(branchId),
    ]);

    return {
      ordersCurrent,
      ordersPrev,
      ordersDeltaPct: deltaPct(ordersCurrent, ordersPrev),
      onTimeMtd: onTime.mtd,
      onTimePrevMtd: onTime.prevMtd,
      onTimeDeltaPts: onTime.mtd - onTime.prevMtd,
    };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] period counts', e);
    return {
      ordersCurrent: 0,
      ordersPrev: 0,
      ordersDeltaPct: 0,
      onTimeMtd: 0,
      onTimePrevMtd: 0,
      onTimeDeltaPts: 0,
    };
  }
}

async function fetchDiscountAnalysis(
  branchId: string | null,
  from: string,
  to: string,
): Promise<{ byBranch: ReportsDiscountRow[]; byAgent: ReportsDiscountRow[] }> {
  try {
    let q = supabase
      .from('orders')
      .select('total_amount, discount_percent, agent_name, branches(name)')
      .gte('order_date', from)
      .lte('order_date', to)
      .not('status', 'in', '("Cancelled","Rejected","Draft")');
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    type Agg = { orders: number; discSum: number; revenue: number };
    const branchAgg = new Map<string, Agg>();
    const agentAgg = new Map<string, Agg>();

    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const revenue = toNumber(r.total_amount);
      const disc = toNumber(r.discount_percent);
      const branchEmbed = r.branches;
      const branchName =
        branchEmbed && typeof branchEmbed === 'object' && !Array.isArray(branchEmbed)
          ? toStr((branchEmbed as Record<string, unknown>).name) ?? 'Unknown'
          : 'Unknown';
      const agentName = toStr(r.agent_name) ?? 'Unassigned';

      for (const [map, name] of [[branchAgg, branchName], [agentAgg, agentName]] as const) {
        const cur = map.get(name) ?? { orders: 0, discSum: 0, revenue: 0 };
        cur.orders += 1;
        cur.discSum += disc;
        cur.revenue += revenue;
        map.set(name, cur);
      }
    }

    const toRows = (map: Map<string, Agg>, dimension: 'branch' | 'agent'): ReportsDiscountRow[] =>
      [...map.entries()]
        .map(([name, v]) => ({
          dimension,
          name,
          orderCount: v.orders,
          avgDiscountPct: v.orders > 0 ? v.discSum / v.orders : 0,
          revenue: v.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15);

    return {
      byBranch: toRows(branchAgg, 'branch'),
      byAgent: toRows(agentAgg, 'agent'),
    };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] discount analysis', e);
    return { byBranch: [], byAgent: [] };
  }
}

const COLLECTION_ORDER_STATUSES = ['Partially Fulfilled', 'Delivered', 'Completed'] as const;

function orderDueDateYmd(row: Record<string, unknown>): string | null {
  const fromDelivery = computeDueDateFromDelivery(
    row.actual_delivery != null ? String(row.actual_delivery) : null,
    row.payment_terms != null ? String(row.payment_terms) : null,
  );
  if (fromDelivery) return formatDateOnlyLocal(fromDelivery);
  return deriveOrderDueDateForPersistence({
    order_date: row.order_date != null ? String(row.order_date) : null,
    actual_delivery: row.actual_delivery != null ? String(row.actual_delivery) : null,
    payment_terms: row.payment_terms != null ? String(row.payment_terms) : null,
    customer_payment_terms: null,
  });
}

async function fetchLastVerifiedPaymentDates(orderIds: string[]): Promise<Map<string, Date>> {
  const out = new Map<string, Date>();
  if (orderIds.length === 0) return out;

  const chunkSize = 200;
  for (let i = 0; i < orderIds.length; i += chunkSize) {
    const chunk = orderIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('order_proof_documents')
      .select('order_id, verified_at, status')
      .eq('type', 'payment')
      .eq('status', 'verified')
      .in('order_id', chunk);
    if (error) {
      if (import.meta.env.DEV) console.warn('[reports] payment proof dates', error);
      continue;
    }
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const orderId = String(row.order_id ?? '');
      const verifiedAt = row.verified_at != null ? String(row.verified_at) : '';
      if (!orderId || !verifiedAt) continue;
      const dt = new Date(verifiedAt);
      if (!Number.isFinite(dt.getTime())) continue;
      const prev = out.get(orderId);
      if (!prev || dt > prev) out.set(orderId, dt);
    }
  }
  return out;
}

async function sumOnTimeCollections(
  branchId: string | null,
  from: string,
  to: string,
  asOf: Date,
): Promise<{
  maturedGross: number;
  onTimeValue: number;
  overdueBalance: number;
  overdueOrderCount: number;
}> {
  let q = supabase
    .from('orders')
    .select('id, total_amount, amount_paid, balance_due, actual_delivery, payment_terms, order_date, payment_status')
    .gte('order_date', from)
    .lte('order_date', to)
    .in('status', [...COLLECTION_ORDER_STATUSES]);
  if (branchId) q = q.eq('branch_id', branchId);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const orderIds = rows.map((r) => String(r.id));
  const lastPaidAt = await fetchLastVerifiedPaymentDates(orderIds);

  const asOfDay = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const eps = 0.01;

  let maturedGross = 0;
  let onTimeValue = 0;
  let overdueBalance = 0;
  let overdueOrderCount = 0;

  for (const row of rows) {
    const total = toNumber(row.total_amount);
    const balance = toNumber(row.balance_due);
    const dueYmd = orderDueDateYmd(row);
    const dueDt = parseDateOnly(dueYmd);
    if (!dueDt || dueDt > asOfDay) continue;

    maturedGross += total;

    if (balance > eps) {
      overdueBalance += balance;
      overdueOrderCount += 1;
      continue;
    }

    const lastPayment = lastPaidAt.get(String(row.id));
    if (lastPayment) {
      const paidDay = new Date(
        lastPayment.getFullYear(),
        lastPayment.getMonth(),
        lastPayment.getDate(),
      );
      if (paidDay <= dueDt) onTimeValue += total;
    } else {
      // No verified proof timeline — treat settled orders as on-time.
      onTimeValue += total;
    }
  }

  return { maturedGross, onTimeValue, overdueBalance, overdueOrderCount };
}

async function fetchCollectionCompare(
  branchId: string | null,
  period: PeriodRange,
  prevPeriod: PeriodRange,
): Promise<ReportsCollectionCompare> {
  try {
    const asOf = new Date();
    asOf.setHours(0, 0, 0, 0);

    const [current, previous] = await Promise.all([
      sumOnTimeCollections(branchId, period.start, period.end, asOf),
      sumOnTimeCollections(branchId, prevPeriod.start, prevPeriod.end, asOf),
    ]);

    const collectionRateCurrent =
      current.maturedGross > 0
        ? Math.min(100, (current.onTimeValue / current.maturedGross) * 100)
        : 0;
    const collectionRatePrev =
      previous.maturedGross > 0
        ? Math.min(100, (previous.onTimeValue / previous.maturedGross) * 100)
        : 0;
    const collectionRateDeltaPts = collectionRateCurrent - collectionRatePrev;

    return {
      collectedCurrent: current.onTimeValue,
      collectedPrev: previous.onTimeValue,
      collectionRateCurrent,
      collectionRatePrev,
      collectionRateDeltaPts,
      overdueBalanceCurrent: current.overdueBalance,
      overdueOrderCountCurrent: current.overdueOrderCount,
      maturedGrossCurrent: current.maturedGross,
      collectedDeltaPct: collectionRateDeltaPts,
    };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] collection compare', e);
    return {
      collectedCurrent: 0,
      collectedPrev: 0,
      collectionRateCurrent: 0,
      collectionRatePrev: 0,
      collectionRateDeltaPts: 0,
      overdueBalanceCurrent: 0,
      overdueOrderCountCurrent: 0,
      maturedGrossCurrent: 0,
      collectedDeltaPct: 0,
    };
  }
}

async function fetchCategoryMargins(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsCategoryMarginRow[]> {
  try {
    let orderQ = supabase
      .from('orders')
      .select('id')
      .gte('order_date', from)
      .lte('order_date', to)
      .not('status', 'in', '("Cancelled","Rejected","Draft")');
    if (branchId) orderQ = orderQ.eq('branch_id', branchId);

    const { data: orders, error: oErr } = await orderQ;
    if (oErr) throw oErr;

    const orderIds = ((orders ?? []) as Array<{ id: string }>).map((o) => o.id);
    if (orderIds.length === 0) return [];

    const { data: lines, error: lErr } = await supabase
      .from('order_line_items')
      .select('quantity, line_total, variant_id, order_id')
      .in('order_id', orderIds);
    if (lErr) throw lErr;

    const variantIds = new Set<string>();
    for (const li of (lines ?? []) as Array<Record<string, unknown>>) {
      const vid = toStr(li.variant_id);
      if (vid) variantIds.add(vid);
    }

    const costByVariant = new Map<string, number>();
    const categoryByVariant = new Map<string, string>();
    const slugByCategoryName = new Map<string, string | null>();
    const vidArr = [...variantIds];
    for (let i = 0; i < vidArr.length; i += 200) {
      const slice = vidArr.slice(i, i + 200);
      const { data: pvs } = await supabase
        .from('product_variants')
        .select('id, cost_price, products(category_id, product_categories(name, slug))')
        .in('id', slice);
      for (const pv of (pvs ?? []) as Array<Record<string, unknown>>) {
        const id = String(pv.id);
        costByVariant.set(id, toNumber(pv.cost_price));
        const products = pv.products;
        let catName = 'Uncategorized';
        let catSlug: string | null = null;
        if (products && typeof products === 'object' && !Array.isArray(products)) {
          const cats = (products as Record<string, unknown>).product_categories;
          if (cats && typeof cats === 'object' && !Array.isArray(cats)) {
            catName = toStr((cats as Record<string, unknown>).name) ?? catName;
            catSlug = toStr((cats as Record<string, unknown>).slug);
          }
        }
        categoryByVariant.set(id, catName);
        if (!slugByCategoryName.has(catName)) slugByCategoryName.set(catName, catSlug);
      }
    }

    const agg = new Map<string, { revenue: number; profit: number; units: number }>();
    for (const li of (lines ?? []) as Array<Record<string, unknown>>) {
      const vid = toStr(li.variant_id);
      const cat = vid ? categoryByVariant.get(vid) ?? 'Uncategorized' : 'Uncategorized';
      const qty = toNumber(li.quantity);
      const revenue = toNumber(li.line_total);
      const cost = vid ? (costByVariant.get(vid) ?? 0) * qty : 0;
      const cur = agg.get(cat) ?? { revenue: 0, profit: 0, units: 0 };
      cur.revenue += revenue;
      cur.profit += revenue - cost;
      cur.units += qty;
      agg.set(cat, cur);
    }

    return [...agg.entries()]
      .map(([categoryName, v]) => ({
        categoryName,
        categorySlug: slugByCategoryName.get(categoryName) ?? null,
        revenue: v.revenue,
        profit: v.profit,
        marginPct: v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0,
        unitsSold: v.units,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] category margins', e);
    return [];
  }
}

async function fetchOrderCycleTime(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsCycleTimeStats> {
  try {
    let q = supabase
      .from('orders')
      .select('order_date, actual_delivery')
      .gte('order_date', from)
      .lte('order_date', to)
      .not('actual_delivery', 'is', null)
      .in('status', ['Delivered', 'Completed', 'Partially Fulfilled']);
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    const daysList: number[] = [];
    const bucketDefs = [
      { label: '0–3 days', min: 0, max: 3 },
      { label: '4–7 days', min: 4, max: 7 },
      { label: '8–14 days', min: 8, max: 14 },
      { label: '15+ days', min: 15, max: Infinity },
    ];
    const buckets = bucketDefs.map((b) => ({ label: b.label, count: 0 }));

    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const od = toStr(r.order_date);
      const ad = toStr(r.actual_delivery);
      if (!od || !ad) continue;
      const start = new Date(od + 'T00:00:00');
      const end = new Date(ad + 'T00:00:00');
      const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
      daysList.push(days);
      for (let i = 0; i < bucketDefs.length; i++) {
        if (days >= bucketDefs[i].min && days <= bucketDefs[i].max) {
          buckets[i].count += 1;
          break;
        }
      }
    }

    if (daysList.length === 0) {
      return { avgDays: 0, medianDays: 0, sampleSize: 0, buckets };
    }

    daysList.sort((a, b) => a - b);
    const sum = daysList.reduce((s, d) => s + d, 0);
    const mid = Math.floor(daysList.length / 2);
    const medianDays =
      daysList.length % 2 === 0
        ? (daysList[mid - 1] + daysList[mid]) / 2
        : daysList[mid];

    return {
      avgDays: sum / daysList.length,
      medianDays,
      sampleSize: daysList.length,
      buckets,
    };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] cycle time', e);
    return { avgDays: 0, medianDays: 0, sampleSize: 0, buckets: [] };
  }
}

async function fetchDelayBreakdown(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsDelayBreakdownRow[]> {
  try {
    let q = supabase
      .from('delay_exceptions')
      .select('type, status, reported_date')
      .gte('reported_date', from)
      .lte('reported_date', to);
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    const agg = new Map<string, { count: number; open: number }>();
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const type = toStr(r.type) ?? 'Other';
      const cur = agg.get(type) ?? { count: 0, open: 0 };
      cur.count += 1;
      const status = toStr(r.status);
      if (status === 'Open' || status === 'In Progress' || status === 'Escalated') {
        cur.open += 1;
      }
      agg.set(type, cur);
    }

    return [...agg.entries()]
      .map(([type, v]) => ({ type, count: v.count, openCount: v.open }))
      .sort((a, b) => b.count - a.count);
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] delay breakdown', e);
    return [];
  }
}

function buildBranchScorecard(
  branches: BranchAnalyticsRow[],
  onTimeByBranch: Map<string, number>,
): ReportsBranchScorecardRow[] {
  return branches
    .map((b) => {
      const onTimePct = onTimeByBranch.get(b.branchId) ?? 0;
      const overdueRatioPct =
        b.outstanding > 0 && b.revenue > 0
          ? Math.min(100, (b.outstanding / b.revenue) * 100)
          : 0;

      const quotaScore = Math.min(100, b.attainmentPct);
      const marginScore = Math.min(100, (b.avgMarginPct / 30) * 100);
      const onTimeScore = onTimePct;
      const arScore = b.collectionRate;

      const healthScore = Math.round((quotaScore + marginScore + onTimeScore + arScore) / 4);

      return {
        branchId: b.branchId,
        branchName: b.branchName,
        revenue: b.revenue,
        profitMarginPct: b.avgMarginPct,
        quotaAttainmentPct: b.attainmentPct,
        onTimePct,
        outstanding: b.outstanding,
        overdueRatioPct,
        healthScore,
      };
    })
    .sort((a, b) => b.healthScore - a.healthScore);
}

async function fetchReportsEnhancements(opts: {
  branchId: string | null;
  period: PeriodRange;
  agents: AgentAnalyticsBundle;
}): Promise<ReportsEnhancements> {
  const prevPeriod = getPreviousPeriodRange(opts.period);
  const { branchId, period, agents } = opts;

  const [
    outstandingRows,
    orderPipeline,
    onTimeTrend,
    onTimeByBranch,
    discount,
    collectionCompare,
    categoryMargins,
    cycleTime,
    delayBreakdown,
    periodCounts,
    customersInPeriodRaw,
  ] = await Promise.all([
    fetchOutstandingOrders(branchId),
    fetchOrderPipeline(branchId),
    fetchOnTimeTrend(branchId),
    fetchOnTimeByBranch(branchId),
    fetchDiscountAnalysis(branchId, period.start, period.end),
    fetchCollectionCompare(branchId, period, prevPeriod),
    fetchCategoryMargins(branchId, period.start, period.end),
    fetchOrderCycleTime(branchId, period.start, period.end),
    fetchDelayBreakdown(branchId, period.start, period.end),
    fetchOrderCountsForPeriods(branchId, period, prevPeriod),
    fetchCustomersInPeriod(branchId, period.start, period.end),
  ]);

  const customerArRows = buildCustomerArRows(outstandingRows);
  const customersInPeriod = await attachCustomerCredit(
    buildSalesCustomerRows(customersInPeriodRaw, customerArRows),
  );
  const customerSalesSnapshot = buildCustomerSalesSnapshot(customerArRows, customersInPeriod);

  return {
    arAging: buildArAgingBuckets(outstandingRows),
    orderPipeline,
    onTimeTrend,
    discountByBranch: discount.byBranch,
    discountByAgent: discount.byAgent,
    collectionCompare,
    categoryMargins,
    cycleTime,
    delayBreakdown,
    branchScorecard: buildBranchScorecard(agents.branches, onTimeByBranch),
    periodCounts,
    customerArRows,
    customersInPeriod,
    customerSalesSnapshot,
  };
}

async function fetchBranchTrendCompare(): Promise<ReportsBranchTrendCompare> {
  const now = new Date();
  const startDt = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const labels: string[] = [];
  const monthKeys: string[] = [];

  for (let i = 0; i < 6; i++) {
    const dt = new Date(startDt.getFullYear(), startDt.getMonth() + i, 1);
    monthKeys.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
    labels.push(
      dt.getFullYear() === now.getFullYear()
        ? MONTH_LABELS[dt.getMonth()]
        : `${MONTH_LABELS[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`,
    );
  }

  const empty: ReportsBranchTrendCompare = {
    labels,
    monthKeys,
    branches: [],
    totalOrdersByMonth: monthKeys.map(() => 0),
  };

  try {
    const [{ data: branchRows, error: bErr }, { data: orders, error: oErr }] = await Promise.all([
      supabase.from('branches').select('id, name').eq('is_active', true),
      supabase
        .from('orders')
        .select('order_date, total_amount, branch_id')
        .gte('order_date', isoDate(startDt))
        .lt('order_date', isoDate(nextMonth))
        .in('status', REVENUE_ORDER_STATUSES),
    ]);
    if (bErr) throw bErr;
    if (oErr) throw oErr;

    type BranchAgg = {
      branchName: string;
      revenueByMonth: number[];
      ordersByMonth: number[];
      totalRev: number;
    };

    const byBranch = new Map<string, BranchAgg>();
    for (const b of (branchRows ?? []) as Array<{ id: string; name: string }>) {
      byBranch.set(String(b.id), {
        branchName: String(b.name),
        revenueByMonth: monthKeys.map(() => 0),
        ordersByMonth: monthKeys.map(() => 0),
        totalRev: 0,
      });
    }

    const totalOrdersByMonth = monthKeys.map(() => 0);

    for (const row of (orders ?? []) as Array<Record<string, unknown>>) {
      const bid = toStr(row.branch_id);
      if (!bid) continue;
      const agg = byBranch.get(bid);
      if (!agg) continue;
      const od = toStr(row.order_date);
      if (!od) continue;
      const mi = monthKeys.indexOf(od.slice(0, 7));
      if (mi < 0) continue;
      const amt = toNumber(row.total_amount);
      agg.revenueByMonth[mi] += amt;
      agg.ordersByMonth[mi] += 1;
      agg.totalRev += amt;
      totalOrdersByMonth[mi] += 1;
    }

    const branches: ReportsBranchTrendLine[] = [...byBranch.entries()]
      .map(([branchId, agg]) => ({
        branchId,
        branchName: agg.branchName,
        colorIndex: 0,
        revenueByMonth: agg.revenueByMonth,
        ordersByMonth: agg.ordersByMonth,
        totalRev: agg.totalRev,
      }))
      .filter(
        (b) =>
          b.totalRev > 0 ||
          b.revenueByMonth.some((v) => v > 0) ||
          b.ordersByMonth.some((v) => v > 0),
      )
      .sort((a, b) => b.totalRev - a.totalRev || a.branchName.localeCompare(b.branchName))
      .map((b, i) => ({
        branchId: b.branchId,
        branchName: b.branchName,
        colorIndex: i,
        revenueByMonth: b.revenueByMonth,
        ordersByMonth: b.ordersByMonth,
      }));

    return { labels, monthKeys, branches, totalOrdersByMonth };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] branch trend compare', e);
    return empty;
  }
}

const INVENTORY_PO_EXCLUDED = new Set(['Draft', 'Cancelled', 'Rejected']);
const INVENTORY_PR_EXCLUDED = new Set(['Draft', 'Cancelled', 'Rejected']);
const INVENTORY_PO_PENDING = 'Requested';
const INVENTORY_PR_PENDING = 'Requested';

function nestedRecordName(v: unknown): string | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return toStr((v as Record<string, unknown>).name);
  }
  if (Array.isArray(v) && v[0] && typeof v[0] === 'object') {
    return toStr((v[0] as Record<string, unknown>).name);
  }
  return null;
}

const INVENTORY_MATERIAL_SELECT =
  `id, name, sku, unit_of_measure, total_stock, reorder_point, safety_stock, monthly_consumption,
   total_value, cost_per_unit, primary_supplier, supplier_id, status,
   material_categories ( name, slug )`;

function mapInventoryMaterialRow(row: Record<string, unknown>): ReportsInventoryMaterialRow {
  const stock = toNumber(row.total_stock);
  const reorder = toNumber(row.reorder_point);
  const monthlyConsumption = toNumber(row.monthly_consumption);
  const costPerUnit = toNumber(row.cost_per_unit);
  const dailyConsumption = monthlyConsumption / 30;
  const daysOfCover =
    dailyConsumption > 0 && Number.isFinite(stock / dailyConsumption)
      ? Math.round(stock / dailyConsumption)
      : null;
  const cats = row.material_categories;
  let categoryName = 'Uncategorized';
  let categorySlug: string | null = null;
  if (cats && typeof cats === 'object' && !Array.isArray(cats)) {
    categoryName = toStr((cats as Record<string, unknown>).name) ?? categoryName;
    categorySlug = toStr((cats as Record<string, unknown>).slug);
  }
  const supplierId = toStr(row.supplier_id);
  const supplierName = toStr(row.primary_supplier);
  const storedValue = toNumber(row.total_value);
  const totalValue = storedValue > 0 ? storedValue : stock * costPerUnit;
  const isLowStock = reorder > 0 && stock <= reorder;
  return {
    materialId: String(row.id),
    name: toStr(row.name) ?? '—',
    sku: toStr(row.sku) ?? '—',
    categoryName,
    categorySlug,
    unit: toStr(row.unit_of_measure) ?? '',
    totalStock: stock,
    reorderPoint: reorder,
    monthlyConsumption,
    daysOfCover,
    totalValue,
    supplierId,
    supplierName,
    isLowStock,
  };
}

type InventoryMaterialQueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

async function enrichInventorySupplierNames(rows: ReportsInventoryMaterialRow[]): Promise<void> {
  const missingIds = [
    ...new Set(
      rows
        .filter((m) => m.supplierId && !m.supplierName)
        .map((m) => m.supplierId as string),
    ),
  ];
  if (missingIds.length === 0) return;

  const { data: supRows } = await supabase.from('suppliers').select('id, name').in('id', missingIds);
  const nameById = new Map(
    (supRows ?? []).map((s) => [String((s as { id: string }).id), toStr((s as { name?: string }).name)]),
  );
  for (const row of rows) {
    if (row.supplierId && !row.supplierName) {
      row.supplierName = nameById.get(row.supplierId) ?? null;
    }
  }
}

/** Branch-scoped raw materials — mirrors warehouse catalog resolution (categories, SKU prefixes, stock). */
async function fetchInventoryMaterialsForBranch(
  branchId: string | null,
): Promise<{ rows: ReportsInventoryMaterialRow[]; error: Error | null }> {
  const runMaterialQueries = async (
    queries: Promise<InventoryMaterialQueryResult>[],
  ): Promise<{ rows: ReportsInventoryMaterialRow[]; lastError: Error | null }> => {
    const merged = new Map<string, ReportsInventoryMaterialRow>();
    let lastError: Error | null = null;
    const results = await Promise.all(queries);
    for (const result of results) {
      if (result.error) {
        lastError = new Error(result.error.message);
        if (import.meta.env.DEV) console.warn('[reports] inventory materials partial query', result.error);
        continue;
      }
      for (const row of result.data ?? []) {
        const mapped = mapInventoryMaterialRow(row as Record<string, unknown>);
        merged.set(mapped.materialId, mapped);
      }
    }
    const rows = [...merged.values()].sort((a, b) => b.totalValue - a.totalValue).slice(0, 500);
    await enrichInventorySupplierNames(rows);
    return { rows, lastError };
  };

  if (!branchId) {
    const { data, error } = await supabase
      .from('raw_materials')
      .select(INVENTORY_MATERIAL_SELECT)
      .neq('status', 'Discontinued')
      .order('total_value', { ascending: false })
      .limit(500);
    if (error) return { rows: [], error };
    const rows = (data ?? []).map((row) => mapInventoryMaterialRow(row as Record<string, unknown>));
    await enrichInventorySupplierNames(rows);
    return { rows, error: null };
  }

  const { data: br } = await supabase.from('branches').select('code').eq('id', branchId).maybeSingle();
  const branchCode = br?.code != null ? String(br.code) : '';

  const queries: Promise<InventoryMaterialQueryResult>[] = [];

  const { data: categoryRows } = await supabase
    .from('material_categories')
    .select('id')
    .eq('branch_id', branchId)
    .eq('is_active', true);
  const categoryIds = (categoryRows ?? []).map((c) => String((c as { id: string }).id));
  if (categoryIds.length > 0) {
    queries.push(
      supabase
        .from('raw_materials')
        .select(INVENTORY_MATERIAL_SELECT)
        .in('category_id', categoryIds)
        .neq('status', 'Discontinued') as Promise<InventoryMaterialQueryResult>,
    );
  }

  if (['MNL', 'CEB', 'BTG'].includes(branchCode)) {
    queries.push(
      supabase
        .from('raw_materials')
        .select(INVENTORY_MATERIAL_SELECT)
        .ilike('sku', 'LMX-%')
        .neq('status', 'Discontinued') as Promise<InventoryMaterialQueryResult>,
    );
  } else if (branchCode === 'QZN') {
    queries.push(
      supabase
        .from('raw_materials')
        .select(INVENTORY_MATERIAL_SELECT)
        .ilike('sku', 'QZN-%')
        .neq('status', 'Discontinued') as Promise<InventoryMaterialQueryResult>,
    );
  }

  const { data: stockRows } = await supabase
    .from('material_stock')
    .select('material_id')
    .eq('branch_id', branchId);
  const stockMaterialIds = [
    ...new Set((stockRows ?? []).map((r) => String((r as { material_id: string }).material_id))),
  ];
  if (stockMaterialIds.length > 0) {
    queries.push(
      supabase
        .from('raw_materials')
        .select(INVENTORY_MATERIAL_SELECT)
        .in('id', stockMaterialIds)
        .neq('status', 'Discontinued') as Promise<InventoryMaterialQueryResult>,
    );
  }

  if (queries.length === 0) {
    queries.push(
      supabase
        .from('raw_materials')
        .select(INVENTORY_MATERIAL_SELECT)
        .neq('status', 'Discontinued')
        .limit(500) as Promise<InventoryMaterialQueryResult>,
    );
  }

  const { rows, lastError } = await runMaterialQueries(queries);
  if (rows.length > 0) return { rows, error: null };

  const flatSelect =
    'id, name, sku, unit_of_measure, total_stock, reorder_point, safety_stock, monthly_consumption, total_value, cost_per_unit, primary_supplier, supplier_id, status, category_id';
  const flatQueries: Promise<InventoryMaterialQueryResult>[] = [];
  if (['MNL', 'CEB', 'BTG'].includes(branchCode)) {
    flatQueries.push(
      supabase
        .from('raw_materials')
        .select(flatSelect)
        .ilike('sku', 'LMX-%')
        .neq('status', 'Discontinued') as Promise<InventoryMaterialQueryResult>,
    );
  } else if (branchCode === 'QZN') {
    flatQueries.push(
      supabase
        .from('raw_materials')
        .select(flatSelect)
        .ilike('sku', 'QZN-%')
        .neq('status', 'Discontinued') as Promise<InventoryMaterialQueryResult>,
    );
  }
  if (categoryIds.length > 0) {
    flatQueries.push(
      supabase
        .from('raw_materials')
        .select(flatSelect)
        .in('category_id', categoryIds)
        .neq('status', 'Discontinued') as Promise<InventoryMaterialQueryResult>,
    );
  }
  if (flatQueries.length === 0) {
    return { rows, error: lastError };
  }

  const categoryNameById = new Map<string, { name: string; slug: string | null }>();
  if (categoryIds.length > 0) {
    const { data: catMeta } = await supabase
      .from('material_categories')
      .select('id, name, slug')
      .in('id', categoryIds);
    for (const c of catMeta ?? []) {
      categoryNameById.set(String((c as { id: string }).id), {
        name: toStr((c as { name?: string }).name) ?? 'Uncategorized',
        slug: toStr((c as { slug?: string | null }).slug),
      });
    }
  }

  const flatMerged = new Map<string, ReportsInventoryMaterialRow>();
  let flatError: Error | null = lastError;
  for (const result of await Promise.all(flatQueries)) {
    if (result.error) {
      flatError = new Error(result.error.message);
      continue;
    }
    for (const row of result.data ?? []) {
      const rec = row as Record<string, unknown>;
      const catId = toStr(rec.category_id);
      const catMeta = catId ? categoryNameById.get(catId) : undefined;
      const mapped = mapInventoryMaterialRow({
        ...rec,
        material_categories: catMeta
          ? { name: catMeta.name, slug: catMeta.slug }
          : null,
      });
      flatMerged.set(mapped.materialId, mapped);
    }
  }

  const flatRows = [...flatMerged.values()].sort((a, b) => b.totalValue - a.totalValue).slice(0, 500);
  await enrichInventorySupplierNames(flatRows);
  return { rows: flatRows, error: flatRows.length === 0 ? flatError : null };
}

async function fetchReportsInventoryReport(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsInventoryReport> {
  const emptySummary: ReportsInventorySummary = {
    purchaseOrderSpend: 0,
    purchaseOrderCount: 0,
    purchaseOrderPaid: 0,
    productionRequestCount: 0,
    rawMaterialCount: 0,
    lowStockMaterialCount: 0,
    inventoryValue: 0,
    activeSupplierCount: 0,
    pendingPurchaseOrderCount: 0,
    pendingPurchaseOrderValue: 0,
    pendingProductionRequestCount: 0,
  };

  const emptyResult: ReportsInventoryReport = {
    summary: emptySummary,
    expenditureSeries: [],
    materialSpendSeries: [],
    materialCategorySpend: [],
    materialCategoryMonthlySeries: { monthKeys: [], labels: [], lines: [] },
    supplierTypeSpend: [],
    suppliers: [],
    materials: [],
    purchaseOrders: [],
    productionRequests: [],
  };

  try {
    let poQ = supabase
      .from('purchase_orders')
      .select(
        `id, po_number, order_date, status, total_amount, amount_paid, payment_status, supplier_id,
         suppliers(id, name, type, category),
         purchase_order_items(id, quantity_ordered, unit_price, material_id,
           raw_materials(material_categories(name)))`,
      )
      .gte('order_date', from)
      .lte('order_date', to)
      .order('order_date', { ascending: false });
    if (branchId) poQ = poQ.eq('branch_id', branchId);

    let prQ = supabase
      .from('production_requests')
      .select(
        `id, pr_number, request_date, status, expected_completion_date, created_by,
         production_request_items(id, quantity)`,
      )
      .gte('request_date', from)
      .lte('request_date', to)
      .order('request_date', { ascending: false });
    if (branchId) prQ = prQ.eq('branch_id', branchId);

    let pendingPoQ = supabase
      .from('purchase_orders')
      .select('id, total_amount', { count: 'exact' })
      .eq('status', INVENTORY_PO_PENDING);
    if (branchId) pendingPoQ = pendingPoQ.eq('branch_id', branchId);

    let pendingPrQ = supabase
      .from('production_requests')
      .select('id', { count: 'exact' })
      .eq('status', INVENTORY_PR_PENDING);
    if (branchId) pendingPrQ = pendingPrQ.eq('branch_id', branchId);

    const [poRes, prRes, matResult, pendingPoRes, pendingPrRes] = await Promise.all([
      poQ,
      prQ,
      fetchInventoryMaterialsForBranch(branchId),
      pendingPoQ,
      pendingPrQ,
    ]);

    if (poRes.error && import.meta.env.DEV) console.warn('[reports] inventory POs', poRes.error);
    if (prRes.error && import.meta.env.DEV) console.warn('[reports] inventory PRs', prRes.error);
    if (matResult.error && import.meta.env.DEV) console.warn('[reports] inventory materials', matResult.error);
    if (pendingPoRes.error && import.meta.env.DEV) console.warn('[reports] inventory pending POs', pendingPoRes.error);
    if (pendingPrRes.error && import.meta.env.DEV) console.warn('[reports] inventory pending PRs', pendingPrRes.error);

    const purchaseOrders: ReportsInventoryPurchaseOrderRow[] = [];
    let purchaseOrderSpend = 0;
    let purchaseOrderPaid = 0;
    const supplierAgg = new Map<string, ReportsInventorySupplierRow>();
    const supplierTypeAgg = new Map<string, { spend: number; poCount: number }>();
    const materialCategoryAgg = new Map<string, { spend: number; lineCount: number }>();
    const materialCategoryMonthMap = new Map<string, number[]>();
    const { monthKeys, labels } = monthKeysInRange(from, to);
    const ensureCategoryMonthArray = (categoryName: string): number[] => {
      let arr = materialCategoryMonthMap.get(categoryName);
      if (!arr) {
        arr = monthKeys.map(() => 0);
        materialCategoryMonthMap.set(categoryName, arr);
      }
      return arr;
    };
    const spendByMonth = monthKeys.map(() => 0);
    const countByMonth = monthKeys.map(() => 0);
    const materialSpendByMonth = monthKeys.map(() => 0);
    const materialLineCountByMonth = monthKeys.map(() => 0);

    if (!poRes.error) {
      for (const row of (poRes.data ?? []) as Array<Record<string, unknown>>) {
        const status = toStr(row.status) ?? '';
        if (INVENTORY_PO_EXCLUDED.has(status)) continue;

        const totalAmount = toNumber(row.total_amount);
        const amountPaid = toNumber(row.amount_paid);
        const orderDate = toStr(row.order_date) ?? '';
        const monthKey = orderDate.slice(0, 7);
        const mi = monthKeys.indexOf(monthKey);

        const supplierEmbed = row.suppliers;
        let supplierId = toStr(row.supplier_id);
        let supplierName = nestedRecordName(supplierEmbed);
        let supplierType = 'Other';
        if (supplierEmbed && typeof supplierEmbed === 'object' && !Array.isArray(supplierEmbed)) {
          const rec = supplierEmbed as Record<string, unknown>;
          supplierId = toStr(rec.id) ?? supplierId;
          supplierName = toStr(rec.name) ?? supplierName;
          supplierType = toStr(rec.type) ?? toStr(rec.category) ?? 'Other';
        }
        if (!supplierType.trim()) supplierType = 'Other';

        const typeBucket =
          supplierTypeAgg.get(supplierType) ?? { spend: 0, poCount: 0 };
        typeBucket.spend += totalAmount;
        typeBucket.poCount += 1;
        supplierTypeAgg.set(supplierType, typeBucket);

        if (mi >= 0) {
          spendByMonth[mi] += totalAmount;
          countByMonth[mi] += 1;
        }

        purchaseOrderSpend += totalAmount;
        purchaseOrderPaid += amountPaid;

        if (supplierId) {
          const cur =
            supplierAgg.get(supplierId) ??
            ({ supplierId, supplierName: supplierName ?? 'Unknown supplier', poCount: 0, spend: 0 } satisfies ReportsInventorySupplierRow);
          cur.poCount += 1;
          cur.spend += totalAmount;
          if (!cur.supplierName && supplierName) cur.supplierName = supplierName;
          supplierAgg.set(supplierId, cur);
        }

        const items = (row.purchase_order_items as Array<Record<string, unknown>> | null) ?? [];
        for (const item of items) {
          const materialId = toStr(item.material_id);
          if (!materialId) continue;
          const qty = toNumber(item.quantity_ordered);
          const unitPrice = toNumber(item.unit_price);
          const lineSpend = qty * unitPrice;
          if (lineSpend <= 0) continue;

          let categoryName = 'Uncategorized';
          const matEmbed = item.raw_materials;
          if (matEmbed && typeof matEmbed === 'object' && !Array.isArray(matEmbed)) {
            const cats = (matEmbed as Record<string, unknown>).material_categories;
            if (cats && typeof cats === 'object' && !Array.isArray(cats)) {
              categoryName = toStr((cats as Record<string, unknown>).name) ?? categoryName;
            }
          }

          if (mi >= 0) {
            materialSpendByMonth[mi] += lineSpend;
            materialLineCountByMonth[mi] += 1;
            ensureCategoryMonthArray(categoryName)[mi] += lineSpend;
          }

          const catBucket =
            materialCategoryAgg.get(categoryName) ?? { spend: 0, lineCount: 0 };
          catBucket.spend += lineSpend;
          catBucket.lineCount += 1;
          materialCategoryAgg.set(categoryName, catBucket);
        }

        purchaseOrders.push({
          id: String(row.id),
          poNumber: toStr(row.po_number) ?? String(row.id),
          supplierId,
          supplierName,
          status,
          orderDate,
          totalAmount,
          amountPaid,
          paymentStatus: toStr(row.payment_status) ?? 'Unpaid',
          itemCount: Array.isArray(row.purchase_order_items)
            ? (row.purchase_order_items as unknown[]).length
            : 0,
        });
      }
    }

    const productionRequests: ReportsInventoryProductionRequestRow[] = [];
    if (!prRes.error) {
      for (const row of (prRes.data ?? []) as Array<Record<string, unknown>>) {
        const status = toStr(row.status) ?? '';
        if (INVENTORY_PR_EXCLUDED.has(status)) continue;
        const items = (row.production_request_items as Array<Record<string, unknown>> | null) ?? [];
        productionRequests.push({
          id: String(row.id),
          prNumber: toStr(row.pr_number) ?? String(row.id),
          status,
          requestDate: toStr(row.request_date) ?? '',
          expectedCompletionDate: toStr(row.expected_completion_date),
          itemCount: items.length,
          quantityTotal: items.reduce((s, it) => s + toNumber(it.quantity), 0),
          createdBy: toStr(row.created_by),
        });
      }
    }

    const materials: ReportsInventoryMaterialRow[] = matResult.rows;

    const expenditureSeries = labels.map((label, i) => ({
      label,
      monthKey: monthKeys[i] ?? '',
      poSpend: spendByMonth[i] ?? 0,
      poCount: countByMonth[i] ?? 0,
    }));

    const materialSpendSeries = labels.map((label, i) => ({
      label,
      monthKey: monthKeys[i] ?? '',
      materialSpend: materialSpendByMonth[i] ?? 0,
      lineCount: materialLineCountByMonth[i] ?? 0,
    }));

    const totalMaterialCategorySpend = [...materialCategoryAgg.values()].reduce((s, v) => s + v.spend, 0);
    const materialCategorySpend = [...materialCategoryAgg.entries()]
      .map(([categoryName, v]) => ({
        categoryName,
        spend: v.spend,
        lineCount: v.lineCount,
        sharePct: totalMaterialCategorySpend > 0 ? (v.spend / totalMaterialCategorySpend) * 100 : 0,
      }))
      .sort((a, b) => b.spend - a.spend);

    const materialCategoryMonthlySeries: ReportsInventoryMaterialCategoryMonthlySeries = {
      monthKeys,
      labels,
      lines: [...materialCategoryMonthMap.entries()]
        .map(([categoryName, spendByMonth]) => ({ categoryName, spendByMonth }))
        .sort(
          (a, b) =>
            b.spendByMonth.reduce((s, v) => s + v, 0) - a.spendByMonth.reduce((s, v) => s + v, 0),
        ),
    };

    const totalSupplierTypeSpend = [...supplierTypeAgg.values()].reduce((s, v) => s + v.spend, 0);
    const supplierTypeSpend = [...supplierTypeAgg.entries()]
      .map(([supplierType, v]) => ({
        supplierType,
        spend: v.spend,
        poCount: v.poCount,
        sharePct: totalSupplierTypeSpend > 0 ? (v.spend / totalSupplierTypeSpend) * 100 : 0,
      }))
      .sort((a, b) => b.spend - a.spend);

    const suppliers = [...supplierAgg.values()].sort((a, b) => b.spend - a.spend);

    let pendingPurchaseOrderValue = 0;
    if (!pendingPoRes.error) {
      for (const row of (pendingPoRes.data ?? []) as Array<Record<string, unknown>>) {
        pendingPurchaseOrderValue += toNumber(row.total_amount);
      }
    }

    const summary: ReportsInventorySummary = {
      purchaseOrderSpend,
      purchaseOrderCount: purchaseOrders.length,
      purchaseOrderPaid,
      productionRequestCount: productionRequests.length,
      rawMaterialCount: materials.length,
      lowStockMaterialCount: materials.filter((m) => m.isLowStock).length,
      inventoryValue: materials.reduce((s, m) => s + m.totalValue, 0),
      activeSupplierCount: suppliers.length,
      pendingPurchaseOrderCount: pendingPoRes.error ? 0 : (pendingPoRes.count ?? 0),
      pendingPurchaseOrderValue,
      pendingProductionRequestCount: pendingPrRes.error ? 0 : (pendingPrRes.count ?? 0),
    };

    return {
      summary,
      expenditureSeries,
      materialSpendSeries,
      materialCategorySpend,
      materialCategoryMonthlySeries,
      supplierTypeSpend,
      suppliers,
      materials,
      purchaseOrders,
      productionRequests,
    };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] inventory report', e);
    return emptyResult;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchReportsBundle(opts: {
  branchName: string | null;
  periodKind: DatePeriodKind;
  customStart: string;
  customEnd: string;
}): Promise<ReportsBundle> {
  const branchTrim = opts.branchName?.trim() || '';
  const branchName = branchTrim === '' ? null : branchTrim;
  const branchId = branchName ? await resolveBranchIdByName(branchName) : null;
  const period = mapDatePeriodToReportsPeriod(opts.periodKind, opts.customStart, opts.customEnd);

  const [executive, agents, agentsAllBranches, finance, salesSeries, productsInPeriod, productMonthlySeries, productCustomerLines, productVariantSales, categoryMonthlySeries, branchTrendCompare, branchRevenueShare, inventoryReport] =
    await Promise.all([
    fetchExecutiveDashboard({ branchName }),
    fetchAgentAnalyticsBundle({ range: period, branchId }),
    branchId
      ? fetchAgentAnalyticsBundle({ range: period, branchId: null })
      : Promise.resolve(null),
    fetchFinanceMetrics(branchId).catch(() => ({
      totalOutstanding: 0,
      totalOverdue: 0,
      overdueCount: 0,
      collectedThisMonth: 0,
      pendingProofs: 0,
      pendingCommissions: 0,
      pendingCommissionCount: 0,
      commissionsPaidOut: 0,
    } satisfies FinanceMetrics)),
    fetchSalesMonthlySeries(branchId, period.start, period.end),
    fetchProductsInPeriod(branchId, period.start, period.end),
    fetchProductMonthlySeries(branchId, period.start, period.end),
    fetchProductCustomerLines(branchId, period.start, period.end),
    fetchProductVariantSales(branchId, period.start, period.end),
    fetchCategoryMonthlySeries(branchId, period.start, period.end),
    fetchBranchTrendCompare(),
    fetchBranchRevenueShare(period.start, period.end),
    fetchReportsInventoryReport(branchId, period.start, period.end),
  ]);

  const enhancements = await fetchReportsEnhancements({ branchId, period, agents });

  return {
    branchId,
    branchName,
    period,
    generatedAt: new Date().toISOString(),
    executive,
    agents,
    agentsAllBranches,
    finance,
    salesSeries,
    productsInPeriod,
    productMonthlySeries,
    productCustomerLines,
    productVariantSales,
    categoryMonthlySeries,
    enhancements,
    branchTrendCompare,
    branchRevenueShare,
    inventoryReport,
  };
}

/** Export outstanding orders workbook for the current branch filter. */
export async function exportReportsOutstanding(opts: {
  branchName: string | null;
  periodLabel: string;
}): Promise<void> {
  const branchTrim = opts.branchName?.trim() || '';
  const branchName = branchTrim === '' ? null : branchTrim;
  const branchId = branchName ? await resolveBranchIdByName(branchName) : null;
  const rows = await fetchOutstandingOrders(branchId);
  const { downloadOutstandingOrdersWorkbook } = await import('@/src/lib/outstandingOrdersExport');
  await downloadOutstandingOrdersWorkbook({
    branchLabel: branchName ?? 'All branches',
    periodLabel: opts.periodLabel,
    rows,
  });
}

export function formatReportsPeso(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '₱0';
  if (Math.abs(amount) >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `₱${(amount / 1_000).toFixed(0)}K`;
  return `₱${Math.round(amount).toLocaleString()}`;
}

export function formatReportsPesoFull(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '₱0';
  return `₱${Math.round(amount).toLocaleString()}`;
}

/** Full amount with two decimal places (KPIs, commission totals). */
export function formatReportsPesoExact(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '₱0.00';
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
