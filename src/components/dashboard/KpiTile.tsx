import React from 'react';
import { Card, CardContent } from '@/src/components/ui/Card';
import { cn } from '@/src/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface KpiTileProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
  status?: 'good' | 'warning' | 'danger' | 'neutral';
  className?: string;
  onClick?: () => void;
}

export const KpiTile: React.FC<KpiTileProps> = ({ label, value, trend, trendUp, subtitle, status = 'neutral', onClick, className }) => {
  const statusColors = {
    good: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    danger: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  const statusBorder = {
    good: 'border-l-4 border-l-green-500',
    warning: 'border-l-4 border-l-yellow-500',
    danger: 'border-l-4 border-l-red-500',
    neutral: 'border-l-4 border-l-gray-300',
  };

  return (
    <Card 
      className={cn("hover:shadow-md transition-shadow cursor-pointer", statusBorder[status], className)} 
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {trend && (
            <div className={cn("flex items-center text-xs font-medium px-1.5 py-0.5 rounded", trendUp ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100")}>
              {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {trend}
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
        {subtitle && (
          <p className={cn("text-xs mt-1 font-medium", statusColors[status].split(' ')[0])}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
