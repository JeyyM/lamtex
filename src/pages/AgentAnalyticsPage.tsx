import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Loader2,
  MapPin,
  Target,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';
import {
  AgentAnalyticsBundle,
  BranchOption,
  PeriodKey,
  PeriodRange,
  fetchAgentAnalyticsBundle,
  fetchBranches,
  getPeriodRange,
} from '@/src/lib/agentAnalytics';
import { AgentKpiStrip } from '@/src/components/agentAnalytics/AgentKpiStrip';
import { AgentLeaderboard } from '@/src/components/agentAnalytics/AgentLeaderboard';
import { BranchComparison } from '@/src/components/agentAnalytics/BranchComparison';
import { QuotasManager } from '@/src/components/agentAnalytics/QuotasManager';
import { TrendsCharts } from '@/src/components/agentAnalytics/TrendsCharts';
import { ActionPanels } from '@/src/components/agentAnalytics/ActionPanels';
import { AgentAnalyticsFilters } from '@/src/components/agentAnalytics/AgentAnalyticsFilters';

type Tab = 'overview' | 'quotas' | 'branches' | 'trends' | 'actions';

const TAB_ORDER: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'quotas', label: 'Quotas', icon: Target },
  { id: 'branches', label: 'Branches', icon: MapPin },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'actions', label: 'Actions', icon: AlertTriangle },
];

const AgentAnalyticsPage: React.FC = () => {
  const { role, session, employeeName, branch: navbarBranch } = useAppContext();
  const allowedTabs: Tab[] = useMemo(() => {
    // Only Executives can manage quotas (single source of truth for now).
    if (role === 'Executive') return TAB_ORDER.map((t) => t.id);
    if (role === 'Agent' || role === 'Driver') return ['overview', 'branches', 'trends'];
    return ['overview', 'branches', 'trends', 'actions'];
  }, [role]);

  const [tab, setTab] = useState<Tab>('overview');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [bundle, setBundle] = useState<AgentAnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Page-local branch filter (navbar branch is hidden on /agents). */
  const [analyticsBranchId, setAnalyticsBranchId] = useState<string | null>(null);
  const branchInitDone = useRef(false);

  const [periodKind, setPeriodKind] = useState<PeriodKey>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const range: PeriodRange = useMemo(() => {
    if (periodKind === 'custom') {
      if (customStart && customEnd && customStart <= customEnd) {
        return getPeriodRange('custom', { start: customStart, end: customEnd });
      }
      return getPeriodRange('month');
    }
    return getPeriodRange(periodKind);
  }, [periodKind, customStart, customEnd]);

  useEffect(() => {
    if (branches.length === 0 || branchInitDone.current) return;
    branchInitDone.current = true;
    const nav = (navbarBranch ?? '').trim();
    if (!nav) {
      setAnalyticsBranchId(null);
      return;
    }
    const hit = branches.find((b) => b.name.trim().toLowerCase() === nav.toLowerCase());
    setAnalyticsBranchId(hit?.id ?? null);
  }, [branches, navbarBranch]);

  const handlePeriodKindChange = useCallback((kind: PeriodKey) => {
    setPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const iso = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
      const start = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-01`;
      setCustomStart(start);
      setCustomEnd(iso);
    }
  }, []);

  // Fall back to first allowed tab if current selection isn't permitted.
  useEffect(() => {
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0] ?? 'overview');
  }, [allowedTabs, tab]);

  useEffect(() => {
    fetchBranches().then(setBranches);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const b = await fetchAgentAnalyticsBundle({ range, branchId: analyticsBranchId });
      setBundle(b);
    } catch (e) {
      console.error('AgentAnalytics load failed', e);
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [range, analyticsBranchId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end, analyticsBranchId]);

  const changedByEmail = session?.user?.email ?? '';
  const changedByName = employeeName ?? '';

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agent Analytics</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {TAB_ORDER.filter((t) => allowedTabs.includes(t.id)).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 sm:px-4 py-2 text-sm inline-flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-blue-600 text-blue-700 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {branches.length > 0 && (
        <AgentAnalyticsFilters
          branches={branches}
          branchId={analyticsBranchId}
          onBranchChange={setAnalyticsBranchId}
          periodKind={periodKind}
          onPeriodKindChange={handlePeriodKindChange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
      )}

      {/* Body */}
      {loading || !bundle ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin mb-2" />
          <span className="text-sm">Loading analytics…</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              <AgentKpiStrip summary={bundle.summary} />
              <AgentLeaderboard rows={bundle.agents.slice(0, 10)} title="Top agents" />
              <BranchComparison
                branches={bundle.branches}
                selectedBranchId={analyticsBranchId}
                onSelectBranch={setAnalyticsBranchId}
              />
            </div>
          )}

          {tab === 'quotas' && (
            <QuotasManager
              rows={bundle.agents}
              range={range}
              changedByEmail={changedByEmail}
              changedByName={changedByName}
              onChanged={load}
              branchId={analyticsBranchId}
              branchLabel={analyticsBranchId ? branches.find((b) => b.id === analyticsBranchId)?.name ?? null : null}
            />
          )}

          {tab === 'branches' && (
            <BranchComparison
              branches={bundle.branches}
              selectedBranchId={analyticsBranchId}
              onSelectBranch={setAnalyticsBranchId}
            />
          )}

          {tab === 'trends' && <TrendsCharts bundle={bundle} />}

          {tab === 'actions' && <ActionPanels bundle={bundle} onChanged={load} />}
        </>
      )}
    </div>
  );
};

export default AgentAnalyticsPage;
