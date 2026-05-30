/** Agent Analytics module permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type AgentAnalyticsPermissionKey = 'pageAccess';

export interface AgentAnalyticsPermissionDef {
  key: AgentAnalyticsPermissionKey;
  label: string;
  description: string;
}

export const AGENT_ANALYTICS_PERMISSIONS: readonly AgentAnalyticsPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'Open the Agent Analytics page (leaderboards, branch comparison, quotas, trends).',
  },
] as const;

export type AgentAnalyticsPermissionSet = Record<AgentAnalyticsPermissionKey, boolean>;

export const ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED: AgentAnalyticsPermissionSet =
  AGENT_ANALYTICS_PERMISSIONS.reduce(
    (acc, def) => {
      acc[def.key] = true;
      return acc;
    },
    {} as AgentAnalyticsPermissionSet,
  );

export function useAgentAnalyticsPermissions(): AgentAnalyticsPermissionSet {
  const { isExecutiveUser, agentAnalyticsPermissions } = useAppContext();
  return useMemo<AgentAnalyticsPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED };
    if (agentAnalyticsPermissions) return agentAnalyticsPermissions;
    return { ...ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, agentAnalyticsPermissions]);
}
