import React from 'react';
import { DollarSign, Target, Award, TrendingUp, TrendingDown, Minus, PiggyBank } from 'lucide-react';
import {
  AnalyticsSummary,
  formatCurrencyShort,
  formatPercent,
} from '@/src/lib/agentAnalytics';

interface Props {
  summary: AnalyticsSummary;
}

function Delta({ value }: { value: number }) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-white/80">
        <Minus className="w-3 h-3" /> 0% vs prev
      </span>
    );
  }
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-100">
        <TrendingUp className="w-3 h-3" /> {value.toFixed(1)}% vs prev
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-100">
      <TrendingDown className="w-3 h-3" /> {Math.abs(value).toFixed(1)}% vs prev
    </span>
  );
}

export function AgentKpiStrip({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium opacity-90">
          <DollarSign className="w-5 h-5" /> Total Revenue
        </div>
        <div className="text-2xl font-bold">{formatCurrencyShort(summary.totalRevenue)}</div>
        <div className="mt-2"><Delta value={summary.revenueDeltaPct} /></div>
      </div>

      {/* Avg Attainment */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium opacity-90">
          <Target className="w-5 h-5" /> Avg Quota Attainment
        </div>
        <div className="text-2xl font-bold">{formatPercent(summary.attainmentAvgPct)}</div>
      </div>

      {/* Commission */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium opacity-90">
          <Award className="w-5 h-5" /> Commission
        </div>
        <div className="text-2xl font-bold">{formatCurrencyShort(summary.commissionPaid)}</div>
      </div>

      {/* Gross profit */}
      <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium opacity-90">
          <PiggyBank className="w-5 h-5" /> Profit
        </div>
        <div className="text-2xl font-bold">{formatCurrencyShort(summary.totalProfit)}</div>
        <div className="mt-2"><Delta value={summary.profitDeltaPct} /></div>
      </div>
    </div>
  );
}
