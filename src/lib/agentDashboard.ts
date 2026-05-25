/**
 * Sales Agent personal dashboard — scoped to the logged-in employee.
 *
 * Reuses quota / commission math from `agentAnalytics` for MTD performance,
 * plus direct order & customer queries for day-to-day work queues.
 */

import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import { computeProofCommissionForClientType } from '@/src/lib/financeData';
import type { OrderWithPaymentProofsRow } from '@/src/lib/financeData';
import { proofPaymentParts } from '@/src/lib/orderProofPayments';
import {
  fetchAgentAnalyticsBundle,
  formatCurrencyShort,
  formatPercent,
  getPeriodRange,
  type AgentLeaderboardRow,
} from '@/src/lib/agentAnalytics';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AgentDashboardKPI {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  status: 'good' | 'warning' | 'danger' | 'neutral';
  href?: string;
}

export interface AgentDashboardOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  balanceDue: number;
  orderDate: string | null;
  requiredDate: string | null;
}

export interface AgentDashboardCustomerRow {
  id: string;
  name: string;
  city: string | null;
  outstandingBalance: number;
  overdueBalance: number;
  orderCount: number;
}

export interface AgentDashboardAlertRow {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  actionRequired: boolean;
  createdAt: string;
}

export interface AgentDashboardTrendPoint {
  label: string;
  revenue: number;
  target: number;
}

export interface AgentDashboardPendingCommissionRow {
  proofId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  cashAmount: number;
  commissionAmount: number;
  uploadedAt: string | null;
}

export interface AgentDashboardBundle {
  agentId: string | null;
  agentName: string;
  branchId: string | null;
  branchName: string | null;
  periodLabel: string;
  generatedAt: string;
  kpis: AgentDashboardKPI[];
  stats: AgentLeaderboardRow | null;
  branchRank: number | null;
  branchAgentCount: number;
  myOrders: AgentDashboardOrderRow[];
  overdueOrders: AgentDashboardOrderRow[];
  overdueOrderCount: number;
  overdueBalance: number;
  customersAtRisk: AgentDashboardCustomerRow[];
  pendingCommissions: AgentDashboardPendingCommissionRow[];
  alerts: AgentDashboardAlertRow[];
  trend: AgentDashboardTrendPoint[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

interface AgentKpiInputs {
  orderCount: number;
  overdueOrderCount: number;
  overdueBalance: number;
  customersAtRiskCount: number;
  pendingCommissions: number;
  pendingCommissionCount: number;
  periodLabel: string;
}

function buildKpis(stats: AgentLeaderboardRow | null, extras?: AgentKpiInputs): AgentDashboardKPI[] {
  const revenue = stats?.revenue ?? 0;
  const attainment = stats?.attainmentPct ?? 0;
  const commissionEarned = stats?.commissionEarned ?? 0;
  const commissionPaid = stats?.commissionPaid ?? 0;
  const commissionAwaiting = stats?.commissionAccrued ?? extras?.pendingCommissions ?? 0;
  const overdue = extras?.overdueBalance ?? 0;
  const overdueCount = extras?.overdueOrderCount ?? 0;
  const openOrders = stats?.orderCount ?? extras?.orderCount ?? 0;

  return [
    {
      id: 'kpi-sales',
      label: 'MTD sales',
      value: formatCurrencyShort(revenue),
      subtitle: stats
        ? `${openOrders} order${openOrders === 1 ? '' : 's'} · ${formatPercent(stats.collectionRate)} collected`
        : 'No sales this month',
      status: revenue > 0 ? 'good' : 'neutral',
      href: '/orders',
    },
    {
      id: 'kpi-quota',
      label: 'Quota attainment',
      value: stats?.effectiveTarget ? formatPercent(attainment) : '—',
      subtitle: stats?.effectiveTarget
        ? `${formatCurrencyShort(revenue)} / ${formatCurrencyShort(stats.effectiveTarget)}`
        : 'No quota set for this branch',
      status:
        !stats?.effectiveTarget
          ? 'neutral'
          : attainment >= 100
            ? 'good'
            : attainment >= 80
              ? 'warning'
              : 'danger',
      href: '/orders',
    },
    {
      id: 'kpi-commission',
      label: 'Commission earned',
      value: formatCurrencyShort(commissionEarned),
      subtitle:
        commissionEarned > 0
          ? `${formatCurrencyShort(commissionPaid)} paid out${
              commissionAwaiting > 0
                ? ` · ${formatCurrencyShort(commissionAwaiting)} awaiting release`
                : ''
            }`
          : 'No commission earned this month',
      status: commissionEarned > 0 ? 'good' : 'neutral',
      href: '/finance?tab=commissions',
    },
    {
      id: 'kpi-overdue',
      label: 'Overdue receivables',
      value: formatCurrencyShort(overdue),
      subtitle:
        overdueCount > 0
          ? `${overdueCount} order${overdueCount === 1 ? '' : 's'} past due · all time`
          : 'All accounts current',
      status: overdueCount > 0 ? 'danger' : 'good',
      href: '/finance',
    },
  ];
}

function mapOrderRow(raw: Record<string, unknown>): AgentDashboardOrderRow {
  return {
    id: String(raw.id),
    orderNumber: toStr(raw.order_number) ?? String(raw.id),
    customerName: toStr(raw.customer_name) ?? '—',
    status: toStr(raw.status) ?? '—',
    paymentStatus: toStr(raw.payment_status) ?? '—',
    totalAmount: toNumber(raw.total_amount),
    balanceDue: toNumber(raw.balance_due),
    orderDate: toStr(raw.order_date),
    requiredDate: toStr(raw.required_date),
  };
}

async function fetchAgentOrders(agentId: string, branchId: string | null): Promise<AgentDashboardOrderRow[]> {
  let q = supabase
    .from('orders')
    .select(
      'id, order_number, customer_name, status, payment_status, total_amount, balance_due, order_date, required_date, branch_id, agent_id',
    )
    .eq('agent_id', agentId)
    .order('order_date', { ascending: false })
    .limit(80);

  if (branchId) q = q.eq('branch_id', branchId);

  const { data, error } = await q;
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map(mapOrderRow);
}

async function fetchAgentOverdueSummary(
  agentId: string,
  branchId: string | null,
  displayLimit = 10,
): Promise<{ count: number; balance: number; rows: AgentDashboardOrderRow[] }> {
  let count = 0;
  let balance = 0;
  const rows: AgentDashboardOrderRow[] = [];
  let page = 0;
  const pageSize = 200;

  while (true) {
    let q = supabase
      .from('orders')
      .select(
        'id, order_number, customer_name, status, payment_status, total_amount, balance_due, order_date, required_date, branch_id, agent_id',
      )
      .eq('agent_id', agentId)
      .eq('payment_status', 'Overdue')
      .not('status', 'in', '("Cancelled","Rejected","Draft")')
      .order('required_date', { ascending: true, nullsFirst: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    const batch = (data ?? []) as Array<Record<string, unknown>>;
    if (batch.length === 0) break;

    for (const raw of batch) {
      count += 1;
      balance += toNumber(raw.balance_due);
      if (rows.length < displayLimit) rows.push(mapOrderRow(raw));
    }

    if (batch.length < pageSize) break;
    page += 1;
  }

  return { count, balance, rows };
}

async function fetchAgentCustomers(agentId: string, branchId: string | null): Promise<AgentDashboardCustomerRow[]> {
  let cq = supabase
    .from('customers')
    .select('id, name, city')
    .eq('assigned_agent_id', agentId)
    .order('name')
    .limit(50);
  if (branchId) cq = cq.eq('branch_id', branchId);

  const { data: customers, error: cErr } = await cq;
  if (cErr) throw cErr;
  const custRows = (customers ?? []) as Array<{ id: string; name: string; city: string | null }>;
  if (!custRows.length) return [];

  const ids = custRows.map((c) => c.id);
  const { data: orderRows, error: oErr } = await supabase
    .from('orders')
    .select('customer_id, balance_due, payment_status')
    .in('customer_id', ids)
    .not('status', 'in', '("Cancelled","Rejected","Draft")');
  if (oErr) throw oErr;

  const agg = new Map<string, { outstanding: number; overdue: number; count: number }>();
  for (const o of (orderRows ?? []) as Array<Record<string, unknown>>) {
    const cid = String(o.customer_id ?? '');
    if (!cid) continue;
    const cur = agg.get(cid) ?? { outstanding: 0, overdue: 0, count: 0 };
    const bal = toNumber(o.balance_due);
    cur.outstanding += bal;
    cur.count += 1;
    if (toStr(o.payment_status) === 'Overdue') cur.overdue += bal;
    agg.set(cid, cur);
  }

  return custRows.map((c) => {
    const a = agg.get(c.id) ?? { outstanding: 0, overdue: 0, count: 0 };
    return {
      id: c.id,
      name: c.name,
      city: c.city,
      outstandingBalance: a.outstanding,
      overdueBalance: a.overdue,
      orderCount: a.count,
    };
  });
}

async function fetchAgentTrend(
  agentId: string,
  branchId: string | null,
  monthlyTarget: number,
): Promise<AgentDashboardTrendPoint[]> {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const points: AgentDashboardTrendPoint[] = [];

  for (let i = 0; i < 6; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    points.push({
      label: `${monthLabels[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
      revenue: 0,
      target: monthlyTarget,
    });
  }

  let q = supabase
    .from('orders')
    .select('order_date, total_amount, amount_paid, agent_id, branch_id')
    .eq('agent_id', agentId)
    .gte('order_date', isoDate(start))
    .lte('order_date', isoDate(today))
    .not('status', 'in', '("Cancelled","Rejected","Draft")');

  if (branchId) q = q.eq('branch_id', branchId);

  const { data, error } = await q;
  if (error) {
    if (import.meta.env.DEV) console.warn('[agentDashboard] trend', error.message);
    return points;
  }

  for (const raw of (data ?? []) as Array<Record<string, unknown>>) {
    const od = toStr(raw.order_date);
    if (!od) continue;
    const dt = new Date(`${od.slice(0, 10)}T12:00:00`);
    const idx = (dt.getFullYear() - start.getFullYear()) * 12 + (dt.getMonth() - start.getMonth());
    if (idx < 0 || idx >= 6) continue;
    const paid = toNumber(raw.amount_paid);
    const gross = toNumber(raw.total_amount);
    points[idx].revenue += paid > 0 ? paid : gross;
  }

  return points;
}

async function fetchAgentOrderRecords(
  agentId: string,
  branchId: string | null,
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  let page = 0;
  const pageSize = 200;

  while (true) {
    let q = supabase
      .from('orders')
      .select('id, order_number, customer_name, branch_id, agent_id, customers(client_type)')
      .eq('agent_id', agentId)
      .order('order_date', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q;
    if (error) throw error;

    const batch = (data ?? []) as Array<Record<string, unknown>>;
    if (batch.length === 0) break;

    for (const raw of batch) {
      map.set(String(raw.id ?? ''), raw);
    }

    if (batch.length < pageSize) break;
    page += 1;
  }

  return map;
}

export async function fetchAgentPendingCommissions(
  agentId: string,
  branchId: string | null,
): Promise<AgentDashboardPendingCommissionRow[]> {
  const orderById = await fetchAgentOrderRecords(agentId, branchId);
  const orderIds = [...orderById.keys()];
  if (orderIds.length === 0) return [];

  const rows: AgentDashboardPendingCommissionRow[] = [];
  const chunkSz = 80;

  for (let i = 0; i < orderIds.length; i += chunkSz) {
    const chunk = orderIds.slice(i, i + chunkSz);
    const { data, error } = await supabase
      .from('order_proof_documents')
      .select(
        'id, order_id, uploaded_at, payment_cash_amount, payment_credit_amount, payment_adjustment, notes, commission_paid_at',
      )
      .eq('type', 'payment')
      .is('commission_paid_at', null)
      .in('order_id', chunk);

    if (error) {
      if (import.meta.env.DEV) console.warn('[agentDashboard] pending commissions', error.message);
      continue;
    }

    for (const raw of (data ?? []) as Array<Record<string, unknown>>) {
      const notes = raw.notes != null ? String(raw.notes) : null;
      const parts = proofPaymentParts({
        id: String(raw.id ?? ''),
        order_id: String(raw.order_id ?? ''),
        type: 'payment',
        title: null,
        file_name: null,
        file_url: '',
        file_size: null,
        uploaded_by: null,
        uploaded_by_role: null,
        status: null,
        notes,
        uploaded_at: String(raw.uploaded_at ?? ''),
        payment_cash_amount: raw.payment_cash_amount as number | string | null | undefined,
        payment_credit_amount: raw.payment_credit_amount as number | string | null | undefined,
        payment_adjustment: raw.payment_adjustment as number | string | null | undefined,
      });

      if (parts.cash <= 0.01) continue;

      const ord = orderById.get(String(raw.order_id ?? '')) ?? null;
      if (!ord) continue;

      const clientType = clientTypeFromOrderCustomersEmbed(ord);
      const commission = computeProofCommissionForClientType(parts.cash, clientType);
      if (commission <= 0) continue;

      rows.push({
        proofId: String(raw.id),
        orderId: String(raw.order_id),
        orderNumber: toStr(ord.order_number) ?? String(raw.order_id),
        customerName: toStr(ord.customer_name) ?? '—',
        cashAmount: parts.cash,
        commissionAmount: commission,
        uploadedAt: toStr(raw.uploaded_at),
      });
    }
  }

  return rows
    .sort((a, b) => {
      const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchAgentDashboard(opts: {
  agentId: string | null;
  agentName: string;
  branchName: string | null;
}): Promise<AgentDashboardBundle> {
  const branchTrim = opts.branchName?.trim() || '';
  const branchName = branchTrim === '' ? null : branchTrim;
  const branchId = branchName ? await resolveBranchIdByName(branchName) : null;
  const range = getPeriodRange('month');

  const empty: AgentDashboardBundle = {
    agentId: opts.agentId,
    agentName: opts.agentName || 'Agent',
    branchId,
    branchName,
    periodLabel: range.displayLabel,
    generatedAt: new Date().toISOString(),
    kpis: buildKpis(null),
    stats: null,
    branchRank: null,
    branchAgentCount: 0,
    myOrders: [],
    overdueOrders: [],
    overdueOrderCount: 0,
    overdueBalance: 0,
    customersAtRisk: [],
    pendingCommissions: [],
    alerts: [],
    trend: [],
  };

  if (!opts.agentId) return empty;

  const analytics = await fetchAgentAnalyticsBundle({ range, branchId });
  const stats = analytics.agents.find((a) => a.agentId === opts.agentId) ?? null;

  const sorted = [...analytics.agents].sort((a, b) => b.revenue - a.revenue);
  const branchRank = stats ? sorted.findIndex((a) => a.agentId === opts.agentId) + 1 : null;

  const [allOrders, overdueSummary, customers, trend, pendingCommissions] = await Promise.all([
    fetchAgentOrders(opts.agentId, branchId),
    fetchAgentOverdueSummary(opts.agentId, branchId),
    fetchAgentCustomers(opts.agentId, branchId),
    fetchAgentTrend(opts.agentId, branchId, stats?.monthlyTarget ?? 0),
    fetchAgentPendingCommissions(opts.agentId, branchId),
  ]);

  const { count: overdueOrderCount, balance: overdueBalance, rows: overdueOrders } = overdueSummary;

  const customersAtRisk = customers
    .filter((c) => c.overdueBalance > 0)
    .sort((a, b) => b.overdueBalance - a.overdueBalance);

  const pendingCommissionTotal = pendingCommissions.reduce((s, r) => s + r.commissionAmount, 0);

  const alerts = analytics.alerts
    .filter((a) => a.agentId === opts.agentId || a.agentId == null)
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      actionRequired: a.actionRequired,
      createdAt: a.createdAt,
    }));

  return {
    agentId: opts.agentId,
    agentName: stats?.agentName ?? (opts.agentName || 'Agent'),
    branchId,
    branchName,
    periodLabel: range.displayLabel,
    generatedAt: new Date().toISOString(),
    kpis: buildKpis(stats, {
      orderCount: allOrders.length,
      overdueOrderCount,
      overdueBalance,
      customersAtRiskCount: customersAtRisk.length,
      pendingCommissions: pendingCommissionTotal,
      pendingCommissionCount: pendingCommissions.length,
      periodLabel: range.displayLabel,
    }),
    stats,
    branchRank: branchRank && branchRank > 0 ? branchRank : null,
    branchAgentCount: analytics.agents.length,
    myOrders: allOrders.slice(0, 10),
    overdueOrders,
    overdueOrderCount,
    overdueBalance,
    customersAtRisk: customersAtRisk.slice(0, 8),
    pendingCommissions,
    alerts,
    trend,
  };
}

export { formatCurrencyShort, formatPercent };

/** Ensure agent Commission Release includes every pending proof row from the agent dashboard. */
export function mergeAgentPendingIntoCommissionOrders(
  all: OrderWithPaymentProofsRow[],
  pending: AgentDashboardPendingCommissionRow[],
  employeeId: string,
  employeeName: string,
): OrderWithPaymentProofsRow[] {
  const map = new Map(all.map((o) => [o.orderId, o]));
  for (const p of pending) {
    const existing = map.get(p.orderId);
    if (existing) {
      if (existing.pendingCashCommissionCount === 0) {
        map.set(p.orderId, {
          ...existing,
          pendingCashCommissionCount: Math.max(1, existing.cashProofCount),
          allCashCommissionsReleased: false,
        });
      }
      continue;
    }
    map.set(p.orderId, {
      orderId: p.orderId,
      orderNumber: p.orderNumber,
      customerId: null,
      customerName: p.customerName,
      agentName: employeeName || '—',
      agentId: employeeId,
      orderAgentId: employeeId,
      assignedAgentId: null,
      orderStatus: '—',
      totalAmount: p.cashAmount,
      amountPaid: p.cashAmount,
      balanceDue: 0,
      paymentStatus: 'Paid',
      proofCount: 1,
      totalProofAmount: p.cashAmount,
      totalCashOnProofs: p.cashAmount,
      cashProofCount: 1,
      lastProofAt: p.uploadedAt,
      pendingCashCommissionCount: 1,
      allCashCommissionsReleased: false,
    });
  }
  return [...map.values()];
}
