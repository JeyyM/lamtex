import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Trophy,
  UserPlus,
  Send,
  Loader2,
  X,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  AgentAnalyticsBundle,
  AgentLeaderboardRow,
  formatCurrencyShort,
  formatPercent,
  periodPacing,
  sendAgentCoachingNudge,
} from '@/src/lib/agentAnalytics';

interface Props {
  bundle: AgentAnalyticsBundle;
  onChanged: () => void;
}

export function ActionPanels({ bundle, onChanged }: Props) {
  const navigate = useNavigate();
  const { elapsed, total } = periodPacing(bundle.summary.range);
  const daysLeft = Math.max(0, total - elapsed);

  // At risk: below 60% with limited time remaining
  const atRisk = [...bundle.agents]
    .filter((r) => r.effectiveTarget > 0 && r.attainmentPct < 60)
    .sort((a, b) => a.attainmentPct - b.attainmentPct)
    .slice(0, 8);

  // Top performers
  const topPerformers = [...bundle.agents]
    .filter((r) => r.effectiveTarget > 0 && r.attainmentPct >= 100)
    .sort((a, b) => b.attainmentPct - a.attainmentPct)
    .slice(0, 5);

  // Concentration risk
  const concentrationRisk = bundle.agents
    .filter(
      (r) =>
        r.distinctCustomers > 0 &&
        r.distinctCustomers < 3 &&
        r.revenue > 100_000,
    )
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const [nudgeFor, setNudgeFor] = useState<AgentLeaderboardRow | null>(null);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* At-risk agents */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> Agents at risk ({atRisk.length})
          </h3>
          <span className="text-xs text-gray-500">{daysLeft} days left in period</span>
        </div>
        <div className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
          {atRisk.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              No at-risk agents this period.
            </div>
          ) : (
            atRisk.map((r) => (
              <div key={r.agentId} className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/agents/${r.agentId}`)}
                >
                  <div className="font-semibold text-blue-700 hover:underline">{r.agentName}</div>
                  <div className="text-xs text-gray-500">
                    {r.branchName ?? '—'} · {formatCurrencyShort(r.revenue)} / {formatCurrencyShort(r.effectiveTarget)}{' '}
                    ({formatPercent(r.attainmentPct)})
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-red-500"
                      style={{ width: `${Math.min(100, Math.max(2, r.attainmentPct))}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => setNudgeFor(r)}
                  className="text-xs px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <Send className="w-3 h-3" /> Send nudge
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top performers */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" /> Top performers ({topPerformers.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
          {topPerformers.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No agents above quota yet.</div>
          ) : (
            topPerformers.map((r) => (
              <div
                key={r.agentId}
                className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                onClick={() => navigate(`/agents/${r.agentId}`)}
              >
                <div className="flex-1">
                  <div className="font-semibold text-blue-700 hover:underline">{r.agentName}</div>
                  <div className="text-xs text-gray-500">
                    {r.branchName ?? '—'} · {formatCurrencyShort(r.revenue)} ({formatPercent(r.attainmentPct)})
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                  {formatPercent(r.attainmentPct, 0)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Unassigned customers */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" /> Unassigned customers
          </h3>
          <button
            onClick={() => navigate('/customers?filter=unassigned')}
            className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            Manage <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-4">
          {bundle.summary.customersUnassigned === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              All customers are assigned to an agent.
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-blue-700">{bundle.summary.customersUnassigned}</div>
              <div className="text-sm text-gray-600">customers without an owning agent</div>
              <button
                onClick={() => navigate('/customers?filter=unassigned')}
                className="mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Assign now
              </button>
            </>
          )}
        </div>
      </div>

      {/* Concentration risk */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-purple-500" /> Customer concentration risk
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Agents whose revenue depends on very few customers</p>
        </div>
        <div className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
          {concentrationRisk.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No concentration warnings.</div>
          ) : (
            concentrationRisk.map((r) => (
              <div
                key={r.agentId}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/agents/${r.agentId}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-blue-700 hover:underline">{r.agentName}</div>
                    <div className="text-xs text-gray-500">
                      {r.branchName ?? '—'} · {formatCurrencyShort(r.revenue)} across {r.distinctCustomers} customers
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-bold">
                    {r.distinctCustomers} cust.
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {nudgeFor && (
        <NudgeModal
          row={nudgeFor}
          daysLeft={daysLeft}
          onClose={() => setNudgeFor(null)}
          onSent={() => {
            setNudgeFor(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function NudgeModal({
  row,
  daysLeft,
  onClose,
  onSent,
}: {
  row: AgentLeaderboardRow;
  daysLeft: number;
  onClose: () => void;
  onSent: () => void;
}) {
  const [title, setTitle] = useState(`Quota pacing — ${formatPercent(row.attainmentPct, 0)} attained`);
  const [message, setMessage] = useState(
    `Hi ${row.agentName.split(' ')[0]}, your current attainment is ${formatPercent(
      row.attainmentPct,
      0,
    )} with ${daysLeft} day${daysLeft === 1 ? '' : 's'} left in the period (gap: ${formatCurrencyShort(
      Math.max(0, row.revenueGap),
    )}). Let's set up a quick sync to align on next steps.`,
  );
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>(
    row.attainmentPct < 40 ? 'High' : 'Medium',
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    const res = await sendAgentCoachingNudge({
      employeeId: row.agentId,
      severity,
      title,
      message,
    });
    setSending(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to send nudge');
      return;
    }
    onSent();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-orange-600" /> Coaching nudge — {row.agentName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={sending}
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send nudge
          </button>
        </div>
      </div>
    </div>
  );
}
