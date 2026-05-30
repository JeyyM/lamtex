import { supabase } from '@/src/lib/supabase';
import { resolveEmployeePermissionsWithRoleFallback } from './employeePermissionRoleFallback';
import {
  ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED,
  AGENT_ANALYTICS_PERMISSIONS,
  type AgentAnalyticsPermissionKey,
  type AgentAnalyticsPermissionSet,
} from './agentAnalyticsPermissions';

const PERMISSION_KEYS = AGENT_ANALYTICS_PERMISSIONS.map((p) => p.key);

export function normalizeAgentAnalyticsPermissionSet(raw: unknown): AgentAnalyticsPermissionSet {
  const base = { ...ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function agentAnalyticsPermissionSetsEqual(
  a: AgentAnalyticsPermissionSet,
  b: AgentAnalyticsPermissionSet,
): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeAgentAnalyticsPermissionSet(
  permissions: AgentAnalyticsPermissionSet,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeAgentAnalyticsPermissions(
  employeeId: string,
): Promise<AgentAnalyticsPermissionSet> {
  return resolveEmployeePermissionsWithRoleFallback(
    employeeId,
    'employee_agent_analytics_permissions',
    normalizeAgentAnalyticsPermissionSet,
    { ...ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED },
    (merged) => merged.agentAnalytics,
  );
}

export async function saveEmployeeAgentAnalyticsPermissions(
  employeeId: string,
  permissions: AgentAnalyticsPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_agent_analytics_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeAgentAnalyticsPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleAgentAnalyticsPermission(
  current: AgentAnalyticsPermissionSet,
  key: AgentAnalyticsPermissionKey,
): AgentAnalyticsPermissionSet {
  return { ...current, [key]: !current[key] };
}
