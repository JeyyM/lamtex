import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import { supabase } from '@/src/lib/supabase';
import { isPrExpectedOverdue } from '@/src/lib/prOverdue';
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

const prLogRoleMap: Record<string, string> = {
  Executive: 'Admin',
  Agent: 'Agent',
  Warehouse: 'Warehouse Staff',
  Logistics: 'Logistics',
  Driver: 'Logistics',
  Production: 'Production',
  Manager: 'Manager',
  Procurement: 'Procurement',
  Finance: 'Finance',
};

export function ProductionRequestsPage() {
  const { branch, employeeName, role, session } = useAppContext();
  const navigate = useNavigate();

  const [rows, setRows] = useState<PRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [prSortKey, setPrSortKey] = useState<string>('request_date');
  const [prSortDir, setPrSortDir] = useState<'asc' | 'desc'>('desc');
  const [tablePage, setTablePage] = useState(1);

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

  useEffect(() => {
    setStatusFilter('');
  }, [branch]);

  const branchFiltered = rows.filter((r) => !resolvedBranchId || r.branch_id === resolvedBranchId);

  const prRowsExcludingIbr = useMemo(
    () => branchFiltered.filter((r) => !isIbrFlowProductionRequest(r)),
    [branchFiltered],
  );

  const distinctStatuses = useMemo((): string[] => {
    const s = new Set<string>(prRowsExcludingIbr.map((r) => String(r.status)).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [prRowsExcludingIbr]);

  const filtered = prRowsExcludingIbr.filter((r) => {
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
  }, [searchQuery, statusFilter, resolvedBranchId]);

  const totalPRs = prRowsExcludingIbr.length;
  const drafts = prRowsExcludingIbr.filter((r) => r.status === 'Draft').length;
  const awaiting = prRowsExcludingIbr.filter((r) => r.status === 'Requested').length;
  const inProgress = prRowsExcludingIbr.filter((r) => r.status === 'In Progress').length;
  const completed = prRowsExcludingIbr.filter((r) => r.status === 'Completed').length;

  const handleNewPR = async () => {
    setCreating(true);
    try {
      let branchId: string | null = null;
      if (branch) {
        const { data: bd } = await supabase.from('branches').select('id').eq('name', branch).single();
        branchId = bd?.id ?? null;
      }
      const prNumber = `PR-${Date.now()}`;
      const actor = employeeName || session?.user?.email || 'User';
      const { data, error: insErr } = await supabase
        .from('production_requests')
        .insert({
          pr_number: prNumber,
          branch_id: branchId,
          status: 'Draft',
          request_date: new Date().toISOString().split('T')[0],
          created_by: actor,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      const logRole = prLogRoleMap[role] ?? 'System';
      const { error: logErr } = await supabase.from('production_request_logs').insert({
        request_id: data.id,
        action: 'drafted',
        performed_by: actor,
        performed_by_role: logRole,
        description: 'Created as draft — add product lines, then submit for approval',
        metadata: { pr_number: prNumber },
      });
      if (logErr && import.meta.env.DEV) console.warn('[PR log]', logErr.message);
      navigate(`/production-requests/${data.id}`);
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

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Production Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inter-branch “send” PRs are managed from Inter-branch requests, not this list.</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/inter-branch-requests')}
            className="w-full sm:w-auto gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" /> Inter-branch
          </Button>
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
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 rounded-lg">
                <Factory className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{totalPRs}</p>
                {drafts > 0 && <p className="text-xs text-gray-500 mt-0.5">Draft: {drafts}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <ClipboardList className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending approval</p>
                <p className="text-2xl font-bold text-gray-900">{awaiting}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <PlayCircle className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In progress</p>
                <p className="text-2xl font-bold text-gray-900">{inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by PR #, branch, or requested by…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
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
          <CardTitle>Production Requests — {filtered.length} result{filtered.length !== 1 ? 's' : ''}</CardTitle>
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
                  <div
                    key={r.id}
                    className="p-4 space-y-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/production-requests/${r.id}`)}
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
                  </div>
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
                      return (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/production-requests/${r.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-blue-600 hover:underline">{r.pr_number}</div>
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
                        </td>
                        <td className="px-6 py-4 text-gray-600">{fmt(r.request_date)}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{r.branches?.name ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-600 tabular-nums">{r.production_request_items.length}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={targetOverdue ? 'text-red-800 font-medium' : 'text-gray-600'}
                            >
                              {fmt(r.expected_completion_date)}
                            </span>
                            {targetOverdue && (
                              <Badge variant="danger" className="text-[10px] px-1.5 py-0 gap-0.5 shrink-0">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={getStatusVariant(r.status)} className="inline-flex items-center gap-1 whitespace-nowrap">
                            {getPRStatusIcon(r.status)} {r.status}
                          </Badge>
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

    </div>
  );
}
