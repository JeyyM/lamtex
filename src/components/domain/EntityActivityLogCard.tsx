import React from 'react';
import {
  Clock,
  User,
  FileText,
  Plus,
  Trash2,
  Image as ImageIcon,
  Package,
  DollarSign,
  Layers,
  RefreshCw,
  ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { entityLogCardHeadline, EntityActivityLogHumanDetails } from '@/src/components/domain/EntityActivityLogHuman';

export type EntityActivityLogRow = {
  id: string;
  action: string;
  description: string | null;
  performed_by: string | null;
  performed_by_role: string | null;
  created_at: string;
  old_value?: unknown;
  new_value?: unknown;
  metadata?: unknown;
};

function getEntityActionIcon(action: string) {
  switch (action) {
    case 'material_created':
    case 'product_created':
    case 'variant_created':
      return <Plus className="w-4 h-4" />;
    case 'material_deleted':
    case 'product_deleted':
    case 'variant_deleted':
      return <Trash2 className="w-4 h-4" />;
    case 'material_updated':
    case 'product_updated':
    case 'variant_updated':
      return <FileText className="w-4 h-4" />;
    case 'stock_adjusted':
      return <Package className="w-4 h-4" />;
    case 'cost_synced_from_po':
      return <DollarSign className="w-4 h-4" />;
    case 'images_updated':
      return <ImageIcon className="w-4 h-4" />;
    case 'status_synced':
      return <RefreshCw className="w-4 h-4" />;
    default:
      if (action.includes('variant')) return <Layers className="w-4 h-4" />;
      if (action.includes('creat')) return <Plus className="w-4 h-4" />;
      if (action.includes('delet')) return <Trash2 className="w-4 h-4" />;
      if (action.includes('stock') || action.includes('adjust')) return <Package className="w-4 h-4" />;
      if (action.includes('cost') || action.includes('price') || action.includes('sync')) return <DollarSign className="w-4 h-4" />;
      if (action.includes('image')) return <ImageIcon className="w-4 h-4" />;
      return <ClipboardList className="w-4 h-4" />;
  }
}

function getEntityActionColor(action: string) {
  switch (action) {
    case 'material_created':
    case 'product_created':
    case 'variant_created':
      return 'text-green-600 bg-green-50';
    case 'material_deleted':
    case 'product_deleted':
    case 'variant_deleted':
      return 'text-red-600 bg-red-50';
    case 'cost_synced_from_po':
      return 'text-violet-600 bg-violet-50';
    case 'stock_adjusted':
      return 'text-emerald-600 bg-emerald-50';
    case 'images_updated':
      return 'text-blue-600 bg-blue-50';
    case 'status_synced':
      return 'text-amber-600 bg-amber-50';
    case 'material_updated':
    case 'product_updated':
    case 'variant_updated':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

function roleBadgeColor(role: string) {
  switch (role) {
    case 'Agent':
      return 'bg-blue-100 text-blue-800';
    case 'Manager':
      return 'bg-purple-100 text-purple-800';
    case 'Warehouse Staff':
      return 'bg-orange-100 text-orange-800';
    case 'Logistics':
      return 'bg-green-100 text-green-800';
    case 'Admin':
      return 'bg-red-100 text-red-800';
    case 'System':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function EntityActivityLogCard({
  title = 'Activity log',
  logs,
  emptyHint = 'No activity recorded yet.',
}: {
  title?: string;
  logs: EntityActivityLogRow[];
  emptyHint?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">{emptyHint}</p>
          ) : (
            logs.map((log, index) => {
              const isLast = index === logs.length - 1;
              const t = new Date(log.created_at);
              const timeStr = t.toLocaleString('en-PH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });
              const roleLabel =
                log.performed_by_role === 'Admin' ? 'Executive' : log.performed_by_role ?? '';
              const headline = entityLogCardHeadline(log);
              return (
                <div key={log.id} className="relative pl-8 pb-3">
                  {!isLast && (
                    <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" aria-hidden />
                  )}
                  <div
                    className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${getEntityActionColor(log.action)}`}
                  >
                    {getEntityActionIcon(log.action)}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 flex-1 leading-snug">{headline}</p>
                      {roleLabel ? (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${roleBadgeColor(log.performed_by_role ?? '')}`}
                        >
                          {roleLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 mb-1">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium text-gray-700">{log.performed_by ?? '—'}</span>
                      <span>· {timeStr}</span>
                    </div>
                    <EntityActivityLogHumanDetails log={log} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
