import React from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { ArrowUpRight, TrendingUp, AlertCircle, Clock, Package, DollarSign } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { ExecutiveDashboard } from './ExecutiveDashboard';

export function Dashboard() {
  const { role, branch } = useAppContext();

  // Render different dashboards based on role
  if (role === 'Executive') return <ExecutiveDashboard />;
  if (role === 'Warehouse') return <WarehouseDashboard branch={branch} />;
  if (role === 'Logistics') return <LogisticsDashboard branch={branch} />;
  if (role === 'Agent') return <AgentDashboard branch={branch} />;
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{role} Dashboard</h1>
      <p className="text-gray-500">Welcome to the {role} view for {branch}.</p>
    </div>
  );
}

function WarehouseDashboard({ branch }: { branch: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Warehouse Operations - {branch}</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="To Pick" value="45" />
        <KPICard title="Picking" value="12" />
        <KPICard title="Ready for Dispatch" value="28" status="good" />
        <KPICard title="Blocked / Shortage" value="3" status="danger" />
      </div>
      {/* Kanban placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Fulfillment Queue</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
             Kanban Board Placeholder
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LogisticsDashboard({ branch }: { branch: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Logistics & Dispatch - {branch}</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Scheduled Trips" value="8" />
        <KPICard title="In Transit" value="5" />
        <KPICard title="Delayed" value="1" status="warning" />
        <KPICard title="Available Trucks" value="2/6" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Live Delivery Tracker</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
             Map / Tracker Placeholder
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentDashboard({ branch }: { branch: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Sales Workspace</h1>
        <Button variant="primary">Create Order</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Sales This Month" value="₱1.2M" subtitle="80% of quota" />
        <KPICard title="Orders Created" value="24" />
        <KPICard title="Collections" value="₱800K" />
        <KPICard title="Overdue Accounts" value="3" status="warning" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My Customers (At Risk)</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
             Customer List Placeholder
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ title, value, subtitle, trend, trendUp, status, icon: Icon }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          </div>
          {Icon && (
            <div className={cn("p-2 rounded-lg", 
              status === 'danger' ? 'bg-red-50 text-red-600' : 
              status === 'warning' ? 'bg-yellow-50 text-yellow-600' : 
              'bg-gray-50 text-gray-600'
            )}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        {(trend || subtitle) && (
          <div className="mt-4 flex items-center text-sm">
            {trend && (
              <span className={cn("flex items-center font-medium mr-2", trendUp ? "text-green-600" : "text-red-600")}>
                {trendUp ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1 rotate-180" />}
                {trend}
              </span>
            )}
            <span className="text-gray-500">{subtitle || 'vs last month'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
