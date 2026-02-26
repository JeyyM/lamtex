import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Truck,
  MapPin,
  Calendar,
  Clock,
  Package,
  Route,
  Navigation,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Map,
  FileText,
  Phone,
  MessageSquare,
  Users,
  Settings,
  BarChart3,
  TrendingUp,
  ArrowRight,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Camera,
  Ship,
  Plane,
  Globe,
} from 'lucide-react';
import {
  getTripsByBranch,
  getVehiclesByBranch,
  getDeliveriesByBranch,
  getOrdersReadyByBranch,
  getShipmentsByBranch,
} from '@/src/mock/logisticsDashboard';
import { RoutePlanningView } from '@/src/components/logistics/RoutePlanningView';
import { TripDetailsModal } from '@/src/components/logistics/TripDetailsModal';
import { EditTripModal } from '@/src/components/logistics/EditTripModal';
import { Trip } from '@/src/types/logistics';

type ViewMode = 'dispatch' | 'fleet' | 'routes' | 'shipments';

export function LogisticsPage() {
  const { branch } = useAppContext();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('dispatch');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Get data
  const trips = getTripsByBranch(branch);
  const vehicles = getVehiclesByBranch(branch);
  const deliveries = getDeliveriesByBranch(branch);
  const ordersReady = getOrdersReadyByBranch(branch);
  const shipments = getShipmentsByBranch(branch);

  // Filter trips
  const filteredTrips = trips.filter(trip => {
    const matchesSearch = trip.tripNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         trip.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         trip.destinations.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'All' || trip.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    if (status === 'Completed' || status === 'Delivered' || status === 'Available') return 'success';
    if (status === 'In Transit' || status === 'Loading' || status === 'Planned' || status === 'On Trip') return 'warning';
    if (status === 'Delayed' || status === 'Failed' || status === 'Blocked' || status === 'Maintenance') return 'danger';
    return 'default';
  };

  const getVehicleStatusIcon = (status: string) => {
    if (status === 'On Trip') return <Truck className="w-4 h-4" />;
    if (status === 'Available') return <CheckCircle className="w-4 h-4" />;
    if (status === 'Loading') return <Package className="w-4 h-4" />;
    if (status === 'Maintenance') return <Settings className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logistics Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => setViewMode('routes')}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Trip
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'dispatch', label: 'Dispatch Board', icon: <Route className="w-4 h-4" /> },
            { id: 'fleet', label: 'Fleet Management', icon: <Truck className="w-4 h-4" /> },
            { id: 'routes', label: 'Route Planning', icon: <Map className="w-4 h-4" /> },
            { id: 'shipments', label: 'Inter-Island Shipments', icon: <Ship className="w-4 h-4" /> },
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

      {/* DISPATCH BOARD VIEW */}
      {viewMode === 'dispatch' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Trip ID, Driver, or Destination..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="All">All Status</option>
                  <option value="Planned">Planned</option>
                  <option value="Loading">Loading</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Completed">Completed</option>
                  <option value="Delayed">Delayed</option>
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

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Trips</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {trips.filter(t => t.status === 'In Transit' || t.status === 'Loading').length}
                    </p>
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
                    <p className="text-sm text-gray-500">Orders Ready</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{ordersReady.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Available Trucks</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {vehicles.filter(v => v.status === 'Available').length}
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
                    <p className="text-sm text-gray-500">Delayed</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {trips.filter(t => t.status === 'Delayed').length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dispatch Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Dispatch Queue</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trip Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle & Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Schedule
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTrips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${
                              trip.status === 'In Transit' ? 'bg-blue-100' :
                              trip.status === 'Completed' ? 'bg-green-100' :
                              trip.status === 'Delayed' ? 'bg-red-100' :
                              'bg-gray-100'
                            }`}>
                              {trip.status === 'In Transit' && <Navigation className="w-4 h-4 text-blue-600" />}
                              {trip.status === 'Completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                              {trip.status === 'Delayed' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                              {trip.status === 'Planned' && <Calendar className="w-4 h-4 text-gray-600" />}
                              {trip.status === 'Loading' && <Package className="w-4 h-4 text-yellow-600" />}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{trip.tripNumber}</div>
                              <div className="text-xs text-gray-500">
                                {trip.orders.length} order{trip.orders.length > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{trip.vehicleName}</div>
                              <div className="text-xs text-gray-500">{trip.driverName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-900">
                                {trip.destinations.join(' → ')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {trip.capacityUsed}% capacity
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{trip.departureTime || trip.scheduledDate}</div>
                          <div className="text-xs text-gray-500">ETA: {trip.eta || 'TBD'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{trip.orders.length} orders</div>
                          <div className="text-xs text-gray-500">
                            {trip.capacityUsed}% full
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusColor(trip.status)}>
                            {trip.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedTrip(trip);
                                setShowTripDetails(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="View Details"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              className="text-gray-600 hover:text-gray-800"
                              title="Contact Driver"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* FLEET MANAGEMENT VIEW */}
      {viewMode === 'fleet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fleet Overview */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Fleet Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${
                              vehicle.status === 'Available' ? 'bg-green-100' :
                              vehicle.status === 'On Trip' ? 'bg-blue-100' :
                              vehicle.status === 'Loading' ? 'bg-yellow-100' :
                              'bg-red-100'
                            }`}>
                              {getVehicleStatusIcon(vehicle.status)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{vehicle.vehicleName}</div>
                              <div className="text-xs text-gray-500">{vehicle.vehicleId}</div>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(vehicle.status)} className="text-xs">
                            {vehicle.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Type:</span>
                            <span className="text-gray-900 font-medium">{vehicle.type}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Utilization:</span>
                            <span className="text-gray-900 font-medium">{vehicle.utilizationPercent}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Trips Today:</span>
                            <span className="text-gray-900 font-medium">{vehicle.tripsToday}</span>
                          </div>
                          {vehicle.currentTrip && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Current Trip:</span>
                              <span className="text-blue-600 font-medium text-xs">{vehicle.currentTrip}</span>
                            </div>
                          )}
                          {vehicle.nextAvailableTime && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Available at:</span>
                              <span className="text-gray-900 font-medium text-xs">{vehicle.nextAvailableTime}</span>
                            </div>
                          )}
                          {vehicle.maintenanceDue && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Maintenance:</span>
                              <span className="text-orange-600 font-medium text-xs">{vehicle.maintenanceDue}</span>
                            </div>
                          )}
                        </div>

                        {vehicle.alerts && vehicle.alerts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            {vehicle.alerts.map((alert, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-orange-600">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{alert}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex items-center gap-2">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => navigate(`/logistics/${vehicle.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fleet Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fleet Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Total Vehicles</span>
                      <span className="text-gray-900 font-bold">{vehicles.length}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: '100%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Available</span>
                      <span className="text-green-600 font-bold">
                        {vehicles.filter(v => v.status === 'Available').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600"
                        style={{ width: `${(vehicles.filter(v => v.status === 'Available').length / vehicles.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">On Trip</span>
                      <span className="text-blue-600 font-bold">
                        {vehicles.filter(v => v.status === 'On Trip').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${(vehicles.filter(v => v.status === 'On Trip').length / vehicles.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Maintenance</span>
                      <span className="text-red-600 font-bold">
                        {vehicles.filter(v => v.status === 'Maintenance' || v.status === 'Out of Service').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600"
                        style={{ width: `${(vehicles.filter(v => v.status === 'Maintenance' || v.status === 'Out of Service').length / vehicles.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Avg. Utilization</span>
                      <span className="text-gray-900 font-bold">
                        {Math.round(vehicles.reduce((sum, v) => sum + v.utilizationPercent, 0) / vehicles.length)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-600"
                        style={{ width: `${Math.round(vehicles.reduce((sum, v) => sum + v.utilizationPercent, 0) / vehicles.length)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Vehicle
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Schedule Maintenance
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Fleet Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ROUTE PLANNING VIEW */}
      {viewMode === 'routes' && (
        <RoutePlanningView
          ordersReady={ordersReady}
          vehicles={vehicles}
          onCreateTrip={(selectedOrders, vehicleId) => {
            console.log('Creating trip with orders:', selectedOrders, 'for vehicle:', vehicleId);
            // In real implementation, would create trip and update state
            alert(`Trip created with ${selectedOrders.length} orders for vehicle ${vehicleId}`);
          }}
        />
      )}

      {/* SHIPMENTS VIEW */}
      {viewMode === 'shipments' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inter-Island Shipments</CardTitle>
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Book Shipment
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shipments.map((shipment) => (
                  <div key={shipment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${
                          shipment.type === 'Sea Freight' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {shipment.type === 'Sea Freight' ? (
                            <Ship className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Plane className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{shipment.shipmentNumber}</div>
                          <div className="text-sm text-gray-500">{shipment.type}</div>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(shipment.status)}>
                        {shipment.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Port/Airport</div>
                        <div className="text-sm font-medium text-gray-900">{shipment.port}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Destination</div>
                        <div className="text-sm font-medium text-gray-900">{shipment.destination}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Departure</div>
                        <div className="text-sm font-medium text-gray-900">{shipment.departureDate}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">ETA</div>
                        <div className="text-sm font-medium text-gray-900">{shipment.eta}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="text-sm text-gray-500">
                        {shipment.orders.length} order{shipment.orders.length > 1 ? 's' : ''} • {shipment.carrier || 'Carrier TBD'}
                        {shipment.trackingNumber && <span className="ml-2">• #{shipment.trackingNumber}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Globe className="w-3 h-3 mr-1" />
                          Track
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trip Details Modal */}
      {selectedTrip && (
        <TripDetailsModal
          isOpen={showTripDetails}
          onClose={() => {
            setShowTripDetails(false);
            setSelectedTrip(null);
          }}
          trip={selectedTrip}
          onEdit={() => {
            setShowTripDetails(false);
            setShowEditTrip(true);
          }}
        />
      )}

      {/* Edit Trip Modal */}
      {selectedTrip && (
        <EditTripModal
          isOpen={showEditTrip}
          onClose={() => {
            setShowEditTrip(false);
            setSelectedTrip(null);
          }}
          trip={selectedTrip}
          onSave={(updatedTrip) => {
            console.log('Trip updated:', updatedTrip);
            // TODO: Save to backend
            setShowEditTrip(false);
            setSelectedTrip(null);
          }}
        />
      )}
    </div>
  );
}
