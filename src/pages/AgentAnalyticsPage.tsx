import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarRange, Download, Loader2, RefreshCw, Target, TrendingUp, X } from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';
import {
  AgentAnalyticsBundle,
  BranchOption,
  PeriodRange,
  fetchAgentAnalyticsBundle,
  fetchBranches,
  getPeriodRange,
  quotaMonthPeriodKey,
} from '@/src/lib/agentAnalytics';
import {
  DATE_PERIOD_OPTIONS,
  DatePeriodKind,
  periodTriggerLabel,
  todayIsoLocal,
} from '@/src/lib/datePeriodQuery';
import {
  downloadAgentOverviewWorkbook,
  downloadAgentTrendsWorkbook,
} from '@/src/lib/agentAnalyticsExport';
import { Button } from '@/src/components/ui/Button';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
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

  const [periodKind, setPeriodKind] = useState<DatePeriodKind>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [draftPeriodKind, setDraftPeriodKind] = useState<DatePeriodKind>('month');
  const [draftCustomStart, setDraftCustomStart] = useState('');
  const [draftCustomEnd, setDraftCustomEnd] = useState('');

  const [manageQuotasOpen, setManageQuotasOpen] = useState(false);
  const [exportingSection, setExportingSection] = useState(false);

  const range: PeriodRange = useMemo(() => {
    if (periodKind === 'all') {
      return getPeriodRange('custom', { start: '2020-01-01', end: todayIsoLocal() });
    }
    if (periodKind === 'custom') {
      if (customStart && customEnd && customStart <= customEnd) {
        return getPeriodRange('custom', { start: customStart, end: customEnd });
      }
      return getPeriodRange('month');
    }
    return getPeriodRange(periodKind);
  }, [periodKind, customStart, customEnd]);

  const maxCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftCustomInvalid = Boolean(
    draftCustomStart && draftCustomEnd && draftCustomStart > draftCustomEnd,
  );

  const openPeriodModal = () => {
    setDraftPeriodKind(periodKind);
    setDraftCustomStart(customStart);
    setDraftCustomEnd(customEnd);
    setPeriodModalOpen(true);
  };

  const handleModalPresetPick = useCallback((kind: DatePeriodKind) => {
    setDraftPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = todayIsoLocal();
      const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
      setDraftCustomStart((prev) => prev || customStart || start);
      setDraftCustomEnd((prev) => prev || customEnd || iso);
    } else {
      setPeriodKind(kind);
      setCustomStart('');
      setCustomEnd('');
      setPeriodModalOpen(false);
    }
  }, [customStart, customEnd]);

  const applyModalCustomRange = () => {
    setPeriodKind('custom');
    setCustomStart(draftCustomStart);
    setCustomEnd(draftCustomEnd);
    setPeriodModalOpen(false);
  };

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
  }, [load]);

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

  const periodModal = (
    <PortalModalOverlay
      open={periodModalOpen}
      onClose={() => setPeriodModalOpen(false)}
      zIndex={110}
      mobileBottomSheet
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agents-period-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 id="agents-period-modal-title" className="text-lg font-semibold text-gray-900">
            Date range
          </h2>
          <button
            type="button"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
            onClick={() => setPeriodModalOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Choose a preset or set a custom date range. All analytics metrics use this period.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DATE_PERIOD_OPTIONS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => handleModalPresetPick(kind)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  draftPeriodKind === kind
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {draftPeriodKind === 'custom' && (
            <div className="space-y-2 pt-1 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                <input
                  type="date"
                  value={draftCustomStart}
                  max={maxCustomDate}
                  onChange={(e) => setDraftCustomStart(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <label className="text-xs font-medium text-gray-600">To</label>
                <input
                  type="date"
                  value={draftCustomEnd}
                  min={draftCustomStart || undefined}
                  max={maxCustomDate}
                  onChange={(e) => setDraftCustomEnd(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {draftCustomInvalid && (
                <p className="text-xs text-red-600">Start must be on or before end.</p>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            className="border-gray-300 bg-white"
            onClick={() => setPeriodModalOpen(false)}
          >
            Cancel
          </Button>
          {draftPeriodKind === 'custom' && (
            <Button
              type="button"
              variant="primary"
              disabled={draftCustomInvalid}
              onClick={applyModalCustomRange}
            >
              Apply range
            </Button>
          )}
        </div>
      </div>
    </PortalModalOverlay>
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agent Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            {branchLabel} · {range.displayLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-gray-300 bg-white max-w-[18rem]"
            aria-haspopup="dialog"
            aria-expanded={periodModalOpen}
            aria-label="Choose date range"
            onClick={openPeriodModal}
          >
            <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
            <span className="truncate text-left text-sm font-normal">
              {periodTriggerLabel(periodKind, customStart, customEnd)}
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => void exportCurrentSection()}
            disabled={exportingSection || !bundle}
            className="gap-2"
          >
            {exportingSection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export {activeTabLabel}
          </Button>
        </div>
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

      {periodModal}

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
