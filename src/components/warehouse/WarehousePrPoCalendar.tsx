import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Factory,
  Loader2,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { DashHeaderLink } from '@/src/components/executive/executiveLinks';
import { localYmd } from '@/src/lib/dispatchQueueUi';
import {
  buildMonthGrid,
  calendarEventStatusBadgeClass,
  calendarKindChipClass,
  calendarKindLabel,
  fetchWarehouseCalendarEvents,
  warehouseCalendarEventHref,
  warehouseCalendarEventMatchesTab,
  type WarehouseCalendarEvent,
  type WarehouseCalendarTab,
} from '@/src/lib/warehouseCalendar';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  branchId: string | null;
  branchLabel?: string;
}

export function WarehousePrPoCalendar({ branchId, branchLabel }: Props): React.ReactElement {
  const now = new Date();
  const [tab, setTab] = useState<WarehouseCalendarTab>('production');
  const [year, setYear] = useState(() => now.getFullYear());
  const [month, setMonth] = useState(() => now.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(() => localYmd(now));
  const [events, setEvents] = useState<WarehouseCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!branchId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchWarehouseCalendarEvents(branchId);
      setEvents(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredEvents = useMemo(
    () => events.filter((e) => warehouseCalendarEventMatchesTab(e, tab)),
    [events, tab],
  );

  const eventsByDate = useMemo(() => {
    const m: Record<string, WarehouseCalendarEvent[]> = {};
    for (const e of filteredEvents) {
      if (!m[e.anchorDateKey]) m[e.anchorDateKey] = [];
      m[e.anchorDateKey].push(e);
    }
    return m;
  }, [filteredEvents]);

  const todayKey = localYmd(new Date());
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedKey(null);
  };

  const selectedEvents = selectedKey ? (eventsByDate[selectedKey] ?? []) : [];
  const viewAllHref = tab === 'production' ? '/production-requests' : '/purchase-orders';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5 text-blue-600" />
              PR &amp; PO schedule
              {branchLabel && (
                <span className="text-sm font-normal text-gray-500">· {branchLabel}</span>
              )}
            </CardTitle>
            <DashHeaderLink
              to={viewAllHref}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm shrink-0"
            >
              Open {tab === 'production' ? 'PRs' : 'POs'} <ArrowRight className="w-4 h-4" />
            </DashHeaderLink>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setTab('production');
                setSelectedKey(null);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                tab === 'production'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Factory className="w-4 h-4" />
              Production requests
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('purchase');
                setSelectedKey(null);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                tab === 'purchase'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Purchase orders
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {!branchId ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            Select a branch to view the PR &amp; PO calendar.
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
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' })}
                    </option>
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
                {tab === 'production' ? (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      Production request
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                      Inter-branch
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      Purchase order
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                      Inter-branch
                    </span>
                  </>
                )}
              </div>
            </div>

            {loading && events.length === 0 ? (
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
                    const dayEvents = eventsByDate[cellKey] ?? [];
                    const shown = dayEvents.slice(0, 2);
                    const overflow = dayEvents.length - shown.length;

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
                          {shown.map((ev) => (
                            <div
                              key={ev.id}
                              className={`truncate rounded px-0.5 py-0.5 text-[10px] leading-tight font-medium ${calendarKindChipClass(ev.calendarKind)}`}
                              title={ev.title}
                            >
                              {ev.title}
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
                    {selectedEvents.length === 0 ? (
                      <p className="text-sm text-gray-500">No scheduled activity on this date.</p>
                    ) : (
                      <ul className="space-y-2">
                        {selectedEvents.map((ev) => (
                          <li
                            key={ev.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-white border border-gray-200 p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${calendarKindChipClass(ev.calendarKind)}`}
                                >
                                  {calendarKindLabel(ev.calendarKind)}
                                </span>
                                <span className="text-sm font-medium text-gray-900">{ev.title}</span>
                              </div>
                              {ev.detail && (
                                <p className="text-xs text-gray-500 mt-0.5">{ev.detail}</p>
                              )}
                              <span
                                className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${calendarEventStatusBadgeClass(ev)}`}
                              >
                                {ev.status}
                              </span>
                            </div>
                            <Link
                              to={warehouseCalendarEventHref(ev)}
                              className="shrink-0 text-sm font-medium text-blue-700 hover:underline"
                            >
                              Open
                            </Link>
                          </li>
                        ))}
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
