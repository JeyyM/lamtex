import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { MapPin, Trophy, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  BranchAnalyticsRow,
  formatCurrencyShort,
  formatNumber,
  formatPercent,
} from '@/src/lib/agentAnalytics';

interface Props {
  branches: BranchAnalyticsRow[];
  selectedBranchId: string | null;
  onSelectBranch: (id: string | null) => void;
}

function heatColor(pct: number) {
  if (pct >= 110) return 'bg-emerald-500 text-white';
  if (pct >= 100) return 'bg-green-500 text-white';
  if (pct >= 80) return 'bg-yellow-400 text-gray-900';
  if (pct >= 50) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
}

function deltaIcon(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return <Minus className="w-3 h-3 text-gray-400" />;
  if (value > 0) return <ArrowUp className="w-3 h-3 text-green-600" />;
  return <ArrowDown className="w-3 h-3 text-red-600" />;
}

export function BranchComparison({ branches, selectedBranchId, onSelectBranch }: Props) {
  const chartData = useMemo(
    () =>
      branches.map((b) => ({
        branch: b.branchName,
        Revenue: Math.round(b.revenue),
        Target: Math.round(b.totalTarget),
        attainment: b.attainmentPct,
        id: b.branchId,
      })),
    [branches],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Branch Performance Comparison
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Click any branch to filter the entire page to that branch only.
            {selectedBranchId && (
              <button
                onClick={() => onSelectBranch(null)}
                className="ml-2 text-blue-600 hover:text-blue-800 underline"
              >
                Clear branch filter
              </button>
            )}
          </p>
        </div>
      </div>

      {/* Bar chart: revenue vs target */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Revenue vs Target by Branch</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="branch" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => formatCurrencyShort(v)} />
            <Tooltip
              formatter={(value: number) => formatCurrencyShort(value)}
              contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
            />
            <Legend />
            <Bar dataKey="Target" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Revenue" radius={[4, 4, 0, 0]}>
              {chartData.map((d) => (
                <Cell
                  key={d.id}
                  fill={
                    d.attainment >= 100
                      ? '#10B981'
                      : d.attainment >= 80
                      ? '#F59E0B'
                      : '#EF4444'
                  }
                  cursor="pointer"
                  onClick={() => onSelectBranch(d.id)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Branch Heatmap</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Branch</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Agents</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Revenue</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Δ vs prev</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Orders</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">AOV</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Attainment</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Collection</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Profit mg.</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {branches.map((b) => {
                const isSelected = selectedBranchId === b.branchId;
                return (
                  <tr
                    key={b.branchId}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                    onClick={() => onSelectBranch(isSelected ? null : b.branchId)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-gray-900">{b.branchName}</div>
                      <div className="text-xs text-gray-500">{b.branchCode}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{b.agentCount}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">
                      {formatCurrencyShort(b.revenue)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 tabular-nums text-sm">
                        {deltaIcon(b.revenueDeltaPct)}
                        <span className={b.revenueDeltaPct >= 0 ? 'text-green-700' : 'text-red-700'}>
                          {Math.abs(b.revenueDeltaPct).toFixed(1)}%
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(b.orderCount)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrencyShort(b.averageOrderValue)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block min-w-[60px] px-2 py-1 rounded text-xs font-semibold ${heatColor(b.attainmentPct)}`}>
                        {formatPercent(b.attainmentPct)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block min-w-[60px] px-2 py-1 rounded text-xs font-semibold ${heatColor(b.collectionRate)}`}>
                        {formatPercent(b.collectionRate, 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block min-w-[60px] px-2 py-1 rounded text-xs font-semibold ${heatColor(b.avgMarginPct)}`}>
                        {formatPercent(b.avgMarginPct, 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-bold text-xs">
                        <Trophy className="w-3 h-3" />#{b.rank}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {branches.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No branch data for the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
          Profit margin = branch gross profit ÷ collected revenue (amount paid). Profit uses order line totals after discounts minus{' '}
          <code className="text-gray-600">product_variants.cost_price</code> × qty.
        </div>
      </div>
    </div>
  );
}
