import React from 'react';
import { Card, CardContent } from '@/src/components/ui/Card';
import { cn } from '@/src/lib/utils';

export type StatKpiTone =
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'teal'
  | 'rose'
  | 'indigo'
  | 'orange'
  | 'cyan'
  | 'fuchsia';

const TONE_STYLES: Record<
  StatKpiTone,
  { card: string; icon: string; label: string }
> = {
  blue: {
    card: 'border-blue-100/80 bg-gradient-to-br from-blue-50 via-white to-white',
    icon: 'bg-blue-100 text-blue-600',
    label: 'text-blue-800/70',
  },
  emerald: {
    card: 'border-emerald-100/80 bg-gradient-to-br from-emerald-50 via-white to-white',
    icon: 'bg-emerald-100 text-emerald-600',
    label: 'text-emerald-800/70',
  },
  violet: {
    card: 'border-violet-100/80 bg-gradient-to-br from-violet-50 via-white to-white',
    icon: 'bg-violet-100 text-violet-600',
    label: 'text-violet-800/70',
  },
  amber: {
    card: 'border-amber-100/80 bg-gradient-to-br from-amber-50 via-white to-white',
    icon: 'bg-amber-100 text-amber-600',
    label: 'text-amber-800/70',
  },
  teal: {
    card: 'border-teal-100/80 bg-gradient-to-br from-teal-50 via-white to-white',
    icon: 'bg-teal-100 text-teal-600',
    label: 'text-teal-800/70',
  },
  rose: {
    card: 'border-rose-100/80 bg-gradient-to-br from-rose-50 via-white to-white',
    icon: 'bg-rose-100 text-rose-600',
    label: 'text-rose-800/70',
  },
  indigo: {
    card: 'border-indigo-100/80 bg-gradient-to-br from-indigo-50 via-white to-white',
    icon: 'bg-indigo-100 text-indigo-600',
    label: 'text-indigo-800/70',
  },
  orange: {
    card: 'border-orange-100/80 bg-gradient-to-br from-orange-50 via-white to-white',
    icon: 'bg-orange-100 text-orange-600',
    label: 'text-orange-800/70',
  },
  cyan: {
    card: 'border-cyan-100/80 bg-gradient-to-br from-cyan-50 via-white to-white',
    icon: 'bg-cyan-100 text-cyan-600',
    label: 'text-cyan-800/70',
  },
  fuchsia: {
    card: 'border-fuchsia-100/80 bg-gradient-to-br from-fuchsia-50 via-white to-white',
    icon: 'bg-fuchsia-100 text-fuchsia-600',
    label: 'text-fuchsia-800/70',
  },
};

/** Cycle tones for grids when not assigned explicitly. */
export const STAT_KPI_TONES: StatKpiTone[] = [
  'blue',
  'emerald',
  'violet',
  'amber',
  'teal',
  'rose',
  'indigo',
  'orange',
];

export function statKpiToneAt(index: number): StatKpiTone {
  return STAT_KPI_TONES[index % STAT_KPI_TONES.length];
}

export interface StatKpiCardProps {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone?: StatKpiTone;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatKpiCard(props: StatKpiCardProps): React.ReactElement {
  const clickable = Boolean(props.onClick);
  const tone = props.tone ?? 'blue';
  const styles = TONE_STYLES[tone];

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow',
        styles.card,
        clickable && 'cursor-pointer hover:shadow-md',
        props.className,
      )}
      onClick={props.onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                props.onClick?.();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-[11px] sm:text-xs uppercase tracking-wider font-semibold',
                styles.label,
              )}
            >
              {props.label}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">
              {props.loading ? '…' : props.value}
            </p>
            {props.sub != null && props.sub !== '' && (
              <div className="text-xs text-gray-500 mt-1.5">{props.sub}</div>
            )}
          </div>
          <div
            className={cn(
              'p-2.5 rounded-xl shrink-0 [&>svg]:w-5 [&>svg]:h-5',
              styles.icon,
            )}
          >
            {props.icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
