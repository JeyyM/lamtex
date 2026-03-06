import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { CreateOrderModal } from '@/src/components/orders/CreateOrderModal';
import { getOrdersByBranch } from '@/src/mock/orders';
import { getCustomersByBranch } from '@/src/mock/customers';
import { useAppContext } from '@/src/store/AppContext';
import { OrderStatus } from '@/src/types/orders';
import {
  Search,
  Filter,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Package,
  FileText,
  XCircle,
  Edit2,
} from 'lucide-react';

type OrderTab = 'all' | 'draft' | 'pending' | 'approved' | 'intransit' | 'delivered' | 'rejected';

export function OrdersPage() {
  const navigate = useNavigate();
  const { branch, addAuditLog } = useAppContext();
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  
  const allOrders = getOrdersByBranch(branch);
  const customers = getCustomersByBranch(branch);

  const filteredOrders = allOrders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === 'all' ||
      (activeTab === 'draft' && order.status === 'Draft') ||
      (activeTab === 'pending' && order.status === 'Pending') ||
      (activeTab === 'approved' && ['Approved', 'Picking', 'Packed', 'Ready', 'Scheduled'].includes(order.status)) ||
      (activeTab === 'intransit' && order.status === 'In Transit') ||
      (activeTab === 'delivered' && ['Delivered', 'Completed'].includes(order.status)) ||
      (activeTab === 'rejected' && ['Rejected', 'Cancelled'].includes(order.status));
    
    return matchesSearch && matchesTab;
  });

  const getStatusBadgeVariant = (status: OrderStatus): 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral' | 'outline' | 'destructive' => {
    if (['Delivered', 'Completed', 'Approved'].includes(status)) return 'success';
    if (['Pending', 'Picking', 'Packed', 'Ready', 'Scheduled'].includes(status)) return 'warning';
    if (['Rejected', 'Cancelled'].includes(status)) return 'danger';
    if (status === 'In Transit') return 'info';
    if (status === 'Draft') return 'neutral';
    return 'default';
  };

  const getPaymentBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral' | 'outline' | 'destructive' => {
    if (status === 'Paid') return 'success';
    if (status === 'Overdue') return 'danger';
    if (['Partially Paid', 'Invoiced'].includes(status)) return 'warning';
    if (status === 'Unbilled') return 'neutral';
    return 'default';
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
    addAuditLog('Viewed Order', 'Order', `Viewed order ${orderId}`);
  };

  const handleCreateOrder = () => {
    setShowCreateModal(true);
  };

  const tabCounts = {
    all: allOrders.length,
    draft: allOrders.filter(o => o.status === 'Draft').length,
    pending: allOrders.filter(o => o.status === 'Pending').length,
    approved: allOrders.filter(o => ['Approved', 'Picking', 'Packed', 'Ready', 'Scheduled'].includes(o.status)).length,
    intransit: allOrders.filter(o => o.status === 'In Transit').length,
    delivered: allOrders.filter(o => ['Delivered', 'Completed'].includes(o.status)).length,
    rejected: allOrders.filter(o => ['Rejected', 'Cancelled'].includes(o.status)).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create, track, and manage customer orders</p>
        </div>
        <Button 
          variant="primary" 
          className="gap-2 w-full sm:w-auto" 
          onClick={handleCreateOrder}
        >
          <Plus className="w-4 h-4" />
          Create Order
        </Button>
      </div>

      {/* Tabs - Mobile Dropdown */}
      <div className="min-[700px]:hidden">
        <div className="relative">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as OrderTab)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none appearance-none bg-white"
          >
            <option value="all">All Orders ({tabCounts.all})</option>
            <option value="draft">Drafts ({tabCounts.draft})</option>
            <option value="pending">Pending ({tabCounts.pending})</option>
            <option value="approved">Approved ({tabCounts.approved})</option>
            <option value="intransit">In Transit ({tabCounts.intransit})</option>
            <option value="delivered">Delivered ({tabCounts.delivered})</option>
            <option value="rejected">Rejected ({tabCounts.rejected})</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs - Desktop Navigation */}
      <div className="hidden min-[700px]:block border-b border-gray-200">
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {[
            { key: 'all', label: 'All Orders', icon: FileText, group: 1 },
            { key: 'draft', label: 'Drafts', icon: Edit2, group: 1 },
            { key: 'pending', label: 'Pending', icon: Clock, group: 1 },
            { key: 'approved', label: 'Approved', icon: CheckCircle, group: 1 },
            { key: 'intransit', label: 'In Transit', icon: Truck, group: 2 },
            { key: 'delivered', label: 'Delivered', icon: Package, group: 2 },
            { key: 'rejected', label: 'Rejected', icon: XCircle, group: 2 },
          ].map(({ key, label, icon: Icon, group }, index, arr) => {
            const isLastInGroup1 = group === 1 && arr[index + 1]?.group === 2;
            return (
              <React.Fragment key={key}>
                <button
                  onClick={() => setActiveTab(key as OrderTab)}
                  className={`flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === key
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === key ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tabCounts[key as keyof typeof tabCounts]}
                  </span>
                </button>
                {isLastInGroup1 && <div className="max-[1399px]:basis-full max-[1399px]:h-0" />}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order # or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              More Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium hidden 2xl:table-cell">Order #</th>
                  <th className="px-6 py-3 text-left font-medium">Customer</th>
                  <th className="px-6 py-3 text-left font-medium max-[749px]:hidden min-[1350px]:hidden">Dates</th>
                  <th className="px-6 py-3 text-left font-medium min-[750px]:hidden">Amount & Dates</th>
                  <th className="px-6 py-3 text-left font-medium hidden min-[1350px]:table-cell">Order Date</th>
                  <th className="px-6 py-3 text-left font-medium hidden min-[1350px]:table-cell">Required Date</th>
                  <th className="px-6 py-3 text-left font-medium hidden min-[750px]:table-cell">Amount</th>
                  <th className="px-6 py-3 text-left font-medium min-[1200px]:hidden">Status & Payment</th>
                  <th className="px-6 py-3 text-left font-medium hidden min-[1200px]:table-cell">Status</th>
                  <th className="px-6 py-3 text-left font-medium hidden min-[1200px]:table-cell">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleViewOrder(order.id)}
                  >
                    <td className="px-6 py-4 hidden 2xl:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{order.id}</span>
                        {order.requiresApproval && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" title="Requires approval" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="2xl:hidden flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <span className="font-medium">{order.id}</span>
                          {order.requiresApproval && (
                            <AlertTriangle className="w-3 h-3 text-amber-500" title="Requires approval" />
                          )}
                        </div>
                        <div className="font-medium text-gray-900">{order.customer}</div>
                        <div className="text-xs text-gray-500">{order.agent}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-[749px]:hidden min-[1350px]:hidden">
                      <div>
                        <div className="text-gray-900 text-xs">
                          <span className="font-medium">Ordered:</span> {order.orderDate}
                        </div>
                        <div className="text-gray-900 text-xs mt-1">
                          <span className="font-medium">Required:</span> {order.requiredDate}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 min-[750px]:hidden">
                      <div className="space-y-2">
                        <div>
                          <div className="font-semibold text-gray-900 text-base">₱{order.totalAmount.toLocaleString()}</div>
                          {order.discountPercent > 0 && (
                            <div className="text-xs text-gray-500">-{order.discountPercent.toFixed(1)}% discount</div>
                          )}
                        </div>
                        <div className="pt-1 border-t border-gray-100">
                          <div className="text-gray-900 text-xs">
                            <span className="font-medium">Ordered:</span> {order.orderDate}
                          </div>
                          <div className="text-gray-900 text-xs mt-1">
                            <span className="font-medium">Required:</span> {order.requiredDate}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 hidden min-[1350px]:table-cell">{order.orderDate}</td>
                    <td className="px-6 py-4 text-gray-600 hidden min-[1350px]:table-cell">{order.requiredDate}</td>
                    <td className="px-6 py-4 hidden min-[750px]:table-cell">
                      <div className="font-medium text-gray-900">₱{order.totalAmount.toLocaleString()}</div>
                      {order.discountPercent > 0 && (
                        <div className="text-xs text-gray-500">-{order.discountPercent.toFixed(1)}% discount</div>
                      )}
                    </td>
                    <td className="px-6 py-4 min-[1200px]:hidden">
                      <div className="space-y-1.5">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Status</div>
                          <Badge variant={getStatusBadgeVariant(order.status)} className="min-w-[120px] justify-center">
                            {order.status}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Payment</div>
                          <Badge variant={getPaymentBadgeVariant(order.paymentStatus)} className="min-w-[100px] justify-center">
                            {order.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden min-[1200px]:table-cell">
                      <Badge variant={getStatusBadgeVariant(order.status)} className="min-w-[120px] justify-center">
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 hidden min-[1200px]:table-cell">
                      <Badge variant={getPaymentBadgeVariant(order.paymentStatus)} className="min-w-[100px] justify-center">
                        {order.paymentStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No orders found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or create a new order</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal
          customerId={selectedCustomer?.id}
          customerName={selectedCustomer?.name}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedCustomer(null);
            addAuditLog('Created Order', 'Order', 'Created new order');
          }}
        />
      )}
    </div>
  );
}
