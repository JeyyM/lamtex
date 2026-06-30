import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { StatKpiCard } from '@/src/components/ui/StatKpiCard';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import { TABLE_ROW_CELL_CONTENT, TABLE_ROW_LINK_CLASS, TableRowCellOverlay } from '@/src/components/ui/tableRowLink';
import { supabase } from '@/src/lib/supabase';
import {
  DATE_PERIOD_OPTIONS,
  inDatePeriodRange,
  periodTriggerLabel,
  resolveDatePeriodQuery,
  todayIsoLocal,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';
import {
  downloadPurchaseOrdersWorkbook,
  fetchPurchaseOrderLinesForExport,
  type PurchaseOrderHeaderExportRow,
} from '@/src/lib/purchaseOrdersExport';
import {
  createDraftPurchaseOrder,
  poLogRoleMap,
} from '@/src/lib/createDraftPurchaseOrder';
import { usePurchaseOrderPermissions } from '@/src/lib/permissions/purchaseOrderPermissions';
import { ModuleAccessDenied } from '@/src/components/permissions/ModuleAccessDenied';
import {
  ShoppingCart,
  Search,
  Plus,
  FileText,
  Download,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Package,
  PackageCheck,
  Truck,
  Ban,
  ClipboardList,
  XCircle,
  ThumbsUp,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CalendarRange,
  X,
} from 'lucide-react';
// ── Types ──────────────────────────────────────────────────
type POStatus = 'Draft' | 'Requested' | 'Rejected' | 'Accepted' | 'Sent' | 'Confirmed' | 'Partially Received' | 'Received' | 'Completed' | 'Cancelled';

interface PORow {
  id: string;
  po_number: string;
  branch_id: string | null;
  supplier_id: string | null;
  status: POStatus;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  total_amount: number;
  currency: string;
  payment_status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  is_transfer_request: boolean;
  inter_branch_request_id: string | null;
  suppliers: { name: string } | null;
  branches:  { name: string } | null;
  purchase_order_items: {
    id: string;
    raw_materials: { name: string; brand?: string | null } | null;
  }[];
}

const materialDisplayLine = (mat: { name: string; brand?: string | null } | null | undefined): string => {
  if (!mat?.name) return '';
  const brand = mat.brand?.trim();
  return brand ? `${mat.name} · ${brand}` : mat.name;
};

const poMaterialSummary = (po: PORow): string => {
  const names = po.purchase_order_items
    .map((it) => materialDisplayLine(it.raw_materials))
    .filter(Boolean);
  return names.length > 0 ? names.join(', ') : '—';
};

const fmt = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const getStatusVariant = (status: POStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'default' => {
  if (status === 'Completed')          return 'success';
  if (status === 'Received')           return 'default';
  if (status === 'Partially Received') return 'warning';
  if (status === 'Cancelled' || status === 'Rejected') return 'danger';
  if (status === 'Requested')         return 'warning';
  if (status === 'Accepted')           return 'default';
  if (status === 'Confirmed')          return 'default';
  if (status === 'Sent')               return 'default';
  return 'neutral';
};

/** Statuses that represent a closed PO — hidden by default, shown when "Show completed" is on. */
const PO_CLOSED_STATUSES: POStatus[] = ['Completed', 'Cancelled', 'Rejected'];

/** Inter-branch/transfer POs are not listed here; use **Inter-branch requests** in the app nav. */
function hideFromMainPurchaseOrderList(po: PORow): boolean {
  return (
    po.inter_branch_request_id != null ||
    po.po_number.startsWith('PO-IBR-') ||
    po.is_transfer_request === true
  );
}

const getStatusIcon = (status: POStatus) => {
  if (status === 'Completed')          return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === 'Sent')               return <Send className="w-3.5 h-3.5" />;
  if (status === 'Confirmed')          return <Truck className="w-3.5 h-3.5" />;
  if (status === 'Received')           return <PackageCheck className="w-3.5 h-3.5" />;
  if (status === 'Partially Received') return <Package className="w-3.5 h-3.5" />;
  if (status === 'Cancelled')          return <Ban className="w-3.5 h-3.5" />;
  if (status === 'Requested')          return <ClipboardList className="w-3.5 h-3.5" />;
  if (status === 'Rejected')           return <XCircle className="w-3.5 h-3.5" />;
  if (status === 'Accepted')            return <ThumbsUp className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
};

export function PurchaseOrdersPage() {
  const { branch, employeeName, role, session, addAuditLog } = useAppContext();
  const perms = usePurchaseOrderPermissions();
  const navigate = useNavigate();
  /** Branch-scoped users (assigned branch or executive branch filter) see material names instead of item counts. */
  const showMaterialsColumn = Boolean(branch);

  const [orders, setOrders]                     = useState<PORow[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [creating, setCreating]                 = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]           = useState('');
  /** '' = all PO statuses (matches column filter pattern on Orders) */
  const [statusFilter, setStatusFilter]         = useState('');
  const [showCompleted, setShowCompleted]      = useState(false);
  const [poSortKey, setPoSortKey]              = useState<string>('order_date');
  const [poSortDir, setPoSortDir]              = useState<'asc' | 'desc'>('desc');
  const [poTablePage, setPoTablePage]         = useState(1);

  const [exportPeriodKind, setExportPeriodKind] = useState<DatePeriodKind>('month');
  const [exportCustomStart, setExportCustomStart] = useState('');
  const [exportCustomEnd, setExportCustomEnd] = useState('');
  const [exportPeriodModalOpen, setExportPeriodModalOpen] = useState(false);
  const [draftExportPeriodKind, setDraftExportPeriodKind] = useState<DatePeriodKind>('month');
  const [draftExportCustomStart, setDraftExportCustomStart] = useState('');
  const [draftExportCustomEnd, setDraftExportCustomEnd] = useState('');
  const [exportingOrders, setExportingOrders] = useState(false);

  // ── Fetch ──────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchResult, ordersResult] = await Promise.all([
        branch
          ? supabase.from('branches').select('id').eq('name', branch).single()
          : Promise.resolve({ data: null }),
        supabase
          .from('purchase_orders')
          .select('*, suppliers(name), branches:branches!branch_id(name), purchase_order_items(id, raw_materials(name, brand))')
          .order('created_at', { ascending: false }),
      ]);
      if (ordersResult.error) throw ordersResult.error;
      const resolvedId = (branchResult as any).data?.id ?? null;
      setResolvedBranchId(resolvedId);
      setOrders((ordersResult.data ?? []) as unknown as PORow[]);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [branch]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

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
    setDraftExportCustomStart((prev) => prev || exportCustomStart || start);
    setDraftExportCustomEnd((prev) => prev || exportCustomEnd || iso);
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

  useEffect(() => {
    setStatusFilter('');
  }, [branch]);

  // ── Filter ─────────────────────────────────────────────
  const branchFiltered = orders.filter(po =>
    !resolvedBranchId || po.branch_id === resolvedBranchId
  );

  const visiblePurchaseOrders = useMemo(
    () => branchFiltered.filter((po) => !hideFromMainPurchaseOrderList(po)),
    [branchFiltered],
  );

  const dateFilteredPurchaseOrders = useMemo(() => {
    if (exportQueryDates.invalid) return visiblePurchaseOrders;
    return visiblePurchaseOrders.filter((po) =>
      inDatePeriodRange(po.order_date, exportQueryDates.from, exportQueryDates.to),
    );
  }, [visiblePurchaseOrders, exportQueryDates]);

  const distinctPoStatuses = useMemo(() => {
    const pool = showCompleted
      ? dateFilteredPurchaseOrders
      : dateFilteredPurchaseOrders.filter((po) => !PO_CLOSED_STATUSES.includes(po.status));
    const s = new Set<POStatus>(pool.map((po) => po.status).filter((v): v is POStatus => Boolean(v)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [dateFilteredPurchaseOrders, showCompleted]);

  // Reset status filter if it's now hidden by the showCompleted toggle
  useEffect(() => {
    if (!showCompleted && PO_CLOSED_STATUSES.includes(statusFilter as POStatus)) {
      setStatusFilter('');
    }
  }, [showCompleted, statusFilter]);

  const filtered = dateFilteredPurchaseOrders.filter((po) => {
    if (!showCompleted && PO_CLOSED_STATUSES.includes(po.status)) return false;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      po.po_number.toLowerCase().includes(q) ||
      (po.suppliers?.name ?? '').toLowerCase().includes(q) ||
      (po.branches?.name ?? '').toLowerCase().includes(q) ||
      poMaterialSummary(po).toLowerCase().includes(q);
    const matchesStatus = statusFilter === '' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePOSort = (key: string) => {
    if (poSortKey === key) {
      setPoSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setPoSortKey(key);
      setPoSortDir('asc');
    }
  };

  const poSortIcon = (col: string) => {
    if (poSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return poSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-red-600" />;
  };

  const sortedPOs = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (poSortKey) {
        case 'po_number': av = a.po_number; bv = b.po_number; break;
        case 'order_date': av = a.order_date; bv = b.order_date; break;
        case 'supplier': av = a.suppliers?.name ?? ''; bv = b.suppliers?.name ?? ''; break;
        case 'items':
          av = showMaterialsColumn ? poMaterialSummary(a) : a.purchase_order_items.length;
          bv = showMaterialsColumn ? poMaterialSummary(b) : b.purchase_order_items.length;
          break;
        case 'amount': av = a.total_amount; bv = b.total_amount; break;
        case 'expected': av = a.expected_delivery_date ?? ''; bv = b.expected_delivery_date ?? ''; break;
        case 'status': av = a.status; bv = b.status; break;
        default: av = a.order_date; bv = b.order_date;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av < bv) return poSortDir === 'asc' ? -1 : 1;
        if (av > bv) return poSortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return poSortDir === 'asc' ? -1 : 1;
      if (as > bs) return poSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, poSortKey, poSortDir, showMaterialsColumn]);

  const poTotalListPages = Math.max(1, Math.ceil(sortedPOs.length / TABLE_PAGE_SIZE) || 1);
  const pagedPOs = useMemo(() => {
    const p = Math.min(poTablePage, poTotalListPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedPOs.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedPOs, poTablePage, poTotalListPages]);

  useEffect(() => {
    if (poTablePage > poTotalListPages) setPoTablePage(poTotalListPages);
  }, [poTablePage, poTotalListPages]);

  useEffect(() => {
    setPoTablePage(1);
  }, [searchQuery, statusFilter, showCompleted, resolvedBranchId, exportPeriodKind, exportCustomStart, exportCustomEnd]);

  // ── KPIs ───────────────────────────────────────────────
  const totalPOs     = dateFilteredPurchaseOrders.length;
  const draftPOs     = dateFilteredPurchaseOrders.filter((po) => po.status === 'Draft').length;
  const awaitingPOs  = dateFilteredPurchaseOrders.filter((po) => po.status === 'Requested').length;
  // "In progress" = active POs that are NOT yet closed — Partially Received is active, not completed
  const pendingPOs   = dateFilteredPurchaseOrders.filter(po =>
    ['Accepted', 'Sent', 'Confirmed', 'Partially Received', 'Received'].includes(po.status)
  ).length;
  const completedPOs = dateFilteredPurchaseOrders.filter(po =>
    PO_CLOSED_STATUSES.includes(po.status)
  ).length;

  const isOverdue = (po: PORow) =>
    po.expected_delivery_date &&
    !po.actual_delivery_date &&
    new Date(po.expected_delivery_date) < new Date() &&
    !['Completed', 'Cancelled', 'Requested', 'Rejected', 'Accepted', 'Draft'].includes(po.status);

  // ── New PO: empty shell as Draft (same pattern as customer orders / production requests) ──
  const handleNewPO = async () => {
    setCreating(true);
    try {
      let branchId: string | null = null;
      if (branch) {
        const { data: bd } = await supabase.from('branches').select('id').eq('name', branch).single();
        branchId = bd?.id ?? null;
      }
      const actor = employeeName || session?.user?.email || 'User';
      const logRole = poLogRoleMap[role] ?? 'System';
      const { id } = await createDraftPurchaseOrder({ branchId, actor, logRole });
      navigate(`/purchase-orders/${id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create purchase order');
    } finally {
      setCreating(false);
    }
  };

  // ── Loading / Error ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading purchase orders…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-1">Failed to load purchase orders</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchOrders} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!perms.pageAccess) {
    return <ModuleAccessDenied moduleName="Purchase Orders" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Purchase Orders</h1>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto sm:items-center">
          {perms.creation && (
          <Button variant="primary" onClick={() => void handleNewPO()} disabled={creating} className="w-full sm:w-auto gap-2">
            {creating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              : <><Plus className="w-4 h-4" /> New Purchase Order</>
            }
          </Button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatKpiCard
          label="Total POs"
          value={String(totalPOs)}
          tone="blue"
          icon={<ShoppingCart />}
          sub={draftPOs > 0 ? `Draft: ${draftPOs}` : undefined}
        />
        <StatKpiCard label="Pending approval" value={String(awaitingPOs)} tone="amber" icon={<ClipboardList />} />
        <StatKpiCard label="In progress" value={String(pendingPOs)} tone="orange" icon={<Clock />} />
        <StatKpiCard label="Completed / closed" value={String(completedPOs)} tone="emerald" icon={<CheckCircle />} sub="Completed · Cancelled · Rejected" />
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={showMaterialsColumn ? 'Search by PO number, supplier, or material…' : 'Search by PO number or supplier…'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors shrink-0 ${
                  showCompleted
                    ? 'bg-white border-emerald-500 text-emerald-700 shadow-[0_0_8px_2px_rgba(16,185,129,0.35)] hover:border-emerald-600'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Show completed
              </button>
            </div>
            <div className="md:hidden">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="">Status</option>
                {distinctPoStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              Purchase Orders — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-gray-300 bg-white max-w-[18rem]"
                aria-haspopup="dialog"
                aria-expanded={exportPeriodModalOpen}
                aria-label="Choose export period"
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
                className="gap-2 border-gray-300 bg-white"
                disabled={exportingOrders || loading || exportQueryDates.invalid}
                onClick={async () => {
                  if (exportingOrders || loading || exportQueryDates.invalid) return;
                  if (filtered.length === 0) {
                    window.alert('No purchase orders match the current filters and date range.');
                    return;
                  }
                  setExportingOrders(true);
                  try {
                    const headerRows: PurchaseOrderHeaderExportRow[] = filtered.map((po) => ({
                      po_number: po.po_number,
                      order_date: po.order_date.slice(0, 10),
                      supplier: po.suppliers?.name ?? '',
                      branch: po.branches?.name ?? '',
                      line_count: po.purchase_order_items.length,
                      total_amount: po.total_amount,
                      currency: po.currency,
                      expected_delivery_date: po.expected_delivery_date
                        ? po.expected_delivery_date.slice(0, 10)
                        : '',
                      actual_delivery_date: po.actual_delivery_date
                        ? po.actual_delivery_date.slice(0, 10)
                        : '',
                      status: po.status,
                      payment_status: po.payment_status ?? '',
                      created_by: po.created_by ?? '',
                    }));
                    const lines = await fetchPurchaseOrderLinesForExport(filtered.map((po) => po.id));
                    await downloadPurchaseOrdersWorkbook(branch ?? 'All branches', headerRows, lines);
                    addAuditLog(
                      'Exported purchase orders workbook',
                      'Purchase',
                      `${filtered.length} orders · ${exportQueryDates.displayLabel}`,
                    );
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : 'Export failed.');
                  } finally {
                    setExportingOrders(false);
                  }
                }}
              >
                {exportingOrders ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="w-4 h-4" aria-hidden />
                )}
                {exportingOrders ? 'Exporting…' : 'Export'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ShoppingCart className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-sm">No purchase orders found</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {pagedPOs.map(po => (
                  <Link
                    key={po.id}
                    to={`/purchase-orders/${po.id}`}
                    className="block p-4 space-y-3 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-blue-600">{po.po_number}</div>
                        <div className="text-sm text-gray-900 mt-0.5">{po.suppliers?.name ?? '—'}</div>
                      </div>
                      <Badge variant={getStatusVariant(po.status)} className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                        {getStatusIcon(po.status)} {po.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-gray-500">Order Date</p><p className="font-medium">{fmt(po.order_date)}</p></div>
                      <div>
                        <p className="text-gray-500">Exp. Delivery</p>
                        <p className={`font-medium ${isOverdue(po) ? 'text-red-600' : ''}`}>
                          {fmt(po.expected_delivery_date)}{isOverdue(po) ? ' ⚠' : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">{showMaterialsColumn ? 'Materials' : 'Items'}</p>
                        <p className={`font-medium ${showMaterialsColumn ? 'text-gray-900 line-clamp-2' : ''}`}>
                          {showMaterialsColumn ? poMaterialSummary(po) : po.purchase_order_items.length}
                        </p>
                      </div>
                      <div><p className="text-gray-500">Amount</p><p className="font-medium">₱{po.total_amount.toLocaleString()}</p></div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th onClick={() => handlePOSort('po_number')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="inline-flex items-center">PO Number{poSortIcon('po_number')}</span>
                      </th>
                      <th onClick={() => handlePOSort('order_date')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="inline-flex items-center">Order Date{poSortIcon('order_date')}</span>
                      </th>
                      <th onClick={() => handlePOSort('supplier')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="inline-flex items-center">Supplier{poSortIcon('supplier')}</span>
                      </th>
                      <th onClick={() => handlePOSort('items')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900 min-w-[10rem]">
                        <span className="inline-flex items-center">{showMaterialsColumn ? 'Materials' : 'Items'}{poSortIcon('items')}</span>
                      </th>
                      <th onClick={() => handlePOSort('amount')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="inline-flex items-center">Amount{poSortIcon('amount')}</span>
                      </th>
                      <th onClick={() => handlePOSort('expected')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="inline-flex items-center">Exp. Delivery{poSortIcon('expected')}</span>
                      </th>
                      <th className="px-3 py-3 text-center font-medium align-top w-44 min-w-[10rem] max-w-[14rem]">
                        <div className="normal-case flex justify-center">
                          <select
                            aria-label="Filter by status"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-[11rem] text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="">Status</option>
                            {distinctPoStatuses.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pagedPOs.map(po => {
                      const href = `/purchase-orders/${po.id}`;
                      const rowOverlay = (opts: { primary?: boolean }) => (
                        <TableRowCellOverlay
                          to={href}
                          ariaLabel={`Open purchase order ${po.po_number}`}
                          primary={opts.primary}
                        />
                      );
                      return (
                      <tr key={po.id} className={TABLE_ROW_LINK_CLASS}>
                        <td className="relative px-6 py-4 align-top">
                          <span className={`${TABLE_ROW_CELL_CONTENT} font-medium text-blue-600`}>{po.po_number}</span>
                          {rowOverlay({ primary: true })}
                        </td>
                        <td className="relative px-6 py-4 align-top text-gray-600">
                          <span className={TABLE_ROW_CELL_CONTENT}>{fmt(po.order_date)}</span>
                          {rowOverlay({})}
                        </td>
                        <td className="relative px-6 py-4 align-top font-medium text-gray-900">
                          <span className={TABLE_ROW_CELL_CONTENT}>{po.suppliers?.name ?? '—'}</span>
                          {rowOverlay({})}
                        </td>
                        <td className="relative px-6 py-4 align-top text-gray-600">
                          <span
                            className={`${TABLE_ROW_CELL_CONTENT} ${showMaterialsColumn ? 'text-gray-900 line-clamp-2' : 'tabular-nums'}`}
                            title={showMaterialsColumn ? poMaterialSummary(po) : undefined}
                          >
                            {showMaterialsColumn ? poMaterialSummary(po) : po.purchase_order_items.length}
                          </span>
                          {rowOverlay({})}
                        </td>
                        <td className="relative px-6 py-4 align-top font-medium text-gray-900">
                          <span className={TABLE_ROW_CELL_CONTENT}>
                            {po.currency === 'USD' ? '$' : '₱'}{po.total_amount.toLocaleString()}
                          </span>
                          {rowOverlay({})}
                        </td>
                        <td className="relative px-6 py-4 align-top">
                          <span className={`${TABLE_ROW_CELL_CONTENT} ${isOverdue(po) ? 'text-red-600 font-medium inline-flex items-center gap-1' : 'text-gray-600'}`}>
                            {isOverdue(po) && <AlertTriangle className="w-3.5 h-3.5" />}
                            {fmt(po.expected_delivery_date)}
                          </span>
                          {rowOverlay({})}
                        </td>
                        <td className="relative px-6 py-4 align-top text-center">
                          <span className={`${TABLE_ROW_CELL_CONTENT} inline-flex [&_*]:pointer-events-none`}>
                            <Badge variant={getStatusVariant(po.status)} className="inline-flex items-center gap-1 whitespace-nowrap">
                              {getStatusIcon(po.status)} {po.status}
                            </Badge>
                          </span>
                          {rowOverlay({})}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {sortedPOs.length > 0 && (
                <TablePagination page={poTablePage} total={sortedPOs.length} onPageChange={setPoTablePage} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PortalModalOverlay
        open={exportPeriodModalOpen}
        onClose={() => setExportPeriodModalOpen(false)}
        mobileBottomSheet
      >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="po-export-period-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="po-export-period-modal-title" className="text-lg font-semibold text-gray-900">
                Export period
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
                Choose a preset or custom range. The list, summary cards, and export all use this period. It stays the same when you switch branches.
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
                      onChange={(e) => setDraftExportCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftExportCustomEnd}
                      min={draftExportCustomStart || undefined}
                      max={maxExportCustomDate}
                      onChange={(e) => setDraftExportCustomEnd(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {draftExportCustomInvalid && (
                    <p className="text-xs text-red-600">Start must be on or before end.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 bg-white"
                onClick={() => setExportPeriodModalOpen(false)}
              >
                Cancel
              </Button>
              {draftExportPeriodKind === 'custom' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={draftExportCustomInvalid}
                  onClick={applyExportModalCustomRange}
                >
                  Apply range
                </Button>
              )}
            </div>
          </div>
      </PortalModalOverlay>
    </div>
  );
}
