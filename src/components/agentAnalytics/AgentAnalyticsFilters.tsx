import React, { useMemo } from 'react';
import { CalendarRange, MapPin } from 'lucide-react';
import { BranchOption, PeriodKey } from '@/src/lib/agentAnalytics';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function isoDateLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function todayIso(): string {
  return isoDateLocal(new Date());
}

const PRESET_BUTTONS: { kind: Exclude<PeriodKey, 'custom'>; label: string }[] = [
  { kind: 'day', label: '1 day' },
  { kind: 'week', label: '1 week' },
  { kind: 'month', label: '1 month' },
  { kind: 'sixMonths', label: '6 months' },
  { kind: 'ytd', label: 'YTD' },
  { kind: 'year', label: '1 year' },
];

interface Props {
  branches: BranchOption[];
  branchId: string | null;
  onBranchChange: (id: string | null) => void;
  periodKind: PeriodKey;
  onPeriodKindChange: (kind: PeriodKey) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}

export function AgentAnalyticsFilters({
  branches,
  branchId,
  onBranchChange,
  periodKind,
  onPeriodKindChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: Props) {
  const maxDate = useMemo(() => todayIso(), []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-6 flex-wrap">
        <div className="flex items-center gap-2 min-w-[200px]">
          <MapPin className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide shrink-0">Branch</label>
          <select
            value={branchId ?? ''}
            onChange={(e) => onBranchChange(e.target.value ? e.target.value : null)}
            className="flex-1 min-w-[12rem] text-sm border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <CalendarRange className="w-4 h-4 text-gray-500" aria-hidden />
            Period
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_BUTTONS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => onPeriodKindChange(kind)}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                  periodKind === kind
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPeriodKindChange('custom')}
              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                periodKind === 'custom'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Custom
            </button>
          </div>
          {periodKind === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="text-xs text-gray-600">From</label>
              <input
                type="date"
                value={customStart}
                max={maxDate}
                onChange={(e) => onCustomStartChange(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-xs text-gray-600">To</label>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                max={maxDate}
                onChange={(e) => onCustomEndChange(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
              />
              {customStart && customEnd && customStart > customEnd && (
                <span className="text-xs text-red-600">Start date must be on or before end date.</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
