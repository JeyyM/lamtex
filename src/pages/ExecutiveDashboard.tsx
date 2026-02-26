import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Package, 
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  FileText,
  Truck,
  ShoppingCart,
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
import { 
  getKPIsByBranch,
  getApprovalsByBranch,
  getSortedApprovals,
  getFinishedGoodsAlertsByBranch,
  getRawMaterialAlertsByBranch,
  getTopProductsByBranch,
  getTopStoresByBranch,
  getAgentPerformanceByBranch,
  BRANCH_PERFORMANCE,
  getCalendarEventsByBranch,
} from '@/src/mock/executiveDashboard';
import type { ApprovalOrder } from '@/src/types/executive';

export function ExecutiveDashboard() {
  const { branch } = useAppContext();
  const navigate = useNavigate();

  // Get branch-specific data (all data for filtering)
  const kpis = getKPIsByBranch(branch);
  const allApprovals = getSortedApprovals(getApprovalsByBranch(branch));
  const finishedGoodsAlerts = getFinishedGoodsAlertsByBranch(branch);
  const rawMaterialAlerts = getRawMaterialAlertsByBranch(branch);
  const topProducts = getTopProductsByBranch(branch).slice(0, 5);
  const topStores = getTopStoresByBranch(branch).slice(0, 5);
  const agentPerformance = getAgentPerformanceByBranch(branch).slice(0, 5);

  // Mock data for Strategic Insights
  const mockTopProducts = [
    { productName: 'HDPE Pipe 160mm SDR11', category: 'HDPE Products', revenue: 1500000, growth: 12 },
    { productName: 'UPVC Pipe 110mm Class D', category: 'UPVC Products', revenue: 2600000, growth: 8 },
    { productName: 'PPR Pipe 63mm PN20', category: 'PPR Products', revenue: 675000, growth: 15 },
    { productName: 'HDPE Fittings 90° Elbow', category: 'HDPE Products', revenue: 1100000, growth: 5 },
    { productName: 'UPVC Ball Valve 50mm', category: 'Accessories', revenue: 665000, growth: 18 },
  ];

  const mockTopStores = [
    { storeName: 'BuildMart Manila Central', location: 'Manila', orders: 45, revenue: 2200000 },
    { storeName: 'Home Depot Quezon City', location: 'QC', orders: 38, revenue: 1900000 },
    { storeName: 'Construction Plus Makati', location: 'Makati', orders: 32, revenue: 1400000 },
    { storeName: 'Hardware World Pasig', location: 'Pasig', orders: 28, revenue: 1300000 },
    { storeName: 'Builders Hub Mandaluyong', location: 'Mandaluyong', orders: 25, revenue: 1200000 },
  ];

  const mockAgentPerformance = [
    { agentName: 'Maria Santos', branch: 'Branch A', revenue: 3200000, orders: 85 },
    { agentName: 'Juan Reyes', branch: 'Branch B', revenue: 2800000, orders: 72 },
    { agentName: 'Ana Garcia', branch: 'Branch A', revenue: 2400000, orders: 68 },
    { agentName: 'Carlos Mendoza', branch: 'Branch C', revenue: 2100000, orders: 58 },
    { agentName: 'Sofia Cruz', branch: 'Branch B', revenue: 1900000, orders: 52 },
  ];

  // Filter CRITICAL approvals (operations-first approach)
  const criticalApprovals = allApprovals.filter((approval: ApprovalOrder) => {
    const isHighUrgency = (approval.urgencyScore || 0) >= 90;
    const isRedMargin = approval.marginImpact === 'Red';
    const isHighValue = approval.totalAmount > 200000 && approval.requestedDiscount > 15;
    return isHighUrgency || isRedMargin || isHighValue;
  });

  // Business exceptions - combine critical inventory and orders
  const criticalInventory = [
    ...finishedGoodsAlerts.filter(fg => fg.riskLevel === 'High').slice(0, 3),
    ...rawMaterialAlerts.filter(rm => rm.riskLevel === 'High').slice(0, 2),
  ];

  // Prepare chart data - Monthly Revenue & Orders Trend
  const monthlyTrend = [
    { month: 'Jan', revenue: 12500000, orders: 340, profit: 3750000 },
    { month: 'Feb', revenue: 13200000, orders: 365, profit: 3960000 },
    { month: 'Mar', revenue: 14800000, orders: 410, profit: 4440000 },
    { month: 'Apr', revenue: 13900000, orders: 385, profit: 4170000 },
    { month: 'May', revenue: 15600000, orders: 430, profit: 4680000 },
    { month: 'Jun', revenue: 16800000, orders: 465, profit: 5040000 },
  ];

  // Branch performance comparison
  const branchComparison = BRANCH_PERFORMANCE.map(bp => ({
    branch: bp.branch,
    sales: bp.sales / 1000000, // Convert to millions
    quota: bp.quota / 1000000,
    onTimeDelivery: bp.onTimeDelivery,
    stockouts: bp.stockouts,
    quotaAchievement: ((bp.sales / bp.quota) * 100).toFixed(0),
  }));

  // Product category revenue breakdown
  const categoryRevenue = [
    { name: 'HDPE Products', value: 5200000, percentage: 31 },
    { name: 'UPVC Products', value: 4800000, percentage: 28 },
    { name: 'PPR Products', value: 4200000, percentage: 25 },
    { name: 'Accessories', value: 2680000, percentage: 16 },
  ];

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'];

  const getMarginImpactColor = (impact: string) => {
    if (impact === 'Red') return 'text-red-600 bg-red-50 border-red-200';
    if (impact === 'Yellow') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '₱0';
    if (amount >= 1000000) return `₱${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `₱${(amount / 1000).toFixed(0)}k`;
    return `₱${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            {branch === 'All' ? 'All Branches' : branch} • Strategic oversight and approvals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/orders')}>
            <FileText className="w-4 h-4 mr-2" />
            All Orders
          </Button>
        </div>
      </div>

      {/* Strategic KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Revenue */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Revenue (MTD)</p>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">₱16.8M</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-600 font-medium">+8% vs last month</p>
            </div>
          </CardContent>
        </Card>

        {/* Profit Margin */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Profit Margin</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">30%</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingDown className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-yellow-600 font-medium">-2% vs target</p>
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Orders (MTD)</p>
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">465</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-600 font-medium">+8% growth</p>
            </div>
          </CardContent>
        </Card>

        {/* Critical Approvals */}
        <Card className={criticalApprovals.length > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Critical Approvals</p>
              <AlertTriangle className={`w-5 h-5 ${criticalApprovals.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <p className={`text-2xl font-bold ${criticalApprovals.length > 0 ? 'text-red-900' : 'text-gray-900'}`}>
              {criticalApprovals.length}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {criticalApprovals.length > 0 ? 'Require immediate action' : 'No urgent approvals'}
            </p>
          </CardContent>
        </Card>

        {/* On-Time Delivery */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">On-Time Delivery</p>
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">88%</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingDown className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-yellow-600 font-medium">Target: 90%</p>
            </div>
          </CardContent>
        </Card>

        {/* Critical Stock */}
        <Card className={criticalInventory.length > 0 ? 'border-orange-200 bg-orange-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Critical Stock</p>
              <Package className={`w-5 h-5 ${criticalInventory.length > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
            </div>
            <p className={`text-2xl font-bold ${criticalInventory.length > 0 ? 'text-orange-900' : 'text-gray-900'}`}>
              {criticalInventory.length}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {criticalInventory.length > 0 ? 'Items below threshold' : 'All stock healthy'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: CRITICAL APPROVALS - Conditional, Red Border */}
      {criticalApprovals.length > 0 && (
        <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <CardTitle className="text-red-900">
                  Critical Approvals Requiring Immediate Action ({criticalApprovals.length})
                </CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalApprovals.slice(0, 5).map((approval: ApprovalOrder) => (
                <div
                  key={approval.id}
                  className="bg-white rounded-lg border border-red-200 p-4 hover:border-red-300 transition-colors cursor-pointer"
                  onClick={() => navigate(`/orders/${approval.orderNumber}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{approval.orderNumber}</span>
                        <Badge variant="danger">Urgency: {approval.urgencyScore}/100</Badge>
                        <Badge 
                          className={`border ${getMarginImpactColor(approval.marginImpact)}`}
                        >
                          {approval.marginImpact} Margin Impact
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Customer</p>
                          <p className="font-medium text-gray-900">{approval.customer}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Agent</p>
                          <p className="font-medium text-gray-900">{approval.agent}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Order Value</p>
                          <p className="font-medium text-gray-900">{formatCurrency(approval.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Discount Requested</p>
                          <p className="font-bold text-red-600">{approval.requestedDiscount}%</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Required Delivery: <span className="font-medium">{approval.requestedDeliveryDate}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="success" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        alert(`Approving order ${approval.orderNumber}`);
                      }}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button variant="danger" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        alert(`Rejecting order ${approval.orderNumber}`);
                      }}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3: BUSINESS EXCEPTIONS - Conditional, Orange Border */}
      {criticalInventory.length > 0 && (
        <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-orange-900">
                  Critical Inventory Exceptions ({criticalInventory.length})
                </CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/warehouse')}>
                View Warehouse <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalInventory.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg border border-orange-200 p-3 flex items-center justify-between hover:border-orange-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="font-semibold text-gray-900">{item.itemName || item.materialName}</span>
                      <Badge variant="danger">{item.riskLevel} Risk</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Current Stock: <span className="font-medium">{item.currentStock || item.stockLevel}</span> 
                      {' '} | Threshold: {item.reorderPoint || item.minThreshold}
                      {item.daysRemaining && ` • ${item.daysRemaining} days remaining`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/warehouse')}>
                    Take Action
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 4: FINANCIAL HEALTH - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Orders Trend - 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              Financial Performance Trend (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'Revenue' || name === 'Profit') {
                      return `₱${(value / 1000000).toFixed(2)}M`;
                    }
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
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#colorProfit)"
                  name="Profit"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Revenue Breakdown - 1 column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-red-600" />
              Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryRevenue}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name.split(' ')[0]} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₱${(value / 1000000).toFixed(2)}M`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {categoryRevenue.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                    <span className="text-gray-700">{cat.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">₱{(cat.value / 1000000).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 5: STRATEGIC INSIGHTS - Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTopProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{product.productName}</p>
                    <p className="text-xs text-gray-500">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-gray-900">
                      {formatCurrency(product.revenue)}
                    </p>
                    <p className="text-xs text-green-600">+{product.growth}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Customers by Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTopStores.map((store, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{store.storeName}</p>
                    <p className="text-xs text-gray-500">{store.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-gray-900">{store.orders} orders</p>
                    <p className="text-xs text-gray-600">{formatCurrency(store.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Sales Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockAgentPerformance.map((agent, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{agent.agentName}</p>
                    <p className="text-xs text-gray-500">{agent.branch}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-gray-900">
                      {formatCurrency(agent.revenue)}
                    </p>
                    <p className="text-xs text-gray-600">{agent.orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
