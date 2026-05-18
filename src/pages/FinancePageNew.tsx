/**
 * Invoices & Payments page (rebuilt).
 *
 *   - Outstanding orders (delivered orders + payment status)
 *   - Customer credit utilization
 *   - Commission release: orders with payment proofs on file
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Search,
  TrendingUp,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { useAppContext } from '@/src/store/AppContext';

import {
  fetchCustomerCredit,
  fetchFinanceMetrics,
  fetchOrderCommissionModalData,
  fetchOrdersWithPaymentProofs,
  fetchOutstandingOrders,
  type CustomerCreditRow,
  type FinanceMetrics,
  type OrderCommissionProofRow,
  type OrderWithPaymentProofsRow,
  type OutstandingOrderRow,
} from '@/src/lib/financeData';
import {
  adjustCustomerCreditLimit,
  markAllProofCommissionsPaidForOrder,
  markProofCommissionPaid,
} from '@/src/lib/financeMutations';

type TabId = 'outstanding' | 'credit' | 'commissions';

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

function AgentCell(props: { agentId: string | null; agentName: string | null; className?: string }) {
  if (props.agentId && props.agentName) {
    return (
      <Link
        to={`/employees/${props.agentId}`}
        className={`text-blue-600 hover:underline font-medium ${props.className ?? ''}`}
      >
        {props.agentName}
      </Link>
    );
  }
  return <span className={props.className ?? 'text-gray-700'}>{props.agentName ?? '—'}</span>;
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

const OUTSTANDING_PAGE_SIZE = 20;
const COMMISSION_PAGE_SIZE = 20;

const PAYMENT_STATUS_FILTER_OPTIONS = [
  'Unbilled',
  'Invoiced',
  'Partially Paid',
  'Paid',
  'Overdue',
  'On Credit',
] as const;

type ToastState = { kind: 'success' | 'error'; message: string } | null;

export function FinancePageNew() {
  const { role, employeeName, addAuditLog } = useAppContext();
  const isExecutive = role === 'Executive';

  const [tab, setTab] = useState<TabId>('outstanding');
  const [toast, setToast] = useState<ToastState>(null);

  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingOrderRow[]>([]);
  const [credits, setCredits] = useState<CustomerCreditRow[]>([]);
  const [ordersWithProofs, setOrdersWithProofs] = useState<OrderWithPaymentProofsRow[]>([]);
  const [search, setSearch] = useState('');
  const [commissionSearch, setCommissionSearch] = useState('');

  // Outstanding orders — column sort & status dropdown filter
  const [sortKey, setSortKey] = useState<string>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [headerPaymentFilter, setHeaderPaymentFilter] = useState('');
  const [outstandingPage, setOutstandingPage] = useState(1);

  // Commission release (orders with payment proofs)
  const [commissionSortKey, setCommissionSortKey] = useState<string>('orderNumber');
  const [commissionSortDir, setCommissionSortDir] = useState<'asc' | 'desc'>('desc');
  const [commissionPage, setCommissionPage] = useState(1);

  const [loading, setLoading] = useState({
    metrics: true,
    outstanding: true,
    credit: false,
    commissions: false,
  });

  const [creditEdit, setCreditEdit] = useState<CustomerCreditRow | null>(null);
  const [commissionModalOrder, setCommissionModalOrder] = useState<OrderWithPaymentProofsRow | null>(null);

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

  const loadOrdersWithProofs = async () => {
    setLoading((s) => ({ ...s, commissions: true }));
    try {
      const rows = await fetchOrdersWithPaymentProofs();
      setOrdersWithProofs(rows);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to load orders with proofs' });
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
    if (tab === 'commissions') {
      void loadOrdersWithProofs();
      void loadMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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

  const handleCommissionSort = (key: string) => {
    if (commissionSortKey === key) setCommissionSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setCommissionSortKey(key);
      setCommissionSortDir('asc');
    }
  };

  const commissionSortIcon = (col: string) => {
    if (commissionSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return commissionSortDir === 'asc'
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

  const outstandingTotalPages = Math.max(1, Math.ceil(filteredOutstanding.length / OUTSTANDING_PAGE_SIZE));

  const paginatedOutstanding = useMemo(() => {
    const safePage = Math.min(outstandingPage, outstandingTotalPages);
    const start = (safePage - 1) * OUTSTANDING_PAGE_SIZE;
    return filteredOutstanding.slice(start, start + OUTSTANDING_PAGE_SIZE);
  }, [filteredOutstanding, outstandingPage, outstandingTotalPages]);

  useEffect(() => {
    setOutstandingPage(1);
  }, [search, headerPaymentFilter, sortKey, sortDir]);

  useEffect(() => {
    if (outstandingPage > outstandingTotalPages) {
      setOutstandingPage(outstandingTotalPages);
    }
  }, [outstandingPage, outstandingTotalPages]);

  const filteredOrdersWithProofs = useMemo(() => {
    const q = commissionSearch.trim().toLowerCase();
    let rows = ordersWithProofs;
    if (q) {
      rows = rows.filter((r) =>
        [r.orderNumber, r.customerName, r.agentName].some((v) => v?.toLowerCase().includes(q)),
      );
    }
    return [...rows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (commissionSortKey) {
        case 'orderNumber':
          av = a.orderNumber ?? '';
          bv = b.orderNumber ?? '';
          break;
        case 'customer':
          av = (a.customerName ?? '').toLowerCase();
          bv = (b.customerName ?? '').toLowerCase();
          break;
        case 'agent':
          av = (a.agentName ?? '').toLowerCase();
          bv = (b.agentName ?? '').toLowerCase();
          break;
        case 'total':
          av = a.totalAmount;
          bv = b.totalAmount;
          break;
        case 'paid':
          av = a.amountPaid;
          bv = b.amountPaid;
          break;
        case 'proofAmount':
          av = a.totalProofAmount;
          bv = b.totalProofAmount;
          break;
        case 'proofCount':
          av = a.proofCount;
          bv = b.proofCount;
          break;
        case 'lastProofAt':
          av = a.lastProofAt ?? '';
          bv = b.lastProofAt ?? '';
          break;
        case 'status':
          av = a.paymentStatus;
          bv = b.paymentStatus;
          break;
        default:
          av = a.lastProofAt ?? '';
          bv = b.lastProofAt ?? '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return commissionSortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return commissionSortDir === 'asc' ? -1 : 1;
      if (as > bs) return commissionSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [ordersWithProofs, commissionSearch, commissionSortKey, commissionSortDir]);

  const commissionTotalPages = Math.max(1, Math.ceil(filteredOrdersWithProofs.length / COMMISSION_PAGE_SIZE));

  const paginatedOrdersWithProofs = useMemo(() => {
    const safePage = Math.min(commissionPage, commissionTotalPages);
    const start = (safePage - 1) * COMMISSION_PAGE_SIZE;
    return filteredOrdersWithProofs.slice(start, start + COMMISSION_PAGE_SIZE);
  }, [filteredOrdersWithProofs, commissionPage, commissionTotalPages]);

  useEffect(() => {
    setCommissionPage(1);
  }, [commissionSearch, commissionSortKey, commissionSortDir]);

  useEffect(() => {
    if (commissionPage > commissionTotalPages) {
      setCommissionPage(commissionTotalPages);
    }
  }, [commissionPage, commissionTotalPages]);

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
            Track delivered orders awaiting payment, monitor customer credit, and review orders with payment proofs on file.
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
          label="Commissions Paid Out"
          value={formatPeso(metrics?.commissionsPaidOut)}
          sub="Released on cash payment proofs"
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          accent="bg-green-100"
          loading={loading.metrics}
          valueClass="text-green-600"
        />
        <KpiCard
          label="Pending Commissions"
          value={formatPeso(metrics?.pendingCommissions)}
          sub={
            metrics?.pendingCommissionCount
              ? `${metrics.pendingCommissionCount} cash proof(s) awaiting payout`
              : 'Awaiting executive release'
          }
          icon={<Wallet className="w-6 h-6 text-purple-600" />}
          accent="bg-purple-100"
          loading={loading.metrics}
          valueClass={metrics?.pendingCommissions ? 'text-amber-700' : undefined}
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
          <TabButton active={tab === 'commissions'} onClick={() => setTab('commissions')} icon={<Wallet className="w-4 h-4" />}>
            Commission Release
          </TabButton>
              </div>
              </div>

      {tab === 'outstanding' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Delivered orders — payment tracking</CardTitle>
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
              <p className="py-10 text-center text-sm text-gray-500">
                No delivered or partially fulfilled orders match your filters.
              </p>
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
                          <option value="">All statuses</option>
                          {PAYMENT_STATUS_FILTER_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedOutstanding.map((row) => {
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
                          <td className="py-3 px-3 hidden md:table-cell">
                            <AgentCell agentId={row.agentId} agentName={row.agentName} />
                          </td>
                          <td className="py-3 px-3 text-gray-700 hidden lg:table-cell">{row.paymentTerms ?? '—'}</td>
                          <td className="py-3 px-3 text-right tabular-nums">{formatPeso(row.totalAmount)}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-green-700">{formatPeso(row.amountPaid)}</td>
                          <td className="py-3 px-3 text-center text-gray-800">
                            {formatDate(row.dueDate)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={paymentStatusVariant(row.paymentStatus)}>{row.paymentStatus}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {outstandingTotalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Showing {(outstandingPage - 1) * OUTSTANDING_PAGE_SIZE + 1}–
                      {Math.min(outstandingPage * OUTSTANDING_PAGE_SIZE, filteredOutstanding.length)} of{' '}
                      {filteredOutstanding.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={outstandingPage <= 1}
                        onClick={() => setOutstandingPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600 tabular-nums px-2">
                        Page {outstandingPage} of {outstandingTotalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={outstandingPage >= outstandingTotalPages}
                        onClick={() => setOutstandingPage((p) => Math.min(outstandingTotalPages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
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

      {tab === 'commissions' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Commission release</CardTitle>
                <p className="text-xs text-gray-600 mt-1">
                  Click a row to view payment proofs and release agent commission for cash payments. Orders become Completed
                  only when fully paid and all cash commissions are released.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Search by order #, customer, or agent"
                  value={commissionSearch}
                  onChange={(e) => setCommissionSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading.commissions ? (
              <div className="py-12 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredOrdersWithProofs.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">No orders with payment proofs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                    <tr>
                      <th onClick={() => handleCommissionSort('orderNumber')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100">
                        <span className="flex items-center">Order{commissionSortIcon('orderNumber')}</span>
                      </th>
                      <th onClick={() => handleCommissionSort('customer')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100">
                        <span className="flex items-center">Customer{commissionSortIcon('customer')}</span>
                      </th>
                      <th onClick={() => handleCommissionSort('agent')} className="text-left py-2.5 px-3 font-semibold hidden md:table-cell cursor-pointer select-none hover:bg-gray-100">
                        <span className="flex items-center">Agent{commissionSortIcon('agent')}</span>
                      </th>
                      <th onClick={() => handleCommissionSort('total')} className="text-right py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100">
                        <span className="flex items-center justify-end">Total{commissionSortIcon('total')}</span>
                      </th>
                      <th onClick={() => handleCommissionSort('paid')} className="text-right py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100">
                        <span className="flex items-center justify-end">Paid{commissionSortIcon('paid')}</span>
                      </th>
                      <th onClick={() => handleCommissionSort('proofCount')} className="text-center py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100">
                        <span className="flex items-center justify-center">Proofs{commissionSortIcon('proofCount')}</span>
                      </th>
                      <th className="text-center py-2.5 px-3 font-semibold">Commission</th>
                      <th onClick={() => handleCommissionSort('status')} className="text-center py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100">
                        <span className="flex items-center justify-center">Status{commissionSortIcon('status')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedOrdersWithProofs.map((row) => {
                      const cashProofs = row.cashProofCount;
                      const released = cashProofs - row.pendingCashCommissionCount;
                      return (
                      <tr
                        key={row.orderId}
                        className="hover:bg-gray-50/80 cursor-pointer"
                        onClick={() => setCommissionModalOrder(row)}
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <Link to={`/orders/${row.orderId}`} className="font-medium text-blue-600 hover:underline">
                            {row.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          {row.customerId ? (
                            <Link to={`/customers/${row.customerId}`} className="text-blue-600 hover:underline font-medium">
                              {row.customerName ?? '—'}
                            </Link>
                          ) : (
                            <span className="text-gray-800">{row.customerName ?? '—'}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                          <AgentCell agentId={row.agentId} agentName={row.agentName} />
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">{formatPeso(row.totalAmount)}</td>
                        <td className="py-3 px-3 text-right tabular-nums text-green-700">{formatPeso(row.amountPaid)}</td>
                        <td className="py-3 px-3 text-center tabular-nums">{row.proofCount}</td>
                        <td className="py-3 px-3 text-center text-xs text-gray-600">
                          {row.totalCashOnProofs > 0.01 ? (
                            row.pendingCashCommissionCount > 0 ? (
                              <span className="text-amber-700 font-medium">{released}/{cashProofs} released</span>
                            ) : (
                              <span className="text-green-700 font-medium">All released</span>
                            )
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant={paymentStatusVariant(row.paymentStatus)}>{row.paymentStatus}</Badge>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
                {filteredOrdersWithProofs.length > COMMISSION_PAGE_SIZE && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Showing {(commissionPage - 1) * COMMISSION_PAGE_SIZE + 1}–
                      {Math.min(commissionPage * COMMISSION_PAGE_SIZE, filteredOrdersWithProofs.length)} of{' '}
                      {filteredOrdersWithProofs.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" disabled={commissionPage <= 1} onClick={() => setCommissionPage((p) => Math.max(1, p - 1))}>
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600 tabular-nums px-2">
                        Page {commissionPage} of {commissionTotalPages}
                      </span>
                      <Button size="sm" variant="outline" disabled={commissionPage >= commissionTotalPages} onClick={() => setCommissionPage((p) => Math.min(commissionTotalPages, p + 1))}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {commissionModalOrder && (
        <OrderCommissionProofsModal
          order={commissionModalOrder}
          isExecutive={isExecutive}
          releasedBy={employeeName || 'Executive'}
          onClose={() => setCommissionModalOrder(null)}
          onAudit={(message) => addAuditLog('Commission released', 'Order', message)}
          onUpdated={async () => {
            const rows = await fetchOrdersWithPaymentProofs();
            setOrdersWithProofs(rows);
            const refreshed = rows.find((o) => o.orderId === commissionModalOrder.orderId);
            if (refreshed) setCommissionModalOrder(refreshed);
            await loadMetrics();
          }}
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
          <Link
            to={`/customers/${c.customerId}`}
            className="font-semibold text-blue-600 hover:underline truncate block"
          >
            {c.customerName}
          </Link>
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

function OrderCommissionProofsModal(props: {
  order: OrderWithPaymentProofsRow;
  isExecutive: boolean;
  releasedBy: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
  onAudit?: (message: string) => void;
}) {
  const [proofs, setProofs] = useState<OrderCommissionProofRow[]>([]);
  const [clientType, setClientType] = useState<'Office' | 'Personal'>('Office');
  const [commissionPercentLabel, setCommissionPercentLabel] = useState('0.5%');
  const [loading, setLoading] = useState(true);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const commissionSummary = useMemo(() => {
    let total = 0;
    let released = 0;
    let pendingCount = 0;
    for (const p of proofs) {
      if (!p.requiresCommission) continue;
      total += p.commissionAmount;
      if (p.commissionPaidAt) released += p.commissionAmount;
      else pendingCount += 1;
    }
    return {
      total: Math.round((total + Number.EPSILON) * 100) / 100,
      released: Math.round((released + Number.EPSILON) * 100) / 100,
      pending: Math.round((total - released + Number.EPSILON) * 100) / 100,
      pendingCount,
    };
  }, [proofs]);

  const loadProofs = async () => {
    setLoading(true);
    try {
      const data = await fetchOrderCommissionModalData(props.order.orderId, props.order.customerId);
      setProofs(data.proofs);
      setClientType(data.clientType);
      setCommissionPercentLabel(data.commissionPercentLabel);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.order.orderId]);

  const handleMarkAllPaid = async () => {
    if (!props.isExecutive || commissionSummary.pendingCount === 0) return;
    if (
      !window.confirm(
        `Mark all ${commissionSummary.pendingCount} pending commission(s) as paid out (${formatPeso2(commissionSummary.pending)})?`,
      )
    ) {
      return;
    }
    setMarkingAll(true);
    try {
      const { orderCompleted, releasedCount } = await markAllProofCommissionsPaidForOrder(
        props.order.orderId,
        { paidBy: props.releasedBy },
      );
      props.onAudit?.(
        `Bulk commission release · ${props.order.orderNumber} · ${releasedCount} proof(s) · ${formatPeso2(commissionSummary.pending)}`,
      );
      await loadProofs();
      await props.onUpdated();
      if (orderCompleted) {
        window.alert(`Marked ${releasedCount} commission(s) as paid. Order is now Completed.`);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to mark all as paid');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleRelease = async (proof: OrderCommissionProofRow) => {
    if (!props.isExecutive) return;
    if (!window.confirm(`Mark commission as paid for this cash payment (${formatPeso(proof.cashAmount)})?`)) return;
    setReleasingId(proof.id);
    try {
      const { orderCompleted } = await markProofCommissionPaid(proof.id, { paidBy: props.releasedBy });
      props.onAudit?.(
        `Commission released · ${props.order.orderNumber} · ${formatPeso(proof.cashAmount)} cash`,
      );
      await loadProofs();
      await props.onUpdated();
      if (orderCompleted) {
        window.alert('Commission released. Order is now marked Completed.');
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to release commission');
    } finally {
      setReleasingId(null);
    }
  };

  return (
    <Modal
      title={`Payment proofs — ${props.order.orderNumber}`}
      onClose={props.onClose}
    >
      <div className="text-sm mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <p className="font-semibold text-gray-900 text-base">{props.order.customerName ?? '—'}</p>
          <Badge
            variant="success"
            title={`${commissionPercentLabel} commission on cash payments`}
          >
            {clientType} Client • {commissionPercentLabel} Commission
          </Badge>
        </div>
        <p className="text-gray-600 text-xs">
          Agent:{' '}
          <AgentCell agentId={props.order.agentId} agentName={props.order.agentName} className="text-xs" />
        </p>
        <div className="rounded-md border border-gray-200 bg-white p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-gray-500">Total commission (all proofs)</p>
              <p className="font-semibold text-gray-900 tabular-nums text-base">{formatPeso2(commissionSummary.total)}</p>
            </div>
            <div>
              <p className="text-gray-500">To pay out</p>
              <p className="font-semibold text-amber-700 tabular-nums text-base">{formatPeso2(commissionSummary.pending)}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {commissionSummary.pendingCount} commission{commissionSummary.pendingCount === 1 ? '' : 's'} pending
              </p>
            </div>
            <div>
              <p className="text-gray-500">Total paid out</p>
              <p className="font-semibold text-green-700 tabular-nums text-base">{formatPeso2(commissionSummary.released)}</p>
            </div>
          </div>
          {props.isExecutive && commissionSummary.pendingCount > 0 ? (
            <Button
              size="sm"
              variant="primary"
              className="w-full sm:w-auto gap-1.5"
              disabled={markingAll || releasingId != null}
              onClick={() => void handleMarkAllPaid()}
            >
              {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              Mark all as paid out
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-4 text-xs pt-1 border-t border-gray-200">
          <span>
            Order total <strong className="text-gray-900">{formatPeso(props.order.totalAmount)}</strong>
          </span>
          <span>
            Paid <strong className="text-green-700">{formatPeso(props.order.amountPaid)}</strong>
          </span>
          <Badge variant={paymentStatusVariant(props.order.paymentStatus)}>{props.order.paymentStatus}</Badge>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : proofs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No payment proofs on this order.</p>
      ) : (
        <div className="space-y-3">
          {proofs.map((proof) => (
            <div key={proof.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{proof.title?.trim() || proof.fileName || 'Payment proof'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDateTime(proof.uploadedAt)}
                    {proof.uploadedBy ? ` · ${proof.uploadedBy}` : ''}
                  </p>
                  {proof.userNotes ? (
                    <p className="text-xs text-gray-600 mt-1.5 italic">Note: {proof.userNotes}</p>
                  ) : null}
                </div>
                {proof.fileUrl ? (
                  <a
                    href={proof.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </a>
                ) : null}
              </div>

              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Cash</p>
                  <p className="font-semibold text-gray-900 tabular-nums">{formatPeso2(proof.cashAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Credit</p>
                  <p className="font-semibold text-purple-700 tabular-nums">{formatPeso2(proof.creditAmount)}</p>
                </div>
                {proof.requiresCommission ? (
                  <div>
                    <p className="text-gray-500">Commission</p>
                    <p className="font-semibold text-blue-700 tabular-nums">{formatPeso2(proof.commissionAmount)}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                {proof.requiresCommission ? (
                  proof.commissionPaidAt ? (
                    <p className="text-xs text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Commission paid {formatDateTime(proof.commissionPaidAt)}
                      {proof.commissionPaidBy ? ` by ${proof.commissionPaidBy}` : ''}
                    </p>
                  ) : props.isExecutive ? (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={releasingId === proof.id}
                      onClick={() => void handleRelease(proof)}
                      className="gap-1"
                    >
                      {releasingId === proof.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wallet className="w-3.5 h-3.5" />
                      )}
                      Release commission
                    </Button>
                  ) : (
                    <p className="text-xs text-amber-700">Commission pending executive release</p>
                  )
                ) : (
                  <p className="text-xs text-gray-500">Credit only — no agent commission on this proof</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
        <Button variant="outline" onClick={props.onClose}>Close</Button>
      </div>
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
