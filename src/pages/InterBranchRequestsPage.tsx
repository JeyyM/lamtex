import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import { supabase } from '@/src/lib/supabase';
import {
  Search,
  Plus,
  Factory,
  RefreshCw,
  AlertTriangle,
  Loader2,
  CheckCircle,
  ClipboardList,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ThumbsUp,
  XCircle,
  Ban,
  FileText,
  GitBranch,
  Calendar,
  Package,
  Truck,
} from 'lucide-react';
import type { IBRStatus } from '@/src/lib/interBranchRequest';

const getStatusVariant = (status: IBRStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'default' | 'info' => {
  if (status === 'Fulfilled' || status === 'Completed' || status === 'Delivered') return 'success';
  if (status === 'Cancelled' || status === 'Rejected') return 'danger';
  if (status === 'Pending') return 'warning';
  if (status === 'Approved' || status === 'Scheduled') return 'info';
  if (status === 'Draft') return 'neutral';
  if (['Loading', 'Packed', 'Ready', 'In Transit', 'Partially Fulfilled'].includes(status)) return 'warning';
  return 'neutral';
};

const getIBRStatusIcon = (status: IBRStatus) => {
  if (status === 'Fulfilled' || status === 'Completed' || status === 'Delivered') return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === 'Cancelled') return <Ban className="w-3.5 h-3.5" />;
  if (status === 'Draft') return <FileText className="w-3.5 h-3.5" />;
  if (status === 'Pending') return <ClipboardList className="w-3.5 h-3.5" />;
  if (status === 'Rejected') return <XCircle className="w-3.5 h-3.5" />;
  if (status === 'Approved') return <ThumbsUp className="w-3.5 h-3.5" />;
  if (status === 'Scheduled') return <Calendar className="w-3.5 h-3.5" />;
  if (status === 'Loading' || status === 'Packed' || status === 'Ready') return <Package className="w-3.5 h-3.5" />;
  if (status === 'In Transit') return <Truck className="w-3.5 h-3.5" />;
  if (status === 'Partially Fulfilled') return <GitBranch className="w-3.5 h-3.5" />;
  return <GitBranch className="w-3.5 h-3.5" />;
};

interface IBRListRow {
  id: string;
  ibr_number: string;
  status: IBRStatus;
  requesting_branch_id: string;
  fulfilling_branch_id: string;
  created_at: string;
  created_by: string | null;
  req_br: { name: string } | null;
  ful_br: { name: string } | null;
  inter_branch_request_items: { id: string }[];
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

export function InterBranchRequestsPage() {
  const { branch } = useAppContext();
  const navigate = useNavigate();
  const [rows, setRows] = useState<IBRListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ibrSortKey, setIbrSortKey] = useState<string>('created_at');
  const [ibrSortDir, setIbrSortDir] = useState<'asc' | 'desc'>('desc');
  const [tablePage, setTablePage] = useState(1);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchResult, res] = await Promise.all([
        branch
          ? supabase.from('branches').select('id').eq('name', branch).single()
          : Promise.resolve({ data: null }),
        supabase
          .from('inter_branch_requests')
          .select(
            'id, ibr_number, status, requesting_branch_id, fulfilling_branch_id, created_at, created_by, req_br:branches!requesting_branch_id(name), ful_br:branches!fulfilling_branch_id(name), inter_branch_request_items(id)',
          )
          .order('created_at', { ascending: false }),
      ]);
      if (res.error) throw res.error;
      setRows((res.data ?? []) as unknown as IBRListRow[]);
      setResolvedId((branchResult as { data: { id: string } | null }).data?.id ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load inter-branch requests');
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

  const branchFiltered = rows.filter(
    (r) => !resolvedId || r.requesting_branch_id === resolvedId || r.fulfilling_branch_id === resolvedId,
  );

  const distinctStatuses = useMemo((): string[] => {
    const s = new Set<string>(branchFiltered.map((r) => String(r.status)).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [branchFiltered]);

  const filtered = branchFiltered.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.ibr_number.toLowerCase().includes(q) ||
      (r.created_by ?? '').toLowerCase().includes(q) ||
      (r.req_br?.name ?? '').toLowerCase().includes(q) ||
      (r.ful_br?.name ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === '' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSort = (key: string) => {
    if (ibrSortKey === key) {
      setIbrSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setIbrSortKey(key);
      setIbrSortDir('asc');
    }
  };

  const ibrSortIcon = (col: string) => {
    if (ibrSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return ibrSortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-red-600" />
    );
  };

  const sortedRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (ibrSortKey) {
        case 'ibr_number':
          av = a.ibr_number;
          bv = b.ibr_number;
          break;
        case 'created_at':
          av = a.created_at;
          bv = b.created_at;
          break;
        case 'req':
          av = a.req_br?.name ?? '';
          bv = b.req_br?.name ?? '';
          break;
        case 'ful':
          av = a.ful_br?.name ?? '';
          bv = b.ful_br?.name ?? '';
          break;
        case 'items':
          av = a.inter_branch_request_items.length;
          bv = b.inter_branch_request_items.length;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        default:
          av = a.created_at;
          bv = b.created_at;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av < bv) return ibrSortDir === 'asc' ? -1 : 1;
        if (av > bv) return ibrSortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return ibrSortDir === 'asc' ? -1 : 1;
      if (as > bs) return ibrSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, ibrSortKey, ibrSortDir]);

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
  }, [searchQuery, statusFilter, resolvedId]);

  const totalIbr = branchFiltered.length;
  const drafts = branchFiltered.filter((r) => r.status === 'Draft').length;
  const pendingApproval = branchFiltered.filter((r) => r.status === 'Pending').length;
  const approved = branchFiltered.filter((r) => r.status === 'Approved').length;
  const fulfilled = branchFiltered.filter((r) => r.status === 'Fulfilled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading inter-branch requests…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-1">Failed to load inter-branch requests</p>
          <p className="text-sm text-gray-500 mb-2">{error}</p>
          <p className="text-xs text-gray-500 mb-4">
            Run <code className="bg-gray-100 px-1 rounded">database/inter_branch_requests_system.sql</code> in
            Supabase if this is the first setup.
          </p>
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inter-branch requests</h1>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <Button type="button" variant="outline" onClick={() => navigate('/production-requests')} className="w-full sm:w-auto gap-2">
            <Factory className="w-4 h-4" /> Production requests
          </Button>
          <Button variant="primary" onClick={() => navigate('/inter-branch-requests/new')} className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" /> New inter-branch request
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
                <p className="text-2xl font-bold text-gray-900">{totalIbr}</p>
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
                <p className="text-2xl font-bold text-gray-900">{pendingApproval}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ThumbsUp className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{approved}</p>
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
                <p className="text-sm text-gray-500">Fulfilled</p>
                <p className="text-2xl font-bold text-gray-900">{fulfilled}</p>
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
                placeholder="Search by IBR #, branch, or requested by…"
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
          <CardTitle>
            Inter-branch requests — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <GitBranch className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-sm">No inter-branch requests found</p>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-200">
                {pagedRows.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 space-y-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/inter-branch-requests/${r.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-blue-600">{r.ibr_number}</div>
                        <div className="text-sm text-gray-900 mt-0.5">
                          {r.req_br?.name ?? '—'} → {r.ful_br?.name ?? '—'}
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(r.status)} className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                        {getIBRStatusIcon(r.status)} {r.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="font-medium text-gray-900">{fmt(r.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Lines</p>
                        <p className="font-medium text-gray-900">{r.inter_branch_request_items.length}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th
                        onClick={() => handleSort('ibr_number')}
                        className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Number{ibrSortIcon('ibr_number')}</span>
                      </th>
                      <th
                        onClick={() => handleSort('req')}
                        className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Requesting{ibrSortIcon('req')}</span>
                      </th>
                      <th
                        onClick={() => handleSort('ful')}
                        className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Fulfilling{ibrSortIcon('ful')}</span>
                      </th>
                      <th
                        onClick={() => handleSort('items')}
                        className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Lines{ibrSortIcon('items')}</span>
                      </th>
                      <th
                        onClick={() => handleSort('created_at')}
                        className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">Created{ibrSortIcon('created_at')}</span>
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
                    {pagedRows.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/inter-branch-requests/${r.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-blue-600 hover:underline">{r.ibr_number}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{r.req_br?.name ?? '—'}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{r.ful_br?.name ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-600 tabular-nums">{r.inter_branch_request_items.length}</td>
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{fmt(r.created_at)}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={getStatusVariant(r.status)} className="inline-flex items-center gap-1 whitespace-nowrap">
                            {getIBRStatusIcon(r.status)} {r.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
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
