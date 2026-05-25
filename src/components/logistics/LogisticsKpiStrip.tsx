import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Calendar,
  Package,
  Truck,
  User,
  CheckCircle,
  AlertTriangle,
  Wrench,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { LogisticsKPI } from '@/src/lib/logisticsDashboard';

interface Props {
  kpis: LogisticsKPI[];
}

type GradientSpec = {
  default: string;
  good?: string;
  warning?: string;
  danger?: string;
  neutral?: string;
};

const GRADIENTS: Record<string, GradientSpec> = {
  'kpi-active-trips': {
    default: 'from-blue-500 to-blue-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
  },
  'kpi-week': { default: 'from-slate-500 to-slate-600', neutral: 'from-slate-500 to-slate-600' },
  'kpi-orders': {
    default: 'from-emerald-500 to-emerald-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
  },
  'kpi-fleet': {
    default: 'from-indigo-500 to-indigo-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    danger: 'from-red-600 to-red-700',
  },
  'kpi-drivers': {
    default: 'from-violet-500 to-violet-600',
    good: 'from-emerald-500 to-emerald-600',
    danger: 'from-red-600 to-red-700',
  },
  'kpi-on-time': {
    default: 'from-teal-500 to-teal-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    danger: 'from-red-500 to-red-600',
  },
  'kpi-delays': {
    default: 'from-emerald-500 to-emerald-600',
    good: 'from-emerald-500 to-emerald-600',
    danger: 'from-red-600 to-red-700',
  },
  'kpi-maintenance': {
    default: 'from-orange-500 to-orange-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
  },
};

function gradientClass(kpi: LogisticsKPI): string {
  const spec = GRADIENTS[kpi.id];
  if (!spec) return 'from-gray-500 to-gray-600';
  if (kpi.status === 'danger' && spec.danger) return spec.danger;
  if (kpi.status === 'warning' && spec.warning) return spec.warning;
  if (kpi.status === 'good' && spec.good) return spec.good;
  if (kpi.status === 'neutral' && spec.neutral) return spec.neutral;
  return spec.default;
}

function KpiIcon(props: { id: string }) {
  const cls = 'w-5 h-5 shrink-0 opacity-90';
  switch (props.id) {
    case 'kpi-active-trips':
      return <Activity className={cls} />;
    case 'kpi-week':
      return <Calendar className={cls} />;
    case 'kpi-orders':
      return <Package className={cls} />;
    case 'kpi-fleet':
      return <Truck className={cls} />;
    case 'kpi-drivers':
      return <User className={cls} />;
    case 'kpi-on-time':
      return <CheckCircle className={cls} />;
    case 'kpi-delays':
      return <AlertTriangle className={cls} />;
    case 'kpi-maintenance':
      return <Wrench className={cls} />;
    default:
      return <ChevronRight className={cls} />;
  }
}

const CARD_CLASS =
  'group relative block text-left rounded-xl p-4 shadow-sm bg-gradient-to-br text-white no-underline transition-all';

const CARD_INTERACTIVE_CLASS =
  'hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2';

function KpiCardContent(props: { kpi: LogisticsKPI; clickable: boolean }) {
  const { kpi, clickable } = props;
  return (
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
}

export function LogisticsKpiStrip({ kpis }: Props): React.ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi) => {
        const clickable = Boolean(kpi.href);
        const className = `${CARD_CLASS} ${gradientClass(kpi)} ${
          clickable ? CARD_INTERACTIVE_CLASS : 'cursor-default opacity-95'
        }`;

        if (clickable && kpi.href) {
          return (
            <Link
              key={kpi.id}
              to={kpi.href}
              title={`${kpi.label} — right-click or Ctrl+click to open in new tab`}
              className={className}
            >
              <KpiCardContent kpi={kpi} clickable />
            </Link>
          );
        }

        return (
          <div key={kpi.id} className={className} title={kpi.label}>
            <KpiCardContent kpi={kpi} clickable={false} />
          </div>
        );
      })}
    </div>
  );
}
