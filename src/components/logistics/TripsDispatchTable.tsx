import React from 'react';
import { Truck, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import {
  DISPATCH_QUEUE_STATUS_OPTIONS,
  dispatchQueueStatusSelectClass,
  dispatchTableStatusBadgeVariant,
  compareTripScheduleDates,
  formatTripScheduleDate,
  tripMatchesDispatchSearch,
  type DispatchSearchExtras,
} from '@/src/lib/dispatchQueueUi';
import type { Trip } from '@/src/types/logistics';

type TripsDispatchTableProps = {
  trips: Trip[];
  loading: boolean;
  emptyMessage: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  showCompleted: boolean;
  onShowCompletedChange: (value: boolean) => void;
  page: number;
  onPageChange: (page: number) => void;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  resolveStatus: (trip: Trip) => string;
  searchExtras?: DispatchSearchExtras;
  onTripClick: (trip: Trip) => void;
};

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function TripsDispatchTable({
  trips,
  loading,
  emptyMessage,
  searchQuery,
  onSearchQueryChange,
  filterStatus,
  onFilterStatusChange,
  showCompleted,
  onShowCompletedChange,
  page,
  onPageChange,
  sortKey,
  sortDir,
  onSort,
  resolveStatus,
  searchExtras,
  onTripClick,
}: TripsDispatchTableProps) {
  const filtered = React.useMemo(() => {
    const filteredRows = trips.filter((trip) => {
      const matchesSearch = tripMatchesDispatchSearch(trip, searchQuery, searchExtras);
      const displayStatus = resolveStatus(trip);
      const matchesStatus =
        filterStatus === 'All'
          ? showCompleted || !['Complete', 'Delivered', 'Cancelled'].includes(displayStatus)
          : displayStatus === filterStatus;
      return matchesSearch && matchesStatus;
    });

    return [...filteredRows].sort((a, b) => {
      if (sortKey === 'scheduledDate' || sortKey === 'default') {
        return compareTripScheduleDates(a, b, sortDir);
      }

      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'vehicleName':
          av = a.vehicleName.toLowerCase();
          bv = b.vehicleName.toLowerCase();
          break;
        case 'tripNumber':
          av = (a.tripNumber || a.id).toLowerCase();
          bv = (b.tripNumber || b.id).toLowerCase();
          break;
        case 'orders':
          av = a.orders.length;
          bv = b.orders.length;
          break;
        case 'customer':
          av = (a.customerLabel ?? a.destinations[0] ?? '').toLowerCase();
          bv = (b.customerLabel ?? b.destinations[0] ?? '').toLowerCase();
          break;
        case 'status':
          av = resolveStatus(a);
          bv = resolveStatus(b);
          break;
        default:
          return compareTripScheduleDates(a, b, sortDir);
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return sortDir === 'asc' ? -1 : 1;
      if (as > bs) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [trips, searchQuery, filterStatus, showCompleted, sortKey, sortDir, resolveStatus, searchExtras]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TABLE_PAGE_SIZE) || 1);
  const paged = filtered.slice((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE);

  const handleSort = (key: string) => onSort(key);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>
          Trips
          {!loading && filtered.length > 0 ? ` — ${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : ''}
        </CardTitle>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-gray-500 font-medium">Show Completed</span>
          <div
            onClick={() => onShowCompletedChange(!showCompleted)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showCompleted ? 'bg-red-600' : 'bg-gray-300'}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showCompleted ? 'translate-x-4' : 'translate-x-1'}`}
            />
          </div>
        </label>
      </CardHeader>

      <div className="px-4 pb-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-full sm:flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search trip ID, driver, customer, order ID, destination…"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              disabled={loading}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <select
            aria-label="Filter trips by status"
            value={filterStatus === 'All' ? '' : filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value === '' ? 'All' : e.target.value)}
            className={`${dispatchQueueStatusSelectClass} w-full sm:w-[min(100%,14rem)]`}
            disabled={loading}
          >
            <option value="">Status</option>
            {DISPATCH_QUEUE_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'Complete' ? 'Completed' : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <CardContent className="p-0">
        {loading ? (
          <div className="py-16 px-4 text-center text-sm text-gray-500">Loading trips…</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      onClick={() => handleSort('tripNumber')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                    >
                      <span className="inline-flex items-center">
                        Trip · Vehicle & Driver
                        <SortIcon active={sortKey === 'tripNumber' || sortKey === 'vehicleName'} dir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('customer')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                    >
                      <span className="inline-flex items-center">
                        Customer
                        <SortIcon active={sortKey === 'customer'} dir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('scheduledDate')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                    >
                      <span className="inline-flex items-center">
                        Schedule
                        <SortIcon active={sortKey === 'scheduledDate'} dir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('orders')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                    >
                      <span className="inline-flex items-center">
                        Orders
                        <SortIcon active={sortKey === 'orders'} dir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('status')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                    >
                      <span className="inline-flex items-center">
                        Status
                        <SortIcon active={sortKey === 'status'} dir={sortDir} />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                        {emptyMessage}
                      </td>
                    </tr>
                  )}
                  {paged.map((trip) => (
                    <tr
                      key={trip.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onTripClick(trip)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-xs font-semibold text-gray-700 font-mono tracking-tight">{trip.tripNumber}</div>
                            <div className="text-sm font-medium text-gray-900">{trip.vehicleName}</div>
                            <div className="text-xs text-gray-500">{trip.driverName || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-[14rem] truncate" title={trip.customerLabel ?? trip.destinations[0] ?? '—'}>
                          {trip.customerLabel ?? trip.destinations[0] ?? '—'}
                        </div>
                        {trip.orderNumbers && trip.orderNumbers.length > 0 && (
                          <div className="text-xs text-gray-500 truncate max-w-[14rem]" title={trip.orderNumbers.join(', ')}>
                            {trip.orderNumbers.length === 1
                              ? trip.orderNumbers[0]
                              : `${trip.orderNumbers[0]} +${trip.orderNumbers.length - 1}`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatTripScheduleDate(trip)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {trip.orders.length} order{trip.orders.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500">{trip.capacityUsed}% full</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={dispatchTableStatusBadgeVariant(resolveStatus(trip))} className="min-w-[120px] justify-center">
                          {resolveStatus(trip)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200">
              {paged.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">{emptyMessage}</div>
              )}
              {paged.map((trip) => (
                <div
                  key={trip.id}
                  className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                  onClick={() => onTripClick(trip)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700 font-mono tracking-tight">{trip.tripNumber}</p>
                      <p className="text-sm font-medium text-gray-900 break-words mt-0.5">{trip.vehicleName}</p>
                      <p className="text-xs text-gray-500 mt-1 break-words">{trip.driverName || 'No driver'}</p>
                    </div>
                    <Badge variant={dispatchTableStatusBadgeVariant(resolveStatus(trip))} className="flex-shrink-0">
                      {resolveStatus(trip)}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTripScheduleDate(trip)} • {trip.driverName || 'No driver'}
                  </div>
                </div>
              ))}
            </div>

            {filtered.length > TABLE_PAGE_SIZE && (
              <div className="border-t border-gray-200 px-4 py-3">
                <TablePagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
