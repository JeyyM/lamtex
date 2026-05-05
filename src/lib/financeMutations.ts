/**
 * Finance / payments mutations.
 *
 * Encapsulates the write paths used by the Invoices & Payments page:
 *  - Upload payment proof (agent-internal): uploads file to storage and inserts a
 *    pending `order_proof_documents` row.
 *  - Verify / reject payment proof (executive): updates the proof status, applies
 *    `amount_paid` to the order, recomputes payment status, writes an order log,
 *    and accrues agent commission for the period.
 *  - Release commission: marks an `agent_commissions` row as Paid.
 *  - Adjust customer credit limit.
 */

import { supabase } from '@/src/lib/supabase';
import { encodeProofNotes, periodKeyForDate } from '@/src/lib/financeData';

const STORAGE_BUCKET = 'images';
const PROOF_FOLDER = 'payment-proofs';

function ts() {
  return new Date().toISOString();
}

function todayIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120);
}

export type ProofUploadInput = {
  orderId: string;
  file: File;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  uploadedBy: string;
  uploadedByRole: 'Agent' | 'Executive' | 'Manager' | 'Cashier';
};

export type ProofUploadResult = {
  proofId: string;
  fileUrl: string;
};

/** Upload a payment proof image and queue it for executive verification. */
export async function uploadPaymentProof(input: ProofUploadInput): Promise<ProofUploadResult> {
  if (input.amount <= 0) throw new Error('Payment amount must be greater than zero.');
  if (!input.paymentMethod.trim()) throw new Error('Payment method is required.');

  const path = `${PROOF_FOLDER}/${input.orderId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}_${safeFileName(input.file.name)}`;

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, input.file, { cacheControl: '3600', upsert: false });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const fileUrl = pub.publicUrl;

  const { data, error } = await supabase
    .from('order_proof_documents')
    .insert({
      order_id: input.orderId,
      type: 'payment',
      file_name: input.file.name,
      file_url: fileUrl,
      file_size: input.file.size,
      uploaded_by: input.uploadedBy,
      uploaded_by_role: input.uploadedByRole,
      status: 'pending',
      notes: encodeProofNotes({
        amount: input.amount,
        method: input.paymentMethod,
        reference: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
      }),
      uploaded_at: ts(),
    })
    .select('id')
    .single();
  if (error) throw error;

  return { proofId: String(data.id), fileUrl };
}

/** Reject a payment proof with a reason; does not touch the order's amounts. */
export async function rejectPaymentProof(
  proofId: string,
  values: { rejectionReason: string; reviewedBy: string },
): Promise<void> {
  const reason = values.rejectionReason.trim();
  if (!reason) throw new Error('Rejection reason is required.');

  const { data: proof, error: pErr } = await supabase
    .from('order_proof_documents')
    .select('id, order_id, status')
    .eq('id', proofId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!proof) throw new Error('Proof not found.');
  if (proof.status !== 'pending') throw new Error('Only pending proofs can be rejected.');

  const { error: updErr } = await supabase
    .from('order_proof_documents')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      verified_by: values.reviewedBy,
      verified_at: ts(),
    })
    .eq('id', proofId);
  if (updErr) throw updErr;

  await supabase.from('order_logs').insert({
    order_id: proof.order_id,
    action: 'note_added',
    performed_by: values.reviewedBy,
    description: `Rejected payment proof: ${reason}`,
  });
}

/**
 * Approve a payment proof.
 *
 *  - Updates the proof to verified.
 *  - Applies `amount` against the order's `amount_paid` and recomputes `balance_due`
 *    and `payment_status`.
 *  - Inserts a `payment_transactions` row representing the recorded real payment.
 *  - Accrues agent commission (Pending) for the period of `paid_at`.
 */
export async function verifyPaymentProof(
  proofId: string,
  values: {
    amount: number;
    paymentMethod: string;
    referenceNumber: string | null;
    paidAt?: string | null;
    reviewedBy: string;
  },
): Promise<void> {
  if (values.amount <= 0) throw new Error('Approved amount must be greater than zero.');

  const paidAt = values.paidAt?.trim() ? new Date(values.paidAt).toISOString() : ts();

  const { data: proof, error: pErr } = await supabase
    .from('order_proof_documents')
    .select('id, order_id, status')
    .eq('id', proofId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!proof) throw new Error('Proof not found.');
  if (proof.status !== 'pending') throw new Error('Only pending proofs can be approved.');

  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select(
      'id, order_number, customer_id, customer_name, agent_id, agent_name, total_amount, amount_paid, balance_due, payment_status',
    )
    .eq('id', proof.order_id)
    .maybeSingle();
  if (oErr) throw oErr;
  if (!order) throw new Error('Order for this proof was not found.');

  const total = Number(order.total_amount) || 0;
  const previouslyPaid = Number(order.amount_paid) || 0;
  const newPaid = Math.min(total, previouslyPaid + values.amount);
  const balanceDue = Math.max(0, total - newPaid);
  let paymentStatus = (order.payment_status as string) ?? 'Invoiced';
  if (balanceDue === 0) paymentStatus = 'Paid';
  else if (newPaid > 0) paymentStatus = 'Partially Paid';

  const { error: updOrder } = await supabase
    .from('orders')
    .update({
      amount_paid: newPaid,
      balance_due: balanceDue,
      payment_status: paymentStatus,
      updated_at: ts(),
    })
    .eq('id', order.id);
  if (updOrder) throw updOrder;

  const { error: updProof } = await supabase
    .from('order_proof_documents')
    .update({
      status: 'verified',
      verified_by: values.reviewedBy,
      verified_at: ts(),
    })
    .eq('id', proofId);
  if (updProof) throw updProof;

  const { error: txErr } = await supabase.from('payment_transactions').insert({
    order_id: order.id,
    payment_method: mapToPaymentMethodEnum(values.paymentMethod),
    invoice_amount: values.amount,
    gateway_fee: 0,
    service_fee: 0,
    total_fees: 0,
    total_paid: values.amount,
    gateway_reference_number: values.referenceNumber?.trim() || null,
    status: 'completed',
    paid_at: paidAt,
    processed_at: ts(),
    customer_name: order.customer_name ?? null,
    notes: `Verified from proof ${proofId} by ${values.reviewedBy}`,
  });
  if (txErr) throw txErr;

  await supabase.from('order_logs').insert({
    order_id: order.id,
    action: 'payment_received',
    performed_by: values.reviewedBy,
    description: `Verified payment proof for ₱${values.amount.toLocaleString()} via ${values.paymentMethod}`,
    new_value: { amount: values.amount, method: values.paymentMethod, reference: values.referenceNumber ?? null },
  });

  if (order.agent_id) {
    await accrueAgentCommission({
      employeeId: String(order.agent_id),
      orderNumber: order.order_number ?? order.id,
      customerName: order.customer_name ?? null,
      paymentAmount: values.amount,
      paidAt,
    });
  }
}

const PAYMENT_METHOD_ENUMS = new Set([
  'GCash',
  'Maya',
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Cash',
  'Check',
]);
function mapToPaymentMethodEnum(label: string): string {
  return PAYMENT_METHOD_ENUMS.has(label) ? label : 'Cash';
}

/**
 * Adds the agent's commission for this verified payment to the period's row.
 * Commission rate comes from `employee_compensation.commission_rate`.
 */
async function accrueAgentCommission(input: {
  employeeId: string;
  orderNumber: string;
  customerName: string | null;
  paymentAmount: number;
  paidAt: string;
}): Promise<void> {
  const period = periodKeyForDate(input.paidAt);
  if (!period) return;

  const { data: comp } = await supabase
    .from('employee_compensation')
    .select('commission_rate')
    .eq('employee_id', input.employeeId)
    .maybeSingle();
  const rate = Number(comp?.commission_rate) || 0;
  if (rate <= 0) return;

  const commission = Math.round(input.paymentAmount * (rate / 100) * 100) / 100;

  const { data: existing, error: exErr } = await supabase
    .from('agent_commissions')
    .select('id, sales_amount, commission_earned, commission_rate, breakdown, status')
    .eq('employee_id', input.employeeId)
    .eq('period', period)
    .maybeSingle();
  if (exErr) throw exErr;

  const breakdownEntry = {
    orderNumber: input.orderNumber,
    customerName: input.customerName,
    paymentAmount: input.paymentAmount,
    commission,
    paidAt: input.paidAt,
  };

  if (existing) {
    const nextSales = (Number(existing.sales_amount) || 0) + input.paymentAmount;
    const nextEarned = (Number(existing.commission_earned) || 0) + commission;
    const nextBreakdown = Array.isArray(existing.breakdown)
      ? [...(existing.breakdown as unknown[]), breakdownEntry]
      : [breakdownEntry];
    const { error } = await supabase
      .from('agent_commissions')
      .update({
        sales_amount: nextSales,
        commission_earned: nextEarned,
        commission_rate: rate,
        breakdown: nextBreakdown,
        status: existing.status === 'Paid' ? 'Pending' : existing.status,
        updated_at: ts(),
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('agent_commissions').insert({
      employee_id: input.employeeId,
      period,
      sales_amount: input.paymentAmount,
      commission_rate: rate,
      commission_earned: commission,
      status: 'Pending',
      breakdown: [breakdownEntry],
    });
    if (error) throw error;
  }
}

/** Mark a commission row as released to the agent. */
export async function releaseCommission(
  commissionId: string,
  values: { releasedBy: string },
): Promise<void> {
  const { error } = await supabase
    .from('agent_commissions')
    .update({
      status: 'Paid',
      paid_date: todayIso(),
      updated_at: ts(),
    })
    .eq('id', commissionId);
  if (error) throw error;

  // Best-effort log; ignore if table doesn't allow this entity
  await supabase
    .from('order_logs')
    .insert({
      order_id: null,
      action: 'note_added',
      performed_by: values.releasedBy,
      description: `Released agent commission ${commissionId}`,
    })
    .catch(() => null);
}

/** Update a customer's credit limit; recomputes available_credit if outstanding is known. */
export async function adjustCustomerCreditLimit(
  customerId: string,
  newLimit: number,
): Promise<void> {
  if (newLimit < 0) throw new Error('Credit limit cannot be negative.');

  const { data, error } = await supabase
    .from('customers')
    .select('outstanding_balance')
    .eq('id', customerId)
    .maybeSingle();
  if (error) throw error;
  const outstanding = Number(data?.outstanding_balance) || 0;
  const available = Math.max(0, newLimit - outstanding);

  const { error: updErr } = await supabase
    .from('customers')
    .update({
      credit_limit: newLimit,
      available_credit: available,
      updated_at: ts(),
    })
    .eq('id', customerId);
  if (updErr) throw updErr;
}
