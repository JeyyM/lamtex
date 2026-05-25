import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Truck, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { DashHeaderLink } from '@/src/components/executive/executiveLinks';
import {
  fetchCalendarTrips,
  type LogisticsTripRow,
} from '@/src/lib/logisticsDashboard';
import {
  getDispatchVehicleColor,
  localYmd,
  tripStatusDisplay,
  tripStatusIsCompletedUi,
} from '@/src/lib/dispatchQueueUi';

const LOGISTICS_DISPATCH = '/logistics?tab=dispatch';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function tripChipClass(status: string): string {
  if (tripStatusIsCompletedUi(status) || status === 'Delivered') return 'bg-green-600 text-white';
  if (status === 'In Transit') return 'bg-blue-600 text-white';
  if (status === 'Loading' || status === 'Packed' || status === 'Ready') return 'bg-amber-500 text-white';
  if (status === 'Delayed') return 'bg-red-500 text-white';
  if (status === 'Cancelled') return 'bg-gray-500 text-white';
  return 'bg-gray-500 text-white';
}

function tripSubline(trip: LogisticsTripRow): string {
  const driver = trip.driverName?.trim();
  const dest = trip.destinations[0]?.trim();
  if (driver && dest) return `${driver} · ${dest}`;
  return driver || dest || `${trip.orderCount} order${trip.orderCount === 1 ? '' : 's'}`;
}

interface Props {
  branchId: string | null;
  branchLabel?: string;
}

export function LogisticsDispatchCalendar({ branchId, branchLabel }: Props): React.ReactElement {
  const now = new Date();
  const [year, setYear] = useState(() => now.getFullYear());
  const [month, setMonth] = useState(() => now.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(() => localYmd(now));
  const [trips, setTrips] = useState<LogisticsTripRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) {
      setTrips([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchCalendarTrips(branchId, year, month);
      setTrips(rows);
    } finally {
      setLoading(false);
    }
  }, [branchId, year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const tripsByDate = useMemo(() => {
    const m: Record<string, LogisticsTripRow[]> = {};
    for (const t of trips) {
      const key = t.scheduledDate?.trim().slice(0, 10);
      if (!key) continue;
      if (!m[key]) m[key] = [];
      m[key].push(t);
    }
    return m;
  }, [trips]);

  const todayKey = localYmd(new Date());

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) out.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) out.push(new Date(year, month, d));
    return out;
  }, [year, month]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedKey(null);
  };

  const selectedTrips = selectedKey ? (tripsByDate[selectedKey] ?? []) : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-5 h-5 text-blue-600" />
            Dispatch calendar
            {branchLabel && (
              <span className="text-sm font-normal text-gray-500">· {branchLabel}</span>
            )}
          </CardTitle>
          <DashHeaderLink
            to={LOGISTICS_DISPATCH}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm shrink-0"
          >
            Open dispatch <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {!branchId ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            Select a branch to view the dispatch calendar.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <select
                  value={month}
                  onChange={(e) => {
                    setMonth(Number(e.target.value));
                    setSelectedKey(null);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {MONTH_NAMES.map((n, i) => (
                    <option key={n} value={i}>{n}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (e.target.value !== '' && Number.isFinite(n)) {
                      setYear(Math.trunc(n));
                      setSelectedKey(null);
                    }
                  }}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  aria-label="Year"
                />
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                {(['Scheduled', 'Loading', 'In Transit', 'Delayed', 'Delivered', 'Complete'] as const).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${tripChipClass(s).split(' ')[0]}`} />
                    {s === 'Complete' ? 'Completed' : s}
                  </span>
                ))}
              </div>
            </div>

            {loading && trips.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                Loading calendar…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="py-2">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 relative">
                  {loading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
                      <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                    </div>
                  )}
                  {cells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`pad-${idx}`} className="min-h-[4.5rem] rounded-lg bg-gray-50/50" />;
                    }
                    const cellKey = localYmd(cell);
                    const isToday = cellKey === todayKey;
                    const isSelected = cellKey === selectedKey;
                    const dayTrips = tripsByDate[cellKey] ?? [];
                    const shown = dayTrips.slice(0, 2);
                    const overflow = dayTrips.length - shown.length;

                    return (
                      <button
                        key={cellKey}
                        type="button"
                        onClick={() => setSelectedKey(cellKey === selectedKey ? null : cellKey)}
                        className={`min-h-[4.5rem] rounded-lg border p-1.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/60'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/20'
                        }`}
                      >
                        <div className={`text-sm font-semibold mb-0.5 ${isToday ? 'text-red-600' : 'text-gray-900'}`}>
                          {cell.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {shown.map((trip) => (
                            <div
                              key={trip.id}
                              className={`truncate rounded px-0.5 py-0.5 text-[10px] leading-tight font-medium ${tripChipClass(trip.status)}`}
                              title={`${trip.tripNumber} · ${tripSubline(trip)}`}
                            >
                              {trip.vehicleName ?? trip.tripNumber}
                            </div>
                          ))}
                          {overflow > 0 && (
                            <div className="text-[10px] text-gray-500 font-medium text-center">+{overflow}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedKey && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      {(() => {
                        const [y, mo, d] = selectedKey.split('-').map(Number);
                        return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        });
                      })()}
                    </h3>
                    {selectedTrips.length === 0 ? (
                      <p className="text-sm text-gray-500">No trips scheduled on this date.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {selectedTrips.map((trip) => {
                          const colors = getDispatchVehicleColor(trip.vehicleUuid ?? trip.id);
                          return (
                            <li key={trip.id}>
                              <Link
                                to={LOGISTICS_DISPATCH}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors"
                              >
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: colors.bg }}
                                >
                                  <Truck className="w-4 h-4" style={{ color: colors.text }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-gray-900 text-sm">{trip.tripNumber}</p>
                                  <p className="text-xs text-gray-500 truncate">{tripSubline(trip)}</p>
                                </div>
                                <span
                                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border shrink-0 ${
                                    tripStatusIsCompletedUi(trip.status) || trip.status === 'Delivered'
                                      ? 'bg-green-100 text-green-800 border-green-300'
                                      : trip.status === 'In Transit'
                                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                                        : trip.status === 'Loading' || trip.status === 'Packed' || trip.status === 'Ready'
                                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                                          : trip.status === 'Delayed'
                                            ? 'bg-red-100 text-red-800 border-red-300'
                                            : 'bg-gray-100 text-gray-800 border-gray-300'
                                  }`}
                                >
                                  {tripStatusDisplay(trip.status)}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
