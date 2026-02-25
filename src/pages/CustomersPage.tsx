import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
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
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Eye,
  Star,
  ShoppingCart,
  CreditCard,
  Activity,
  Target,
  Award,
  Zap,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock customer data - will be replaced with actual data source
interface Customer {
  id: string;
  name: string;
  type: 'Hardware Store' | 'Construction Company' | 'Contractor' | 'Distributor';
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  paymentTerms: 'COD' | '15 Days' | '30 Days' | '45 Days' | '60 Days';
  paymentScore: number; // 0-100
  avgPaymentDays: number;
  overdueAmount: number;
  totalPurchasesYTD: number;
  totalPurchasesLifetime: number;
  orderCount: number;
  lastOrderDate: string;
  accountSince: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  riskLevel: 'Low' | 'Medium' | 'High';
  assignedAgent: string;
  notes?: string;
}

interface PurchaseHistory {
  month: string;
  amount: number;
  orders: number;
}

interface TopProduct {
  productName: string;
  quantity: number;
  totalValue: number;
  frequency: number;
}

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'CUS-001',
    name: 'Mega Hardware Center',
    type: 'Hardware Store',
    contactPerson: 'Roberto Santos',
    phone: '+63 917 123 4567',
    email: 'roberto@megahardware.com',
    address: '123 Rizal Avenue',
    city: 'Manila',
    creditLimit: 5000000,
    outstandingBalance: 1200000,
    availableCredit: 3800000,
    paymentTerms: '30 Days',
    paymentScore: 92,
    avgPaymentDays: 28,
    overdueAmount: 0,
    totalPurchasesYTD: 18500000,
    totalPurchasesLifetime: 45200000,
    orderCount: 156,
    lastOrderDate: '2026-02-23',
    accountSince: '2022-03-15',
    status: 'Active',
    riskLevel: 'Low',
    assignedAgent: 'Pedro Reyes',
  },
  {
    id: 'CUS-002',
    name: 'BuildMaster Construction Corp',
    type: 'Construction Company',
    contactPerson: 'Maria Gonzales',
    phone: '+63 917 234 5678',
    email: 'maria@buildmaster.ph',
    address: '456 EDSA',
    city: 'Quezon City',
    creditLimit: 10000000,
    outstandingBalance: 4500000,
    availableCredit: 5500000,
    paymentTerms: '45 Days',
    paymentScore: 78,
    avgPaymentDays: 52,
    overdueAmount: 850000,
    totalPurchasesYTD: 32000000,
    totalPurchasesLifetime: 78000000,
    orderCount: 89,
    lastOrderDate: '2026-02-20',
    accountSince: '2021-06-10',
    status: 'Active',
    riskLevel: 'Medium',
    assignedAgent: 'Juan Dela Cruz',
  },
  {
    id: 'CUS-003',
    name: 'City Builders Supply',
    type: 'Hardware Store',
    contactPerson: 'Carlos Reyes',
    phone: '+63 917 345 6789',
    email: 'carlos@citybuilders.com',
    address: '789 Quezon Avenue',
    city: 'Caloocan',
    creditLimit: 3000000,
    outstandingBalance: 850000,
    availableCredit: 2150000,
    paymentTerms: '30 Days',
    paymentScore: 88,
    avgPaymentDays: 31,
    overdueAmount: 150000,
    totalPurchasesYTD: 9800000,
    totalPurchasesLifetime: 28500000,
    orderCount: 124,
    lastOrderDate: '2026-02-24',
    accountSince: '2020-11-20',
    status: 'Active',
    riskLevel: 'Low',
    assignedAgent: 'Pedro Reyes',
  },
  {
    id: 'CUS-004',
    name: 'ProBuild Contractors Inc',
    type: 'Contractor',
    contactPerson: 'Ramon Cruz',
    phone: '+63 917 456 7890',
    email: 'ramon@probuild.ph',
    address: '321 Commonwealth Ave',
    city: 'Quezon City',
    creditLimit: 7500000,
    outstandingBalance: 6200000,
    availableCredit: 1300000,
    paymentTerms: '60 Days',
    paymentScore: 45,
    avgPaymentDays: 78,
    overdueAmount: 2100000,
    totalPurchasesYTD: 15000000,
    totalPurchasesLifetime: 35000000,
    orderCount: 67,
    lastOrderDate: '2026-02-18',
    accountSince: '2023-01-08',
    status: 'Active',
    riskLevel: 'High',
    assignedAgent: 'Rosa Martinez',
  },
  {
    id: 'CUS-005',
    name: 'Northern Hardware Depot',
    type: 'Hardware Store',
    contactPerson: 'Luis Garcia',
    phone: '+63 917 567 8901',
    email: 'luis@northernhardware.com',
    address: '654 MacArthur Highway',
    city: 'Valenzuela',
    creditLimit: 4000000,
    outstandingBalance: 980000,
    availableCredit: 3020000,
    paymentTerms: '30 Days',
    paymentScore: 95,
    avgPaymentDays: 26,
    overdueAmount: 0,
    totalPurchasesYTD: 12300000,
    totalPurchasesLifetime: 32000000,
    orderCount: 142,
    lastOrderDate: '2026-02-25',
    accountSince: '2021-08-12',
    status: 'Active',
    riskLevel: 'Low',
    assignedAgent: 'Juan Dela Cruz',
  },
];

type ViewMode = 'overview' | 'analytics' | 'payments' | 'products';

export function CustomersPage() {
  const { branch } = useAppContext();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterRisk, setFilterRisk] = useState<string>('All');

  // Filter customers
  const filteredCustomers = MOCK_CUSTOMERS.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || customer.type === filterType;
    const matchesRisk = filterRisk === 'All' || customer.riskLevel === filterRisk;
    return matchesSearch && matchesType && matchesRisk;
  });

  // Mock purchase history for selected customer
  const purchaseHistory: PurchaseHistory[] = [
    { month: 'Aug', amount: 2800000, orders: 12 },
    { month: 'Sep', amount: 3200000, orders: 14 },
    { month: 'Oct', amount: 2900000, orders: 13 },
    { month: 'Nov', amount: 3500000, orders: 16 },
    { month: 'Dec', amount: 3100000, orders: 15 },
    { month: 'Jan', amount: 3000000, orders: 14 },
    { month: 'Feb', amount: 2800000, orders: 11 },
  ];

  const topProducts: TopProduct[] = [
    { productName: 'PVC Pipe 2" Class 150', quantity: 1250, totalValue: 625000, frequency: 8 },
    { productName: 'PVC Pipe 4" Class 150', quantity: 850, totalValue: 1275000, frequency: 7 },
    { productName: 'Solvent Cement 100ml', quantity: 2400, totalValue: 108000, frequency: 12 },
    { productName: 'PVC Elbow 2" 90°', quantity: 1800, totalValue: 126000, frequency: 9 },
    { productName: 'Garden Hose 1/2" 10m', quantity: 420, totalValue: 105000, frequency: 5 },
  ];

  const getPaymentScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'Low') return 'success';
    if (risk === 'Medium') return 'warning';
    return 'danger';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Active') return 'success';
    if (status === 'Inactive') return 'default';
    return 'danger';
  };

  const calculateCreditUtilization = (customer: Customer) => {
    return Math.round((customer.outstandingBalance / customer.creditLimit) * 100);
  };

  const formatCurrency = (amount: number) => {
    return `₱${(amount / 1000000).toFixed(2)}M`;
  };

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hardware stores, construction companies & contractors for <span className="font-medium text-gray-700">{branch}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Customer Reports
          </Button>
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Add New Customer
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{MOCK_CUSTOMERS.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Accounts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {MOCK_CUSTOMERS.filter(c => c.status === 'Active').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Receivables</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(MOCK_CUSTOMERS.reduce((sum, c) => sum + c.outstandingBalance, 0))}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Overdue Amount</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(MOCK_CUSTOMERS.reduce((sum, c) => sum + c.overdueAmount, 0))}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">YTD Sales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(MOCK_CUSTOMERS.reduce((sum, c) => sum + c.totalPurchasesYTD, 0))}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: 'Customer Overview', icon: <Building2 className="w-4 h-4" /> },
            { id: 'analytics', label: 'Purchase Analytics', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'payments', label: 'Payment Behavior', icon: <CreditCard className="w-4 h-4" /> },
            { id: 'products', label: 'Product Insights', icon: <Package className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`
                flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors
                ${viewMode === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* CUSTOMER OVERVIEW */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, contact person, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="All">All Types</option>
                  <option value="Hardware Store">Hardware Store</option>
                  <option value="Construction Company">Construction Company</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Distributor">Distributor</option>
                </select>
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="All">All Risk Levels</option>
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                </select>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Customer Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${
                        customer.type === 'Hardware Store' ? 'bg-blue-100' :
                        customer.type === 'Construction Company' ? 'bg-purple-100' :
                        customer.type === 'Contractor' ? 'bg-orange-100' :
                        'bg-green-100'
                      }`}>
                        <Building2 className={`w-6 h-6 ${
                          customer.type === 'Hardware Store' ? 'text-blue-600' :
                          customer.type === 'Construction Company' ? 'text-purple-600' :
                          customer.type === 'Contractor' ? 'text-orange-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                          <Badge variant={getStatusColor(customer.status)}>{customer.status}</Badge>
                          <Badge variant={getRiskColor(customer.riskLevel)}>{customer.riskLevel} Risk</Badge>
                          <span className="text-xs text-gray-500">{customer.id}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-gray-500 text-xs">Contact Person</div>
                              <div className="text-gray-900 font-medium">{customer.contactPerson}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-gray-500 text-xs">Phone</div>
                              <div className="text-gray-900">{customer.phone}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-gray-500 text-xs">Location</div>
                              <div className="text-gray-900">{customer.city}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-gray-500 text-xs">Type</div>
                              <div className="text-gray-900">{customer.type}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Credit Limit</div>
                        <div className="text-sm font-bold text-gray-900">{formatCurrency(customer.creditLimit)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Outstanding</div>
                        <div className="text-sm font-bold text-orange-600">{formatCurrency(customer.outstandingBalance)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Available Credit</div>
                        <div className="text-sm font-bold text-green-600">{formatCurrency(customer.availableCredit)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">YTD Purchases</div>
                        <div className="text-sm font-bold text-blue-600">{formatCurrency(customer.totalPurchasesYTD)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Payment Score</div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getPaymentScoreColor(customer.paymentScore)}>
                            {customer.paymentScore}
                          </Badge>
                          <span className="text-xs text-gray-500">Avg: {customer.avgPaymentDays}d</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Last Order</div>
                        <div className="text-sm font-medium text-gray-900">{customer.lastOrderDate}</div>
                      </div>
                    </div>

                    {/* Credit Utilization Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Credit Utilization</span>
                        <span className="text-gray-900 font-medium">{calculateCreditUtilization(customer)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            calculateCreditUtilization(customer) > 80 ? 'bg-red-600' :
                            calculateCreditUtilization(customer) > 60 ? 'bg-orange-600' :
                            'bg-green-600'
                          }`}
                          style={{ width: `${calculateCreditUtilization(customer)}%` }}
                        ></div>
                      </div>
                    </div>

                    {customer.overdueAmount > 0 && (
                      <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600 font-medium">
                          Overdue: {formatCurrency(customer.overdueAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PURCHASE ANALYTICS */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  Purchase Trend (7 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={purchaseHistory}>
                    <defs>
                      <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'Amount') return formatCurrency(value);
                        return value;
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fill="url(#colorPurchase)"
                      name="Amount"
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Orders"
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Customer Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-red-600" />
                  Customer Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Hardware Store', value: MOCK_CUSTOMERS.filter(c => c.type === 'Hardware Store').length },
                        { name: 'Construction Company', value: MOCK_CUSTOMERS.filter(c => c.type === 'Construction Company').length },
                        { name: 'Contractor', value: MOCK_CUSTOMERS.filter(c => c.type === 'Contractor').length },
                        { name: 'Distributor', value: MOCK_CUSTOMERS.filter(c => c.type === 'Distributor').length },
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {MOCK_CUSTOMERS.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Products by Customer */}
          <Card>
            <CardHeader>
              <CardTitle>Most Purchased Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Frequency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. per Order</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {topProducts.map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg text-blue-600 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div className="font-medium text-gray-900">{product.productName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                          {product.quantity.toLocaleString()} pcs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                          ₱{(product.totalValue / 1000).toFixed(0)}K
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="default">{product.frequency} orders</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {Math.round(product.quantity / product.frequency)} pcs/order
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PAYMENT BEHAVIOR */}
      {viewMode === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Excellent (80-100)', value: MOCK_CUSTOMERS.filter(c => c.paymentScore >= 80).length },
                        { name: 'Good (60-79)', value: MOCK_CUSTOMERS.filter(c => c.paymentScore >= 60 && c.paymentScore < 80).length },
                        { name: 'Poor (<60)', value: MOCK_CUSTOMERS.filter(c => c.paymentScore < 60).length },
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#F59E0B" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-700">Excellent</span>
                    </div>
                    <span className="font-medium">{MOCK_CUSTOMERS.filter(c => c.paymentScore >= 80).length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-700">Good</span>
                    </div>
                    <span className="font-medium">{MOCK_CUSTOMERS.filter(c => c.paymentScore >= 60 && c.paymentScore < 80).length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-gray-700">Poor</span>
                    </div>
                    <span className="font-medium">{MOCK_CUSTOMERS.filter(c => c.paymentScore < 60).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Payment Terms Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['COD', '15 Days', '30 Days', '45 Days', '60 Days'].map((term) => {
                    const count = MOCK_CUSTOMERS.filter(c => c.paymentTerms === term).length;
                    const percentage = (count / MOCK_CUSTOMERS.length) * 100;
                    return (
                      <div key={term}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-700 font-medium">{term}</span>
                          <span className="text-gray-900">{count} customers ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Payment Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Terms</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Payment Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overdue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {MOCK_CUSTOMERS.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-xs text-gray-500">{customer.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="default">{customer.paymentTerms}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge variant={getPaymentScoreColor(customer.paymentScore)}>
                              {customer.paymentScore}
                            </Badge>
                            {customer.paymentScore >= 90 && <Award className="w-4 h-4 text-yellow-500" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-medium ${
                            customer.avgPaymentDays <= parseInt(customer.paymentTerms) ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {customer.avgPaymentDays} days
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {formatCurrency(customer.outstandingBalance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.overdueAmount > 0 ? (
                            <span className="text-red-600 font-medium">
                              {formatCurrency(customer.overdueAmount)}
                            </span>
                          ) : (
                            <span className="text-gray-400">₱0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getRiskColor(customer.riskLevel)}>
                            {customer.riskLevel} Risk
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PRODUCT INSIGHTS */}
      {viewMode === 'products' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Purchase Patterns & Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Zap className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">AI-Powered Purchase Predictions</p>
                <p className="text-sm">Advanced analytics showing product preferences, buying cycles, and predictive ordering patterns</p>
                <Button variant="primary" className="mt-4">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Insights Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
