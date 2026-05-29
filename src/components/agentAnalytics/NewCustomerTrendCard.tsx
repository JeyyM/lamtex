import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users } from 'lucide-react';
import type { NewCustomerTrendPoint, BranchCustomerTrendLine } from '@/src/lib/agentAnalytics';
import { branchChartColorAt } from '@/src/lib/agentAnalytics';

interface Props {
  trend: NewCustomerTrendPoint[];
  branchLines?: BranchCustomerTrendLine[] | null;
  branchLabel?: string;
}

export function NewCustomerTrendCard({ trend, branchLines, branchLabel }: Props) {
  const showBranchLines = Boolean(branchLines?.length);

  const chartData = useMemo(() => {
    if (showBranchLines && branchLines) {
      return trend.map((pt, i) => {
        const row: Record<string, string | number> = {
          monthLabel: pt.monthLabel,
          periodKey: pt.periodKey,
        };
        for (const b of branchLines) {
          row[b.branchId] = b.monthlyNewCustomers[i] ?? 0;
        }
        return row;
      });
    }
    return trend;
  }, [trend, branchLines, showBranchLines]);

  const totalAcquired = trend.reduce((s, p) => s + p.count, 0);
  const peakMonth = trend.reduce(
    (best, p) => (p.count > best.count ? p : best),
    trend[0] ?? { monthLabel: '—', count: 0 },
  );

  const spanLabel = useMemo(() => {
    if (!trend.length) return '';
    if (trend.length === 1) return trend[0].monthLabel;
    return `${trend[0].monthLabel} – ${trend[trend.length - 1].monthLabel}`;
  }, [trend]);

  const periodLabel = showBranchLines ? 'per branch' : branchLabel ? `in ${branchLabel}` : '';
  const subtitle = `New customers registered ${periodLabel ? periodLabel + ' ' : ''}per period.`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex flex-col gap-1 mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          {`New customers — ${spanLabel}`}
        </h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="text-xs text-gray-500">
          Total:{' '}
          <span className="font-semibold text-gray-800">{totalAcquired.toLocaleString()}</span>
        </div>
        <div className="text-xs text-gray-500">
          Peak:{' '}
          <span className="font-semibold text-gray-800">
            {peakMonth.monthLabel} ({peakMonth.count})
          </span>
        </div>
      </div>

      <div className="h-72 min-h-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={0}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="monthLabel" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
            <Tooltip
              formatter={(value: number) => [value.toLocaleString(), undefined]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
            />
            <Legend />
            {showBranchLines && branchLines
              ? branchLines.map((b, i) => (
                  <Line
                    key={b.branchId}
                    type="monotone"
                    dataKey={b.branchId}
                    name={b.branchName}
                    stroke={branchChartColorAt(i)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))
              : (
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="New customers"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
