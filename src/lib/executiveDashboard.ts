/**
 * Executive Dashboard data layer.
 *
 * Aggregates Supabase queries that power the boss-level overview:
 *   - Headline KPIs (MTD revenue, pending approvals across sales / PR / PO / IBR,
 *     low stock, outstanding receivables, commission release backlog)
 *   - Pending sales approvals queue (Pending orders with discount + value context)
 *   - Procurement & cross-branch approval queues (PR / PO / IBR)
 *   - Finance snapshot (uses fetchFinanceMetrics)
 *   - Inventory exception lists (variants and materials below reorder_point)
 *   - 6-month revenue trend (collected per month from orders)
 *   - Branch breakdown (revenue + overdue per branch, current month)
 *   - Top products / top customers / top agents (MTD)
 *   - Logistics health (trips: on-time vs delayed / failed for the month)
 *
 * Branch scoping: `branchName === ''` → org-wide (no branch filter).
 * Otherwise we resolve the branch UUID via `resolveBranchIdByName`.
 */

import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import {
  fetchFinanceMetrics,
  type FinanceMetrics,
} from '@/src/lib/financeData';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ExecutiveKPI {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  status: 'good' | 'warning' | 'danger' | 'neutral';
  /** Optional in-app route the KPI links to when clicked. */
  href?: string;
}

export interface PendingOrderApprovalRow {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string;
  agentId: string | null;
  agentName: string | null;
  branchId: string | null;
  branchName: string | null;
  /** Order header total (net after discounts). */
  totalAmount: number;
  /** Pre-discount list subtotal from line items. */
  originalTotalAmount: number;
  /** Net line revenue used for margin (usually equals totalAmount). */
  netTotalAmount: number;
  discountPercent: number;
  discountAmount: number;
  requiredDate: string | null;
  orderDate: string | null;
  lineCount: number;
  /** Σ(qty × variant cost_price). */
  totalCost: number;
  /** Gross profit: Σ(line_total − qty × variant cost_price). */
  grossProfit: number;
  /** grossProfit / net revenue × 100 when revenue > 0; negative when sale loses money. */
  profitMarginPct: number;
  urgencyScore: number;
}

export interface PendingPRRow {
  id: string;
  prNumber: string;
  branchName: string | null;
  expectedCompletionDate: string | null;
  requestDate: string | null;
  createdBy: string | null;
  itemCount: number;
}

export interface PendingPORow {
  id: string;
  poNumber: string;
  branchName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  expectedDeliveryDate: string | null;
  orderDate: string | null;
  totalAmount: number;
  itemCount: number;
}

export interface PendingIBRRow {
  id: string;
  ibrNumber: string;
  requestingBranchName: string | null;
  fulfillingBranchName: string | null;
  scheduledDepartureDate: string | null;
  createdAt: string | null;
  createdBy: string | null;
}

export interface ExecutiveApprovals {
  pendingOrders: PendingOrderApprovalRow[];
  pendingOrderCount: number;
  pendingOrderValue: number;
  pendingProductionRequests: PendingPRRow[];
  pendingProductionRequestCount: number;
  pendingPurchaseOrders: PendingPORow[];
  pendingPurchaseOrderCount: number;
  pendingPurchaseOrderValue: number;
  pendingInterBranchRequests: PendingIBRRow[];
  pendingInterBranchRequestCount: number;
}

export interface ExecutiveLowStockProductRow {
  variantId: string;
  productId: string;
  categorySlug: string | null;
  productName: string;
  sku: string;
  size: string;
  totalStock: number;
  reorderPoint: number;
  safetyStock: number;
  branch: string | null;
  daysOfCover: number | null;
}

export interface ExecutiveLowStockMaterialRow {
  materialId: string;
  name: string;
  sku: string;
  unit: string;
  totalStock: number;
  reorderPoint: number;
  safetyStock: number;
  monthlyConsumption: number;
  daysOfCover: number | null;
  primarySupplier: string | null;
}

export interface ExecutiveInventoryAlerts {
  lowStockProducts: ExecutiveLowStockProductRow[];
  lowStockProductCount: number;
  lowStockMaterials: ExecutiveLowStockMaterialRow[];
  lowStockMaterialCount: number;
}

export interface ExecutiveRevenuePoint {
  /** `YYYY-MM` */
  periodKey: string;
  /** Short month label like `Jan` or `Jan 26` when crossing years. */
  label: string;
  revenue: number;
  orderCount: number;
}

export interface ExecutiveBranchBreakdownRow {
  branchId: string;
  branchName: string;
  branchCode: string | null;
  revenueMTD: number;
  orderCountMTD: number;
  outstandingBalance: number;
  overdueBalance: number;
}

export interface ExecutiveTopProductRow {
  productId: string;
  productName: string;
  categoryName: string | null;
  revenueMTD: number;
  unitsSoldMTD: number;
  variantCount: number;
}

export interface ExecutiveTopCustomerRow {
  customerId: string;
  customerName: string;
  customerCode: string | null;
  totalPurchasesYTD: number;
  orderCount: number;
  paymentBehavior: string | null;
  outstandingBalance: number;
}

export interface ExecutiveTopAgentRow {
  agentId: string;
  agentName: string;
  branchName: string | null;
  revenueMTD: number;
  orderCountMTD: number;
}

export interface ExecutiveLogisticsSnapshot {
  totalTripsMTD: number;
  completedTripsMTD: number;
  delayedTripsMTD: number;
  failedTripsMTD: number;
  inTransitNow: number;
  onTimeRate: number;
}

export interface ExecutiveDashboardBundle {
  branchId: string | null;
  /** Display name of the selected branch (or `null` for all branches). */
  branchName: string | null;
  generatedAt: string;
  kpis: ExecutiveKPI[];
  approvals: ExecutiveApprovals;
  finance: FinanceMetrics;
  inventory: ExecutiveInventoryAlerts;
  revenueTrend: ExecutiveRevenuePoint[];
  branchBreakdown: ExecutiveBranchBreakdownRow[];
  topProducts: ExecutiveTopProductRow[];
  topCustomers: ExecutiveTopCustomerRow[];
  topAgents: ExecutiveTopAgentRow[];
  logistics: ExecutiveLogisticsSnapshot;
}

// ---------------------------------------------------------------------------
// Constants — keep in sync with order/PR/PO/IBR detail pages
// ---------------------------------------------------------------------------

/** Order statuses that count as realised revenue (delivered through completed). */
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

const PENDING_ORDER_STATUS = 'Pending';
const REQUESTED_PR_STATUS = 'Requested';
const REQUESTED_PO_STATUS = 'Requested';
const PENDING_IBR_STATUS = 'Pending';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------------------------------------------------------------------------
// Tiny helpers (kept local — financeData has its own scoped variants)
// ---------------------------------------------------------------------------

function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toStr(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  if (typeof v === 'number') return String(v);
  return null;
}

function nestedName(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return toStr((value[0] as { name?: unknown } | undefined)?.name ?? null);
  }
  if (typeof value === 'object') {
    return toStr((value as { name?: unknown }).name ?? null);
  }
  return null;
}

function periodKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfNextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function logDev(scope: string, err: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[executive dashboard] ${scope}`, err);
  }
}

/** Effective discount from line items (matches Orders list logic). */
function effectiveDiscountFromLineItems(
  lines: Array<{ discount_amount?: unknown; line_total?: unknown }> | null | undefined,
): { discountPercent: number; discountAmount: number } {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { discountPercent: 0, discountAmount: 0 };
  }
  let sumDiscountAmount = 0;
  let sumPreDiscountSubtotal = 0;
  for (const row of lines) {
    const disc = toNumber(row.discount_amount);
    const lineTot = toNumber(row.line_total);
    sumDiscountAmount += disc;
    sumPreDiscountSubtotal += lineTot + disc;
  }
  const discountPercent =
    sumPreDiscountSubtotal > 1e-6 ? (sumDiscountAmount / sumPreDiscountSubtotal) * 100 : 0;
  return { discountPercent, discountAmount: sumDiscountAmount };
}

function resolveOrderDiscount(
  headerPercent: number,
  headerAmount: number,
  lines: Array<{ discount_amount?: unknown; line_total?: unknown }> | null | undefined,
): { discountPercent: number; discountAmount: number } {
  const fromLines = effectiveDiscountFromLineItems(lines);
  return {
    discountPercent: fromLines.discountPercent > 1e-6 ? fromLines.discountPercent : headerPercent,
    discountAmount: fromLines.discountAmount > 0 ? fromLines.discountAmount : headerAmount,
  };
}

type PendingOrderLineRow = {
  quantity?: unknown;
  line_total?: unknown;
  variant_id?: unknown;
  discount_amount?: unknown;
  unit_price?: unknown;
};

/** Pre-discount subtotal from order lines (list / negotiated gross before discounts). */
function computeOrderOriginalTotal(
  lines: PendingOrderLineRow[] | null | undefined,
  fallbackNet = 0,
  fallbackDiscount = 0,
): number {
  if (!Array.isArray(lines) || lines.length === 0) {
    return fallbackNet + fallbackDiscount > 0 ? fallbackNet + fallbackDiscount : fallbackNet;
  }
  let gross = 0;
  for (const line of lines) {
    const qty = toNumber(line.quantity);
    const lineTotal = toNumber(line.line_total);
    const disc = toNumber(line.discount_amount);
    const unitPrice = toNumber(line.unit_price);
    const fromDiscountParts = lineTotal + disc;
    const fromUnitPrice = unitPrice * qty;
    gross += fromDiscountParts > 1e-6 ? fromDiscountParts : fromUnitPrice;
  }
  if (gross > 1e-6) return gross;
  return fallbackNet + fallbackDiscount > 0 ? fallbackNet + fallbackDiscount : fallbackNet;
}

function computeOrderProfitMetrics(
  lines: PendingOrderLineRow[] | null | undefined,
  costByVariant: Map<string, number>,
  orderTotalAmount = 0,
): { grossProfit: number; revenue: number; totalCost: number; profitMarginPct: number } {
  if (!Array.isArray(lines) || lines.length === 0) {
    const revenue = orderTotalAmount > 0 ? orderTotalAmount : 0;
    return { grossProfit: 0, revenue, totalCost: 0, profitMarginPct: 0 };
  }
  let lineRevenue = 0;
  let cost = 0;
  for (const line of lines) {
    const qty = toNumber(line.quantity);
    const lineTotal = toNumber(line.line_total);
    lineRevenue += lineTotal;
    const vid = toStr(line.variant_id);
    const unitCost = vid ? (costByVariant.get(vid) ?? 0) : 0;
    cost += unitCost * qty;
  }
  const revenue = lineRevenue > 0 ? lineRevenue : orderTotalAmount;
  const grossProfit = revenue - cost;
  let profitMarginPct = 0;
  if (revenue > 0) {
    profitMarginPct = (grossProfit / revenue) * 100;
  } else if (grossProfit < 0 && cost > 0) {
    profitMarginPct = (grossProfit / cost) * 100;
  }
  return { grossProfit, revenue, totalCost: cost, profitMarginPct };
}

async function fetchVariantCostMap(variantIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (variantIds.length === 0) return map;
  for (let i = 0; i < variantIds.length; i += 200) {
    const slice = variantIds.slice(i, i + 200);
    const { data, error } = await supabase.from('product_variants').select('id, cost_price').in('id', slice);
    if (error) {
      logDev('variant costs', error);
      continue;
    }
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      map.set(String(row.id), toNumber(row.cost_price));
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Sub-fetchers (each handles its own failures so one bad query doesn't break the dashboard)
// ---------------------------------------------------------------------------

async function fetchPendingOrderApprovals(branchId: string | null): Promise<{
  rows: PendingOrderApprovalRow[];
  count: number;
  totalValue: number;
}> {
  try {
    let q = supabase
      .from('orders')
      .select(
        `id, order_number, customer_id, customer_name, agent_id, agent_name, branch_id, status,
         order_date, required_date, total_amount, discount_percent, discount_amount,
         branches(name),
         order_line_items(quantity, line_total, variant_id, discount_amount, unit_price)`,
        { count: 'exact' },
      )
      .eq('status', PENDING_ORDER_STATUS)
      .order('order_date', { ascending: true });
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error, count } = await q.limit(50);
    if (error) throw error;

    const rawOrders = (data ?? []) as Array<Record<string, unknown>>;
    const variantIds = new Set<string>();
    for (const r of rawOrders) {
      const lines = r.order_line_items as PendingOrderLineRow[] | null | undefined;
      if (!Array.isArray(lines)) continue;
      for (const line of lines) {
        const vid = toStr(line.variant_id);
        if (vid) variantIds.add(vid);
      }
    }
    const costByVariant = await fetchVariantCostMap([...variantIds]);

    const rows: PendingOrderApprovalRow[] = rawOrders.map((r) => {
      const total = toNumber(r.total_amount);
      const lineRows = r.order_line_items as PendingOrderLineRow[] | null | undefined;
      const { discountPercent: discountPct, discountAmount: discountAmt } = resolveOrderDiscount(
        toNumber(r.discount_percent),
        toNumber(r.discount_amount),
        lineRows,
      );
      const { grossProfit, revenue, totalCost, profitMarginPct } = computeOrderProfitMetrics(
        lineRows,
        costByVariant,
        total,
      );
      const netTotalAmount = revenue > 0 ? revenue : total;
      const originalTotalAmount = computeOrderOriginalTotal(lineRows, netTotalAmount, discountAmt);
      const lineCount = Array.isArray(lineRows) ? lineRows.length : 0;
      const requiredDate = toStr(r.required_date);
      const today = new Date();
      const reqDt = requiredDate ? new Date(requiredDate) : null;
      const daysUntilRequired = reqDt
        ? Math.floor((reqDt.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000)
        : null;

      let urgencyScore = 0;
      if (daysUntilRequired != null) {
        if (daysUntilRequired <= 0) urgencyScore += 50;
        else if (daysUntilRequired <= 3) urgencyScore += 35;
        else if (daysUntilRequired <= 7) urgencyScore += 15;
      }
      if (profitMarginPct < 0) urgencyScore += 40;
      else if (revenue > 0 && profitMarginPct < 10) urgencyScore += 30;
      else if (revenue > 0 && profitMarginPct < 20) urgencyScore += 15;
      if (total >= 500_000) urgencyScore += 20;
      else if (total >= 200_000) urgencyScore += 10;

      return {
        id: String(r.id),
        orderNumber: toStr(r.order_number) ?? String(r.id),
        customerId: toStr(r.customer_id),
        customerName: toStr(r.customer_name) ?? '—',
        agentId: toStr(r.agent_id),
        agentName: toStr(r.agent_name),
        branchId: toStr(r.branch_id),
        branchName: nestedName(r.branches),
        totalAmount: total,
        originalTotalAmount,
        netTotalAmount,
        discountPercent: discountPct,
        discountAmount: discountAmt,
        requiredDate,
        orderDate: toStr(r.order_date),
        lineCount,
        totalCost,
        grossProfit,
        profitMarginPct,
        urgencyScore,
      };
    });

    rows.sort((a, b) => b.urgencyScore - a.urgencyScore);

    const totalValue = rows.reduce((sum, r) => sum + r.totalAmount, 0);
    return { rows: rows.slice(0, 5), count: count ?? rows.length, totalValue };
  } catch (e) {
    logDev('pending orders', e);
    return { rows: [], count: 0, totalValue: 0 };
  }
}

async function fetchPendingProductionRequests(branchId: string | null): Promise<{
  rows: PendingPRRow[];
  count: number;
}> {
  try {
    let q = supabase
      .from('production_requests')
      .select(
        `id, pr_number, request_date, expected_completion_date, created_by, branch_id,
         branches:branches!branch_id(name), production_request_items(id)`,
        { count: 'exact' },
      )
      .eq('status', REQUESTED_PR_STATUS)
      .order('request_date', { ascending: true });
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error, count } = await q.limit(5);
    if (error) throw error;

    const rows: PendingPRRow[] = (data ?? []).map((r) => ({
      id: String((r as Record<string, unknown>).id),
      prNumber: toStr((r as Record<string, unknown>).pr_number) ?? String((r as Record<string, unknown>).id),
      branchName: nestedName((r as Record<string, unknown>).branches),
      expectedCompletionDate: toStr((r as Record<string, unknown>).expected_completion_date),
      requestDate: toStr((r as Record<string, unknown>).request_date),
      createdBy: toStr((r as Record<string, unknown>).created_by),
      itemCount: Array.isArray((r as Record<string, unknown>).production_request_items)
        ? ((r as Record<string, unknown>).production_request_items as unknown[]).length
        : 0,
    }));

    return { rows, count: count ?? rows.length };
  } catch (e) {
    logDev('pending PRs', e);
    return { rows: [], count: 0 };
  }
}

async function fetchPendingPurchaseOrders(branchId: string | null): Promise<{
  rows: PendingPORow[];
  count: number;
  totalValue: number;
}> {
  try {
    let q = supabase
      .from('purchase_orders')
      .select(
        `id, po_number, order_date, expected_delivery_date, total_amount, branch_id,
         branches:branches!branch_id(name), suppliers(id, name), purchase_order_items(id)`,
        { count: 'exact' },
      )
      .eq('status', REQUESTED_PO_STATUS)
      .order('order_date', { ascending: true });
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error, count } = await q.limit(5);
    if (error) throw error;

    const rows: PendingPORow[] = (data ?? []).map((r) => {
      const rec = r as Record<string, unknown>;
      const supplierEmbed = rec.suppliers;
      let supplierId: string | null = null;
      let supplierName: string | null = null;
      if (supplierEmbed && typeof supplierEmbed === 'object' && !Array.isArray(supplierEmbed)) {
        supplierId = toStr((supplierEmbed as Record<string, unknown>).id);
        supplierName = toStr((supplierEmbed as Record<string, unknown>).name);
      } else {
        supplierName = nestedName(supplierEmbed);
      }
      return {
        id: String(rec.id),
        poNumber: toStr(rec.po_number) ?? String(rec.id),
        branchName: nestedName(rec.branches),
        supplierId,
        supplierName,
        expectedDeliveryDate: toStr(rec.expected_delivery_date),
        orderDate: toStr(rec.order_date),
        totalAmount: toNumber(rec.total_amount),
        itemCount: Array.isArray(rec.purchase_order_items)
          ? (rec.purchase_order_items as unknown[]).length
          : 0,
      };
    });

    const totalValue = rows.reduce((sum, r) => sum + r.totalAmount, 0);
    return { rows, count: count ?? rows.length, totalValue };
  } catch (e) {
    logDev('pending POs', e);
    return { rows: [], count: 0, totalValue: 0 };
  }
}

async function fetchPendingInterBranchRequests(branchId: string | null): Promise<{
  rows: PendingIBRRow[];
  count: number;
}> {
  try {
    let q = supabase
      .from('inter_branch_requests')
      .select(
        `id, ibr_number, created_by, created_at, scheduled_departure_date,
         requesting_branch_id, fulfilling_branch_id,
         req_br:branches!requesting_branch_id(name),
         ful_br:branches!fulfilling_branch_id(name)`,
        { count: 'exact' },
      )
      .eq('status', PENDING_IBR_STATUS)
      .order('created_at', { ascending: false });

    if (branchId) {
      q = q.or(`requesting_branch_id.eq.${branchId},fulfilling_branch_id.eq.${branchId}`);
    }

    const { data, error, count } = await q.limit(5);
    if (error) throw error;

    const rows: PendingIBRRow[] = (data ?? []).map((r) => ({
      id: String((r as Record<string, unknown>).id),
      ibrNumber: toStr((r as Record<string, unknown>).ibr_number) ?? String((r as Record<string, unknown>).id),
      requestingBranchName: nestedName((r as Record<string, unknown>).req_br),
      fulfillingBranchName: nestedName((r as Record<string, unknown>).ful_br),
      scheduledDepartureDate: toStr((r as Record<string, unknown>).scheduled_departure_date),
      createdAt: toStr((r as Record<string, unknown>).created_at),
      createdBy: toStr((r as Record<string, unknown>).created_by),
    }));

    return { rows, count: count ?? rows.length };
  } catch (e) {
    logDev('pending IBRs', e);
    return { rows: [], count: 0 };
  }
}

async function fetchLowStockProducts(branchId: string | null): Promise<ExecutiveLowStockProductRow[]> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select(
        `id, sku, size, total_stock, reorder_point, safety_stock, branch,
         product_variant_stock(branch_id, quantity, branches(name)),
         products(id, name, is_hidden, product_categories(slug))`,
      )
      .gt('reorder_point', 0)
      .eq('is_hidden', false)
      .limit(500);
    if (error) throw error;

    const rows: ExecutiveLowStockProductRow[] = (data ?? [])
      .map((r) => {
        const raw = r as Record<string, unknown>;
        const totalStock = toNumber(raw.total_stock);
        const reorder = toNumber(raw.reorder_point);
        const safety = toNumber(raw.safety_stock);
        const product = raw.products as
          | { id?: unknown; name?: unknown; is_hidden?: unknown }
          | { id?: unknown; name?: unknown; is_hidden?: unknown }[]
          | null
          | undefined;
        const productObj = Array.isArray(product) ? product[0] : product;
        if (productObj?.is_hidden === true) return null;

        const branchStockRows = (Array.isArray(raw.product_variant_stock)
          ? (raw.product_variant_stock as Array<Record<string, unknown>>)
          : []);

        let effectiveStock = totalStock;
        let branchTag = toStr(raw.branch);
        if (branchId) {
          const match = branchStockRows.find((row) => String(row.branch_id) === branchId);
          if (!match) return null;
          effectiveStock = toNumber(match.quantity);
          const branchRel = match.branches as { name?: unknown } | { name?: unknown }[] | null | undefined;
          const branchObj = Array.isArray(branchRel) ? branchRel[0] : branchRel;
          branchTag = toStr(branchObj?.name) ?? branchTag;
        }

        if (effectiveStock > reorder) return null;

        const category = (productObj as { product_categories?: unknown } | undefined)?.product_categories;
        const categoryObj = Array.isArray(category) ? category[0] : category;
        const categorySlug = toStr((categoryObj as { slug?: unknown } | null | undefined)?.slug);
        return {
          variantId: String(raw.id),
          productId: String(productObj?.id ?? ''),
          categorySlug,
          productName: toStr(productObj?.name ?? null) ?? '—',
          sku: toStr(raw.sku) ?? '—',
          size: toStr(raw.size) ?? '—',
          totalStock: effectiveStock,
          reorderPoint: reorder,
          safetyStock: safety,
          branch: branchTag,
          daysOfCover: null,
        };
      })
      .filter((r): r is ExecutiveLowStockProductRow => r !== null)
      .sort((a, b) => a.totalStock - b.totalStock)
      .slice(0, 50);

    return rows;
  } catch (e) {
    logDev('low stock products', e);
    return [];
  }
}

async function fetchLowStockMaterials(): Promise<ExecutiveLowStockMaterialRow[]> {
  try {
    const { data, error } = await supabase
      .from('raw_materials')
      .select(
        'id, name, sku, unit_of_measure, total_stock, reorder_point, safety_stock, monthly_consumption, primary_supplier, status',
      )
      .gt('reorder_point', 0)
      .order('total_stock', { ascending: true })
      .limit(50);
    if (error) throw error;

    const rows: ExecutiveLowStockMaterialRow[] = (data ?? [])
      .map((r) => {
        if (toStr((r as Record<string, unknown>).status) === 'Inactive') return null;
        const stock = toNumber((r as Record<string, unknown>).total_stock);
        const reorder = toNumber((r as Record<string, unknown>).reorder_point);
        if (stock > reorder) return null;
        const monthlyConsumption = toNumber((r as Record<string, unknown>).monthly_consumption);
        const dailyConsumption = monthlyConsumption / 30;
        const daysOfCover = dailyConsumption > 0 ? stock / dailyConsumption : null;
        return {
          materialId: String((r as Record<string, unknown>).id),
          name: toStr((r as Record<string, unknown>).name) ?? '—',
          sku: toStr((r as Record<string, unknown>).sku) ?? '—',
          unit: toStr((r as Record<string, unknown>).unit_of_measure) ?? '',
          totalStock: stock,
          reorderPoint: reorder,
          safetyStock: toNumber((r as Record<string, unknown>).safety_stock),
          monthlyConsumption,
          daysOfCover: daysOfCover != null && Number.isFinite(daysOfCover) ? Math.round(daysOfCover) : null,
          primarySupplier: toStr((r as Record<string, unknown>).primary_supplier),
        };
      })
      .filter((r): r is ExecutiveLowStockMaterialRow => r !== null);

    return rows;
  } catch (e) {
    logDev('low stock materials', e);
    return [];
  }
}

async function fetchRevenueTrend(branchId: string | null): Promise<ExecutiveRevenuePoint[]> {
  // 6 calendar months ending with current month
  const points: ExecutiveRevenuePoint[] = [];
  const now = new Date();
  const startDt = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  try {
    let q = supabase
      .from('orders')
      .select('order_date, total_amount, status')
      .gte('order_date', isoDate(startDt))
      .lt('order_date', isoDate(startOfNextMonth(now)))
      .in('status', REVENUE_ORDER_STATUSES);
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    for (let i = 0; i < 6; i++) {
      const dt = new Date(startDt.getFullYear(), startDt.getMonth() + i, 1);
      points.push({
        periodKey: periodKey(dt),
        label:
          dt.getFullYear() === now.getFullYear()
            ? MONTH_LABELS[dt.getMonth()]
            : `${MONTH_LABELS[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`,
        revenue: 0,
        orderCount: 0,
      });
    }

    const index = new Map(points.map((p) => [p.periodKey, p]));
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const od = toStr(row.order_date);
      if (!od) continue;
      const dt = new Date(od);
      if (!Number.isFinite(dt.getTime())) continue;
      const key = periodKey(dt);
      const pt = index.get(key);
      if (!pt) continue;
      pt.revenue += toNumber(row.total_amount);
      pt.orderCount += 1;
    }
  } catch (e) {
    logDev('revenue trend', e);
  }
  return points;
}

async function fetchBranchBreakdown(): Promise<ExecutiveBranchBreakdownRow[]> {
  try {
    const now = new Date();
    const mtdFrom = isoDate(startOfMonth(now));
    const mtdTo = isoDate(startOfNextMonth(now));

    const [branchesRes, mtdRes, outstandingRes] = await Promise.all([
      supabase.from('branches').select('id, name, code, is_active').eq('is_active', true).order('name'),
      // MTD revenue / order count — restrict to realised-revenue statuses
      supabase
        .from('orders')
        .select('branch_id, total_amount, status, order_date')
        .gte('order_date', mtdFrom)
        .lt('order_date', mtdTo)
        .in('status', REVENUE_ORDER_STATUSES),
      // All-time outstanding balances (any order with money still owed)
      supabase
        .from('orders')
        .select('branch_id, balance_due, payment_status')
        .gt('balance_due', 0),
    ]);

    if (branchesRes.error) throw branchesRes.error;
    if (mtdRes.error) throw mtdRes.error;
    if (outstandingRes.error) throw outstandingRes.error;

    type Row = ExecutiveBranchBreakdownRow;
    const map = new Map<string, Row>();
    for (const b of (branchesRes.data ?? []) as Array<Record<string, unknown>>) {
      const id = String(b.id);
      map.set(id, {
        branchId: id,
        branchName: toStr(b.name) ?? '—',
        branchCode: toStr(b.code),
        revenueMTD: 0,
        orderCountMTD: 0,
        outstandingBalance: 0,
        overdueBalance: 0,
      });
    }

    for (const o of (mtdRes.data ?? []) as Array<Record<string, unknown>>) {
      const bid = toStr(o.branch_id);
      if (!bid) continue;
      const row = map.get(bid);
      if (!row) continue;
      row.revenueMTD += toNumber(o.total_amount);
      row.orderCountMTD += 1;
    }

    for (const o of (outstandingRes.data ?? []) as Array<Record<string, unknown>>) {
      const bid = toStr(o.branch_id);
      if (!bid) continue;
      const row = map.get(bid);
      if (!row) continue;
      const balance = toNumber(o.balance_due);
      row.outstandingBalance += balance;
      if (toStr(o.payment_status) === 'Overdue') {
        row.overdueBalance += balance;
      }
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => b.revenueMTD - a.revenueMTD);
    return arr;
  } catch (e) {
    logDev('branch breakdown', e);
    return [];
  }
}

async function fetchTopProductsMTD(branchId: string | null): Promise<ExecutiveTopProductRow[]> {
  try {
    const now = new Date();
    const mtdFrom = isoDate(startOfMonth(now));
    const mtdTo = isoDate(startOfNextMonth(now));

    let q = supabase
      .from('order_line_items')
      .select(
        `quantity, line_total, variant_id,
         orders!inner(branch_id, status, order_date),
         product_variants(product_id, products(id, name, product_categories(name)))`,
      )
      .gte('orders.order_date', mtdFrom)
      .lt('orders.order_date', mtdTo)
      .in('orders.status', REVENUE_ORDER_STATUSES);

    if (branchId) q = q.eq('orders.branch_id', branchId);

    const { data, error } = await q.limit(1000);
    if (error) throw error;

    type Agg = ExecutiveTopProductRow;
    const map = new Map<string, Agg>();
    const variantSeen = new Map<string, Set<string>>();

    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const pv = r.product_variants as Record<string, unknown> | null;
      if (!pv) continue;
      const product = pv.products as { id?: unknown; name?: unknown; product_categories?: unknown } | null;
      if (!product) continue;
      const productId = toStr(product.id);
      if (!productId) continue;
      const variantId = toStr(r.variant_id);
      const categoryName = nestedName((product as Record<string, unknown>).product_categories);
      const productName = toStr(product.name) ?? '—';
      const qty = toNumber(r.quantity);
      const revenue = toNumber(r.line_total);

      const existing = map.get(productId) ?? {
        productId,
        productName,
        categoryName,
        revenueMTD: 0,
        unitsSoldMTD: 0,
        variantCount: 0,
      };
      existing.revenueMTD += revenue;
      existing.unitsSoldMTD += qty;
      map.set(productId, existing);

      if (variantId) {
        if (!variantSeen.has(productId)) variantSeen.set(productId, new Set<string>());
        variantSeen.get(productId)!.add(variantId);
      }
    }

    for (const [productId, set] of variantSeen) {
      const row = map.get(productId);
      if (row) row.variantCount = set.size;
    }

    const arr = Array.from(map.values()).sort((a, b) => b.revenueMTD - a.revenueMTD);
    return arr.slice(0, 5);
  } catch (e) {
    logDev('top products', e);
    return [];
  }
}

async function fetchTopCustomers(branchId: string | null): Promise<ExecutiveTopCustomerRow[]> {
  try {
    let q = supabase
      .from('customers')
      .select(
        'id, customer_code, name, total_purchases_ytd, order_count, payment_behavior, outstanding_balance, branch_id, status',
      )
      .order('total_purchases_ytd', { ascending: false });
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q.limit(8);
    if (error) throw error;

    const rows: ExecutiveTopCustomerRow[] = (data ?? [])
      .map((r) => ({
        customerId: String((r as Record<string, unknown>).id),
        customerName: toStr((r as Record<string, unknown>).name) ?? '—',
        customerCode: toStr((r as Record<string, unknown>).customer_code),
        totalPurchasesYTD: toNumber((r as Record<string, unknown>).total_purchases_ytd),
        orderCount: toNumber((r as Record<string, unknown>).order_count),
        paymentBehavior: toStr((r as Record<string, unknown>).payment_behavior),
        outstandingBalance: toNumber((r as Record<string, unknown>).outstanding_balance),
      }))
      .filter((r) => r.totalPurchasesYTD > 0 || r.orderCount > 0);

    return rows.slice(0, 5);
  } catch (e) {
    logDev('top customers', e);
    return [];
  }
}

async function fetchTopAgentsMTD(branchId: string | null): Promise<ExecutiveTopAgentRow[]> {
  try {
    const now = new Date();
    const mtdFrom = isoDate(startOfMonth(now));
    const mtdTo = isoDate(startOfNextMonth(now));

    let q = supabase
      .from('orders')
      .select(
        `agent_id, agent_name, total_amount, status, order_date, branch_id,
         branches(name)`,
      )
      .gte('order_date', mtdFrom)
      .lt('order_date', mtdTo)
      .in('status', REVENUE_ORDER_STATUSES);

    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q.limit(1000);
    if (error) throw error;

    type Agg = ExecutiveTopAgentRow;
    const map = new Map<string, Agg>();
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const aid = toStr(r.agent_id);
      if (!aid) continue;
      const name = toStr(r.agent_name) ?? '—';
      const branchName = nestedName(r.branches);
      const row = map.get(aid) ?? {
        agentId: aid,
        agentName: name,
        branchName,
        revenueMTD: 0,
        orderCountMTD: 0,
      };
      row.revenueMTD += toNumber(r.total_amount);
      row.orderCountMTD += 1;
      map.set(aid, row);
    }

    return Array.from(map.values())
      .sort((a, b) => b.revenueMTD - a.revenueMTD)
      .slice(0, 5);
  } catch (e) {
    logDev('top agents', e);
    return [];
  }
}

async function fetchLogisticsSnapshot(branchId: string | null): Promise<ExecutiveLogisticsSnapshot> {
  try {
    const now = new Date();
    const mtdFrom = isoDate(startOfMonth(now));
    const mtdTo = isoDate(startOfNextMonth(now));

    let q = supabase
      .from('trips')
      .select('id, status, scheduled_date, branch_id, actual_arrival, eta, delay_reason')
      .gte('scheduled_date', mtdFrom)
      .lt('scheduled_date', mtdTo);
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    let totalTrips = 0;
    let completed = 0;
    let delayed = 0;
    let failed = 0;
    let inTransit = 0;

    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      totalTrips += 1;
      const status = toStr(r.status);
      switch (status) {
        case 'Completed':
          completed += 1;
          break;
        case 'Delayed':
          delayed += 1;
          break;
        case 'Failed':
          failed += 1;
          break;
        case 'In Transit':
          inTransit += 1;
          break;
        default:
          break;
      }
    }

    const closed = completed + delayed + failed;
    const onTimeRate = closed > 0 ? (completed / closed) * 100 : 0;

    return {
      totalTripsMTD: totalTrips,
      completedTripsMTD: completed,
      delayedTripsMTD: delayed,
      failedTripsMTD: failed,
      inTransitNow: inTransit,
      onTimeRate,
    };
  } catch (e) {
    logDev('logistics', e);
    return {
      totalTripsMTD: 0,
      completedTripsMTD: 0,
      delayedTripsMTD: 0,
      failedTripsMTD: 0,
      inTransitNow: 0,
      onTimeRate: 0,
    };
  }
}

async function fetchRevenueComparison(branchId: string | null): Promise<{
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  currentMonthOrders: number;
  previousMonthOrders: number;
  yearToDateRevenue: number;
}> {
  try {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const nextMonthStart = startOfNextMonth(now);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yearStart = startOfYear(now);

    const baseSelect = 'order_date, total_amount, status, branch_id';

    const buildQuery = (from: Date, to: Date) => {
      let q = supabase
        .from('orders')
        .select(baseSelect)
        .gte('order_date', isoDate(from))
        .lt('order_date', isoDate(to))
        .in('status', REVENUE_ORDER_STATUSES);
      if (branchId) q = q.eq('branch_id', branchId);
      return q;
    };

    const [thisMonthRes, prevMonthRes, ytdRes] = await Promise.all([
      buildQuery(thisMonthStart, nextMonthStart),
      buildQuery(prevMonthStart, thisMonthStart),
      buildQuery(yearStart, nextMonthStart),
    ]);

    if (thisMonthRes.error) throw thisMonthRes.error;
    if (prevMonthRes.error) throw prevMonthRes.error;
    if (ytdRes.error) throw ytdRes.error;

    const sum = (rows: unknown): number => {
      const arr = (rows ?? []) as Array<Record<string, unknown>>;
      return arr.reduce((acc, r) => acc + toNumber(r.total_amount), 0);
    };

    return {
      currentMonthRevenue: sum(thisMonthRes.data),
      previousMonthRevenue: sum(prevMonthRes.data),
      currentMonthOrders: (thisMonthRes.data ?? []).length,
      previousMonthOrders: (prevMonthRes.data ?? []).length,
      yearToDateRevenue: sum(ytdRes.data),
    };
  } catch (e) {
    logDev('revenue comparison', e);
    return {
      currentMonthRevenue: 0,
      previousMonthRevenue: 0,
      currentMonthOrders: 0,
      previousMonthOrders: 0,
      yearToDateRevenue: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// KPI builder
// ---------------------------------------------------------------------------

function pesos(amount: number): string {
  if (!Number.isFinite(amount)) return '₱0';
  if (Math.abs(amount) >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `₱${(amount / 1_000).toFixed(0)}K`;
  return `₱${Math.round(amount).toLocaleString()}`;
}

function pesosExact(amount: number): string {
  if (!Number.isFinite(amount)) return '₱0';
  return `₱${Math.round(amount).toLocaleString()}`;
}

function buildKpis(opts: {
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  currentMonthOrders: number;
  previousMonthOrders: number;
  yearToDateRevenue: number;
  approvals: ExecutiveApprovals;
  finance: FinanceMetrics;
  inventory: ExecutiveInventoryAlerts;
  logistics: ExecutiveLogisticsSnapshot;
}): ExecutiveKPI[] {
  const {
    currentMonthRevenue,
    previousMonthRevenue,
    currentMonthOrders,
    previousMonthOrders,
    yearToDateRevenue,
    approvals,
    finance,
    inventory,
    logistics,
  } = opts;

  const revenueDelta =
    previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0;
  const revenueDeltaLabel =
    previousMonthRevenue > 0
      ? `${revenueDelta >= 0 ? '+' : ''}${revenueDelta.toFixed(1)}% vs last month`
      : 'No prior period';

  const currentAov = currentMonthOrders > 0 ? currentMonthRevenue / currentMonthOrders : 0;
  const previousAov = previousMonthOrders > 0 ? previousMonthRevenue / previousMonthOrders : 0;
  const aovDelta =
    previousAov > 0 ? ((currentAov - previousAov) / previousAov) * 100 : 0;
  const aovDeltaLabel =
    previousAov > 0
      ? `${aovDelta >= 0 ? '+' : ''}${aovDelta.toFixed(1)}% vs last month`
      : 'No prior period';

  const lowStockCount = inventory.lowStockProductCount + inventory.lowStockMaterialCount;
  const onTimePct = logistics.onTimeRate;
  const lowStockHref =
    inventory.lowStockMaterialCount > inventory.lowStockProductCount
      ? '/materials'
      : '/products';

  return [
    {
      id: 'kpi-revenue-mtd',
      label: 'Revenue (MTD)',
      value: pesos(currentMonthRevenue),
      subtitle: `${currentMonthOrders.toLocaleString()} orders · YTD ${pesos(yearToDateRevenue)}`,
      trend: revenueDeltaLabel,
      trendUp: revenueDelta >= 0,
      status: 'neutral',
      href: '/reports',
    },
    {
      id: 'kpi-pending-orders',
      label: 'Pending Order Approvals',
      value: approvals.pendingOrderCount.toString(),
      subtitle: pesos(approvals.pendingOrderValue),
      status: approvals.pendingOrderCount > 0 ? 'warning' : 'good',
      href: '/orders',
    },
    {
      id: 'kpi-pending-procurement',
      label: 'Procurement Approvals',
      value: (
        approvals.pendingProductionRequestCount +
        approvals.pendingPurchaseOrderCount +
        approvals.pendingInterBranchRequestCount
      ).toString(),
      subtitle: `${approvals.pendingProductionRequestCount} PR · ${approvals.pendingPurchaseOrderCount} PO · ${approvals.pendingInterBranchRequestCount} IBR`,
      status:
        approvals.pendingProductionRequestCount +
          approvals.pendingPurchaseOrderCount +
          approvals.pendingInterBranchRequestCount >
        0
          ? 'warning'
          : 'good',
      href: '/warehouse',
    },
    {
      id: 'kpi-receivables',
      label: 'Outstanding Receivables',
      value: pesos(finance.totalOutstanding),
      subtitle:
        finance.overdueCount > 0
          ? `${pesos(finance.totalOverdue)} overdue · ${finance.overdueCount} invoices`
          : 'No overdue invoices',
      status: finance.totalOverdue > 0 ? 'danger' : 'good',
      href: '/finance',
    },
    {
      id: 'kpi-commissions',
      label: 'Commission Release',
      value: pesos(finance.pendingCommissions),
      subtitle:
        finance.pendingCommissionCount > 0
          ? `${finance.pendingCommissionCount} pending · ${pesos(finance.commissionsPaidOut)} paid`
          : `${pesos(finance.commissionsPaidOut)} paid this month`,
      status: finance.pendingCommissionCount > 0 ? 'warning' : 'good',
      href: '/finance',
    },
    {
      id: 'kpi-low-stock',
      label: 'Low Stock Alerts',
      value: lowStockCount.toString(),
      subtitle: `${inventory.lowStockProductCount} products · ${inventory.lowStockMaterialCount} materials`,
      status: lowStockCount > 0 ? 'warning' : 'good',
      href: lowStockHref,
    },
    {
      id: 'kpi-delivery',
      label: 'Delivery On-Time (MTD)',
      value: logistics.totalTripsMTD > 0 ? `${onTimePct.toFixed(0)}%` : '—',
      subtitle:
        logistics.totalTripsMTD > 0
          ? `${logistics.completedTripsMTD}/${logistics.completedTripsMTD + logistics.delayedTripsMTD + logistics.failedTripsMTD} closed · ${logistics.inTransitNow} in transit`
          : 'No trips this month',
      status: onTimePct >= 90 ? 'good' : onTimePct >= 75 ? 'warning' : logistics.totalTripsMTD === 0 ? 'neutral' : 'danger',
      href: '/logistics',
    },
    {
      id: 'kpi-aov',
      label: 'Avg Order Value (MTD)',
      value: currentMonthOrders > 0 ? pesosExact(currentAov) : '—',
      subtitle:
        currentMonthOrders > 0
          ? `${currentMonthOrders.toLocaleString()} orders · prev ${previousAov > 0 ? pesosExact(previousAov) : '—'}`
          : 'No orders this month',
      trend: currentMonthOrders > 0 ? aovDeltaLabel : undefined,
      trendUp: previousAov > 0 ? aovDelta >= 0 : undefined,
      status:
        currentMonthOrders === 0
          ? 'neutral'
          : aovDelta >= 0 || previousAov === 0
            ? 'good'
            : 'warning',
      href: '/agents',
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch every panel the Executive Dashboard renders, in parallel.
 * `branchName === ''` (or `null`) → org-wide view.
 */
export async function fetchExecutiveDashboard(opts: {
  branchName?: string | null;
}): Promise<ExecutiveDashboardBundle> {
  const rawBranch = (opts.branchName ?? '').trim();
  const branchName = rawBranch === '' ? null : rawBranch;
  const branchId = branchName ? await resolveBranchIdByName(branchName) : null;

  const [
    pendingOrders,
    pendingPRs,
    pendingPOs,
    pendingIBRs,
    finance,
    lowStockProducts,
    lowStockMaterials,
    revenueTrend,
    branchBreakdown,
    topProducts,
    topCustomers,
    topAgents,
    logistics,
    comparison,
  ] = await Promise.all([
    fetchPendingOrderApprovals(branchId),
    fetchPendingProductionRequests(branchId),
    fetchPendingPurchaseOrders(branchId),
    fetchPendingInterBranchRequests(branchId),
    fetchFinanceMetrics(branchId).catch((e) => {
      logDev('finance metrics', e);
      return {
        totalOutstanding: 0,
        totalOverdue: 0,
        overdueCount: 0,
        collectedThisMonth: 0,
        pendingProofs: 0,
        pendingCommissions: 0,
        pendingCommissionCount: 0,
        commissionsPaidOut: 0,
      } satisfies FinanceMetrics;
    }),
    fetchLowStockProducts(branchId),
    fetchLowStockMaterials(),
    fetchRevenueTrend(branchId),
    fetchBranchBreakdown(),
    fetchTopProductsMTD(branchId),
    fetchTopCustomers(branchId),
    fetchTopAgentsMTD(branchId),
    fetchLogisticsSnapshot(branchId),
    fetchRevenueComparison(branchId),
  ]);

  const approvals: ExecutiveApprovals = {
    pendingOrders: pendingOrders.rows,
    pendingOrderCount: pendingOrders.count,
    pendingOrderValue: pendingOrders.totalValue,
    pendingProductionRequests: pendingPRs.rows,
    pendingProductionRequestCount: pendingPRs.count,
    pendingPurchaseOrders: pendingPOs.rows,
    pendingPurchaseOrderCount: pendingPOs.count,
    pendingPurchaseOrderValue: pendingPOs.totalValue,
    pendingInterBranchRequests: pendingIBRs.rows,
    pendingInterBranchRequestCount: pendingIBRs.count,
  };

  const inventory: ExecutiveInventoryAlerts = {
    lowStockProducts: lowStockProducts.slice(0, 5),
    lowStockProductCount: lowStockProducts.length,
    lowStockMaterials: lowStockMaterials.slice(0, 5),
    lowStockMaterialCount: lowStockMaterials.length,
  };

  const kpis = buildKpis({
    currentMonthRevenue: comparison.currentMonthRevenue,
    previousMonthRevenue: comparison.previousMonthRevenue,
    currentMonthOrders: comparison.currentMonthOrders,
    previousMonthOrders: comparison.previousMonthOrders,
    yearToDateRevenue: comparison.yearToDateRevenue,
    approvals,
    finance,
    inventory,
    logistics,
  });

  return {
    branchId,
    branchName,
    generatedAt: new Date().toISOString(),
    kpis,
    approvals,
    finance,
    inventory,
    revenueTrend,
    branchBreakdown,
    topProducts,
    topCustomers,
    topAgents,
    logistics,
  };
}

/** Currency helper exported for the page to reuse formatting. */
export function formatExecutivePeso(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '₱0';
  return pesos(amount);
}

/** Profit margin % — negative when the sale loses money (cost exceeds net revenue). */
export function formatExecutiveMarginPct(profitMarginPct: number, grossProfit?: number): string {
  if (!Number.isFinite(profitMarginPct)) return '—';
  if (grossProfit != null && grossProfit < -1e-6) {
    const pct = profitMarginPct <= 0 ? profitMarginPct : -Math.abs(profitMarginPct);
    return `${pct.toFixed(1)}%`;
  }
  return `${profitMarginPct.toFixed(1)}%`;
}
