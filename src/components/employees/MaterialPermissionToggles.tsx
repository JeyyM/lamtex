import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Box,
  ClipboardList,
  DollarSign,
  Download,
  Eye,
  FolderPlus,
  Loader2,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { cn } from '@/src/lib/utils';
import {
  MATERIAL_PERMISSIONS,
  type MaterialPermissionKey,
  type MaterialPermissionSet,
} from '@/src/lib/permissions/materialPermissions';
import { toggleMaterialPermission } from '@/src/lib/permissions/employeeMaterialPermissions';

const PERMISSION_ICONS: Record<MaterialPermissionKey, LucideIcon> = {
  pageAccess: Eye,
  stockAccess: Box,
  paymentData: DollarSign,
  categoryCreation: FolderPlus,
  exportAccess: Download,
  materialCreation: PlusCircle,
  purchaseOrdersHistory: ClipboardList,
  analyticsAccess: BarChart3,
};

export interface MaterialPermissionToggleGridProps {
  value: MaterialPermissionSet;
  onChange: (next: MaterialPermissionSet) => void;
  disabled?: boolean;
}

export function MaterialPermissionToggleGrid({ value, onChange, disabled }: MaterialPermissionToggleGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {MATERIAL_PERMISSIONS.map((def) => {
        const Icon = PERMISSION_ICONS[def.key];
        const on = value[def.key];
        return (
          <button
            key={def.key}
            type="button"
            disabled={disabled}
            title={def.description}
            aria-pressed={on}
            onClick={() => onChange(toggleMaterialPermission(value, def.key))}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-all min-h-[7.5rem]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
              disabled && 'opacity-50 cursor-not-allowed',
              on
                ? 'border-red-600 bg-red-50 text-red-800 shadow-sm'
                : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-gray-100',
            )}
          >
            <Icon className={cn('w-6 h-6', on ? 'text-red-600' : 'text-gray-400')} aria-hidden />
            <span className={cn('text-xs font-semibold leading-tight', on ? 'text-gray-900' : 'text-gray-500')}>
              {def.label}
            </span>
            <span
              className={cn(
                'text-[10px] font-medium uppercase tracking-wide',
                on ? 'text-red-600' : 'text-gray-400',
              )}
            >
              {on ? 'On' : 'Off'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface MaterialPermissionSectionProps {
  title?: string;
  description?: string;
  value: MaterialPermissionSet;
  savedValue: MaterialPermissionSet;
  onChange: (next: MaterialPermissionSet) => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
  loading?: boolean;
  dirty?: boolean;
  saveError?: string | null;
  saveSuccess?: boolean;
}

export function MaterialPermissionSection({
  title = 'Raw Materials',
  description = 'Control what this employee can see and do on the Raw Materials catalog, category, and detail pages.',
  value,
  savedValue,
  onChange,
  onSave,
  saving = false,
  loading = false,
  dirty,
  saveError,
  saveSuccess,
}: MaterialPermissionSectionProps) {
  const isDirty = dirty ?? JSON.stringify(value) !== JSON.stringify(savedValue);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="shrink-0"
          disabled={!isDirty || saving || loading}
          onClick={() => void onSave()}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Saving…
            </>
          ) : (
            'Save permissions'
          )}
        </Button>
      </div>
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin text-red-500" />
            Loading permissions…
          </div>
        ) : (
          <>
            <MaterialPermissionToggleGrid value={value} onChange={onChange} disabled={saving} />
            {saveError && <p className="mt-4 text-sm text-red-600">{saveError}</p>}
            {saveSuccess && !saveError && (
              <p className="mt-4 text-sm text-green-700">Permissions saved.</p>
            )}
            <p className="mt-4 text-xs text-gray-400">
              Executives always have full access regardless of these settings. Hover a tile for details.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
