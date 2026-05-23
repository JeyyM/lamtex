import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  AlertTriangle,
  PackageCheck,
  Truck,
  Repeat,
  Factory,
  ClipboardList,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { WarehouseKPI } from '@/src/lib/warehouseDashboard';

interface Props {
  kpis: WarehouseKPI[];
}

type GradientSpec = {
  default: string;
  good?: string;
  warning?: string;
  danger?: string;
  neutral?: string;
};

const GRADIENTS: Record<string, GradientSpec> = {
  'kpi-catalog': { default: 'from-slate-500 to-slate-600', neutral: 'from-slate-500 to-slate-600' },
  'kpi-stockouts': {
    default: 'from-emerald-500 to-emerald-600',
    good: 'from-emerald-500 to-emerald-600',
    danger: 'from-red-600 to-red-700',
  },
  'kpi-low-stock': {
    default: 'from-emerald-500 to-emerald-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
  },
  'kpi-incoming-po': {
    default: 'from-blue-500 to-blue-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-blue-500 to-blue-600',
  },
  'kpi-orders-pipeline': {
    default: 'from-teal-500 to-teal-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
  },
  'kpi-ibrs': {
    default: 'from-violet-500 to-violet-600',
    good: 'from-emerald-500 to-emerald-600',
    warning: 'from-violet-500 to-violet-600',
  },
  'kpi-my-prs': { default: 'from-orange-500 to-orange-600', neutral: 'from-orange-500 to-orange-600' },
  'kpi-my-pos': { default: 'from-indigo-500 to-indigo-600', neutral: 'from-indigo-500 to-indigo-600' },
};

function gradientClass(kpi: WarehouseKPI): string {
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
    case 'kpi-catalog':
      return <Box className={cls} />;
    case 'kpi-stockouts':
    case 'kpi-low-stock':
      return <AlertTriangle className={cls} />;
    case 'kpi-incoming-po':
      return <PackageCheck className={cls} />;
    case 'kpi-orders-pipeline':
      return <Truck className={cls} />;
    case 'kpi-ibrs':
      return <Repeat className={cls} />;
    case 'kpi-my-prs':
      return <Factory className={cls} />;
    case 'kpi-my-pos':
      return <ClipboardList className={cls} />;
    default:
      return <ChevronRight className={cls} />;
  }
}

const CARD_CLASS =
  'group relative block text-left rounded-xl p-4 shadow-sm bg-gradient-to-br text-white no-underline transition-all';

const CARD_INTERACTIVE_CLASS =
  'hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2';

function KpiCardContent(props: { kpi: WarehouseKPI; clickable: boolean }) {
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

export function WarehouseKpiStrip({ kpis }: Props): React.ReactElement {
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
