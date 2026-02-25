import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { MOCK_ORDERS } from '@/src/mock/seed';
import { useAppContext } from '@/src/store/AppContext';
import { Search, Filter, Plus } from 'lucide-react';

export function OrdersPage() {
  const { branch, addAuditLog } = useAppContext();

  const filteredOrders = MOCK_ORDERS.filter(o => branch === 'All' || o.branch === branch);

  const handleViewOrder = (orderId: string) => {
    addAuditLog('Viewed Order', 'Order', `Viewed details for order ${orderId}`);
    alert(`Viewing order ${orderId} (Audit log added)`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Button variant="primary" className="gap-2">
          <Plus className="w-4 h-4" />
          Create Order
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search orders..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Order #</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Branch</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Payment</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{order.id}</td>
                    <td className="px-6 py-4">{order.customer}</td>
                    <td className="px-6 py-4">{order.branch}</td>
                    <td className="px-6 py-4">{order.orderDate}</td>
                    <td className="px-6 py-4 font-medium">₱{order.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <Badge variant={order.status === 'Pending Approval' ? 'warning' : order.status === 'Ready' ? 'success' : 'neutral'}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={order.paymentStatus === 'Paid' ? 'success' : 'neutral'}>
                        {order.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order.id)}>View</Button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No orders found for this branch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

