/**
 * Invoices & Payments page (rebuilt).
 *
 * Reframes the area away from formal invoices into a payments tracker:
 *   - Outstanding orders (uses orders.balance_due / due_date / payment_terms)
 *   - Customer credit utilization (customers.credit_limit / outstanding_balance)
 *   - Payment proofs uploaded by agents (verified by Executive)
 *   - Digital receipts after a verified payment
 *   - Commission release per period (Executive only). Real verified payments
 *     accrue commission to the originating agent; orders that only consumed
 *     credit do NOT count toward commission until the customer pays in cash.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Loader2,
  Receipt,
  Search,
  TrendingUp,
  Upload,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { useAppContext } from '@/src/store/AppContext';

import {
  fetchAgentCommissionsForPeriod,
  fetchCustomerCredit,
  fetchDigitalReceipts,
  fetchFinanceMetrics,
  fetchOutstandingOrders,
  fetchPaymentProofs,
  periodKeyForDate,
  type AgentCommissionRow,
  type CustomerCreditRow,
  type DigitalReceiptRow,
  type FinanceMetrics,
  type OutstandingOrderRow,
  type PaymentProofRow,
} from '@/src/lib/financeData';
import {
  adjustCustomerCreditLimit,
  chargeToCredit,
  rejectPaymentProof,
  releaseCommission,
  uploadPaymentProof,
  verifyPaymentProof,
} from '@/src/lib/financeMutations';

type TabId = 'outstanding' | 'credit' | 'proofs' | 'receipts' | 'commissions';

const PESO = '₱';

function formatPeso(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${PESO}${Number(v).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

function formatPeso2(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${PESO}${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function dueDateBadge(row: OutstandingOrderRow): { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (!row.dueDate) return { label: 'No due date', variant: 'neutral' };
  if (row.daysOverdue > 0) return { label: `${row.daysOverdue}d overdue`, variant: 'danger' };
  const dueIn = Math.floor((new Date(row.dueDate).getTime() - Date.now()) / 86_400_000);
  if (dueIn <= 7) return { label: `Due in ${Math.max(dueIn, 0)}d`, variant: 'warning' };
  return { label: `Due in ${dueIn}d`, variant: 'success' };
}

function paymentStatusVariant(status: string): 'success' | 'warning' | 'info' | 'danger' | 'neutral' {
  switch (status) {
    case 'Paid':
      return 'success';
    case 'On Credit':
      return 'info';
    case 'Partially Paid':
      return 'warning';
    case 'Invoiced':
      return 'info';
    case 'Overdue':
      return 'danger';
    default:
      return 'neutral';
  }
}

function commissionStatusVariant(status: AgentCommissionRow['status']) {
  if (status === 'Paid') return 'success';
  if (status === 'Approved') return 'info';
  return 'warning';
}

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'GCash', 'Maya', 'Check', 'Credit Card', 'Debit Card'] as const;

type ToastState = { kind: 'success' | 'error'; message: string } | null;

export function FinancePageNew() {
  const { role, employeeName, addAuditLog } = useAppContext();
  const isExecutive = role === 'Executive';

  const [tab, setTab] = useState<TabId>('outstanding');
  const [toast, setToast] = useState<ToastState>(null);

  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingOrderRow[]>([]);
  const [credits, setCredits] = useState<CustomerCreditRow[]>([]);
  const [proofs, setProofs] = useState<PaymentProofRow[]>([]);
  const [receipts, setReceipts] = useState<DigitalReceiptRow[]>([]);
  const [commissions, setCommissions] = useState<AgentCommissionRow[]>([]);
  const [period, setPeriod] = useState<string>(periodKeyForDate(new Date()));
  const [proofFilter, setProofFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState('');

  // Outstanding orders — column sort & status dropdown filter
  const [sortKey, setSortKey] = useState<string>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [headerPaymentFilter, setHeaderPaymentFilter] = useState('');

  // Receipts — column sort
  const [receiptSortKey, setReceiptSortKey] = useState<string>('paidAt');
  const [receiptSortDir, setReceiptSortDir] = useState<'asc' | 'desc'>('desc');

  const [loading, setLoading] = useState({
    metrics: true,
    outstanding: true,
    credit: false,
    proofs: false,
    receipts: false,
    commissions: false,
  });

  const [proofModalOrder, setProofModalOrder] = useState<OutstandingOrderRow | null>(null);
  const [reviewProof, setReviewProof] = useState<PaymentProofRow | null>(null);
  const [creditEdit, setCreditEdit] = useState<CustomerCreditRow | null>(null);

  /** Toast auto-dismiss. */
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const loadMetrics = async () => {
    setLoading((s) => ({ ...s, metrics: true }));
    try {
      const m = await fetchFinanceMetrics();
      setMetrics(m);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to load metrics' });
    } finally {
      setLoading((s) => ({ ...s, metrics: false }));
    }
  };

  const loadOutstanding = async () => {
    setLoading((s) => ({ ...s, outstanding: true }));
    try {
      const rows = await fetchOutstandingOrders();
      setOutstanding(rows);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to load orders' });
    } finally {
      setLoading((s) => ({ ...s, outstanding: false }));
    }
  };

  const loadCredits = async () => {
    setLoading((s) => ({ ...s, credit: true }));
    try {
      const rows = await fetchCustomerCredit();
      setCredits(rows);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to load credit data' });
    } finally {
      setLoading((s) => ({ ...s, credit: false }));
    }
  };

  const loadProofs = async () => {
    setLoading((s) => ({ ...s, proofs: true }));
    try {
      const rows = await fetchPaymentProofs(proofFilter);
      setProofs(rows);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to load proofs' });
    } finally {
      setLoading((s) => ({ ...s, proofs: false }));
    }
  };

  const loadReceipts = async () => {
    setLoading((s) => ({ ...s, receipts: true }));
    try {
      const rows = await fetchDigitalReceipts();
      setReceipts(rows);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to load receipts' });
    } finally {
      setLoading((s) => ({ ...s, receipts: false }));
    }
  };

  const loadCommissions = async () => {
    setLoading((s) => ({ ...s, commissions: true }));
    try {
      const rows = await fetchAgentCommissionsForPeriod(period);
      setCommissions(rows);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to load commissions' });
    } finally {
      setLoading((s) => ({ ...s, commissions: false }));
    }
  };

  useEffect(() => {
    void loadMetrics();
    void loadOutstanding();
  }, []);

  useEffect(() => {
    if (tab === 'credit') void loadCredits();
    if (tab === 'proofs') void loadProofs();
    if (tab === 'receipts') void loadReceipts();
    if (tab === 'commissions') void loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === 'proofs') void loadProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proofFilter]);

  useEffect(() => {
    if (tab === 'commissions') void loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const distinctPaymentStatuses = useMemo(() => {
    const s = new Set<string>(outstanding.map((r) => r.paymentStatus).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [outstanding]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortIcon = (col: string) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  const handleReceiptSort = (key: string) => {
    if (receiptSortKey === key) setReceiptSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setReceiptSortKey(key); setReceiptSortDir('asc'); }
  };

  const receiptSortIcon = (col: string) => {
    if (receiptSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return receiptSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  const filteredOutstanding = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = outstanding;
    if (q) rows = rows.filter((r) => [r.orderNumber, r.customerName, r.agentName].some((v) => v?.toLowerCase().includes(q)));
    if (headerPaymentFilter) rows = rows.filter((r) => r.paymentStatus === headerPaymentFilter);
    return [...rows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'orderNumber': av = a.orderNumber ?? ''; bv = b.orderNumber ?? ''; break;
        case 'customer': av = (a.customerName ?? '').toLowerCase(); bv = (b.customerName ?? '').toLowerCase(); break;
        case 'agent': av = (a.agentName ?? '').toLowerCase(); bv = (b.agentName ?? '').toLowerCase(); break;
        case 'terms': av = a.paymentTerms ?? ''; bv = b.paymentTerms ?? ''; break;
        case 'total': av = a.totalAmount; bv = b.totalAmount; break;
        case 'paid': av = a.amountPaid; bv = b.amountPaid; break;
        case 'balance': av = a.balanceDue; bv = b.balanceDue; break;
        case 'dueDate': av = a.dueDate ?? ''; bv = b.dueDate ?? ''; break;
        case 'status': av = a.paymentStatus; bv = b.paymentStatus; break;
        default: av = a.dueDate ?? ''; bv = b.dueDate ?? '';
      }
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      const as = String(av); const bs = String(bv);
      if (as < bs) return sortDir === 'asc' ? -1 : 1;
      if (as > bs) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [outstanding, search, headerPaymentFilter, sortKey, sortDir]);

  const sortedReceipts = useMemo(() => {
    return [...receipts].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (receiptSortKey) {
        case 'receiptNumber': av = a.receiptNumber ?? ''; bv = b.receiptNumber ?? ''; break;
        case 'order': av = (a.orderNumber ?? '').toLowerCase(); bv = (b.orderNumber ?? '').toLowerCase(); break;
        case 'customer': av = (a.customerName ?? '').toLowerCase(); bv = (b.customerName ?? '').toLowerCase(); break;
        case 'method': av = a.paymentMethod ?? ''; bv = b.paymentMethod ?? ''; break;
        case 'amount': av = a.totalPaid; bv = b.totalPaid; break;
        case 'paidAt': av = a.paidAt ?? ''; bv = b.paidAt ?? ''; break;
        default: av = a.paidAt ?? ''; bv = b.paidAt ?? '';
      }
      if (typeof av === 'number' && typeof bv === 'number') return receiptSortDir === 'asc' ? av - bv : bv - av;
      const as = String(av); const bs = String(bv);
      if (as < bs) return receiptSortDir === 'asc' ? -1 : 1;
      if (as > bs) return receiptSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [receipts, receiptSortKey, receiptSortDir]);

  const reviewer = (employeeName || 'User').trim();

  /** Refresh side-effects after a proof verify/reject so KPIs and tables stay in sync. */
  const refreshAfterMutation = async () => {
    await Promise.all([loadMetrics(), loadOutstanding(), loadProofs(), loadReceipts(), loadCommissions()]);
  };

  const handleProofUpload = async (input: {
    batches: Array<{ file: File | null; amount: number; method: string; reference: string; notes: string }>;
    creditAmount: number;
    creditNotes: string;
  }) => {
    if (!proofModalOrder) return;
    const uploaderRole = role === 'Agent' ? 'Agent' : role === 'Executive' ? 'Executive' : 'Cashier';
    try {
      // Upload each proof batch sequentially (file is optional)
      for (const batch of input.batches) {
        await uploadPaymentProof({
          orderId: proofModalOrder.id,
          file: batch.file,
          amount: batch.amount,
          paymentMethod: batch.method,
          referenceNumber: batch.reference || null,
          notes: batch.notes || null,
          uploadedBy: reviewer,
          uploadedByRole: uploaderRole,
        });
        addAuditLog(
          'Payment recorded',
          'Order',
          `${proofModalOrder.orderNumber} · ${formatPeso(batch.amount)} via ${batch.method}${batch.file ? '' : ' (no proof attached)'}`,
        );
      }

      // Apply credit charge immediately (no proof needed)
      if (input.creditAmount > 0) {
        await chargeToCredit({
          orderId: proofModalOrder.id,
          amount: input.creditAmount,
          notes: input.creditNotes || null,
          chargedBy: reviewer,
        });
        addAuditLog(
          'Credit charge applied',
          'Order',
          `${proofModalOrder.orderNumber} · ${formatPeso(input.creditAmount)} charged to credit`,
        );
      }

      setProofModalOrder(null);
      const batchCount = input.batches.length;
      const hasCredit = input.creditAmount > 0;
      const parts: string[] = [];
      if (batchCount > 0) parts.push(`${batchCount} proof${batchCount > 1 ? 's' : ''} uploaded — pending verification`);
      if (hasCredit) parts.push(`${formatPeso(input.creditAmount)} charged to credit`);
      setToast({ kind: 'success', message: parts.join(' · ') + '.' });
      await Promise.all([loadOutstanding(), loadMetrics(), tab === 'proofs' ? loadProofs() : Promise.resolve()]);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Upload failed' });
    }
  };

  const handleVerify = async (
    proof: PaymentProofRow,
    values: { amount: number; method: string; reference: string; paidAt: string },
  ) => {
    try {
      await verifyPaymentProof(proof.id, {
        amount: values.amount,
        paymentMethod: values.method,
        referenceNumber: values.reference || null,
        paidAt: values.paidAt || null,
        reviewedBy: reviewer,
      });
      addAuditLog(
        'Payment proof verified',
        'Order',
        `${proof.orderNumber ?? proof.orderId} · ${formatPeso(values.amount)} via ${values.method}`,
      );
      setReviewProof(null);
      setToast({ kind: 'success', message: 'Payment recorded and commission accrued.' });
      await refreshAfterMutation();
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Verification failed' });
    }
  };

  const handleReject = async (proof: PaymentProofRow, reason: string) => {
    try {
      await rejectPaymentProof(proof.id, { rejectionReason: reason, reviewedBy: reviewer });
      addAuditLog('Payment proof rejected', 'Order', `${proof.orderNumber ?? proof.orderId} · ${reason}`);
      setReviewProof(null);
      setToast({ kind: 'success', message: 'Proof rejected.' });
      await Promise.all([loadProofs(), loadMetrics()]);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Rejection failed' });
    }
  };

  const handleReleaseCommission = async (row: AgentCommissionRow) => {
    if (!isExecutive) return;
    if (!window.confirm(`Release ${formatPeso2(row.commissionEarned)} to ${row.agentName ?? 'this agent'} for ${row.period}?`))
      return;
    try {
      await releaseCommission(row.id, { releasedBy: reviewer });
      addAuditLog('Commission released', 'Agent', `${row.agentName ?? row.employeeId} · ${row.period} · ${formatPeso2(row.commissionEarned)}`);
      setToast({ kind: 'success', message: 'Commission marked as released.' });
      await Promise.all([loadCommissions(), loadMetrics()]);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Release failed' });
    }
  };

  const handleAdjustCredit = async (row: CustomerCreditRow, newLimit: number) => {
    try {
      await adjustCustomerCreditLimit(row.customerId, newLimit);
      addAuditLog('Credit limit updated', 'Customer', `${row.customerName} · ${formatPeso(newLimit)}`);
      setCreditEdit(null);
      setToast({ kind: 'success', message: 'Credit limit updated.' });
      await loadCredits();
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Update failed' });
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Invoices & Payments</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track which orders still need payment, monitor customer credit usage, verify proofs, and release commissions on real
            payments.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Total Outstanding"
          value={formatPeso(metrics?.totalOutstanding)}
          sub="Across active orders"
          icon={<CircleDollarSign className="w-6 h-6 text-blue-600" />}
          accent="bg-blue-100"
          loading={loading.metrics}
        />
        <KpiCard
          label="Overdue"
          value={formatPeso(metrics?.totalOverdue)}
          sub={metrics ? `${metrics.overdueCount} order(s) past due` : '—'}
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          accent="bg-red-100"
          loading={loading.metrics}
          valueClass="text-red-600"
        />
        <KpiCard
          label="Collected this Month"
          value={formatPeso(metrics?.collectedThisMonth)}
          sub="Verified payments"
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          accent="bg-green-100"
          loading={loading.metrics}
          valueClass="text-green-600"
        />
        <KpiCard
          label="Pending Commissions"
          value={formatPeso(metrics?.pendingCommissions)}
          sub={metrics?.pendingProofs ? `${metrics.pendingProofs} proof(s) awaiting review` : 'Awaiting executive release'}
          icon={<Wallet className="w-6 h-6 text-purple-600" />}
          accent="bg-purple-100"
          loading={loading.metrics}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-2 sm:gap-4 min-w-max">
          <TabButton active={tab === 'outstanding'} onClick={() => setTab('outstanding')} icon={<FileText className="w-4 h-4" />}>
            Outstanding Orders
          </TabButton>
          <TabButton active={tab === 'credit'} onClick={() => setTab('credit')} icon={<CreditCard className="w-4 h-4" />}>
            Customer Credit
          </TabButton>
          <TabButton active={tab === 'proofs'} onClick={() => setTab('proofs')} icon={<Upload className="w-4 h-4" />}>
            Payment Proofs
            {(metrics?.pendingProofs ?? 0) > 0 ? (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-red-600 text-white text-[11px] px-1.5">
                {metrics?.pendingProofs}
              </span>
            ) : null}
          </TabButton>
          <TabButton active={tab === 'receipts'} onClick={() => setTab('receipts')} icon={<Receipt className="w-4 h-4" />}>
            Receipts
          </TabButton>
          {isExecutive ? (
            <TabButton
              active={tab === 'commissions'}
              onClick={() => setTab('commissions')}
              icon={<Wallet className="w-4 h-4" />}
            >
              Commission Release
            </TabButton>
          ) : null}
        </div>
      </div>

      {tab === 'outstanding' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Orders awaiting payment</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Search by order #, customer, or agent"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading.outstanding ? (
              <div className="py-12 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredOutstanding.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">No outstanding orders.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                    <tr>
                      <th onClick={() => handleSort('orderNumber')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Order{sortIcon('orderNumber')}</span>
                      </th>
                      <th onClick={() => handleSort('customer')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Customer{sortIcon('customer')}</span>
                      </th>
                      <th onClick={() => handleSort('agent')} className="text-left py-2.5 px-3 font-semibold hidden md:table-cell cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Agent{sortIcon('agent')}</span>
                      </th>
                      <th onClick={() => handleSort('terms')} className="text-left py-2.5 px-3 font-semibold hidden lg:table-cell cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Terms{sortIcon('terms')}</span>
                      </th>
                      <th onClick={() => handleSort('total')} className="text-right py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center justify-end">Total{sortIcon('total')}</span>
                      </th>
                      <th onClick={() => handleSort('paid')} className="text-right py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center justify-end">Paid{sortIcon('paid')}</span>
                      </th>
                      <th onClick={() => handleSort('balance')} className="text-right py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center justify-end">Balance{sortIcon('balance')}</span>
                      </th>
                      <th onClick={() => handleSort('dueDate')} className="text-center py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center justify-center">Due{sortIcon('dueDate')}</span>
                      </th>
                      <th className="py-2.5 px-3 font-semibold text-left align-top min-w-[9rem] normal-case">
                        <select
                          aria-label="Filter by payment status"
                          value={headerPaymentFilter}
                          onChange={(e) => setHeaderPaymentFilter(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-xs font-semibold text-gray-600 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Status</option>
                          {distinctPaymentStatuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </th>
                      <th className="text-right py-2.5 px-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOutstanding.map((row) => {
                      const due = dueDateBadge(row);
                      return (
                        <tr key={row.id} className="hover:bg-gray-50/80">
                          <td className="py-3 px-3">
                            <Link to={`/orders/${row.id}`} className="font-medium text-blue-600 hover:underline">
                              {row.orderNumber}
                            </Link>
                            {row.pendingProofs > 0 ? (
                              <p className="text-[11px] text-amber-700 mt-0.5">{row.pendingProofs} proof pending</p>
                            ) : null}
                          </td>
                          <td className="py-3 px-3">
                            {row.customerId ? (
                              <Link to={`/customers/${row.customerId}`} className="text-blue-600 hover:underline font-medium">
                                {row.customerName ?? '—'}
                              </Link>
                            ) : (
                              <span className="text-gray-800">{row.customerName ?? '—'}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-700 hidden md:table-cell">{row.agentName ?? '—'}</td>
                          <td className="py-3 px-3 text-gray-700 hidden lg:table-cell">{row.paymentTerms ?? '—'}</td>
                          <td className="py-3 px-3 text-right tabular-nums">{formatPeso(row.totalAmount)}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-green-700">{formatPeso(row.amountPaid)}</td>
                          <td className="py-3 px-3 text-right tabular-nums font-semibold">{formatPeso(row.balanceDue)}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={due.variant}>{due.label}</Badge>
                            <p className="text-[11px] text-gray-500 mt-0.5">{formatDate(row.dueDate)}</p>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={paymentStatusVariant(row.paymentStatus)}>{row.paymentStatus}</Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setProofModalOrder(row)}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Record payment
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'credit' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer credit utilization</CardTitle>
          </CardHeader>
          <CardContent>
            {loading.credit ? (
              <div className="py-12 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : credits.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">No customers with credit configured.</p>
            ) : (
              <div className="space-y-3">
                {credits.map((c) => (
                  <CreditRowCard key={c.customerId} row={c} canEdit={isExecutive} onEdit={() => setCreditEdit(c)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'proofs' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Payment proofs</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={proofFilter}
                  onChange={(e) => setProofFilter(e.target.value as typeof proofFilter)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading.proofs ? (
              <div className="py-12 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : proofs.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">No payment proofs in this view.</p>
            ) : (
              <div className="space-y-3">
                {proofs.map((p) => (
                  <ProofRowCard
                    key={p.id}
                    proof={p}
                    canReview={isExecutive && p.status === 'pending'}
                    onReview={() => setReviewProof(p)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'receipts' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Digital receipts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading.receipts ? (
              <div className="py-12 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : receipts.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                No digital receipts yet. Verifying a payment automatically creates a transaction; receipts are issued after a
                successful online payment via /pay/:token.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                    <tr>
                      <th onClick={() => handleReceiptSort('receiptNumber')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Receipt #{receiptSortIcon('receiptNumber')}</span>
                      </th>
                      <th onClick={() => handleReceiptSort('order')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Order{receiptSortIcon('order')}</span>
                      </th>
                      <th onClick={() => handleReceiptSort('customer')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Customer{receiptSortIcon('customer')}</span>
                      </th>
                      <th onClick={() => handleReceiptSort('method')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Method{receiptSortIcon('method')}</span>
                      </th>
                      <th onClick={() => handleReceiptSort('amount')} className="text-right py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center justify-end">Amount{receiptSortIcon('amount')}</span>
                      </th>
                      <th onClick={() => handleReceiptSort('paidAt')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Paid at{receiptSortIcon('paidAt')}</span>
                      </th>
                      <th className="text-right py-2.5 px-3 font-semibold">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedReceipts.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/80">
                        <td className="py-3 px-3 font-medium text-gray-900">{r.receiptNumber}</td>
                        <td className="py-3 px-3">
                          {r.orderId ? (
                            <Link to={`/orders/${r.orderId}`} className="text-blue-600 hover:underline">
                              {r.orderNumber ?? r.orderId.slice(0, 8)}
                            </Link>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-800">{r.customerName ?? '—'}</td>
                        <td className="py-3 px-3">
                          <Badge variant="neutral">{r.paymentMethod}</Badge>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-semibold">{formatPeso(r.totalPaid)}</td>
                        <td className="py-3 px-3 text-gray-700">{formatDateTime(r.paidAt)}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex gap-1">
                            <a
                              href={r.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              <ExternalLink className="w-3 h-3" /> Open
                            </a>
                            {r.pdfUrl ? (
                              <a
                                href={r.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                <Download className="w-3 h-3" /> PDF
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'commissions' && isExecutive && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Agent commission release</CardTitle>
                <p className="text-xs text-gray-600 mt-1">
                  Commission accrues only when a real payment proof is verified. Orders paid using credit do not count toward
                  commission until the customer settles in cash.
                </p>
              </div>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading.commissions ? (
              <div className="py-12 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : commissions.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">No commissions accrued in this period yet.</p>
            ) : (
              <div className="space-y-3">
                {commissions.map((c) => (
                  <CommissionRowCard
                    key={c.id}
                    row={c}
                    onRelease={() => handleReleaseCommission(c)}
                    canRelease={c.status !== 'Paid'}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {proofModalOrder && (
        <RecordPaymentModal
          order={proofModalOrder}
          onClose={() => setProofModalOrder(null)}
          onSubmit={(input) => handleProofUpload(input)}
        />
      )}

      {reviewProof && (
        <ReviewProofModal
          proof={reviewProof}
          onClose={() => setReviewProof(null)}
          onApprove={(values) => handleVerify(reviewProof, values)}
          onReject={(reason) => handleReject(reviewProof, reason)}
        />
      )}

      {creditEdit && (
        <EditCreditLimitModal
          row={creditEdit}
          onClose={() => setCreditEdit(null)}
          onSave={(limit) => handleAdjustCredit(creditEdit, limit)}
        />
      )}

      {toast ? (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg shadow-lg px-4 py-3 text-sm flex items-center gap-2 ${
            toast.kind === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.kind === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------- Sub components ----------------------------- */

function KpiCard(props: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  loading?: boolean;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600">{props.label}</p>
            <p className={`text-xl sm:text-2xl font-bold mt-2 ${props.valueClass ?? 'text-gray-900'}`}>
              {props.loading ? '…' : props.value}
            </p>
            <p className="text-xs text-gray-500 mt-1 truncate">{props.sub}</p>
          </div>
          <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${props.accent}`}>
            {props.icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
        props.active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {props.icon}
      {props.children}
    </button>
  );
}

function CreditRowCard(props: { row: CustomerCreditRow; canEdit: boolean; onEdit: () => void }) {
  const c = props.row;
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{c.customerName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Terms: <span className="font-medium text-gray-700">{c.paymentTerms ?? '—'}</span>
            {c.paymentScore != null ? <span className="ml-3">Payment score: <span className="font-medium text-gray-700">{c.paymentScore}</span></span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={c.status === 'Good' ? 'success' : c.status === 'Warning' ? 'warning' : 'danger'}>{c.status}</Badge>
          {props.canEdit ? (
            <Button size="sm" variant="outline" onClick={props.onEdit}>
              Adjust limit
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 text-sm">
        <Stat label="Credit limit" value={formatPeso(c.creditLimit)} />
        <Stat label="Outstanding" value={formatPeso(c.outstandingBalance)} className="text-red-600" />
        <Stat label="Available" value={formatPeso(c.availableCredit)} className="text-green-600" />
        <Stat label="Utilization" value={`${c.utilizationPercent.toFixed(1)}%`} />
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            c.utilizationPercent > 100 ? 'bg-red-600' : c.utilizationPercent > 80 ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(c.utilizationPercent, 100)}%` }}
        />
      </div>
      {c.overdueAmount > 0 ? (
        <p className="text-xs text-red-700 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Overdue {formatPeso(c.overdueAmount)} on file
        </p>
      ) : null}
    </div>
  );
}

function Stat(props: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{props.label}</p>
      <p className={`mt-0.5 font-semibold ${props.className ?? 'text-gray-900'}`}>{props.value}</p>
    </div>
  );
}

function ProofRowCard(props: { proof: PaymentProofRow; canReview: boolean; onReview: () => void }) {
  const p = props.proof;
  return (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row gap-4">
      <a
        href={p.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full md:w-32 h-28 rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0"
      >
        {/^image\//.test(p.fileName ?? '') || /\.(png|jpg|jpeg|webp|gif)$/i.test(p.fileUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.fileUrl} alt="proof" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <FileText className="w-8 h-8" />
          </div>
        )}
      </a>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{p.customerName ?? '—'}</p>
              <Badge
                variant={
                  p.status === 'verified' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'
                }
              >
                {p.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Order:{' '}
              <Link to={`/orders/${p.orderId}`} className="text-blue-600 hover:underline">
                {p.orderNumber ?? p.orderId.slice(0, 8)}
              </Link>
              {' · '}Agent: {p.agentName ?? '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900 tabular-nums">{formatPeso(p.claimedAmount ?? 0)}</p>
            <p className="text-xs text-gray-500">via {p.paymentMethod ?? '—'}</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Reference: <span className="font-medium text-gray-800">{p.referenceNumber ?? '—'}</span>
        </p>
        {p.notes ? <p className="text-xs text-gray-600 mt-1 italic">"{p.notes}"</p> : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <span>Uploaded {formatDateTime(p.uploadedAt)} by {p.uploadedBy ?? '—'}</span>
          <div className="flex items-center gap-2">
            <a
              href={p.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Eye className="w-3.5 h-3.5" /> View file
            </a>
            {props.canReview ? (
              <Button size="sm" variant="primary" className="gap-1" onClick={props.onReview}>
                Review
              </Button>
            ) : null}
          </div>
        </div>
        {p.status === 'rejected' && p.rejectionReason ? (
          <p className="text-xs text-red-700 mt-2">Reason: {p.rejectionReason}</p>
        ) : null}
        {p.status === 'verified' && p.verifiedBy ? (
          <p className="text-xs text-green-700 mt-2">Verified by {p.verifiedBy} on {formatDateTime(p.verifiedAt)}</p>
        ) : null}
      </div>
    </div>
  );
}

function CommissionRowCard(props: { row: AgentCommissionRow; canRelease: boolean; onRelease: () => void }) {
  const c = props.row;
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{c.agentName ?? c.employeeId.slice(0, 8)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Period {c.period} · {c.commissionRate.toFixed(2)}% rate
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">Eligible commission</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{formatPeso2(c.commissionEarned)}</p>
            <p className="text-[11px] text-gray-500">From {formatPeso(c.salesAmount)} verified payments</p>
          </div>
          <Badge variant={commissionStatusVariant(c.status)}>{c.status}</Badge>
          {props.canRelease ? (
            <Button size="sm" variant="primary" className="gap-1" onClick={props.onRelease}>
              <ArrowUpRight className="w-3.5 h-3.5" /> Release
            </Button>
          ) : null}
        </div>
      </div>
      {c.breakdown.length > 0 ? (
        <details className="mt-3">
          <summary className="text-xs text-blue-600 cursor-pointer">View breakdown ({c.breakdown.length})</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr className="text-left">
                  <th className="py-1.5 pr-3">Order</th>
                  <th className="py-1.5 pr-3">Customer</th>
                  <th className="py-1.5 pr-3 text-right">Payment</th>
                  <th className="py-1.5 pr-3 text-right">Commission</th>
                  <th className="py-1.5 pr-3">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {c.breakdown.map((b, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-medium text-gray-900">{b.orderNumber}</td>
                    <td className="py-1.5 pr-3 text-gray-700">{b.customerName ?? '—'}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{formatPeso(b.paymentAmount ?? b.saleAmount ?? 0)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-green-700">{formatPeso2(b.commission ?? 0)}</td>
                    <td className="py-1.5 pr-3 text-gray-700">{b.paidAt ? formatDateTime(b.paidAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
      {c.status === 'Paid' && c.paidDate ? (
        <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Released on {formatDate(c.paidDate)}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------- Modals --------------------------------- */

type PaymentBatch = {
  id: number;
  file: File | null;
  preview: string | null;
  amount: string;
  method: typeof PAYMENT_METHODS[number];
  reference: string;
  notes: string;
};

function BatchUploadRow(props: {
  batch: PaymentBatch;
  index: number;
  canRemove: boolean;
  onChange: (updated: Partial<PaymentBatch>) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { batch, index } = props;

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => props.onChange({ file: f, preview: reader.result as string });
      reader.readAsDataURL(f);
    } else {
      props.onChange({ file: f, preview: null });
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Batch {index + 1}</p>
        {props.canRemove && (
          <button type="button" onClick={props.onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Proof upload */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
      >
        {batch.preview ? (
          <img src={batch.preview} alt="proof" className="max-h-28 mx-auto rounded" />
        ) : batch.file ? (
          <p className="text-sm text-gray-700 truncate">{batch.file.name}</p>
        ) : (
          <>
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Click or drop proof image / PDF</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Optional</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Amount">
          <input type="number" value={batch.amount} onChange={(e) => props.onChange({ amount: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
        </Field>
        <Field label="Method">
          <select value={batch.method} onChange={(e) => props.onChange({ method: e.target.value as typeof PAYMENT_METHODS[number] })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Reference #">
          <input value={batch.reference} onChange={(e) => props.onChange({ reference: e.target.value })}
            placeholder="OR #, Tx #, Check #"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
        </Field>
        <Field label="Notes">
          <input value={batch.notes} onChange={(e) => props.onChange({ notes: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
        </Field>
      </div>
    </div>
  );
}

function RecordPaymentModal(props: {
  order: OutstandingOrderRow;
  onClose: () => void;
  onSubmit: (input: {
    batches: Array<{ file: File | null; amount: number; method: string; reference: string; notes: string }>;
    creditAmount: number;
    creditNotes: string;
  }) => Promise<void>;
}) {
  const [batches, setBatches] = useState<PaymentBatch[]>([
    { id: 1, file: null, preview: null, amount: '', method: 'Bank Transfer', reference: '', notes: '' },
  ]);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNotes, setCreditNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  let nextId = useRef(2);

  const updateBatch = (id: number, patch: Partial<PaymentBatch>) => {
    setBatches((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const addBatch = () => {
    setBatches((prev) => [
      ...prev,
      { id: nextId.current++, file: null, preview: null, amount: '', method: 'Bank Transfer', reference: '', notes: '' },
    ]);
  };

  const removeBatch = (id: number) => setBatches((prev) => prev.filter((b) => b.id !== id));

  const batchTotal = batches.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const creditNum = Number(creditAmount) || 0;
  const combinedTotal = batchTotal + creditNum;
  const remaining = props.order.balanceDue - combinedTotal;

  const submit = async () => {
    // Active = any batch that has an amount entered (file is optional)
    const activeBatches = batches.filter((b) => (Number(b.amount) || 0) > 0);
    for (const b of activeBatches) {
      const n = Number(b.amount);
      if (!Number.isFinite(n) || n <= 0) { window.alert('Each batch needs a valid amount greater than zero.'); return; }
    }
    if (activeBatches.length === 0 && creditNum <= 0) {
      window.alert('Add at least one payment batch or a credit charge.');
      return;
    }
    if (creditNum < 0) { window.alert('Credit amount cannot be negative.'); return; }
    if (remaining < -0.01) {
      if (!window.confirm(`Combined amount (${formatPeso(combinedTotal)}) exceeds the balance (${formatPeso(props.order.balanceDue)}). Submit anyway?`)) return;
    }

    setSubmitting(true);
    try {
      await props.onSubmit({
        batches: activeBatches.map((b) => ({
          file: b.file ?? null,
          amount: Number(b.amount),
          method: b.method,
          reference: b.reference,
          notes: b.notes,
        })),
        creditAmount: creditNum,
        creditNotes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Record payment" onClose={props.onClose}>
      {/* Order summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm mb-4">
        <p className="text-blue-900 font-semibold">{props.order.orderNumber}</p>
        <p className="text-blue-800 text-xs">{props.order.customerName ?? '—'} · {props.order.paymentTerms ?? '—'}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div><p className="text-blue-700">Total</p><p className="font-semibold text-blue-900">{formatPeso(props.order.totalAmount)}</p></div>
          <div><p className="text-blue-700">Paid</p><p className="font-semibold text-blue-900">{formatPeso(props.order.amountPaid)}</p></div>
          <div><p className="text-blue-700">Balance</p><p className="font-semibold text-blue-900">{formatPeso(props.order.balanceDue)}</p></div>
        </div>
      </div>

      {/* Proof batches */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Payment Batches</p>
          <button type="button" onClick={addBatch}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
            + Add batch
          </button>
        </div>
        {batches.map((b, i) => (
          <BatchUploadRow
            key={b.id}
            batch={b}
            index={i}
            canRemove={batches.length > 1}
            onChange={(patch) => updateBatch(b.id, patch)}
            onRemove={() => removeBatch(b.id)}
          />
        ))}
      </div>

      {/* Credit charge section */}
      <div className="border border-purple-200 bg-purple-50 rounded-lg p-3 mb-4 space-y-2">
        <p className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
          <CreditCard className="w-4 h-4" /> Charge to Credit
        </p>
        <p className="text-xs text-purple-700">
          Charges against the customer's credit limit are applied immediately without requiring proof verification.
          The order will be marked <strong>On Credit</strong> if the balance is fully covered.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Credit amount">
            <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none" />
          </Field>
          <Field label="Notes">
            <input value={creditNotes} onChange={(e) => setCreditNotes(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none" />
          </Field>
        </div>
      </div>

      {/* Running total */}
      <div className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1 mb-4">
        <span>Batches: <strong>{formatPeso(batchTotal)}</strong></span>
        {creditNum > 0 && <span>Credit: <strong className="text-purple-700">{formatPeso(creditNum)}</strong></span>}
        <span>Combined: <strong>{formatPeso(combinedTotal)}</strong></span>
        <span className={remaining < -0.01 ? 'text-orange-600 font-semibold' : remaining <= 0.01 ? 'text-green-700 font-semibold' : ''}>
          Remaining: <strong>{formatPeso(Math.max(0, remaining))}</strong>
        </span>
      </div>

      <ModalFooter onClose={props.onClose}>
        <Button variant="primary" onClick={submit} disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Submit
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function ReviewProofModal(props: {
  proof: PaymentProofRow;
  onClose: () => void;
  onApprove: (values: { amount: number; method: string; reference: string; paidAt: string }) => void;
  onReject: (reason: string) => void;
}) {
  const p = props.proof;
  const [amount, setAmount] = useState(String(p.claimedAmount ?? p.orderBalance ?? 0));
  const [method, setMethod] = useState<string>(p.paymentMethod ?? 'Bank Transfer');
  const [reference, setReference] = useState(p.referenceNumber ?? '');
  const [paidAt, setPaidAt] = useState<string>(new Date().toISOString().slice(0, 16));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const approve = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      window.alert('Approved amount must be positive.');
      return;
    }
    setSubmitting(true);
    try {
      await props.onApprove({ amount: n, method, reference, paidAt });
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      window.alert('Rejection reason is required.');
      return;
    }
    setSubmitting(true);
    try {
      await props.onReject(reason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Review payment proof" onClose={props.onClose}>
      <div className="grid md:grid-cols-2 gap-4">
        <a
          href={p.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gray-100 rounded-md overflow-hidden border border-gray-200 max-h-80"
        >
          {/^image\//.test(p.fileName ?? '') || /\.(png|jpg|jpeg|webp|gif)$/i.test(p.fileUrl) ? (
            <img src={p.fileUrl} alt="proof" className="w-full h-full object-contain max-h-80" />
          ) : (
            <div className="w-full h-40 flex items-center justify-center text-gray-500">
              <FileText className="w-10 h-10" />
            </div>
          )}
        </a>
        <div className="text-sm space-y-1">
          <p className="font-semibold text-gray-900">{p.customerName ?? '—'}</p>
          <p className="text-gray-600">
            Order:{' '}
            <Link to={`/orders/${p.orderId}`} className="text-blue-600 hover:underline">
              {p.orderNumber ?? p.orderId.slice(0, 8)}
            </Link>
          </p>
          <p className="text-gray-600">Agent: {p.agentName ?? '—'}</p>
          <p className="text-gray-600">Order total: {formatPeso(p.orderTotal)}</p>
          <p className="text-gray-600">Outstanding balance: {formatPeso(p.orderBalance)}</p>
          <p className="text-gray-600">Claimed: {formatPeso(p.claimedAmount ?? 0)} via {p.paymentMethod ?? '—'}</p>
          {p.notes ? <p className="text-gray-600 italic mt-2">"{p.notes}"</p> : null}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <Field label="Approved amount">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </Field>
        <Field label="Payment method">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference number">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </Field>
        <Field label="Paid at">
          <input
            type="datetime-local"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </Field>
      </div>
      <div className="mt-4 border-t border-gray-200 pt-4">
        <Field label="If rejecting, give a reason">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., reference not matching bank slip"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
          />
        </Field>
      </div>
      <ModalFooter onClose={props.onClose}>
        <Button variant="outline" onClick={reject} disabled={submitting} className="gap-2 text-red-700 border-red-300 hover:bg-red-50">
          <XCircle className="w-4 h-4" />
          Reject
        </Button>
        <Button variant="primary" onClick={approve} disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Approve & record
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function EditCreditLimitModal(props: { row: CustomerCreditRow; onClose: () => void; onSave: (limit: number) => void }) {
  const [value, setValue] = useState(String(props.row.creditLimit));
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      window.alert('Enter a non-negative number.');
      return;
    }
    setSaving(true);
    try {
      await props.onSave(n);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={`Adjust credit limit – ${props.row.customerName}`} onClose={props.onClose}>
      <p className="text-sm text-gray-600 mb-3">
        Current outstanding: <span className="font-semibold">{formatPeso(props.row.outstandingBalance)}</span>. Available is
        recomputed as new limit minus outstanding.
      </p>
      <Field label="New credit limit">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </Field>
      <ModalFooter onClose={props.onClose}>
        <Button variant="primary" onClick={submit} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function Modal(props: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{props.title}</h2>
          <button onClick={props.onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{props.children}</div>
      </div>
    </div>
  );
}

function ModalFooter(props: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      <Button variant="outline" onClick={props.onClose}>
        Cancel
      </Button>
      {props.children}
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{props.label}</span>
      {props.children}
    </label>
  );
}

/** Lightweight clock icon import alias to avoid unused warnings while keeping
 * a hook for future "Due Soon" surfacing in headers. */
const _IconClock = Clock;
void _IconClock;
