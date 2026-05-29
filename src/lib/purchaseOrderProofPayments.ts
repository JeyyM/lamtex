import { supabase } from '@/src/lib/supabase';
import { roundMoney } from '@/src/lib/orderProofPayments';
import {
  effectivePurchaseOrderTotal,
  sumPurchaseOrderLineItemsTotal,
} from '@/src/lib/purchaseOrderTotals';
import type { PoProofDocument, PoProofType } from '@/src/types/purchaseOrderProofs';
import type { PoLineForTotal } from '@/src/lib/purchaseOrderTotals';

export { roundMoney };

const STORAGE_BUCKET = 'images';
export const PO_PROOF_GALLERY_FOLDER = 'po-proofs';

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const x = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(x) ? x : 0;
}

type ProofRow = {
  id: string;
  purchase_order_id: string;
  type: string;
  title: string | null;
  file_name: string | null;
  file_url: string;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_by_role: string | null;
  status: string | null;
  notes: string | null;
  uploaded_at: string;
  payment_cash_amount?: number | string | null;
  payment_credit_amount?: number | string | null;
  payment_adjustment?: number | string | null;
};

export function poProofRowToDocument(row: ProofRow, poNumber: string): PoProofDocument {
  const t = row.type;
  const type: PoProofType =
    t === 'delivery' ? 'delivery' : t === 'payment' ? 'payment' : 'other';
  const role = row.uploaded_by_role;
  const uploadedByRole: PoProofDocument['uploadedByRole'] =
    role === 'Executive' ? 'Executive' : 'Warehouse';
  return {
    id: row.id,
    purchaseOrderId: poNumber,
    type,
    title: row.title?.trim() || undefined,
    fileName: row.file_name ?? 'file',
    fileUrl: row.file_url,
    fileSize: Number(row.file_size ?? 0),
    uploadedBy: row.uploaded_by ?? '',
    uploadedByRole,
    uploadedAt: row.uploaded_at,
    status: (row.status === 'pending' || row.status === 'rejected' ? row.status : 'verified') as PoProofDocument['status'],
    notes: row.notes ?? undefined,
    paymentCashAmount: roundMoney(num(row.payment_cash_amount)),
    paymentCreditAmount: roundMoney(num(row.payment_credit_amount)),
    paymentAdjustment: roundMoney(num(row.payment_adjustment)),
  };
}

export function poProofPaymentParts(row: ProofRow): { cash: number; credit: number; adj: number } {
  if (row.type !== 'payment') return { cash: 0, credit: 0, adj: 0 };
  return {
    cash: roundMoney(num(row.payment_cash_amount)),
    credit: roundMoney(num(row.payment_credit_amount)),
    adj: roundMoney(num(row.payment_adjustment)),
  };
}

export function sumPoPaymentProofRows(proofRows: ProofRow[]): {
  totalPaid: number;
  totalCash: number;
} {
  let totalCash = 0;
  for (const r of proofRows) {
    const { cash, credit, adj } = poProofPaymentParts(r);
    totalCash += cash + credit + adj;
  }
  return {
    totalCash: roundMoney(totalCash),
    totalPaid: roundMoney(totalCash),
  };
}

export type PoProofInsertInput = {
  purchase_order_id: string;
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

export async function insertPurchaseOrderProofDocuments(
  rows: PoProofInsertInput[],
): Promise<{ data: { id: string }[] | null; error: string | null }> {
  if (rows.length === 0) return { data: [], error: null };
  const { data, error } = await supabase.from('purchase_order_proof_documents').insert(rows).select('id');
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as { id: string }[], error: null };
}

export async function fetchPurchaseOrderProofs(poId: string, poNumber: string): Promise<PoProofDocument[]> {
  const { data, error } = await supabase
    .from('purchase_order_proof_documents')
    .select('*')
    .eq('purchase_order_id', poId)
    .order('uploaded_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ProofRow[]).map((r) => poProofRowToDocument(r, poNumber));
}

export async function fetchPoPaymentProofAggregates(poId: string): Promise<{ totalPaid: number }> {
  const { data, error } = await supabase
    .from('purchase_order_proof_documents')
    .select('*')
    .eq('purchase_order_id', poId)
    .eq('type', 'payment');
  if (error) throw new Error(error.message);
  return sumPoPaymentProofRows((data ?? []) as ProofRow[]);
}

export function derivePoPaymentStatus(
  paid: number,
  total: number,
  dueDate: string | null,
): 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue' {
  if (paid >= total && total > 0) return 'Paid';
  if (paid > 0) return 'Partially Paid';
  if (dueDate && new Date(dueDate) < new Date()) return 'Overdue';
  return 'Unpaid';
}

export type SyncPoPaymentResult = { ok: true } | { ok: false; error: string };

export async function syncPurchaseOrderPaymentsFromProofs(
  poId: string,
  options?: { overrideTotalPaid?: number },
): Promise<SyncPoPaymentResult> {
  const { data: poRow, error: oErr } = await supabase
    .from('purchase_orders')
    .select('id, total_amount, amount_paid, payment_status, payment_due_date, status, actual_delivery_date')
    .eq('id', poId)
    .maybeSingle();
  if (oErr) return { ok: false, error: oErr.message };
  if (!poRow) return { ok: false, error: 'Purchase order not found.' };

  const { data: itemRows, error: iErr } = await supabase
    .from('purchase_order_items')
    .select('quantity_ordered, quantity_received, unit_price')
    .eq('order_id', poId);
  if (iErr) return { ok: false, error: iErr.message };

  const lineTotal = sumPurchaseOrderLineItemsTotal((itemRows ?? []) as PoLineForTotal[]);
  const dbTotal = roundMoney(num(poRow.total_amount));
  const totalAmount = effectivePurchaseOrderTotal(dbTotal, lineTotal);

  const { data: proofRows, error: pErr } = await supabase
    .from('purchase_order_proof_documents')
    .select('*')
    .eq('purchase_order_id', poId)
    .eq('type', 'payment');
  if (pErr) return { ok: false, error: pErr.message };

  const summed = sumPoPaymentProofRows((proofRows ?? []) as ProofRow[]);
  let totalPaid = summed.totalPaid;
  if (options?.overrideTotalPaid !== undefined) {
    totalPaid = roundMoney(options.overrideTotalPaid);
  }

  const paymentStatus = derivePoPaymentStatus(
    totalPaid,
    totalAmount,
    poRow.payment_due_date as string | null,
  );

  const poUpdate: Record<string, unknown> = {
    amount_paid: totalPaid,
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };
  if (dbTotal <= 0 && totalAmount > 0) {
    poUpdate.total_amount = totalAmount;
  }

  // A PO becomes "Completed" only once it is BOTH fully received AND fully paid.
  // When this payment clears the balance on an already fully-received PO, promote it.
  const items = (itemRows ?? []) as { quantity_ordered?: number | string | null; quantity_received?: number | string | null }[];
  const fullyReceived =
    items.length > 0 && items.every((i) => num(i.quantity_received) >= num(i.quantity_ordered));
  const currentStatus = (poRow.status as string | null) ?? '';
  if (
    paymentStatus === 'Paid' &&
    fullyReceived &&
    ['Sent', 'Confirmed', 'Partially Received', 'Received'].includes(currentStatus)
  ) {
    poUpdate.status = 'Completed';
    if (!poRow.actual_delivery_date) {
      poUpdate.actual_delivery_date = new Date().toISOString().split('T')[0];
    }
  }

  const { error: ouErr } = await supabase
    .from('purchase_orders')
    .update(poUpdate)
    .eq('id', poId);
  if (ouErr) return { ok: false, error: ouErr.message };

  return { ok: true };
}

export function computePoAmountPaidAfterProofIncrement(params: {
  proofPaidBefore: number;
  poAmountPaid: number;
  cashIncrement: number;
}): number {
  const baseline =
    params.proofPaidBefore < 0.01 ? roundMoney(params.poAmountPaid) : roundMoney(params.proofPaidBefore);
  return roundMoney(baseline + params.cashIncrement);
}

export function fileNameFromPublicUrl(fileUrl: string): string {
  const raw = fileUrl.split('/').pop()?.split('?')[0] ?? 'image';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function buildPoDeliveryProofDocumentRows(
  poId: string,
  proofImageUrls: string[],
  opts: {
    uploadedBy: string;
    uploadedByRole: string;
    title?: string | null;
    notes?: string | null;
  },
): PoProofInsertInput[] {
  const titleBase = opts.title?.trim() || null;
  const notes = opts.notes?.trim() || null;
  return proofImageUrls.map((fileUrl) => {
    const fileName = fileNameFromPublicUrl(fileUrl);
    return {
      purchase_order_id: poId,
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

export async function attachPoDeliveryProofDocuments(
  poId: string,
  proofImageUrls: string[],
  opts: {
    uploadedBy: string;
    uploadedByRole: string;
    title?: string | null;
    notes?: string | null;
  },
): Promise<{ ok: boolean; error?: string; count: number }> {
  if (proofImageUrls.length === 0) return { ok: true, count: 0 };
  const rows = buildPoDeliveryProofDocumentRows(poId, proofImageUrls, opts);
  const { error } = await insertPurchaseOrderProofDocuments(rows);
  if (error) return { ok: false, error, count: 0 };
  return { ok: true, count: rows.length };
}

function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120);
}

export async function uploadPurchaseOrderProofBinary(poId: string, folderType: string, file: File) {
  const path = `${PO_PROOF_GALLERY_FOLDER}/${poId}/${folderType}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}_${safeFileName(file.name)}`;
  const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) throw new Error(upErr.message);
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { publicUrl: pub.publicUrl, path };
}

export function poProofFileIsImageName(fileName: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg|heic|heif)$/i.test(fileName);
}

export async function deletePurchaseOrderProof(proofId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('purchase_order_proof_documents').delete().eq('id', proofId);
  return { error: error?.message ?? null };
}

export type PoProofUpdateInput = {
  title?: string | null;
  notes?: string | null;
  payment_cash_amount?: number;
};

export async function updatePurchaseOrderProofDocument(
  proofId: string,
  input: PoProofUpdateInput,
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.payment_cash_amount !== undefined) payload.payment_cash_amount = input.payment_cash_amount;
  const { error } = await supabase.from('purchase_order_proof_documents').update(payload).eq('id', proofId);
  return { error: error?.message ?? null };
}
