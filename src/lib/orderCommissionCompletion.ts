import { supabase } from '@/src/lib/supabase';
import { proofPaymentParts, roundMoney } from '@/src/lib/orderProofPayments';

const EPS = 0.01;

type ProofRowLite = {
  id: string;
  type: string;
  payment_cash_amount?: number | string | null;
  payment_credit_amount?: number | string | null;
  payment_adjustment?: number | string | null;
  notes: string | null;
  commission_paid_at?: string | null;
};

export function proofCashAmount(row: ProofRowLite): number {
  if (row.type !== 'payment') return 0;
  return proofPaymentParts(row as Parameters<typeof proofPaymentParts>[0]).cash;
}

export function proofRequiresCommissionPayout(row: ProofRowLite): boolean {
  return proofCashAmount(row) > EPS;
}

/** All cash-bearing payment proofs on this order have commission_paid_at set. */
export function allCashCommissionsReleased(proofs: ProofRowLite[]): boolean {
  const cashProofs = proofs.filter((p) => p.type === 'payment' && proofRequiresCommissionPayout(p));
  if (cashProofs.length === 0) return true;
  return cashProofs.every((p) => Boolean(p.commission_paid_at));
}

export type OrderFinanceCompletionState = {
  balanceDue: number;
  isFullyPaid: boolean;
  pendingCashCommissionCount: number;
  allCashCommissionsReleased: boolean;
  canMarkOrderCompleted: boolean;
};

export function evaluateOrderFinanceCompletion(params: {
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  proofs: ProofRowLite[];
}): OrderFinanceCompletionState {
  const balanceDue = roundMoney(params.balanceDue);
  const isFullyPaid = balanceDue <= EPS;
  const cashProofs = params.proofs.filter((p) => p.type === 'payment' && proofRequiresCommissionPayout(p));
  const pendingCashCommissionCount = cashProofs.filter((p) => !p.commission_paid_at).length;
  const released = allCashCommissionsReleased(params.proofs);
  return {
    balanceDue,
    isFullyPaid,
    pendingCashCommissionCount,
    allCashCommissionsReleased: released,
    canMarkOrderCompleted: isFullyPaid && released,
  };
}

const COMPLETABLE_STATUSES = new Set(['Delivered', 'Partially Fulfilled']);

/**
 * When the order is fully paid and every cash payment proof has commission released,
 * set orders.status to Completed (from Delivered / Partially Fulfilled).
 */
export async function tryMarkOrderCompletedAfterFinance(orderId: string): Promise<boolean> {
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('id, order_number, status, total_amount, amount_paid, balance_due')
    .eq('id', orderId)
    .maybeSingle();
  if (oErr || !order) return false;

  const status = String(order.status ?? '');
  if (status === 'Completed' || status === 'Cancelled' || status === 'Rejected') return status === 'Completed';

  const { data: proofs, error: pErr } = await supabase
    .from('order_proof_documents')
    .select(
      'id, type, payment_cash_amount, payment_credit_amount, payment_adjustment, notes, commission_paid_at',
    )
    .eq('order_id', orderId)
    .eq('type', 'payment');
  if (pErr) return false;

  const state = evaluateOrderFinanceCompletion({
    totalAmount: Number(order.total_amount) || 0,
    amountPaid: Number(order.amount_paid) || 0,
    balanceDue: Number(order.balance_due) || 0,
    proofs: (proofs ?? []) as ProofRowLite[],
  });

  if (!state.canMarkOrderCompleted) return false;
  if (!COMPLETABLE_STATUSES.has(status)) return false;

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('orders')
    .update({ status: 'Completed', updated_at: now })
    .eq('id', orderId);
  if (updErr) return false;

  await supabase.from('order_logs').insert({
    order_id: orderId,
    action: 'status_changed',
    performed_by: 'System',
    description: `Order marked Completed — fully paid and all cash commissions released (${order.order_number ?? orderId})`,
    new_value: { status: 'Completed' },
  });

  return true;
}
