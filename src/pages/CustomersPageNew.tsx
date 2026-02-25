import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { 
  getCustomersByBranch, 
  getCustomerById,
  getCustomerNotes,
  getCustomerTasks,
  getCustomerTopProducts,
  getBuyingPatterns,
} from '@/src/mock/customers';
import { getOrdersByCustomer } from '@/src/mock/orders';
import { CustomerDetail, CustomerNote, CustomerTask } from '@/src/types/customers';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Package,
  FileText,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Star,
  ShoppingCart,
  CreditCard,
  Activity,
  MessageSquare,
  Clipboard,
  X,
  ExternalLink,
  Save,
  Send,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type CustomerTab = 'all' | 'active' | 'atrisk' | 'dormant';

export function CustomersPage() {
  const { branch, addAuditLog } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CustomerTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const allCustomers = getCustomersByBranch(branch);

  const filteredCustomers = allCustomers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && customer.status === 'Active' && customer.riskLevel === 'Low') ||
      (activeTab === 'atrisk' && (customer.riskLevel === 'High' || customer.overdueAmount > 0)) ||
      (activeTab === 'dormant' && customer.status === 'Dormant');
    
    return matchesSearch && matchesTab;
  });

  const handleViewCustomer = (customer: CustomerDetail) => {
    setSelectedCustomer(customer);
    setShowDetailDrawer(true);
    addAuditLog('Viewed Customer', 'Customer', `Viewed customer ${customer.name}`);
  };

  const handleCreateOrder = (customer: CustomerDetail) => {
    alert(`Creating order for ${customer.name} (Coming soon)`);
    addAuditLog('Initiated Order Creation', 'Order', `Started creating order for ${customer.name}`);
    navigate('/orders');
  };

  const handleAddNote = () => {
    setShowNoteModal(true);
  };

  const handleAddTask = () => {
    setShowTaskModal(true);
  };

  const getRiskBadgeVariant = (level: string) => {
    if (level === 'High') return 'danger';
    if (level === 'Medium') return 'warning';
    return 'success';
  };

  const getPaymentBehaviorBadge = (behavior: string) => {
    if (behavior === 'Good') return 'success';
    if (behavior === 'Watchlist') return 'warning';
    return 'danger';
  };

  const tabCounts = {
    all: allCustomers.length,
    active: allCustomers.filter(c => c.status === 'Active' && c.riskLevel === 'Low').length,
    atrisk: allCustomers.filter(c => c.riskLevel === 'High' || c.overdueAmount > 0).length,
    dormant: allCustomers.filter(c => c.status === 'Dormant').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer relationships and track sales performance</p>
        </div>
        <Button variant="primary" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'all', label: 'All Customers', icon: Building2 },
            { key: 'active', label: 'Active & Healthy', icon: CheckCircle },
            { key: 'atrisk', label: 'At Risk', icon: AlertTriangle },
            { key: 'dormant', label: 'Dormant', icon: Clock },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as CustomerTab)}
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

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, contact person, or ID..."
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
                  <th className="px-6 py-3 text-left font-medium">Customer</th>
                  <th className="px-6 py-3 text-left font-medium">Type</th>
                  <th className="px-6 py-3 text-left font-medium">Contact</th>
                  <th className="px-6 py-3 text-right font-medium">YTD Sales</th>
                  <th className="px-6 py-3 text-right font-medium">Outstanding</th>
                  <th className="px-6 py-3 text-center font-medium">Risk</th>
                  <th className="px-6 py-3 text-left font-medium">Last Order</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="default">{customer.type}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{customer.contactPerson}</div>
                        <div className="text-xs text-gray-500">{customer.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-gray-900">₱{(customer.totalPurchasesYTD / 1000000).toFixed(1)}M</div>
                      <div className="text-xs text-gray-500">{customer.orderCount} orders</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`font-medium ${customer.overdueAmount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        ₱{(customer.outstandingBalance / 1000).toFixed(0)}K
                      </div>
                      {customer.overdueAmount > 0 && (
                        <div className="text-xs text-red-600">₱{(customer.overdueAmount / 1000).toFixed(0)}K overdue</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={getRiskBadgeVariant(customer.riskLevel)}>
                        {customer.riskLevel}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{customer.lastOrderDate || 'Never'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleViewCustomer(customer)}
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleCreateOrder(customer)}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Order
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No customers found</p>
                      <p className="text-sm mt-1">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Detail Drawer */}
      {showDetailDrawer && selectedCustomer && (
        <CustomerDetailDrawer
          customer={selectedCustomer}
          onClose={() => {
            setShowDetailDrawer(false);
            setSelectedCustomer(null);
          }}
          onCreateOrder={handleCreateOrder}
          onAddNote={handleAddNote}
          onAddTask={handleAddTask}
        />
      )}
    </div>
  );
}

// Customer Detail Drawer Component
function CustomerDetailDrawer({
  customer,
  onClose,
  onCreateOrder,
  onAddNote,
  onAddTask,
}: {
  customer: CustomerDetail;
  onClose: () => void;
  onCreateOrder: (customer: CustomerDetail) => void;
  onAddNote: () => void;
  onAddTask: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'notes' | 'tasks'>('overview');
  const notes = getCustomerNotes(customer.id);
  const tasks = getCustomerTasks(customer.id);
  const orders = getOrdersByCustomer(customer.id);
  const topProducts = getCustomerTopProducts(customer.id);
  const buyingPatterns = getBuyingPatterns(customer.id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-4xl h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
                <Badge variant={customer.status === 'Active' ? 'success' : 'default'}>
                  {customer.status}
                </Badge>
                <Badge variant={customer.riskLevel === 'High' ? 'danger' : customer.riskLevel === 'Medium' ? 'warning' : 'success'}>
                  {customer.riskLevel} Risk
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">{customer.id} • {customer.type}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            <Button variant="primary" size="sm" onClick={() => onCreateOrder(customer)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Create Order
            </Button>
            <Button variant="outline" size="sm" onClick={onAddNote}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Add Note
            </Button>
            <Button variant="outline" size="sm" onClick={onAddTask}>
              <Clipboard className="w-4 h-4 mr-2" />
              Create Task
            </Button>
            {customer.mapLocation && (
              <Button variant="outline" size="sm">
                <MapPin className="w-4 h-4 mr-2" />
                View Map
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-t border-gray-200 pt-3">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'orders', label: `Orders (${orders.length})` },
              { key: 'notes', label: `Notes (${notes.length})` },
              { key: 'tasks', label: `Tasks (${tasks.filter(t => t.status !== 'Completed').length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`text-sm font-medium px-3 py-1 rounded ${
                  activeTab === key
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <InfoRow icon={User} label="Contact Person" value={customer.contactPerson} />
                  <InfoRow icon={Phone} label="Phone" value={customer.phone} />
                  <InfoRow icon={Mail} label="Email" value={customer.email} />
                  {customer.alternatePhone && (
                    <InfoRow icon={Phone} label="Alternate Phone" value={customer.alternatePhone} />
                  )}
                  <InfoRow icon={MapPin} label="Address" value={`${customer.address}, ${customer.city}`} className="col-span-2" />
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Credit Limit</div>
                    <div className="text-lg font-semibold text-gray-900">₱{(customer.creditLimit / 1000000).toFixed(1)}M</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Outstanding Balance</div>
                    <div className={`text-lg font-semibold ${customer.outstandingBalance > customer.creditLimit * 0.8 ? 'text-red-600' : 'text-gray-900'}`}>
                      ₱{(customer.outstandingBalance / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Available Credit</div>
                    <div className="text-lg font-semibold text-green-600">₱{(customer.availableCredit / 1000000).toFixed(2)}M</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">YTD Purchases</div>
                    <div className="text-lg font-semibold text-gray-900">₱{(customer.totalPurchasesYTD / 1000000).toFixed(2)}M</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Lifetime Purchases</div>
                    <div className="text-lg font-semibold text-gray-900">₱{(customer.totalPurchasesLifetime / 1000000).toFixed(1)}M</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Overdue Amount</div>
                    <div className={`text-lg font-semibold ${customer.overdueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₱{(customer.overdueAmount / 1000).toFixed(0)}K
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Behavior */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Behavior
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Payment Score</div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-gray-900">{customer.paymentScore}</div>
                      <div className="text-sm text-gray-500">/100</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full ${
                          customer.paymentScore >= 80 ? 'bg-green-500' : customer.paymentScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${customer.paymentScore}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Avg Payment Days</div>
                    <div className="text-2xl font-bold text-gray-900">{customer.avgPaymentDays}</div>
                    <div className="text-xs text-gray-500 mt-1">Terms: {customer.paymentTerms}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Behavior Status</div>
                    <Badge variant={customer.paymentBehavior === 'Good' ? 'success' : customer.paymentBehavior === 'Watchlist' ? 'warning' : 'danger'} className="text-base px-3 py-1">
                      {customer.paymentBehavior}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              {topProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Top Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topProducts.map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{product.productName}</div>
                            <div className="text-xs text-gray-500">{product.variantDescription}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">₱{product.totalValue.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">{product.quantityOrdered} units • {product.orderCount} orders</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === 'orders' && (
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{order.id}</div>
                        <div className="text-xs text-gray-500">{order.orderDate} • {order.items.length} items</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">₱{order.totalAmount.toLocaleString()}</div>
                        <Badge variant={order.status === 'Delivered' ? 'success' : 'default'} className="mt-1">
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No orders yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              {notes.map((note) => (
                <Card key={note.id} className={note.isImportant ? 'border-red-300 bg-red-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="default">{note.type}</Badge>
                      <span className="text-xs text-gray-500">{note.createdAt}</span>
                    </div>
                    <p className="text-sm text-gray-900 mt-2">{note.content}</p>
                    <div className="text-xs text-gray-500 mt-2">By {note.createdBy}</div>
                  </CardContent>
                </Card>
              ))}
              {notes.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No notes yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={task.priority === 'Urgent' ? 'danger' : task.priority === 'High' ? 'warning' : 'default'}>
                          {task.priority}
                        </Badge>
                        <Badge variant="default">{task.type}</Badge>
                      </div>
                      <Badge variant={task.status === 'Completed' ? 'success' : task.status === 'In Progress' ? 'warning' : 'default'}>
                        {task.status}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-gray-900 mt-2">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {task.dueDate}
                      </span>
                      <span>By {task.assignedTo}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {tasks.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8 text-gray-500">
                    <Clipboard className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No tasks yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for info rows
function InfoRow({ icon: Icon, label, value, className = '' }: { icon: any; label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}
