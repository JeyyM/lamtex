import React from 'react';
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
} from 'lucide-react';
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

  // Get branch-specific data (limited for dashboard preview)
  const kpis = getLogisticsKPIsByBranch(branch);
  const ordersReady = getOrdersReadyByBranch(branch).slice(0, 5);
  const trips = getTripsByBranch(branch).slice(0, 6);
  const deliveries = getDeliveriesByBranch(branch).slice(0, 5);
  const delays = getDelaysByBranch(branch).slice(0, 3);
  const vehicles = getVehiclesByBranch(branch).slice(0, 6);
  const shipments = getShipmentsByBranch(branch).slice(0, 2);
  const performance = getPerformanceMetrics().slice(0, 4);
  const warehouseReadiness = getWarehouseReadiness().slice(0, 4);
  const alerts = getLogisticsAlertsByBranch(branch).slice(0, 5);

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

  const getShipmentStatusColor = (status: string) => {
    if (status === 'Arrived') return 'success';
    if (status === 'In Transit' || status === 'Preparing') return 'warning';
    if (status === 'Delayed') return 'danger';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logistics & Dispatch</h1>
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

      {/* Live Delivery Tracker */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              Live Delivery Tracker
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">{deliveries.length} active deliveries</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/logistics')}>
            View Full Tracker <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Delivery #</th>
                  <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium">Driver</th>
                  <th className="px-4 py-3 text-left font-medium">Route</th>
                  <th className="px-4 py-3 text-left font-medium">Orders</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">ETA</th>
                  <th className="px-4 py-3 text-left font-medium">POD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {delivery.deliveryNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{delivery.vehicle}</td>
                    <td className="px-4 py-3 text-gray-600">{delivery.driver}</td>
                    <td className="px-4 py-3 text-gray-600">{delivery.route}</td>
                    <td className="px-4 py-3 text-gray-600">{delivery.ordersCount}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusColor(delivery.status)}>{delivery.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {delivery.actualArrival || delivery.eta}
                    </td>
                    <td className="px-4 py-3">
                      {delivery.podCollected ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-300" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row: Fleet Status + Delays + Warehouse Readiness + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Fleet Status</CardTitle>
            <Truck className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{vehicle.vehicleName}</p>
                      <p className="text-xs text-gray-500">{vehicle.type}</p>
                    </div>
                    <Badge variant={getVehicleStatusColor(vehicle.status)}>{vehicle.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Trips Today: {vehicle.tripsToday}</div>
                    <div>Utilization: {vehicle.utilizationPercent}%</div>
                    {vehicle.nextAvailableTime && (
                      <div className="col-span-2 text-blue-600">
                        Available: {vehicle.nextAvailableTime}
                      </div>
                    )}
                    {vehicle.maintenanceDue && (
                      <div className="col-span-2 text-orange-600">
                        Maintenance: {vehicle.maintenanceDue}
                      </div>
                    )}
                  </div>
                  {vehicle.alerts && vehicle.alerts.length > 0 && (
                    <div className="mt-2">
                      {vehicle.alerts.map((alert, idx) => (
                        <p key={idx} className="text-xs text-red-600 bg-red-50 p-1 rounded">
                          ⚠️ {alert}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delays & Exceptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              Delays & Exceptions
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-0">
            {delays.length === 0 ? (
              <div className="p-8 text-center text-gray-500">✓ No active delays</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {delays.map((delay) => (
                  <div key={delay.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="danger">{delay.type}</Badge>
                      <Badge variant="outline">{delay.status}</Badge>
                    </div>
                    <p className="font-medium text-sm text-gray-900">{delay.affectedTrip}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Affected: {delay.customersAffected.join(', ')}
                    </p>
                    <p className="text-xs text-gray-600">Owner: {delay.owner}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-xs ${
                          delay.daysLate > 0 ? 'text-red-600 font-medium' : 'text-gray-500'
                        }`}
                      >
                        {delay.daysLate > 0 ? `${delay.daysLate} day(s) late` : 'Same day'}
                      </span>
                      {delay.status !== 'Resolved' && (
                        <Button variant="primary" size="sm">
                          Resolve
                        </Button>
                      )}
                    </div>
                    {delay.resolution && (
                      <p className="text-xs text-green-600 mt-2">✓ {delay.resolution}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warehouse Readiness */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              Warehouse Readiness
            </CardTitle>
            <Package className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {warehouseReadiness.map((wr) => (
                <div key={wr.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-gray-900">{wr.orderNumber}</p>
                    <Badge
                      variant={
                        wr.loadingStatus === 'Ready'
                          ? 'success'
                          : wr.loadingStatus === 'Blocked'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {wr.loadingStatus}
                    </Badge>
                  </div>
                  {wr.blockers && wr.blockers.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {wr.blockers.map((blocker, idx) => (
                        <p key={idx} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          <strong>{blocker.type}:</strong> {blocker.itemName} (Qty: {blocker.quantity})
                        </p>
                      ))}
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        Notify Warehouse
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Updated: {wr.lastUpdated}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              Performance Summary
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {performance.map((metric) => (
                <div key={metric.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">{metric.metric}</p>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : metric.trend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <div className="w-4 h-0.5 bg-gray-400" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {metric.value}
                      <span className="text-sm font-normal text-gray-500">{metric.unit}</span>
                    </p>
                    {metric.target && (
                      <p className="text-xs text-gray-500">Target: {metric.target}{metric.unit}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{metric.period}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
