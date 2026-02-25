import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { ApprovalOrder } from '@/src/types/executive';
import { useAppContext } from '@/src/store/AppContext';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ApprovalsTableProps {
  orders: ApprovalOrder[];
}

export function ApprovalsTable({ orders }: ApprovalsTableProps) {
  const { addAuditLog } = useAppContext();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const handleApprove = (id: string) => {
    addAuditLog('Approved Order', 'Order', `Approved order ${id}`);
    alert(`Order ${id} approved.`);
  };

  const handleReject = (id: string) => {
    const reason = prompt('Please enter a reason for rejection:');
    if (reason) {
      addAuditLog('Rejected Order', 'Order', `Rejected order ${id}. Reason: ${reason}`);
      alert(`Order ${id} rejected.`);
    }
  };

  const handleBulkApprove = () => {
    if (selectedOrders.length === 0) return;
    if (confirm(`Are you sure you want to approve ${selectedOrders.length} orders?`)) {
      addAuditLog('Bulk Approved Orders', 'Order', `Approved ${selectedOrders.length} orders: ${selectedOrders.join(', ')}`);
      alert(`Successfully approved ${selectedOrders.length} orders.`);
      setSelectedOrders([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(oId => oId !== id) : [...prev, id]
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Priority Action Center: Approvals</CardTitle>
        {selectedOrders.length > 0 && (
          <Button variant="primary" size="sm" className="gap-2" onClick={handleBulkApprove}>
            <Check className="w-4 h-4" />
            Bulk Approve ({selectedOrders.length})
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    onChange={(e) => setSelectedOrders(e.target.checked ? orders.map(o => o.id) : [])}
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Summary</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Margin</th>
                <th className="px-4 py-3 font-medium">Req. Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-900">{order.orderNumber}</td>
                  <td className="px-4 py-4">
                    <div>{order.customer}</div>
                    <div className="text-xs text-gray-500">{order.agent}</div>
                  </td>
                  <td className="px-4 py-4">{order.branch}</td>
                  <td className="px-4 py-4 text-gray-600">{order.productsSummary}</td>
                  <td className="px-4 py-4 font-medium">₱{order.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-4">
                    <span className={order.requestedDiscount > 10 ? 'text-red-600 font-medium' : ''}>
                      {order.requestedDiscount}%
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={order.marginImpact === 'Green' ? 'success' : order.marginImpact === 'Yellow' ? 'warning' : 'danger'}>
                      {order.marginImpact}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{order.requestedDeliveryDate}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleReject(order.id)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => handleApprove(order.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
