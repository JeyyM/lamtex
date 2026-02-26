import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { KpiTile } from '@/src/components/dashboard/KpiTile';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Truck,
  MapPin,
  AlertTriangle,
  Clock,
  Package,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  ArrowRight,
  Ship,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Navigation,
  Phone,
  FileText,
  Settings,
  PlayCircle,
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
  getLogisticsKPIsByBranch,
  getOrdersReadyByBranch,
  getTripsByBranch,
  getDeliveriesByBranch,
  getDelaysByBranch,
  getVehiclesByBranch,
  getShipmentsByBranch,
  getPerformanceMetrics,
  getWarehouseReadiness,
  getLogisticsAlertsByBranch,
} from '@/src/mock/logisticsDashboard';

export function LogisticsDashboard() {
  const { branch } = useAppContext();
  const navigate = useNavigate();
  const [showTripDetails, setShowTripDetails] = useState(false);

  // Get branch-specific data
  const kpis = getLogisticsKPIsByBranch(branch);
  const ordersReady = getOrdersReadyByBranch(branch);
  const trips = getTripsByBranch(branch);
  const deliveries = getDeliveriesByBranch(branch);
  const delays = getDelaysByBranch(branch);
  const vehicles = getVehiclesByBranch(branch);
  const shipments = getShipmentsByBranch(branch);
  const performance = getPerformanceMetrics();
  const warehouseReadiness = getWarehouseReadiness();
  const alerts = getLogisticsAlertsByBranch(branch);

  // Calculate real-time metrics
  const activeTrips = trips.filter(t => t.status === 'In Transit' || t.status === 'Loading');
  const delayedTrips = trips.filter(t => t.status === 'Delayed');
  const availableVehicles = vehicles.filter(v => v.status === 'Available');
  const completedToday = deliveries.filter(d => d.status === 'Delivered');

  const getStatusColor = (status: string) => {
    if (status === 'Completed' || status === 'Delivered' || status === 'Available') return 'success';
    if (status === 'In Transit' || status === 'Loading' || status === 'Planned') return 'warning';
    if (status === 'Delayed' || status === 'Failed' || status === 'Blocked') return 'danger';
    return 'default';
  };

  const getVehicleStatusColor = (status: string) => {
    if (status === 'Available') return 'success';
    if (status === 'On Trip' || status === 'Loading') return 'warning';
    if (status === 'Maintenance' || status === 'Out of Service') return 'danger';
    return 'default';
  };

  const getUrgencyColor = (urgency: string) => {
    if (urgency === 'High') return 'danger';
    if (urgency === 'Medium') return 'warning';
    return 'default';
  };

  const getShipmentStatusColor = (status: string) => {
    if (status === 'Arrived') return 'success';
    if (status === 'In Transit' || status === 'Preparing') return 'warning';
    if (status === 'Delayed') return 'danger';
    return 'default';
  };

  // Calculate ETA countdown
  const getETACountdown = (eta: string) => {
    const now = new Date();
    const etaDate = new Date(eta);
    const diff = etaDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logistics & Dispatch Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Viewing data for: <span className="font-medium text-gray-700">{branch}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/logistics')}>
            <Truck className="w-4 h-4 mr-2" />
            View All Deliveries
          </Button>
          <Button variant="primary" onClick={() => navigate('/logistics')}>
            <PlayCircle className="w-4 h-4 mr-2" />
            Create New Trip
          </Button>
        </div>
      </div>

      {/* CRITICAL ALERTS BANNER */}
      {(delayedTrips.length > 0 || alerts.length > 0) && (
        <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-600 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-2">⚠️ Critical Logistics Alerts</h3>
                <div className="space-y-2">
                  {delayedTrips.slice(0, 2).map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-red-200">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{trip.tripNumber} - Delayed</p>
                          <p className="text-xs text-gray-600">{trip.delayReason || 'Delay in transit'}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate('/logistics')}>
                        Track
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                  {alerts.slice(0, 1).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-200">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-600">{alert.message}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Trips</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{activeTrips.length}</p>
                <p className="text-xs text-gray-500 mt-1">In Transit + Loading</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Scheduled Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{deliveries.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total deliveries</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Delayed</p>
                <p className={`text-2xl font-bold mt-1 ${delayedTrips.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {delayedTrips.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Requires attention</p>
              </div>
              <div className={`p-3 rounded-lg ${delayedTrips.length > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`w-6 h-6 ${delayedTrips.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available Trucks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{availableVehicles.length}/{vehicles.length}</p>
                <p className="text-xs text-gray-500 mt-1">Ready for dispatch</p>
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
                <p className="text-sm text-gray-500">Orders Ready</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{ordersReady.length}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting dispatch</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{completedToday.length}</p>
                <p className="text-xs text-gray-500 mt-1">Delivered orders</p>
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
                <p className="text-sm text-gray-500">Fleet Utilization</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {Math.round((vehicles.filter(v => v.status !== 'Available').length / vehicles.length) * 100)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Capacity used</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending POD</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {deliveries.filter(d => d.status === 'Delivered' && !d.podCollected).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Need collection</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FileText className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QUICK DISPATCH SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Trips - Real-time Tracking */}
        <Card className="border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                Active Trips ({activeTrips.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/logistics')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {activeTrips.slice(0, 5).map((trip) => (
                <div 
                  key={trip.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                  onClick={() => navigate('/logistics')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{trip.tripNumber}</p>
                        <Badge variant={getStatusColor(trip.status)} size="sm">
                          {trip.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        <Truck className="w-3 h-3 inline mr-1" />
                        {trip.vehicleName} • {trip.driverName}
                      </p>
                    </div>
                    {trip.eta && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">ETA</p>
                        <p className="text-sm font-medium text-blue-600">{getETACountdown(trip.eta)}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <MapPin className="w-3 h-3" />
                    {trip.destinations.join(' → ')}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500">
                        <Package className="w-3 h-3 inline mr-1" />
                        {trip.orders.length} orders
                      </span>
                      <span className="text-gray-500">
                        {trip.capacityUsed}% capacity
                      </span>
                    </div>
                    <Button variant="outline" size="sm">
                      <Phone className="w-3 h-3 mr-1" />
                      Call Driver
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${trip.status === 'In Transit' ? 60 : trip.status === 'Loading' ? 20 : 90}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {activeTrips.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No active trips at the moment</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Awaiting Dispatch */}
        <Card className="border-orange-200">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                Orders Awaiting Dispatch ({ordersReady.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/logistics')}>
                Schedule
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {ordersReady.slice(0, 5).map((order) => (
                <div 
                  key={order.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                        <Badge variant={getUrgencyColor(order.urgency)} size="sm">
                          {order.urgency}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{order.customer}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <MapPin className="w-3 h-3" />
                    {order.destination}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex gap-3">
                      <span className="text-gray-500">
                        <Package className="w-3 h-3 inline mr-1" />
                        {order.volume}m³
                      </span>
                      <span className="text-gray-500">
                        {order.weight}kg
                      </span>
                      <span className={`font-medium ${
                        new Date(order.requiredDate) <= new Date() ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {order.requiredDate}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {ordersReady.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">All orders have been dispatched</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PERFORMANCE ANALYTICS */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">📊 Performance Analytics</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* On-Time Delivery Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              On-Time Delivery Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={[
                  { period: 'Week 1', onTime: 92, delayed: 8, target: 95 },
                  { period: 'Week 2', onTime: 88, delayed: 12, target: 95 },
                  { period: 'Week 3', onTime: 95, delayed: 5, target: 95 },
                  { period: 'Week 4', onTime: 97, delayed: 3, target: 95 },
                ]}
              >
                <defs>
                  <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="period" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="onTime" 
                  stroke="#10B981" 
                  strokeWidth={3} 
                  fill="url(#colorOnTime)" 
                  name="On-Time %" 
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#9CA3AF" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  name="Target (95%)" 
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fleet Utilization Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-600" />
              Fleet Utilization by Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart 
                data={vehicles.map((v) => ({
                  vehicle: v.vehicleName.replace('Truck ', 'T').replace('Container Van ', 'CV'),
                  utilization: v.utilizationPercent || 0,
                }))}
              >
                <defs>
                  <linearGradient id="colorUtilization" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="vehicle" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Bar dataKey="utilization" fill="#F59E0B" name="Utilization %" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Logistics Alerts & Notifications
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

      {/* Dispatch Board Preview: Orders Ready + Trip Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Ready for Dispatch */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Orders Ready for Dispatch
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">{ordersReady.length} orders ready</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/logistics')}>
              View Dispatch Board <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {ordersReady.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{order.orderNumber}</h4>
                      <p className="text-sm text-gray-600">{order.customer}</p>
                    </div>
                    <Badge
                      variant={
                        order.urgency === 'High'
                          ? 'danger'
                          : order.urgency === 'Medium'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {order.urgency}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div>
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {order.destination}
                    </div>
                    <div>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {order.requiredDate}
                    </div>
                    <div>Weight: {order.weight} kg</div>
                    <div>Volume: {order.volume} m³</div>
                  </div>
                  {order.notes && (
                    <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded mt-2">
                      {order.notes}
                    </p>
                  )}
                  <Button variant="primary" size="sm" className="w-full mt-3">
                    Assign to Trip
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trip Builder / Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-green-500" />
                Scheduled Trips
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">{trips.length} trips today</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/logistics')}>
              View Trip Builder <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {trips.map((trip) => (
                <div key={trip.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{trip.tripNumber}</h4>
                      <p className="text-sm text-gray-600">
                        {trip.vehicleName} - {trip.driverName}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(trip.status)}>{trip.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div>
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {trip.destinations.join(', ')}
                    </div>
                    <div>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {trip.departureTime || 'Not set'}
                    </div>
                    <div>Orders: {trip.orders.length}</div>
                    <div>Capacity: {trip.capacityUsed}%</div>
                  </div>
                  {trip.eta && (
                    <p className="text-xs text-blue-600">ETA: {trip.eta}</p>
                  )}
                  {trip.delayReason && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                      ⚠️ {trip.delayReason}
                    </p>
                  )}
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        trip.capacityUsed > 90
                          ? 'bg-red-500'
                          : trip.capacityUsed > 70
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${trip.capacityUsed}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance KPIs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Performance Metrics</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performance.map((metric) => (
          <Card key={metric.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">{metric.metric}</p>
                {metric.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : metric.trend === 'down' ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <div className="w-1 h-4 bg-gray-400 rounded" />
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </p>
                <span className="text-sm font-normal text-gray-500">{metric.unit}</span>
              </div>
              {metric.target && (
                <p className="text-xs text-gray-500 mt-1">Target: {metric.target}{metric.unit}</p>
              )}
              <p className="text-xs text-gray-400 mt-1 capitalize">{metric.period}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shipments (Inter-island) */}
      {shipments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ship className="w-5 h-5 text-cyan-500" />
                Inter-Island Shipments
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Sea/Air freight tracking</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {shipments.map((shipment) => (
                <div key={shipment.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{shipment.shipmentNumber}</h4>
                      <p className="text-sm text-gray-600">
                        {shipment.carrier} - {shipment.trackingNumber}
                      </p>
                    </div>
                    <Badge variant={getShipmentStatusColor(shipment.status)}>
                      {shipment.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="text-xs text-gray-500">From</p>
                      <p className="font-medium">{shipment.port}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">To</p>
                      <p className="font-medium">{shipment.destination}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">ETA</p>
                      <p className="font-medium">{shipment.eta}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline">{shipment.type}</Badge>
                    <span className="text-xs text-gray-500 ml-2">
                      {shipment.orders.length} order(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
