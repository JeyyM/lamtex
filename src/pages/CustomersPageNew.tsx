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
    addAuditLog('Viewed Customer', 'Customer', `Viewed customer ${customer.name}`);
    navigate(`/customers/${customer.id}`);
  };

  const handleCreateOrder = (customer: CustomerDetail) => {
    alert(`Creating order for ${customer.name} (Coming soon)`);
    addAuditLog('Initiated Order Creation', 'Order', `Started creating order for ${customer.name}`);
    navigate('/orders');
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
        <Button variant="primary" className="gap-2 w-max flex-shrink-0 ml-4" onClick={() => navigate('/customers/new')}>
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      {/* Tabs - Desktop view (≥475px) */}
      <div className="border-b border-gray-200 hidden min-[475px]:block">
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

      {/* Tabs - Mobile dropdown (<475px) */}
      <div className="min-[475px]:hidden">
        <div className="relative">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as CustomerTab)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none appearance-none bg-white"
          >
            {[
              { key: 'all', label: 'All Customers' },
              { key: 'active', label: 'Active & Healthy' },
              { key: 'atrisk', label: 'At Risk' },
              { key: 'dormant', label: 'Dormant' },
            ].map(({ key, label }) => (
              <option key={key} value={key}>
                {label} ({tabCounts[key as keyof typeof tabCounts]})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Filter className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, contact person, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4" />
              More Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium max-[474px]:border-r max-[474px]:border-gray-200">Customer</th>
                  <th className="px-6 py-3 text-left font-medium hidden min-[1556px]:table-cell">Type</th>
                  <th className="px-6 py-3 text-left font-medium hidden min-[475px]:table-cell">Contact</th>
                  <th className="px-6 py-3 text-right font-medium hidden min-[1330px]:table-cell">YTD Sales</th>
                  <th className="px-6 py-3 text-right font-medium max-[474px]:border-r max-[474px]:border-gray-200">Outstanding</th>
                  <th className="px-6 py-3 text-center font-medium hidden min-[1211px]:table-cell">Risk</th>
                  <th className="px-6 py-3 text-left font-medium hidden min-[1100px]:table-cell">Last Order</th>
                  <th className="px-6 py-3 text-center font-medium hidden min-[601px]:table-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    className="hover:bg-gray-50"
                  >
                    <td 
                      className="px-6 py-4 cursor-pointer max-[474px]:border-r max-[474px]:border-gray-200"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <div>
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.id}</div>
                        {/* Show type below name on screens ≤1555px */}
                        <div className="mt-1 min-[1556px]:hidden">
                          <Badge variant="default">{customer.type}</Badge>
                        </div>
                        {/* Show contact below customer on screens ≤474px */}
                        <div className="max-[474px]:block hidden">
                          <hr className="my-2 border-gray-200" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{customer.contactPerson}</div>
                            <div className="text-xs text-gray-500">{customer.phone}</div>
                            {/* Show last order below contact on screens <1100px */}
                            <div className="mt-2 min-[1100px]:hidden">
                              <div className="text-xs font-bold text-gray-700">Last Order</div>
                              <div className="text-xs text-gray-600">{customer.lastOrderDate || 'Never'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td 
                      className="px-6 py-4 cursor-pointer hidden min-[1556px]:table-cell"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <Badge variant="default">{customer.type}</Badge>
                    </td>
                    <td 
                      className="px-6 py-4 cursor-pointer hidden min-[475px]:table-cell"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{customer.contactPerson}</div>
                        <div className="text-xs text-gray-500">{customer.phone}</div>
                        {/* Show last order below contact on screens <1100px */}
                        <div className="mt-2 min-[1100px]:hidden">
                          <div className="text-xs font-bold text-gray-700">Last Order</div>
                          <div className="text-xs text-gray-600">{customer.lastOrderDate || 'Never'}</div>
                        </div>
                      </div>
                    </td>
                    <td 
                      className="px-6 py-4 text-right cursor-pointer hidden min-[1330px]:table-cell"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <div className="font-medium text-gray-900">₱{(customer.totalPurchasesYTD / 1000000).toFixed(1)}M</div>
                      <div className="text-xs text-gray-500">{customer.orderCount} orders</div>
                    </td>
                    <td 
                      className="px-6 py-4 text-right cursor-pointer max-[474px]:border-r max-[474px]:border-gray-200"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <div className={`font-medium ${customer.overdueAmount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        ₱{(customer.outstandingBalance / 1000).toFixed(0)}K
                      </div>
                      {customer.overdueAmount > 0 && (
                        <div className="text-xs text-red-600">₱{(customer.overdueAmount / 1000).toFixed(0)}K overdue</div>
                      )}
                      {/* Show risk below outstanding on screens ≤1210px */}
                      <div className="mt-1 min-[1211px]:hidden flex justify-end">
                        <Badge variant={getRiskBadgeVariant(customer.riskLevel)}>
                          {customer.riskLevel}
                        </Badge>
                      </div>
                    </td>
                    <td 
                      className="px-6 py-4 text-center cursor-pointer hidden min-[1211px]:table-cell"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <Badge variant={getRiskBadgeVariant(customer.riskLevel)}>
                        {customer.riskLevel}
                      </Badge>
                    </td>
                    <td 
                      className="px-6 py-4 text-gray-600 cursor-pointer hidden min-[1100px]:table-cell"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      {customer.lastOrderDate || 'Never'}
                    </td>
                    <td className="px-6 py-4 text-center hidden min-[601px]:table-cell">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${customer.id}/edit`);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
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

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="p-4 space-y-3 hover:bg-gray-50 cursor-pointer" onClick={() => handleViewCustomer(customer)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 break-words">{customer.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{customer.id}</p>
                  </div>
                  <Badge variant={getRiskBadgeVariant(customer.riskLevel)} className="flex-shrink-0">
                    {customer.riskLevel}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="default">{customer.type}</Badge>
                  {customer.overdueAmount > 0 && (
                    <Badge variant="danger">Overdue</Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Contact Person</p>
                    <p className="text-gray-900 font-medium">{customer.contactPerson}</p>
                    <p className="text-xs text-gray-600">{customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className={`font-semibold ${customer.overdueAmount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      ₱{(customer.outstandingBalance / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">YTD Sales</p>
                    <p className="text-gray-900 font-medium">₱{(customer.totalPurchasesYTD / 1000000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Order</p>
                    <p className="text-gray-900">{customer.lastOrderDate || 'Never'}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewCustomer(customer);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/customers/${customer.id}/edit`);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="px-4 py-12 text-center text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No customers found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
