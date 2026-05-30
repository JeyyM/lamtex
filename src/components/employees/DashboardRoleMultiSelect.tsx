import React from 'react';
import { Star, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  ASSIGNABLE_DASHBOARD_ROLES,
  type AssignableDashboardRole,
} from '@/src/lib/permissions/roleDefaultPermissions';

export type DashboardRoleAssignment = {
  roles: AssignableDashboardRole[];
  primaryRole: AssignableDashboardRole | null;
};

type Props = {
  value: DashboardRoleAssignment;
  onChange: (next: DashboardRoleAssignment) => void;
  disabled?: boolean;
};

export function DashboardRoleMultiSelect({ value, onChange, disabled }: Props) {
  const available = ASSIGNABLE_DASHBOARD_ROLES.filter((r) => !value.roles.includes(r));

  const addRole = (role: AssignableDashboardRole) => {
    if (value.roles.includes(role)) return;
    const roles = [...value.roles, role];
    onChange({
      roles,
      primaryRole: value.primaryRole || role,
    });
  };

  const removeRole = (role: AssignableDashboardRole) => {
    const roles = value.roles.filter((r) => r !== role);
    let primaryRole = value.primaryRole;
    if (primaryRole === role) primaryRole = roles[0] ?? null;
    onChange({ roles, primaryRole });
  };

  const setPrimary = (role: AssignableDashboardRole) => {
    if (!value.roles.includes(role)) return;
    onChange({ ...value, primaryRole: role });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[2.25rem]">
        {value.roles.length === 0 ? (
          <span className="text-sm text-gray-400">No roles selected</span>
        ) : (
          value.roles.map((role) => {
            const isPrimary = value.primaryRole === role;
            return (
              <span
                key={role}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium',
                  isPrimary
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-gray-200 bg-gray-50 text-gray-800',
                )}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setPrimary(role)}
                  title={isPrimary ? 'Main dashboard role' : 'Set as main role'}
                  className={cn(
                    'p-0.5 rounded-full transition-colors',
                    isPrimary ? 'text-amber-600' : 'text-gray-400 hover:text-amber-600',
                    disabled && 'opacity-50 cursor-not-allowed',
                  )}
                  aria-label={isPrimary ? `${role} is main role` : `Set ${role} as main role`}
                  aria-pressed={isPrimary}
                >
                  <Star className={cn('w-3.5 h-3.5', isPrimary && 'fill-current')} />
                </button>
                {role}
                {isPrimary ? (
                  <span className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Main</span>
                ) : null}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeRole(role)}
                  className={cn(
                    'p-0.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors',
                    (disabled) && 'opacity-40 cursor-not-allowed',
                  )}
                  aria-label={`Remove ${role}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            );
          })
        )}
      </div>

      {available.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Add role:</span>
          {available.map((role) => (
            <button
              key={role}
              type="button"
              disabled={disabled}
              onClick={() => addRole(role)}
              className="text-xs font-medium px-2.5 py-1 rounded-lg border border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              + {role}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-gray-500">
        Star marks the main dashboard role. Permissions from all selected roles are combined.
      </p>
    </div>
  );
}
