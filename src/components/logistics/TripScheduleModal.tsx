import React, { useEffect, useState } from 'react';
import { Button } from '@/src/components/ui/Button';
import {
  X,
  CheckCircle,
  Truck,
  Wrench,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface TripScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedDates: string[]) => void;
  vehicleName: string;
  orderCount: number;
  existingBookings: Array<{
    date: string;
    type: 'Trip' | 'Maintenance';
    tripNumber?: string;
    status?: string;
  }>;
}

/** YYYY-MM-DD from a local Date (avoids UTC-shift). */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Build month grid; null = padding cell. */
function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  return cells;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const TripScheduleModal: React.FC<TripScheduleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  vehicleName,
  orderCount,
  existingBookings,
}) => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDates([]);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const todayKey = toDateKey(new Date());

  // Build lookup — Maintenance wins over Trip for same date
  const bookingByDate = new Map<string, { type: 'Trip' | 'Maintenance'; tripNumber?: string }>();
  for (const b of existingBookings) {
    if (!bookingByDate.has(b.date) || b.type === 'Maintenance') bookingByDate.set(b.date, b);
  }

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 11) { m -= 12; y++; }
    if (m < 0)  { m += 12; y--; }
    setMonth(m);
    setYear(y);
  };

  const toggleDate = (key: string) => {
    const d = new Date(key + 'T12:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d < today) return;
    if (bookingByDate.get(key)?.type === 'Maintenance') return;
    setSelectedDates((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key].sort()
    );
  };

  const cells = buildMonthGrid(year, month);
  const hasMaintOnSelected = selectedDates.some(
    (k) => bookingByDate.get(k)?.type === 'Maintenance'
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Schedule Delivery Trip
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {orderCount} order{orderCount !== 1 ? 's' : ''} · {vehicleName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">

          {/* Nav + legend */}
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
                onChange={(e) => setMonth(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
              <input
                type="number"
                value={year}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (e.target.value === '' || !Number.isFinite(n)) return;
                  setYear(Math.trunc(n));
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

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Selected
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Existing trip
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                Maintenance
              </span>
            </div>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, idx) => {
              if (!date) {
                return <div key={`pad-${idx}`} className="min-h-[4.5rem] rounded-lg bg-gray-50/50" />;
              }

              const key = toDateKey(date);
              const booking = bookingByDate.get(key);
              const isSelected = selectedDates.includes(key);
              const isToday = key === todayKey;
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const isPast = date < today;
              const isMaint = booking?.type === 'Maintenance';
              const isTrip = booking?.type === 'Trip';

              let cellCls = 'min-h-[4.5rem] rounded-lg border p-1.5 text-left transition-all ';
              if (isSelected) {
                cellCls += 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/80 cursor-pointer';
              } else if (isMaint) {
                cellCls += 'border-red-200 bg-red-50/60 cursor-not-allowed';
              } else if (isPast) {
                cellCls += 'border-gray-100 bg-gray-50/70 cursor-not-allowed';
              } else {
                cellCls += 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer';
              }

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isPast || isMaint}
                  onClick={() => toggleDate(key)}
                  className={cellCls}
                >
                  <div className={`text-sm font-semibold ${isToday ? 'text-red-600' : isPast ? 'text-gray-300' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {isSelected && (
                      <div className="truncate rounded px-0.5 py-0.5 text-[10px] leading-tight bg-blue-600 text-white font-medium flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">Scheduled</span>
                      </div>
                    )}
                    {!isSelected && isTrip && (
                      <div
                        className="truncate rounded px-0.5 py-0.5 text-[10px] leading-tight bg-amber-100 text-amber-800 font-medium flex items-center gap-0.5"
                        title={booking?.tripNumber}
                      >
                        <Truck className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{booking?.tripNumber ?? 'Trip'}</span>
                      </div>
                    )}
                    {isMaint && (
                      <div className="truncate rounded px-0.5 py-0.5 text-[10px] leading-tight bg-red-100 text-red-700 font-medium flex items-center gap-0.5">
                        <Wrench className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">Maintenance</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected dates summary */}
          {selectedDates.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Selected date{selectedDates.length !== 1 ? 's' : ''}
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedDates.map((key) => {
                  const [y, mo, d] = key.split('-').map(Number);
                  const label = new Date(y, mo - 1, d).toLocaleDateString('en-PH', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  });
                  const hasTrip = bookingByDate.get(key)?.type === 'Trip';
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                        hasTrip
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-blue-200 bg-blue-50 text-blue-900'
                      }`}
                    >
                      <span>{label}</span>
                      <button
                        type="button"
                        onClick={() => toggleDate(key)}
                        className="ml-1 rounded p-0.5 hover:bg-black/10"
                        aria-label={`Remove ${label}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 md:px-5 py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto justify-center">
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={selectedDates.length === 0 || hasMaintOnSelected}
            onClick={() => {
              onConfirm(selectedDates);
              onClose();
            }}
            className="w-full sm:w-auto justify-center"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Schedule Trip ({selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'})
          </Button>
        </div>
      </div>
    </div>
  );
};