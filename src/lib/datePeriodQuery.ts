import { getPeriodRange, type PeriodKey } from './agentAnalytics';

export type DatePeriodKind = PeriodKey | 'all';

export const DATE_PERIOD_OPTIONS: { kind: DatePeriodKind; label: string }[] = [
  { kind: 'all', label: 'All time' },
  { kind: 'day', label: '1 day' },
  { kind: 'week', label: '1 week' },
  { kind: 'month', label: '1 month' },
  { kind: 'sixMonths', label: '6 months' },
  { kind: 'ytd', label: 'YTD' },
  { kind: 'year', label: '1 year' },
  { kind: 'custom', label: 'Custom range' },
];

export function pad2Local(n: number): string {
  return String(n).padStart(2, '0');
}

export function todayIsoLocal(): string {
  const t = new Date();
  return `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-${pad2Local(t.getDate())}`;
}

export interface DatePeriodQuery {
  from: string;
  to: string;
  invalid: boolean;
  displayLabel: string;
}

export function resolveDatePeriodQuery(
  kind: DatePeriodKind,
  customStart: string,
  customEnd: string,
): DatePeriodQuery {
  if (kind === 'all') {
    return { from: '', to: '', invalid: false, displayLabel: 'All time' };
  }
  if (kind === 'custom') {
    if (customStart && customEnd && customStart > customEnd) {
      return { from: '', to: '', invalid: true, displayLabel: 'Custom (invalid range)' };
    }
    if (customStart && customEnd && customStart <= customEnd) {
      return {
        from: customStart,
        to: customEnd,
        invalid: false,
        displayLabel: `${customStart} → ${customEnd}`,
      };
    }
    const fb = getPeriodRange('month');
    return { from: fb.start, to: fb.end, invalid: false, displayLabel: fb.displayLabel };
  }
  const r = getPeriodRange(kind);
  return { from: r.start, to: r.end, invalid: false, displayLabel: r.displayLabel };
}

export function periodTriggerLabel(
  kind: DatePeriodKind,
  customStart: string,
  customEnd: string,
): string {
  return resolveDatePeriodQuery(kind, customStart, customEnd).displayLabel;
}

export function csvDateOnlyIso(v: string | null | undefined): string {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (!s) return '';
  const datePart = s.includes('T') ? s.split('T')[0]! : s.slice(0, 10);
  return datePart.length >= 10 ? datePart.slice(0, 10) : s;
}

/** True when date falls within [dateFrom, dateTo] inclusive. Empty from/to = all time. */
export function inDatePeriodRange(
  dateStr: string | null | undefined,
  dateFrom: string,
  dateTo: string,
): boolean {
  if (!dateFrom && !dateTo) return true;
  const d = csvDateOnlyIso(dateStr);
  if (!d) return false;
  if (dateFrom && d < dateFrom) return false;
  if (dateTo && d > dateTo) return false;
  return true;
}

/** Inclusive day count for averaging (minimum 1). */
export function daysInRange(from: string, to: string): number {
  if (!from || !to) return 365;
  const s = new Date(`${from}T00:00:00`);
  const e = new Date(`${to}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

/** Average units per month over the selected range. */
export function avgMonthlyUsage(units: number, from: string, to: string): number {
  return Math.round(units / monthsInRange(from, to));
}

/** Average units per day over the selected range. */
export function avgDailyUsage(units: number, from: string, to: string): number {
  return units / daysInRange(from, to);
}

/** Inclusive month count for averaging (minimum 1). */
export function monthsInRange(from: string, to: string): number {
  if (!from || !to) return 12;
  const s = new Date(`${from}T00:00:00`);
  const e = new Date(`${to}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
}

export function monthSlotsBetween(from: string, to: string): { ymk: string; label: string }[] {
  const endFallback = todayIsoLocal();
  const startIso = from || endFallback.slice(0, 8) + '01';
  const endIso = to || endFallback;

  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const slots: { ymk: string; label: string }[] = [];
  let d = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (d <= endMonth) {
    const ymk = `${d.getFullYear()}-${pad2Local(d.getMonth() + 1)}`;
    const label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
    slots.push({ ymk, label });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return slots;
}

/** Last N calendar months ending today (for “all time” chart view). */
export function lastNMonthSlots(n: number): { ymk: string; label: string }[] {
  const end = new Date();
  const slots: { ymk: string; label: string }[] = [];
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date(end.getFullYear(), end.getMonth() - k, 1);
    const ymk = `${d.getFullYear()}-${pad2Local(d.getMonth() + 1)}`;
    const label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
    slots.push({ ymk, label });
  }
  return slots;
}
