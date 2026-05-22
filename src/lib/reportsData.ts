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
  fetchFinanceMetrics,
  fetchOutstandingOrders,
  type FinanceMetrics,
  type OutstandingOrderRow,
} from '@/src/lib/financeData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportsTimeRange = '7D' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

export interface ReportsSalesMonthRow {
  period: string;
  monthKey: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  growth: number;
}

export interface ReportsProductRow {
  productName: string;
  unitsSold: number;
  revenue: number;
  orderCount: number;
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
  collectedCurrent: number;
  collectedPrev: number;
  collectedDeltaPct: number;
  collectionRateCurrent: number;
  collectionRatePrev: number;
}

export interface ReportsCategoryMarginRow {
  categoryName: string;
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
}

export interface ReportsBundle {
  branchId: string | null;
  branchName: string | null;
  period: PeriodRange;
  generatedAt: string;
  executive: ExecutiveDashboardBundle;
  agents: AgentAnalyticsBundle;
  finance: FinanceMetrics;
  salesSeries: ReportsSalesMonthRow[];
  productsInPeriod: ReportsProductRow[];
  enhancements: ReportsEnhancements;
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

export function mapReportsTimeRangeToPeriod(range: ReportsTimeRange): PeriodRange {
  const today = new Date();
  switch (range) {
    case '7D':
      return getPeriodRange('week');
    case '1M':
      return getPeriodRange('month');
    case '3M': {
      const end = isoDate(today);
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      return getPeriodRange('custom', { start: isoDate(start), end });
    }
    case '6M':
      return getPeriodRange('sixMonths');
    case '1Y': {
      const end = isoDate(today);
      const start = new Date(today);
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      return getPeriodRange('custom', { start: isoDate(start), end });
    }
    case 'YTD':
      return getPeriodRange('ytd');
    case 'ALL':
      return getPeriodRange('custom', { start: '2020-01-01', end: isoDate(today) });
    default:
      return getPeriodRange('sixMonths');
  }
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

async function fetchProductsInPeriod(
  branchId: string | null,
  from: string,
  to: string,
): Promise<ReportsProductRow[]> {
  try {
    let orderQ = supabase
      .from('orders')
      .select('id')
      .gte('order_date', from)
      .lte('order_date', to)
      .in('status', REVENUE_ORDER_STATUSES);
    if (branchId) orderQ = orderQ.eq('branch_id', branchId);

    const { data: orders, error: oErr } = await orderQ;
    if (oErr) throw oErr;

    const orderIds = ((orders ?? []) as Array<{ id: string }>).map((o) => o.id);
    if (orderIds.length === 0) return [];

    const { data: lines, error: lErr } = await supabase
      .from('order_line_items')
      .select('product_name, quantity, line_total, order_id')
      .in('order_id', orderIds);
    if (lErr) throw lErr;

    const agg = new Map<string, { units: number; revenue: number; orders: Set<string> }>();
    for (const row of (lines ?? []) as Array<Record<string, unknown>>) {
      const name = toStr(row.product_name) ?? 'Unknown';
      const cur = agg.get(name) ?? { units: 0, revenue: 0, orders: new Set<string>() };
      cur.units += toNumber(row.quantity);
      cur.revenue += toNumber(row.line_total);
      cur.orders.add(String(row.order_id));
      agg.set(name, cur);
    }

    return [...agg.entries()]
      .map(([productName, v]) => ({
        productName,
        unitsSold: v.units,
        revenue: v.revenue,
        orderCount: v.orders.size,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] products in period', e);
    return [];
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

async function fetchCollectionCompare(
  branchId: string | null,
  period: PeriodRange,
  prevPeriod: PeriodRange,
  revenueCurrent: number,
  revenuePrev: number,
): Promise<ReportsCollectionCompare> {
  try {
    const sumCollected = async (from: string, to: string): Promise<number> => {
      let q = supabase
        .from('payment_transactions')
        .select('total_paid, paid_at, status, orders!inner(branch_id)')
        .eq('status', 'completed')
        .gte('paid_at', `${from}T00:00:00`)
        .lte('paid_at', `${to}T23:59:59`);
      if (branchId) q = q.eq('orders.branch_id', branchId);

      const { data, error } = await q;
      if (error) {
        // Fallback without join filter
        let fq = supabase
          .from('payment_transactions')
          .select('total_paid, paid_at, status, order_id')
          .eq('status', 'completed')
          .gte('paid_at', `${from}T00:00:00`)
          .lte('paid_at', `${to}T23:59:59`);
        const { data: fd, error: fe } = await fq;
        if (fe) throw fe;
        if (!branchId) {
          let total = 0;
          for (const t of (fd ?? []) as Array<Record<string, unknown>>) {
            total += toNumber(t.total_paid);
          }
          return total;
        }
        const orderIds = ((fd ?? []) as Array<{ order_id: string }>).map((t) => String(t.order_id));
        if (orderIds.length === 0) return 0;
        const { data: ords } = await supabase
          .from('orders')
          .select('id')
          .in('id', orderIds)
          .eq('branch_id', branchId);
        const allowed = new Set(((ords ?? []) as Array<{ id: string }>).map((o) => o.id));
        let total = 0;
        for (const t of (fd ?? []) as Array<Record<string, unknown>>) {
          if (allowed.has(String(t.order_id))) total += toNumber(t.total_paid);
        }
        return total;
      }

      let total = 0;
      for (const t of (data ?? []) as Array<Record<string, unknown>>) {
        total += toNumber(t.total_paid);
      }
      return total;
    };

    const [collectedCurrent, collectedPrev] = await Promise.all([
      sumCollected(period.start, period.end),
      sumCollected(prevPeriod.start, prevPeriod.end),
    ]);

    return {
      collectedCurrent,
      collectedPrev,
      collectedDeltaPct: deltaPct(collectedCurrent, collectedPrev),
      collectionRateCurrent: revenueCurrent > 0 ? (collectedCurrent / revenueCurrent) * 100 : 0,
      collectionRatePrev: revenuePrev > 0 ? (collectedPrev / revenuePrev) * 100 : 0,
    };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[reports] collection compare', e);
    return {
      collectedCurrent: 0,
      collectedPrev: 0,
      collectedDeltaPct: 0,
      collectionRateCurrent: 0,
      collectionRatePrev: 0,
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
    const vidArr = [...variantIds];
    for (let i = 0; i < vidArr.length; i += 200) {
      const slice = vidArr.slice(i, i + 200);
      const { data: pvs } = await supabase
        .from('product_variants')
        .select('id, cost_price, products(category_id, product_categories(name))')
        .in('id', slice);
      for (const pv of (pvs ?? []) as Array<Record<string, unknown>>) {
        const id = String(pv.id);
        costByVariant.set(id, toNumber(pv.cost_price));
        const products = pv.products;
        let catName = 'Uncategorized';
        if (products && typeof products === 'object' && !Array.isArray(products)) {
          const cats = (products as Record<string, unknown>).product_categories;
          if (cats && typeof cats === 'object' && !Array.isArray(cats)) {
            catName = toStr((cats as Record<string, unknown>).name) ?? catName;
          }
        }
        categoryByVariant.set(id, catName);
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
  const summary = agents.summary;

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
  ] = await Promise.all([
    fetchOutstandingOrders(branchId),
    fetchOrderPipeline(branchId),
    fetchOnTimeTrend(branchId),
    fetchOnTimeByBranch(branchId),
    fetchDiscountAnalysis(branchId, period.start, period.end),
    fetchCollectionCompare(
      branchId,
      period,
      prevPeriod,
      summary.totalRevenue,
      summary.totalRevenuePrev,
    ),
    fetchCategoryMargins(branchId, period.start, period.end),
    fetchOrderCycleTime(branchId, period.start, period.end),
    fetchDelayBreakdown(branchId, period.start, period.end),
    fetchOrderCountsForPeriods(branchId, period, prevPeriod),
  ]);

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
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchReportsBundle(opts: {
  branchName: string | null;
  timeRange: ReportsTimeRange;
}): Promise<ReportsBundle> {
  const branchTrim = opts.branchName?.trim() || '';
  const branchName = branchTrim === '' ? null : branchTrim;
  const branchId = branchName ? await resolveBranchIdByName(branchName) : null;
  const period = mapReportsTimeRangeToPeriod(opts.timeRange);

  const [executive, agents, finance, salesSeries, productsInPeriod] = await Promise.all([
    fetchExecutiveDashboard({ branchName }),
    fetchAgentAnalyticsBundle({ range: period, branchId }),
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
  ]);

  const enhancements = await fetchReportsEnhancements({ branchId, period, agents });

  return {
    branchId,
    branchName,
    period,
    generatedAt: new Date().toISOString(),
    executive,
    agents,
    finance,
    salesSeries,
    productsInPeriod,
    enhancements,
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
