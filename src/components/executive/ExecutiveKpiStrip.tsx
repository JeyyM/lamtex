import React from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  Factory,
  Wallet,
  Award,
  AlertTriangle,
  Truck,
  Target,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { ExecutiveKPI } from '@/src/lib/executiveDashboard';

interface Props {
  kpis: ExecutiveKPI[];
}

type GradientSpec = {
  default: string;
  good?: string;
  warning?: string;
  danger?: string;
};

const GRADIENTS: Record<string, GradientSpec> = {
  'kpi-revenue-mtd': { default: 'from-blue-500 to-blue-600' },
  'kpi-pending-orders': {
    default: 'from-slate-500 to-slate-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
  },
  'kpi-pending-procurement': {
    default: 'from-slate-500 to-slate-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-orange-500 to-orange-600',
  },
  'kpi-receivables': {
    default: 'from-rose-500 to-rose-600',
    good: 'from-emerald-500 to-emerald-600',
    danger: 'from-red-600 to-red-700',
  },
  'kpi-commissions': {
    default: 'from-violet-500 to-violet-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-orange-500 to-orange-600',
  },
  'kpi-low-stock': {
    default: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
  },
  'kpi-delivery': {
    default: 'from-teal-500 to-teal-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    danger: 'from-red-500 to-red-600',
  },
  'kpi-aov': { default: 'from-indigo-500 to-indigo-600' },
};

function gradientClass(kpi: ExecutiveKPI): string {
  const spec = GRADIENTS[kpi.id];
  if (!spec) return 'from-gray-500 to-gray-600';
  if (kpi.status === 'danger' && spec.danger) return spec.danger;
  if (kpi.status === 'warning' && spec.warning) return spec.warning;
  if (kpi.status === 'good' && spec.good) return spec.good;
  return spec.default;
}

function KpiIcon(props: { id: string }) {
  const cls = 'w-5 h-5 shrink-0 opacity-90';
  switch (props.id) {
    case 'kpi-revenue-mtd':
      return <DollarSign className={cls} />;
    case 'kpi-pending-orders':
      return <ShoppingCart className={cls} />;
    case 'kpi-pending-procurement':
      return <Factory className={cls} />;
    case 'kpi-receivables':
      return <Wallet className={cls} />;
    case 'kpi-commissions':
      return <Award className={cls} />;
    case 'kpi-low-stock':
      return <AlertTriangle className={cls} />;
    case 'kpi-delivery':
      return <Truck className={cls} />;
    case 'kpi-aov':
      return <Target className={cls} />;
    default:
      return <ChevronRight className={cls} />;
  }
}

function TrendLine(props: { trend?: string; trendUp?: boolean }) {
  if (!props.trend) return null;
  const up = props.trendUp === true;
  const down = props.trendUp === false;
  return (
    <div className="mt-2 flex items-center gap-1 text-xs text-white/90">
      {up && <TrendingUp className="w-3.5 h-3.5 text-green-100" />}
      {down && <TrendingDown className="w-3.5 h-3.5 text-red-100" />}
      {!up && !down && props.trendUp == null && null}
      <span>{props.trend}</span>
    </div>
  );
}

const CARD_CLASS =
  'group relative block text-left rounded-xl p-4 shadow-sm bg-gradient-to-br text-white no-underline transition-all';

const CARD_INTERACTIVE_CLASS =
  'hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2';

function KpiCardContent(props: { kpi: ExecutiveKPI; clickable: boolean }) {
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

      <TrendLine trend={kpi.trend} trendUp={kpi.trendUp} />
    </>
  );
}

export function ExecutiveKpiStrip({ kpis }: Props): React.ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
