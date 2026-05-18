/**
 * Customer payment score: on-time vs terms, early-pay bonus, overdue penalty, credit discount.
 * Updates customers.payment_score, avg_payment_days, payment_behavior, overdue_amount.
 */

import { supabase } from '@/src/lib/supabase';
import { computeDueDateFromDelivery, parseDateOnly, parseProofNotes } from '@/src/lib/financeData';
function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type PaymentBehaviorLabel = 'Good' | 'Watchlist' | 'Risk';

const SETTLED_STATUSES = new Set(['Paid', 'On Credit']);
const SCORE_WINDOW_MONTHS = 18;
const MIN_ORDERS_FOR_FULL_SCORE = 1;

/** Days between two calendar dates (b - a). */
export function diffCalendarDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86_400_000);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

type ProofRowLite = {
  type: string;
  uploaded_at: string;
  notes: string | null;
  payment_cash_amount?: number | string | null;
  payment_credit_amount?: number | string | null;
  payment_adjustment?: number | string | null;
};

type OrderRowLite = {
  id: string;
  order_date: string;
  actual_delivery: string | null;
  due_date: string | null;
  payment_terms: string | null;
  payment_status: string;
  total_amount: number | string;
  amount_paid: number | string;
  balance_due: number | string;
  updated_at: string;
};

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const x = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(x) ? x : 0;
}

/** Resolve payment due date for an order (stored due_date or delivery + terms). */
export function resolveOrderDueDate(
  order: Pick<OrderRowLite, 'due_date' | 'actual_delivery' | 'payment_terms' | 'order_date'>,
  customerTerms: string | null,
): Date | null {
  const stored = parseDateOnly(order.due_date);
  if (stored) return stored;
  const terms = order.payment_terms ?? customerTerms;
  const fromDelivery = computeDueDateFromDelivery(order.actual_delivery, terms);
  if (fromDelivery) return fromDelivery;
  const base = parseDateOnly(order.order_date);
  if (!base) return null;
  const termsUp = (terms ?? 'COD').trim().toUpperCase();
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (termsUp === 'COD' || termsUp.includes('COD')) {
    d.setDate(d.getDate() + 1);
  } else {
    const m = termsUp.match(/\d+/);
    d.setDate(d.getDate() + (m ? parseInt(m[0], 10) : 30));
  }
  return d;
}

function proofAmountParts(row: ProofRowLite): { cash: number; credit: number; adj: number } {
  let cash = roundMoney(num(row.payment_cash_amount));
  let credit = roundMoney(num(row.payment_credit_amount));
  let adj = roundMoney(num(row.payment_adjustment));
  if (cash === 0 && credit === 0 && adj === 0 && row.notes) {
    try {
      const obj = JSON.parse(row.notes) as Record<string, unknown>;
      if (obj.cash != null || obj.credit != null || obj.adjustment != null) {
        cash = roundMoney(num(obj.cash));
        credit = roundMoney(num(obj.credit));
        adj = roundMoney(num(obj.adjustment));
      }
    } catch {
      const p = parseProofNotes(row.notes);
      if (p.amount != null && p.amount !== 0) {
        cash = roundMoney(p.amount);
      }
    }
  }
  return { cash, credit, adj };
}

/** When cumulative payment proofs reach order total, return that proof's date + credit used. */
export function resolvePaidDateAndCredit(
  proofs: ProofRowLite[],
  orderTotal: number,
  fallbackIso: string,
): { paidDate: Date; totalCredit: number; totalPaid: number } {
  const sorted = [...proofs]
    .filter((p) => p.type === 'payment')
    .sort((a, b) => String(a.uploaded_at).localeCompare(String(b.uploaded_at)));

  let cumulative = 0;
  let totalCredit = 0;
  let paidAt = fallbackIso;

  for (const row of sorted) {
    const parts = proofAmountParts(row);
    const inc = roundMoney(parts.cash + parts.credit + parts.adj);
    if (inc <= 0) continue;
    cumulative = roundMoney(cumulative + inc);
    totalCredit = roundMoney(totalCredit + parts.credit);
    paidAt = row.uploaded_at;
    if (cumulative + 0.01 >= orderTotal) break;
  }

  const paidDate = parseDateOnly(paidAt) ?? parseDateOnly(fallbackIso) ?? new Date();
  return {
    paidDate,
    totalCredit,
    totalPaid: roundMoney(Math.max(cumulative, orderTotal)),
  };
}

/**
 * Score one fully settled order (0–100).
 * - On time at due: 100
 * - Earlier: up to +15 bonus
 * - Late: −10 per day (cap −70)
 * - Any credit on order: −5 to −20 by credit share
 */
export function scoreSettledOrder(params: {
  dueDate: Date;
  paidDate: Date;
  totalCredit: number;
  totalPaid: number;
}): number {
  const daysFromDue = diffCalendarDays(params.dueDate, params.paidDate);
  let score = 100;

  if (daysFromDue < 0) {
    const daysEarly = Math.abs(daysFromDue);
    score += Math.min(15, daysEarly * 2);
  } else if (daysFromDue > 0) {
    score -= Math.min(70, daysFromDue * 10);
  }

  if (params.totalPaid > 0.01 && params.totalCredit > 0.01) {
    const creditShare = clamp(params.totalCredit / params.totalPaid, 0, 1);
    score -= Math.round(5 + creditShare * 15);
  }

  return clamp(Math.round(score), 0, 100);
}

export function behaviorFromScore(
  score: number,
  overdueAmount: number,
  settledOrderCount: number,
): PaymentBehaviorLabel {
  if (settledOrderCount < MIN_ORDERS_FOR_FULL_SCORE) {
    return overdueAmount > 0.01 ? 'Watchlist' : 'Good';
  }
  if (score < 60 || overdueAmount > 50_000) return 'Risk';
  if (score < 80 || overdueAmount > 0.01) return 'Watchlist';
  return 'Good';
}

export type CustomerPaymentScoreResult = {
  paymentScore: number;
  avgPaymentDays: number;
  paymentBehavior: PaymentBehaviorLabel;
  settledOrderCount: number;
  overdueAmount: number;
};

export async function recalculateCustomerPaymentScore(
  customerId: string,
): Promise<{ ok: true; result: CustomerPaymentScoreResult } | { ok: false; error: string }> {
  const { data: cust, error: cErr } = await supabase
    .from('customers')
    .select('id, payment_terms')
    .eq('id', customerId)
    .maybeSingle();
  if (cErr) return { ok: false, error: cErr.message };
  if (!cust) return { ok: false, error: 'Customer not found.' };

  const customerTerms = (cust.payment_terms as string | null) ?? null;
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - SCORE_WINDOW_MONTHS);
  const windowStartYmd = windowStart.toISOString().slice(0, 10);

  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select(
      'id, order_date, actual_delivery, due_date, payment_terms, payment_status, total_amount, amount_paid, balance_due, updated_at',
    )
    .eq('customer_id', customerId)
    .gte('order_date', windowStartYmd)
    .neq('status', 'Draft')
    .neq('status', 'Cancelled');
  if (oErr) return { ok: false, error: oErr.message };

  const orderList = (orders ?? []) as OrderRowLite[];
  const orderIds = orderList.map((o) => o.id);

  let proofsByOrder: Record<string, ProofRowLite[]> = {};
  if (orderIds.length > 0) {
    const { data: proofs, error: pErr } = await supabase
      .from('order_proof_documents')
      .select(
        'order_id, type, uploaded_at, notes, payment_cash_amount, payment_credit_amount, payment_adjustment',
      )
      .in('order_id', orderIds)
      .eq('type', 'payment');
    if (pErr) return { ok: false, error: pErr.message };
    for (const p of proofs ?? []) {
      const oid = String((p as { order_id: string }).order_id);
      if (!proofsByOrder[oid]) proofsByOrder[oid] = [];
      proofsByOrder[oid].push(p as ProofRowLite);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let overdueAmount = 0;

  const orderScores: number[] = [];
  const paymentDaySamples: number[] = [];

  for (const order of orderList) {
    const total = roundMoney(num(order.total_amount));
    const balance = roundMoney(num(order.balance_due));
    const status = String(order.payment_status ?? '');
    const due = resolveOrderDueDate(order, customerTerms);

    if (balance > 0.01 && due && due < today) {
      overdueAmount = roundMoney(overdueAmount + balance);
    }

    if (!SETTLED_STATUSES.has(status) || balance > 0.01 || total < 0.01) continue;

    if (!due) continue;

    const { paidDate, totalCredit, totalPaid } = resolvePaidDateAndCredit(
      proofsByOrder[order.id] ?? [],
      total,
      order.updated_at,
    );

    orderScores.push(
      scoreSettledOrder({
        dueDate: due,
        paidDate,
        totalCredit,
        totalPaid,
      }),
    );

    const orderDate = parseDateOnly(order.order_date);
    if (orderDate) {
      paymentDaySamples.push(Math.max(0, diffCalendarDays(orderDate, paidDate)));
    }
  }

  const settledOrderCount = orderScores.length;
  let paymentScore: number;
  let avgPaymentDays: number;

  if (settledOrderCount === 0) {
    paymentScore = overdueAmount > 0.01 ? 50 : 100;
    avgPaymentDays = 0;
  } else {
    paymentScore = Math.round(orderScores.reduce((a, b) => a + b, 0) / settledOrderCount);
    avgPaymentDays = Math.round(
      paymentDaySamples.reduce((a, b) => a + b, 0) / paymentDaySamples.length,
    );
  }

  const paymentBehavior = behaviorFromScore(paymentScore, overdueAmount, settledOrderCount);

  const { error: uErr } = await supabase
    .from('customers')
    .update({
      payment_score: paymentScore,
      avg_payment_days: avgPaymentDays,
      payment_behavior: paymentBehavior,
      overdue_amount: overdueAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);
  if (uErr) return { ok: false, error: uErr.message };

  return {
    ok: true,
    result: {
      paymentScore,
      avgPaymentDays,
      paymentBehavior,
      settledOrderCount,
      overdueAmount,
    },
  };
}
