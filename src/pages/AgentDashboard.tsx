import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { KpiTile } from '@/src/components/dashboard/KpiTile';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  User,
  ShoppingCart,
  DollarSign,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  ArrowRight,
  Star,
  BarChart3,
  PieChart as PieChartIcon,
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
  getAgentKPIsByBranch,
  getAgentCustomersByBranch,
  getAgentOrdersByBranch,
  getPODCollectionsByBranch,
  getPaymentCollectionsByBranch,
  getPurchaseRequestsByBranch,
  getAgentPerformanceByBranch,
  getCommissionsByBranch,
  getAgentActivitiesByBranch,
  getAgentAlertsByBranch,
} from '@/src/mock/agentDashboard';

export function AgentDashboard() {
  const { branch } = useAppContext();
  const navigate = useNavigate();

  // Get branch-specific data (limited for dashboard preview)
  const kpis = getAgentKPIsByBranch(branch);
  const customers = getAgentCustomersByBranch(branch).slice(0, 5);
  const orders = getAgentOrdersByBranch(branch).slice(0, 5);
  const pods = getPODCollectionsByBranch(branch).slice(0, 4);
  const payments = getPaymentCollectionsByBranch(branch).slice(0, 5);
  const purchaseRequests = getPurchaseRequestsByBranch(branch).slice(0, 3);
  const performance = getAgentPerformanceByBranch(branch).slice(0, 4);
  const commissions = getCommissionsByBranch(branch).slice(0, 2);
  const activities = getAgentActivitiesByBranch(branch).slice(0, 5);
  const alerts = getAgentAlertsByBranch(branch).slice(0, 4);

  const getPaymentStatusColor = (status: string) => {
    if (status === 'Paid') return 'success';
    if (status === 'Current' || status === 'Pending') return 'default';
    if (status === 'Partial' || status === 'Overdue') return 'warning';
    if (status === 'Critical') return 'danger';
    return 'default';
  };

  const getOrderStatusColor = (status: string) => {
    if (status === 'Approved' || status === 'Delivered') return 'success';
    if (status === 'Pending Approval' || status === 'In Fulfillment' || status === 'Ready for Dispatch') return 'warning';
    if (status === 'Rejected' || status === 'Cancelled') return 'danger';
    return 'default';
  };

  const getPRStatusColor = (status: string) => {
    if (status === 'Approved' || status === 'Received') return 'success';
    if (status === 'Submitted' || status === 'Under Review' || status === 'Ordered') return 'warning';
    if (status === 'Rejected') return 'danger';
    return 'default';
  };

  const getHealthScoreColor = (score: string) => {
    if (score === 'Excellent') return 'success';
    if (score === 'Good') return 'default';
    if (score === 'Fair') return 'warning';
    if (score === 'Poor') return 'danger';
    return 'default';
  };

  const mapKpiStatus = (status?: 'success' | 'warning' | 'danger' | 'default'): 'good' | 'warning' | 'danger' | 'neutral' => {
    if (status === 'success') return 'good';
    if (status === 'default') return 'neutral';
    return status || 'neutral';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Agent Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Viewing data for: <span className="font-medium text-gray-700">{branch}</span>
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/orders')}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Create New Order
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiTile
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            subtitle={kpi.subtitle}
            status={mapKpiStatus(kpi.status)}
            onClick={() => console.log(`Navigating to ${kpi.label}`)}
          />
        ))}
      </div>

      {/* AGENT ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              Monthly Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={performance.map(p => ({
                  period: p.period.replace('this-', '').replace('ytd', 'Year'),
                  current: p.current,
                  target: p.target,
                  percentage: p.percentage,
                }))}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="period" stroke="#9CA3AF" />
                <YAxis yAxisId="left" stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'Current' || name === 'Target') return value.toLocaleString();
                    if (name === 'Achievement (%)') return `${value}%`;
                    return value;
                  }}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="current" stroke="#3B82F6" strokeWidth={3} fill="url(#colorSales)" name="Current" />
                <Line yAxisId="right" type="monotone" dataKey="percentage" stroke="#10B981" strokeWidth={3} name="Achievement (%)" dot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Commission Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              Commission Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={commissions.map(c => ({
                  period: c.period.replace('2026-', ''),
                  sales: c.salesAmount / 1000,
                  commission: c.commissionEarned / 1000,
                  rate: c.commissionRate * 100,
                }))}
              >
                <defs>
                  <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="period" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  formatter={(value: number) => `₱${value.toFixed(1)}K`}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Area type="monotone" dataKey="commission" stroke="#10B981" strokeWidth={3} fill="url(#colorCommission)" name="Commission (₱K)" />
                <Line type="monotone" dataKey="rate" stroke="#F59E0B" strokeWidth={2} name="Rate (%)" dot={{ r: 4 }} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-red-600" />
              Customer Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Excellent', value: customers.filter(c => c.healthScore === 'Excellent').length },
                    { name: 'Good', value: customers.filter(c => c.healthScore === 'Good').length },
                    { name: 'Fair', value: customers.filter(c => c.healthScore === 'Fair').length },
                    { name: 'Poor', value: customers.filter(c => c.healthScore === 'Poor').length },
                  ].filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
            <div className="mt-4 space-y-2">
              {customers.slice(0, 4).map((customer, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{customer.customerName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={getHealthScoreColor(customer.healthScore)}>
                      {customer.healthScore}
                    </Badge>
                    <span className="text-gray-500 text-xs">₱{(customer.totalRevenueYTD / 1000000).toFixed(1)}M</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Collection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              Payment Collection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Paid', value: payments.filter(p => p.paymentStatus === 'Paid').length },
                    { name: 'Pending', value: payments.filter(p => p.paymentStatus === 'Pending').length },
                    { name: 'Overdue', value: payments.filter(p => p.paymentStatus === 'Overdue').length },
                    { name: 'Partial', value: payments.filter(p => p.paymentStatus === 'Partial').length },
                  ].filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#3B82F6" />
                  <Cell fill="#EF4444" />
                  <Cell fill="#F59E0B" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Paid ({payments.filter(p => p.paymentStatus === 'Paid').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Pending ({payments.filter(p => p.paymentStatus === 'Pending').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Overdue ({payments.filter(p => p.paymentStatus === 'Overdue').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Partial ({payments.filter(p => p.paymentStatus === 'Partial').length})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              My Alerts & Notifications
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">{alerts.length} active alerts</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/placeholder')}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-gray-50 flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    alert.severity === 'Critical'
                      ? 'bg-red-100'
                      : alert.severity === 'High'
                      ? 'bg-orange-100'
                      : alert.severity === 'Medium'
                      ? 'bg-yellow-100'
                      : 'bg-blue-100'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      alert.severity === 'Critical'
                        ? 'text-red-600'
                        : alert.severity === 'High'
                        ? 'text-orange-600'
                        : alert.severity === 'Medium'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <Badge
                      variant={
                        alert.severity === 'Critical' || alert.severity === 'High'
                          ? 'danger'
                          : alert.severity === 'Medium'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {alert.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{alert.timestamp}</p>
                </div>
                {alert.actionRequired && (
                  <Button variant="primary" size="sm">
                    Take Action
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance & Commission Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              My Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {performance.map((metric) => (
                <div key={metric.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{metric.metric}</p>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : metric.trend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <div className="w-4 h-0.5 bg-gray-400" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {metric.unit === '₱' ? metric.unit : ''}
                      {metric.current.toLocaleString()}
                      {metric.unit !== '₱' && metric.unit !== '' ? metric.unit : ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      / {metric.unit === '₱' ? metric.unit : ''}
                      {metric.target.toLocaleString()}
                      {metric.unit !== '₱' && metric.unit !== '' ? metric.unit : ''}
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${
                        metric.percentage >= 90
                          ? 'bg-green-500'
                          : metric.percentage >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {metric.percentage}% achieved
                    {metric.rank && metric.totalAgents && (
                      <span className="ml-2">• Rank {metric.rank}/{metric.totalAgents}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Commission Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              Commission Earned
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {commissions.map((comm) => (
                <div key={comm.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{comm.period}</h4>
                    <Badge variant={comm.status === 'Paid' ? 'success' : comm.status === 'Approved' ? 'warning' : 'default'}>
                      {comm.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Sales Amount</p>
                      <p className="text-lg font-bold text-gray-900">
                        ₱{comm.salesAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Commission ({comm.commissionRate}%)</p>
                      <p className="text-lg font-bold text-green-600">
                        ₱{comm.commissionEarned.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {comm.paidDate && (
                    <p className="text-xs text-gray-500">Paid on: {comm.paidDate}</p>
                  )}
                  {comm.breakdown.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">Breakdown:</p>
                      {comm.breakdown.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{item.orderNumber} - {item.customerName}</span>
                          <span className="font-medium">₱{item.commission.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Customers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-purple-500" />
              My Customers
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">{customers.length} customers shown</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/placeholder')}>
            View All Customers <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Outstanding</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Health</th>
                  <th className="px-4 py-3 text-left font-medium">Next Visit</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{customer.customerName}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {customer.location}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600">
                        <p className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {customer.contactPerson}
                        </p>
                        <p className="flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{customer.accountType}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          ₱{customer.outstandingBalance.toLocaleString()}
                        </p>
                        {customer.daysOverdue && customer.daysOverdue > 0 && (
                          <p className="text-xs text-red-600">{customer.daysOverdue} days late</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getPaymentStatusColor(customer.paymentStatus)}>
                        {customer.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getHealthScoreColor(customer.healthScore)}>
                        {customer.healthScore}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.nextVisitScheduled ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3" />
                          {customer.nextVisitScheduled}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          Visit
                        </Button>
                        <Button variant="primary" size="sm">
                          Create Order
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Orders & PODs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
                My Orders
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">{orders.length} recent orders</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {orders.map((order) => (
                <div key={order.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-600">{order.customerName}</p>
                    </div>
                    <Badge variant={getOrderStatusColor(order.status)}>{order.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div>Amount: ₱{order.totalAmount.toLocaleString()}</div>
                    <div>Discount: {order.discountApplied}%</div>
                    <div>Date: {order.orderDate}</div>
                    <div>Delivery: {order.requestedDeliveryDate}</div>
                  </div>
                  {order.rejectionReason && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                      ❌ {order.rejectionReason}
                    </p>
                  )}
                  {order.status === 'Draft' && (
                    <Button variant="primary" size="sm" className="w-full mt-2">
                      Submit for Approval
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* POD Collections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                POD Collections
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">{pods.filter(p => !p.podCollected).length} pending</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/placeholder')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {pods.map((pod) => (
                <div key={pod.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{pod.deliveryNumber}</p>
                      <p className="text-xs text-gray-600">{pod.customerName}</p>
                    </div>
                    {pod.podCollected ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div>Delivered: {pod.deliveredDate}</div>
                    <div>Amount: ₱{pod.deliveryAmount.toLocaleString()}</div>
                  </div>
                  {pod.podCollected ? (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✓ POD Collected - {pod.receivedBy}
                      {pod.podNotes && <p className="mt-1">{pod.podNotes}</p>}
                    </div>
                  ) : (
                    <>
                      {pod.issues && pod.issues.length > 0 && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">
                          {pod.issues.map((issue, idx) => (
                            <p key={idx}>⚠️ {issue}</p>
                          ))}
                        </div>
                      )}
                      <Button variant="primary" size="sm" className="w-full">
                        Collect POD
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments & Purchase Requests Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Collections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-500" />
                Payment Collections
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {payments.filter(p => p.paymentStatus === 'Overdue' || p.paymentStatus === 'Critical').length} overdue
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/placeholder')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <div key={payment.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{payment.invoiceNumber}</p>
                      <p className="text-xs text-gray-600">{payment.customerName}</p>
                    </div>
                    <Badge variant={getPaymentStatusColor(payment.paymentStatus)}>
                      {payment.paymentStatus}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div>Total: ₱{payment.amount.toLocaleString()}</div>
                    <div>Paid: ₱{payment.amountPaid.toLocaleString()}</div>
                    <div>Due: ₱{payment.amountDue.toLocaleString()}</div>
                    <div>
                      {payment.daysOverdue && payment.daysOverdue > 0 ? (
                        <span className="text-red-600 font-medium">{payment.daysOverdue} days overdue</span>
                      ) : (
                        <span>Due: {payment.dueDate}</span>
                      )}
                    </div>
                  </div>
                  {payment.collectionNotes && (
                    <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-2">
                      {payment.collectionNotes}
                    </p>
                  )}
                  {payment.paymentStatus !== 'Paid' && (
                    <Button variant="primary" size="sm" className="w-full">
                      Collect Payment
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Purchase Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                Purchase Requests
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">{purchaseRequests.length} requests</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/placeholder')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {purchaseRequests.map((pr) => (
                <div key={pr.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{pr.requestNumber}</p>
                      <p className="text-xs text-gray-600">{pr.itemName}</p>
                    </div>
                    <Badge variant={getPRStatusColor(pr.status)}>{pr.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div>Qty: {pr.quantity} {pr.unit}</div>
                    <div>Est. Cost: ₱{pr.estimatedCost.toLocaleString()}</div>
                    <div>
                      <Badge variant={pr.urgency === 'Critical' || pr.urgency === 'High' ? 'danger' : pr.urgency === 'Medium' ? 'warning' : 'default'} className="text-xs">
                        {pr.urgency}
                      </Badge>
                    </div>
                    {pr.supplier && <div>Supplier: {pr.supplier}</div>}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{pr.reason}</p>
                  {pr.rejectionReason && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      ❌ {pr.rejectionReason}
                    </p>
                  )}
                  {pr.expectedDelivery && pr.status === 'Approved' && (
                    <p className="text-xs text-green-600">
                      ✓ Expected: {pr.expectedDelivery}
                    </p>
                  )}
                  {pr.status === 'Draft' && (
                    <Button variant="primary" size="sm" className="w-full mt-2">
                      Submit Request
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Recent Activities
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Latest actions</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div key={activity.id} className="p-3 hover:bg-gray-50 flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  activity.status === 'Success' ? 'bg-green-100' :
                  activity.status === 'Pending' ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}>
                  {activity.type === 'Order Created' && <ShoppingCart className="w-4 h-4 text-blue-600" />}
                  {activity.type === 'Customer Visit' && <User className="w-4 h-4 text-purple-600" />}
                  {activity.type === 'POD Collected' && <FileText className="w-4 h-4 text-green-600" />}
                  {activity.type === 'Payment Collected' && <DollarSign className="w-4 h-4 text-yellow-600" />}
                  {activity.type === 'Purchase Request' && <Package className="w-4 h-4 text-orange-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-gray-900">{activity.title}</h4>
                    {activity.status && (
                      <Badge variant={activity.status === 'Success' ? 'success' : activity.status === 'Pending' ? 'warning' : 'danger'} className="text-xs">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
