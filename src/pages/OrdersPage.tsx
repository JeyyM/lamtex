import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { getOrdersByBranch, APPROVAL_RULES } from '@/src/mock/orders';
import { getCustomersByBranch } from '@/src/mock/customers';
import { MOCK_VARIANTS } from '@/src/mock/seed';
import { useAppContext } from '@/src/store/AppContext';
import { OrderDetail, OrderLineItem, OrderStatus, StockHint } from '@/src/types/orders';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Package,
  CreditCard,
  Calendar,
  FileText,
  Trash2,
  Send,
  Save,
  ChevronDown,
  XCircle,
  Info,
} from 'lucide-react';

type OrderTab = 'all' | 'draft' | 'pending' | 'approved' | 'intransit' | 'delivered' | 'rejected';

export function OrdersPage() {
  const { branch, addAuditLog } = useAppContext();
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<OrderStatus[]>([]);
  
  const allOrders = getOrdersByBranch(branch);
  const customers = getCustomersByBranch(branch);

  const filteredOrders = allOrders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === 'all' ||
      (activeTab === 'draft' && order.status === 'Draft') ||
      (activeTab === 'pending' && order.status === 'Pending Approval') ||
      (activeTab === 'approved' && ['Approved', 'Picking', 'Packed', 'Ready', 'Scheduled'].includes(order.status)) ||
      (activeTab === 'intransit' && order.status === 'In Transit') ||
      (activeTab === 'delivered' && ['Delivered', 'Completed'].includes(order.status)) ||
      (activeTab === 'rejected' && order.status === 'Rejected');
    
    return matchesSearch && matchesTab;
  });

  const getStatusBadgeVariant = (status: OrderStatus) => {
    if (['Delivered', 'Completed', 'Approved'].includes(status)) return 'success';
    if (['Pending Approval', 'Picking', 'Packed', 'Ready', 'Scheduled'].includes(status)) return 'warning';
    if (['Rejected', 'Cancelled'].includes(status)) return 'danger';
    if (status === 'In Transit') return 'info';
    return 'default';
  };

  const getPaymentBadgeVariant = (status: string) => {
    if (status === 'Paid') return 'success';
    if (status === 'Overdue') return 'danger';
    if (['Partially Paid', 'Invoiced'].includes(status)) return 'warning';
    return 'default';
  };

  const handleViewOrder = (order: OrderDetail) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
    addAuditLog('Viewed Order', 'Order', `Viewed order ${order.id}`);
  };

  const handleEditOrder = (order: OrderDetail) => {
    if (['Draft', 'Rejected'].includes(order.status)) {
      alert(`Editing order ${order.id} (Coming soon)`);
      addAuditLog('Started Edit Order', 'Order', `Started editing order ${order.id}`);
    } else {
      alert('Order cannot be edited in current status');
    }
  };

  const handleCancelOrder = (order: OrderDetail) => {
    if (confirm(`Are you sure you want to cancel order ${order.id}?`)) {
      const reason = prompt('Please provide a cancellation reason:');
      if (reason) {
        alert(`Order ${order.id} cancelled. Reason: ${reason}`);
        addAuditLog('Cancelled Order', 'Order', `Cancelled order ${order.id}: ${reason}`);
      }
    }
  };

  const handleResubmitOrder = (order: OrderDetail) => {
    if (order.status === 'Rejected') {
      alert(`Resubmitting order ${order.id} for approval (Coming soon)`);
      addAuditLog('Resubmitted Order', 'Order', `Resubmitted order ${order.id} after revision`);
    }
  };

  const tabCounts = {
    all: allOrders.length,
    draft: allOrders.filter(o => o.status === 'Draft').length,
    pending: allOrders.filter(o => o.status === 'Pending Approval').length,
    approved: allOrders.filter(o => ['Approved', 'Picking', 'Packed', 'Ready', 'Scheduled'].includes(o.status)).length,
    intransit: allOrders.filter(o => o.status === 'In Transit').length,
    delivered: allOrders.filter(o => ['Delivered', 'Completed'].includes(o.status)).length,
    rejected: allOrders.filter(o => o.status === 'Rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create, track, and manage customer orders</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create Order
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'all', label: 'All Orders', icon: FileText },
            { key: 'draft', label: 'Drafts', icon: Edit },
            { key: 'pending', label: 'Pending Approval', icon: Clock },
            { key: 'approved', label: 'Approved', icon: CheckCircle },
            { key: 'intransit', label: 'In Transit', icon: Truck },
            { key: 'delivered', label: 'Delivered', icon: Package },
            { key: 'rejected', label: 'Rejected', icon: XCircle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as OrderTab)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium transition-colors ${
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
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
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
          <div className="overflow-x-auto">
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
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
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
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>
                        {order.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        {['Draft', 'Rejected'].includes(order.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleEditOrder(order)}
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
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

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOrder(null);
          }}
          onEdit={handleEditOrder}
          onCancel={handleCancelOrder}
          onResubmit={handleResubmitOrder}
        />
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal
          customers={customers}
          onClose={() => setShowCreateModal(false)}
          onSave={(draft) => {
            alert('Order creation coming soon!');
            setShowCreateModal(false);
            addAuditLog('Created Order', 'Order', 'Created new order');
          }}
        />
      )}
    </div>
  );
}

// Order Detail Modal Component
function OrderDetailModal({
  order,
  onClose,
  onEdit,
  onCancel,
  onResubmit,
}: {
  order: OrderDetail;
  onClose: () => void;
  onEdit: (order: OrderDetail) => void;
  onCancel: (order: OrderDetail) => void;
  onResubmit: (order: OrderDetail) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{order.id}</h2>
            <p className="text-sm text-gray-500 mt-1">{order.customer}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Approval */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={order.status === 'Approved' ? 'success' : order.status === 'Rejected' ? 'danger' : 'warning'} className="text-base px-4 py-2">
                {order.status}
              </Badge>
              <Badge variant={order.paymentStatus === 'Paid' ? 'success' : 'default'} className="text-base px-4 py-2">
                {order.paymentStatus}
              </Badge>
            </div>
            <div className="flex gap-2">
              {['Draft', 'Rejected'].includes(order.status) && (
                <Button variant="outline" size="sm" onClick={() => onEdit(order)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Order
                </Button>
              )}
              {order.status === 'Rejected' && (
                <Button variant="primary" size="sm" onClick={() => onResubmit(order)}>
                  <Send className="w-4 h-4 mr-2" />
                  Resubmit
                </Button>
              )}
              {!['Delivered', 'Completed', 'Cancelled'].includes(order.status) && (
                <Button variant="outline" size="sm" onClick={() => onCancel(order)} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Approval Info */}
          {order.requiresApproval && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-900">Approval Required</h3>
                    <ul className="mt-2 space-y-1 text-sm text-amber-800">
                      {order.approvalReason?.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                    {order.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        <strong>Rejection Reason:</strong> {order.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoField label="Order Date" value={order.orderDate} icon={Calendar} />
            <InfoField label="Required Date" value={order.requiredDate} icon={Calendar} />
            <InfoField label="Delivery Type" value={order.deliveryType} icon={Truck} />
            <InfoField label="Payment Terms" value={order.paymentTerms} icon={CreditCard} />
            <InfoField label="Agent" value={order.agent} icon={FileText} />
            <InfoField label="Branch" value={order.branch} icon={FileText} />
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Product</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Unit Price</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Discount</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Total</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.productName}</div>
                        <div className="text-xs text-gray-500">{item.variantDescription}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">₱{item.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {item.discountPercent > 0 ? `-${item.discountPercent}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">₱{item.lineTotal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={item.stockHint === 'Available' ? 'success' : item.stockHint === 'Partial' ? 'warning' : 'danger'}>
                          {item.stockHint}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₱{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Discount ({order.discountPercent.toFixed(1)}%):</span>
                  <span>-₱{order.discountAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total Amount:</span>
                  <span>₱{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Invoice Info */}
          {order.invoiceId && (
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Invoice #" value={order.invoiceId} icon={FileText} />
              <InfoField label="Invoice Date" value={order.invoiceDate || '-'} icon={Calendar} />
              <InfoField label="Due Date" value={order.dueDate || '-'} icon={Calendar} />
              <InfoField label="Balance Due" value={`₱${order.balanceDue.toLocaleString()}`} icon={CreditCard} className={order.balanceDue > 0 ? 'text-red-600 font-semibold' : 'text-green-600'} />
            </div>
          )}

          {/* Notes */}
          {order.orderNotes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Order Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{order.orderNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Info Field Component
function InfoField({ label, value, icon: Icon, className = '' }: { label: string; value: string; icon: any; className?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-sm font-medium text-gray-900 ${className}`}>{value}</div>
    </div>
  );
}

// Create Order Modal Component (Placeholder)
function CreateOrderModal({
  customers,
  onClose,
  onSave,
}: {
  customers: any[];
  onClose: () => void;
  onSave: (draft: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Order Creation Form</h3>
            <p className="text-gray-500 mb-6">Full order creation UI coming soon</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button variant="outline" onClick={() => onSave(true)}>
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </Button>
              <Button variant="primary" onClick={() => onSave(false)}>
                <Send className="w-4 h-4 mr-2" />
                Submit Order
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

