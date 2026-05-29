import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Loader2, TrendingUp, Target } from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';
import { 
  AgentAnalyticsBundle,
  BranchOption,
  PeriodKey,
  PeriodRange,
  fetchAgentAnalyticsBundle,
  fetchBranches,
  getPeriodRange,
  quotaMonthPeriodKey,
} from '@/src/lib/agentAnalytics';
import {
  downloadAgentOverviewWorkbook,
  downloadAgentTrendsWorkbook,
} from '@/src/lib/agentAnalyticsExport';
import { AgentKpiStrip } from '@/src/components/agentAnalytics/AgentKpiStrip';
import { AgentLeaderboard } from '@/src/components/agentAnalytics/AgentLeaderboard';
import { BranchComparison } from '@/src/components/agentAnalytics/BranchComparison';
import { TrendsCharts } from '@/src/components/agentAnalytics/TrendsCharts';
import { AgentAnalyticsFilters } from '@/src/components/agentAnalytics/AgentAnalyticsFilters';
import { ManageBranchQuotasModal } from '@/src/components/agentAnalytics/ManageBranchQuotasModal';

type Tab = 'overview' | 'trends';

const TAB_ORDER: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
];

const AgentAnalyticsPage: React.FC = () => {
  const { role, session, employeeName } = useAppContext();

  const [tab, setTab] = useState<Tab>('overview');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [bundle, setBundle] = useState<AgentAnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Page-local branch filter (navbar branch is hidden on /agents). */
  const [analyticsBranchId, setAnalyticsBranchId] = useState<string | null>(null);

  const [periodKind, setPeriodKind] = useState<PeriodKey>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [manageQuotasOpen, setManageQuotasOpen] = useState(false);
  const [exportingSection, setExportingSection] = useState(false);

  const range: PeriodRange = useMemo(() => {
    if (periodKind === 'custom') {
      if (customStart && customEnd && customStart <= customEnd) {
        return getPeriodRange('custom', { start: customStart, end: customEnd });
      }
      return getPeriodRange('month');
    }
    return getPeriodRange(periodKind);
  }, [periodKind, customStart, customEnd]);

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

  const branchLabel = analyticsBranchId
    ? branches.find((b) => b.id === analyticsBranchId)?.name ?? 'Branch'
    : 'All branches';
  const activeTabLabel = TAB_ORDER.find((t) => t.id === tab)?.label ?? 'Section';

  const exportCurrentSection = async () => {
    if (exportingSection || !bundle) return;
    setExportingSection(true);
    try {
      if (tab === 'overview') {
        await downloadAgentOverviewWorkbook({
          bundle,
          branchLabel,
          periodLabel: range.displayLabel,
        });
      } else {
        await downloadAgentTrendsWorkbook({
          bundle,
          branchLabel,
          periodLabel: range.displayLabel,
          branchId: analyticsBranchId,
        });
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExportingSection(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agent Analytics</h1>
        </div>
        <button
          type="button"
          onClick={() => void exportCurrentSection()}
          disabled={exportingSection || !bundle}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-60"
        >
          {exportingSection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export {activeTabLabel}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {TAB_ORDER.map((t) => {
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
          headerActions={
            role === 'Executive' && tab === 'trends' ? (
              <button
                type="button"
                onClick={() => setManageQuotasOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
              >
                <Target className="w-4 h-4 shrink-0" />
                Manage Quotas
              </button>
            ) : undefined
          }
        />
      )}

      {role === 'Executive' && branches.length > 0 && (
        <ManageBranchQuotasModal
          open={manageQuotasOpen}
          onClose={() => setManageQuotasOpen(false)}
          branches={branches}
          quotaPeriodKey={quotaMonthPeriodKey(range)}
          changedByEmail={session?.user?.email ?? ''}
          changedByName={employeeName ?? ''}
          onSaved={() => {
            void load();
          }}
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

          {tab === 'trends' && <TrendsCharts bundle={bundle} />}
        </>
      )}
    </div>
  );
};

export default AgentAnalyticsPage;
