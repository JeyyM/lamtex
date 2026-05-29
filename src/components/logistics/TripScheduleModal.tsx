import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/Button';
import { ModalPortal } from '@/src/components/ui/ModalPortal';
import {
  X,
  CheckCircle,
  Truck,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export type TripScheduleBooking = {
  date: string;
  type: 'Trip' | 'Maintenance';
  tripNumber?: string;
  status?: string;
  tripKind?: 'IBR' | 'Order' | 'Trip';
  vehicleId?: string;
  vehicleName?: string;
  driverId?: string | null;
  driverName?: string;
  isConflict?: boolean;
  conflictKind?: 'truck' | 'driver' | 'both';
};

interface TripScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Parent should close the modal after a successful create. May return a Promise. */
  onConfirm: (selectedDates: string[]) => void | Promise<void>;
  vehicleName: string;
  orderCount: number;
  existingBookings: TripScheduleBooking[];
  /** Override default "Schedule Delivery Trip" heading. */
  modalTitle?: string;
  /** Override default confirm button label prefix. */
  confirmLabel?: string;
  /** Pre-select a date when the modal opens (YYYY-MM-DD). */
  initialDate?: string;
  /** `single` replaces selection on each click; default `multiple` toggles days on/off. */
  selectionMode?: 'single' | 'multiple';
  /** When true, past dates are selectable (e.g. inter-island container scheduling). */
  allowPastDates?: boolean;
  /** Override subtitle under the title (default: "{orderCount} orders · {vehicleName}"). */
  subtitle?: string;
  /** Optional content above the calendar (e.g. truck / driver pickers). */
  children?: React.ReactNode;
  /** When true, confirm stays disabled even if dates are selected. */
  confirmDisabled?: boolean;
  /** Parent-controlled busy state (e.g. while saving). */
  externalSubmitting?: boolean;
  /** Optional note below the calendar grid. */
  footerNote?: string;
  /** Fired when the user changes selected calendar days. */
  onSelectedDatesChange?: (dates: string[]) => void;
  /** Optional warning shown beside the confirm button (e.g. scheduling conflicts). */
  confirmWarning?: React.ReactNode;
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

function groupBookingsByDate(bookings: TripScheduleBooking[]): Map<string, TripScheduleBooking[]> {
  const byDate = new Map<string, TripScheduleBooking[]>();
  for (const b of bookings) {
    const existing = byDate.get(b.date) ?? [];
    existing.push(b);
    byDate.set(b.date, existing);
  }
  for (const [date, list] of byDate) {
    list.sort((a, b) => {
      if (Boolean(a.isConflict) !== Boolean(b.isConflict)) return a.isConflict ? -1 : 1;
      if (a.type !== b.type) return a.type === 'Maintenance' ? -1 : 1;
      return (a.tripNumber ?? a.vehicleName ?? '').localeCompare(b.tripNumber ?? b.vehicleName ?? '');
    });
    byDate.set(date, list);
  }
  return byDate;
}

function bookingTooltip(b: TripScheduleBooking): string {
  if (b.type === 'Maintenance') {
    return [
      b.vehicleName ?? 'Truck',
      'Maintenance',
      b.isConflict ? 'Blocks selected truck' : 'Other truck',
    ].join(' · ');
  }
  const parts = [
    b.tripKind,
    b.tripNumber,
    b.vehicleName,
    b.driverName && b.driverName !== '—' ? b.driverName : null,
    b.status,
    b.isConflict
      ? b.conflictKind === 'both'
        ? 'Conflict: truck & driver'
        : b.conflictKind === 'driver'
          ? 'Conflict: driver'
          : 'Conflict: truck'
      : 'Other truck/driver',
  ].filter(Boolean);
  return parts.join(' · ');
}

function tripChipLabel(b: TripScheduleBooking): string {
  const prefix = b.tripKind && b.tripKind !== 'Trip' ? `${b.tripKind} ` : '';
  return `${prefix}${b.tripNumber ?? 'Trip'}`;
}

function tripChipSecondary(b: TripScheduleBooking): string {
  return [
    b.vehicleName && b.vehicleName !== '—' ? b.vehicleName : null,
    b.driverName && b.driverName !== '—' ? b.driverName : null,
    b.status,
  ]
    .filter(Boolean)
    .join(' · ');
}

function isBlockingMaintenance(booking: TripScheduleBooking): boolean {
  return booking.type === 'Maintenance' && booking.isConflict !== false;
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
  modalTitle = 'Schedule Delivery Trip',
  confirmLabel = 'Schedule Trip',
  initialDate,
  selectionMode = 'multiple',
  allowPastDates = false,
  subtitle,
  children,
  confirmDisabled = false,
  externalSubmitting = false,
  footerNote,
  onSelectedDatesChange,
  confirmWarning,
}) => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const busy = submitting || externalSubmitting;

  const bookingsByDate = useMemo(() => groupBookingsByDate(existingBookings), [existingBookings]);

  useEffect(() => {
    if (!isOpen) return;
    const n = new Date();
    const preset =
      initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate.trim().slice(0, 10))
        ? initialDate.trim().slice(0, 10)
        : null;
    if (preset) {
      const d = new Date(`${preset}T12:00:00`);
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const presetIsPast = d < today;
      setSelectedDates(!allowPastDates && presetIsPast ? [] : [preset]);
    } else {
      setYear(n.getFullYear());
      setMonth(n.getMonth());
      setSelectedDates([]);
    }
    setSubmitting(false);
  }, [isOpen, initialDate, allowPastDates]);

  useEffect(() => {
    onSelectedDatesChange?.(selectedDates);
  }, [selectedDates, onSelectedDatesChange]);

  if (!isOpen) return null;

  const todayKey = toDateKey(new Date());

  const shiftMonth = (delta: number) => {
    if (busy) return;
    let m = month + delta;
    let y = year;
    if (m > 11) {
      m -= 12;
      y++;
    }
    if (m < 0) {
      m += 12;
      y--;
    }
    setMonth(m);
    setYear(y);
  };

  const dayBookings = (key: string): TripScheduleBooking[] => bookingsByDate.get(key) ?? [];

  const blockingMaintenanceOnDay = (key: string) => dayBookings(key).some(isBlockingMaintenance);

  const tripBookingsOnDay = (key: string) => dayBookings(key).filter((b) => b.type === 'Trip');

  const maintenanceBookingsOnDay = (key: string) => dayBookings(key).filter((b) => b.type === 'Maintenance');

  const toggleDate = (key: string) => {
    if (busy) return;
    if (blockingMaintenanceOnDay(key)) return;

    if (selectionMode === 'single') {
      setSelectedDates((prev) => (prev.includes(key) ? [] : [key]));
      return;
    }

    if (selectedDates.includes(key)) {
      setSelectedDates((prev) => prev.filter((x) => x !== key));
      return;
    }

    if (!allowPastDates) {
      const d = new Date(`${key}T12:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return;
    }

    setSelectedDates((prev) => [...prev, key].sort());
  };

  const cells = buildMonthGrid(year, month);
  const hasMaintOnSelected = selectedDates.some((k) => blockingMaintenanceOnDay(k));

  return (
    <ModalPortal
      open={isOpen}
      zIndex={200}
      backdropClassName="bg-black/60 backdrop-blur-sm"
      className="flex min-h-[100dvh] w-[100vw] items-center justify-center overflow-y-auto p-4"
      onBackdropClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4 md:p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 md:text-xl">{modalTitle}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {subtitle ?? `${orderCount} order${orderCount !== 1 ? 's' : ''} · ${vehicleName}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
          {children}

          {/* Nav + legend */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={busy}
                className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                disabled={busy}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
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
                disabled={busy}
                className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
                aria-label="Year"
              />
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={busy}
                className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                Selected
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Conflict
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                Other fleet
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                Maintenance (yours)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, idx) => {
              if (!date) {
                return <div key={`pad-${idx}`} className="min-h-[7rem] rounded-lg bg-gray-50/50" />;
              }

              const key = toDateKey(date);
              const tripsOnDay = tripBookingsOnDay(key);
              const maintOnDay = maintenanceBookingsOnDay(key);
              const isSelected = selectedDates.includes(key);
              const isToday = key === todayKey;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPast = !allowPastDates && date < today;
              const isBlockedMaint = blockingMaintenanceOnDay(key);
              const hasConflictTrip = tripsOnDay.some((t) => t.isConflict !== false);

              let cellCls = 'min-h-[7rem] rounded-lg border p-1.5 text-left transition-all ';
              if (isSelected) {
                cellCls += 'cursor-pointer bg-blue-50/80 ring-2 ring-blue-500 border-blue-400';
              } else if (isBlockedMaint) {
                cellCls += 'cursor-not-allowed border-red-200 bg-red-50/60';
              } else if (isPast) {
                cellCls += 'cursor-not-allowed border-gray-100 bg-gray-50/70';
              } else if (hasConflictTrip) {
                cellCls += 'cursor-pointer border-amber-300 bg-amber-50/40 hover:border-amber-400';
              } else {
                cellCls += 'cursor-pointer border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30';
              }

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isPast || isBlockedMaint || busy}
                  onClick={() => toggleDate(key)}
                  className={cellCls}
                >
                  <div
                    className={`text-sm font-semibold ${isToday ? 'text-red-600' : isPast ? 'text-gray-300' : 'text-gray-900'}`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="mt-0.5 max-h-[5.25rem] space-y-0.5 overflow-y-auto">
                    {isSelected && (
                      <div className="flex items-center gap-0.5 truncate rounded bg-blue-600 px-0.5 py-0.5 text-[10px] font-medium leading-tight text-white">
                        <CheckCircle className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{selectionMode === 'single' ? 'Selected' : 'Scheduled'}</span>
                      </div>
                    )}
                    {tripsOnDay.map((trip, tripIdx) => {
                      const secondary = tripChipSecondary(trip);
                      return (
                        <div
                          key={`${key}-${trip.vehicleId ?? 'v'}-${trip.tripNumber ?? tripIdx}`}
                          className={`rounded px-0.5 py-0.5 text-[10px] font-medium leading-tight ${
                            trip.isConflict !== false
                              ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                          title={bookingTooltip(trip)}
                        >
                          <div className="flex items-center gap-0.5 truncate">
                            <Truck className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{tripChipLabel(trip)}</span>
                          </div>
                          {secondary ? (
                            <div className="truncate pl-3.5 text-[9px] font-normal opacity-90">{secondary}</div>
                          ) : null}
                        </div>
                      );
                    })}
                    {maintOnDay.map((maint) => (
                      <div
                        key={`${key}-maint-${maint.vehicleId ?? 'v'}`}
                        className={`flex items-center gap-0.5 truncate rounded px-0.5 py-0.5 text-[10px] font-medium leading-tight ${
                          maint.isConflict !== false
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                        title={bookingTooltip(maint)}
                      >
                        <Wrench className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">
                          {maint.isConflict ? 'Maintenance' : `${maint.vehicleName ?? 'Truck'} maint.`}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {footerNote ? <p className="text-xs text-gray-500">{footerNote}</p> : null}
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <Button variant="outline" onClick={onClose} disabled={busy} className="w-full justify-center sm:w-auto">
            Cancel
          </Button>
          <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            {confirmWarning ? <div className="sm:max-w-md">{confirmWarning}</div> : null}
            <Button
            variant="primary"
            disabled={selectedDates.length === 0 || hasMaintOnSelected || busy || confirmDisabled}
            onClick={async () => {
              setSubmitting(true);
              try {
                await Promise.resolve(onConfirm(selectedDates));
              } finally {
                setSubmitting(false);
              }
            }}
            className="w-full min-w-[12rem] justify-center sm:w-auto"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {confirmLabel} ({selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'})
              </>
            )}
          </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
