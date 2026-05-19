import React, { useEffect, useMemo, useState } from 'react';
import {
  Target,
  Edit3,
  Users,
  History,
  Save,
  X,
  Loader2,
  Sparkles,
  Calculator,
  AlertCircle,
} from 'lucide-react';
import {
  AgentLeaderboardRow,
  PeriodRange,
  bulkUpsertAgentTargets,
  demoBranchMonthlyCarried,
  fetchBranchMonthlyQuotaCarried,
  fetchQuotaHistory,
  formatCurrency,
  formatCurrencyShort,
  formatPercent,
  periodPacing,
  quotaAttainmentScale,
  quotaMonthPeriodKey,
  upsertAgentTarget,
  upsertBranchSalesTarget,
  QuotaHistoryRow,
} from '@/src/lib/agentAnalytics';
import { supabase } from '@/src/lib/supabase';

interface Props {
  rows: AgentLeaderboardRow[];
  range: PeriodRange;
  changedByEmail: string;
  changedByName: string;
  onChanged: () => void;
  /** When set, branch quota applies to all agents (stored under calendar month of filter end date). */
  branchId?: string | null;
  branchLabel?: string | null;
}

export function BranchQuotaPanel({
  branchId,
  branchLabel,
  branchCode,
  periodLabel,
  changedByEmail,
  changedByName,
  onChanged,
}: {
  branchId: string | null;
  branchLabel: string | null;
  /** Used to autofill from demo seed when Supabase has no rows for this branch. */
  branchCode?: string | null;
  periodLabel: string;
  changedByEmail: string;
  changedByName: string;
  onChanged: () => void;
}) {
  const [monthly, setMonthly] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const { value, hasSteps } = await fetchBranchMonthlyQuotaCarried(branchId, periodLabel);
        if (cancelled) return;
        if (hasSteps) {
          const v = Number.isFinite(value) ? value : 0;
          setMonthly(Number.isInteger(v) ? String(Math.round(v)) : String(v));
          return;
        }
        const demo = branchCode ? demoBranchMonthlyCarried(branchCode, periodLabel) : 0;
        if (demo > 0) {
          setMonthly(String(Math.round(demo)));
          return;
        }
        setMonthly('');
      } catch {
        if (cancelled) return;
        const demo = branchCode ? demoBranchMonthlyCarried(branchCode, periodLabel) : 0;
        setMonthly(demo > 0 ? String(Math.round(demo)) : '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, branchCode, periodLabel]);

  if (!branchId) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm">
        Select a branch in the filters above to set the <strong>branch quota</strong> shared by all sales agents in
        that branch.
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await upsertBranchSalesTarget({
      branchId,
      period: periodLabel,
      monthly: monthly === '' ? null : Number(monthly),
      quarterly: null,
      stretch: null,
      note: 'Branch monthly quota updated',
      changedByEmail,
      changedByName,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to save branch quota');
      return;
    }
    onChanged();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-600" /> Branch quota ({branchLabel ?? 'branch'})
        </h3>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading branch quota…
        </div>
      ) : (
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-gray-700 mb-1">Monthly target (₱)</label>
          <input
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      )}
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">{error}</div>
      )}
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || loading}
        className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save branch quota & sync agents
      </button>
    </div>
  );
}

/** Monthly presets for bulk apply */
const QUOTA_PRESETS: { monthly: number }[] = [
  { monthly: 500_000 },
  { monthly: 1_000_000 },
  { monthly: 1_750_000 },
  { monthly: 2_500_000 },
];

export function QuotasManager({
  rows,
  range,
  changedByEmail,
  changedByName,
  onChanged,
  branchId,
  branchLabel,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const pacing = useMemo(() => periodPacing(range), [range]);
  const elapsedPct = (pacing.elapsed / pacing.total) * 100;
  const quotaPeriodKey = quotaMonthPeriodKey(range);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-red-600" /> Quotas — {range.displayLabel}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Period day {pacing.elapsed} / {pacing.total} ({formatPercent(elapsedPct, 0)} elapsed). Changes are
            audited.
          </p>
        </div>
        <button
          onClick={() => setBulkOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Users className="w-4 h-4" /> Bulk set quotas
        </button>
      </div>

      <BranchQuotaPanel
        branchId={branchId ?? null}
        branchLabel={branchLabel ?? null}
        periodLabel={quotaPeriodKey}
        changedByEmail={changedByEmail}
        changedByName={changedByName}
        onChanged={onChanged}
      />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Agent</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Monthly target</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Revenue so far</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Attainment</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Pacing</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.agentId} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-gray-900">{r.agentName}</div>
                    <div className="text-xs text-gray-500">{r.branchName ?? '—'}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                    {formatCurrencyShort(r.monthlyTarget)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">
                    {formatCurrencyShort(r.revenue)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`px-2 py-0.5 text-xs rounded font-semibold ${
                        r.attainmentPct >= 100
                          ? 'bg-green-100 text-green-700'
                          : r.attainmentPct >= 80
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {r.effectiveTarget > 0 ? formatPercent(r.attainmentPct) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`px-2 py-0.5 text-xs rounded font-medium ${
                        r.pacingPct >= 100
                          ? 'bg-green-100 text-green-700'
                          : r.pacingPct >= 80
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {r.effectiveTarget > 0 ? formatPercent(r.pacingPct) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditingId(r.agentId)}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mr-2"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => setHistoryId(r.agentId)}
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
                    >
                      <History className="w-3 h-3" /> History
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No agents in scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingId && (
        <EditQuotaModal
          row={rows.find((r) => r.agentId === editingId)!}
          range={range}
          quotaPeriodKey={quotaPeriodKey}
          changedByEmail={changedByEmail}
          changedByName={changedByName}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            onChanged();
          }}
        />
      )}

      {bulkOpen && (
        <BulkQuotaModal
          rows={rows}
          range={range}
          quotaPeriodKey={quotaPeriodKey}
          changedByEmail={changedByEmail}
          changedByName={changedByName}
          onClose={() => setBulkOpen(false)}
          onSaved={() => {
            setBulkOpen(false);
            onChanged();
          }}
        />
      )}

      {historyId && (
        <HistoryModal
          employeeId={historyId}
          agentName={rows.find((r) => r.agentId === historyId)?.agentName ?? 'Agent'}
          onClose={() => setHistoryId(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------

function EditQuotaModal({
  row,
  range,
  quotaPeriodKey,
  changedByEmail,
  changedByName,
  onClose,
  onSaved,
}: {
  row: AgentLeaderboardRow;
  range: PeriodRange;
  quotaPeriodKey: string;
  changedByEmail: string;
  changedByName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [monthly, setMonthly] = useState(String(row.monthlyTarget || ''));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scale = quotaAttainmentScale(range);
  const previewMonthly = Number(monthly) || 0;
  const previewEffective = previewMonthly > 0 ? previewMonthly * scale : 0;
  const previewAttainment = previewEffective > 0 ? (row.revenue / previewEffective) * 100 : 0;

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await upsertAgentTarget({
      employeeId: row.agentId,
      period: quotaPeriodKey,
      monthly: monthly === '' ? null : Number(monthly),
      quarterly: null,
      stretch: null,
      note: note.trim() === '' ? null : note.trim(),
      changedByEmail,
      changedByName,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to save quota');
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Edit quota — {row.agentName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-xs text-gray-500">
            Monthly quota period <span className="font-mono">{quotaPeriodKey}</span> · Analytics window:{' '}
            {range.displayLabel}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Monthly target (₱)</label>
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              min={0}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Note (audit reason)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional but recommended"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {previewEffective > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-xs text-blue-900">
              <Calculator className="w-4 h-4 mt-0.5" />
              <div>
                Preview: revenue so far <strong>{formatCurrency(row.revenue)}</strong> ÷ expected quota for window{' '}
                <strong>{formatCurrency(previewEffective)}</strong> ({scale === 1 ? '1×' : `${scale.toFixed(2)}×`}{' '}
                monthly) = <strong>{formatPercent(previewAttainment)}</strong> attainment.
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5" /> {error}
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save quota
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulk Modal
// ---------------------------------------------------------------------------

function BulkQuotaModal({
  rows,
  range,
  quotaPeriodKey,
  changedByEmail,
  changedByName,
  onClose,
  onSaved,
}: {
  rows: AgentLeaderboardRow[];
  range: PeriodRange;
  quotaPeriodKey: string;
  changedByEmail: string;
  changedByName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(rows.map((r) => r.agentId));
  const [monthly, setMonthly] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (t: (typeof QUOTA_PRESETS)[number]) => {
    setMonthly(String(t.monthly));
  };

  const toggle = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await bulkUpsertAgentTargets({
      period: quotaPeriodKey,
      rows: selected.map((id) => ({
        employeeId: id,
        monthly: monthly === '' ? null : Number(monthly),
        quarterly: null,
        stretch: null,
      })),
      note: note.trim() === '' ? null : note.trim(),
      changedByEmail,
      changedByName,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to bulk-set quotas');
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Bulk monthly quotas — {range.displayLabel}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Stored under <span className="font-mono">{quotaPeriodKey}</span> (calendar month of filter end).
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monthly target (₱)</label>
              <input
                type="number"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Audit note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-yellow-500" /> Presets
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUOTA_PRESETS.map((t) => (
                  <button
                    key={t.monthly}
                    type="button"
                    onClick={() => applyPreset(t)}
                    className="text-xs px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-left font-semibold tabular-nums"
                  >
                    {formatCurrencyShort(t.monthly)}/mo
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Agents */}
          <div className="border border-gray-200 rounded-lg p-3 overflow-y-auto max-h-96">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-700">
                Apply to ({selected.length}/{rows.length})
              </div>
              <div className="flex gap-1 text-xs">
                <button
                  onClick={() => setSelected(rows.map((r) => r.agentId))}
                  className="text-blue-600 hover:underline"
                >
                  All
                </button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setSelected([])} className="text-gray-600 hover:underline">
                  None
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {rows.map((r) => (
                <label
                  key={r.agentId}
                  className="flex items-center gap-2 text-sm py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(r.agentId)}
                    onChange={() => toggle(r.agentId)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{r.agentName}</div>
                    <div className="text-xs text-gray-500">{r.branchName ?? '—'}</div>
                  </div>
                  <div className="text-xs text-gray-500 tabular-nums">
                    {formatCurrencyShort(r.monthlyTarget)}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5" /> {error}
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || selected.length === 0}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Apply to {selected.length} agent{selected.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Modal
// ---------------------------------------------------------------------------

function HistoryModal({
  employeeId,
  agentName,
  onClose,
}: {
  employeeId: string;
  agentName: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<QuotaHistoryRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchQuotaHistory(employeeId).then((r) => {
      if (alive) setRows(r);
    });
    return () => {
      alive = false;
    };
  }, [employeeId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" /> Quota history — {agentName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {rows === null ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No quota changes recorded yet.</div>
          ) : (
            <ol className="space-y-3">
              {rows.map((h) => (
                <li key={h.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-gray-900">{h.period}</div>
                    <div className="text-xs text-gray-500">{new Date(h.changedAt).toLocaleString()}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <div>
                      Monthly:{' '}
                      <span className="line-through text-gray-400">
                        {h.prevMonthly != null ? formatCurrencyShort(h.prevMonthly) : '—'}
                      </span>{' '}
                      → <strong>{h.newMonthly != null ? formatCurrencyShort(h.newMonthly) : '—'}</strong>
                    </div>
                    <div>
                      Quarterly:{' '}
                      <span className="line-through text-gray-400">
                        {h.prevQuarterly != null ? formatCurrencyShort(h.prevQuarterly) : '—'}
                      </span>{' '}
                      → <strong>{h.newQuarterly != null ? formatCurrencyShort(h.newQuarterly) : '—'}</strong>
                    </div>
                    {(h.prevStretch || h.newStretch) && (
                      <div className="col-span-2">
                        Stretch:{' '}
                        <span className="line-through text-gray-400">{h.prevStretch ?? '—'}</span> →{' '}
                        <strong>{h.newStretch ?? '—'}</strong>
                      </div>
                    )}
                  </div>
                  {(h.changedByName || h.changedByEmail) && (
                    <div className="text-xs text-gray-500 mt-1">
                      by {h.changedByName ?? h.changedByEmail}
                    </div>
                  )}
                  {h.note && <div className="text-xs italic text-gray-600 mt-1">"{h.note}"</div>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
