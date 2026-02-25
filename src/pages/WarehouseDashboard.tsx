import React from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { KpiTile } from '@/src/components/dashboard/KpiTile';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { 
  Package, 
  Box, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  ArrowRight,
  Activity,
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
  getWarehouseKPIsByBranch,
  getFinishedGoodsByBranch,
  getRawMaterialsByBranch,
  getOrderFulfillmentByBranch,
  getProductionBatchesByBranch,
  getStockMovementsByBranch,
  getQualityIssuesByBranch,
  getMachineStatusByBranch,
  getWarehouseAlertsByBranch,
} from '@/src/mock/warehouseDashboard';
import { useNavigate } from 'react-router-dom';

export function WarehouseDashboard() {
  const { branch } = useAppContext();
  const navigate = useNavigate();

  // Get branch-specific data (limited for dashboard preview)
  const kpis = getWarehouseKPIsByBranch(branch);
  const finishedGoods = getFinishedGoodsByBranch(branch).slice(0, 5);
  const rawMaterials = getRawMaterialsByBranch(branch).slice(0, 4);
  const orderFulfillment = getOrderFulfillmentByBranch(branch).slice(0, 6);
  const productionBatches = getProductionBatchesByBranch(branch).slice(0, 4);
  const stockMovements = getStockMovementsByBranch(branch).slice(0, 5);
  const qualityIssues = getQualityIssuesByBranch(branch).slice(0, 3);
  const machines = getMachineStatusByBranch(branch).slice(0, 3);
  const alerts = getWarehouseAlertsByBranch(branch).slice(0, 5);

  const getStockBarColor = (stock: number, reserved: number, min: number) => {
    const available = stock - reserved;
    if (available < min * 0.5) return 'bg-red-500';
    if (available < min) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'High') return 'danger';
    if (risk === 'Medium') return 'warning';
    return 'success';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Ready') return 'success';
    if (status === 'Picking' || status === 'Packing') return 'warning';
    if (status === 'Blocked') return 'danger';
    return 'default';
  };

  const getQAStatusColor = (status: string) => {
    if (status === 'Passed') return 'success';
    if (status === 'Testing' || status === 'Pending') return 'warning';
    if (status === 'Failed' || status === 'Rework') return 'danger';
    return 'default';
  };

  const getMachineStatusColor = (status: string) => {
    if (status === 'Running') return 'success';
    if (status === 'Idle') return 'warning';
    if (status === 'Maintenance' || status === 'Error') return 'danger';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Operations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Viewing data for: <span className="font-medium text-gray-700">{branch}</span>
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiTile
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            subtitle={kpi.subtitle}
            status={kpi.status}
            onClick={() => console.log(`Navigating to ${kpi.label}`)}
          />
        ))}
      </div>

      {/* WAREHOUSE ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Levels by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-600" />
              Stock Levels - Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart 
                data={finishedGoods.map(fg => ({
                  product: fg.productName.length > 15 ? fg.productName.substring(0, 15) + '...' : fg.productName,
                  stock: fg.currentStock,
                  reserved: fg.reservedStock,
                  available: fg.availableStock,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="product" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="available" stackId="a" fill="#10B981" name="Available" />
                <Bar dataKey="reserved" stackId="a" fill="#F59E0B" name="Reserved" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fulfillment Queue Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" />
              Order Fulfillment Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Ready', value: orderFulfillment.filter(o => o.fulfillmentStatus === 'Ready').length },
                    { name: 'Picking', value: orderFulfillment.filter(o => o.fulfillmentStatus === 'Picking').length },
                    { name: 'Packing', value: orderFulfillment.filter(o => o.fulfillmentStatus === 'Packing').length },
                    { name: 'Blocked', value: orderFulfillment.filter(o => o.fulfillmentStatus === 'Blocked').length },
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
                  <Cell fill="#F59E0B" />
                  <Cell fill="#3B82F6" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Ready ({orderFulfillment.filter(o => o.fulfillmentStatus === 'Ready').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Picking ({orderFulfillment.filter(o => o.fulfillmentStatus === 'Picking').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Packing ({orderFulfillment.filter(o => o.fulfillmentStatus === 'Packing').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Blocked ({orderFulfillment.filter(o => o.fulfillmentStatus === 'Blocked').length})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-red-600" />
              Production Batches Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={productionBatches.map(pb => ({
                  batch: pb.batchNumber.substring(0, 8),
                  produced: pb.actualQty || 0,
                  target: pb.plannedQty,
                  efficiency: pb.actualQty ? Math.round((pb.actualQty / pb.plannedQty) * 100) : 0,
                }))}
              >
                <defs>
                  <linearGradient id="colorProduced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="batch" stroke="#9CA3AF" />
                <YAxis yAxisId="left" stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="target" fill="#D1D5DB" name="Target" />
                <Area yAxisId="left" type="monotone" dataKey="produced" stroke="#EF4444" strokeWidth={3} fill="url(#colorProduced)" name="Produced" />
                <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#10B981" strokeWidth={3} name="Efficiency %" dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Machine Uptime */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-red-600" />
              Machine Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Running', value: machines.filter(m => m.status === 'Running').length },
                    { name: 'Idle', value: machines.filter(m => m.status === 'Idle').length },
                    { name: 'Maintenance', value: machines.filter(m => m.status === 'Maintenance').length },
                    { name: 'Error', value: machines.filter(m => m.status === 'Error').length },
                  ].filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#F59E0B" />
                  <Cell fill="#3B82F6" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {machines.map((machine, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{machine.machineName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={getMachineStatusColor(machine.status)}>
                      {machine.status}
                    </Badge>
                    <span className="text-gray-900 font-medium">{machine.utilizationPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Warehouse Alerts & Notifications
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
                <div className={`p-2 rounded-lg ${
                  alert.severity === 'Critical' ? 'bg-red-100' :
                  alert.severity === 'High' ? 'bg-orange-100' :
                  alert.severity === 'Medium' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    alert.severity === 'Critical' ? 'text-red-600' :
                    alert.severity === 'High' ? 'text-orange-600' :
                    alert.severity === 'Medium' ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <Badge variant={
                      alert.severity === 'Critical' ? 'danger' :
                      alert.severity === 'High' ? 'danger' :
                      alert.severity === 'Medium' ? 'warning' : 'default'
                    }>
                      {alert.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{alert.timestamp}</p>
                </div>
                {alert.actionRequired && (
                  <Button variant="primary" size="sm">Take Action</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stock Health Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Finished Goods */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Finished Goods Stock Health
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Top {finishedGoods.length} products</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {finishedGoods.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.productName}</h4>
                      <p className="text-xs text-gray-500">{item.sku}</p>
                    </div>
                    <Badge variant={getRiskColor(item.riskLevel)}>
                      {item.riskLevel} Risk
                    </Badge>
                  </div>
                  
                  {/* Stock Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Reserved: {item.reservedStock}</span>
                      <span>Available: {item.availableStock}</span>
                      <span>Min: {item.minLevel}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-red-400" 
                        style={{ width: `${(item.reservedStock / item.currentStock) * 100}%` }}
                      />
                      <div 
                        className={getStockBarColor(item.currentStock, item.reservedStock, item.minLevel)}
                        style={{ width: `${(item.availableStock / item.currentStock) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
                    <div>Daily: {item.avgDailyOutflow}</div>
                    <div>QA: {item.qaSuccessRate}%</div>
                    <div>Days: {item.daysOfCover}</div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Request Production
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Transfer Stock
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Raw Materials */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Box className="w-5 h-5 text-purple-500" />
                Raw Materials Stock Health
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Top {rawMaterials.length} materials</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/materials')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {rawMaterials.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.materialName}</h4>
                      <p className="text-xs text-gray-500">{item.sku}</p>
                    </div>
                    <Badge variant={getRiskColor(item.riskLevel)}>
                      {item.riskLevel} Risk
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 text-sm">
                    <div className="text-gray-600">
                      Current: <span className="font-medium text-gray-900">{item.currentQty.toLocaleString()} {item.unit}</span>
                    </div>
                    <div className="text-gray-600">
                      Safety: <span className="font-medium text-gray-900">{item.safetyLevel.toLocaleString()} {item.unit}</span>
                    </div>
                    <div className="text-gray-600">
                      Daily Use: <span className="font-medium text-gray-900">{item.avgDailyUse} {item.unit}</span>
                    </div>
                    <div className={`font-medium ${item.daysRemaining < 7 ? 'text-red-600' : item.daysRemaining < 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {item.daysRemaining} days left
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500">
                      <strong>Affects:</strong> {item.productsAffected.join(', ')}
                    </p>
                  </div>

                  <Button variant="primary" size="sm" className="w-full">
                    Create Purchase Request
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Fulfillment Queue (Kanban Preview) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Order Fulfillment Queue
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {orderFulfillment.length} orders in progress
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
            View Full Board <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* To Pick */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                To Pick ({orderFulfillment.filter(o => o.fulfillmentStatus === 'To Pick').length})
              </h3>
              <div className="space-y-2">
                {orderFulfillment.filter(o => o.fulfillmentStatus === 'To Pick').map(order => (
                  <div key={order.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="font-medium text-sm text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.customer}</p>
                    <p className="text-xs text-gray-600 mt-1">{order.productsSummary}</p>
                    <Badge variant={order.urgency === 'High' ? 'danger' : order.urgency === 'Medium' ? 'warning' : 'default'} className="mt-2">
                      {order.requiredDate}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Picking */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                Picking ({orderFulfillment.filter(o => o.fulfillmentStatus === 'Picking').length})
              </h3>
              <div className="space-y-2">
                {orderFulfillment.filter(o => o.fulfillmentStatus === 'Picking').map(order => (
                  <div key={order.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="font-medium text-sm text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.customer}</p>
                    <p className="text-xs text-gray-600 mt-1">{order.productsSummary}</p>
                    <Badge variant="warning" className="mt-2">
                      {order.requiredDate}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Packing */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                Packing ({orderFulfillment.filter(o => o.fulfillmentStatus === 'Packing').length})
              </h3>
              <div className="space-y-2">
                {orderFulfillment.filter(o => o.fulfillmentStatus === 'Packing').map(order => (
                  <div key={order.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="font-medium text-sm text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.customer}</p>
                    <p className="text-xs text-gray-600 mt-1">{order.productsSummary}</p>
                    {order.truckAssigned && (
                      <p className="text-xs text-blue-600 mt-1">🚛 {order.truckAssigned}</p>
                    )}
                    <Badge variant="default" className="mt-2">
                      {order.requiredDate}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Ready / Blocked */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                Ready / Blocked ({orderFulfillment.filter(o => o.fulfillmentStatus === 'Ready' || o.fulfillmentStatus === 'Blocked').length})
              </h3>
              <div className="space-y-2">
                {orderFulfillment.filter(o => o.fulfillmentStatus === 'Ready' || o.fulfillmentStatus === 'Blocked').map(order => (
                  <div key={order.id} className={`p-3 rounded-lg border ${
                    order.fulfillmentStatus === 'Ready' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <p className="font-medium text-sm text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.customer}</p>
                    <p className="text-xs text-gray-600 mt-1">{order.productsSummary}</p>
                    {order.fulfillmentStatus === 'Ready' && order.truckAssigned && (
                      <p className="text-xs text-green-600 mt-1">✓ {order.truckAssigned}</p>
                    )}
                    <Badge variant={order.fulfillmentStatus === 'Ready' ? 'success' : 'danger'} className="mt-2">
                      {order.fulfillmentStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row: Production Batches + Stock Movements + Quality Issues + Machines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Batches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Production Batch Status</CardTitle>
            <Settings className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {productionBatches.map((batch) => (
                <div key={batch.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{batch.batchNumber}</p>
                      <p className="text-xs text-gray-500">{batch.productName}</p>
                    </div>
                    <Badge variant={getQAStatusColor(batch.qaStatus)}>
                      {batch.qaStatus}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Planned: {batch.plannedQty}</div>
                    {batch.actualQty && <div>Actual: {batch.actualQty}</div>}
                    <div>Scheduled: {batch.scheduledDate}</div>
                    {batch.completedDate && <div>Completed: {batch.completedDate}</div>}
                  </div>
                  {batch.defectRate && (
                    <p className="text-xs text-red-600 mt-1">Defect Rate: {batch.defectRate}%</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stock Movements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Recent Stock Movements</CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {stockMovements.map((movement) => (
                <div key={movement.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={
                      movement.type === 'In' || movement.type === 'Production' ? 'success' :
                      movement.type === 'Out' ? 'default' :
                      movement.type === 'Damage' || movement.type === 'Adjust' ? 'danger' : 'warning'
                    }>
                      {movement.type}
                    </Badge>
                    <p className="text-xs text-gray-500">{movement.timestamp}</p>
                  </div>
                  <p className="font-medium text-sm text-gray-900">{movement.itemName}</p>
                  <p className="text-xs text-gray-600">
                    Qty: {movement.quantity} | Ref: {movement.reference} | By: {movement.user}
                  </p>
                  {movement.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">{movement.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quality Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Quality Issues</CardTitle>
            <XCircle className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-0">
            {qualityIssues.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ✓ No active quality issues
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {qualityIssues.map((issue) => (
                  <div key={issue.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={
                        issue.status === 'Resolved' ? 'success' :
                        issue.status === 'Open' ? 'danger' : 'warning'
                      }>
                        {issue.issueType}
                      </Badge>
                      <Badge variant="outline">{issue.status}</Badge>
                    </div>
                    <p className="font-medium text-sm text-gray-900">{issue.itemName}</p>
                    {issue.batchNumber && (
                      <p className="text-xs text-gray-500">{issue.batchNumber}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">{issue.reason}</p>
                    <p className="text-xs text-red-600 mt-1">Qty Affected: {issue.qtyAffected}</p>
                    {issue.resolution && (
                      <p className="text-xs text-green-600 mt-1">✓ {issue.resolution}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Machine Uptime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Machine Status</CardTitle>
            <Settings className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {machines.map((machine) => (
                <div key={machine.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-gray-900">{machine.machineName}</p>
                    <Badge variant={getMachineStatusColor(machine.status)}>
                      {machine.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Utilization: {machine.utilizationPercent}%</div>
                    <div>Quota: {machine.quotaCompletionPercent}%</div>
                    <div>Error Rate: {machine.errorRate}%</div>
                    <div>Maint: {machine.nextMaintenance}</div>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${machine.utilizationPercent > 85 ? 'bg-green-500' : machine.utilizationPercent > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${machine.utilizationPercent}%` }}
                    />
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
