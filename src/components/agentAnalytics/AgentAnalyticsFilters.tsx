import React from 'react';
import { MapPin } from 'lucide-react';
import { BranchOption } from '@/src/lib/agentAnalytics';

interface Props {
  branches: BranchOption[];
  branchId: string | null;
  onBranchChange: (id: string | null) => void;
  /** Shown on the right (e.g. Executive "Manage Quotas"). */
  headerActions?: React.ReactNode;
}

export function AgentAnalyticsFilters({
  branches,
  branchId,
  onBranchChange,
  headerActions,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide shrink-0">Branch</label>
        <select
          value={branchId ?? ''}
          onChange={(e) => onBranchChange(e.target.value ? e.target.value : null)}
          className="text-sm border border-gray-300 rounded-lg shadow-sm py-1.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[12rem]"
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {headerActions ? (
        <div className="flex items-center shrink-0">{headerActions}</div>
      ) : null}
    </div>
  );
}
