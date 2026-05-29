import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { History, Loader2, UserPlus, CheckCircle2, X } from 'lucide-react';
import {
  AgentAnalyticsBundle,
  AgentQuotaMissHistoryRow,
  AgentQuotaMissMonth,
  employeeProfilePathFromAgent,
  fetchAgentQuotaMissHistory,
  formatCurrencyShort,
  formatPercent,
} from '@/src/lib/agentAnalytics';

interface Props {
  bundle: AgentAnalyticsBundle;
}

/**
 * Quota miss history (completed months) + new customers in period (Trends tab).
 */
export function AgentsHistoryUnassignedPanels({ bundle }: Props) {
  const rows = bundle.newCustomersInPeriod;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <AgentQuotaMissHistoryCard branchId={bundle.filterBranchId} />
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            New customers
            {rows.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {rows.length}
              </span>
            )}
          </h3>
          <span className="text-xs text-gray-400">Most recent in period</span>
        </div>
        <div className="p-4">
          {rows.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No new customers registered in this period.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 max-h-72 overflow-y-auto">
              {rows.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/customers/${c.id}`}
                    className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-emerald-50/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {[c.assignedAgentName, c.branchName, c.type]
                          .filter(Boolean)
                          .join(' · ') || 'No details'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap tabular-nums">
                      {new Date(c.createdAt).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentQuotaMissHistoryCard({ branchId }: { branchId: string | null }) {
  const [rows, setRows] = useState<AgentQuotaMissHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalAgent, setModalAgent] = useState<AgentQuotaMissHistoryRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    setModalAgent(null);
    fetchAgentQuotaMissHistory({ branchId })
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load history');
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    if (!modalAgent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalAgent(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalAgent]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <History className="w-4 h-4 text-amber-700" /> Agents history — quota misses
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Past 12 completed months · click misses to open full history
        </p>
      </div>
      <div className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
        {error && (
          <div className="px-4 py-6 text-center text-sm text-red-600">{error}</div>
        )}
        {!error && rows === null && (
          <div className="px-4 py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="text-sm">Loading quota history…</span>
          </div>
        )}
        {!error && rows?.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            No quota misses in this window for agents with a branch quota.
          </div>
        )}
        {!error &&
          rows?.map((r) => {
            const count = r.misses.length;
            return (
              <div key={r.agentId} className="border-b border-gray-100 last:border-b-0">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={employeeProfilePathFromAgent(r.employeePublicId, r.agentId)}
                      className="font-semibold text-blue-700 hover:underline block truncate"
                    >
                      {r.agentName}
                    </Link>
                    <div className="text-xs text-gray-500 truncate">{r.branchName ?? '—'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalAgent(r)}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900 tabular-nums"
                  >
                    {count} miss{count === 1 ? '' : 'es'}
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      <QuotaMissHistoryModal agent={modalAgent} onClose={() => setModalAgent(null)} />
    </div>
  );
}

function QuotaMissHistoryModal({
  agent,
  onClose,
}: {
  agent: AgentQuotaMissHistoryRow | null;
  onClose: () => void;
}) {
  if (!agent || typeof document === 'undefined') return null;

  const count = agent.misses.length;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-miss-history-title"
      className="fixed inset-0 z-[200] flex min-h-[100dvh] min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[min(90vh,640px)] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h2 id="quota-miss-history-title" className="text-lg font-semibold text-gray-900 truncate">
              Quota miss history
            </h2>
            <p className="text-sm font-medium text-blue-700 mt-1 truncate">{agent.agentName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {agent.branchName ?? '—'} · {count} month{count === 1 ? '' : 's'} below quota (past 12 completed months)
            </p>
            <Link
              to={employeeProfilePathFromAgent(agent.employeePublicId, agent.agentId)}
              className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
              onClick={onClose}
            >
              Open agent profile →
            </Link>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-auto flex-1 min-h-0 p-4">
          <QuotaMissHistoryTable misses={agent.misses} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function QuotaMissHistoryTable({ misses }: { misses: AgentQuotaMissMonth[] }) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
            <th className="text-left px-3 py-2.5 font-semibold">Month</th>
            <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Collected</th>
            <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Quota</th>
            <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Attainment</th>
            <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Gap</th>
          </tr>
        </thead>
        <tbody>
          {misses.map((m) => (
            <tr key={m.periodKey} className="border-b border-gray-100 last:border-b-0">
              <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{m.displayLabel}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-800">{formatCurrencyShort(m.revenue)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-800">{formatCurrencyShort(m.quota)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-red-700 font-semibold">
                {formatPercent(m.attainmentPct, 0)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-red-800">
                {formatCurrencyShort(Math.max(0, m.quota - m.revenue))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
