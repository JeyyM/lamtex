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
import { createDraftProductionRequest, prLogRoleMap } from '@/src/lib/productionRequestDraft';
import { isPrExpectedOverdue } from '@/src/lib/prOverdue';
import {
  DATE_PERIOD_OPTIONS,
  inDatePeriodRange,
  periodTriggerLabel,
  resolveDatePeriodQuery,
  todayIsoLocal,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';
import {
  downloadProductionRequestsWorkbook,
  fetchProductionRequestLinesForExport,
  type ProductionRequestHeaderExportRow,
} from '@/src/lib/productionRequestsExport';
import { useProductionRequestPermissions } from '@/src/lib/permissions/productionRequestPermissions';
import { useInterBranchRequestPermissions } from '@/src/lib/permissions/interBranchRequestPermissions';
import { ModuleAccessDenied } from '@/src/components/permissions/ModuleAccessDenied';
import {
  Search,
  Plus,
  Factory,
  RefreshCw,
  AlertTriangle,
  Loader2,
  CheckCircle,
  ClipboardList,
  PlayCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ThumbsUp,
  XCircle,
  Ban,
  FileText,
  ArrowRightLeft,
  CalendarRange,
  Download,
  X,
} from 'lucide-react';

export type PRStatus = 'Draft' | 'Requested' | 'Rejected' | 'Accepted' | 'In Progress' | 'Completed' | 'Cancelled';

interface PRRow {
  id: string;
  pr_number: string;
  branch_id: string | null;
  status: PRStatus;
  request_date: string;
  expected_completion_date: string | null;
  created_by: string | null;
  created_at: string;
  is_transfer_request: boolean;
  transfer_requesting_branch_id: string | null;
  branches: { name: string } | null;
  tr_branch: { name: string } | null;
  inter_branch_request_id: string | null;
  inter_branch: { ibr_number: string; status: string } | null;
  production_request_items: { id: string }[];
}

const fmt = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const getStatusVariant = (status: PRStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'default' | 'info' => {
  if (status === 'Completed') return 'success';
  if (status === 'Cancelled' || status === 'Rejected') return 'danger';
  if (status === 'Requested') return 'warning';
  if (status === 'In Progress') return 'info';
  if (status === 'Accepted') return 'default';
  if (status === 'Draft') return 'neutral';
  return 'neutral';
};

/** Statuses that represent a closed PR — hidden by default, shown when "Show completed" is on. */
const PR_CLOSED_STATUSES: PRStatus[] = ['Completed', 'Cancelled', 'Rejected'];

/** IBR approval can create a PR for products to send; track those under Inter-branch requests, not this list. */
function isIbrFlowProductionRequest(r: PRRow): boolean {
  return r.inter_branch_request_id != null || r.pr_number.startsWith('PR-IBR-');
}

const getPRStatusIcon = (status: PRStatus) => {
  if (status === 'Completed') return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === 'In Progress') return <PlayCircle className="w-3.5 h-3.5" />;
  if (status === 'Cancelled') return <Ban className="w-3.5 h-3.5" />;
  if (status === 'Draft') return <FileText className="w-3.5 h-3.5" />;
  if (status === 'Requested') return <ClipboardList className="w-3.5 h-3.5" />;
  if (status === 'Rejected') return <XCircle className="w-3.5 h-3.5" />;
  if (status === 'Accepted') return <ThumbsUp className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
};

export function ProductionRequestsPage() {
  const { branch, employeeName, role, session, employeeId, addAuditLog } = useAppContext();
  const perms = useProductionRequestPermissions();
  const ibrPerms = useInterBranchRequestPermissions();
  const navigate = useNavigate();

  const [rows, setRows] = useState<PRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [prSortKey, setPrSortKey] = useState<string>('request_date');
  const [prSortDir, setPrSortDir] = useState<'asc' | 'desc'>('desc');
  const [tablePage, setTablePage] = useState(1);

  const [exportPeriodKind, setExportPeriodKind] = useState<DatePeriodKind>('month');
  const [exportCustomStart, setExportCustomStart] = useState('');
  const [exportCustomEnd, setExportCustomEnd] = useState('');
  const [exportPeriodModalOpen, setExportPeriodModalOpen] = useState(false);
  const [draftExportPeriodKind, setDraftExportPeriodKind] = useState<DatePeriodKind>('month');
  const [draftExportCustomStart, setDraftExportCustomStart] = useState('');
  const [draftExportCustomEnd, setDraftExportCustomEnd] = useState('');
  const [exportingRequests, setExportingRequests] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchResult, prResult] = await Promise.all([
        branch
          ? supabase.from('branches').select('id').eq('name', branch).single()
          : Promise.resolve({ data: null }),
        supabase
          .from('production_requests')
          .select(
            'id, pr_number, branch_id, status, request_date, expected_completion_date, created_by, created_at, is_transfer_request, transfer_requesting_branch_id, inter_branch_request_id, branches:branches!branch_id(name), tr_branch:branches!transfer_requesting_branch_id(name), inter_branch:inter_branch_requests!inter_branch_request_id(ibr_number, status), production_request_items(id)',
          )
          .order('created_at', { ascending: false }),
      ]);
      if (prResult.error) throw prResult.error;
      const resolvedId = (branchResult as { data: { id: string } | null }).data?.id ?? null;
      setResolvedBranchId(resolvedId);
      setRows((prResult.data ?? []) as unknown as PRRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load production requests';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

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

  const branchFiltered = rows.filter((r) => !resolvedBranchId || r.branch_id === resolvedBranchId);

  const prRowsExcludingIbr = useMemo(
    () => branchFiltered.filter((r) => !isIbrFlowProductionRequest(r)),
    [branchFiltered],
  );

  const dateFilteredProductionRequests = useMemo(() => {
    if (exportQueryDates.invalid) return prRowsExcludingIbr;
    return prRowsExcludingIbr.filter((r) =>
      inDatePeriodRange(r.request_date, exportQueryDates.from, exportQueryDates.to),
    );
  }, [prRowsExcludingIbr, exportQueryDates]);

  const distinctStatuses = useMemo((): string[] => {
    const pool = showCompleted
      ? dateFilteredProductionRequests
      : dateFilteredProductionRequests.filter((r) => !PR_CLOSED_STATUSES.includes(r.status));
    const s = new Set<string>(pool.map((r) => String(r.status)).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [dateFilteredProductionRequests, showCompleted]);

  // Reset status filter if its status is now hidden by the showCompleted toggle
  useEffect(() => {
    if (!showCompleted && PR_CLOSED_STATUSES.includes(statusFilter as PRStatus)) {
      setStatusFilter('');
    }
  }, [showCompleted, statusFilter]);

  const filtered = dateFilteredProductionRequests.filter((r) => {
    if (!showCompleted && PR_CLOSED_STATUSES.includes(r.status)) return false;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.pr_number.toLowerCase().includes(q) ||
      (r.created_by ?? '').toLowerCase().includes(q) ||
      (r.branches?.name ?? '').toLowerCase().includes(q) ||
      (r.tr_branch?.name ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === '' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSort = (key: string) => {
    if (prSortKey === key) {
      setPrSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setPrSortKey(key);
      setPrSortDir('asc');
    }
  };

  const prSortIcon = (col: string) => {
    if (prSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return prSortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-red-600" /> : <ArrowDown className="w-3 h-3 ml-1 text-red-600" />;
  };

  const sortedRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (prSortKey) {
        case 'pr_number':
          av = a.pr_number;
          bv = b.pr_number;
          break;
        case 'request_date':
          av = a.request_date;
          bv = b.request_date;
          break;
        case 'branch':
          av = a.branches?.name ?? '';
          bv = b.branches?.name ?? '';
          break;
        case 'items':
          av = a.production_request_items.length;
          bv = b.production_request_items.length;
          break;
        case 'expected':
          av = a.expected_completion_date ?? '';
          bv = b.expected_completion_date ?? '';
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        default:
          av = a.request_date;
          bv = b.request_date;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av < bv) return prSortDir === 'asc' ? -1 : 1;
        if (av > bv) return prSortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return prSortDir === 'asc' ? -1 : 1;
      if (as > bs) return prSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, prSortKey, prSortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / TABLE_PAGE_SIZE) || 1);
  const pagedRows = useMemo(() => {
    const p = Math.min(tablePage, totalPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedRows.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedRows, tablePage, totalPages]);

  useEffect(() => {
    if (tablePage > totalPages) setTablePage(totalPages);
  }, [tablePage, totalPages]);

  useEffect(() => {
    setTablePage(1);
  }, [searchQuery, statusFilter, showCompleted, resolvedBranchId, exportPeriodKind, exportCustomStart, exportCustomEnd]);

  const totalPRs = dateFilteredProductionRequests.length;
  const drafts = dateFilteredProductionRequests.filter((r) => r.status === 'Draft').length;
  const awaiting = dateFilteredProductionRequests.filter((r) => r.status === 'Requested').length;
  const inProgress = dateFilteredProductionRequests.filter((r) => r.status === 'In Progress').length;
  const completed = dateFilteredProductionRequests.filter((r) => PR_CLOSED_STATUSES.includes(r.status)).length;

  const handleNewPR = async () => {
    setCreating(true);
    try {
      let branchId: string | null = null;
      if (branch) {
        const { data: bd } = await supabase.from('branches').select('id').eq('name', branch).single();
        branchId = bd?.id ?? null;
      }
      const actor = employeeName || session?.user?.email || 'User';
      const logRole = prLogRoleMap[role] ?? 'System';
      const { id } = await createDraftProductionRequest({
        branchId,
        actor,
        logRole,
        createdByAuthUserId: session?.user?.id ?? null,
        createdByEmployeeId: employeeId ?? null,
      });
      navigate(`/production-requests/${id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading production requests…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-1">Failed to load production requests</p>
          <p className="text-sm text-gray-500 mb-2">{error}</p>
          <p className="text-xs text-gray-500 mb-4">If this is the first time, run <code className="bg-gray-100 px-1 rounded">database/production_requests_migration.sql</code> in Supabase.</p>
          <Button variant="outline" onClick={() => void fetchRows()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!perms.pageAccess) {
    return <ModuleAccessDenied moduleName="Production Requests" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Production Requests</h1>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          {ibrPerms.pageAccess && (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/inter-branch-requests')}
            className="w-full sm:w-auto gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" /> Inter-branch
          </Button>
          )}
          {perms.creation && (
          <Button variant="primary" onClick={() => void handleNewPR()} disabled={creating} className="w-full sm:w-auto gap-2">
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> New Production Request
              </>
            )}
          </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatKpiCard
          label="Total"
          value={String(totalPRs)}
          tone="indigo"
          icon={<Factory />}
          sub={drafts > 0 ? `Draft: ${drafts}` : undefined}
        />
        <StatKpiCard label="Pending approval" value={String(awaiting)} tone="amber" icon={<ClipboardList />} />
        <StatKpiCard label="In progress" value={String(inProgress)} tone="blue" icon={<PlayCircle />} />
        <StatKpiCard label="Completed / closed" value={String(completed)} tone="emerald" icon={<CheckCircle />} sub="Completed · Cancelled · Rejected" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by PR #, branch, or requested by…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
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
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="">Status</option>
                {distinctStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              Production Requests — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
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
                disabled={exportingRequests || loading || exportQueryDates.invalid}
                onClick={async () => {
                  if (exportingRequests || loading || exportQueryDates.invalid) return;
                  if (filtered.length === 0) {
                    window.alert('No production requests match the current filters and date range.');
                    return;
                  }
                  setExportingRequests(true);
                  try {
                    const headerRows: ProductionRequestHeaderExportRow[] = filtered.map((r) => ({
                      pr_number: r.pr_number,
                      request_date: r.request_date.slice(0, 10),
                      branch: r.branches?.name ?? '',
                      line_count: r.production_request_items.length,
                      expected_completion_date: r.expected_completion_date
                        ? r.expected_completion_date.slice(0, 10)
                        : '',
                      status: r.status,
                      created_by: r.created_by ?? '',
                    }));
                    const lines = await fetchProductionRequestLinesForExport(filtered.map((r) => r.id));
                    await downloadProductionRequestsWorkbook(branch ?? 'All branches', headerRows, lines);
                    addAuditLog(
                      'Exported production requests workbook',
                      'Production',
                      `${filtered.length} requests · ${exportQueryDates.displayLabel}`,
                    );
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : 'Export failed.');
                  } finally {
                    setExportingRequests(false);
                  }
                }}
              >
                {exportingRequests ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="w-4 h-4" aria-hidden />
                )}
                {exportingRequests ? 'Exporting…' : 'Export'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Factory className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-sm">No production requests found</p>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-200">
                {pagedRows.map((r) => {
                  const targetOverdue = isPrExpectedOverdue(r.expected_completion_date, r.status);
                  return (
                  <Link
                    key={r.id}
                    to={`/production-requests/${r.id}`}
                    className="block p-4 space-y-3 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-blue-600">{r.pr_number}</div>
                        {(r.inter_branch_request_id || r.is_transfer_request) && (
                          <Badge
                            variant="default"
                            className="mt-1 text-[10px] border-violet-200 bg-violet-50 text-violet-800 gap-0.5"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            {r.inter_branch?.ibr_number
                              ? `Inter-branch · ${r.inter_branch.ibr_number}`
                              : `Transfer${r.tr_branch?.name ? ` · ${r.tr_branch.name}` : ''}`}
                          </Badge>
                        )}
                        <div className="text-sm text-gray-900 mt-0.5">{r.branches?.name ?? '—'}</div>
                      </div>
                      <Badge variant={getStatusVariant(r.status)} className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                        {getPRStatusIcon(r.status)} {r.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Request date</p>
                        <p className="font-medium text-gray-900">{fmt(r.request_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Target</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={`font-medium ${targetOverdue ? 'text-red-800' : 'text-gray-900'}`}
                          >
                            {fmt(r.expected_completion_date)}
                          </p>
                          {targetOverdue && (
                            <Badge variant="danger" className="text-[10px] px-1.5 py-0 gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500">Lines</p>
                        <p className="font-medium text-gray-900">{r.production_request_items.length}</p>
                      </div>
                    </div>
                  </Link>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th
                        onClick={() => handleSort('pr_number')}
                        className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">PR Number{prSortIcon('pr_number')}</span>
                      </th>
                      <th
                        onClick={() => handleSort('request_date')}
                        className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Request Date{prSortIcon('request_date')}</span>
                      </th>
                      <th
                        onClick={() => handleSort('branch')}
                        className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Branch{prSortIcon('branch')}</span>
                      </th>
                      <th
                        onClick={() => handleSort('items')}
                        className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Lines{prSortIcon('items')}</span>
                      </th>
                      <th
                        onClick={() => handleSort('expected')}
                        className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Target{prSortIcon('expected')}</span>
                      </th>
                      <th className="px-3 py-3 text-center font-medium align-top w-44 min-w-[10rem] max-w-[14rem]">
                        <div className="normal-case flex justify-center">
                          <select
                            aria-label="Filter by status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-[11rem] text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="">Status</option>
                            {distinctStatuses.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pagedRows.map((r) => {
                      const targetOverdue = isPrExpectedOverdue(r.expected_completion_date, r.status);
                      const href = `/production-requests/${r.id}`;
                      const rowOverlay = (opts: { primary?: boolean }) => (
                        <TableRowCellOverlay
                          to={href}
                          ariaLabel={`Open production request ${r.pr_number}`}
                          primary={opts.primary}
                        />
                      );
                      return (
                      <tr key={r.id} className={TABLE_ROW_LINK_CLASS}>
                        <td className="relative px-6 py-4 align-top">
                          <div className={TABLE_ROW_CELL_CONTENT}>
                            <div className="font-medium text-blue-600">{r.pr_number}</div>
                            {(r.inter_branch_request_id || r.is_transfer_request) && (
                              <Badge
                                variant="default"
                                className="mt-1 text-[10px] border-violet-200 bg-violet-50 text-violet-800 gap-0.5"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                {r.inter_branch?.ibr_number
                                  ? `Inter-branch · ${r.inter_branch.ibr_number}`
                                  : `Transfer · ${r.tr_branch?.name ?? '—'}`}
                              </Badge>
                            )}
                          </div>
                          {rowOverlay({ primary: true })}
                        </td>
                        <td className="relative px-6 py-4 align-top text-gray-600">
                          <span className={TABLE_ROW_CELL_CONTENT}>{fmt(r.request_date)}</span>
                          {rowOverlay({})}
                        </td>
                        <td className="relative px-6 py-4 align-top font-medium text-gray-900">
                          <span className={TABLE_ROW_CELL_CONTENT}>{r.branches?.name ?? '—'}</span>
                          {rowOverlay({})}
                        </td>
                        <td className="relative px-6 py-4 align-top text-gray-600 tabular-nums">
                          <span className={TABLE_ROW_CELL_CONTENT}>{r.production_request_items.length}</span>
                          {rowOverlay({})}
                        </td>
                        <td className="relative px-6 py-4 align-top">
                          <div className={`${TABLE_ROW_CELL_CONTENT} flex items-center gap-2 flex-wrap`}>
                            <span className={targetOverdue ? 'text-red-800 font-medium' : 'text-gray-600'}>
                              {fmt(r.expected_completion_date)}
                            </span>
                            {targetOverdue && (
                              <Badge variant="danger" className="text-[10px] px-1.5 py-0 gap-0.5 shrink-0">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                          {rowOverlay({})}
                        </td>
                        <td className="relative px-6 py-4 align-top text-center">
                          <span className={`${TABLE_ROW_CELL_CONTENT} inline-flex [&_*]:pointer-events-none`}>
                            <Badge variant={getStatusVariant(r.status)} className="inline-flex items-center gap-1 whitespace-nowrap">
                              {getPRStatusIcon(r.status)} {r.status}
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

              {filtered.length > 0 && <TablePagination page={tablePage} total={sortedRows.length} onPageChange={setTablePage} />}
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
            aria-labelledby="pr-export-period-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="pr-export-period-modal-title" className="text-lg font-semibold text-gray-900">
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
