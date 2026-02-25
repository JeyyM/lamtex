import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { useAppContext } from '@/src/store/AppContext';
import { format } from 'date-fns';

export function AuditLogsPage() {
  const { auditLogs } = useAppContext();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">System Audit Logs</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Entity</th>
                  <th className="px-6 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{log.user}</td>
                    <td className="px-6 py-4">
                      <Badge variant="neutral">{log.role}</Badge>
                    </td>
                    <td className="px-6 py-4 font-medium">{log.action}</td>
                    <td className="px-6 py-4 text-gray-500">{log.entity}</td>
                    <td className="px-6 py-4 text-gray-500">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
