import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import {
  AgentAnalyticsBundle,
  branchChartColorAt,
  formatCurrencyShort,
} from '@/src/lib/agentAnalytics';
import { AgentsHistoryUnassignedPanels } from '@/src/components/agentAnalytics/AgentsAtRiskUnassignedPanels';
import { NewCustomerTrendCard } from '@/src/components/agentAnalytics/NewCustomerTrendCard';

interface Props {
  bundle: AgentAnalyticsBundle;
}

export function TrendsCharts({ bundle }: Props) {
  const branchLines = bundle.branchRevenueTrendLines;

  const multiBranchTrendData = useMemo(() => {
    if (!branchLines?.length) return null;
    return bundle.monthlyTrend.map((pt, i) => {
      const row: Record<string, string | number> = {
        monthLabel: pt.monthLabel,
        periodKey: pt.periodKey,
      };
      for (const line of branchLines) {
        row[line.branchId] = Math.round(line.monthlyRevenue[i] ?? 0);
      }
      return row;
    });
  }, [bundle.monthlyTrend, branchLines]);

  const showAllBranchesTrend = multiBranchTrendData != null && branchLines != null;

  const trendSubtitle = showAllBranchesTrend
    ? 'Collected revenue per branch (same colors as Branch Performance Comparison).'
    : bundle.filterBranchId != null
      ? 'Branch quota steps when it changes by month; orange line is mean revenue per agent in scope.'
      : '';

  const trendSpanLabel = useMemo(() => {
    const pts = bundle.monthlyTrend;
    if (!pts.length) return '';
    if (pts.length === 1) return pts[0].monthLabel;
    return `${pts[0].monthLabel} – ${pts[pts.length - 1].monthLabel}`;
  }, [bundle.monthlyTrend]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col gap-1 mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />{' '}
            {showAllBranchesTrend
              ? `Branch revenue — ${trendSpanLabel}`
              : `Quota history vs revenue — ${trendSpanLabel}`}
          </h3>
          {trendSubtitle && <p className="text-xs text-gray-500">{trendSubtitle}</p>}
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={multiBranchTrendData ?? bundle.monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="monthLabel" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => formatCurrencyShort(v)} />
            <Tooltip
              formatter={(value: number) => formatCurrencyShort(value)}
              contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
            />
            <Legend />
            {showAllBranchesTrend
              ? branchLines.map((line, i) => (
                  <Line
                    key={line.branchId}
                    type="monotone"
                    dataKey={line.branchId}
                    name={line.branchName}
                    stroke={branchChartColorAt(i)}
                    strokeWidth={2}
                    dot={false}
                  />
                ))
              : (
                  <>
                    <Line
                      type="stepAfter"
                      dataKey="quotaMonthly"
                      name="Branch quota (monthly / agent)"
                      stroke="#7F1D1D"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Collected revenue (scope)"
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgAgentRevenue"
                      name="Avg revenue / agent"
                      stroke="#EA580C"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </>
                )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <NewCustomerTrendCard
        trend={bundle.newCustomerTrend}
        branchLines={bundle.newCustomerBranchLines}
      />

      <AgentsHistoryUnassignedPanels bundle={bundle} />
    </div>
  );
}
