import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  getCustomerById,
  getCustomerNotes,
  getCustomerTasks,
  getCustomerTopProducts,
} from '@/src/mock/customers';
import { getOrdersByCustomer } from '@/src/mock/orders';
import {
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  CreditCard,
  Package,
  Calendar,
  ShoppingCart,
  MessageSquare,
  Clipboard,
  ArrowLeft,
  Edit,
  FileText,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addAuditLog } = useAppContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'notes' | 'tasks'>('overview');
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);

  // For simplicity, always show CUS-001 (Mega Hardware Center) regardless of ID
  const customer = getCustomerById('CUS-001');
  
  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900">Customer not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  const notes = getCustomerNotes(customer.id);
  const tasks = getCustomerTasks(customer.id);
  const orders = getOrdersByCustomer(customer.id);
  const topProducts = getCustomerTopProducts(customer.id);

  const handleCreateOrder = () => {
    alert(`Creating order for ${customer.name} (Coming soon)`);
    addAuditLog('Initiated Order Creation', 'Order', `Started creating order for ${customer.name}`);
    navigate('/orders');
  };

  const handleAddNote = () => {
    alert('Add note functionality coming soon');
    addAuditLog('Add Note', 'Customer', `Adding note for ${customer.name}`);
  };

  const handleAddTask = () => {
    alert('Add task functionality coming soon');
    addAuditLog('Add Task', 'Customer', `Adding task for ${customer.name}`);
  };

  // Mock purchase history data for products
  const getPurchaseHistory = (productIndex: number) => {
    const histories = [
      // Portland Cement Premium
      [
        { month: 'Aug 2025', quantity: 450, value: 135000 },
        { month: 'Sep 2025', quantity: 520, value: 156000 },
        { month: 'Oct 2025', quantity: 480, value: 144000 },
        { month: 'Nov 2025', quantity: 600, value: 180000 },
        { month: 'Dec 2025', quantity: 550, value: 165000 },
        { month: 'Jan 2026', quantity: 580, value: 174000 },
        { month: 'Feb 2026', quantity: 620, value: 186000 },
      ],
      // Steel Rebars
      [
        { month: 'Aug 2025', quantity: 180, value: 252000 },
        { month: 'Sep 2025', quantity: 200, value: 280000 },
        { month: 'Oct 2025', quantity: 150, value: 210000 },
        { month: 'Nov 2025', quantity: 220, value: 308000 },
        { month: 'Dec 2025', quantity: 190, value: 266000 },
        { month: 'Jan 2026', quantity: 240, value: 336000 },
        { month: 'Feb 2026', quantity: 210, value: 294000 },
      ],
      // Plywood Marine Grade
      [
        { month: 'Aug 2025', quantity: 120, value: 144000 },
        { month: 'Sep 2025', quantity: 110, value: 132000 },
        { month: 'Oct 2025', quantity: 130, value: 156000 },
        { month: 'Nov 2025', quantity: 140, value: 168000 },
        { month: 'Dec 2025', quantity: 125, value: 150000 },
        { month: 'Jan 2026', quantity: 135, value: 162000 },
        { month: 'Feb 2026', quantity: 150, value: 180000 },
      ],
    ];
    return histories[productIndex] || histories[0];
  };

  const getOrderingPattern = (productIndex: number) => {
    const patterns = [
      { lastOrdered: '2026-02-18', frequency: 28, regularity: 'Every 28 days' },
      { lastOrdered: '2026-02-20', frequency: 32, regularity: 'Every 30-35 days' },
      { lastOrdered: '2026-02-15', frequency: 21, regularity: 'Every 3 weeks' },
    ];
    return patterns[productIndex] || patterns[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <Badge variant={customer.status === 'Active' ? 'success' : 'default'}>
                {customer.status}
              </Badge>
              <Badge variant={customer.riskLevel === 'High' ? 'danger' : customer.riskLevel === 'Medium' ? 'warning' : 'success'}>
                {customer.riskLevel} Risk
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">{customer.id} • {customer.type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="primary" size="sm" onClick={handleCreateOrder}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={handleAddNote}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Add Note
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddTask}>
          <Clipboard className="w-4 h-4 mr-2" />
          Create Task
        </Button>
        {customer.mapLocation && (
          <Button variant="outline" size="sm">
            <MapPin className="w-4 h-4 mr-2" />
            View on Map
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'overview', label: 'Overview', icon: FileText },
            { key: 'orders', label: `Orders (${orders.length})`, icon: ShoppingCart },
            { key: 'notes', label: `Notes (${notes.length})`, icon: MessageSquare },
            { key: 'tasks', label: `Tasks (${tasks.filter(t => t.status !== 'Completed').length})`, icon: Clipboard },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
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
                <InfoRow icon={MapPin} label="Address" value={`${customer.address}, ${customer.city}, ${customer.province}`} className="col-span-2" />
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
                    {topProducts.map((product, idx) => {
                      const isExpanded = expandedProduct === idx;
                      const history = getPurchaseHistory(idx);
                      const pattern = getOrderingPattern(idx);
                      
                      return (
                        <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div 
                            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                            onClick={() => setExpandedProduct(isExpanded ? null : idx)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{product.productName}</div>
                                <div className="text-xs text-gray-500">{product.variantDescription}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-medium text-gray-900">₱{product.totalValue.toLocaleString()}</div>
                                <div className="text-xs text-gray-500">{product.quantityOrdered} units • {product.orderCount} orders</div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="p-4 bg-white border-t border-gray-200 space-y-4">
                              {/* Ordering Pattern */}
                              <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
                                <div>
                                  <div className="text-xs text-blue-600 font-medium mb-1">Last Ordered</div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-semibold text-gray-900">
                                      {new Date(pattern.lastOrdered).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {Math.floor((new Date().getTime() - new Date(pattern.lastOrdered).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-blue-600 font-medium mb-1">Purchase Regularity</div>
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-semibold text-gray-900">Est. {pattern.regularity}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Next expected: ~{Math.ceil(pattern.frequency - (new Date().getTime() - new Date(pattern.lastOrdered).getTime()) / (1000 * 60 * 60 * 24))} days
                                  </div>
                                </div>
                              </div>

                              {/* Purchase History Chart */}
                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-3">Purchase History (Last 7 Months)</div>
                                <ResponsiveContainer width="100%" height={200}>
                                  <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis 
                                      dataKey="month" 
                                      tick={{ fontSize: 12 }}
                                      stroke="#6b7280"
                                    />
                                    <YAxis 
                                      tick={{ fontSize: 12 }}
                                      stroke="#6b7280"
                                      label={{ value: 'Quantity', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                                    />
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: 'white', 
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                      }}
                                      formatter={(value: any, name: string) => {
                                        if (name === 'quantity') return [value + ' units', 'Quantity'];
                                        if (name === 'value') return ['₱' + value.toLocaleString(), 'Value'];
                                        return [value, name];
                                      }}
                                    />
                                    <Line 
                                      type="monotone" 
                                      dataKey="quantity" 
                                      stroke="#dc2626" 
                                      strokeWidth={2}
                                      dot={{ fill: '#dc2626', r: 4 }}
                                      activeDot={{ r: 6 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                                
                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                  <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-xs text-gray-500">Avg/Month</div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      {Math.round(history.reduce((sum, h) => sum + h.quantity, 0) / history.length)} units
                                    </div>
                                  </div>
                                  <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-xs text-gray-500">Trend</div>
                                    <div className="text-sm font-semibold text-green-600">
                                      +{Math.round(((history[history.length - 1].quantity - history[0].quantity) / history[0].quantity) * 100)}%
                                    </div>
                                  </div>
                                  <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-xs text-gray-500">Peak Month</div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      {history.reduce((max, h) => h.quantity > max.quantity ? h : max).month}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <div>
                      <div className="font-medium text-gray-900">{order.id}</div>
                      <div className="text-sm text-gray-500">{order.orderDate} • {order.items.length} items</div>
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
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium">No orders yet</p>
                    <Button variant="primary" size="sm" className="mt-4" onClick={handleCreateOrder}>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Create First Order
                    </Button>
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
                <CardContent className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">No notes yet</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={handleAddNote}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add First Note
                  </Button>
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
                    <span>Assigned to: {task.assignedTo}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tasks.length === 0 && (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <Clipboard className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">No tasks yet</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={handleAddTask}>
                    <Clipboard className="w-4 h-4 mr-2" />
                    Create First Task
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
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
