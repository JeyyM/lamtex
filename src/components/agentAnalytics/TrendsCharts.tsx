import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
} from 'recharts';
import { TrendingUp, Wallet } from 'lucide-react';
import {
  AgentAnalyticsBundle,
  formatCurrencyShort,
  AgentLeaderboardRow,
} from '@/src/lib/agentAnalytics';

interface Props {
  bundle: AgentAnalyticsBundle;
}

export function TrendsCharts({ bundle }: Props) {
  const commissionData = useMemo(() => {
    const items = bundle.agents
      .map((a) => ({
        name: a.agentName,
        Paid: Math.round(a.commissionPaid),
        Accrued: Math.round(a.commissionAccrued),
      }))
      .filter((d) => d.Paid > 0 || d.Accrued > 0)
      .sort((a, b) => b.Paid + b.Accrued - (a.Paid + a.Accrued))
      .slice(0, 10);
    return items;
  }, [bundle.agents]);

  const trendSubtitle =
    bundle.filterBranchId != null
      ? 'Branch quota steps when it changes by month; orange line is mean revenue per agent in scope.'
      : 'Quota is a workforce-weighted average of branch quotas (each branch sets one target per agent); orange line is mean revenue per agent.';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col gap-1 mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" /> Quota history vs revenue — last 12 months
          </h3>
          <p className="text-xs text-gray-500">{trendSubtitle}</p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={bundle.monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="monthLabel" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => formatCurrencyShort(v)} />
            <Tooltip
              formatter={(value: number) => formatCurrencyShort(value)}
              contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
            />
            <Legend />
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-orange-600" /> Commission burndown — top 10 agents
        </h3>
        {commissionData.length === 0 ? (
          <div className="text-sm text-gray-500 py-8 text-center">No commission data for the current period.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={commissionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={11} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => formatCurrencyShort(v)} />
              <Tooltip formatter={(value: number) => formatCurrencyShort(value)} />
              <Legend />
              <Bar dataKey="Paid" stackId="c" fill="#10B981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Accrued" stackId="c" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <DiscountDisciplineChart rows={bundle.agents} />
    </div>
  );
}

function DiscountDisciplineChart({ rows }: { rows: AgentLeaderboardRow[] }) {
  const branchAvg = useMemo(() => {
    if (rows.length === 0) return 0;
    return rows.reduce((s, r) => s + r.avgDiscountPercent, 0) / rows.length;
  }, [rows]);

  const data = useMemo(
    () =>
      [...rows]
        .filter((r) => r.revenue > 0)
        .sort((a, b) => b.avgDiscountPercent - a.avgDiscountPercent)
        .slice(0, 15)
        .map((r) => ({
          name: r.agentName,
          discount: Number(r.avgDiscountPercent.toFixed(2)),
        })),
    [rows],
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-700">Discount discipline (avg discount % given)</h3>
        <div className="text-xs text-gray-500">
          Branch average: <strong>{branchAvg.toFixed(2)}%</strong> · bars above this line buy revenue with margin.
        </div>
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center">No discounts recorded.</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" stroke="#6B7280" fontSize={11} interval={0} angle={-25} textAnchor="end" />
            <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Bar dataKey="discount" fill="#F97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
