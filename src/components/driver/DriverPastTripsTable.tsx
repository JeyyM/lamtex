import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import type { DriverOrderStop, DriverTripSummary } from '@/src/lib/driverDashboard';
import {
  DATE_PERIOD_OPTIONS,
  inDatePeriodRange,
  periodTriggerLabel,
  resolveDatePeriodQuery,
  todayIsoLocal,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';
import { tripHistoryMatchesSearch } from '@/src/lib/dispatchQueueUi';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarRange,
  CheckCircle,
  Search,
  X,
} from 'lucide-react';

type SortKey = 'tripNumber' | 'customerName' | 'orderNumber' | 'deliveryAddress' | 'scheduledDate' | 'status';

type PastDeliveryRow = DriverOrderStop & { scheduledDate: string | null };

type Props = {
  pastTrips: DriverTripSummary[];
  orderStops: DriverOrderStop[];
  onOpenTrip: (tripId: string) => void;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function orderStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral' {
  switch (status) {
    case 'Delivered':
    case 'Completed':
    case 'Fulfilled':
      return 'success';
    case 'Partially Fulfilled':
    case 'In Transit':
    case 'Loading':
    case 'Packed':
    case 'Ready':
    case 'Scheduled':
      return 'warning';
    case 'Cancelled':
    case 'Failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function DriverPastTripsTable({ pastTrips, orderStops, onOpenTrip }: Props): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('scheduledDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [periodKind, setPeriodKind] = useState<DatePeriodKind>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [draftPeriodKind, setDraftPeriodKind] = useState<DatePeriodKind>('month');
  const [draftCustomStart, setDraftCustomStart] = useState('');
  const [draftCustomEnd, setDraftCustomEnd] = useState('');

  const periodQuery = useMemo(
    () => resolveDatePeriodQuery(periodKind, customStart, customEnd),
    [periodKind, customStart, customEnd],
  );

  const maxCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftCustomInvalid = Boolean(
    draftCustomStart && draftCustomEnd && draftCustomStart > draftCustomEnd,
  );

  const openPeriodModal = () => {
    setDraftPeriodKind(periodKind);
    setDraftCustomStart(customStart);
    setDraftCustomEnd(customEnd);
    setPeriodModalOpen(true);
  };

  const handlePeriodChange = (kind: DatePeriodKind) => {
    setPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = todayIsoLocal();
      const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
      setCustomStart(start);
      setCustomEnd(iso);
    }
  };

  const handleModalPresetPick = (kind: DatePeriodKind) => {
    if (kind !== 'custom') {
      handlePeriodChange(kind);
      setPeriodModalOpen(false);
      return;
    }
    setDraftPeriodKind('custom');
    const t = new Date();
    const iso = todayIsoLocal();
    const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
    setDraftCustomStart((prev) => prev || customStart || start);
    setDraftCustomEnd((prev) => prev || customEnd || iso);
  };

  const applyModalCustomRange = () => {
    setPeriodKind('custom');
    setCustomStart(draftCustomStart);
    setCustomEnd(draftCustomEnd);
    setPeriodModalOpen(false);
  };

  useEffect(() => {
    if (!periodModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPeriodModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [periodModalOpen]);

  const rows = useMemo((): PastDeliveryRow[] => {
    const tripById = new Map(pastTrips.map((t) => [t.id, t]));
    return orderStops
      .filter((s) => tripById.has(s.tripId))
      .map((s) => ({
        ...s,
        scheduledDate: tripById.get(s.tripId)?.scheduledDate ?? null,
      }));
  }, [pastTrips, orderStops]);

  const dateFilteredRows = useMemo(() => {
    if (periodQuery.invalid) return rows;
    return rows.filter((r) => inDatePeriodRange(r.scheduledDate, periodQuery.from, periodQuery.to));
  }, [rows, periodQuery]);

  const statusOptions = useMemo(() => {
    const set = new Set(dateFilteredRows.map((r) => r.status).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [dateFilteredRows]);

  const filtered = useMemo(() => {
    return dateFilteredRows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      return tripHistoryMatchesSearch(
        {
          id: r.id,
          tripId: r.tripId,
          tripNumber: r.tripNumber,
          driverName: '',
          customerLabel: r.customerName,
          route: r.deliveryAddress ? [r.deliveryAddress] : [],
          orderNumbers: [r.orderNumber],
          phone: r.phone ?? undefined,
        },
        searchQuery,
      );
    });
  }, [dateFilteredRows, searchQuery, statusFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'scheduledDate' ? 'desc' : 'asc');
    }
  };

  const sortIcon = (col: SortKey) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-red-600" />
    );
  };

  const sortedRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string;
      let bv: string;
      switch (sortKey) {
        case 'tripNumber':
          av = a.tripNumber;
          bv = b.tripNumber;
          break;
        case 'customerName':
          av = a.customerName;
          bv = b.customerName;
          break;
        case 'orderNumber':
          av = a.orderNumber;
          bv = b.orderNumber;
          break;
        case 'deliveryAddress':
          av = a.deliveryAddress ?? '';
          bv = b.deliveryAddress ?? '';
          break;
        case 'scheduledDate':
          av = a.scheduledDate ?? '';
          bv = b.scheduledDate ?? '';
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        default:
          av = a.scheduledDate ?? '';
          bv = b.scheduledDate ?? '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return a.orderNumber.localeCompare(b.orderNumber);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / TABLE_PAGE_SIZE) || 1);
  const pagedRows = useMemo(() => {
    const p = Math.min(page, totalPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedRows.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedRows, page, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, sortKey, sortDir, periodKind, customStart, customEnd]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Past deliveries
            <Badge variant="default">{filtered.length}</Badge>
          </CardTitle>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trip ID, trip #, customer, order, or address…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[10rem]"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-gray-300 bg-white min-w-[10rem] sm:max-w-[14rem]"
              aria-haspopup="dialog"
              aria-expanded={periodModalOpen}
              aria-label="Choose date range"
              onClick={openPeriodModal}
            >
              <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
              <span className="truncate text-left text-sm font-normal">
                {periodTriggerLabel(periodKind, customStart, customEnd)}
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    <button type="button" onClick={() => handleSort('tripNumber')} className="inline-flex items-center hover:text-gray-900">
                      Trip{sortIcon('tripNumber')}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    <button type="button" onClick={() => handleSort('customerName')} className="inline-flex items-center hover:text-gray-900">
                      Customer{sortIcon('customerName')}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    <button type="button" onClick={() => handleSort('orderNumber')} className="inline-flex items-center hover:text-gray-900">
                      Order{sortIcon('orderNumber')}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    <button type="button" onClick={() => handleSort('deliveryAddress')} className="inline-flex items-center hover:text-gray-900">
                      Address{sortIcon('deliveryAddress')}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    <button type="button" onClick={() => handleSort('scheduledDate')} className="inline-flex items-center hover:text-gray-900">
                      Date{sortIcon('scheduledDate')}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center hover:text-gray-900">
                      Status{sortIcon('status')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      {rows.length === 0
                        ? 'No completed deliveries on record.'
                        : periodQuery.invalid
                          ? 'Invalid date range selected.'
                          : 'No deliveries match your search, filters, or date range.'}
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => onOpenTrip(r.tripId)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap font-mono text-xs">{r.tripNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.customerName}</p>
                        {r.deliveryAddress && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 lg:hidden">{r.deliveryAddress}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.orderNumber}</td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell max-w-[16rem] truncate">
                        {r.deliveryAddress ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.scheduledDate)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={orderStatusVariant(r.status)}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {sortedRows.length > 0 && (
            <TablePagination page={page} total={sortedRows.length} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>

      <PortalModalOverlay
        open={periodModalOpen}
        onClose={() => setPeriodModalOpen(false)}
        zIndex={110}
        mobileBottomSheet
      >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-past-deliveries-period-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="driver-past-deliveries-period-title" className="text-lg font-semibold text-gray-900">
                Date range
              </h2>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
                onClick={() => setPeriodModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Choose a preset or set a custom date range. The delivery list filters by trip date.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DATE_PERIOD_OPTIONS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleModalPresetPick(kind)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      draftPeriodKind === kind
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draftPeriodKind === 'custom' && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                    <input
                      type="date"
                      value={draftCustomStart}
                      max={maxCustomDate}
                      onChange={(e) => setDraftCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftCustomEnd}
                      min={draftCustomStart || undefined}
                      max={maxCustomDate}
                      onChange={(e) => setDraftCustomEnd(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {draftCustomInvalid && (
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
                onClick={() => setPeriodModalOpen(false)}
              >
                Cancel
              </Button>
              {draftPeriodKind === 'custom' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={draftCustomInvalid}
                  onClick={applyModalCustomRange}
                >
                  Apply range
                </Button>
              )}
            </div>
          </div>
      </PortalModalOverlay>
    </>
  );
}
