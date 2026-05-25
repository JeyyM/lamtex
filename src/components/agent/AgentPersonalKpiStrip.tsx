import React from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Target,
  Award,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { AgentDashboardKPI } from '@/src/lib/agentDashboard';

const GRADIENTS: Record<
  string,
  { default: string; good?: string; warning?: string; danger?: string; neutral?: string }
> = {
  'kpi-sales': {
    default: 'from-blue-500 to-blue-600',
    good: 'from-blue-500 to-blue-600',
    neutral: 'from-slate-500 to-slate-600',
  },
  'kpi-quota': {
    default: 'from-emerald-500 to-emerald-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    danger: 'from-red-600 to-red-700',
    neutral: 'from-slate-500 to-slate-600',
  },
  'kpi-commission': {
    default: 'from-violet-500 to-violet-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
  },
  'kpi-overdue': {
    default: 'from-emerald-500 to-emerald-600',
    good: 'from-emerald-500 to-emerald-600',
    danger: 'from-red-600 to-red-700',
  },
};

function gradientClass(kpi: AgentDashboardKPI): string {
  const spec = GRADIENTS[kpi.id];
  if (!spec) return 'from-gray-500 to-gray-600';
  if (kpi.status === 'danger' && spec.danger) return spec.danger;
  if (kpi.status === 'warning' && spec.warning) return spec.warning;
  if (kpi.status === 'good' && spec.good) return spec.good;
  if (kpi.status === 'neutral' && spec.neutral) return spec.neutral;
  return spec.default;
}

function KpiIcon({ id }: { id: string }) {
  const cls = 'w-5 h-5 shrink-0 opacity-90';
  switch (id) {
    case 'kpi-sales':
      return <DollarSign className={cls} />;
    case 'kpi-quota':
      return <Target className={cls} />;
    case 'kpi-commission':
      return <Award className={cls} />;
    case 'kpi-overdue':
      return <AlertTriangle className={cls} />;
    default:
      return <ChevronRight className={cls} />;
  }
}

const CARD =
  'group relative block text-left rounded-xl p-4 shadow-sm bg-gradient-to-br text-white no-underline transition-all';
const CARD_LINK =
  'hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2';

export function AgentPersonalKpiStrip({ kpis }: { kpis: AgentDashboardKPI[] }): React.ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const clickable = Boolean(kpi.href);
        const className = `${CARD} ${gradientClass(kpi)} ${clickable ? CARD_LINK : 'cursor-default opacity-95'}`;

        const inner = (
          <>
            {clickable && (
              <span className="absolute top-3 right-3 flex items-center gap-0.5 text-white/70 group-hover:text-white transition-colors">
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
            <div className="flex items-center gap-2 mb-2 text-sm font-medium opacity-90 pr-8">
              <KpiIcon id={kpi.id} />
              <span className="leading-tight">{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
            {kpi.subtitle && (
              <p className="mt-1.5 text-xs text-white/80 line-clamp-2">{kpi.subtitle}</p>
            )}
          </>
        );

        if (clickable && kpi.href) {
          return (
            <Link key={kpi.id} to={kpi.href} className={className} title={kpi.label}>
              {inner}
            </Link>
          );
        }
        return (
          <div key={kpi.id} className={className} title={kpi.label}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
