/**
 * Agent Analytics — Supabase-backed data layer.
 *
 * All queries here run against the live database. The page hydrates
 * from these helpers and computes attainment / pacing in JS so the
 * UI stays responsive when filters change.
 */

import { supabase } from '@/src/lib/supabase';
import { computeProofCommissionForClientType } from '@/src/lib/financeData';
import { proofCashAmount, proofRequiresCommissionPayout } from '@/src/lib/orderCommissionCompletion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PeriodKey =
  | 'day'
  | 'week'
  | 'month'
  | 'sixMonths'
  | 'ytd'
  | 'year'
  | 'quarter'
  | 'custom';

export interface PeriodRange {
  /** YYYY-MM-DD inclusive */
  start: string;
  /** YYYY-MM-DD inclusive */
  end: string;
  /** Period label used as the agent_targets.period key (e.g. '2026-03', '2026-Q1', 'yearly-2026'). */
  periodLabel: string;
  /** Friendly label for UI (e.g. "March 2026"). */
  displayLabel: string;
  kind: PeriodKey;
}

export interface BranchOption {
  id: string;
  code: string;
  name: string;
}

export interface AgentEmployee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  branchId: string | null;
  branchName: string | null;
  status: string;
  joinDate: string | null;
}

export interface AgentTargetRow {
  id: string;
  employeeId: string;
  period: string;
  monthlyTarget: number;
  quarterlyTarget: number;
  stretchGoal: string | null;
  updatedAt: string;
}

export interface AgentRevenueRow {
  agentId: string;
  agentName: string;
  branchId: string | null;
  year: number;
  month: number;
  orderCount: number;
  /** Primary KPI total: payments when recorded, else order total (see effectiveOrderCollected). */
  revenue: number;
  /** Order face value — SUM(total_amount); used for collection rate & discount weighting */
  grossSales: number;
  amountPaid: number;
  balanceDue: number;
  avgDiscountPercent: number;
  distinctCustomers: number;
  overdueOrders: number;
  overdueBalance: number;
}

export interface AgentLeaderboardRow {
  /** UUID (`employees.id`) — joins, commissions */
  agentId: string;
  /** HR code (`employees.employee_id`), e.g. AGT-BTG-001 — use for `/employees/:employeeId` links */
  employeePublicId: string;
  agentName: string;
  branchId: string | null;
  branchName: string | null;

  // KPIs in window
  /** KPI revenue (payments when &gt; 0, else total_amount) */
  revenue: number;
  /** Σ order total_amount — used for collection % denominator */
  grossSales: number;
  orderCount: number;
  averageOrderValue: number;
  amountPaid: number;
  balanceDue: number;
  avgDiscountPercent: number;
  collectionRate: number; // 0..100
  distinctCustomers: number;
  newCustomers: number;
  overdueOrders: number;
  overdueBalance: number;

  // Quota (leaderboard uses branch_sales_targets only — stepped monthly quota carried to calendar month of filter end)
  monthlyTarget: number;
  quarterlyTarget: number;
  effectiveTarget: number; // matches selected period
  attainmentPct: number;   // revenue / effectiveTarget * 100
  pacingPct: number;       // attainment / expectedAttainmentByDay * 100
  expectedRevenueToDate: number;
  revenueGap: number;
  stretchGoal: string | null;

  // Commission (cash proof Office/Personal rates); paid = payouts where commission_paid_at falls in selected period
  /** Total recognized on orders dated in the selected period */
  commissionEarned: number;
  /** Paid out when commission_paid_at is in the selected period (release date) */
  commissionPaid: number;
  /** On orders dated in period: earned − released (commission_paid_at set on proof) */
  commissionAccrued: number;

  // Comparison vs previous equivalent period
  prevRevenue: number;
  revenueDeltaPct: number; // (this - prev) / prev * 100

  /** Line gross profit: Σ(line_total − qty×variant.cost_price); line_total reflects discounts */
  profit: number;
}

export interface BranchAnalyticsRow {
  branchId: string;
  branchName: string;
  branchCode: string;
  agentCount: number;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  attainmentPct: number;
  totalTarget: number;
  collectionRate: number;
  outstanding: number;
  /** Σ gross profit from order lines (after discounts, minus variant cost_price) */
  totalProfit: number;
  grossSales: number;
  avgMarginPct: number; // totalProfit / revenue when revenue > 0
  rank: number;
  prevRevenue: number;
  revenueDeltaPct: number;
}

export interface AnalyticsSummary {
  range: PeriodRange;
  prevRange: PeriodRange;
  totalRevenue: number;
  totalRevenuePrev: number;
  revenueDeltaPct: number;
  totalOrders: number;
  totalAgents: number;
  agentsAboveQuota: number;
  agentsOnTrack: number;
  agentsBelowQuota: number;
  attainmentAvgPct: number;
  /** Commission not yet released on orders dated in period */
  commissionLiability: number;
  /** Cash commissions paid out (commission_paid_at in selected period) */
  commissionPaid: number;
  /** Commission recognized on orders dated in selected period */
  commissionEarned: number;
  /** Σ gross profit (post-discount line totals minus variant cost of goods) */
  totalProfit: number;
  totalProfitPrev: number;
  profitDeltaPct: number;
  /** totalProfit / totalRevenue when totalRevenue > 0 */
  profitMarginPct: number;
  customersUnassigned: number;
}

export interface MonthlyTrendPoint {
  monthLabel: string;
  /** Canonical period key YYYY-MM */
  periodKey: string;
  revenue: number;
  /** Branch-level monthly quota per sales agent (carried forward as steps when unchanged) */
  quotaMonthly: number;
  /** Mean revenue per agent in analytics scope for that month */
  avgAgentRevenue: number;
}

export interface AgentAnalyticsBundle {
  summary: AnalyticsSummary;
  agents: AgentLeaderboardRow[];
  branches: BranchAnalyticsRow[];
  monthlyTrend: MonthlyTrendPoint[];
  alerts: AgentAlertRow[];
  /** Same branch filter passed into fetchAgentAnalyticsBundle (null = all branches). */
  filterBranchId: string | null;
  /**
   * When `filterBranchId` is null: per-branch collected revenue for each `monthlyTrend` month (same order / length 12).
   * Used for multi-line trends. Null when a single branch is filtered.
   */
  branchRevenueTrendLines: BranchRevenueTrendLine[] | null;
}

/** Per-branch monthly revenue series aligned with `monthlyTrend` indices (0..11). */
export interface BranchRevenueTrendLine {
  branchId: string;
  branchName: string;
  monthlyRevenue: number[];
}

/** Completed calendar month where collected revenue was below branch monthly quota. */
export interface AgentQuotaMissMonth {
  periodKey: string;
  displayLabel: string;
  quota: number;
  revenue: number;
  attainmentPct: number;
}

/** Agents with ≥1 quota miss in the lookback window (for Trends history UI). */
export interface AgentQuotaMissHistoryRow {
  agentId: string;
  employeePublicId: string;
  agentName: string;
  branchName: string | null;
  misses: AgentQuotaMissMonth[];
}

/** Distinct colors for branch bars/lines (overview + trends). */
export const BRANCH_CHART_COLORS = [
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#DB2777',
  '#0D9488',
  '#EA580C',
  '#4F46E5',
  '#65A30D',
];

export function branchChartColorAt(index: number): string {
  return BRANCH_CHART_COLORS[index % BRANCH_CHART_COLORS.length];
}

/** `/employees/:employeeId` — prefers HR `employee_id`; falls back to UUID if missing. */
export function employeeProfilePathFromAgent(employeePublicId: string, agentUuid: string): string {
  const code = employeePublicId.trim();
  return `/employees/${encodeURIComponent(code || agentUuid)}`;
}

export interface AgentAlertRow {
  id: string;
  agentId: string | null;
  type: string;
  severity: string;
  title: string;
  message: string;
  branchId: string | null;
  actionRequired: boolean;
  createdAt: string;
}

export interface QuotaHistoryRow {
  id: string;
  employeeId: string;
  period: string;
  prevMonthly: number | null;
  newMonthly: number | null;
  prevQuarterly: number | null;
  newQuarterly: number | null;
  prevStretch: string | null;
  newStretch: string | null;
  note: string | null;
  changedByEmail: string | null;
  changedByName: string | null;
  changedAt: string;
}

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

const pad2 = (n: number) => String(n).padStart(2, '0');

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Monthly quota rows (`branch_sales_targets`, `agent_targets`) use `YYYY-MM`.
 * For any analytics date range, use the month containing `range.end`.
 */
export function quotaMonthPeriodKey(range: PeriodRange): string {
  const d = new Date(range.end + 'T12:00:00');
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/**
 * Expected quota for the selected window = monthly quota × this factor (~30-day months; calendar month = 1).
 */
export function quotaAttainmentScale(range: PeriodRange): number {
  if (range.kind === 'month') return 1;
  const s = new Date(range.start + 'T12:00:00');
  const e = new Date(range.end + 'T12:00:00');
  const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  return days / 30;
}

/**
 * Carried monthly quota for `branch_id` at `periodEnd` (`YYYY-MM`), same step logic as analytics.
 * `hasSteps` is true when there is at least one `branch_sales_targets` row on or before that month.
 */
export async function fetchBranchMonthlyQuotaCarried(
  branchId: string,
  periodEnd: string,
): Promise<{ value: number; hasSteps: boolean }> {
  const { data, error } = await supabase
    .from('branch_sales_targets')
    .select('period, monthly_sales_target')
    .eq('branch_id', branchId);
  if (error || !data?.length) return { value: 0, hasSteps: false };
  const rows = (data as Record<string, unknown>[])
    .map((r) => ({
      p: String(r.period ?? '').trim(),
      m: Number(r.monthly_sales_target ?? 0),
    }))
    .filter((r) => r.p && r.p <= periodEnd);
  if (rows.length === 0) return { value: 0, hasSteps: false };
  rows.sort((a, b) => a.p.localeCompare(b.p));
  let last = 0;
  for (const r of rows) last = r.m;
  return { value: last, hasSteps: true };
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function quarterIndex(month0: number): number {
  return Math.floor(month0 / 3); // 0..3
}

function startOfQuarter(d: Date): Date {
  return new Date(d.getFullYear(), quarterIndex(d.getMonth()) * 3, 1);
}

function endOfQuarter(d: Date): Date {
  const q = quarterIndex(d.getMonth());
  return new Date(d.getFullYear(), q * 3 + 3, 0);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31);
}

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getPeriodRange(kind: PeriodKey, custom?: { start: string; end: string }): PeriodRange {
  const today = new Date();
  if (kind === 'custom' && custom) {
    return {
      start: custom.start,
      end: custom.end,
      periodLabel: `custom-${custom.start}_${custom.end}`,
      displayLabel: `${custom.start} → ${custom.end}`,
      kind: 'custom',
    };
  }
  if (kind === 'year') {
    const s = startOfYear(today);
    const e = endOfYear(today);
    return {
      start: isoDate(s),
      end: isoDate(e),
      periodLabel: `yearly-${today.getFullYear()}`,
      displayLabel: `Year ${today.getFullYear()}`,
      kind: 'year',
    };
  }
  if (kind === 'quarter') {
    const s = startOfQuarter(today);
    const e = endOfQuarter(today);
    const q = quarterIndex(today.getMonth()) + 1;
    return {
      start: isoDate(s),
      end: isoDate(e),
      periodLabel: `${today.getFullYear()}-Q${q}`,
      displayLabel: `Q${q} ${today.getFullYear()}`,
      kind: 'quarter',
    };
  }
  if (kind === 'day') {
    const d = isoDate(today);
    return {
      start: d,
      end: d,
      periodLabel: `day-${d}`,
      displayLabel: 'Today',
      kind: 'day',
    };
  }
  if (kind === 'week') {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return {
      start: isoDate(start),
      end: isoDate(end),
      periodLabel: `week-ending-${isoDate(end)}`,
      displayLabel: 'Last 7 days',
      kind: 'week',
    };
  }
  if (kind === 'sixMonths') {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    return {
      start: isoDate(start),
      end: isoDate(end),
      periodLabel: `six-${today.getFullYear()}-${pad2(today.getMonth() + 1)}`,
      displayLabel: 'Last 6 months',
      kind: 'sixMonths',
    };
  }
  if (kind === 'ytd') {
    const start = startOfYear(today);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return {
      start: isoDate(start),
      end: isoDate(end),
      periodLabel: `ytd-${today.getFullYear()}`,
      displayLabel: `YTD ${today.getFullYear()}`,
      kind: 'ytd',
    };
  }
  // default: calendar month
  const s = startOfMonth(today);
  const e = endOfMonth(today);
  return {
    start: isoDate(s),
    end: isoDate(e),
    periodLabel: `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`,
    displayLabel: `${monthLabels[today.getMonth()]} ${today.getFullYear()}`,
    kind: 'month',
  };
}

export function getPreviousPeriodRange(range: PeriodRange): PeriodRange {
  const start = new Date(range.start + 'T00:00:00');
  if (range.kind === 'year') {
    const y = start.getFullYear() - 1;
    return {
      start: `${y}-01-01`,
      end: `${y}-12-31`,
      periodLabel: `yearly-${y}`,
      displayLabel: `Year ${y}`,
      kind: 'year',
    };
  }
  if (range.kind === 'quarter') {
    const prev = new Date(start.getFullYear(), start.getMonth() - 3, 1);
    const e = endOfQuarter(prev);
    const q = quarterIndex(prev.getMonth()) + 1;
    return {
      start: isoDate(startOfQuarter(prev)),
      end: isoDate(e),
      periodLabel: `${prev.getFullYear()}-Q${q}`,
      displayLabel: `Q${q} ${prev.getFullYear()}`,
      kind: 'quarter',
    };
  }
  if (range.kind === 'custom') {
    // shift window left by its length
    const end = new Date(range.end + 'T00:00:00');
    const ms = end.getTime() - start.getTime() + 86400000;
    const prevEnd = new Date(start.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - ms + 86400000);
    return {
      start: isoDate(prevStart),
      end: isoDate(prevEnd),
      periodLabel: `custom-prev-${isoDate(prevStart)}_${isoDate(prevEnd)}`,
      displayLabel: `Prev ${isoDate(prevStart)} → ${isoDate(prevEnd)}`,
      kind: 'custom',
    };
  }
  if (range.kind === 'day') {
    const d = new Date(range.start + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const ds = isoDate(d);
    return {
      start: ds,
      end: ds,
      periodLabel: `day-${ds}`,
      displayLabel: 'Prior day',
      kind: 'day',
    };
  }
  if (range.kind === 'week') {
    const startCur = new Date(range.start + 'T00:00:00');
    const prevEnd = new Date(startCur);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    return {
      start: isoDate(prevStart),
      end: isoDate(prevEnd),
      periodLabel: `week-ending-${isoDate(prevEnd)}`,
      displayLabel: 'Prior 7 days',
      kind: 'week',
    };
  }
  if (range.kind === 'sixMonths') {
    const s = new Date(range.start + 'T00:00:00');
    const e = new Date(range.end + 'T00:00:00');
    const ps = new Date(s.getFullYear(), s.getMonth() - 6, s.getDate());
    const pe = new Date(e.getFullYear(), e.getMonth() - 6, e.getDate());
    return {
      start: isoDate(ps),
      end: isoDate(pe),
      periodLabel: `six-prev-${isoDate(ps)}`,
      displayLabel: 'Prior 6 months',
      kind: 'sixMonths',
    };
  }
  if (range.kind === 'ytd') {
    const y = new Date(range.start + 'T00:00:00').getFullYear() - 1;
    const ref = new Date();
    const endPrev = new Date(y, ref.getMonth(), ref.getDate());
    const startPrev = new Date(y, 0, 1);
    return {
      start: isoDate(startPrev),
      end: isoDate(endPrev),
      periodLabel: `ytd-${y}`,
      displayLabel: `YTD ${y}`,
      kind: 'ytd',
    };
  }
  // calendar month
  const prev = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  return {
    start: isoDate(startOfMonth(prev)),
    end: isoDate(endOfMonth(prev)),
    periodLabel: `${prev.getFullYear()}-${pad2(prev.getMonth() + 1)}`,
    displayLabel: `${monthLabels[prev.getMonth()]} ${prev.getFullYear()}`,
    kind: 'month',
  };
}

/** Days elapsed (1-based) and total days within the current period. */
export function periodPacing(range: PeriodRange, now: Date = new Date()): { elapsed: number; total: number } {
  const start = new Date(range.start + 'T00:00:00');
  const end = new Date(range.end + 'T23:59:59');
  const totalMs = end.getTime() - start.getTime();
  const total = Math.max(1, Math.round(totalMs / 86400000) + 1);
  const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - start.getTime()));
  const elapsed = Math.max(1, Math.min(total, Math.round(elapsedMs / 86400000) + 1));
  return { elapsed, total };
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatCurrencyShort(value: number): string {
  if (!Number.isFinite(value)) return '₱0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₱${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `₱${(value / 1_000).toFixed(1)}K`;
  return `₱${value.toFixed(0)}`;
}

export function formatCurrency(value: number): string {
  return `₱${Math.round(value || 0).toLocaleString()}`;
}

export function formatNumber(value: number): string {
  return Math.round(value || 0).toLocaleString();
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(digits)}%`;
}

// ---------------------------------------------------------------------------
// Core fetchers
// ---------------------------------------------------------------------------

export async function fetchBranches(): Promise<BranchOption[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('id, code, name, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) {
    console.error('[agentAnalytics] fetchBranches', error);
    return [];
  }
  return (data ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name }));
}

export async function fetchAgents(branchId?: string | null): Promise<AgentEmployee[]> {
  let q = supabase
    .from('employees')
    .select('id, employee_id, employee_name, email, branch_id, status, join_date, branches(name)')
    .eq('role', 'Sales Agent');
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q.order('employee_name');
  if (error) {
    console.error('[agentAnalytics] fetchAgents', error);
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    employeeId: String(r.employee_id ?? ''),
    name: String(r.employee_name ?? ''),
    email: String(r.email ?? ''),
    branchId: r.branch_id ? String(r.branch_id) : null,
    branchName:
      r.branches && typeof r.branches === 'object' && (r.branches as Record<string, unknown>).name
        ? String((r.branches as Record<string, unknown>).name)
        : null,
    status: String(r.status ?? 'active'),
    joinDate: r.join_date ? String(r.join_date) : null,
  }));
}

/**
 * Same attribution as Invoices & Payments (`fetchOrdersWithPaymentProofs`):
 * customer's assigned_agent_id when non-empty, else orders.agent_id.
 */
function financeAgentIdFromOrderRow(order: Record<string, unknown> | null): string | null {
  if (!order) return null;
  const cust = order.customers;
  const row = Array.isArray(cust) ? cust[0] : cust;
  if (row && typeof row === 'object') {
    const aid = (row as Record<string, unknown>).assigned_agent_id;
    if (aid != null && String(aid).trim() !== '') return String(aid).trim();
  }
  const direct = order.agent_id;
  if (direct != null && String(direct).trim() !== '') return String(direct).trim();
  return null;
}

function clientTypeFromOrderCustomersEmbed(order: Record<string, unknown> | null): string {
  if (!order) return 'Office';
  const cust = order.customers;
  const row = Array.isArray(cust) ? cust[0] : cust;
  if (row && typeof row === 'object') {
    const raw = String((row as Record<string, unknown>).client_type ?? 'Office');
    return raw === 'Personal' ? 'Personal' : 'Office';
  }
  return 'Office';
}

/** Prefer order.agent_id; fall back to customer's assigned sales agent. */
function resolvedOrderAgentId(raw: Record<string, unknown>): string | null {
  const direct = raw.agent_id;
  if (direct != null && String(direct).trim() !== '') return String(direct);
  const cust = raw.customers;
  const row = Array.isArray(cust) ? cust[0] : cust;
  if (row && typeof row === 'object') {
    const aid = (row as Record<string, unknown>).assigned_agent_id;
    if (aid != null && String(aid).trim() !== '') return String(aid);
  }
  return null;
}

/**
 * KPI revenue: cash recorded on the order when amount_paid &gt; 0; otherwise order total.
 * (Many deployments only maintain total_amount until finance posts payments.)
 */
function effectiveOrderCollected(raw: Record<string, unknown>): number {
  const paid = Number(raw.amount_paid ?? 0);
  const gross = Number(raw.total_amount ?? 0);
  return paid > 0 ? paid : gross;
}

async function fetchRevenueRows(start: string, end: string): Promise<AgentRevenueRow[]> {
  type Bucket = AgentRevenueRow & { _customers: Set<string> };
  const buckets = new Map<string, Bucket>();
  let page = 0;
  const pageSize = 500;

  while (true) {
    const { data, error } = await supabase
      .from('orders')
      .select(
        'agent_id, agent_name, branch_id, order_date, total_amount, amount_paid, balance_due, discount_percent, customer_id, payment_status, status, customers(assigned_agent_id)',
      )
      .gte('order_date', start)
      .lte('order_date', end)
      .not('status', 'in', '("Cancelled","Rejected","Draft")')
      .order('order_date', { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (error) {
      console.error('[agentAnalytics] fetchRevenueRows', error);
      break;
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) break;

    for (const raw of rows) {
      const agentId = resolvedOrderAgentId(raw);
      if (!agentId) continue;

      const orderDate = new Date(String(raw.order_date));
      const year = orderDate.getFullYear();
      const month = orderDate.getMonth() + 1;
      const key = `${agentId}|${year}|${month}`;
      const cur =
        buckets.get(key) ??
        ({
          agentId,
          agentName: String(raw.agent_name ?? ''),
          branchId: raw.branch_id ? String(raw.branch_id) : null,
          year,
          month,
          orderCount: 0,
          revenue: 0,
          grossSales: 0,
          amountPaid: 0,
          balanceDue: 0,
          avgDiscountPercent: 0,
          distinctCustomers: 0,
          overdueOrders: 0,
          overdueBalance: 0,
          _customers: new Set<string>(),
        } as Bucket);

      cur.orderCount += 1;
      const gross = Number(raw.total_amount ?? 0);
      const paidRecorded = Number(raw.amount_paid ?? 0);
      cur.revenue += effectiveOrderCollected(raw);
      cur.grossSales += gross;
      cur.amountPaid += paidRecorded;
      cur.balanceDue += Number(raw.balance_due ?? 0);
      const disc = Number(raw.discount_percent ?? 0);
      if (disc > 0) {
        cur.avgDiscountPercent =
          ((cur.avgDiscountPercent * (cur.orderCount - 1)) + disc) / cur.orderCount;
      }
      if (raw.customer_id) cur._customers.add(String(raw.customer_id));
      if (raw.payment_status === 'Overdue') {
        cur.overdueOrders += 1;
        cur.overdueBalance += Number(raw.balance_due ?? 0);
      }
      buckets.set(key, cur);
    }

    if (rows.length < pageSize) break;
    page += 1;
  }

  return Array.from(buckets.values()).map(({ _customers, ...rest }) => ({
    ...rest,
    distinctCustomers: _customers.size,
  }));
}

type BranchTargetCell = { monthly: number; quarterly: number; stretch: string | null };

/**
 * Demo quota steps — keep in sync with `database/seed_branch_sales_targets_history.sql`.
 * Used only when Supabase returns no `branch_sales_targets` rows (empty DB, RLS, or network).
 */
const DEMO_BRANCH_SALES_TARGETS_BY_CODE: Record<
  string,
  Array<{ period: string; monthly: number; quarterly: number; stretch: string | null }>
> = {
  MNL: [
    { period: '2025-06', monthly: 850_000, quarterly: 2_550_000, stretch: '110% of monthly target' },
    { period: '2025-09', monthly: 1_000_000, quarterly: 3_000_000, stretch: '110% of monthly target' },
    { period: '2026-01', monthly: 1_150_000, quarterly: 3_450_000, stretch: '115% of monthly target' },
    { period: '2026-04', monthly: 1_080_000, quarterly: 3_240_000, stretch: '115% of monthly target' },
  ],
  CEB: [
    { period: '2025-06', monthly: 720_000, quarterly: 2_160_000, stretch: '110% of monthly target' },
    { period: '2025-08', monthly: 880_000, quarterly: 2_640_000, stretch: '110% of monthly target' },
    { period: '2025-12', monthly: 770_000, quarterly: 2_310_000, stretch: '110% of monthly target' },
    { period: '2026-03', monthly: 920_000, quarterly: 2_760_000, stretch: '115% of monthly target' },
  ],
  BTG: [
    { period: '2025-06', monthly: 680_000, quarterly: 2_040_000, stretch: '110% of monthly target' },
    { period: '2025-11', monthly: 790_000, quarterly: 2_370_000, stretch: '110% of monthly target' },
    { period: '2026-02', monthly: 910_000, quarterly: 2_730_000, stretch: '115% of monthly target' },
  ],
  QZN: [
    { period: '2025-06', monthly: 600_000, quarterly: 1_800_000, stretch: '110% of monthly target' },
    { period: '2025-10', monthly: 750_000, quarterly: 2_250_000, stretch: '110% of monthly target' },
    { period: '2026-03', monthly: 820_000, quarterly: 2_460_000, stretch: '115% of monthly target' },
  ],
};

/**
 * Demo carried monthly quota by branch code when `branch_sales_targets` is empty — mirrors
 * `database/seed_branch_sales_targets_history.sql`.
 */
export function demoBranchMonthlyCarried(branchCode: string | null | undefined, periodEnd: string): number {
  if (!branchCode?.trim()) return 0;
  const code = branchCode.trim().toUpperCase();
  const steps = DEMO_BRANCH_SALES_TARGETS_BY_CODE[code];
  if (!steps?.length) return 0;
  const end = periodEnd.trim();
  const sorted = steps.filter((s) => s.period <= end).sort((a, b) => a.period.localeCompare(b.period));
  let last = 0;
  for (const s of sorted) last = s.monthly;
  return last;
}

function buildDemoBranchTargetsFlat(branches: BranchOption[]): Map<string, BranchTargetCell> {
  const map = new Map<string, BranchTargetCell>();
  for (const b of branches) {
    const rows = DEMO_BRANCH_SALES_TARGETS_BY_CODE[b.code.trim().toUpperCase()] ?? DEMO_BRANCH_SALES_TARGETS_BY_CODE[b.code];
    if (!rows) continue;
    for (const r of rows) {
      map.set(`${b.id}|${r.period}`, {
        monthly: r.monthly,
        quarterly: r.quarterly,
        stretch: r.stretch,
      });
    }
  }
  return map;
}

/** Paginated load of all branch quota rows (avoids `.in(branch_id, …)` mismatches and Supabase row caps). */
async function fetchAllBranchSalesTargets(): Promise<Map<string, BranchTargetCell>> {
  const map = new Map<string, BranchTargetCell>();
  const pageSize = 500;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('branch_sales_targets')
      .select('branch_id, period, monthly_sales_target, quarterly_sales_target, stretch_goal_status')
      .order('branch_id', { ascending: true })
      .order('period', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.warn('[agentAnalytics] fetchAllBranchSalesTargets', error);
      break;
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    for (const r of rows) {
      const bid = String(r.branch_id ?? '').trim();
      const period = String(r.period ?? '').trim();
      if (!bid || !period) continue;
      map.set(`${bid}|${period}`, {
        monthly: Number(r.monthly_sales_target ?? 0),
        quarterly: Number(r.quarterly_sales_target ?? 0),
        stretch: r.stretch_goal_status ? String(r.stretch_goal_status) : null,
      });
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

function nestBranchTargetsByBranch(
  flat: Map<string, BranchTargetCell>,
): Map<string, Map<string, BranchTargetCell>> {
  const out = new Map<string, Map<string, BranchTargetCell>>();
  for (const [k, v] of flat) {
    const pipe = k.indexOf('|');
    if (pipe < 0) continue;
    const bid = k.slice(0, pipe);
    const period = k.slice(pipe + 1);
    if (!out.has(bid)) out.set(bid, new Map());
    out.get(bid)!.set(period, v);
  }
  return out;
}

/** Branch quota steps forward by calendar month (`YYYY-MM`); value holds until a newer row replaces it. */
function branchQuotaCarriedToPeriod(
  branchId: string,
  periodEnd: string,
  byBranch: Map<string, Map<string, BranchTargetCell>>,
): BranchTargetCell {
  const inner = byBranch.get(branchId);
  if (!inner || inner.size === 0) {
    return { monthly: 0, quarterly: 0, stretch: null };
  }
  const sorted = [...inner.keys()].filter((k) => k <= periodEnd).sort();
  let last: BranchTargetCell = { monthly: 0, quarterly: 0, stretch: null };
  for (const p of sorted) {
    const cell = inner.get(p);
    if (cell !== undefined) {
      last = {
        monthly: cell.monthly,
        quarterly: cell.quarterly,
        stretch: cell.stretch,
      };
    }
  }
  return last;
}

/** Step-style monthly quota: value holds until a row exists for a later month with a new amount. */
function carriedMonthlySeriesForBranch(
  branchId: string,
  orderedPeriods: string[],
  byBranch: Map<string, Map<string, BranchTargetCell>>,
): number[] {
  const inner = byBranch.get(branchId);
  let last = 0;
  const first = orderedPeriods[0];
  if (inner && first !== undefined) {
    for (const p of [...inner.keys()].filter((k) => k < first).sort()) {
      const cell = inner.get(p);
      if (cell !== undefined) last = cell.monthly;
    }
  }
  return orderedPeriods.map((p) => {
    const cell = inner?.get(p);
    if (cell !== undefined) last = cell.monthly;
    return last;
  });
}

/**
 * When no sales agents have `branch_id`, still plot quotas: mean carried monthly target across branches
 * that have rows in `branch_sales_targets`.
 */
function meanBranchQuotaSeriesAcrossBranches(
  orderedPeriods: string[],
  byBranch: Map<string, Map<string, BranchTargetCell>>,
): number[] {
  const branchIds = [...byBranch.keys()];
  if (branchIds.length === 0) return orderedPeriods.map(() => 0);
  const perBranch = branchIds.map((bid) =>
    carriedMonthlySeriesForBranch(bid, orderedPeriods, byBranch),
  );
  return orderedPeriods.map((_, i) => {
    let sum = 0;
    for (const series of perBranch) sum += series[i] ?? 0;
    return sum / branchIds.length;
  });
}

/** Workforce-weighted average of per-branch carried quotas (all-branches view). */
function weightedQuotaMonthlySeries(
  orderedPeriods: string[],
  agents: AgentEmployee[],
  byBranch: Map<string, Map<string, BranchTargetCell>>,
): number[] {
  const branchIds = [...new Set(agents.map((a) => a.branchId).filter(Boolean))] as string[];
  if (branchIds.length === 0) {
    return meanBranchQuotaSeriesAcrossBranches(orderedPeriods, byBranch);
  }
  const countByBranch = new Map<string, number>();
  for (const a of agents) {
    if (!a.branchId) continue;
    countByBranch.set(a.branchId, (countByBranch.get(a.branchId) ?? 0) + 1);
  }
  const carriedByBranch = new Map<string, number[]>();
  for (const bid of branchIds) {
    carriedByBranch.set(bid, carriedMonthlySeriesForBranch(bid, orderedPeriods, byBranch));
  }
  const fallback = meanBranchQuotaSeriesAcrossBranches(orderedPeriods, byBranch);
  return orderedPeriods.map((_, i) => {
    let num = 0;
    let den = 0;
    for (const bid of branchIds) {
      const n = countByBranch.get(bid) ?? 0;
      if (n === 0) continue;
      const q = carriedByBranch.get(bid)?.[i] ?? 0;
      num += q * n;
      den += n;
    }
    if (den === 0) return fallback[i] ?? 0;
    const weighted = num / den;
    if (weighted > 0) return weighted;
    return fallback[i] ?? 0;
  });
}

const QUOTA_MISS_HISTORY_MONTHS_DEFAULT = 12;

/**
 * Per-agent quota misses over completed calendar months: compares KPI revenue (same as leaderboard)
 * to branch carried monthly quota (`branch_sales_targets` steps) for the agent's current branch.
 * Excludes the current month (only closed months). Respects `branchId` filter like analytics.
 */
export async function fetchAgentQuotaMissHistory(opts: {
  branchId?: string | null;
  months?: number;
}): Promise<AgentQuotaMissHistoryRow[]> {
  const months = opts.months ?? QUOTA_MISS_HISTORY_MONTHS_DEFAULT;
  const branchFilter = opts.branchId ?? null;

  const [agents, branches] = await Promise.all([fetchAgents(branchFilter), fetchBranches()]);
  const branchesById = new Map(branches.map((b) => [b.id, b]));

  let branchTargetsFlat = await fetchAllBranchSalesTargets();
  if (branchTargetsFlat.size === 0 && branches.length > 0) {
    branchTargetsFlat = buildDemoBranchTargetsFlat(branches);
  }
  const branchNest = nestBranchTargetsByBranch(branchTargetsFlat);

  const today = new Date();
  const periodKeys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - 1 - i, 1);
    periodKeys.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  }
  if (periodKeys.length === 0) return [];

  const periodKeySet = new Set(periodKeys);
  const first = periodKeys[0];
  const last = periodKeys[periodKeys.length - 1];
  const rangeStart = `${first}-01`;
  const [ly, lm] = last.split('-').map(Number);
  const rangeEnd = isoDate(new Date(ly, lm, 0));

  const revRows = await fetchRevenueRows(rangeStart, rangeEnd);
  const revenueMap = new Map<string, number>();
  for (const r of revRows) {
    if (branchFilter && r.branchId !== branchFilter) continue;
    const pk = `${r.year}-${pad2(r.month)}`;
    if (!periodKeySet.has(pk)) continue;
    const key = `${r.agentId}|${pk}`;
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + r.revenue);
  }

  const rowsOut: AgentQuotaMissHistoryRow[] = [];
  for (const a of agents) {
    if (!a.branchId) continue;
    const misses: AgentQuotaMissMonth[] = [];
    for (const pk of periodKeys) {
      const carried = branchQuotaCarriedToPeriod(a.branchId, pk, branchNest);
      const quota = carried.monthly;
      if (quota <= 0) continue;
      const rev = revenueMap.get(`${a.id}|${pk}`) ?? 0;
      if (rev < quota) {
        const [ys, ms] = pk.split('-').map(Number);
        const displayLabel = `${monthLabels[ms - 1]} '${String(ys).slice(2)}`;
        misses.push({
          periodKey: pk,
          displayLabel,
          quota,
          revenue: rev,
          attainmentPct: (rev / quota) * 100,
        });
      }
    }
    if (misses.length > 0) {
      misses.sort((x, y) => y.periodKey.localeCompare(x.periodKey));
      rowsOut.push({
        agentId: a.id,
        employeePublicId: a.employeeId.trim(),
        agentName: a.name,
        branchName: a.branchName ?? branchesById.get(a.branchId)?.name ?? null,
        misses,
      });
    }
  }

  rowsOut.sort((a, b) => {
    const aRecent = a.misses[0]?.periodKey ?? '';
    const bRecent = b.misses[0]?.periodKey ?? '';
    if (aRecent !== bRecent) return bRecent.localeCompare(aRecent);
    return b.misses.length - a.misses.length;
  });
  return rowsOut;
}

/**
 * Commission from cash payment proofs (Office / Personal rates), aligned with Invoices & Payments.
 * Earned = eligible commission on proofs for orders whose order_date falls in [start,end].
 * releasedOnOrders = subset of that earned amount where commission_paid_at is set (any payout date).
 */
async function fetchProofCommissionsByAgentForOrderPeriod(
  start: string,
  end: string,
  branchFilter: string | null,
): Promise<Map<string, { earned: number; releasedOnOrders: number }>> {
  const map = new Map<string, { earned: number; releasedOnOrders: number }>();
  const orderIds: string[] = [];
  let opage = 0;
  const pageSize = 500;

  while (true) {
    let q = supabase
      .from('orders')
      .select('id')
      .gte('order_date', start)
      .lte('order_date', end)
      .not('status', 'in', '("Cancelled","Rejected","Draft")')
      .order('order_date', { ascending: true })
      .order('id', { ascending: true });
    if (branchFilter) q = q.eq('branch_id', branchFilter);
    const { data, error } = await q.range(opage * pageSize, opage * pageSize + pageSize - 1);
    if (error) {
      console.error('[agentAnalytics] fetchProofCommissions order ids', error);
      break;
    }
    const rows = data ?? [];
    if (rows.length === 0) break;
    for (const r of rows as { id: string }[]) {
      orderIds.push(String(r.id));
    }
    if (rows.length < pageSize) break;
    opage += 1;
  }

  if (orderIds.length === 0) return map;

  const chunkSize = 100;
  for (let i = 0; i < orderIds.length; i += chunkSize) {
    const chunk = orderIds.slice(i, i + chunkSize);

    // Load order rows separately — nested `orders(...)` on proofs often returns null under RLS/embed limits.
    const orderById = new Map<string, Record<string, unknown>>();
    const { data: orderRows, error: orderErr } = await supabase
      .from('orders')
      .select('id, branch_id, agent_id, customers(assigned_agent_id, client_type)')
      .in('id', chunk);
    if (orderErr) {
      console.warn('[agentAnalytics] fetchProofCommissions orders embed', orderErr);
    } else {
      for (const o of (orderRows ?? []) as Record<string, unknown>[]) {
        orderById.set(String(o.id ?? ''), o);
      }
    }

    const { data, error } = await supabase
      .from('order_proof_documents')
      .select(
        `id, order_id, payment_cash_amount, payment_credit_amount, payment_adjustment, notes, commission_paid_at`,
      )
      .eq('type', 'payment')
      .in('order_id', chunk);

    if (error) {
      console.warn('[agentAnalytics] fetchProofCommissions proofs', error);
      continue;
    }

    for (const raw of (data ?? []) as Record<string, unknown>[]) {
      const id = String(raw.id ?? '');
      const notes = raw.notes != null ? String(raw.notes) : null;
      const lite = {
        id,
        type: 'payment',
        payment_cash_amount: raw.payment_cash_amount,
        payment_credit_amount: raw.payment_credit_amount,
        payment_adjustment: raw.payment_adjustment,
        notes,
      };
      if (!proofRequiresCommissionPayout(lite)) continue;

      const ord = orderById.get(String(raw.order_id ?? '')) ?? null;
      if (branchFilter && ord && String(ord.branch_id ?? '') !== branchFilter) continue;

      const agentId = financeAgentIdFromOrderRow(ord);
      if (!agentId) continue;

      const cash = proofCashAmount(lite);
      const clientType = clientTypeFromOrderCustomersEmbed(ord);
      const commission = computeProofCommissionForClientType(cash, clientType);
      if (commission <= 0) continue;

      const cur = map.get(agentId) ?? { earned: 0, releasedOnOrders: 0 };
      cur.earned += commission;
      if (raw.commission_paid_at != null && String(raw.commission_paid_at).trim() !== '') {
        cur.releasedOnOrders += commission;
      }
      map.set(agentId, cur);
    }
  }

  return map;
}

/**
 * Cash commissions actually paid out (commission_paid_at) within [start,end], attributed by finance agent rule.
 * Matches executive “mark commission paid” timestamps — independent of order_date so payouts show in the month released.
 */
async function fetchProofCommissionsPaidOutByPayoutPeriod(
  start: string,
  end: string,
  branchFilter: string | null,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const startIso = `${start}T00:00:00.000Z`;
  const endIso = `${end}T23:59:59.999Z`;
  let page = 0;
  const pageSize = 400;

  while (true) {
    const { data, error } = await supabase
      .from('order_proof_documents')
      .select(
        `id, order_id, payment_cash_amount, payment_credit_amount, payment_adjustment, notes, commission_paid_at`,
      )
      .eq('type', 'payment')
      .not('commission_paid_at', 'is', null)
      .gte('commission_paid_at', startIso)
      .lte('commission_paid_at', endIso)
      .order('commission_paid_at', { ascending: true })
      .order('id', { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (error) {
      console.warn('[agentAnalytics] fetchProofCommissions payout-period proofs', error);
      break;
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) break;

    const orderIds = [...new Set(rows.map((r) => String(r.order_id ?? '')))];
    const orderById = new Map<string, Record<string, unknown>>();
    const chunkSz = 120;
    for (let j = 0; j < orderIds.length; j += chunkSz) {
      const slice = orderIds.slice(j, j + chunkSz);
      const { data: orderRows, error: orderErr } = await supabase
        .from('orders')
        .select('id, branch_id, agent_id, customers(assigned_agent_id, client_type)')
        .in('id', slice);
      if (orderErr) {
        console.warn('[agentAnalytics] fetchProofCommissions payout-period orders', orderErr);
        continue;
      }
      for (const o of (orderRows ?? []) as Record<string, unknown>[]) {
        orderById.set(String(o.id ?? ''), o);
      }
    }

    for (const raw of rows) {
      const id = String(raw.id ?? '');
      const notes = raw.notes != null ? String(raw.notes) : null;
      const lite = {
        id,
        type: 'payment',
        payment_cash_amount: raw.payment_cash_amount,
        payment_credit_amount: raw.payment_credit_amount,
        payment_adjustment: raw.payment_adjustment,
        notes,
      };
      if (!proofRequiresCommissionPayout(lite)) continue;

      const ord = orderById.get(String(raw.order_id ?? '')) ?? null;
      if (!ord) continue;
      if (branchFilter && String(ord.branch_id ?? '') !== branchFilter) continue;

      const agentId = financeAgentIdFromOrderRow(ord);
      if (!agentId) continue;

      const cash = proofCashAmount(lite);
      const clientType = clientTypeFromOrderCustomersEmbed(ord);
      const commission = computeProofCommissionForClientType(cash, clientType);
      if (commission <= 0) continue;

      map.set(agentId, (map.get(agentId) ?? 0) + commission);
    }

    if (rows.length < pageSize) break;
    page += 1;
  }

  return map;
}

async function fetchNewCustomersByAgent(start: string, end: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data, error } = await supabase
    .from('customers')
    .select('id, assigned_agent_id, created_at')
    .gte('created_at', start)
    .lte('created_at', end + 'T23:59:59');
  if (error) {
    return map;
  }
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const id = r.assigned_agent_id ? String(r.assigned_agent_id) : '';
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

async function fetchActiveAlerts(): Promise<AgentAlertRow[]> {
  const { data, error } = await supabase
    .from('agent_alerts')
    .select('id, agent_id, type, severity, title, message, branch_id, action_required, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.warn('[agentAnalytics] fetchActiveAlerts', error);
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    agentId: r.agent_id ? String(r.agent_id) : null,
    type: String(r.type ?? ''),
    severity: String(r.severity ?? 'Medium'),
    title: String(r.title ?? ''),
    message: String(r.message ?? ''),
    branchId: r.branch_id ? String(r.branch_id) : null,
    actionRequired: Boolean(r.action_required),
    createdAt: String(r.created_at ?? ''),
  }));
}

async function countUnassignedCustomers(): Promise<number> {
  const { count, error } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .is('assigned_agent_id', null);
  if (error) {
    return 0;
  }
  return count ?? 0;
}

/**
 * Gross profit per agent: Σ(line_total − qty × variant.cost_price).
 * `line_total` is after discounts; cost uses `product_variants.cost_price` (production cost).
 */
async function fetchAgentProfitByAgent(
  start: string,
  end: string,
  branchFilter: string | null,
): Promise<Map<string, number>> {
  const profitByAgent = new Map<string, number>();
  const variantIds = new Set<string>();

  type OrderRow = {
    agent_id: string | null;
    branch_id: string | null;
    customers: { assigned_agent_id: string | null } | Array<{ assigned_agent_id: string | null }> | null;
    order_line_items:
      | Array<{ quantity: number | null; line_total: number | null; variant_id: string | null }>
      | null;
  };

  const resolveProfitAgentId = (o: OrderRow): string | null => {
    if (o.agent_id != null && String(o.agent_id).trim() !== '') return String(o.agent_id);
    const c = o.customers;
    const row = Array.isArray(c) ? c[0] : c;
    if (row?.assigned_agent_id != null && String(row.assigned_agent_id).trim() !== '') {
      return String(row.assigned_agent_id);
    }
    return null;
  };

  const allOrders: OrderRow[] = [];
  let page = 0;
  const pageSize = 500;

  while (true) {
    let q = supabase
      .from('orders')
      .select(
        'agent_id, branch_id, customers(assigned_agent_id), order_line_items(quantity, line_total, variant_id)',
      )
      .gte('order_date', start)
      .lte('order_date', end)
      .not('status', 'in', '("Cancelled","Rejected","Draft")')
      .order('order_date', { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (branchFilter) q = q.eq('branch_id', branchFilter);

    const { data, error } = await q;
    if (error) {
      console.error('[agentAnalytics] fetchAgentProfitByAgent orders', error);
      break;
    }

    const rows = (data ?? []) as OrderRow[];
    if (rows.length === 0) break;

    allOrders.push(...rows);

    for (const o of rows) {
      const lines = Array.isArray(o.order_line_items) ? o.order_line_items : [];
      for (const li of lines) {
        const vid = li.variant_id ? String(li.variant_id) : '';
        if (vid) variantIds.add(vid);
      }
    }

    if (rows.length < pageSize) break;
    page += 1;
  }

  const costByVariant = new Map<string, number>();
  const vidArr = Array.from(variantIds);
  const chunk = 200;
  for (let i = 0; i < vidArr.length; i += chunk) {
    const slice = vidArr.slice(i, i + chunk);
    if (slice.length === 0) continue;
    const { data: pv, error: pvErr } = await supabase
      .from('product_variants')
      .select('id, cost_price')
      .in('id', slice);
    if (pvErr) {
      console.warn('[agentAnalytics] fetchAgentProfitByAgent variants', pvErr);
      continue;
    }
    for (const r of (pv ?? []) as Record<string, unknown>[]) {
      costByVariant.set(String(r.id), Number(r.cost_price ?? 0));
    }
  }

  for (const o of allOrders) {
    const agentId = resolveProfitAgentId(o);
    if (!agentId) continue;
    const lines = Array.isArray(o.order_line_items) ? o.order_line_items : [];
    let orderProfit = 0;
    for (const li of lines) {
      const qty = Number(li.quantity ?? 0);
      const lineTotal = Number(li.line_total ?? 0);
      const vid = li.variant_id ? String(li.variant_id) : '';
      const unitCost = vid ? costByVariant.get(vid) ?? 0 : 0;
      orderProfit += lineTotal - qty * unitCost;
    }
    profitByAgent.set(agentId, (profitByAgent.get(agentId) ?? 0) + orderProfit);
  }

  return profitByAgent;
}

// ---------------------------------------------------------------------------
// Main aggregator
// ---------------------------------------------------------------------------

export async function fetchAgentAnalyticsBundle(opts: {
  range: PeriodRange;
  branchId?: string | null;
}): Promise<AgentAnalyticsBundle> {
  const { range } = opts;
  const branchFilter = opts.branchId ?? null;
  const prevRange = getPreviousPeriodRange(range);
  const { elapsed, total } = periodPacing(range);
  const expectedRatio = elapsed / total;
  const quotaMonthKey = quotaMonthPeriodKey(range);

  const [
    agents,
    branches,
    currentRows,
    prevRows,
    commissionsOrderPeriod,
    commissionsPaidOutPeriod,
    newCustomers,
    alerts,
    unassigned,
    profitByAgent,
    profitPrevByAgent,
  ] = await Promise.all([
    fetchAgents(branchFilter),
    fetchBranches(),
    fetchRevenueRows(range.start, range.end),
    fetchRevenueRows(prevRange.start, prevRange.end),
    fetchProofCommissionsByAgentForOrderPeriod(range.start, range.end, branchFilter),
    fetchProofCommissionsPaidOutByPayoutPeriod(range.start, range.end, branchFilter),
    fetchNewCustomersByAgent(range.start, range.end),
    fetchActiveAlerts(),
    countUnassignedCustomers(),
    fetchAgentProfitByAgent(range.start, range.end, branchFilter),
    fetchAgentProfitByAgent(prevRange.start, prevRange.end, branchFilter),
  ]);

  const branchesById = new Map(branches.map((b) => [b.id, b]));

  const today = new Date();
  const trendStart = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const trendPeriodKeys: string[] = [];
  for (let ti = 0; ti < 12; ti++) {
    const dKey = new Date(trendStart.getFullYear(), trendStart.getMonth() + ti, 1);
    trendPeriodKeys.push(`${dKey.getFullYear()}-${pad2(dKey.getMonth() + 1)}`);
  }
  let branchTargetsFlat = await fetchAllBranchSalesTargets();
  if (branchTargetsFlat.size === 0 && branches.length > 0) {
    branchTargetsFlat = buildDemoBranchTargetsFlat(branches);
  }
  const branchNest = nestBranchTargetsByBranch(branchTargetsFlat);

  // Aggregate revenue rows per agent
  type Agg = AgentRevenueRow;
  const aggCurrent = new Map<string, Agg>();
  const aggPrev = new Map<string, number>();

  for (const r of currentRows) {
    if (branchFilter && r.branchId !== branchFilter) continue;
    const cur = aggCurrent.get(r.agentId) ?? {
      ...r,
      orderCount: 0,
      revenue: 0,
      grossSales: 0,
      amountPaid: 0,
      balanceDue: 0,
      avgDiscountPercent: 0,
      distinctCustomers: 0,
      overdueOrders: 0,
      overdueBalance: 0,
    };
    cur.orderCount += r.orderCount;
    cur.revenue += r.revenue;
    cur.grossSales += r.grossSales;
    cur.amountPaid += r.amountPaid;
    cur.balanceDue += r.balanceDue;
    cur.avgDiscountPercent =
      cur.grossSales > 0
        ? (cur.avgDiscountPercent * (cur.grossSales - r.grossSales) +
            r.avgDiscountPercent * r.grossSales) /
          Math.max(1e-9, cur.grossSales)
        : r.avgDiscountPercent;
    cur.distinctCustomers = Math.max(cur.distinctCustomers, r.distinctCustomers);
    cur.overdueOrders += r.overdueOrders;
    cur.overdueBalance += r.overdueBalance;
    aggCurrent.set(r.agentId, cur);
  }
  for (const r of prevRows) {
    if (branchFilter && r.branchId !== branchFilter) continue;
    aggPrev.set(r.agentId, (aggPrev.get(r.agentId) ?? 0) + r.revenue);
  }

  // Build leaderboard rows (one per agent in scope)
  const attainmentScale = quotaAttainmentScale(range);
  const rows: AgentLeaderboardRow[] = agents.map((a) => {
    const cur = aggCurrent.get(a.id);
    const carried = a.branchId ? branchQuotaCarriedToPeriod(a.branchId, quotaMonthKey, branchNest) : null;
    const monthlyTarget = carried?.monthly ?? 0;
    const quarterlyTarget = carried?.quarterly ?? 0;
    const effectiveTarget = monthlyTarget > 0 ? monthlyTarget * attainmentScale : 0;

    const revenue = cur?.revenue ?? 0;
    const orderCount = cur?.orderCount ?? 0;
    const aov = orderCount > 0 ? revenue / orderCount : 0;
    const gs = cur?.grossSales ?? 0;
    const collectionRate = gs > 0 ? Math.min(100, ((cur?.revenue ?? 0) / gs) * 100) : 0;
    const attainmentPct = effectiveTarget > 0 ? (revenue / effectiveTarget) * 100 : 0;
    const expectedRevenueToDate = effectiveTarget * expectedRatio;
    const expectedAttainment = expectedRatio * 100;
    const pacingPct =
      expectedAttainment > 0 ? (attainmentPct / expectedAttainment) * 100 : 0;
    const revenueGap = effectiveTarget - revenue;

    const prev = aggPrev.get(a.id) ?? 0;
    const revenueDeltaPct = prev > 0 ? ((revenue - prev) / prev) * 100 : revenue > 0 ? 100 : 0;
    const com = commissionsOrderPeriod.get(a.id);
    const paidOut = commissionsPaidOutPeriod.get(a.id) ?? 0;

    return {
      agentId: a.id,
      employeePublicId: a.employeeId.trim(),
      agentName: a.name,
      branchId: a.branchId,
      branchName: a.branchName ?? (a.branchId ? branchesById.get(a.branchId)?.name ?? null : null),

      revenue,
      grossSales: cur?.grossSales ?? 0,
      orderCount,
      averageOrderValue: aov,
      amountPaid: cur?.amountPaid ?? 0,
      balanceDue: cur?.balanceDue ?? 0,
      avgDiscountPercent: cur?.avgDiscountPercent ?? 0,
      collectionRate,
      distinctCustomers: cur?.distinctCustomers ?? 0,
      newCustomers: newCustomers.get(a.id) ?? 0,
      overdueOrders: cur?.overdueOrders ?? 0,
      overdueBalance: cur?.overdueBalance ?? 0,

      monthlyTarget,
      quarterlyTarget,
      effectiveTarget,
      attainmentPct,
      pacingPct,
      expectedRevenueToDate,
      revenueGap,
      stretchGoal: carried?.stretch ?? null,

      commissionEarned: com?.earned ?? 0,
      commissionPaid: paidOut,
      commissionAccrued: Math.max(0, (com?.earned ?? 0) - (com?.releasedOnOrders ?? 0)),

      prevRevenue: prev,
      revenueDeltaPct,

      profit: profitByAgent.get(a.id) ?? 0,
    };
  });

  // Branch rollup (only branches with agents in scope)
  const branchAgg = new Map<string, BranchAnalyticsRow>();
  for (const row of rows) {
    if (!row.branchId) continue;
    const meta = branchesById.get(row.branchId);
    if (!meta) continue;
    const cur = branchAgg.get(row.branchId) ?? {
      branchId: row.branchId,
      branchName: row.branchName ?? meta.name,
      branchCode: meta.code,
      agentCount: 0,
      revenue: 0,
      grossSales: 0,
      totalProfit: 0,
      orderCount: 0,
      averageOrderValue: 0,
      attainmentPct: 0,
      totalTarget: 0,
      collectionRate: 0,
      outstanding: 0,
      avgMarginPct: 0,
      rank: 0,
      prevRevenue: 0,
      revenueDeltaPct: 0,
    };
    cur.agentCount += 1;
    cur.revenue += row.revenue;
    cur.grossSales += row.grossSales;
    cur.totalProfit += row.profit;
    cur.orderCount += row.orderCount;
    cur.totalTarget += row.effectiveTarget;
    cur.outstanding += row.balanceDue;
    cur.prevRevenue += row.prevRevenue;
    branchAgg.set(row.branchId, cur);
  }
  const branchesArr = Array.from(branchAgg.values()).map((b) => ({
    ...b,
    averageOrderValue: b.orderCount > 0 ? b.revenue / b.orderCount : 0,
    attainmentPct: b.totalTarget > 0 ? (b.revenue / b.totalTarget) * 100 : 0,
    avgMarginPct: b.revenue > 0 ? (b.totalProfit / b.revenue) * 100 : 0,
    collectionRate:
      b.grossSales > 0 ? Math.min(100, (b.revenue / b.grossSales) * 100) : 0,
    revenueDeltaPct:
      b.prevRevenue > 0 ? ((b.revenue - b.prevRevenue) / b.prevRevenue) * 100 : 0,
  }));
  branchesArr.sort((a, b) => b.revenue - a.revenue);
  branchesArr.forEach((b, i) => (b.rank = i + 1));

  // Trend: last 12 months — branch quota (step), collected revenue, avg revenue per agent
  const monthlyTrend: MonthlyTrendPoint[] = [];
  const trendRows = await fetchRevenueRows(isoDate(trendStart), isoDate(endOfMonth(today)));
  const targetSumByPeriod = await fetchAggregateTargetsForTrend(trendStart, today, branchFilter, agents);
  const hasBranchQuotaRows = branchTargetsFlat.size > 0;
  const quotaSeries = branchFilter
    ? carriedMonthlySeriesForBranch(branchFilter, trendPeriodKeys, branchNest)
    : weightedQuotaMonthlySeries(trendPeriodKeys, agents, branchNest);
  const agentDen = agents.length;

  for (let i = 0; i < 12; i++) {
    const d = new Date(trendStart.getFullYear(), trendStart.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const pk = `${y}-${pad2(m)}`;
    const sum = trendRows
      .filter((r) => r.year === y && r.month === m && (!branchFilter || r.branchId === branchFilter))
      .reduce((acc, r) => acc + r.revenue, 0);
    const legacyAvgPerAgent =
      agentDen > 0 ? (targetSumByPeriod.get(pk) ?? 0) / agentDen : 0;
    let quotaMonthly = quotaSeries[i] ?? 0;
    if (!hasBranchQuotaRows && legacyAvgPerAgent > 0) {
      quotaMonthly = legacyAvgPerAgent;
    }
    monthlyTrend.push({
      monthLabel: `${monthLabels[d.getMonth()]} '${String(y).slice(2)}`,
      periodKey: pk,
      revenue: sum,
      quotaMonthly,
      avgAgentRevenue: agentDen > 0 ? sum / agentDen : 0,
    });
  }

  let branchRevenueTrendLines: BranchRevenueTrendLine[] | null = null;
  if (!branchFilter && branchesArr.length > 0) {
    branchRevenueTrendLines = branchesArr.map((b) => ({
      branchId: b.branchId,
      branchName: b.branchName,
      monthlyRevenue: Array.from({ length: 12 }, (_, i) => {
        const d = new Date(trendStart.getFullYear(), trendStart.getMonth() + i, 1);
        const y = d.getFullYear();
        const mo = d.getMonth() + 1;
        return trendRows
          .filter((r) => r.year === y && r.month === mo && r.branchId === b.branchId)
          .reduce((acc, r) => acc + r.revenue, 0);
      }),
    }));
  }

  // Summary
  const aboveQuota = rows.filter((r) => r.attainmentPct >= 100).length;
  const onTrack = rows.filter((r) => r.attainmentPct >= 80 && r.attainmentPct < 100).length;
  const belowQuota = rows.filter((r) => r.attainmentPct < 80).length;
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalRevenuePrev = rows.reduce((s, r) => s + r.prevRevenue, 0);
  const attainmentAvg =
    rows.length > 0 ? rows.reduce((s, r) => s + r.attainmentPct, 0) / rows.length : 0;
  const commissionLiability = rows.reduce((s, r) => s + r.commissionAccrued, 0);
  const commissionPaid = rows.reduce((s, r) => s + r.commissionPaid, 0);
  const commissionEarnedTotal = rows.reduce((s, r) => s + r.commissionEarned, 0);

  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const totalProfitPrev = agents.reduce((s, a) => s + (profitPrevByAgent.get(a.id) ?? 0), 0);

  const summary: AnalyticsSummary = {
    range,
    prevRange,
    totalRevenue,
    totalRevenuePrev,
    revenueDeltaPct:
      totalRevenuePrev > 0 ? ((totalRevenue - totalRevenuePrev) / totalRevenuePrev) * 100 : 0,
    totalOrders: rows.reduce((s, r) => s + r.orderCount, 0),
    totalAgents: rows.length,
    agentsAboveQuota: aboveQuota,
    agentsOnTrack: onTrack,
    agentsBelowQuota: belowQuota,
    attainmentAvgPct: attainmentAvg,
    commissionLiability,
    commissionPaid,
    commissionEarned: commissionEarnedTotal,
    totalProfit,
    totalProfitPrev,
    profitDeltaPct:
      totalProfitPrev !== 0
        ? ((totalProfit - totalProfitPrev) / Math.abs(totalProfitPrev)) * 100
        : totalProfit !== 0
          ? 100
          : 0,
    profitMarginPct: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    customersUnassigned: unassigned,
  };

  return {
    summary,
    agents: rows,
    branches: branchesArr,
    monthlyTrend,
    alerts,
    filterBranchId: branchFilter,
    branchRevenueTrendLines,
  };
}

async function fetchAggregateTargetsForTrend(
  start: Date,
  end: Date,
  branchFilter: string | null,
  agents: AgentEmployee[],
): Promise<Map<string, number>> {
  const periodLabels: string[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    const mStart = y === start.getFullYear() ? start.getMonth() : 0;
    const mEnd = y === end.getFullYear() ? end.getMonth() : 11;
    for (let m = mStart; m <= mEnd; m++) {
      periodLabels.push(`${y}-${pad2(m + 1)}`);
    }
  }
  const out = new Map<string, number>();
  if (periodLabels.length === 0) return out;
  const { data, error } = await supabase
    .from('agent_targets')
    .select('employee_id, period, monthly_sales_target')
    .in('period', periodLabels);
  if (error) return out;
  const inScope = new Set(
    agents.filter((a) => !branchFilter || a.branchId === branchFilter).map((a) => a.id),
  );
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const empId = String(r.employee_id ?? '');
    if (!inScope.has(empId)) continue;
    const key = String(r.period ?? '');
    out.set(key, (out.get(key) ?? 0) + Number(r.monthly_sales_target ?? 0));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Quota mutations
// ---------------------------------------------------------------------------

export async function upsertAgentTarget(input: {
  employeeId: string;
  period: string;
  monthly?: number | null;
  quarterly?: number | null;
  stretch?: string | null;
  note?: string | null;
  changedByEmail?: string | null;
  changedByName?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('upsert_agent_target', {
    p_employee_id: input.employeeId,
    p_period: input.period,
    p_monthly: input.monthly ?? null,
    p_quarterly: input.quarterly ?? null,
    p_stretch: input.stretch ?? null,
    p_note: input.note ?? null,
    p_changed_by: input.changedByEmail ?? null,
    p_changed_name: input.changedByName ?? null,
  });
  if (error) {
    console.error('[agentAnalytics] upsertAgentTarget', error);
    return { ok: false, error: error.message };
  }
  return { ok: Boolean(data) };
}

export async function bulkUpsertAgentTargets(input: {
  period: string;
  rows: Array<{ employeeId: string; monthly?: number | null; quarterly?: number | null; stretch?: string | null }>;
  note?: string | null;
  changedByEmail?: string | null;
  changedByName?: string | null;
}): Promise<{ ok: boolean; count?: number; error?: string }> {
  const payload = input.rows.map((r) => ({
    employeeId: r.employeeId,
    monthly: r.monthly ?? null,
    quarterly: r.quarterly ?? null,
    stretch: r.stretch ?? null,
  }));
  const { data, error } = await supabase.rpc('bulk_upsert_agent_targets', {
    p_period: input.period,
    p_rows: payload,
    p_note: input.note ?? null,
    p_changed_by: input.changedByEmail ?? null,
    p_changed_name: input.changedByName ?? null,
  });
  if (error) {
    console.error('[agentAnalytics] bulkUpsertAgentTargets', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, count: Number(data ?? 0) };
}

/** One quota per branch for the period; mirrors to every Sales Agent in that branch. */
export async function upsertBranchSalesTarget(input: {
  branchId: string;
  period: string;
  monthly?: number | null;
  quarterly?: number | null;
  stretch?: string | null;
  note?: string | null;
  changedByEmail?: string | null;
  changedByName?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('upsert_branch_sales_target', {
    p_branch_id: input.branchId,
    p_period: input.period,
    p_monthly: input.monthly ?? null,
    p_quarterly: input.quarterly ?? null,
    p_stretch: input.stretch ?? null,
    p_note: input.note ?? null,
    p_changed_by: input.changedByEmail ?? null,
    p_changed_name: input.changedByName ?? null,
  });
  if (error) {
    console.error('[agentAnalytics] upsertBranchSalesTarget', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function fetchQuotaHistory(employeeId: string): Promise<QuotaHistoryRow[]> {
  const { data, error } = await supabase
    .from('agent_quota_history')
    .select('*')
    .eq('employee_id', employeeId)
    .order('changed_at', { ascending: false })
    .limit(20);
  if (error) {
    console.warn('[agentAnalytics] fetchQuotaHistory', error);
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    employeeId: String(r.employee_id),
    period: String(r.period ?? ''),
    prevMonthly: r.prev_monthly != null ? Number(r.prev_monthly) : null,
    newMonthly: r.new_monthly != null ? Number(r.new_monthly) : null,
    prevQuarterly: r.prev_quarterly != null ? Number(r.prev_quarterly) : null,
    newQuarterly: r.new_quarterly != null ? Number(r.new_quarterly) : null,
    prevStretch: r.prev_stretch ? String(r.prev_stretch) : null,
    newStretch: r.new_stretch ? String(r.new_stretch) : null,
    note: r.note ? String(r.note) : null,
    changedByEmail: r.changed_by_email ? String(r.changed_by_email) : null,
    changedByName: r.changed_by_name ? String(r.changed_by_name) : null,
    changedAt: String(r.changed_at ?? ''),
  }));
}

export async function sendAgentCoachingNudge(input: {
  employeeId: string;
  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
  title: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('send_agent_coaching_nudge', {
    p_employee_id: input.employeeId,
    p_severity: input.severity ?? 'Medium',
    p_title: input.title,
    p_message: input.message,
  });
  if (error) {
    console.error('[agentAnalytics] sendAgentCoachingNudge', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// CSV export (leaderboard)
// ---------------------------------------------------------------------------

export function rowsToCsv(rows: AgentLeaderboardRow[]): string {
  const headers = [
    'Agent',
    'Branch',
    'Revenue (paid)',
    'Orders',
    'AOV',
    'Attainment %',
    'Quota',
    'Revenue Gap',
    'Collection %',
    'New Customers',
    'Δ vs prev period %',
  ];
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.agentName,
        r.branchName ?? '',
        r.revenue.toFixed(2),
        r.orderCount,
        r.averageOrderValue.toFixed(2),
        r.attainmentPct.toFixed(1),
        r.effectiveTarget.toFixed(2),
        r.revenueGap.toFixed(2),
        r.collectionRate.toFixed(1),
        r.newCustomers,
        r.revenueDeltaPct.toFixed(1),
      ]
        .map((x) => escape(String(x ?? '')))
        .join(','),
    );
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Saved views (localStorage)
// ---------------------------------------------------------------------------

const SAVED_VIEW_KEY = 'lamtex.agentAnalytics.savedViews.v1';

export interface SavedView {
  id: string;
  name: string;
  branchId: string | null;
  period: PeriodKey;
  customStart?: string;
  customEnd?: string;
  search?: string;
  attainmentBucket?: 'all' | 'above' | 'on' | 'below';
  sortField?: string;
  createdAt: string;
}

export function loadSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(SAVED_VIEW_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedView[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedViews(views: SavedView[]): void {
  try {
    localStorage.setItem(SAVED_VIEW_KEY, JSON.stringify(views));
  } catch {
    // ignore quota errors
  }
}
