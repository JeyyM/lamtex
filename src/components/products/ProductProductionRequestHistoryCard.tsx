import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, ClipboardList, Factory, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import {
  fetchProductProductionRequestHistory,
  type ProductPrHistoryRow,
} from '@/src/lib/productProductionRequestHistory';

type PrStatus =
  | 'Draft'
  | 'Requested'
  | 'Accepted'
  | 'Rejected'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | string;

const fmt = (date: string | null | undefined) =>
  date
    ? new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

const getStatusVariant = (
  status: PrStatus,
): 'success' | 'warning' | 'danger' | 'neutral' | 'default' | 'info' => {
  if (status === 'Completed') return 'success';
  if (status === 'Cancelled' || status === 'Rejected') return 'danger';
  if (status === 'Requested') return 'warning';
  if (status === 'In Progress') return 'info';
  if (status === 'Accepted') return 'default';
  if (status === 'Draft') return 'neutral';
  return 'neutral';
};

type ValidPrHistoryRow = ProductPrHistoryRow & {
  production_requests: NonNullable<ProductPrHistoryRow['production_requests']>;
};

export interface ProductProductionRequestHistoryCardProps {
  productId: string;
  active: boolean;
  canOpenDetail: boolean;
}

export function ProductProductionRequestHistoryCard({
  productId,
  active,
  canOpenDetail,
}: ProductProductionRequestHistoryCardProps) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProductPrHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>('request_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [tablePage, setTablePage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const data = await fetchProductProductionRequestHistory(productId);
      setRows(data);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[product PR history]', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  useEffect(() => {
    setStatusFilter('');
    setTablePage(1);
  }, [productId]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIcon = (col: string) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 inline text-red-600" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 inline text-red-600" />
    );
  };

  const distinctStatuses = useMemo(() => {
    const s = new Set(
      rows
        .filter((r) => r.production_requests)
        .map((r) => r.production_requests!.status)
        .filter(Boolean),
    );
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const rowsMatchingFilters = useMemo(() => {
    const valid = rows.filter(
      (r): r is ValidPrHistoryRow => r.production_requests != null,
    );
    if (statusFilter === '') return valid;
    return valid.filter((r) => r.production_requests.status === statusFilter);
  }, [rows, statusFilter]);

  const sortedRows = useMemo(() => {
    const cmp = (a: string | number, b: string | number) => {
      if (typeof a === 'number' && typeof b === 'number') {
        if (a < b) return sortDir === 'asc' ? -1 : 1;
        if (a > b) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(a);
      const bs = String(b);
      if (as < bs) return sortDir === 'asc' ? -1 : 1;
      if (as > bs) return sortDir === 'asc' ? 1 : -1;
      return 0;
    };
    return [...rowsMatchingFilters].sort((a, b) => {
      const pra = a.production_requests;
      const prb = b.production_requests;
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'pr_number':
          av = pra.pr_number;
          bv = prb.pr_number;
          break;
        case 'branch':
          av = pra.branches?.name ?? '';
          bv = prb.branches?.name ?? '';
          break;
        case 'status':
          av = pra.status;
          bv = prb.status;
          break;
        case 'request_date':
          av = pra.request_date;
          bv = prb.request_date;
          break;
        case 'expected':
          av = pra.expected_completion_date ?? '';
          bv = prb.expected_completion_date ?? '';
          break;
        case 'variant':
          av = a.product_variants?.size ?? a.product_variants?.sku ?? '';
          bv = b.product_variants?.size ?? b.product_variants?.sku ?? '';
          break;
        case 'qty_requested':
          av = a.quantity;
          bv = b.quantity;
          break;
        case 'qty_completed':
          av = a.quantity_completed;
          bv = b.quantity_completed;
          break;
        default:
          av = pra.request_date;
          bv = prb.request_date;
      }
      return cmp(av, bv);
    });
  }, [rowsMatchingFilters, sortKey, sortDir]);

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
  }, [productId, rows.length, statusFilter]);

  const openDetail = (requestId: string) => {
    if (canOpenDetail) navigate(`/production-requests/${requestId}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <ClipboardList className="w-5 h-5" />
            <span>Production Request History</span>
            <span className="text-base font-medium text-gray-500 tabular-nums">
              ({rowsMatchingFilters.length})
            </span>
          </CardTitle>
          {!loading && rows.length > 0 && (
            <div className="md:hidden mt-3">
              <select
                aria-label="Filter by production request status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              >
                <option value="">Status</option>
                {distinctStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-red-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Factory className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-sm font-medium">
                No production requests yet for this product
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Use Request Production above to start a new request
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th
                        onClick={() => handleSort('pr_number')}
                        className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">
                          PR Number{sortIcon('pr_number')}
                        </span>
                      </th>
                      <th
                        onClick={() => handleSort('branch')}
                        className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">
                          Branch{sortIcon('branch')}
                        </span>
                      </th>
                      <th className="px-3 py-3 text-center font-medium align-top min-w-[8.5rem] max-w-[12rem]">
                        <div className="normal-case flex justify-center">
                          <select
                            aria-label="Filter by production request status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-[10rem] text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
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
                      <th
                        onClick={() => handleSort('request_date')}
                        className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">
                          Request Date{sortIcon('request_date')}
                        </span>
                      </th>
                      <th
                        onClick={() => handleSort('expected')}
                        className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">
                          Expected{sortIcon('expected')}
                        </span>
                      </th>
                      <th
                        onClick={() => handleSort('variant')}
                        className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">
                          Variant{sortIcon('variant')}
                        </span>
                      </th>
                      <th
                        onClick={() => handleSort('qty_requested')}
                        className="px-5 py-3 text-right font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center justify-end w-full">
                          Qty Requested{sortIcon('qty_requested')}
                        </span>
                      </th>
                      <th
                        onClick={() => handleSort('qty_completed')}
                        className="px-5 py-3 text-right font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="inline-flex items-center justify-end w-full">
                          Qty Completed{sortIcon('qty_completed')}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rowsMatchingFilters.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">
                          No production requests match the selected status. Choose{' '}
                          <span className="font-medium text-gray-700">Status</span> to show all.
                        </td>
                      </tr>
                    ) : (
                      pagedRows.map((row) => {
                        const pr = row.production_requests;
                        const pct =
                          row.quantity > 0
                            ? Math.round((row.quantity_completed / row.quantity) * 100)
                            : 0;
                        const variantLabel =
                          row.product_variants?.size ||
                          row.product_variants?.sku ||
                          '—';
                        return (
                          <tr
                            key={row.id}
                            className={
                              canOpenDetail ? 'hover:bg-gray-50 cursor-pointer' : undefined
                            }
                            onClick={() => openDetail(pr.id)}
                          >
                            <td className="px-5 py-3 font-mono text-xs text-indigo-600 font-semibold">
                              {pr.pr_number}
                            </td>
                            <td className="px-5 py-3 text-gray-900">
                              {pr.branches?.name ?? '—'}
                            </td>
                            <td className="px-5 py-3 text-center align-middle">
                              <Badge variant={getStatusVariant(pr.status)}>{pr.status}</Badge>
                            </td>
                            <td className="px-5 py-3 text-gray-600 text-xs">{fmt(pr.request_date)}</td>
                            <td className="px-5 py-3 text-gray-600 text-xs">
                              {fmt(pr.expected_completion_date)}
                            </td>
                            <td className="px-5 py-3 text-gray-900">{variantLabel}</td>
                            <td className="px-5 py-3 text-right font-medium text-gray-900">
                              {Number(row.quantity).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span
                                className={
                                  pct >= 100
                                    ? 'text-green-600 font-semibold'
                                    : pct > 0
                                      ? 'text-amber-600 font-semibold'
                                      : 'text-gray-400'
                                }
                              >
                                {Number(row.quantity_completed).toLocaleString()}
                              </span>
                              <span className="text-gray-400 text-xs ml-1">({pct}%)</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-200">
                {rowsMatchingFilters.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No production requests match the selected status. Choose{' '}
                    <span className="font-medium text-gray-700">Status</span> to show all.
                  </div>
                ) : (
                  pagedRows.map((row) => {
                    const pr = row.production_requests;
                    const pct =
                      row.quantity > 0
                        ? Math.round((row.quantity_completed / row.quantity) * 100)
                        : 0;
                    const variantLabel =
                      row.product_variants?.size || row.product_variants?.sku || '—';
                    return (
                      <div
                        key={row.id}
                        className={
                          canOpenDetail
                            ? 'p-4 space-y-3 cursor-pointer hover:bg-gray-50'
                            : 'p-4 space-y-3'
                        }
                        onClick={() => openDetail(pr.id)}
                      >
                        <div className="space-y-2">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-indigo-600 font-semibold break-all">
                              {pr.pr_number}
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-0.5">
                              {pr.branches?.name ?? '—'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{variantLabel}</p>
                          </div>
                          <div className="flex justify-center">
                            <Badge variant={getStatusVariant(pr.status)}>{pr.status}</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">Requested</p>
                            <p className="font-medium text-gray-900">
                              {Number(row.quantity).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Completed</p>
                            <p
                              className={`font-medium ${
                                pct >= 100
                                  ? 'text-green-600'
                                  : pct > 0
                                    ? 'text-amber-600'
                                    : 'text-gray-400'
                              }`}
                            >
                              {Number(row.quantity_completed).toLocaleString()}{' '}
                              <span className="text-gray-400">({pct}%)</span>
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 pt-1 border-t">
                          Requested: {fmt(pr.request_date)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {rowsMatchingFilters.length > 0 && (
                <TablePagination
                  page={tablePage}
                  total={sortedRows.length}
                  onPageChange={setTablePage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
