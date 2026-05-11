/**
 * Finance / Invoices & Payments data layer.
 *
 * Frames everything around live data instead of formal "invoices":
 *  - Outstanding orders (balance_due > 0)
 *  - Customer credit utilization (customers.credit_limit / outstanding_balance)
 *  - Payment proofs uploaded by agents (order_proof_documents type='payment')
 *  - Digital receipts (digital_receipts) generated after a verified payment
 *  - Agent commission release per period (agent_commissions)
 */

import { supabase } from '@/src/lib/supabase';

export type OutstandingOrderRow = {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string | null;
  agentId: string | null;
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
  /** Number of pending payment proofs awaiting verification. */
  pendingProofs: number;
};

export type CustomerCreditRow = {
  customerId: string;
  customerName: string;
  paymentTerms: string | null;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  utilizationPercent: number;
  overdueAmount: number;
  paymentScore: number | null;
  status: 'Good' | 'Warning' | 'Exceeded';
};

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
  pendingCommissions: number;
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

function diffDaysFromToday(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.floor((today - t) / 86_400_000);
}

/**
 * Compute the due date for an order given its payment terms and order date.
 * COD is due the next calendar day; all other term formats (Net 15, Net 30, …)
 * extract the day count from the string.
 */
function computeDueDate(orderDate: string | null, paymentTerms: string | null): Date | null {
  if (!orderDate) return null;
  const base = new Date(orderDate);
  if (!Number.isFinite(base.getTime())) return null;
  const terms = (paymentTerms ?? '').trim().toUpperCase();
  if (terms === 'COD' || terms === 'CASH ON DELIVERY') {
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return d;
  }
  const match = terms.match(/\d+/);
  if (match) {
    const days = parseInt(match[0], 10);
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }
  return null;
}

/**
 * For every order in the list that should be overdue (due_date < today and
 * payment_status is still an unpaid/credit status), update the DB row to Overdue
 * in a single batch upsert. Fire-and-forget; does not throw on partial failure.
 */
async function syncOverdueStatuses(
  rows: Array<{ id: string; dueDate: string | null; orderDate: string | null; paymentTerms: string | null; paymentStatus: string }>,
): Promise<Set<string>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueIds: string[] = [];
  for (const r of rows) {
    if (!OVERDUEABLE_STATUSES.includes(r.paymentStatus)) continue;
    // Use stored due_date if present; otherwise derive from order_date + terms
    let due: Date | null = null;
    if (r.dueDate) {
      due = new Date(r.dueDate);
      if (!Number.isFinite(due.getTime())) due = null;
    }
    if (!due) due = computeDueDate(r.orderDate, r.paymentTerms);
    if (due && due < today) overdueIds.push(r.id);
  }

  if (overdueIds.length === 0) return new Set();

  try {
    await supabase
      .from('orders')
      .update({ payment_status: 'Overdue' })
      .in('id', overdueIds);
  } catch {
    // best-effort
  }

  return new Set(overdueIds);
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

/**
 * Outstanding orders: every active order with balance_due > 0.
 * Also includes On Credit orders (balance_due may be 0 but still tracked).
 * Auto-syncs overdue statuses on fetch (best-effort, fire-and-forget).
 */
export async function fetchOutstandingOrders(branchId?: string | null): Promise<OutstandingOrderRow[]> {
  let q = supabase
    .from('orders')
    .select(
      `id, order_number, customer_id, customer_name, agent_id, agent_name, branch_id,
       order_date, due_date, payment_terms, payment_method, status, payment_status,
       total_amount, amount_paid, balance_due,
       branches(name),
       customers(name)`,
    )
    .in('status', ACTIVE_ORDER_STATUSES)
    .or('balance_due.gt.0,payment_status.eq.On Credit')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (branchId) q = q.eq('branch_id', branchId);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return [];

  // Auto-mark overdue orders in the DB before mapping rows for display
  const overdueIds = await syncOverdueStatuses(
    rows.map((r) => ({
      id: String(r.id),
      dueDate: asString(r.due_date),
      orderDate: asString(r.order_date),
      paymentTerms: asString(r.payment_terms),
      paymentStatus: asString(r.payment_status) ?? 'Unbilled',
    })),
  );

  const orderIds = rows.map((r) => String(r.id));
  const { data: proofs } = await supabase
    .from('order_proof_documents')
    .select('order_id, status')
    .in('order_id', orderIds)
    .eq('type', 'payment')
    .eq('status', 'pending');
  const pendingByOrder = new Map<string, number>();
  for (const p of (proofs ?? []) as Array<Record<string, unknown>>) {
    const id = String(p.order_id);
    pendingByOrder.set(id, (pendingByOrder.get(id) ?? 0) + 1);
  }

  return rows.map((r) => {
    const branch = nestedName(r.branches);
    const cust = nestedName(r.customers) ?? asString(r.customer_name);
    const due = asString(r.due_date);
    const rawStatus = asString(r.payment_status) ?? 'Unbilled';
    // Reflect the overdue sync locally so the UI doesn't need a second fetch
    const paymentStatus = overdueIds.has(String(r.id)) ? 'Overdue' : rawStatus;
    return {
      id: String(r.id),
      orderNumber: asString(r.order_number) ?? String(r.id),
      customerId: asString(r.customer_id),
      customerName: cust,
      agentId: asString(r.agent_id),
      agentName: asString(r.agent_name),
      branchId: asString(r.branch_id),
      branchName: branch,
      orderDate: asString(r.order_date),
      dueDate: due,
      paymentTerms: asString(r.payment_terms),
      paymentMethod: asString(r.payment_method),
      status: asString(r.status) ?? '—',
      paymentStatus,
      totalAmount: num(r.total_amount),
      amountPaid: num(r.amount_paid),
      balanceDue: num(r.balance_due),
      daysOverdue: due ? Math.max(0, diffDaysFromToday(due)) : 0,
      pendingProofs: pendingByOrder.get(String(r.id)) ?? 0,
    };
  });
}

/** Customers with credit configured or any outstanding balance. */
export async function fetchCustomerCredit(): Promise<CustomerCreditRow[]> {
  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, name, payment_terms, credit_limit, outstanding_balance, available_credit, overdue_amount, payment_score',
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

/** Payment proofs (uploaded by agents, awaiting/done verification). */
export async function fetchPaymentProofs(
  filter: 'all' | 'pending' | 'verified' | 'rejected' = 'pending',
): Promise<PaymentProofRow[]> {
  let q = supabase
    .from('order_proof_documents')
    .select(
      `id, order_id, file_name, file_url, file_size, uploaded_by, uploaded_by_role,
       uploaded_at, status, notes, rejection_reason, verified_by, verified_at,
       orders(order_number, customer_name, agent_name, total_amount, balance_due)`,
    )
    .eq('type', 'payment')
    .order('uploaded_at', { ascending: false });

  if (filter !== 'all') q = q.eq('status', filter);

  const { data, error } = await q;
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const order = (r.orders ?? null) as Record<string, unknown> | null;
    const meta = parseProofNotes(asString(r.notes));
    return {
      id: String(r.id),
      orderId: String(r.order_id),
      orderNumber: order ? asString(order.order_number) : null,
      customerName: order ? asString(order.customer_name) : null,
      agentName: order ? asString(order.agent_name) : null,
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

/** Aggregate KPIs for the page header. */
export async function fetchFinanceMetrics(branchId?: string | null): Promise<FinanceMetrics> {
  let outQ = supabase
    .from('orders')
    .select('balance_due, due_date, status', { count: 'exact' })
    .gt('balance_due', 0)
    .in('status', ACTIVE_ORDER_STATUSES);
  if (branchId) outQ = outQ.eq('branch_id', branchId);

  const [outstandingRes, txRes, proofsRes, commRes] = await Promise.all([
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
    supabase
      .from('agent_commissions')
      .select('commission_earned, status')
      .neq('status', 'Paid'),
  ]);

  if (outstandingRes.error) throw outstandingRes.error;

  let totalOutstanding = 0;
  let totalOverdue = 0;
  let overdueCount = 0;
  for (const r of (outstandingRes.data ?? []) as Array<Record<string, unknown>>) {
    const balance = num(r.balance_due);
    totalOutstanding += balance;
    const due = asString(r.due_date);
    if (due && new Date(due).getTime() < Date.now()) {
      totalOverdue += balance;
      overdueCount += 1;
    }
  }

  let collectedThisMonth = 0;
  for (const t of (txRes.data ?? []) as Array<Record<string, unknown>>) {
    collectedThisMonth += num(t.total_paid);
  }

  let pendingCommissions = 0;
  for (const c of (commRes.data ?? []) as Array<Record<string, unknown>>) {
    pendingCommissions += num(c.commission_earned);
  }

  return {
    totalOutstanding,
    totalOverdue,
    overdueCount,
    collectedThisMonth,
    pendingProofs: proofsRes.count ?? 0,
    pendingCommissions,
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
