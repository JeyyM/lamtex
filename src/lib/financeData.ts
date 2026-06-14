/**
 * Finance / Invoices & Payments data layer.
 *
 * Frames everything around live data instead of formal "invoices":
 *  - Outstanding orders (balance_due > 0): agent column = customer's assigned_agent;
 *    due date = actual_delivery + payment_terms (COD = next day after delivery; Net N = N days after).
 *  - Customer credit utilization (customers.credit_limit / outstanding_balance)
 *  - Payment proofs uploaded by agents (order_proof_documents type='payment')
 *  - Digital receipts (digital_receipts) generated after a verified payment
 *  - Agent commission release per period (agent_commissions)
 */

import { supabase } from '@/src/lib/supabase';
import { fetchTripNumbersByOrderIds } from '@/src/lib/orderTripLookup';
import {
  evaluateOrderFinanceCompletion,
  proofCashAmount,
  proofRequiresCommissionPayout,
} from '@/src/lib/orderCommissionCompletion';
import { proofPaymentParts } from '@/src/lib/orderProofPayments';
import {
  clientCommissionFraction,
  clientCommissionPercentLabel,
  type ClientType,
} from '@/src/types/customers';

export type OutstandingOrderRow = {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerCode: string | null;
  customerName: string | null;
  agentId: string | null;
  agentCode: string | null;
  agentName: string | null;
  branchId: string | null;
  branchName: string | null;
  orderDate: string | null;
  dueDate: string | null;
  paymentTerms: string | null;
  paymentMethod: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  daysOverdue: number;
  tripId: string | null;
  tripNumber: string | null;
};

export type CustomerCreditRow = {
  customerId: string;
  customerName: string;
  assignedAgentId: string | null;
  paymentTerms: string | null;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  utilizationPercent: number;
  overdueAmount: number;
  paymentScore: number | null;
  status: 'Good' | 'Warning' | 'Exceeded';
};

/** One row per order that has at least one payment proof uploaded. */
export type OrderWithPaymentProofsRow = {
  orderId: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string | null;
  agentName: string | null;
  agentId: string | null;
  /** Order's direct agent_id (for agent-scoped views). */
  orderAgentId: string | null;
  /** Customer's assigned_agent_id when set. */
  assignedAgentId: string | null;
  orderStatus: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  proofCount: number;
  totalProofAmount: number;
  totalCashOnProofs: number;
  cashProofCount: number;
  lastProofAt: string | null;
  pendingCashCommissionCount: number;
  allCashCommissionsReleased: boolean;
  tripId: string | null;
  tripNumber: string | null;
};

export type OrderCommissionProofRow = {
  id: string;
  orderId: string;
  title: string | null;
  fileName: string | null;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string | null;
  userNotes: string | null;
  cashAmount: number;
  creditAmount: number;
  adjustment: number;
  requiresCommission: boolean;
  commissionAmount: number;
  commissionPaidAt: string | null;
  commissionPaidBy: string | null;
};

export type OrderCommissionModalData = {
  proofs: OrderCommissionProofRow[];
  clientType: ClientType;
  commissionPercentLabel: string;
};

export function computeProofCommissionAmount(cashAmount: number, commissionRate: number): number {
  if (cashAmount <= 0 || commissionRate <= 0) return 0;
  return Math.round(cashAmount * (commissionRate / 100) * 100) / 100;
}

/** Commission on cash using customer Office (0.5%) / Personal (1%) client type. */
export function computeProofCommissionForClientType(cashAmount: number, clientType: string): number {
  if (cashAmount <= 0) return 0;
  return Math.round(cashAmount * clientCommissionFraction(clientType) * 100) / 100;
}

/** User-entered notes on a payment proof (title is separate). */
export function extractProofUserNotes(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const parsed = parseProofNotes(raw);
  if (parsed.notes?.trim()) return parsed.notes.trim();
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (typeof obj.notes === 'string' && obj.notes.trim()) return obj.notes.trim();
  } catch {
    if (!raw.trim().startsWith('{')) return raw.trim();
  }
  return null;
}

export type PaymentProofRow = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
  agentName: string | null;
  fileName: string | null;
  fileUrl: string;
  fileSize: number | null;
  uploadedBy: string | null;
  uploadedByRole: string | null;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  notes: string | null;
  rejectionReason: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  /**
   * Amount the proof claims to cover. Stored on the proof record `notes` JSON when
   * uploaded; pulled out as a structured field for the table.
   */
  claimedAmount: number | null;
  paymentMethod: string | null;
  referenceNumber: string | null;
  orderTotal: number | null;
  orderBalance: number | null;
};

export type DigitalReceiptRow = {
  id: string;
  receiptNumber: string;
  orderId: string | null;
  orderNumber: string | null;
  paymentTransactionId: string | null;
  customerName: string | null;
  paidAt: string;
  paymentMethod: string;
  invoiceAmount: number;
  totalPaid: number;
  publicUrl: string;
  pdfUrl: string | null;
};

export type AgentCommissionRow = {
  id: string;
  employeeId: string;
  agentName: string | null;
  period: string;
  salesAmount: number;
  commissionRate: number;
  commissionEarned: number;
  status: 'Pending' | 'Approved' | 'Paid';
  paidDate: string | null;
  breakdown: Array<{
    orderNumber: string;
    customerName?: string | null;
    saleAmount?: number;
    paymentAmount?: number;
    commission?: number;
    paidAt?: string;
  }>;
};

export type FinanceMetrics = {
  totalOutstanding: number;
  totalOverdue: number;
  overdueCount: number;
  collectedThisMonth: number;
  pendingProofs: number;
  /** Cash proof commissions not yet marked paid by executive. */
  pendingCommissions: number;
  pendingCommissionCount: number;
  /** Cash proof commissions already marked paid (commission_paid_at set). */
  commissionsPaidOut: number;
};

const ACTIVE_ORDER_STATUSES = [
  'Approved',
  'Scheduled',
  'Loading',
  'Packed',
  'Ready',
  'In Transit',
  'Partially Fulfilled',
  'Delivered',
  'Completed',
];

/** Statuses that should be checked for overdue (excludes already-Paid). */
const OVERDUEABLE_STATUSES = ['Unbilled', 'Invoiced', 'Partially Paid', 'On Credit'];

/** Parse YYYY-MM-DD (or leading portion) as a local calendar date. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }
  const dt = new Date(value);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function diffDaysFromToday(iso: string | null | undefined): number {
  const d = parseDateOnly(iso ?? null);
  if (!d) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.floor((today - d.getTime()) / 86_400_000);
}

export function formatDateOnlyLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * Persistable `orders.due_date` from payment terms (+ optional customer default terms)
 * and `actual_delivery` when set, otherwise `order_date`.
 * Ignores any previously stored due_date — use when saving after terms or delivery dates change.
 */
export function deriveOrderDueDateForPersistence(params: {
  order_date: string | null | undefined;
  actual_delivery: string | null | undefined;
  payment_terms: string | null | undefined;
  customer_payment_terms: string | null | undefined;
}): string | null {
  const terms = params.payment_terms ?? params.customer_payment_terms ?? null;
  const fromDelivery = computeDueDateFromDelivery(params.actual_delivery ?? null, terms);
  if (fromDelivery) return formatDateOnlyLocal(fromDelivery);

  const base = parseDateOnly(params.order_date ?? null);
  if (!base) return null;
  const termsUp = (terms ?? 'COD').trim().toUpperCase();
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (termsUp === 'COD' || termsUp.includes('COD')) {
    d.setDate(d.getDate() + 1);
  } else {
    const m = termsUp.match(/\d+/);
    d.setDate(d.getDate() + (m ? parseInt(m[0], 10) : 30));
  }
  return formatDateOnlyLocal(d);
}

/**
 * Payment due date = delivery date (actual_delivery) + payment terms.
 * COD / cash on delivery: next calendar day after delivery.
 * Net N (e.g. Net 30): N calendar days after delivery.
 */
export function computeDueDateFromDelivery(deliveryDate: string | null, paymentTerms: string | null): Date | null {
  const base = parseDateOnly(deliveryDate);
  if (!base) return null;
  const terms = (paymentTerms ?? '').trim().toUpperCase();
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (terms === 'COD' || terms === 'CASH ON DELIVERY') {
    d.setDate(d.getDate() + 1);
  } else {
    const match = terms.match(/\d+/);
    if (!match) return null;
    const days = parseInt(match[0], 10);
    d.setDate(d.getDate() + days);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * For every order in the list that should be overdue (computed due < today and
 * payment_status is still an unpaid/credit status), mark in DB and notify once.
 * Due is derived from actual_delivery + payment_terms (not stored due_date alone).
 */
async function syncOverdueStatuses(
  rows: Array<{
    id: string;
    actualDelivery: string | null;
    paymentTerms: string | null;
    paymentStatus: string;
  }>,
): Promise<Set<string>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueIds = new Set<string>();
  for (const r of rows) {
    if (r.paymentStatus === 'Overdue') {
      overdueIds.add(r.id);
      continue;
    }
    if (!OVERDUEABLE_STATUSES.includes(r.paymentStatus)) continue;
    const due = computeDueDateFromDelivery(r.actualDelivery, r.paymentTerms);
    if (due && due < today) overdueIds.add(r.id);
  }

  try {
    const { processNewlyOverdueOrders } = await import('@/src/lib/notifications/notificationsData');
    const newlyMarked = await processNewlyOverdueOrders();
    for (const id of newlyMarked.keys()) overdueIds.add(id);
  } catch {
    const fallbackIds = [...overdueIds].filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row && OVERDUEABLE_STATUSES.includes(row.paymentStatus);
    });
    if (fallbackIds.length > 0) {
      try {
        await supabase.from('orders').update({ payment_status: 'Overdue' }).in('id', fallbackIds);
      } catch {
        // best-effort
      }
    }
  }

  return overdueIds;
}

function num(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function nestedName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.name === 'string') return v.name;
  if (typeof v.employee_name === 'string') return v.employee_name;
  return null;
}

function assignedAgentFromCustomerEmbed(
  cust: unknown,
): { id: string | null; name: string | null; code: string | null } {
  if (!cust || typeof cust !== 'object') return { id: null, name: null, code: null };
  const c = cust as Record<string, unknown>;
  const id = asString(c.assigned_agent_id);
  const emb = c.employees;
  if (emb && typeof emb === 'object') {
    const e = emb as Record<string, unknown>;
    return { id, name: asString(e.employee_name), code: asString(e.employee_id) };
  }
  return { id, name: null, code: null };
}

const FINANCE_ORDER_PAYMENT_STATUSES = [
  'Unbilled',
  'Invoiced',
  'Partially Paid',
  'Paid',
  'Overdue',
  'On Credit',
] as const;

/** Finance list: only orders with at least partial delivery recorded. */
const FINANCE_DELIVERED_ORDER_STATUSES = ['Partially Fulfilled', 'Delivered', 'Completed'] as const;

/**
 * Orders for Finance → Outstanding tab: delivered (or partially delivered) orders with tracked payment status.
 * Auto-syncs overdue statuses on fetch (best-effort).
 */
export async function fetchOutstandingOrders(branchId?: string | null): Promise<OutstandingOrderRow[]> {
  let q = supabase
    .from('orders')
    .select(
      `id, order_number, customer_id, customer_name, agent_id, agent_name, branch_id,
       order_date, due_date, actual_delivery, payment_terms, payment_method, status, payment_status,
       total_amount, amount_paid, balance_due,
       branches(name),
       customers(customer_code, name, assigned_agent_id, employees!assigned_agent_id(id, employee_name, employee_id))`,
    )
    .in('status', [...FINANCE_DELIVERED_ORDER_STATUSES])
    .in('payment_status', [...FINANCE_ORDER_PAYMENT_STATUSES])
    .order('order_date', { ascending: false });

  if (branchId) q = q.eq('branch_id', branchId);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return [];

  // Auto-mark overdue orders in the DB before mapping rows for display
  const overdueIds = await syncOverdueStatuses(
    rows.map((r) => ({
      id: String(r.id),
      actualDelivery: asString(r.actual_delivery),
      paymentTerms: asString(r.payment_terms),
      paymentStatus: asString(r.payment_status) ?? 'Unbilled',
    })),
  );

  const mapped = rows.map((r) => {
    const branch = nestedName(r.branches);
    const custEmbed = r.customers;
    const cust = assignedAgentFromCustomerEmbed(custEmbed);
    const customerName = nestedName(custEmbed) ?? asString(r.customer_name);
    const customerCode =
      custEmbed && typeof custEmbed === 'object'
        ? asString((custEmbed as Record<string, unknown>).customer_code)
        : null;
    const delivery = asString(r.actual_delivery);
    const terms = asString(r.payment_terms);
    const computedDueDt = computeDueDateFromDelivery(delivery, terms);
    const due = computedDueDt ? formatDateOnlyLocal(computedDueDt) : null;

    const rawStatus = asString(r.payment_status) ?? 'Unbilled';
    const paymentStatus = overdueIds.has(String(r.id)) ? 'Overdue' : rawStatus;

    const agentId = cust.id;
    const agentName = cust.id ? (cust.name ?? '—') : null;
    const agentCode = cust.code;

    return {
      id: String(r.id),
      orderNumber: asString(r.order_number) ?? String(r.id),
      customerId: asString(r.customer_id),
      customerCode,
      customerName,
      agentId,
      agentCode,
      agentName,
      branchId: asString(r.branch_id),
      branchName: branch,
      orderDate: asString(r.order_date),
      dueDate: due,
      paymentTerms: terms,
      paymentMethod: asString(r.payment_method),
      status: asString(r.status) ?? '—',
      paymentStatus,
      totalAmount: num(r.total_amount),
      amountPaid: num(r.amount_paid),
      balanceDue: num(r.balance_due),
      daysOverdue: due ? Math.max(0, diffDaysFromToday(due)) : 0,
      tripId: null,
      tripNumber: null,
    };
  });

  mapped.sort((a, b) => {
    const da = a.dueDate ? parseDateOnly(a.dueDate) : null;
    const db = b.dueDate ? parseDateOnly(b.dueDate) : null;
    const ta = da ? da.getTime() : Number.POSITIVE_INFINITY;
    const tb = db ? db.getTime() : Number.POSITIVE_INFINITY;
    return ta - tb;
  });

  const tripByOrder = await fetchTripNumbersByOrderIds(mapped.map((m) => m.id));
  return mapped.map((m) => {
    const trip = tripByOrder.get(m.id);
    return {
      ...m,
      tripId: trip?.tripId ?? null,
      tripNumber: trip?.tripNumber ?? null,
    };
  });
}

/** Customers with credit configured or any outstanding balance. */
export async function fetchCustomerCredit(): Promise<CustomerCreditRow[]> {
  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, name, assigned_agent_id, payment_terms, credit_limit, outstanding_balance, available_credit, overdue_amount, payment_score',
    )
    .order('outstanding_balance', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>)
    .filter((r) => num(r.credit_limit) > 0 || num(r.outstanding_balance) > 0)
    .map((r) => {
      const limit = num(r.credit_limit);
      const outstanding = num(r.outstanding_balance);
      const available = limit > 0 ? Math.max(0, limit - outstanding) : 0;
      const utilization = limit > 0 ? (outstanding / limit) * 100 : 0;
      let status: CustomerCreditRow['status'] = 'Good';
      if (utilization > 100) status = 'Exceeded';
      else if (utilization > 80) status = 'Warning';
      return {
        customerId: String(r.id),
        customerName: asString(r.name) ?? '—',
        assignedAgentId: asString(r.assigned_agent_id),
        paymentTerms: asString(r.payment_terms),
        creditLimit: limit,
        outstandingBalance: outstanding,
        availableCredit: available,
        utilizationPercent: Math.min(utilization, 999),
        overdueAmount: num(r.overdue_amount),
        paymentScore: r.payment_score == null ? null : num(r.payment_score),
        status,
      };
    });
}

function proofRowAmount(r: Record<string, unknown>): number {
  let cash = num(r.payment_cash_amount);
  let credit = num(r.payment_credit_amount);
  let adj = num(r.payment_adjustment);
  if (cash === 0 && credit === 0 && adj === 0) {
    const meta = parseProofNotes(asString(r.notes));
    if (meta.amount != null) return meta.amount;
  }
  return Math.round((cash + credit + adj + Number.EPSILON) * 100) / 100;
}

function proofLiteFromRecord(r: Record<string, unknown>) {
  const notes = asString(r.notes);
  return {
    id: String(r.id ?? ''),
    type: 'payment' as const,
    payment_cash_amount: r.payment_cash_amount as number | string | null | undefined,
    payment_credit_amount: r.payment_credit_amount as number | string | null | undefined,
    payment_adjustment: r.payment_adjustment as number | string | null | undefined,
    notes,
  };
}

function proofCashFromRecord(r: Record<string, unknown>): number {
  const notes = asString(r.notes);
  return proofPaymentParts({
    id: String(r.id ?? ''),
    order_id: String(r.order_id ?? ''),
    type: 'payment',
    title: null,
    file_name: null,
    file_url: '',
    file_size: null,
    uploaded_by: null,
    uploaded_by_role: null,
    status: null,
    notes,
    uploaded_at: String(r.uploaded_at ?? ''),
    payment_cash_amount: r.payment_cash_amount as number | string | null | undefined,
    payment_credit_amount: r.payment_credit_amount as number | string | null | undefined,
    payment_adjustment: r.payment_adjustment as number | string | null | undefined,
  }).cash;
}

/** Orders that have one or more payment proof documents (grouped per order). */
export async function fetchOrdersWithPaymentProofs(): Promise<OrderWithPaymentProofsRow[]> {
  const { data, error } = await supabase
    .from('order_proof_documents')
    .select(
      `id, order_id, uploaded_at, type,
       payment_cash_amount, payment_credit_amount, payment_adjustment, notes,
       commission_paid_at`,
    )
    .eq('type', 'payment')
    .order('uploaded_at', { ascending: false });

  if (error) throw error;

  const proofRows = (data ?? []) as Array<Record<string, unknown>>;
  if (proofRows.length === 0) return [];

  const orderIds = [...new Set(proofRows.map((r) => String(r.order_id ?? '')))].filter(Boolean);
  const orderById = new Map<string, Record<string, unknown>>();
  const chunkSz = 120;
  for (let j = 0; j < orderIds.length; j += chunkSz) {
    const slice = orderIds.slice(j, j + chunkSz);
    const { data: orderRows, error: orderErr } = await supabase
      .from('orders')
      .select(
        `id, order_number, customer_id, customer_name, agent_id, agent_name, status,
         total_amount, amount_paid, balance_due, payment_status,
         customers(name, assigned_agent_id, employees!assigned_agent_id(employee_name))`,
      )
      .in('id', slice);
    if (orderErr) throw orderErr;
    for (const o of (orderRows ?? []) as Record<string, unknown>[]) {
      orderById.set(String(o.id ?? ''), o);
    }
  }

  const byOrder = new Map<
    string,
    OrderWithPaymentProofsRow & { _lastMs: number; _proofs: Array<Record<string, unknown>> }
  >();

  for (const r of proofRows) {
    const orderId = String(r.order_id ?? '');
    const order = orderById.get(orderId) ?? null;
    if (!order) continue;

    const custEmbed = order.customers ?? null;
    const assigned = assignedAgentFromCustomerEmbed(custEmbed);
    const orderAgentId = asString(order.agent_id);
    const orderAgentName = asString(order.agent_name);
    const agentName = assigned.id != null ? (assigned.name ?? '—') : orderAgentName;
    const uploadedAt = String(r.uploaded_at ?? '');
    const uploadedMs = uploadedAt ? new Date(uploadedAt).getTime() : 0;
    const amt = proofRowAmount(r);
    const cash = proofCashFromRecord(r);
    const lite = proofLiteFromRecord(r);
    const isCashProof = proofRequiresCommissionPayout(lite);

    const existing = byOrder.get(orderId);
    if (!existing) {
      byOrder.set(orderId, {
        orderId,
        orderNumber: asString(order.order_number) ?? orderId,
        customerId: asString(order.customer_id),
        customerName: nestedName(custEmbed) ?? asString(order.customer_name),
        agentName,
        agentId: assigned.id ?? orderAgentId,
        orderAgentId,
        assignedAgentId: assigned.id,
        orderStatus: asString(order.status) ?? '—',
        totalAmount: num(order.total_amount),
        amountPaid: num(order.amount_paid),
        balanceDue: num(order.balance_due),
        paymentStatus: asString(order.payment_status) ?? '—',
        proofCount: 1,
        totalProofAmount: amt,
        totalCashOnProofs: cash,
        cashProofCount: isCashProof ? 1 : 0,
        lastProofAt: uploadedAt || null,
        pendingCashCommissionCount: 0,
        allCashCommissionsReleased: true,
        tripId: null,
        tripNumber: null,
        _lastMs: uploadedMs,
        _proofs: [r],
      });
    } else {
      existing.proofCount += 1;
      existing.totalProofAmount = Math.round((existing.totalProofAmount + amt + Number.EPSILON) * 100) / 100;
      existing.totalCashOnProofs = Math.round((existing.totalCashOnProofs + cash + Number.EPSILON) * 100) / 100;
      if (isCashProof) existing.cashProofCount += 1;
      existing._proofs.push(r);
      if (uploadedMs > existing._lastMs) {
        existing._lastMs = uploadedMs;
        existing.lastProofAt = uploadedAt || null;
      }
    }
  }

  const enriched = Array.from(byOrder.values())
    .map(({ _lastMs: _, _proofs, ...row }) => {
      const proofLites = _proofs.map((p) => ({
        id: String(p.id),
        type: 'payment' as const,
        payment_cash_amount: p.payment_cash_amount as number | string | null | undefined,
        payment_credit_amount: p.payment_credit_amount as number | string | null | undefined,
        payment_adjustment: p.payment_adjustment as number | string | null | undefined,
        notes: asString(p.notes),
        commission_paid_at: p.commission_paid_at != null ? String(p.commission_paid_at) : null,
      }));
      const finance = evaluateOrderFinanceCompletion({
        totalAmount: row.totalAmount,
        amountPaid: row.amountPaid,
        balanceDue: row.balanceDue,
        proofs: proofLites,
      });
      return {
        ...row,
        pendingCashCommissionCount: finance.pendingCashCommissionCount,
        allCashCommissionsReleased: finance.allCashCommissionsReleased,
      };
    })
    .sort((a, b) => {
      const ta = a.lastProofAt ? new Date(a.lastProofAt).getTime() : 0;
      const tb = b.lastProofAt ? new Date(b.lastProofAt).getTime() : 0;
      return tb - ta;
    });

  const tripByOrder = await fetchTripNumbersByOrderIds(enriched.map((r) => r.orderId));
  return enriched.map((row) => {
    const trip = tripByOrder.get(row.orderId);
    return {
      ...row,
      tripId: trip?.tripId ?? null,
      tripNumber: trip?.tripNumber ?? null,
    };
  });
}

/** Agent dashboard / finance views: order agent or assigned customer agent. */
function normEmployeeId(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t.toLowerCase() : null;
}

export function commissionOrderMatchesAgent(row: OrderWithPaymentProofsRow, employeeId: string): boolean {
  const me = normEmployeeId(employeeId);
  if (!me) return false;
  return (
    normEmployeeId(row.orderAgentId) === me ||
    normEmployeeId(row.assignedAgentId) === me ||
    normEmployeeId(row.agentId) === me
  );
}

export function outstandingOrderMatchesAgent(row: OutstandingOrderRow, employeeId: string): boolean {
  const me = normEmployeeId(employeeId);
  if (!me) return false;
  return normEmployeeId(row.agentId) === me;
}

export function customerCreditMatchesAgent(row: CustomerCreditRow, employeeId: string): boolean {
  const me = normEmployeeId(employeeId);
  if (!me) return false;
  return normEmployeeId(row.assignedAgentId) === me;
}

async function fetchCustomerClientType(customerId: string | null): Promise<ClientType> {
  if (!customerId) return 'Office';
  const { data, error } = await supabase
    .from('customers')
    .select('client_type')
    .eq('id', customerId)
    .maybeSingle();
  if (error || !data) return 'Office';
  const raw = String(data.client_type ?? 'Office');
  return raw === 'Personal' ? 'Personal' : 'Office';
}

/** Payment proofs + customer client type for commission release modal. */
export async function fetchOrderCommissionModalData(
  orderId: string,
  customerId: string | null,
): Promise<OrderCommissionModalData> {
  const [{ data, error }, clientType] = await Promise.all([
    supabase
      .from('order_proof_documents')
      .select(
        `id, order_id, title, file_name, file_url, uploaded_at, uploaded_by, type,
         payment_cash_amount, payment_credit_amount, payment_adjustment, notes,
         commission_paid_at, commission_paid_by`,
      )
      .eq('order_id', orderId)
      .eq('type', 'payment')
      .order('uploaded_at', { ascending: false }),
    fetchCustomerClientType(customerId),
  ]);

  if (error) throw error;

  const proofs = ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const parts = proofPaymentParts({
      id: String(r.id),
      order_id: orderId,
      type: 'payment',
      title: asString(r.title),
      file_name: asString(r.file_name),
      file_url: String(r.file_url ?? ''),
      file_size: null,
      uploaded_by: asString(r.uploaded_by),
      uploaded_by_role: null,
      status: null,
      notes: asString(r.notes),
      uploaded_at: String(r.uploaded_at ?? ''),
      payment_cash_amount: r.payment_cash_amount,
      payment_credit_amount: r.payment_credit_amount,
      payment_adjustment: r.payment_adjustment,
    });
    const requiresCommission = proofRequiresCommissionPayout({
      id: String(r.id),
      type: 'payment',
      payment_cash_amount: r.payment_cash_amount,
      payment_credit_amount: r.payment_credit_amount,
      payment_adjustment: r.payment_adjustment,
      notes: asString(r.notes),
    });
    const cashAmount = parts.cash;
    return {
      id: String(r.id),
      orderId,
      title: asString(r.title),
      fileName: asString(r.file_name),
      fileUrl: String(r.file_url ?? ''),
      uploadedAt: String(r.uploaded_at ?? ''),
      uploadedBy: asString(r.uploaded_by),
      userNotes: extractProofUserNotes(asString(r.notes)),
      cashAmount,
      creditAmount: parts.credit,
      adjustment: parts.adj,
      requiresCommission,
      commissionAmount: computeProofCommissionForClientType(cashAmount, clientType),
      commissionPaidAt: r.commission_paid_at != null ? String(r.commission_paid_at) : null,
      commissionPaidBy: asString(r.commission_paid_by),
    };
  });

  return {
    proofs,
    clientType,
    commissionPercentLabel: clientCommissionPercentLabel(clientType),
  };
}

/** @deprecated Use fetchOrderCommissionModalData */
export async function fetchOrderCommissionProofs(orderId: string): Promise<OrderCommissionProofRow[]> {
  const { proofs } = await fetchOrderCommissionModalData(orderId, null);
  return proofs;
}

/** Payment proofs (uploaded by agents, awaiting/done verification). */
export async function fetchPaymentProofs(
  filter: 'all' | 'pending' | 'verified' | 'rejected' = 'pending',
): Promise<PaymentProofRow[]> {
  let q = supabase
    .from('order_proof_documents')
    .select(
      `id, order_id, file_name, file_url, file_size, uploaded_by, uploaded_by_role,
       uploaded_at, status, notes, rejection_reason, verified_by, verified_at,
       orders(order_number, customer_name, agent_name, total_amount, balance_due,
         customers(name, assigned_agent_id, employees!assigned_agent_id(employee_name)))`,
    )
    .eq('type', 'payment')
    .order('uploaded_at', { ascending: false });

  if (filter !== 'all') q = q.eq('status', filter);

  const { data, error } = await q;
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const order = (r.orders ?? null) as Record<string, unknown> | null;
    const custEmbed = order?.customers ?? null;
    const assigned = assignedAgentFromCustomerEmbed(custEmbed);
    const orderAgentName = order ? asString(order.agent_name) : null;
    const agentName = assigned.id != null ? (assigned.name ?? '—') : orderAgentName;
    const meta = parseProofNotes(asString(r.notes));
    return {
      id: String(r.id),
      orderId: String(r.order_id),
      orderNumber: order ? asString(order.order_number) : null,
      customerName: order ? asString(order.customer_name) : null,
      agentName,
      fileName: asString(r.file_name),
      fileUrl: String(r.file_url ?? ''),
      fileSize: r.file_size == null ? null : num(r.file_size),
      uploadedBy: asString(r.uploaded_by),
      uploadedByRole: asString(r.uploaded_by_role),
      uploadedAt: String(r.uploaded_at ?? ''),
      status: (asString(r.status) as PaymentProofRow['status']) ?? 'pending',
      notes: meta.notes,
      rejectionReason: asString(r.rejection_reason),
      verifiedBy: asString(r.verified_by),
      verifiedAt: asString(r.verified_at),
      claimedAmount: meta.amount,
      paymentMethod: meta.method,
      referenceNumber: meta.reference,
      orderTotal: order ? num(order.total_amount) : null,
      orderBalance: order ? num(order.balance_due) : null,
    };
  });
}

/** Encode payment metadata into the `notes` field as JSON so we don't need a schema change. */
export function encodeProofNotes(input: {
  amount: number | null;
  method: string | null;
  reference: string | null;
  notes: string | null;
}): string {
  return JSON.stringify({
    amount: input.amount,
    method: input.method,
    reference: input.reference,
    notes: input.notes,
  });
}

export function parseProofNotes(raw: string | null): {
  amount: number | null;
  method: string | null;
  reference: string | null;
  notes: string | null;
} {
  if (!raw) return { amount: null, method: null, reference: null, notes: null };
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return {
      amount: obj.amount == null ? null : num(obj.amount),
      method: typeof obj.method === 'string' ? obj.method : null,
      reference: typeof obj.reference === 'string' ? obj.reference : null,
      notes: typeof obj.notes === 'string' ? obj.notes : null,
    };
  } catch {
    return { amount: null, method: null, reference: null, notes: raw };
  }
}

export async function fetchDigitalReceipts(): Promise<DigitalReceiptRow[]> {
  const { data, error } = await supabase
    .from('digital_receipts')
    .select(
      `id, receipt_number, order_id, payment_transaction_id, customer_name,
       paid_at, payment_method, invoice_amount, total_paid, public_url, pdf_url,
       orders(order_number)`,
    )
    .order('paid_at', { ascending: false })
    .limit(250);
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const order = (r.orders ?? null) as Record<string, unknown> | null;
    return {
      id: String(r.id),
      receiptNumber: asString(r.receipt_number) ?? String(r.id),
      orderId: asString(r.order_id),
      orderNumber: order ? asString(order.order_number) : null,
      paymentTransactionId: asString(r.payment_transaction_id),
      customerName: asString(r.customer_name),
      paidAt: String(r.paid_at ?? ''),
      paymentMethod: asString(r.payment_method) ?? '—',
      invoiceAmount: num(r.invoice_amount),
      totalPaid: num(r.total_paid),
      publicUrl: asString(r.public_url) ?? `/receipt/${String(r.id)}`,
      pdfUrl: asString(r.pdf_url),
    };
  });
}

/** YYYY-MM in local time. */
export function periodKeyForDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Commission rows for a given period (YYYY-MM). */
export async function fetchAgentCommissionsForPeriod(period: string): Promise<AgentCommissionRow[]> {
  const { data, error } = await supabase
    .from('agent_commissions')
    .select(
      `id, employee_id, period, sales_amount, commission_rate, commission_earned,
       status, paid_date, breakdown, employees(employee_name)`,
    )
    .eq('period', period)
    .order('commission_earned', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const emp = (r.employees ?? null) as Record<string, unknown> | null;
    const breakdownRaw = Array.isArray(r.breakdown) ? r.breakdown : [];
    return {
      id: String(r.id),
      employeeId: String(r.employee_id),
      agentName: emp ? asString(emp.employee_name) : null,
      period: String(r.period ?? period),
      salesAmount: num(r.sales_amount),
      commissionRate: num(r.commission_rate),
      commissionEarned: num(r.commission_earned),
      status: (asString(r.status) as AgentCommissionRow['status']) ?? 'Pending',
      paidDate: asString(r.paid_date),
      breakdown: breakdownRaw.map((b) => {
        const o = (b ?? {}) as Record<string, unknown>;
        return {
          orderNumber: String(o.orderNumber ?? o.order_number ?? ''),
          customerName: asString(o.customerName ?? o.customer_name),
          saleAmount: o.saleAmount == null ? undefined : num(o.saleAmount),
          paymentAmount: o.paymentAmount == null ? undefined : num(o.paymentAmount),
          commission: o.commission == null ? undefined : num(o.commission),
          paidAt: asString(o.paidAt ?? o.paid_at) ?? undefined,
        };
      }),
    };
  });
}

function clientTypeFromProofOrderEmbed(order: Record<string, unknown> | null): ClientType {
  if (!order) return 'Office';
  const custEmbed = order.customers ?? null;
  const cust = Array.isArray(custEmbed) ? custEmbed[0] : custEmbed;
  if (!cust || typeof cust !== 'object') return 'Office';
  const raw = String((cust as Record<string, unknown>).client_type ?? 'Office');
  return raw === 'Personal' ? 'Personal' : 'Office';
}

/** Sum pending / paid-out commission from payment proofs (Office 0.5%, Personal 1% on cash). */
async function fetchCommissionTotalsFromProofs(): Promise<{
  pendingCommissions: number;
  commissionsPaidOut: number;
  pendingCommissionCount: number;
}> {
  const { data, error } = await supabase
    .from('order_proof_documents')
    .select(
      `payment_cash_amount, payment_credit_amount, payment_adjustment, notes, commission_paid_at,
       orders(customers(client_type))`,
    )
    .eq('type', 'payment');

  if (error) throw error;

  let pendingCommissions = 0;
  let commissionsPaidOut = 0;
  let pendingCommissionCount = 0;

  for (const r of (data ?? []) as Array<Record<string, unknown>>) {
    if (!proofRequiresCommissionPayout({
      id: '',
      type: 'payment',
      payment_cash_amount: r.payment_cash_amount,
      payment_credit_amount: r.payment_credit_amount,
      payment_adjustment: r.payment_adjustment,
      notes: asString(r.notes),
    })) {
      continue;
    }

    const cash = proofCashAmount({
      id: '',
      type: 'payment',
      payment_cash_amount: r.payment_cash_amount,
      payment_credit_amount: r.payment_credit_amount,
      payment_adjustment: r.payment_adjustment,
      notes: asString(r.notes),
    });
    const order = (r.orders ?? null) as Record<string, unknown> | null;
    const clientType = clientTypeFromProofOrderEmbed(order);
    const commission = computeProofCommissionForClientType(cash, clientType);

    if (r.commission_paid_at) {
      commissionsPaidOut += commission;
    } else {
      pendingCommissions += commission;
      pendingCommissionCount += 1;
    }
  }

  return {
    pendingCommissions: Math.round((pendingCommissions + Number.EPSILON) * 100) / 100,
    commissionsPaidOut: Math.round((commissionsPaidOut + Number.EPSILON) * 100) / 100,
    pendingCommissionCount,
  };
}

/** Aggregate KPIs for the page header. */
export async function fetchFinanceMetrics(branchId?: string | null): Promise<FinanceMetrics> {
  try {
    const { processNewlyOverdueOrders } = await import('@/src/lib/notifications/notificationsData');
    await processNewlyOverdueOrders();
  } catch {
    // best-effort — RPC may not be deployed yet
  }

  let outQ = supabase
    .from('orders')
    .select('balance_due, actual_delivery, payment_terms, payment_status, status', { count: 'exact' })
    .gt('balance_due', 0)
    .in('status', ACTIVE_ORDER_STATUSES);
  if (branchId) outQ = outQ.eq('branch_id', branchId);

  const [outstandingRes, txRes, proofsRes, commissionTotals] = await Promise.all([
    outQ,
    supabase
      .from('payment_transactions')
      .select('total_paid, paid_at, status')
      .eq('status', 'completed')
      .gte('paid_at', firstOfMonthIso())
      .lt('paid_at', firstOfNextMonthIso()),
    supabase
      .from('order_proof_documents')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'payment')
      .eq('status', 'pending'),
    fetchCommissionTotalsFromProofs(),
  ]);

  if (outstandingRes.error) throw outstandingRes.error;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalOutstanding = 0;
  let totalOverdue = 0;
  let overdueCount = 0;
  for (const r of (outstandingRes.data ?? []) as Array<Record<string, unknown>>) {
    const balance = num(r.balance_due);
    totalOutstanding += balance;
    const rawPay = asString(r.payment_status) ?? 'Unbilled';
    const due = computeDueDateFromDelivery(asString(r.actual_delivery), asString(r.payment_terms));
    const pastDue = due != null && due < today;
    const markedOverdue = rawPay === 'Overdue';
    const computedOverdue =
      pastDue && OVERDUEABLE_STATUSES.includes(rawPay);
    if (markedOverdue || computedOverdue) {
      totalOverdue += balance;
      overdueCount += 1;
    }
  }

  let collectedThisMonth = 0;
  for (const t of (txRes.data ?? []) as Array<Record<string, unknown>>) {
    collectedThisMonth += num(t.total_paid);
  }

  return {
    totalOutstanding,
    totalOverdue,
    overdueCount,
    collectedThisMonth,
    pendingProofs: proofsRes.count ?? 0,
    pendingCommissions: commissionTotals.pendingCommissions,
    pendingCommissionCount: commissionTotals.pendingCommissionCount,
    commissionsPaidOut: commissionTotals.commissionsPaidOut,
  };
}

function firstOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function firstOfNextMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
}
