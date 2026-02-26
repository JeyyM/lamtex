import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Factory,
  User,
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
  Truck,
  Activity,
  Target,
  Award,
  Zap,
  PackageCheck,
  ThumbsUp,
  ThumbsDown,
  Timer,
  Shield,
  TrendingUpDown,
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
  BarChart,
} from 'recharts';

// Supplier data structure
interface Supplier {
  id: string;
  name: string;
  type: 'Raw Materials' | 'Packaging' | 'Chemicals' | 'Equipment' | 'Services';
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  paymentTerms: 'COD' | '15 Days' | '30 Days' | '45 Days' | '60 Days' | '90 Days';
  currency: 'PHP' | 'USD' | 'EUR';
  totalPurchasesYTD: number;
  totalPurchasesLifetime: number;
  orderCount: number;
  lastPurchaseDate: string;
  accountSince: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  performanceScore: number; // 0-100
  qualityRating: number; // 1-5 stars
  deliveryRating: number; // 1-5 stars
  avgLeadTime: number; // days
  onTimeDeliveryRate: number; // percentage
  defectRate: number; // percentage
  avgOrderValue: number;
  preferredSupplier: boolean;
  riskLevel: 'Low' | 'Medium' | 'High';
  notes?: string;
}

interface PurchaseHistory {
  month: string;
  amount: number;
  orders: number;
}

interface TopPurchase {
  materialName: string;
  quantity: number;
  totalValue: number;
  frequency: number;
  avgPrice: number;
}

interface SupplierPerformance {
  supplier: string;
  onTimeDelivery: number;
  qualityScore: number;
  leadTime: number;
  defectRate: number;
}

const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'Pacific Resin Industries',
    type: 'Raw Materials',
    category: 'PVC Resin',
    contactPerson: 'Michael Chen',
    phone: '+63 2 8123 4567',
    email: 'michael@pacificresin.com',
    address: '100 Industrial Park',
    city: 'Calamba',
    country: 'Philippines',
    paymentTerms: '45 Days',
    currency: 'PHP',
    totalPurchasesYTD: 45000000,
    totalPurchasesLifetime: 180000000,
    orderCount: 48,
    lastPurchaseDate: '2026-02-23',
    accountSince: '2020-01-15',
    status: 'Active',
    performanceScore: 94,
    qualityRating: 4.8,
    deliveryRating: 4.9,
    avgLeadTime: 5,
    onTimeDeliveryRate: 96,
    defectRate: 0.5,
    avgOrderValue: 937500,
    preferredSupplier: true,
    riskLevel: 'Low',
  },
  {
    id: 'SUP-002',
    name: 'Global Chemicals Corp',
    type: 'Chemicals',
    category: 'Stabilizers & Additives',
    contactPerson: 'Sarah Johnson',
    phone: '+65 6234 5678',
    email: 'sarah@globalchem.com',
    address: '25 Chemical Avenue',
    city: 'Singapore',
    country: 'Singapore',
    paymentTerms: '60 Days',
    currency: 'USD',
    totalPurchasesYTD: 12500000,
    totalPurchasesLifetime: 52000000,
    orderCount: 36,
    lastPurchaseDate: '2026-02-20',
    accountSince: '2021-03-10',
    status: 'Active',
    performanceScore: 88,
    qualityRating: 4.5,
    deliveryRating: 4.3,
    avgLeadTime: 12,
    onTimeDeliveryRate: 89,
    defectRate: 1.2,
    avgOrderValue: 347222,
    preferredSupplier: true,
    riskLevel: 'Low',
  },
  {
    id: 'SUP-003',
    name: 'FlexiPack Solutions',
    type: 'Packaging',
    category: 'Boxes & Labels',
    contactPerson: 'Roberto Garcia',
    phone: '+63 2 8345 6789',
    email: 'roberto@flexipack.ph',
    address: '456 Packaging Road',
    city: 'Muntinlupa',
    country: 'Philippines',
    paymentTerms: '30 Days',
    currency: 'PHP',
    totalPurchasesYTD: 8500000,
    totalPurchasesLifetime: 28000000,
    orderCount: 52,
    lastPurchaseDate: '2026-02-24',
    accountSince: '2020-08-20',
    status: 'Active',
    performanceScore: 76,
    qualityRating: 3.8,
    deliveryRating: 3.5,
    avgLeadTime: 8,
    onTimeDeliveryRate: 72,
    defectRate: 3.5,
    avgOrderValue: 163462,
    preferredSupplier: false,
    riskLevel: 'Medium',
  },
  {
    id: 'SUP-004',
    name: 'MegaMachinery Inc',
    type: 'Equipment',
    category: 'Extrusion Machines',
    contactPerson: 'David Wang',
    phone: '+86 21 5678 9012',
    email: 'david@megamachinery.cn',
    address: '789 Industrial Zone',
    city: 'Shanghai',
    country: 'China',
    paymentTerms: '90 Days',
    currency: 'USD',
    totalPurchasesYTD: 25000000,
    totalPurchasesLifetime: 85000000,
    orderCount: 12,
    lastPurchaseDate: '2026-01-15',
    accountSince: '2019-05-12',
    status: 'Active',
    performanceScore: 82,
    qualityRating: 4.2,
    deliveryRating: 3.8,
    avgLeadTime: 45,
    onTimeDeliveryRate: 75,
    defectRate: 2.0,
    avgOrderValue: 2083333,
    preferredSupplier: false,
    riskLevel: 'Medium',
  },
  {
    id: 'SUP-005',
    name: 'QuickFix Maintenance Services',
    type: 'Services',
    category: 'Equipment Maintenance',
    contactPerson: 'Carlos Reyes',
    phone: '+63 917 234 5678',
    email: 'carlos@quickfix.ph',
    address: '321 Service Street',
    city: 'Taguig',
    country: 'Philippines',
    paymentTerms: '15 Days',
    currency: 'PHP',
    totalPurchasesYTD: 3200000,
    totalPurchasesLifetime: 12000000,
    orderCount: 64,
    lastPurchaseDate: '2026-02-22',
    accountSince: '2022-02-01',
    status: 'Active',
    performanceScore: 91,
    qualityRating: 4.6,
    deliveryRating: 4.8,
    avgLeadTime: 2,
    onTimeDeliveryRate: 94,
    defectRate: 0.8,
    avgOrderValue: 50000,
    preferredSupplier: true,
    riskLevel: 'Low',
  },
  {
    id: 'SUP-006',
    name: 'Budget Materials Trading',
    type: 'Raw Materials',
    category: 'PVC Resin',
    contactPerson: 'Juan Dela Cruz',
    phone: '+63 2 8456 7890',
    email: 'juan@budgetmaterials.ph',
    address: '654 Trading Avenue',
    city: 'Manila',
    country: 'Philippines',
    paymentTerms: '30 Days',
    currency: 'PHP',
    totalPurchasesYTD: 18000000,
    totalPurchasesLifetime: 42000000,
    orderCount: 28,
    lastPurchaseDate: '2026-02-10',
    accountSince: '2021-11-05',
    status: 'Active',
    performanceScore: 58,
    qualityRating: 3.2,
    deliveryRating: 2.8,
    avgLeadTime: 14,
    onTimeDeliveryRate: 58,
    defectRate: 5.8,
    avgOrderValue: 642857,
    preferredSupplier: false,
    riskLevel: 'High',
  },
];

type ViewMode = 'overview' | 'performance' | 'spending' | 'materials';

export function SuppliersPage() {
  const { branch } = useAppContext();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterRisk, setFilterRisk] = useState<string>('All');

  // Filter suppliers
  const filteredSuppliers = MOCK_SUPPLIERS.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         supplier.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || supplier.type === filterType;
    const matchesRisk = filterRisk === 'All' || supplier.riskLevel === filterRisk;
    return matchesSearch && matchesType && matchesRisk;
  });

  // Mock purchase history
  const purchaseHistory: PurchaseHistory[] = [
    { month: 'Aug', amount: 12500000, orders: 38 },
    { month: 'Sep', amount: 14200000, orders: 42 },
    { month: 'Oct', amount: 13800000, orders: 40 },
    { month: 'Nov', amount: 15600000, orders: 45 },
    { month: 'Dec', amount: 14100000, orders: 41 },
    { month: 'Jan', amount: 13900000, orders: 39 },
    { month: 'Feb', amount: 12800000, orders: 35 },
  ];

  const topPurchases: TopPurchase[] = [
    { materialName: 'PVC Resin SG-5', quantity: 850000, totalValue: 42500000, frequency: 12, avgPrice: 50 },
    { materialName: 'Calcium Stearate', quantity: 45000, totalValue: 6750000, frequency: 10, avgPrice: 150 },
    { materialName: 'TiO2 Pigment', quantity: 28000, totalValue: 8400000, frequency: 8, avgPrice: 300 },
    { materialName: 'Cardboard Boxes', quantity: 125000, totalValue: 3750000, frequency: 15, avgPrice: 30 },
    { materialName: 'Heat Stabilizer', quantity: 18000, totalValue: 5400000, frequency: 9, avgPrice: 300 },
  ];

  const supplierPerformance: SupplierPerformance[] = MOCK_SUPPLIERS.map(s => ({
    supplier: s.name,
    onTimeDelivery: s.onTimeDeliveryRate,
    qualityScore: s.qualityRating * 20,
    leadTime: s.avgLeadTime,
    defectRate: s.defectRate,
  })).sort((a, b) => b.onTimeDelivery - a.onTimeDelivery);

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'warning';
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

  const formatCurrency = (amount: number, currency: string = 'PHP') => {
    if (currency === 'USD') {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    return `₱${(amount / 1000000).toFixed(2)}M`;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track purchases, spending patterns & supplier performance for <span className="font-medium text-gray-700">{branch}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Procurement Reports
          </Button>
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Add New Supplier
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{MOCK_SUPPLIERS.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Factory className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Preferred Suppliers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {MOCK_SUPPLIERS.filter(s => s.preferredSupplier).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">YTD Spending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(MOCK_SUPPLIERS.reduce((sum, s) => sum + s.totalPurchasesYTD, 0))}
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
                <p className="text-sm text-gray-500">Total Orders YTD</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {MOCK_SUPPLIERS.reduce((sum, s) => sum + s.orderCount, 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Performance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {Math.round(MOCK_SUPPLIERS.reduce((sum, s) => sum + s.performanceScore, 0) / MOCK_SUPPLIERS.length)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: 'Supplier Overview', icon: <Factory className="w-4 h-4" /> },
            { id: 'performance', label: 'Performance Metrics', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'spending', label: 'Spending Analysis', icon: <DollarSign className="w-4 h-4" /> },
            { id: 'materials', label: 'Materials Tracking', icon: <Package className="w-4 h-4" /> },
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

      {/* SUPPLIER OVERVIEW */}
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
                    placeholder="Search by supplier name, contact person, or category..."
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
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Chemicals">Chemicals</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Services">Services</option>
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

          {/* Supplier List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Supplier Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${
                        supplier.type === 'Raw Materials' ? 'bg-blue-100' :
                        supplier.type === 'Chemicals' ? 'bg-purple-100' :
                        supplier.type === 'Packaging' ? 'bg-orange-100' :
                        supplier.type === 'Equipment' ? 'bg-red-100' :
                        'bg-green-100'
                      }`}>
                        <Factory className={`w-6 h-6 ${
                          supplier.type === 'Raw Materials' ? 'text-blue-600' :
                          supplier.type === 'Chemicals' ? 'text-purple-600' :
                          supplier.type === 'Packaging' ? 'text-orange-600' :
                          supplier.type === 'Equipment' ? 'text-red-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{supplier.name}</h3>
                          {supplier.preferredSupplier && (
                            <Badge variant="success">
                              <Award className="w-3 h-3 mr-1" />
                              Preferred
                            </Badge>
                          )}
                          <Badge variant={getStatusColor(supplier.status)}>{supplier.status}</Badge>
                          <Badge variant={getRiskColor(supplier.riskLevel)}>{supplier.riskLevel} Risk</Badge>
                          <span className="text-xs text-gray-500">{supplier.id}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-gray-500 text-xs">Category</div>
                              <div className="text-gray-900 font-medium">{supplier.category}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-gray-500 text-xs">Contact Person</div>
                              <div className="text-gray-900">{supplier.contactPerson}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-gray-500 text-xs">Location</div>
                              <div className="text-gray-900">{supplier.city}, {supplier.country}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-gray-500 text-xs">Payment Terms</div>
                              <div className="text-gray-900">{supplier.paymentTerms}</div>
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
                        onClick={() => setSelectedSupplier(supplier)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Performance & Financial Summary */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">YTD Spending</div>
                        <div className="text-sm font-bold text-blue-600">
                          {formatCurrency(supplier.totalPurchasesYTD, supplier.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Total Orders</div>
                        <div className="text-sm font-bold text-gray-900">{supplier.orderCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Avg Order Value</div>
                        <div className="text-sm font-bold text-green-600">
                          {formatCurrency(supplier.avgOrderValue, supplier.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Performance Score</div>
                        <Badge variant={getPerformanceColor(supplier.performanceScore)}>
                          {supplier.performanceScore}/100
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Quality Rating</div>
                        {renderStars(supplier.qualityRating)}
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Last Purchase</div>
                        <div className="text-sm font-medium text-gray-900">{supplier.lastPurchaseDate}</div>
                      </div>
                    </div>

                    {/* Key Metrics Bar */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">On-Time Delivery</span>
                          <span className="text-gray-900 font-medium">{supplier.onTimeDeliveryRate}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              supplier.onTimeDeliveryRate >= 90 ? 'bg-green-600' :
                              supplier.onTimeDeliveryRate >= 75 ? 'bg-orange-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${supplier.onTimeDeliveryRate}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Avg Lead Time</span>
                          <span className="text-gray-900 font-medium">{supplier.avgLeadTime} days</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              supplier.avgLeadTime <= 7 ? 'bg-green-600' :
                              supplier.avgLeadTime <= 21 ? 'bg-orange-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${Math.min((30 - supplier.avgLeadTime) / 30 * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Defect Rate</span>
                          <span className="text-gray-900 font-medium">{supplier.defectRate}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              supplier.defectRate <= 1 ? 'bg-green-600' :
                              supplier.defectRate <= 3 ? 'bg-orange-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(supplier.defectRate * 10, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PERFORMANCE METRICS */}
      {viewMode === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Comparison Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-red-600" />
                  Supplier Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={supplierPerformance} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="supplier" stroke="#9CA3AF" angle={-30} textAnchor="end" height={90} tickMargin={8} tick={{ fontSize: 13, fill: "#374151" }} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Legend />
                    <Bar dataKey="onTimeDelivery" fill="#10B981" name="On-Time Delivery %" />
                    <Bar dataKey="qualityScore" fill="#3B82F6" name="Quality Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lead Time Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-red-600" />
                  Average Lead Time (Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={supplierPerformance} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis dataKey="supplier" type="category" stroke="#9CA3AF" width={150} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Bar dataKey="leadTime" fill="#F59E0B" name="Lead Time (Days)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Defect Rate Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Defect Rate Comparison (%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={supplierPerformance} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis dataKey="supplier" type="category" stroke="#9CA3AF" width={150} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Bar dataKey="defectRate" fill="#EF4444" name="Defect Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">On-Time Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Defect Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {MOCK_SUPPLIERS.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Factory className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">{supplier.name}</div>
                              {supplier.preferredSupplier && (
                                <Badge variant="success" className="text-xs mt-1">Preferred</Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supplier.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getPerformanceColor(supplier.performanceScore)}>
                            {supplier.performanceScore}/100
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStars(supplier.qualityRating)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStars(supplier.deliveryRating)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-medium ${
                            supplier.onTimeDeliveryRate >= 90 ? 'text-green-600' :
                            supplier.onTimeDeliveryRate >= 75 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {supplier.onTimeDeliveryRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {supplier.avgLeadTime} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-medium ${
                            supplier.defectRate <= 1 ? 'text-green-600' :
                            supplier.defectRate <= 3 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {supplier.defectRate}%
                          </span>
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

      {/* SPENDING ANALYSIS */}
      {viewMode === 'spending' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Spending Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  Purchase Spending Trend (7 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={purchaseHistory}>
                    <defs>
                      <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05}/>
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
                      stroke="#EF4444"
                      strokeWidth={3}
                      fill="url(#colorSpending)"
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

            {/* Supplier Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-red-600" />
                  Spending by Supplier Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Raw Materials', value: MOCK_SUPPLIERS.filter(s => s.type === 'Raw Materials').reduce((sum, s) => sum + s.totalPurchasesYTD, 0) },
                        { name: 'Chemicals', value: MOCK_SUPPLIERS.filter(s => s.type === 'Chemicals').reduce((sum, s) => sum + s.totalPurchasesYTD, 0) },
                        { name: 'Packaging', value: MOCK_SUPPLIERS.filter(s => s.type === 'Packaging').reduce((sum, s) => sum + s.totalPurchasesYTD, 0) },
                        { name: 'Equipment', value: MOCK_SUPPLIERS.filter(s => s.type === 'Equipment').reduce((sum, s) => sum + s.totalPurchasesYTD, 0) },
                        { name: 'Services', value: MOCK_SUPPLIERS.filter(s => s.type === 'Services').reduce((sum, s) => sum + s.totalPurchasesYTD, 0) },
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Suppliers by Spending */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  Top Suppliers by Spending (YTD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_SUPPLIERS
                    .sort((a, b) => b.totalPurchasesYTD - a.totalPurchasesYTD)
                    .slice(0, 5)
                    .map((supplier, index) => {
                      const percentage = (supplier.totalPurchasesYTD / MOCK_SUPPLIERS.reduce((sum, s) => sum + s.totalPurchasesYTD, 0)) * 100;
                      return (
                        <div key={supplier.id}>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full text-red-600 font-bold text-xs">
                                {index + 1}
                              </div>
                              <span className="text-gray-900 font-medium">{supplier.name}</span>
                            </div>
                            <span className="text-gray-900 font-bold">
                              {formatCurrency(supplier.totalPurchasesYTD, supplier.currency)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-600"
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

          {/* Spending Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Spending Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">YTD Spending</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lifetime Spending</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Order Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {MOCK_SUPPLIERS
                      .sort((a, b) => b.totalPurchasesYTD - a.totalPurchasesYTD)
                      .map((supplier) => (
                        <tr key={supplier.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Factory className="w-4 h-4 text-gray-400" />
                              <div className="font-medium text-gray-900">{supplier.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="default">{supplier.type}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600">
                            {formatCurrency(supplier.totalPurchasesYTD, supplier.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {formatCurrency(supplier.totalPurchasesLifetime, supplier.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                            {supplier.orderCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-green-600">
                            {formatCurrency(supplier.avgOrderValue, supplier.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="default">{supplier.currency}</Badge>
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

      {/* MATERIALS TRACKING */}
      {viewMode === 'materials' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Materials Purchased</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Frequency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price/Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg per Order</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {topPurchases.map((material, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg text-blue-600 font-bold">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <div className="font-medium text-gray-900">{material.materialName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                          {material.quantity.toLocaleString()} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-bold">
                          {formatCurrency(material.totalValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="default">{material.frequency} orders</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          ₱{material.avgPrice}/kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {Math.round(material.quantity / material.frequency).toLocaleString()} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Material Price Trends - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpDown className="w-5 h-5 text-red-600" />
                Material Price Trends & Forecasting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Zap className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">Price Trend Analytics</p>
                <p className="text-sm">Track historical pricing, identify cost-saving opportunities, and forecast future material costs</p>
                <Button variant="primary" className="mt-4">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Price Trends Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
