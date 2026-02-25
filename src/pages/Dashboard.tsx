import React from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { WarehouseDashboard } from './WarehouseDashboard';
import { LogisticsDashboard } from './LogisticsDashboard';
import { AgentDashboard } from './AgentDashboard';

export function Dashboard() {
  const { role, branch } = useAppContext();

  // Render different dashboards based on role
  if (role === 'Executive') return <ExecutiveDashboard />;
  if (role === 'Warehouse') return <WarehouseDashboard />;
  if (role === 'Logistics') return <LogisticsDashboard />;
  if (role === 'Agent') return <AgentDashboard />;
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{role} Dashboard</h1>
      <p className="text-gray-500">Welcome to the {role} view for {branch}.</p>
    </div>
  );
}

