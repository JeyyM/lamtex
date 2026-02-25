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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewCustomer(customer)}
                  >
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
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
    </div>
  );
}
