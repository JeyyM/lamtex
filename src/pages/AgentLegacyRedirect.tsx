import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/** Redirects legacy `/agents/:agentId` to the employee profile page. */
export function AgentLegacyRedirect() {
  const { agentId } = useParams<{ agentId: string }>();
  if (!agentId?.trim()) {
    return <Navigate to="/agents" replace />;
  }
  return <Navigate to={`/employees/${encodeURIComponent(agentId)}`} replace />;
}
