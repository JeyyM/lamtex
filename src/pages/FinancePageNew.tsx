/**
 * Invoices & Payments page (rebuilt).
 *
 *   - Outstanding orders (delivered orders + payment status)
 *   - Customer credit utilization
 *   - Commission release: orders with payment proofs on file
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  Download,
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
import { ModalPortal } from '@/src/components/ui/ModalPortal';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { StatKpiCard } from '@/src/components/ui/StatKpiCard';
import { useAppContext } from '@/src/store/AppContext';
import { useFinancePermissions } from '@/src/lib/permissions/financePermissions';
import { useEmployeesPermissions } from '@/src/lib/permissions/employeesPermissions';
import { ModuleAccessDenied } from '@/src/components/permissions/ModuleAccessDenied';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import {
  fetchAgentPendingCommissions,
  mergeAgentPendingIntoCommissionOrders,
} from '@/src/lib/agentDashboard';

import {
  fetchCustomerCredit,
  fetchFinanceMetrics,
  fetchOrderCommissionModalData,
  fetchOrdersWithPaymentProofs,
  fetchOutstandingOrders,
  commissionOrderMatchesAgent,
  outstandingOrderMatchesAgent,
  customerCreditMatchesAgent,
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
import { downloadOutstandingOrdersWorkbook } from '@/src/lib/outstandingOrdersExport';
import { OrderTripIdCell } from '@/src/components/orders/OrderTripIdCell';
import {
  DATE_PERIOD_OPTIONS,
  inDatePeriodRange,
  periodTriggerLabel,
  resolveDatePeriodQuery,
  todayIsoLocal,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';

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

const FINANCE_LINK_CLASS = 'text-blue-700 hover:text-blue-900 font-medium hover:underline';

const FINANCE_LINK_TITLE = 'Right-click or Ctrl+click to open in new tab';

function FinanceLink(props: {
  to: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}): React.ReactElement {
  return (
    <Link
      to={props.to}
      title={props.title ?? FINANCE_LINK_TITLE}
      className={props.className ?? `${FINANCE_LINK_CLASS} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-sm`}
      onClick={props.onClick}
    >
      {props.children}
    </Link>
  );
}

/** Invisible link covering a table cell — place after cell content so it sits on top. */
function FinanceRowOrderOverlay(props: {
  to: string;
  orderNumber: string;
  primary?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}): React.ReactElement {
  return (
    <Link
      to={props.to}
      onClick={props.onClick}
      tabIndex={props.primary ? undefined : -1}
      aria-hidden={props.primary ? undefined : true}
      aria-label={props.primary ? `Open order ${props.orderNumber}` : undefined}
      title={FINANCE_LINK_TITLE}
      className="absolute inset-0 z-10 block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
    />
  );
}

const FINANCE_CELL_CONTENT = 'relative z-0 pointer-events-none';

const FINANCE_ENTITY_LINK =
  'relative z-20 block truncate pointer-events-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset rounded-sm';

/** Entity column link (commission table — row click opens modal elsewhere). */
function FinanceTableCellLink(props: {
  to: string;
  children: React.ReactNode;
  ariaLabel: string;
  contentClassName?: string;
  tdClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  primary?: boolean;
}): React.ReactElement {
  return (
    <td className={`relative py-3 px-3 align-top ${props.tdClassName ?? ''}`}>
      <Link
        to={props.to}
        aria-label={props.ariaLabel}
        title={FINANCE_LINK_TITLE}
        onClick={props.onClick}
        tabIndex={props.primary ? undefined : -1}
        aria-hidden={props.primary ? undefined : true}
        className="absolute inset-0 z-0 block outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      />
      <span
        className={`${FINANCE_CELL_CONTENT} block truncate ${FINANCE_LINK_CLASS} ${props.contentClassName ?? ''}`.trim()}
      >
        {props.children}
      </span>
    </td>
  );
}

const FINANCE_TABLE_ROW_CLASS =
  'group cursor-pointer hover:bg-gray-50 transition-colors focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500';

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
  'Partially Paid',
  'Overdue',
  'On Credit',
] as const;

type ToastState = { kind: 'success' | 'error'; message: string } | null;

function parseFinanceTab(value: string | null): TabId | null {
  if (value === 'outstanding' || value === 'credit' || value === 'commissions') return value;
  return null;
}

export function FinancePageNew() {
  const { employeeName, employeeId, employeeDashboardRole, branch, addAuditLog, isExecutiveUser } = useAppContext();
  const perms = useFinancePermissions();
  const canCommissions = perms.commissions;
  const canFinancePage = perms.pageAccess;
  const employeesPerms = useEmployeesPermissions();
  const isSalesAgentView = employeeDashboardRole === 'Agent';
  const scopeToCurrentUser = !isExecutiveUser && Boolean(employeeId);
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTabState] = useState<TabId>(() => parseFinanceTab(searchParams.get('tab')) ?? 'outstanding');
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
  const [includePaidOrders, setIncludePaidOrders] = useState(false);
  const [outstandingPage, setOutstandingPage] = useState(1);
  const [exportPeriodKind, setExportPeriodKind] = useState<DatePeriodKind>('month');
  const [exportCustomStart, setExportCustomStart] = useState('');
  const [exportCustomEnd, setExportCustomEnd] = useState('');
  const [exportPeriodModalOpen, setExportPeriodModalOpen] = useState(false);
  const [draftExportPeriodKind, setDraftExportPeriodKind] = useState<DatePeriodKind>('month');
  const [draftExportCustomStart, setDraftExportCustomStart] = useState('');
  const [draftExportCustomEnd, setDraftExportCustomEnd] = useState('');
  const [exportingOutstanding, setExportingOutstanding] = useState(false);

  // Commission release (orders with payment proofs)
  const [commissionSortKey, setCommissionSortKey] = useState<string>('pendingCommissions');
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

  const setTab = useCallback(
    (next: TabId) => {
      if (next === 'commissions' && !canCommissions) {
        next = 'outstanding';
      }
      setTabState(next);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === 'outstanding') params.delete('tab');
          else params.set('tab', next);
          return params;
        },
        { replace: true },
      );
    },
    [canCommissions, setSearchParams],
  );

  useEffect(() => {
    const fromUrl = parseFinanceTab(searchParams.get('tab'));
    if (fromUrl === 'commissions' && !canCommissions) {
      setTabState('outstanding');
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.delete('tab');
          return params;
        },
        { replace: true },
      );
      return;
    }
    if (fromUrl) {
      setTabState(fromUrl);
      return;
    }
    if (isSalesAgentView && canCommissions) setTabState('commissions');
  }, [searchParams, isSalesAgentView, canCommissions, setSearchParams]);

  useEffect(() => {
    if (tab === 'commissions' && !canCommissions) {
      setTab('outstanding');
    }
  }, [tab, canCommissions, setTab]);

  useEffect(() => {
    if (!canFinancePage && (tab === 'outstanding' || tab === 'credit')) {
      setTab(canCommissions ? 'commissions' : 'outstanding');
    }
  }, [tab, canFinancePage, canCommissions, setTab]);

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

  const loadOrdersWithProofs = useCallback(async () => {
    setLoading((s) => ({ ...s, commissions: true }));
    try {
      let rows = await fetchOrdersWithPaymentProofs();
      if (isSalesAgentView && employeeId) {
        const branchId = branch?.trim() ? await resolveBranchIdByName(branch) : null;
        const pending = await fetchAgentPendingCommissions(employeeId, branchId);
        rows = mergeAgentPendingIntoCommissionOrders(rows, pending, employeeId, employeeName);
      }
      setOrdersWithProofs(rows);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to load orders with proofs' });
    } finally {
      setLoading((s) => ({ ...s, commissions: false }));
    }
  }, [isSalesAgentView, employeeId, employeeName, branch]);

  useEffect(() => {
    void loadMetrics();
    void loadOutstanding();
    if (canCommissions && (isSalesAgentView || parseFinanceTab(searchParams.get('tab')) === 'commissions')) {
      void loadOrdersWithProofs();
    }
  }, [isSalesAgentView, canCommissions, loadOrdersWithProofs, searchParams]);

  useEffect(() => {
    if (tab === 'credit') void loadCredits();
    if (tab === 'commissions' && canCommissions) {
      void loadOrdersWithProofs();
      void loadMetrics();
    }
  }, [tab, canCommissions, loadOrdersWithProofs]);

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
      setCommissionSortDir(key === 'pendingCommissions' ? 'desc' : 'asc');
    }
  };

  const commissionSortIcon = (col: string) => {
    if (commissionSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return commissionSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  const exportQueryDates = useMemo(
    () => resolveDatePeriodQuery(exportPeriodKind, exportCustomStart, exportCustomEnd),
    [exportPeriodKind, exportCustomStart, exportCustomEnd],
  );

  const maxExportCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftExportCustomInvalid = Boolean(
    draftExportCustomStart && draftExportCustomEnd && draftExportCustomStart > draftExportCustomEnd,
  );

  const openExportPeriodModal = () => {
    setDraftExportPeriodKind(exportPeriodKind);
    setDraftExportCustomStart(exportCustomStart);
    setDraftExportCustomEnd(exportCustomEnd);
    setExportPeriodModalOpen(true);
  };

  const handleExportPeriodChange = (kind: DatePeriodKind) => {
    setExportPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = todayIsoLocal();
      const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
      setExportCustomStart(start);
      setExportCustomEnd(iso);
    }
  };

  const handleExportModalPresetPick = (kind: DatePeriodKind) => {
    if (kind !== 'custom') {
      handleExportPeriodChange(kind);
      setExportPeriodModalOpen(false);
      return;
    }
    setDraftExportPeriodKind('custom');
    const t = new Date();
    const iso = todayIsoLocal();
    const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
    setDraftExportCustomStart(prev => prev || exportCustomStart || start);
    setDraftExportCustomEnd(prev => prev || exportCustomEnd || iso);
  };

  const applyExportModalCustomRange = () => {
    setExportPeriodKind('custom');
    setExportCustomStart(draftExportCustomStart);
    setExportCustomEnd(draftExportCustomEnd);
    setExportPeriodModalOpen(false);
  };

  useEffect(() => {
    if (!exportPeriodModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportPeriodModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exportPeriodModalOpen]);

  const filteredOutstanding = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = outstanding;
    if (scopeToCurrentUser && employeeId) {
      rows = rows.filter((r) => outstandingOrderMatchesAgent(r, employeeId));
    }
    if (q) {
      rows = rows.filter((r) =>
        [r.orderNumber, r.customerName, r.agentName, r.tripNumber, r.tripId].some((v) =>
          v?.toLowerCase().includes(q),
        ),
      );
    }
    if (headerPaymentFilter) rows = rows.filter((r) => r.paymentStatus === headerPaymentFilter);
    if (!includePaidOrders) rows = rows.filter((r) => r.paymentStatus !== 'Paid');
    if (!exportQueryDates.invalid) {
      rows = rows.filter(r => inDatePeriodRange(r.orderDate, exportQueryDates.from, exportQueryDates.to));
    }
    return [...rows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'orderNumber': av = a.orderNumber ?? ''; bv = b.orderNumber ?? ''; break;
        case 'trip': av = a.tripNumber ?? a.tripId ?? ''; bv = b.tripNumber ?? b.tripId ?? ''; break;
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
  }, [outstanding, search, headerPaymentFilter, includePaidOrders, sortKey, sortDir, exportQueryDates, scopeToCurrentUser, employeeId]);

  const filteredCredits = useMemo(() => {
    if (!scopeToCurrentUser || !employeeId) return credits;
    return credits.filter((r) => customerCreditMatchesAgent(r, employeeId));
  }, [credits, scopeToCurrentUser, employeeId]);

  const handleExportOutstanding = async () => {
    if (exportingOutstanding || exportQueryDates.invalid) return;
    if (filteredOutstanding.length === 0) {
      window.alert('No outstanding orders match the current filters and date range.');
      return;
    }
    setExportingOutstanding(true);
    try {
      await downloadOutstandingOrdersWorkbook({
        branchLabel: branch ?? 'All branches',
        periodLabel: exportQueryDates.displayLabel,
        rows: filteredOutstanding,
      });
      addAuditLog(
        'Exported outstanding orders workbook',
        'Finance',
        `${filteredOutstanding.length} order${filteredOutstanding.length !== 1 ? 's' : ''} · ${exportQueryDates.displayLabel}`,
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExportingOutstanding(false);
    }
  };

  const outstandingTotalPages = Math.max(1, Math.ceil(filteredOutstanding.length / OUTSTANDING_PAGE_SIZE));

  const paginatedOutstanding = useMemo(() => {
    const safePage = Math.min(outstandingPage, outstandingTotalPages);
    const start = (safePage - 1) * OUTSTANDING_PAGE_SIZE;
    return filteredOutstanding.slice(start, start + OUTSTANDING_PAGE_SIZE);
  }, [filteredOutstanding, outstandingPage, outstandingTotalPages]);

  useEffect(() => {
    setOutstandingPage(1);
  }, [search, headerPaymentFilter, includePaidOrders, sortKey, sortDir, exportQueryDates.from, exportQueryDates.to, exportQueryDates.invalid]);

  useEffect(() => {
    if (outstandingPage > outstandingTotalPages) {
      setOutstandingPage(outstandingTotalPages);
    }
  }, [outstandingPage, outstandingTotalPages]);

  const filteredOrdersWithProofs = useMemo(() => {
    const q = commissionSearch.trim().toLowerCase();
    let rows = ordersWithProofs;
    if (scopeToCurrentUser && employeeId) {
      rows = rows.filter((r) => {
        if (!commissionOrderMatchesAgent(r, employeeId)) return false;
        if (isSalesAgentView) return r.pendingCashCommissionCount > 0;
        return true;
      });
    }
    if (q) {
      rows = rows.filter((r) =>
        [r.orderNumber, r.customerName, r.agentName, r.tripNumber, r.tripId].some((v) =>
          v?.toLowerCase().includes(q),
        ),
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
        case 'trip':
          av = a.tripNumber ?? a.tripId ?? '';
          bv = b.tripNumber ?? b.tripId ?? '';
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
        case 'pendingCommissions':
          av = a.pendingCashCommissionCount;
          bv = b.pendingCashCommissionCount;
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
        const cmp = commissionSortDir === 'asc' ? av - bv : bv - av;
        if (cmp !== 0) return cmp;
        // Tie-break: most recent proof first when pending counts match
        const ta = a.lastProofAt ? new Date(a.lastProofAt).getTime() : 0;
        const tb = b.lastProofAt ? new Date(b.lastProofAt).getTime() : 0;
        return tb - ta;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return commissionSortDir === 'asc' ? -1 : 1;
      if (as > bs) return commissionSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [ordersWithProofs, commissionSearch, commissionSortKey, commissionSortDir, scopeToCurrentUser, employeeId, isSalesAgentView]);

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

  if (!canFinancePage && !canCommissions) {
    return <ModuleAccessDenied moduleName="Finance" />;
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track delivered orders awaiting payment, monitor customer credit, and review orders with payment proofs on file.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 ${canCommissions ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
        <StatKpiCard
          label="Total Outstanding"
          value={formatPeso(metrics?.totalOutstanding)}
          sub="Across active orders"
          icon={<CircleDollarSign />}
          tone="blue"
          loading={loading.metrics}
        />
        <StatKpiCard
          label="Overdue"
          value={formatPeso(metrics?.totalOverdue)}
          sub={metrics ? `${metrics.overdueCount} order(s) past due` : '—'}
          icon={<AlertTriangle />}
          tone="rose"
          loading={loading.metrics}
        />
        {canCommissions && (
        <>
        <StatKpiCard
          label="Commissions Paid Out"
          value={formatPeso(metrics?.commissionsPaidOut)}
          sub="Released on cash payment proofs"
          icon={<TrendingUp />}
          tone="emerald"
          loading={loading.metrics}
        />
        <StatKpiCard
          label="Pending Commissions"
          value={formatPeso(metrics?.pendingCommissions)}
          sub={
            metrics?.pendingCommissionCount
              ? `${metrics.pendingCommissionCount} cash proof(s) awaiting payout · open Commission Release`
              : 'Awaiting executive release'
          }
          icon={<Wallet />}
          tone="amber"
          loading={loading.metrics}
          onClick={() => setTab('commissions')}
        />
        </>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-2 sm:gap-4 min-w-max">
          {canFinancePage && (
          <TabButton active={tab === 'outstanding'} onClick={() => setTab('outstanding')} icon={<FileText className="w-4 h-4" />}>
            Outstanding Orders
          </TabButton>
          )}
          {canFinancePage && (
          <TabButton active={tab === 'credit'} onClick={() => setTab('credit')} icon={<CreditCard className="w-4 h-4" />}>
            Customer Credit
          </TabButton>
          )}
          {canCommissions && (
          <TabButton
            active={tab === 'commissions'}
            onClick={() => setTab('commissions')}
            icon={<Wallet className="w-4 h-4" />}
            badge={
              (metrics?.pendingCommissionCount ?? 0) > 0 ? metrics!.pendingCommissionCount : undefined
            }
          >
            Commission Release
          </TabButton>
          )}
              </div>
              </div>

      {canFinancePage && tab === 'outstanding' && (
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-lg">Delivered orders — payment tracking</CardTitle>
              <p className="text-xs text-gray-500 font-normal mt-1">
                {exportQueryDates.invalid
                  ? 'Invalid date range selected.'
                  : `${filteredOutstanding.length} order${filteredOutstanding.length !== 1 ? 's' : ''} in ${exportQueryDates.displayLabel}${includePaidOrders ? '' : ' · paid hidden'}`}
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Search by order #, customer, or agent"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:shrink-0">
                <label className="inline-flex items-center gap-2 h-9 px-3 text-sm text-gray-700 cursor-pointer rounded-lg border border-gray-200 bg-white hover:bg-gray-50 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={includePaidOrders}
                    onChange={e => setIncludePaidOrders(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Include paid
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 h-9 border-gray-300 bg-white min-w-[9.5rem] max-w-[14rem] justify-start"
                  aria-haspopup="dialog"
                  aria-expanded={exportPeriodModalOpen}
                  aria-label="Choose order period"
                  onClick={openExportPeriodModal}
                >
                  <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
                  <span className="truncate text-left text-sm font-normal">
                    {periodTriggerLabel(exportPeriodKind, exportCustomStart, exportCustomEnd)}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 h-9 border-gray-300 bg-white whitespace-nowrap"
                  disabled={exportingOutstanding || loading.outstanding || exportQueryDates.invalid || filteredOutstanding.length === 0}
                  onClick={() => void handleExportOutstanding()}
                >
                  {exportingOutstanding ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="w-4 h-4" aria-hidden />
                  )}
                  {exportingOutstanding ? 'Exporting…' : 'Export'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading.outstanding ? (
              <div className="py-12 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            ) : outstanding.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                No delivered or partially fulfilled orders on file.
              </p>
            ) : filteredOutstanding.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                No orders match your search, status filter, or date range.
                {!includePaidOrders ? ' Turn on Include paid to show fully paid orders.' : ''}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                    <tr>
                      <th onClick={() => handleSort('orderNumber')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Order{sortIcon('orderNumber')}</span>
                      </th>
                      <th onClick={() => handleSort('trip')} className="text-left py-2.5 px-3 font-semibold hidden lg:table-cell cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Trip ID{sortIcon('trip')}</span>
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
                      const orderHref = `/orders/${row.id}`;
                      const rowOverlay = (opts: { primary?: boolean }) => (
                        <FinanceRowOrderOverlay
                          to={orderHref}
                          orderNumber={row.orderNumber}
                          primary={opts.primary}
                        />
                      );
                      return (
                        <tr key={row.id} className={FINANCE_TABLE_ROW_CLASS}>
                          <td className="relative py-3 px-3 align-top">
                            <span className={`${FINANCE_CELL_CONTENT} font-mono text-xs tabular-nums ${FINANCE_LINK_CLASS}`}>
                              {row.orderNumber}
                            </span>
                            {rowOverlay({ primary: true })}
                          </td>
                          <td className="relative py-3 px-3 align-top hidden lg:table-cell">
                            <span className={FINANCE_CELL_CONTENT}>
                              <OrderTripIdCell tripNumber={row.tripNumber} tripId={row.tripId} />
                            </span>
                            {rowOverlay({})}
                          </td>
                          <td className="relative py-3 px-3 align-top max-w-[12rem]">
                            {row.customerId ? (
                              <Link
                                to={`/customers/${row.customerId}`}
                                title={FINANCE_LINK_TITLE}
                                className={`${FINANCE_ENTITY_LINK} ${FINANCE_LINK_CLASS}`}
                              >
                                {row.customerName ?? '—'}
                              </Link>
                            ) : (
                              <span className={`${FINANCE_CELL_CONTENT} text-gray-800 block truncate`}>
                                {row.customerName ?? '—'}
                              </span>
                            )}
                            {rowOverlay({})}
                          </td>
                          <td className="relative py-3 px-3 align-top hidden md:table-cell">
                            {row.agentId && row.agentName && employeesPerms.pageAccess ? (
                              <Link
                                to={`/employees/${row.agentId}`}
                                title={FINANCE_LINK_TITLE}
                                className={`${FINANCE_ENTITY_LINK} ${FINANCE_LINK_CLASS}`}
                              >
                                {row.agentName}
                              </Link>
                            ) : (
                              <span className={`${FINANCE_CELL_CONTENT} text-gray-700 block truncate`}>
                                {row.agentName ?? '—'}
                              </span>
                            )}
                            {rowOverlay({})}
                          </td>
                          <td className="relative py-3 px-3 text-gray-700 hidden lg:table-cell align-top">
                            <span className={FINANCE_CELL_CONTENT}>{row.paymentTerms ?? '—'}</span>
                            {rowOverlay({})}
                          </td>
                          <td className="relative py-3 px-3 text-right tabular-nums align-top">
                            <span className={FINANCE_CELL_CONTENT}>{formatPeso(row.totalAmount)}</span>
                            {rowOverlay({})}
                          </td>
                          <td className="relative py-3 px-3 text-right tabular-nums text-green-700 align-top">
                            <span className={FINANCE_CELL_CONTENT}>{formatPeso(row.amountPaid)}</span>
                            {rowOverlay({})}
                          </td>
                          <td className="relative py-3 px-3 text-center text-gray-800 align-top">
                            <span className={FINANCE_CELL_CONTENT}>{formatDate(row.dueDate)}</span>
                            {rowOverlay({})}
                          </td>
                          <td className="relative py-3 px-3 text-center align-top">
                            <span className={`${FINANCE_CELL_CONTENT} inline-flex [&_*]:pointer-events-none`}>
                              <Badge variant={paymentStatusVariant(row.paymentStatus)}>{row.paymentStatus}</Badge>
                            </span>
                            {rowOverlay({})}
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

      {canFinancePage && tab === 'credit' && (
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
            ) : filteredCredits.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">No credit accounts assigned to you.</p>
            ) : (
              <div className="space-y-3">
                {filteredCredits.map((c) => (
                  <CreditRowCard key={c.customerId} row={c} canEdit={canFinancePage} onEdit={() => setCreditEdit(c)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'commissions' && canCommissions && (
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
              <p className="py-10 text-center text-sm text-gray-500">
                {scopeToCurrentUser && isSalesAgentView
                  ? 'No cash payment proofs awaiting commission payout on your orders.'
                  : scopeToCurrentUser
                    ? 'No payment proofs on file for your accounts.'
                    : 'No orders with payment proofs yet.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                    <tr>
                      <th onClick={() => handleCommissionSort('orderNumber')} className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100">
                        <span className="flex items-center">Order{commissionSortIcon('orderNumber')}</span>
                      </th>
                      <th onClick={() => handleCommissionSort('trip')} className="text-left py-2.5 px-3 font-semibold hidden lg:table-cell cursor-pointer select-none hover:bg-gray-100">
                        <span className="flex items-center">Trip ID{commissionSortIcon('trip')}</span>
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
                      <th
                        onClick={() => handleCommissionSort('pendingCommissions')}
                        className="text-center py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100"
                      >
                        <span className="flex items-center justify-center">
                          Commission{commissionSortIcon('pendingCommissions')}
                        </span>
                      </th>
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
                        className={`${FINANCE_TABLE_ROW_CLASS} cursor-pointer`}
                        onClick={() => setCommissionModalOrder(row)}
                      >
                        <FinanceTableCellLink
                          to={`/orders/${row.orderId}`}
                          ariaLabel={`Open order ${row.orderNumber}`}
                          contentClassName="font-mono text-xs tabular-nums"
                          primary
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.orderNumber}
                        </FinanceTableCellLink>
                        <td className="py-3 px-3 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                          <OrderTripIdCell tripNumber={row.tripNumber} tripId={row.tripId} />
                        </td>
                        {row.customerId ? (
                          <FinanceTableCellLink
                            to={`/customers/${row.customerId}`}
                            ariaLabel={`Open customer ${row.customerName ?? ''}`}
                            tdClassName="max-w-[12rem]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.customerName ?? '—'}
                          </FinanceTableCellLink>
                        ) : (
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <span className="text-gray-800">{row.customerName ?? '—'}</span>
                          </td>
                        )}
                        {row.agentId && row.agentName && employeesPerms.pageAccess ? (
                          <FinanceTableCellLink
                            to={`/employees/${row.agentId}`}
                            ariaLabel={`Open agent ${row.agentName}`}
                            tdClassName="hidden md:table-cell"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.agentName}
                          </FinanceTableCellLink>
                        ) : (
                          <td className="py-3 px-3 text-gray-700 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                            {row.agentName ?? '—'}
                          </td>
                        )}
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

      <PortalModalOverlay
        open={exportPeriodModalOpen}
        onClose={() => setExportPeriodModalOpen(false)}
        mobileBottomSheet
      >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="outstanding-export-period-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="outstanding-export-period-modal-title" className="text-lg font-semibold text-gray-900">
                Order period
              </h2>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
                onClick={() => setExportPeriodModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Choose a preset or custom range. The order list and export both use this period (by order date).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DATE_PERIOD_OPTIONS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleExportModalPresetPick(kind)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      draftExportPeriodKind === kind
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draftExportPeriodKind === 'custom' && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                    <input
                      type="date"
                      value={draftExportCustomStart}
                      max={maxExportCustomDate}
                      onChange={e => setDraftExportCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftExportCustomEnd}
                      min={draftExportCustomStart || undefined}
                      max={maxExportCustomDate}
                      onChange={e => setDraftExportCustomEnd(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {draftExportCustomInvalid && (
                    <p className="text-xs text-red-600">Start must be on or before end.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setExportPeriodModalOpen(false)}>
                Cancel
              </Button>
              {draftExportPeriodKind === 'custom' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={draftExportCustomInvalid || !draftExportCustomStart || !draftExportCustomEnd}
                  onClick={applyExportModalCustomRange}
                >
                  Apply range
                </Button>
              )}
            </div>
          </div>
      </PortalModalOverlay>

      {commissionModalOrder && canCommissions && (
        <OrderCommissionProofsModal
          order={commissionModalOrder}
          canReleaseCommissions={canCommissions}
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

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={props.onClick}
      className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
        props.active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {props.icon}
      {props.children}
      {props.badge != null && props.badge > 0 && (
        <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
          {props.badge}
        </span>
      )}
    </button>
  );
}

function CreditRowCard(props: { row: CustomerCreditRow; canEdit: boolean; onEdit: () => void }) {
  const c = props.row;
                    return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <FinanceLink to={`/customers/${c.customerId}`} className={`${FINANCE_LINK_CLASS} font-semibold truncate block`}>
            {c.customerName}
          </FinanceLink>
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
  canReleaseCommissions: boolean;
  releasedBy: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
  onAudit?: (message: string) => void;
}) {
  const employeesPerms = useEmployeesPermissions();
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
    if (!props.canReleaseCommissions || commissionSummary.pendingCount === 0) return;
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
    if (!props.canReleaseCommissions) return;
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
          {props.order.customerId ? (
            <FinanceLink
              to={`/customers/${props.order.customerId}`}
              className={`${FINANCE_LINK_CLASS} font-semibold text-base`}
            >
              {props.order.customerName ?? '—'}
            </FinanceLink>
          ) : (
            <p className="font-semibold text-gray-900 text-base">{props.order.customerName ?? '—'}</p>
          )}
          <FinanceLink
            to={`/orders/${props.order.orderId}`}
            className={`${FINANCE_LINK_CLASS} text-xs font-mono`}
          >
            {props.order.orderNumber}
          </FinanceLink>
          <Badge
            variant="success"
            title={`${commissionPercentLabel} commission on cash payments`}
          >
            {clientType} Client • {commissionPercentLabel} Commission
          </Badge>
        </div>
        <p className="text-gray-600 text-xs">
          Agent:{' '}
          {props.order.agentId && props.order.agentName && employeesPerms.pageAccess ? (
            <FinanceLink to={`/employees/${props.order.agentId}`} className="text-xs">
              {props.order.agentName}
            </FinanceLink>
          ) : (
            props.order.agentName ?? '—'
          )}
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
          {props.canReleaseCommissions && commissionSummary.pendingCount > 0 ? (
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
                  ) : props.canReleaseCommissions ? (
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
    <ModalPortal open onBackdropClick={props.onClose} zIndex={50} backdropClassName="bg-black/60">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{props.title}</h2>
          <button onClick={props.onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
                </div>
        <div className="p-5 overflow-y-auto flex-1">{props.children}</div>
              </div>
    </ModalPortal>
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
