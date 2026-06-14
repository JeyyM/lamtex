import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import { fetchProductOrderHistory, type ProductOrderHistoryRow } from '@/src/lib/productOrderHistory';
import { OrderTripIdCell } from '@/src/components/orders/OrderTripIdCell';

const fmt = (date: string | null | undefined) =>
  date
    ? new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

const getOrderStatusVariant = (
  status: string,
): 'success' | 'warning' | 'danger' | 'neutral' | 'default' | 'info' => {
  if (status === 'Delivered' || status === 'Completed') return 'success';
  if (status === 'Cancelled' || status === 'Rejected') return 'danger';
  if (status === 'Draft') return 'neutral';
  if (status === 'In Transit' || status === 'Scheduled') return 'info';
  if (status === 'Pending' || status === 'Processing') return 'warning';
  return 'default';
};

export interface ProductOrderHistoryCardProps {
  productId: string;
  active: boolean;
  canOpenDetail: boolean;
}

export function ProductOrderHistoryCard({
  productId,
  active,
  canOpenDetail,
}: ProductOrderHistoryCardProps) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProductOrderHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>('order_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [tablePage, setTablePage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const data = await fetchProductOrderHistory(productId);
      setRows(data);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[product order history]', e);
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
    const s = new Set(rows.map((r) => r.status).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const rowsMatchingFilters = useMemo(() => {
    if (statusFilter === '') return rows;
    return rows.filter((r) => r.status === statusFilter);
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
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'order_number':
          av = a.orderNumber;
          bv = b.orderNumber;
          break;
        case 'branch':
          av = a.branchName ?? '';
          bv = b.branchName ?? '';
          break;
        case 'trip':
          av = a.tripNumber ?? a.tripId ?? '';
          bv = b.tripNumber ?? b.tripId ?? '';
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        case 'order_date':
          av = a.orderDate ?? '';
          bv = b.orderDate ?? '';
          break;
        case 'required':
          av = a.requiredDate ?? '';
          bv = b.requiredDate ?? '';
          break;
        case 'customer':
          av = a.customerName ?? '';
          bv = b.customerName ?? '';
          break;
        case 'variant':
          av = a.variantLabel;
          bv = b.variantLabel;
          break;
        case 'quantity':
          av = a.quantity;
          bv = b.quantity;
          break;
        default:
          av = a.orderDate ?? '';
          bv = b.orderDate ?? '';
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

  const openDetail = (orderId: string) => {
    if (canOpenDetail) navigate(`/orders/${orderId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <ShoppingCart className="w-5 h-5" />
          <span>Order History</span>
          <span className="text-base font-medium text-gray-500 tabular-nums">
            ({rowsMatchingFilters.length})
          </span>
        </CardTitle>
        {!loading && rows.length > 0 && (
          <div className="md:hidden mt-3">
            <select
              aria-label="Filter by order status"
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
            <ShoppingCart className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm font-medium">No orders yet for this product</p>
            <p className="text-gray-400 text-xs mt-1">Order lines appear here once customers place orders</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th
                      onClick={() => handleSort('order_number')}
                      className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                    >
                      <span className="inline-flex items-center">
                        Order Number{sortIcon('order_number')}
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('branch')}
                      className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                    >
                      <span className="inline-flex items-center">Branch{sortIcon('branch')}</span>
                    </th>
                    <th
                      onClick={() => handleSort('trip')}
                      className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                    >
                      <span className="inline-flex items-center">Trip ID{sortIcon('trip')}</span>
                    </th>
                    <th className="px-3 py-3 text-center font-medium align-top min-w-[8.5rem] max-w-[12rem]">
                      <div className="normal-case flex justify-center">
                        <select
                          aria-label="Filter by order status"
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
                      onClick={() => handleSort('order_date')}
                      className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                    >
                      <span className="inline-flex items-center">
                        Order Date{sortIcon('order_date')}
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('required')}
                      className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                    >
                      <span className="inline-flex items-center">Required{sortIcon('required')}</span>
                    </th>
                    <th
                      onClick={() => handleSort('customer')}
                      className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                    >
                      <span className="inline-flex items-center">Customer{sortIcon('customer')}</span>
                    </th>
                    <th
                      onClick={() => handleSort('variant')}
                      className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                    >
                      <span className="inline-flex items-center">Variant{sortIcon('variant')}</span>
                    </th>
                    <th
                      onClick={() => handleSort('quantity')}
                      className="px-5 py-3 text-right font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                    >
                      <span className="inline-flex items-center justify-end w-full">
                        Qty{sortIcon('quantity')}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rowsMatchingFilters.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-500">
                        No orders match the selected status. Choose{' '}
                        <span className="font-medium text-gray-700">Status</span> to show all.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row) => (
                      <tr
                        key={row.lineId}
                        className={canOpenDetail ? 'hover:bg-gray-50 cursor-pointer' : undefined}
                        onClick={() => openDetail(row.orderId)}
                      >
                        <td className="px-5 py-3 font-mono text-xs text-blue-600 font-semibold">
                          {row.orderNumber}
                        </td>
                        <td className="px-5 py-3 text-gray-900">{row.branchName ?? '—'}</td>
                        <td className="px-5 py-3">
                          <OrderTripIdCell tripNumber={row.tripNumber} tripId={row.tripId} />
                        </td>
                        <td className="px-5 py-3 text-center align-middle">
                          <Badge variant={getOrderStatusVariant(row.status)}>{row.status}</Badge>
                        </td>
                        <td className="px-5 py-3 text-gray-600 text-xs">{fmt(row.orderDate)}</td>
                        <td className="px-5 py-3 text-gray-600 text-xs">{fmt(row.requiredDate)}</td>
                        <td className="px-5 py-3 text-gray-900">{row.customerName ?? '—'}</td>
                        <td className="px-5 py-3 text-gray-900">{row.variantLabel}</td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                          {row.quantity.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200">
              {rowsMatchingFilters.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  No orders match the selected status.
                </div>
              ) : (
                pagedRows.map((row) => (
                  <div
                    key={row.lineId}
                    className={
                      canOpenDetail
                        ? 'p-4 space-y-2 cursor-pointer hover:bg-gray-50'
                        : 'p-4 space-y-2'
                    }
                    onClick={() => openDetail(row.orderId)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-blue-600 font-semibold break-all">
                          {row.orderNumber}
                        </p>
                        <p className="text-sm text-gray-900 mt-0.5">{row.customerName ?? '—'}</p>
                        <p className="text-xs text-gray-500">{row.variantLabel}</p>
                      </div>
                      <Badge variant={getOrderStatusVariant(row.status)}>{row.status}</Badge>
                    </div>
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>{row.branchName ?? '—'}</span>
                      <span>{fmt(row.orderDate)}</span>
                      <OrderTripIdCell tripNumber={row.tripNumber} tripId={row.tripId} />
                    </div>
                    <p className="text-xs font-medium text-gray-900">Qty: {row.quantity.toLocaleString()}</p>
                  </div>
                ))
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
  );
}
