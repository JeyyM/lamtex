import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowUpDown,
} from 'lucide-react';
import {
  AgentLeaderboardRow,
  employeeProfilePathFromAgent,
  formatCurrencyShort,
  formatNumber,
  formatPercent,
} from '@/src/lib/agentAnalytics';

type SortField =
  | 'revenue'
  | 'attainment'
  | 'orders'
  | 'aov'
  | 'collection'
  | 'newCustomers'
  | 'delta';

interface Props {
  rows: AgentLeaderboardRow[];
  /** Section heading above the table */
  title?: string;
}

function trendIcon(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return <Minus className="w-4 h-4 text-gray-400" />;
  if (value > 0) return <ArrowUp className="w-4 h-4 text-green-600" />;
  return <ArrowDown className="w-4 h-4 text-red-600" />;
}

function attainmentColor(pct: number) {
  if (pct >= 110) return 'bg-emerald-500';
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 80) return 'bg-yellow-400';
  if (pct >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

function attainmentBadgeClass(pct: number) {
  if (pct >= 110) return 'bg-emerald-100 text-emerald-700';
  if (pct >= 100) return 'bg-green-100 text-green-700';
  if (pct >= 80) return 'bg-yellow-100 text-yellow-700';
  if (pct >= 50) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

export function AgentLeaderboard({ rows, title = 'Leaderboard' }: Props) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('attainment');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => !q || r.agentName.toLowerCase().includes(q));
  }, [rows, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const factor = sortDir === 'desc' ? -1 : 1;
    arr.sort((a, b) => {
      const get = (r: AgentLeaderboardRow): number => {
        switch (sortField) {
          case 'revenue':
            return r.revenue;
          case 'attainment':
            return r.attainmentPct;
          case 'orders':
            return r.orderCount;
          case 'aov':
            return r.averageOrderValue;
          case 'collection':
            return r.collectionRate;
          case 'newCustomers':
            return r.newCustomers;
          case 'delta':
            return r.revenueDeltaPct;
          default:
            return 0;
        }
      };
      return (get(a) - get(b)) * factor;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const toggleSort = (f: SortField) => {
    if (f === sortField) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else {
      setSortField(f);
      setSortDir('desc');
    }
  };

  const SortHeader = ({
    label,
    field,
    align = 'right',
  }: {
    label: string;
    field: SortField;
    align?: 'left' | 'right' | 'center';
  }) => {
    const alignClass =
      align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right';
    return (
      <th className={`px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider ${alignClass} select-none`}>
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className={`inline-flex items-center gap-1 hover:text-gray-900 ${
            sortField === field ? 'text-gray-900' : ''
          } ${align === 'right' ? 'ml-auto' : ''}`}
        >
          {label}
          <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-blue-600' : 'opacity-40'}`} />
        </button>
      </th>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search agents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Agent
              </th>
              <SortHeader label="Revenue" field="revenue" />
              <SortHeader label="Δ vs prev" field="delta" />
              <SortHeader label="Quota Progress" field="attainment" align="left" />
              <SortHeader label="Orders" field="orders" />
              <SortHeader label="AOV" field="aov" />
              <SortHeader label="Collection" field="collection" />
              <SortHeader label="New Cust." field="newCustomers" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sorted.map((r) => (
              <tr key={r.agentId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5">
                  <Link
                    to={employeeProfilePathFromAgent(r.employeePublicId, r.agentId)}
                    className="block rounded-md -mx-1 px-1 py-0.5 text-left hover:bg-blue-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                  >
                    <span className="font-semibold text-blue-700 hover:underline">{r.agentName}</span>
                    <span className="block text-xs text-gray-600">{r.branchName ?? '—'}</span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-900 tabular-nums">
                  {formatCurrencyShort(r.revenue)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                    {trendIcon(r.revenueDeltaPct)}
                    <span className={r.revenueDeltaPct >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {Math.abs(r.revenueDeltaPct).toFixed(1)}%
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2.5 min-w-[180px]">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${attainmentBadgeClass(r.attainmentPct)}`}
                    >
                      {formatPercent(r.attainmentPct)}
                    </span>
                    <span className="text-[11px] text-gray-500 tabular-nums">/ {formatCurrencyShort(r.effectiveTarget)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${attainmentColor(r.attainmentPct)}`}
                      style={{ width: `${Math.min(100, Math.max(2, r.attainmentPct))}%` }}
                    />
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">{formatNumber(r.orderCount)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                  {formatCurrencyShort(r.averageOrderValue)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span
                    className={`px-2 py-0.5 text-xs rounded font-medium ${
                      r.collectionRate >= 95
                        ? 'bg-green-100 text-green-700'
                        : r.collectionRate >= 75
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {formatPercent(r.collectionRate, 0)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">{r.newCustomers}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                  No agents match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
