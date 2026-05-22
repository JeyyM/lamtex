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
  customerName: string;
  agentName: string | null;
  branchId: string | null;
  branchName: string | null;
  totalAmount: number;
  discountPercent: number;
  discountAmount: number;
  requiredDate: string | null;
  orderDate: string | null;
  lineCount: number;
  marginImpact: 'Green' | 'Yellow' | 'Red';
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
        `id, order_number, customer_name, agent_name, branch_id, status,
         order_date, required_date, total_amount, discount_percent, discount_amount,
         branches(name),
         order_line_items(id)`,
        { count: 'exact' },
      )
      .eq('status', PENDING_ORDER_STATUS)
      .order('order_date', { ascending: true });
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error, count } = await q.limit(50);
    if (error) throw error;

    const rows: PendingOrderApprovalRow[] = (data ?? []).map((r) => {
      const total = toNumber((r as Record<string, unknown>).total_amount);
      const discountPct = toNumber((r as Record<string, unknown>).discount_percent);
      const discountAmt = toNumber((r as Record<string, unknown>).discount_amount);
      const lineRows = (r as Record<string, unknown>).order_line_items;
      const lineCount = Array.isArray(lineRows) ? lineRows.length : 0;
      const requiredDate = toStr((r as Record<string, unknown>).required_date);
      const today = new Date();
      const reqDt = requiredDate ? new Date(requiredDate) : null;
      const daysUntilRequired = reqDt
        ? Math.floor((reqDt.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000)
        : null;

      const marginImpact: 'Green' | 'Yellow' | 'Red' =
        discountPct >= 20 ? 'Red' : discountPct >= 10 ? 'Yellow' : 'Green';

      let urgencyScore = 0;
      if (daysUntilRequired != null) {
        if (daysUntilRequired <= 0) urgencyScore += 50;
        else if (daysUntilRequired <= 3) urgencyScore += 35;
        else if (daysUntilRequired <= 7) urgencyScore += 15;
      }
      if (marginImpact === 'Red') urgencyScore += 30;
      else if (marginImpact === 'Yellow') urgencyScore += 15;
      if (total >= 500_000) urgencyScore += 20;
      else if (total >= 200_000) urgencyScore += 10;

      return {
        id: String((r as Record<string, unknown>).id),
        orderNumber: toStr((r as Record<string, unknown>).order_number) ?? String((r as Record<string, unknown>).id),
        customerName: toStr((r as Record<string, unknown>).customer_name) ?? '—',
        agentName: toStr((r as Record<string, unknown>).agent_name),
        branchId: toStr((r as Record<string, unknown>).branch_id),
        branchName: nestedName((r as Record<string, unknown>).branches),
        totalAmount: total,
        discountPercent: discountPct,
        discountAmount: discountAmt,
        requiredDate,
        orderDate: toStr((r as Record<string, unknown>).order_date),
        lineCount,
        marginImpact,
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
         branches(name), production_request_items(id)`,
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
         branches:branches!branch_id(name), suppliers(name), purchase_order_items(id)`,
        { count: 'exact' },
      )
      .eq('status', REQUESTED_PO_STATUS)
      .order('order_date', { ascending: true });
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error, count } = await q.limit(5);
    if (error) throw error;

    const rows: PendingPORow[] = (data ?? []).map((r) => ({
      id: String((r as Record<string, unknown>).id),
      poNumber: toStr((r as Record<string, unknown>).po_number) ?? String((r as Record<string, unknown>).id),
      branchName: nestedName((r as Record<string, unknown>).branches),
      supplierName: nestedName((r as Record<string, unknown>).suppliers),
      expectedDeliveryDate: toStr((r as Record<string, unknown>).expected_delivery_date),
      orderDate: toStr((r as Record<string, unknown>).order_date),
      totalAmount: toNumber((r as Record<string, unknown>).total_amount),
      itemCount: Array.isArray((r as Record<string, unknown>).purchase_order_items)
        ? ((r as Record<string, unknown>).purchase_order_items as unknown[]).length
        : 0,
    }));

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

async function fetchLowStockProducts(branchName: string | null): Promise<ExecutiveLowStockProductRow[]> {
  try {
    // Variants whose total_stock is at or below their reorder_point (excluding hidden / zero-reorder rows).
    // `branch` on product_variants is a denormalised name; we filter softly client-side so a missing
    // value still surfaces in the org-wide view.
    const { data, error } = await supabase
      .from('product_variants')
      .select(
        `id, sku, size, total_stock, reorder_point, safety_stock, branch,
         products(id, name, is_hidden)`,
      )
      .gt('reorder_point', 0)
      .eq('is_hidden', false)
      .order('total_stock', { ascending: true })
      .limit(50);
    if (error) throw error;

    const wantBranch = branchName?.trim().toLowerCase() ?? null;
    const rows: ExecutiveLowStockProductRow[] = (data ?? [])
      .map((r) => {
        const stock = toNumber((r as Record<string, unknown>).total_stock);
        const reorder = toNumber((r as Record<string, unknown>).reorder_point);
        const safety = toNumber((r as Record<string, unknown>).safety_stock);
        const product = (r as Record<string, unknown>).products as
          | { id?: unknown; name?: unknown; is_hidden?: unknown }
          | { id?: unknown; name?: unknown; is_hidden?: unknown }[]
          | null
          | undefined;
        const productObj = Array.isArray(product) ? product[0] : product;
        if (productObj?.is_hidden === true) return null;
        if (stock > reorder) return null;
        const branchTag = toStr((r as Record<string, unknown>).branch);
        if (wantBranch && branchTag && branchTag.trim().toLowerCase() !== wantBranch) {
          return null;
        }
        return {
          variantId: String((r as Record<string, unknown>).id),
          productId: String(productObj?.id ?? ''),
          productName: toStr(productObj?.name ?? null) ?? '—',
          sku: toStr((r as Record<string, unknown>).sku) ?? '—',
          size: toStr((r as Record<string, unknown>).size) ?? '—',
          totalStock: stock,
          reorderPoint: reorder,
          safetyStock: safety,
          branch: branchTag,
          daysOfCover: null,
        };
      })
      .filter((r): r is ExecutiveLowStockProductRow => r !== null);

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
      yearToDateRevenue: sum(ytdRes.data),
    };
  } catch (e) {
    logDev('revenue comparison', e);
    return {
      currentMonthRevenue: 0,
      previousMonthRevenue: 0,
      currentMonthOrders: 0,
      yearToDateRevenue: 0,
    };
  }
}

async function fetchActiveSupplierCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('suppliers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Active');
    if (error) throw error;
    return count ?? 0;
  } catch (e) {
    logDev('suppliers', e);
    return 0;
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

function buildKpis(opts: {
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  currentMonthOrders: number;
  yearToDateRevenue: number;
  approvals: ExecutiveApprovals;
  finance: FinanceMetrics;
  inventory: ExecutiveInventoryAlerts;
  activeSuppliers: number;
  logistics: ExecutiveLogisticsSnapshot;
}): ExecutiveKPI[] {
  const {
    currentMonthRevenue,
    previousMonthRevenue,
    currentMonthOrders,
    yearToDateRevenue,
    approvals,
    finance,
    inventory,
    activeSuppliers,
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

  const totalApprovalCount =
    approvals.pendingOrderCount +
    approvals.pendingProductionRequestCount +
    approvals.pendingPurchaseOrderCount +
    approvals.pendingInterBranchRequestCount;

  const lowStockCount = inventory.lowStockProductCount + inventory.lowStockMaterialCount;
  const onTimePct = logistics.onTimeRate;

  return [
    {
      id: 'kpi-revenue-mtd',
      label: 'Revenue (MTD)',
      value: pesos(currentMonthRevenue),
      subtitle: `${currentMonthOrders.toLocaleString()} orders · YTD ${pesos(yearToDateRevenue)}`,
      trend: revenueDeltaLabel,
      trendUp: revenueDelta >= 0,
      status: 'neutral',
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
      href: '/warehouse',
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
      id: 'kpi-suppliers',
      label: 'Active Suppliers',
      value: activeSuppliers.toString(),
      subtitle: `${totalApprovalCount} total approvals queued`,
      status: 'neutral',
      href: '/suppliers',
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
    activeSuppliers,
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
    fetchLowStockProducts(branchName),
    fetchLowStockMaterials(),
    fetchRevenueTrend(branchId),
    fetchBranchBreakdown(),
    fetchTopProductsMTD(branchId),
    fetchTopCustomers(branchId),
    fetchTopAgentsMTD(branchId),
    fetchLogisticsSnapshot(branchId),
    fetchRevenueComparison(branchId),
    fetchActiveSupplierCount(),
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
    yearToDateRevenue: comparison.yearToDateRevenue,
    approvals,
    finance,
    inventory,
    activeSuppliers,
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
