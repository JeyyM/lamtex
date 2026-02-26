import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  Truck,
  AlertTriangle,
  CheckCircle,
  Target,
  Award,
  Activity,
  Zap,
  Brain,
  LineChart,
  Filter,
  Search,
  Share2,
  Printer,
  Mail,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Factory,
  Building2,
  Star,
  Clock,
  PackageCheck,
  TrendingUpDown,
  Wallet,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
} from 'recharts';

// Report types
interface SalesReport {
  period: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  growth: number;
}

interface AgentPerformance {
  name: string;
  sales: number;
  orders: number;
  customers: number;
  commission: number;
  performance: number;
  target: number;
}

interface ProductPerformance {
  product: string;
  unitsSold: number;
  revenue: number;
  growth: number;
  margin: number;
  stockLevel: number;
}

interface StockPrediction {
  material: string;
  currentStock: number;
  avgConsumption: number;
  daysRemaining: number;
  predictedStockout: string;
  reorderPoint: number;
  status: 'Safe' | 'Warning' | 'Critical';
}

interface BranchPerformance {
  branch: string;
  revenue: number;
  orders: number;
  growth: number;
  efficiency: number;
  customerSat: number;
}

const MOCK_SALES_REPORT: SalesReport[] = [
  { period: 'Jan 2025', revenue: 45200000, orders: 428, avgOrderValue: 105607, growth: 8.5 },
  { period: 'Feb 2025', revenue: 48500000, orders: 452, avgOrderValue: 107301, growth: 7.3 },
  { period: 'Mar 2025', revenue: 52100000, orders: 485, avgOrderValue: 107423, growth: 7.4 },
  { period: 'Apr 2025', revenue: 49800000, orders: 467, avgOrderValue: 106639, growth: -4.4 },
  { period: 'May 2025', revenue: 54300000, orders: 502, avgOrderValue: 108167, growth: 9.0 },
  { period: 'Jun 2025', revenue: 57600000, orders: 528, avgOrderValue: 109091, growth: 6.1 },
  { period: 'Jul 2025', revenue: 61200000, orders: 556, avgOrderValue: 110072, growth: 6.3 },
  { period: 'Aug 2025', revenue: 59800000, orders: 542, avgOrderValue: 110332, growth: -2.3 },
  { period: 'Sep 2025', revenue: 63500000, orders: 578, avgOrderValue: 109861, growth: 6.2 },
  { period: 'Oct 2025', revenue: 67100000, orders: 601, avgOrderValue: 111648, growth: 5.7 },
  { period: 'Nov 2025', revenue: 70800000, orders: 632, avgOrderValue: 112025, growth: 5.5 },
  { period: 'Dec 2025', revenue: 74200000, orders: 658, avgOrderValue: 112766, growth: 4.8 },
  { period: 'Jan 2026', revenue: 68500000, orders: 612, avgOrderValue: 111928, growth: -7.7 },
  { period: 'Feb 2026 (YTD)', revenue: 42300000, orders: 385, avgOrderValue: 109870, growth: -12.8 },
];

const MOCK_AGENT_PERFORMANCE: AgentPerformance[] = [
  { name: 'Pedro Reyes', sales: 28500000, orders: 142, customers: 38, commission: 855000, performance: 114, target: 25000000 },
  { name: 'Juan Dela Cruz', sales: 32100000, orders: 156, customers: 42, commission: 963000, performance: 107, target: 30000000 },
  { name: 'Rosa Martinez', sales: 19800000, orders: 98, customers: 28, commission: 594000, performance: 99, target: 20000000 },
  { name: 'Maria Santos', sales: 24200000, orders: 124, customers: 35, commission: 726000, performance: 121, target: 20000000 },
  { name: 'Carlos Reyes', sales: 15600000, orders: 82, customers: 24, commission: 468000, performance: 78, target: 20000000 },
];

const MOCK_PRODUCT_PERFORMANCE: ProductPerformance[] = [
  { product: 'PVC Pipe 2" Class 150', unitsSold: 45800, revenue: 22900000, growth: 12.5, margin: 28, stockLevel: 8200 },
  { product: 'PVC Pipe 4" Class 150', unitsSold: 28400, revenue: 42600000, growth: 8.3, margin: 32, stockLevel: 4800 },
  { product: 'PVC Pipe 6" Class 150', unitsSold: 12200, revenue: 30500000, growth: -2.1, margin: 30, stockLevel: 2100 },
  { product: 'Solvent Cement 100ml', unitsSold: 82500, revenue: 3712500, growth: 15.8, margin: 45, stockLevel: 15600 },
  { product: 'Garden Hose 1/2" 10m', unitsSold: 18900, revenue: 4725000, growth: 6.2, margin: 38, stockLevel: 3200 },
  { product: 'PVC Elbow 2" 90°', unitsSold: 65200, revenue: 4564000, growth: 10.1, margin: 42, stockLevel: 12500 },
  { product: 'PVC Tee 2"', unitsSold: 48600, revenue: 4374000, growth: 7.8, margin: 40, stockLevel: 9200 },
  { product: 'PVC Coupling 2"', unitsSold: 72400, revenue: 3620000, growth: 14.2, margin: 44, stockLevel: 14800 },
];

const MOCK_STOCK_PREDICTIONS: StockPrediction[] = [
  { material: 'PVC Resin SG-5', currentStock: 125000, avgConsumption: 15000, daysRemaining: 8, predictedStockout: '2026-03-05', reorderPoint: 45000, status: 'Critical' },
  { material: 'Calcium Stearate', currentStock: 8500, avgConsumption: 800, daysRemaining: 11, predictedStockout: '2026-03-08', reorderPoint: 2400, status: 'Warning' },
  { material: 'TiO2 Pigment', currentStock: 12500, avgConsumption: 450, daysRemaining: 28, predictedStockout: '2026-03-25', reorderPoint: 1350, status: 'Safe' },
  { material: 'Heat Stabilizer', currentStock: 3200, avgConsumption: 380, daysRemaining: 8, predictedStockout: '2026-03-05', reorderPoint: 1140, status: 'Critical' },
  { material: 'Cardboard Boxes', currentStock: 45000, avgConsumption: 5200, daysRemaining: 9, predictedStockout: '2026-03-06', reorderPoint: 15600, status: 'Warning' },
  { material: 'Label Sheets', currentStock: 185000, avgConsumption: 8500, daysRemaining: 22, predictedStockout: '2026-03-19', reorderPoint: 25500, status: 'Safe' },
];

const MOCK_BRANCH_PERFORMANCE: BranchPerformance[] = [
  { branch: 'Branch A', revenue: 48200000, orders: 452, growth: 8.5, efficiency: 92, customerSat: 4.6 },
  { branch: 'Branch B', revenue: 38500000, orders: 368, growth: 12.3, efficiency: 88, customerSat: 4.4 },
  { branch: 'Branch C', revenue: 33600000, orders: 312, growth: 6.8, efficiency: 85, customerSat: 4.3 },
];

type ViewMode = 'overview' | 'sales' | 'agents' | 'products' | 'inventory' | 'predictions';
type TimeRange = '7D' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

export function ReportsPage() {
  const { branch } = useAppContext();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return `₱${(amount / 1000000).toFixed(2)}M`;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    if (growth < 0) return <ArrowDownRight className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 100) return 'success';
    if (performance >= 80) return 'warning';
    return 'danger';
  };

  const getStockStatusColor = (status: string) => {
    if (status === 'Safe') return 'success';
    if (status === 'Warning') return 'warning';
    return 'danger';
  };

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comprehensive business intelligence, performance metrics & predictive analytics for <span className="font-medium text-gray-700">{branch}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="7D">Last 7 Days</option>
            <option value="1M">Last Month</option>
            <option value="3M">Last 3 Months</option>
            <option value="6M">Last 6 Months</option>
            <option value="1Y">Last Year</option>
            <option value="YTD">Year to Date</option>
            <option value="ALL">All Time</option>
          </select>
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="primary">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* SALES ANALYTICS */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
          <DollarSign className="w-6 h-6 text-red-600" />
          Sales Performance
        </h2>
        
        {/* Sales KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(MOCK_SALES_REPORT.reduce((sum, r) => sum + r.revenue, 0))}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {getGrowthIcon(8.2)}
                    <span className={`text-xs font-medium ${getGrowthColor(8.2)}`}>+8.2% avg growth</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {MOCK_SALES_REPORT.reduce((sum, r) => sum + r.orders, 0).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {getGrowthIcon(6.5)}
                    <span className={`text-xs font-medium ${getGrowthColor(6.5)}`}>+6.5% avg growth</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₱109K</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getGrowthIcon(1.8)}
                    <span className={`text-xs font-medium ${getGrowthColor(1.8)}`}>+1.8% growth</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Current Month</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(42300000)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {getGrowthIcon(-12.8)}
                    <span className={`text-xs font-medium ${getGrowthColor(-12.8)}`}>-12.8% vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-red-600" />
                Monthly Sales Performance with Growth Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={MOCK_SALES_REPORT} margin={{ bottom: 40, top: 10, left: 10, right: 10 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="period" stroke="#9CA3AF" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#9CA3AF" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'Revenue') return formatCurrency(value);
                      if (name === 'Growth %') return `${value.toFixed(1)}%`;
                      return value;
                    }}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={3}
                    fill="url(#colorSales)"
                    name="Revenue"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="growth"
                    fill="#F59E0B"
                    name="Growth %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-red-600" />
                Revenue Distribution by Branch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={MOCK_BRANCH_PERFORMANCE.map(b => ({ name: b.branch, value: b.revenue }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {MOCK_BRANCH_PERFORMANCE.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-600" />
                Average Order Value Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={MOCK_SALES_REPORT.slice(-6)}>
                  <defs>
                    <linearGradient id="colorAOV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="period" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    formatter={(value: number) => `₱${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="aov"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    fill="url(#colorAOV)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AGENT PERFORMANCE */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
          <Users className="w-6 h-6 text-red-600" />
          Agent Performance
        </h2>
        
        {/* Agent KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Top Performer</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">Juan Dela Cruz</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Award className="w-3 h-3 text-yellow-500" />
                    <span className={`text-xs font-medium ${getGrowthColor(7)}`}>₱32.1M sales</span>
                  </div>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Agents</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {MOCK_AGENT_PERFORMANCE.length}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs font-medium text-gray-600">All active</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Achievement</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {Math.round(MOCK_AGENT_PERFORMANCE.reduce((sum, a) => sum + a.performance, 0) / MOCK_AGENT_PERFORMANCE.length)}%
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {getGrowthIcon(3.8)}
                    <span className={`text-xs font-medium ${getGrowthColor(3.8)}`}>Above target</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Commission</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₱{(MOCK_AGENT_PERFORMANCE.reduce((sum, a) => sum + a.commission, 0) / 1000000).toFixed(2)}M
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign className="w-3 h-3 text-green-500" />
                    <span className="text-xs font-medium text-gray-600">This period</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Wallet className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-red-600" />
                Agent Performance vs Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={MOCK_AGENT_PERFORMANCE} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#9CA3AF" angle={-30} textAnchor="end" height={90} tickMargin={8} tick={{ fontSize: 13, fill: "#374151" }} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}/>
                  <Bar dataKey="performance" fill="#10B981" name="Achievement %" />
                  <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="3 3" label="Target" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-600" />
                Sales by Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={MOCK_AGENT_PERFORMANCE} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={100} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="sales" fill="#3B82F6" name="Sales" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PRODUCT ANALYSIS */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
          <Package className="w-6 h-6 text-red-600" />
          Product Performance
        </h2>
        
        {/* Product KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Top Product</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">PVC 4" C150</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-orange-500" />
                    <span className="text-xs font-medium text-gray-600">₱42.6M revenue</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Star className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {MOCK_PRODUCT_PERFORMANCE.length}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Package className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600">Active SKUs</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Profit Margin</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {Math.round(MOCK_PRODUCT_PERFORMANCE.reduce((sum, p) => sum + p.margin, 0) / MOCK_PRODUCT_PERFORMANCE.length)}%
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className={`text-xs font-medium ${getGrowthColor(2.3)}`}>Healthy margins</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Fast Growing</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {MOCK_PRODUCT_PERFORMANCE.filter(p => p.growth > 10).length}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className={`text-xs font-medium ${getGrowthColor(15.8)}`}>&gt;10% growth</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-red-600" />
                Top 5 Products by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={MOCK_PRODUCT_PERFORMANCE.slice(0, 5)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis dataKey="product" type="category" stroke="#9CA3AF" width={120} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="revenue" fill="#F59E0B" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                Product Growth Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={MOCK_PRODUCT_PERFORMANCE} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="product" stroke="#9CA3AF" angle={-30} textAnchor="end" height={90} tickMargin={8} tick={{ fontSize: 13, fill: "#374151" }} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="growth" fill="#10B981" name="Growth %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RAW MATERIALS & INVENTORY */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
          <PackageCheck className="w-6 h-6 text-red-600" />
          Raw Materials & Inventory
        </h2>
        
        {/* Inventory KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Critical Alerts</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {MOCK_STOCK_PREDICTIONS.filter(s => s.status === 'Critical').length}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="text-xs font-medium text-red-600">Need immediate action</span>
                  </div>
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
                  <p className="text-sm text-gray-500">Warning Level</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {MOCK_STOCK_PREDICTIONS.filter(s => s.status === 'Warning').length}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-orange-500" />
                    <span className="text-xs font-medium text-orange-600">Plan reorder soon</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Safe Stock</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {MOCK_STOCK_PREDICTIONS.filter(s => s.status === 'Safe').length}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs font-medium text-green-600">Adequate inventory</span>
                  </div>
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
                  <p className="text-sm text-gray-500">Total Materials</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {MOCK_STOCK_PREDICTIONS.length}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <PackageCheck className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600">Being tracked</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <PackageCheck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-red-600" />
                Current Stock Status by Material
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={MOCK_STOCK_PREDICTIONS.slice(0, 7)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis dataKey="material" type="category" stroke="#9CA3AF" width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="currentStock" fill="#3B82F6" name="Current Stock" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Stock Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Critical', value: MOCK_STOCK_PREDICTIONS.filter(s => s.status === 'Critical').length },
                      { name: 'Warning', value: MOCK_STOCK_PREDICTIONS.filter(s => s.status === 'Warning').length },
                      { name: 'Safe', value: MOCK_STOCK_PREDICTIONS.filter(s => s.status === 'Safe').length },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#EF4444" />
                    <Cell fill="#F59E0B" />
                    <Cell fill="#10B981" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BRANCH COMPARISON */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
          <Building2 className="w-6 h-6 text-red-600" />
          Branch Performance Comparison
        </h2>
        
        {/* Branch KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MOCK_BRANCH_PERFORMANCE.map((branch, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-500">{branch.branch}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(branch.revenue)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    index === 0 ? 'bg-blue-100' :
                    index === 1 ? 'bg-green-100' :
                    'bg-purple-100'
                  }`}>
                    <Building2 className={`w-6 h-6 ${
                      index === 0 ? 'text-blue-600' :
                      index === 1 ? 'text-green-600' :
                      'text-purple-600'
                    }`} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Orders</span>
                    <span className="font-medium text-gray-900">{branch.orders}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Growth</span>
                    <span className={`font-medium ${getGrowthColor(branch.growth)}`}>
                      {branch.growth > 0 ? '+' : ''}{branch.growth}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Efficiency</span>
                    <span className="font-medium text-gray-900">{branch.efficiency}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Customer Satisfaction</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-gray-900">{branch.customerSat}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Branch Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-600" />
                Revenue by Branch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={MOCK_BRANCH_PERFORMANCE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="branch" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                Branch Efficiency & Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={MOCK_BRANCH_PERFORMANCE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="branch" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Legend />
                  <Bar dataKey="efficiency" fill="#10B981" name="Efficiency %" />
                  <Bar dataKey="growth" fill="#F59E0B" name="Growth %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'sales', label: 'Sales Analytics', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'agents', label: 'Agent Performance', icon: <Users className="w-4 h-4" /> },
            { id: 'products', label: 'Product Analysis', icon: <Package className="w-4 h-4" /> },
            { id: 'inventory', label: 'Inventory Reports', icon: <PackageCheck className="w-4 h-4" /> },
            { id: 'predictions', label: 'AI Predictions', icon: <Brain className="w-4 h-4" /> },
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

      {/* OVERVIEW */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  Revenue Trend (14 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={MOCK_SALES_REPORT} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="period" stroke="#9CA3AF" angle={-30} textAnchor="end" height={90} tickMargin={8} tick={{ fontSize: 13, fill: "#374151" }} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'Revenue') return formatCurrency(value);
                        if (name === 'Avg Order Value') return `₱${value.toLocaleString()}`;
                        return value;
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fill="url(#colorRevenue)"
                      name="Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Orders"
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Branch Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-red-600" />
                  Branch Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MOCK_BRANCH_PERFORMANCE}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="branch" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'Revenue') return formatCurrency(value);
                        return value;
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                    <Bar dataKey="orders" fill="#10B981" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Reports Menu */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Report Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { name: 'Sales Summary Report', icon: <DollarSign className="w-4 h-4" />, color: 'blue' },
                    { name: 'Customer Report', icon: <Building2 className="w-4 h-4" />, color: 'green' },
                    { name: 'Inventory Report', icon: <Package className="w-4 h-4" />, color: 'orange' },
                    { name: 'Agent Commission Report', icon: <Users className="w-4 h-4" />, color: 'purple' },
                    { name: 'Financial Statement', icon: <FileText className="w-4 h-4" />, color: 'red' },
                    { name: 'Production Report', icon: <Factory className="w-4 h-4" />, color: 'yellow' },
                  ].map((report, index) => (
                    <div
                      key={index}
                      className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 bg-${report.color}-100 rounded-lg`}>
                          {report.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{report.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SALES ANALYTICS */}
      {viewMode === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Sales with Growth */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-red-600" />
                  Monthly Sales Performance with Growth Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={MOCK_SALES_REPORT} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="period" stroke="#9CA3AF" angle={-30} textAnchor="end" height={90} tickMargin={8} tick={{ fontSize: 13, fill: "#374151" }} />
                    <YAxis yAxisId="left" stroke="#9CA3AF" />
                    <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'Revenue') return formatCurrency(value);
                        if (name === 'Growth %') return `${value.toFixed(1)}%`;
                        return value;
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={3}
                      fill="url(#colorSales)"
                      name="Revenue"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="growth"
                      fill="#F59E0B"
                      name="Growth %"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sales by Branch */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-red-600" />
                  Revenue Distribution by Branch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={MOCK_BRANCH_PERFORMANCE.map(b => ({ name: b.branch, value: b.revenue }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {MOCK_BRANCH_PERFORMANCE.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Average Order Value Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-600" />
                  Average Order Value Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={MOCK_SALES_REPORT.slice(-6)}>
                    <defs>
                      <linearGradient id="colorAOV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="period" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      formatter={(value: number) => `₱${value.toLocaleString()}`}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgOrderValue"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      fill="url(#colorAOV)"
                      name="Avg Order Value"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Monthly Sales Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Order Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Growth</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {MOCK_SALES_REPORT.slice(-6).reverse().map((report, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {report.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600">
                          {formatCurrency(report.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {report.orders.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          ₱{report.avgOrderValue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-medium ${getGrowthColor(report.growth)}`}>
                            {report.growth > 0 ? '+' : ''}{report.growth.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getGrowthIcon(report.growth)}
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

      {/* AGENT PERFORMANCE */}
      {viewMode === 'agents' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Agent Performance Comparison */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Agent Performance vs Target
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={MOCK_AGENT_PERFORMANCE}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'Sales' || name === 'Target') return formatCurrency(value);
                        return value;
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Legend />
                    <Bar dataKey="sales" fill="#10B981" name="Sales" />
                    <Bar dataKey="target" fill="#9CA3AF" name="Target" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Agent Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-600" />
                  Performance Radar Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={[
                    { metric: 'Sales', value: 85 },
                    { metric: 'Orders', value: 78 },
                    { metric: 'Customers', value: 92 },
                    { metric: 'Target Achievement', value: 104 },
                    { metric: 'Customer Retention', value: 88 },
                  ]}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="metric" stroke="#9CA3AF" />
                    <PolarRadiusAxis stroke="#9CA3AF" />
                    <Radar
                      dataKey="value"
                      stroke="#EF4444"
                      fill="#EF4444"
                      fillOpacity={0.3}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performers Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-red-600" />
                  Top Performers Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...MOCK_AGENT_PERFORMANCE]
                    .sort((a, b) => b.performance - a.performance)
                    .map((agent, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-600' :
                            'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{agent.name}</div>
                            <div className="text-sm text-gray-500">{agent.customers} customers</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{formatCurrency(agent.sales)}</div>
                          <Badge variant={getPerformanceColor(agent.performance)}>
                            {agent.performance}% of target
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Agent Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Agent Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Achievement</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {MOCK_AGENT_PERFORMANCE.map((agent, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{agent.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600">
                          {formatCurrency(agent.sales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {formatCurrency(agent.target)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden" style={{ width: '60px' }}>
                              <div
                                className={`h-full ${
                                  agent.performance >= 100 ? 'bg-green-600' :
                                  agent.performance >= 80 ? 'bg-orange-600' :
                                  'bg-red-600'
                                }`}
                                style={{ width: `${Math.min(agent.performance, 100)}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${
                              agent.performance >= 100 ? 'text-green-600' :
                              agent.performance >= 80 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {agent.performance}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {agent.orders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {agent.customers}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-green-600">
                          ₱{agent.commission.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getPerformanceColor(agent.performance)}>
                            {agent.performance >= 100 ? 'Exceeding' :
                             agent.performance >= 80 ? 'On Track' :
                             'Below Target'}
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

      {/* PRODUCT ANALYSIS */}
      {viewMode === 'products' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products by Revenue */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-red-600" />
                  Top Products by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={MOCK_PRODUCT_PERFORMANCE.slice(0, 6)} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis dataKey="product" type="category" stroke="#9CA3AF" width={180} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'Revenue') return formatCurrency(value);
                        return value;
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Product Growth Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpDown className="w-5 h-5 text-red-600" />
                  Product Growth Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'High Growth (>10%)', value: MOCK_PRODUCT_PERFORMANCE.filter(p => p.growth > 10).length },
                        { name: 'Moderate (5-10%)', value: MOCK_PRODUCT_PERFORMANCE.filter(p => p.growth >= 5 && p.growth <= 10).length },
                        { name: 'Low (0-5%)', value: MOCK_PRODUCT_PERFORMANCE.filter(p => p.growth >= 0 && p.growth < 5).length },
                        { name: 'Declining (<0%)', value: MOCK_PRODUCT_PERFORMANCE.filter(p => p.growth < 0).length },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#3B82F6" />
                      <Cell fill="#F59E0B" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Profit Margin Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  Profit Margin by Product
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={MOCK_PRODUCT_PERFORMANCE.slice(0, 5)} margin={{ bottom: 60, top: 10, left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="product" stroke="#9CA3AF" angle={-30} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      formatter={(value: number) => `${value}%`}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Bar dataKey="margin" fill="#10B981" name="Profit Margin %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Product Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Product Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units Sold</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Growth</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {MOCK_PRODUCT_PERFORMANCE.map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{product.product}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {product.unitsSold.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600">
                          {formatCurrency(product.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {getGrowthIcon(product.growth)}
                            <span className={`font-medium ${getGrowthColor(product.growth)}`}>
                              {product.growth > 0 ? '+' : ''}{product.growth.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="success">{product.margin}%</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {product.stockLevel.toLocaleString()} units
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.growth >= 10 ? (
                            <Badge variant="success">Excellent</Badge>
                          ) : product.growth >= 5 ? (
                            <Badge variant="default">Good</Badge>
                          ) : product.growth >= 0 ? (
                            <Badge variant="warning">Moderate</Badge>
                          ) : (
                            <Badge variant="danger">Declining</Badge>
                          )}
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

      {/* INVENTORY REPORTS */}
      {viewMode === 'inventory' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Inventory Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Consumption/Day</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Remaining</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Required</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {MOCK_STOCK_PREDICTIONS.map((stock, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <PackageCheck className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{stock.material}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                          {stock.currentStock.toLocaleString()} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-orange-600">
                          {stock.reorderPoint.toLocaleString()} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {stock.avgConsumption.toLocaleString()} kg/day
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-medium ${
                            stock.daysRemaining <= 7 ? 'text-red-600' :
                            stock.daysRemaining <= 14 ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            {stock.daysRemaining} days
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStockStatusColor(stock.status)}>
                            {stock.status === 'Critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {stock.status === 'Warning' && <Clock className="w-3 h-3 mr-1" />}
                            {stock.status === 'Safe' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {stock.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stock.status === 'Critical' ? (
                            <Button variant="primary" size="sm">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Order Now
                            </Button>
                          ) : stock.status === 'Warning' ? (
                            <Button variant="outline" size="sm">
                              <Clock className="w-3 h-3 mr-1" />
                              Plan Order
                            </Button>
                          ) : (
                            <span className="text-sm text-gray-500">No action needed</span>
                          )}
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

      {/* AI PREDICTIONS */}
      {viewMode === 'predictions' && (
        <div className="space-y-6">
          {/* Stock Prediction Alert */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Critical Stock Predictions - Immediate Action Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_STOCK_PREDICTIONS.filter(s => s.status === 'Critical').map((stock, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium text-gray-900">{stock.material}</div>
                        <div className="text-sm text-gray-600">
                          Only {stock.daysRemaining} days remaining • Stockout predicted: {stock.predictedStockout}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {stock.currentStock.toLocaleString()} kg
                      </div>
                      <Button variant="primary" size="sm" className="mt-2">
                        <Package className="w-3 h-3 mr-1" />
                        Create PO Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Demand Forecasting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-red-600" />
                AI-Powered Demand Forecasting (Next 3 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={[
                  { month: 'Mar 2026', actual: 68500000, predicted: 71200000, confidence: 92 },
                  { month: 'Apr 2026', actual: null, predicted: 74800000, confidence: 88 },
                  { month: 'May 2026', actual: null, predicted: 78200000, confidence: 85 },
                  { month: 'Jun 2026', actual: null, predicted: 81500000, confidence: 82 },
                ]}>
                  <defs>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                        if (name === 'Actual' || name === 'Predicted') return formatCurrency(value);
                      if (name === 'Confidence') return `${value}%`;
                      return value;
                    }}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    fill="url(#colorPredicted)"
                    name="Predicted"
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    name="Actual"
                    dot={{ r: 4 }}
                  />
                  <Bar dataKey="confidence" fill="#10B981" name="Confidence %" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Predictive Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-600" />
                  AI-Generated Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: 'success', icon: <TrendingUp />, title: 'Revenue Growth Opportunity', description: 'Solvent Cement shows 15.8% growth. Consider increasing production capacity to meet rising demand.' },
                    { type: 'warning', icon: <AlertTriangle />, title: 'Stock Risk Alert', description: 'PVC Resin SG-5 will run out in 8 days. Urgent purchase order recommended to avoid production delays.' },
                    { type: 'info', icon: <Target />, title: 'Agent Performance', description: 'Maria Santos exceeded target by 21%. Consider expanding her territory or client base.' },
                    { type: 'danger', icon: <TrendingDown />, title: 'Declining Product', description: 'PVC Pipe 6" Class 150 shows -2.1% growth. Review pricing strategy or marketing approach.' },
                  ].map((insight, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      insight.type === 'success' ? 'bg-green-50 border-green-200' :
                      insight.type === 'warning' ? 'bg-orange-50 border-orange-200' :
                      insight.type === 'danger' ? 'bg-red-50 border-red-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          insight.type === 'success' ? 'bg-green-100 text-green-600' :
                          insight.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                          insight.type === 'danger' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {insight.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
                          <p className="text-sm text-gray-600">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-600" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { priority: 'Critical', action: 'Place emergency PO for PVC Resin SG-5 (90,000 kg)', deadline: 'Today' },
                    { priority: 'High', action: 'Review and reorder Heat Stabilizer (5,000 kg)', deadline: '2 days' },
                    { priority: 'Medium', action: 'Schedule production planning meeting for high-demand products', deadline: 'This week' },
                    { priority: 'Low', action: 'Analyze pricing strategy for declining products', deadline: 'Next week' },
                  ].map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          action.priority === 'Critical' ? 'danger' :
                          action.priority === 'High' ? 'warning' :
                          action.priority === 'Medium' ? 'default' :
                          'default'
                        }>
                          {action.priority}
                        </Badge>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{action.action}</div>
                          <div className="text-xs text-gray-500">Deadline: {action.deadline}</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Take Action
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
