import React from 'react';
import { createPortal } from 'react-dom';
import { X, Target } from 'lucide-react';
import { BranchOption } from '@/src/lib/agentAnalytics';
import { BranchQuotaPanel } from '@/src/components/agentAnalytics/QuotasManager';

interface Props {
  open: boolean;
  onClose: () => void;
  branches: BranchOption[];
  quotaPeriodKey: string;
  changedByEmail: string;
  changedByName: string;
  onSaved: () => void;
}

/**
 * Executive: edit `branch_sales_targets` for every active branch for one calendar month (`quotaPeriodKey`).
 * Matches analytics quota month (month of filter end). RPC syncs active Sales Agents per branch.
 */
export function ManageBranchQuotasModal({
  open,
  onClose,
  branches,
  quotaPeriodKey,
  changedByEmail,
  changedByName,
  onSaved,
}: Props) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex min-h-[100dvh] min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[min(90vh,720px)] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" /> Manage quotas
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-4 flex-1 min-h-0">
          <p className="text-sm text-gray-600">Change the quota for the month.</p>

          <div className="space-y-3">
            {branches.map((b) => (
              <BranchQuotaPanel
                key={b.id}
                branchId={b.id}
                branchLabel={b.name}
                branchCode={b.code}
                periodLabel={quotaPeriodKey}
                changedByEmail={changedByEmail}
                changedByName={changedByName}
                onChanged={onSaved}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
