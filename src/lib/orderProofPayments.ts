import { supabase } from '@/src/lib/supabase';
import { recalculateCustomerPaymentScore } from '@/src/lib/customerPaymentScore';
import { tryMarkOrderCompletedAfterFinance } from '@/src/lib/orderCommissionCompletion';
import { parseProofNotes } from '@/src/lib/financeData';
import type { ProofDocument, ProofType } from '@/src/types/orders';

const STORAGE_BUCKET = 'images';

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Keep amount paid and balance due consistent with order total (fixes stale balance after total edits). */
export function deriveOrderPaymentFields(
  totalAmount: number,
  amountPaid: number,
  balanceDue: number,
): { amountPaid: number; balanceDue: number } {
  const total = roundMoney(totalAmount);
  const paid = roundMoney(amountPaid);
  const expectedBalance = roundMoney(Math.max(0, total - paid));
  return { amountPaid: paid, balanceDue: expectedBalance };
}

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const x = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(x) ? x : 0;
}

type ProofRow = {
  id: string;
  order_id: string;
  type: string;
  title: string | null;
  file_name: string | null;
  file_url: string;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_by_role: string | null;
  status: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  notes: string | null;
  uploaded_at: string;
  payment_cash_amount?: number | string | null;
  payment_credit_amount?: number | string | null;
  payment_adjustment?: number | string | null;
  commission_paid_at?: string | null;
  commission_paid_by?: string | null;
};

function isProofVoidedRow(r: ProofRow): boolean {
  return r.status === 'voided';
}

export function proofRowToDocument(row: ProofRow, orderNumber: string): ProofDocument {
  const t = row.type;
  const type: ProofType =
    t === 'delivery' ? 'delivery' : t === 'payment' ? 'payment' : t === 'receipt' ? 'other' : 'other';
  return {
    id: row.id,
    orderId: orderNumber,
    type,
    title: row.title?.trim() || undefined,
    fileName: row.file_name ?? 'file',
    fileUrl: row.file_url,
    fileSize: Number(row.file_size ?? 0),
    uploadedBy: row.uploaded_by ?? '',
    uploadedByRole: (row.uploaded_by_role === 'Logistics' || row.uploaded_by_role === 'Customer'
      ? row.uploaded_by_role
      : 'Agent') as ProofDocument['uploadedByRole'],
    uploadedAt: row.uploaded_at,
    status: (row.status === 'pending' || row.status === 'rejected' || row.status === 'voided'
      ? row.status
      : 'verified') as ProofDocument['status'],
    verifiedBy: row.verified_by ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    notes: row.notes ?? undefined,
    paymentCashAmount: roundMoney(num(row.payment_cash_amount)),
    paymentCreditAmount: roundMoney(num(row.payment_credit_amount)),
    paymentAdjustment: roundMoney(num(row.payment_adjustment)),
    commissionPaidAt: row.commission_paid_at ?? null,
    commissionPaidBy: row.commission_paid_by?.trim() || null,
  };
}

function parsePaymentPartsFromNotes(raw: string | null): { cash: number; credit: number; adj: number } | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (obj.cash != null || obj.credit != null || obj.adjustment != null) {
      return {
        cash: roundMoney(num(obj.cash)),
        credit: roundMoney(num(obj.credit)),
        adj: roundMoney(num(obj.adjustment)),
      };
    }
  } catch {
    /* legacy plain notes */
  }
  const p = parseProofNotes(raw);
  if (p.amount != null && p.amount !== 0) {
    return { cash: roundMoney(p.amount), credit: 0, adj: 0 };
  }
  return null;
}

export function encodeOrderProofPaymentNotes(parts: {
  cash: number;
  credit: number;
  adjustment: number;
  userNotes: string | null;
}): string {
  return JSON.stringify({
    amount: roundMoney(parts.cash + parts.credit + parts.adjustment),
    cash: roundMoney(parts.cash),
    credit: roundMoney(parts.credit),
    adjustment: roundMoney(parts.adjustment),
    notes: parts.userNotes?.trim() || null,
  });
}

/** Per-row cash/credit/adj; falls back to legacy JSON in `notes` for payment amount. */
export function proofPaymentParts(row: ProofRow): { cash: number; credit: number; adj: number } {
  if (row.type !== 'payment') return { cash: 0, credit: 0, adj: 0 };
  let cash = roundMoney(num(row.payment_cash_amount));
  let credit = roundMoney(num(row.payment_credit_amount));
  let adj = roundMoney(num(row.payment_adjustment));
  if (cash === 0 && credit === 0 && adj === 0 && row.notes) {
    const fromNotes = parsePaymentPartsFromNotes(row.notes);
    if (fromNotes) {
      cash = fromNotes.cash;
      credit = fromNotes.credit;
      adj = fromNotes.adj;
    }
  }
  return { cash, credit, adj };
}

export type OrderProofInsertInput = {
  order_id: string;
  type: 'delivery' | 'payment' | 'other';
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  uploaded_by_role: string;
  status: string;
  title?: string | null;
  notes?: string | null;
  payment_cash_amount?: number;
  payment_credit_amount?: number;
  payment_adjustment?: number;
};

export function isSchemaColumnError(message: string): boolean {
  return /could not find|schema cache|column.*does not exist|invalid input value for enum/i.test(message);
}

/** Insert proof rows; falls back to legacy columns + JSON notes when DB migration is not applied yet. */
export async function insertOrderProofDocuments(
  rows: OrderProofInsertInput[],
): Promise<{ data: { id: string }[] | null; error: string | null }> {
  if (rows.length === 0) return { data: [], error: null };

  const extended = rows.map((r) => ({
    order_id: r.order_id,
    type: r.type,
    file_name: r.file_name,
    file_url: r.file_url,
    file_size: r.file_size,
    uploaded_by: r.uploaded_by,
    uploaded_by_role: r.uploaded_by_role,
    status: r.status,
    title: r.title ?? null,
    notes: r.notes ?? null,
    payment_cash_amount: r.payment_cash_amount ?? 0,
    payment_credit_amount: r.payment_credit_amount ?? 0,
    payment_adjustment: r.payment_adjustment ?? 0,
  }));

  const first = await supabase.from('order_proof_documents').insert(extended).select('id');
  if (!first.error) {
    return { data: (first.data ?? []) as { id: string }[], error: null };
  }
  if (!isSchemaColumnError(first.error.message)) {
    return { data: null, error: first.error.message };
  }

  const legacy = rows.map((r) => {
    const cash = r.payment_cash_amount ?? 0;
    const credit = r.payment_credit_amount ?? 0;
    const adj = r.payment_adjustment ?? 0;
    let notes = r.notes ?? null;
    if (r.type === 'payment' && (cash !== 0 || credit !== 0 || adj !== 0)) {
      notes = encodeOrderProofPaymentNotes({
        cash,
        credit,
        adjustment: adj,
        userNotes: r.notes ?? null,
      });
    } else if (r.title?.trim()) {
      notes = r.notes?.trim() ? `${r.title.trim()} — ${r.notes.trim()}` : r.title.trim();
    }
    const legacyType = r.type === 'other' ? 'receipt' : r.type;
    return {
      order_id: r.order_id,
      type: legacyType,
      file_name: r.file_name,
      file_url: r.file_url,
      file_size: r.file_size,
      uploaded_by: r.uploaded_by,
      uploaded_by_role: r.uploaded_by_role,
      status: r.status,
      notes,
    };
  });

  const second = await supabase.from('order_proof_documents').insert(legacy).select('id');
  if (second.error) {
    return { data: null, error: second.error.message };
  }
  return { data: (second.data ?? []) as { id: string }[], error: null };
}

export type OrderProofUpdateInput = {
  title?: string | null;
  notes?: string | null;
  payment_cash_amount?: number;
  payment_credit_amount?: number;
  payment_adjustment?: number;
};

/** Update a proof row; falls back to legacy `notes` JSON when payment columns are missing. */
export async function updateOrderProofDocument(
  proofId: string,
  input: OrderProofUpdateInput,
  legacy?: { proofType: 'delivery' | 'payment' | 'other'; userNotes: string | null },
): Promise<{ error: string | null }> {
  const extended: Record<string, unknown> = {};
  if (input.title !== undefined) extended.title = input.title;
  if (input.notes !== undefined) extended.notes = input.notes;
  if (input.payment_cash_amount !== undefined) extended.payment_cash_amount = input.payment_cash_amount;
  if (input.payment_credit_amount !== undefined) extended.payment_credit_amount = input.payment_credit_amount;
  if (input.payment_adjustment !== undefined) extended.payment_adjustment = input.payment_adjustment;

  const first = await supabase.from('order_proof_documents').update(extended).eq('id', proofId);
  if (!first.error) return { error: null };
  if (!isSchemaColumnError(first.error.message)) return { error: first.error.message };

  const legacyPayload: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = input.title?.trim() || null;
    const userNotes = legacy?.userNotes?.trim() || input.notes?.trim() || null;
    if (legacy?.proofType === 'payment') {
      const cash = input.payment_cash_amount ?? 0;
      const credit = input.payment_credit_amount ?? 0;
      const adj = input.payment_adjustment ?? 0;
      legacyPayload.notes = encodeOrderProofPaymentNotes({
        cash,
        credit,
        adjustment: adj,
        userNotes,
      });
    } else if (title && userNotes) {
      legacyPayload.notes = `${title} — ${userNotes}`;
    } else {
      legacyPayload.notes = title ?? userNotes;
    }
  } else if (input.notes !== undefined) {
    legacyPayload.notes = input.notes;
  }

  if (Object.keys(legacyPayload).length === 0) {
    return { error: first.error.message };
  }

  const second = await supabase.from('order_proof_documents').update(legacyPayload).eq('id', proofId);
  if (second.error) return { error: second.error.message };
  return { error: null };
}

export async function fetchPaymentProofAggregates(orderUuid: string): Promise<{
  totalPaid: number;
  totalCash: number;
  totalCredit: number;
}> {
  const { data, error } = await supabase
    .from('order_proof_documents')
    .select('*')
    .eq('order_id', orderUuid)
    .eq('type', 'payment');
  if (error) throw new Error(error.message);
  return sumPaymentProofRows((data ?? []) as ProofRow[]);
}

export type SyncPaymentResult = { ok: true } | { ok: false; error: string };

/** Sum payment proof rows (cash + credit + adjustment per row). */
export function sumPaymentProofRows(proofRows: ProofRow[]): {
  totalPaid: number;
  totalCash: number;
  totalCredit: number;
} {
  let totalCash = 0;
  let totalCredit = 0;
  for (const r of proofRows) {
    if (isProofVoidedRow(r)) continue;
    const { cash, credit, adj } = proofPaymentParts(r);
    totalCash += cash + adj;
    totalCredit += credit;
  }
  return {
    totalCash: roundMoney(totalCash),
    totalCredit: roundMoney(totalCredit),
    totalPaid: roundMoney(totalCash + totalCredit),
  };
}

/**
 * Add this proof's cash/credit to what's already on the order (keeps legacy amount_paid when no proofs yet).
 */
export function computeOrderAmountPaidAfterProofIncrement(params: {
  proofPaidBefore: number;
  orderAmountPaid: number;
  cashIncrement: number;
  creditIncrement: number;
}): number {
  const baseline =
    params.proofPaidBefore < 0.01 ? roundMoney(params.orderAmountPaid) : roundMoney(params.proofPaidBefore);
  return roundMoney(baseline + params.cashIncrement + params.creditIncrement);
}

/**
 * Recompute orders.amount_paid / balance_due / payment_status from payment proofs,
 * optionally adjust customer.available_credit when total credit applied changed.
 */
export async function syncOrderPaymentsFromProofs(
  orderUuid: string,
  options?: { creditAppliedBefore?: number; overrideTotalPaid?: number },
): Promise<SyncPaymentResult> {
  const { data: orderRow, error: oErr } = await supabase
    .from('orders')
    .select('id, total_amount, amount_paid, customer_id, invoice_id, payment_status, due_date')
    .eq('id', orderUuid)
    .maybeSingle();
  if (oErr) return { ok: false, error: oErr.message };
  if (!orderRow) return { ok: false, error: 'Order not found.' };

  const { data: proofRows, error: pErr } = await supabase
    .from('order_proof_documents')
    .select('*')
    .eq('order_id', orderUuid)
    .eq('type', 'payment');
  if (pErr) return { ok: false, error: pErr.message };

  const summed = sumPaymentProofRows((proofRows ?? []) as ProofRow[]);
  let totalPaid = summed.totalPaid;
  let totalCredit = summed.totalCredit;

  if (options?.overrideTotalPaid !== undefined) {
    totalPaid = roundMoney(options.overrideTotalPaid);
  }

  const totalAmount = roundMoney(num(orderRow.total_amount));
  const balanceDue = roundMoney(Math.max(0, totalAmount - totalPaid));

  const eps = 0.01;
  const dueYmd =
    orderRow.due_date != null && String(orderRow.due_date).trim() !== ''
      ? String(orderRow.due_date).slice(0, 10)
      : '';
  const todayYmd = new Date().toISOString().slice(0, 10);

  let paymentStatus: string;
  if (balanceDue > eps) {
    if (totalPaid > eps) paymentStatus = 'Partially Paid';
    else paymentStatus = orderRow.invoice_id ? 'Invoiced' : 'Unbilled';
    if (dueYmd && dueYmd < todayYmd) paymentStatus = 'Overdue';
  } else {
    paymentStatus = totalCredit > eps ? 'On Credit' : 'Paid';
  }

  const customerId = orderRow.customer_id as string | null;
  if (customerId && options?.creditAppliedBefore !== undefined) {
    const before = roundMoney(options.creditAppliedBefore);
    const delta = roundMoney(totalCredit - before);
    if (Math.abs(delta) > 1e-9) {
      const { data: cust, error: cErr } = await supabase
        .from('customers')
        .select('credit_limit, available_credit, outstanding_balance')
        .eq('id', customerId)
        .maybeSingle();
      if (cErr) return { ok: false, error: cErr.message };
      const avail = roundMoney(num(cust?.available_credit));
      const outstanding = roundMoney(num(cust?.outstanding_balance));
      const limit = roundMoney(num(cust?.credit_limit));
      if (delta > 0 && avail + 1e-9 < delta) {
        return { ok: false, error: 'Insufficient customer available credit for this application.' };
      }
      const nextAvail = roundMoney(Math.max(0, avail - delta));
      const nextOutstanding = roundMoney(Math.max(0, Math.min(limit, outstanding + delta)));
      const { error: uErr } = await supabase
        .from('customers')
        .update({
          available_credit: nextAvail,
          outstanding_balance: nextOutstanding,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);
      if (uErr) return { ok: false, error: uErr.message };
    }
  }

  const now = new Date().toISOString();
  const { error: ouErr } = await supabase
    .from('orders')
    .update({
      amount_paid: totalPaid,
      balance_due: balanceDue,
      payment_status: paymentStatus,
      updated_at: now,
    })
    .eq('id', orderUuid);
  if (ouErr) return { ok: false, error: ouErr.message };

  if (orderRow.invoice_id) {
    await supabase
      .from('invoices')
      .update({
        amount_paid: totalPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        updated_at: now,
      })
      .eq('id', orderRow.invoice_id);
  }

  if (customerId) {
    void recalculateCustomerPaymentScore(customerId);
  }

  void tryMarkOrderCompletedAfterFinance(orderUuid);

  return { ok: true };
}

export const ORDER_PROOF_GALLERY_FOLDER = 'order-proofs';

export function deliveryProofGalleryFolder(orderUuid: string): string {
  return `${ORDER_PROOF_GALLERY_FOLDER}/${orderUuid}/delivery`;
}

export function fileNameFromPublicUrl(fileUrl: string): string {
  const raw = fileUrl.split('/').pop()?.split('?')[0] ?? 'image';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function buildDeliveryProofDocumentRows(
  orderUuid: string,
  proofImageUrls: string[],
  opts: {
    uploadedBy: string;
    uploadedByRole: string;
    title?: string | null;
    notes?: string | null;
  },
): OrderProofInsertInput[] {
  const titleBase = opts.title?.trim() || null;
  const notes = opts.notes?.trim() || null;
  return proofImageUrls.map((fileUrl) => {
    const fileName = fileNameFromPublicUrl(fileUrl);
    return {
      order_id: orderUuid,
      type: 'delivery',
      file_name: fileName,
      file_url: fileUrl,
      file_size: 0,
      uploaded_by: opts.uploadedBy,
      uploaded_by_role: opts.uploadedByRole,
      status: 'verified',
      title: titleBase || fileName,
      notes,
      payment_cash_amount: 0,
      payment_credit_amount: 0,
      payment_adjustment: 0,
    };
  });
}

/** Persists delivery proof images on an order (Documents & Proofs → Delivery tab). */
export async function attachDeliveryProofDocuments(
  orderUuid: string,
  proofImageUrls: string[],
  opts: {
    uploadedBy: string;
    uploadedByRole: string;
    title?: string | null;
    notes?: string | null;
  },
): Promise<{ ok: boolean; error?: string; count: number }> {
  if (proofImageUrls.length === 0) return { ok: true, count: 0 };
  const rows = buildDeliveryProofDocumentRows(orderUuid, proofImageUrls, opts);
  const { error } = await insertOrderProofDocuments(rows);
  if (error) return { ok: false, error, count: 0 };
  return { ok: true, count: rows.length };
}

export async function uploadOrderProofBinary(orderUuid: string, folderType: string, file: File) {
  const path = `${ORDER_PROOF_GALLERY_FOLDER}/${orderUuid}/${folderType}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}_${safeFileName(file.name)}`;
  const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (upErr) throw new Error(upErr.message);
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { publicUrl: pub.publicUrl, path };
}

function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120);
}

export function tryExtractStoragePathFromPublicUrl(url: string): string | null {
  try {
    const marker = `/object/public/${STORAGE_BUCKET}/`;
    const i = url.indexOf(marker);
    if (i === -1) return null;
    return decodeURIComponent(url.slice(i + marker.length).split('?')[0] ?? '');
  } catch {
    return null;
  }
}
