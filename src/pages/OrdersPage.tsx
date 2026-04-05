import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { CreateOrderModal } from '@/src/components/orders/CreateOrderModal';
import { ProofOfDeliveryModal } from '@/src/components/orders/ProofOfDeliveryModal';
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
  Camera,
  MapPin,
  Calendar,
} from 'lucide-react';

type OrderTab = 'all' | 'draft' | 'pending' | 'approved' | 'intransit' | 'delivered' | 'rejected';

export function OrdersPage() {
  const navigate = useNavigate();
  const { branch, addAuditLog, role } = useAppContext();
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<{ id: string; customer: string } | null>(null);
  
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

  const handleSendProof = (orderId: string, customer: string) => {
    setSelectedOrderForProof({ id: orderId, customer });
    setShowProofModal(true);
  };

  const handleProofSubmit = (orderId: string, imageFile: File) => {
    // Mock handling - in real app would upload to server
    console.log('Proof of delivery uploaded for order:', orderId, imageFile.name);
    addAuditLog('Uploaded Proof of Delivery', 'Order', `Uploaded delivery proof for order ${orderId}`);
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

  // Driver Simplified View
  if (role === 'Driver') {
    // Filter only In Transit and Delivered orders for drivers
    const driverOrders = allOrders.filter(order => 
      order.status === 'In Transit' || ['Delivered', 'Completed'].includes(order.status)
    ).filter(order => 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
          <p className="text-sm text-gray-500 mt-1">Track and complete your assigned deliveries</p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Delivery Cards */}
        <div className="grid gap-4">
          {driverOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">Order #{order.id}</h3>
                        <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs">
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">Customer: {order.customer}</p>
                    </div>
                    {order.status === 'In Transit' && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="gap-2 flex-shrink-0"
                        onClick={() => handleSendProof(order.id, order.customer)}
                      >
                        <Camera className="w-4 h-4" />
                        Send Proof
                      </Button>
                    )}
                  </div>

                  {/* Delivery Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">Delivery Address</p>
                        <p className="text-sm font-medium text-gray-900 break-words">
                          See customer details
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">Required Date</p>
                        <p className="text-sm font-medium text-gray-900">{order.requiredDate}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">Order Items</p>
                        <p className="text-sm font-medium text-gray-900">
                          {order.items?.length || 0} items
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 flex-1 sm:flex-initial"
                      onClick={() => handleViewOrder(order.id)}
                    >
                      <FileText className="w-4 h-4" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {driverOrders.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No deliveries found</p>
                <p className="text-sm mt-1">You have no active or completed deliveries</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Proof of Delivery Modal */}
        {showProofModal && selectedOrderForProof && (
          <ProofOfDeliveryModal
            orderId={selectedOrderForProof.id}
            customerName={selectedOrderForProof.customer}
            onClose={() => {
              setShowProofModal(false);
              setSelectedOrderForProof(null);
            }}
            onSubmit={handleProofSubmit}
          />
        )}
      </div>
    );
  }

  // Regular view for other roles
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
      <div className="md:hidden">
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
      <div className="hidden md:block border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'all', label: 'All Orders', icon: FileText },
            { key: 'draft', label: 'Drafts', icon: Edit2 },
            { key: 'pending', label: 'Pending', icon: Clock },
            { key: 'approved', label: 'Approved', icon: CheckCircle },
            { key: 'intransit', label: 'In Transit', icon: Truck },
            { key: 'delivered', label: 'Delivered', icon: Package },
            { key: 'rejected', label: 'Rejected', icon: XCircle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
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
          ))}
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
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleViewOrder(order.id)}
              >
                <div className="space-y-3">
                  {/* Order ID and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-semibold text-gray-900 truncate">{order.id}</span>
                      {order.requiresApproval && (
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" title="Requires approval" />
                      )}
                    </div>
                    <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs flex-shrink-0">
                      {order.status}
                    </Badge>
                  </div>
                  
                  {/* Customer */}
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 break-words">{order.customer}</div>
                    <div className="text-xs text-gray-500 truncate">{order.agent}</div>
                  </div>
                  
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2 text-sm min-w-0">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">Order Date</div>
                      <div className="text-gray-900 truncate">{order.orderDate}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">Required Date</div>
                      <div className="text-gray-900 truncate">{order.requiredDate}</div>
                    </div>
                  </div>
                  
                  {/* Amount and Payment */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 break-words">₱{order.totalAmount.toLocaleString()}</div>
                      {order.discountPercent > 0 && (
                        <div className="text-xs text-gray-500 truncate">-{order.discountPercent.toFixed(1)}% discount</div>
                      )}
                    </div>
                    <Badge variant={getPaymentBadgeVariant(order.paymentStatus)} className="text-xs flex-shrink-0">
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="px-4 py-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No orders found</p>
                <p className="text-sm mt-1">Try adjusting your filters or create a new order</p>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Order #</th>
                  <th className="px-6 py-3 text-left font-medium">Customer</th>
                  <th className="px-6 py-3 text-left font-medium">Order Date</th>
                  <th className="px-6 py-3 text-left font-medium">Required Date</th>
                  <th className="px-6 py-3 text-left font-medium">Amount</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleViewOrder(order.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{order.id}</span>
                        {order.requiresApproval && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" title="Requires approval" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{order.customer}</div>
                        <div className="text-xs text-gray-500">{order.agent}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{order.orderDate}</td>
                    <td className="px-6 py-4 text-gray-600">{order.requiredDate}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">₱{order.totalAmount.toLocaleString()}</div>
                      {order.discountPercent > 0 && (
                        <div className="text-xs text-gray-500">-{order.discountPercent.toFixed(1)}% discount</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadgeVariant(order.status)} className="min-w-[120px] justify-center">
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
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
