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
  X,
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
type TransportType = 'truck' | 'interisland';

export function LogisticsPage() {
  const { branch } = useAppContext();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('dispatch');
  const [transportType, setTransportType] = useState<TransportType>('truck');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedCalendarTrip, setSelectedCalendarTrip] = useState<Trip | null>(null);

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

  // Generate consistent light color based on vehicle ID
  const getVehicleColor = (vehicleId: string) => {
    // Simple seeded random number generator
    let seed = 0;
    for (let i = 0; i < vehicleId.length; i++) {
      seed = seed * 31 + vehicleId.charCodeAt(i);
    }
    
    // Use seed to generate pseudo-random values
    const random1 = Math.abs(Math.sin(seed) * 10000) % 1;
    const random2 = Math.abs(Math.sin(seed * 2) * 10000) % 1;
    const random3 = Math.abs(Math.sin(seed * 3) * 10000) % 1;
    
    const hue = Math.floor(random1 * 360);
    const saturation = 55 + Math.floor(random2 * 20); // 55-75%
    const lightness = 75 + Math.floor(random3 * 10); // 75-85%
    
    return {
      bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      text: `hsl(${hue}, ${Math.min(saturation + 25, 95)}%, 25%)`, // Darker text
      border: `hsl(${hue}, ${saturation}%, ${lightness - 20}%)` // Darker border
    };
  };

  const viewModeTabs = [
    { id: 'dispatch' as ViewMode, label: 'Dispatch Board', icon: <Route className="w-4 h-4" /> },
    { id: 'fleet' as ViewMode, label: 'Fleet Management', icon: <Truck className="w-4 h-4" /> },
    { id: 'routes' as ViewMode, label: 'Route Planning', icon: <Map className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full max-w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logistics Management</h1>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-3">
          <Button variant="primary" onClick={() => setViewMode('routes')} className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4 mr-2" />
            Create New Trip
          </Button>
        </div>
      </div>

      {/* Transport Type Toggle */}
      <div className="flex items-start">
        <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-gray-50">
          <button
            onClick={() => setTransportType('truck')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${transportType === 'truck'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <Truck className="w-4 h-4" />
            Truck Deliveries
          </button>
          <button
            onClick={() => setTransportType('interisland')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${transportType === 'interisland'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <Ship className="w-4 h-4" />
            Inter-Island Shipments
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200 w-full max-w-full">
        <div className="md:hidden pb-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {viewModeTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>
        <nav className="hidden md:flex gap-8">
          {viewModeTabs.map((tab) => (
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
        <div className="space-y-6 w-full max-w-full">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 md:gap-4 w-full max-w-full">
                <div className="w-full lg:flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={transportType === 'truck' 
                      ? "Search by Trip ID, Driver, or Destination..." 
                      : "Search by Shipment ID, Captain, or Port..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full lg:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="All">All Status</option>
                  <option value="Planned">Planned</option>
                  <option value="Loading">Loading</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Completed">Completed</option>
                  <option value="Delayed">Delayed</option>
                </select>
                <Button variant="outline" className="w-full lg:w-auto justify-center">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                </Button>
                <Button variant="outline" className="w-full lg:w-auto justify-center">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <Card className="w-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      {transportType === 'truck' ? 'Active Trips' : 'Active Shipments'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {transportType === 'truck' 
                        ? trips.filter(t => t.status === 'In Transit' || t.status === 'Loading').length
                        : shipments.filter(s => s.status === 'In Transit' || s.status === 'Preparing').length}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${transportType === 'truck' ? 'bg-blue-100' : 'bg-cyan-100'}`}>
                    {transportType === 'truck' ? (
                      <Truck className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Ship className="w-6 h-6 text-cyan-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
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
            <Card className="w-full">
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
            <Card className="w-full">
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

          {/* Schedule Calendar - Only for Truck Transport */}
          {transportType === 'truck' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <CardTitle>Dispatch Schedule (14 Days)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {(() => {
                    // Hardcoded calendar days for illustration (Feb 25 - Mar 10, 2026)
                    const calendarDays = [
                      { date: '2026-02-25', day: 'Wed', dayNum: 25, isToday: false },
                      { date: '2026-02-26', day: 'Thu', dayNum: 26, isToday: false },
                      { date: '2026-02-27', day: 'Fri', dayNum: 27, isToday: false },
                      { date: '2026-02-28', day: 'Sat', dayNum: 28, isToday: false },
                      { date: '2026-03-01', day: 'Sun', dayNum: 1, isToday: false },
                      { date: '2026-03-02', day: 'Mon', dayNum: 2, isToday: false },
                      { date: '2026-03-03', day: 'Tue', dayNum: 3, isToday: false },
                      { date: '2026-03-04', day: 'Wed', dayNum: 4, isToday: true },  // Today
                      { date: '2026-03-05', day: 'Thu', dayNum: 5, isToday: false },
                      { date: '2026-03-06', day: 'Fri', dayNum: 6, isToday: false },
                      { date: '2026-03-07', day: 'Sat', dayNum: 7, isToday: false },
                      { date: '2026-03-08', day: 'Sun', dayNum: 8, isToday: false },
                      { date: '2026-03-09', day: 'Mon', dayNum: 9, isToday: false },
                      { date: '2026-03-10', day: 'Tue', dayNum: 10, isToday: false },
                    ];

                    // Map trips to calendar events
                    const eventsByDate: Record<string, Trip[]> = {};
                    trips.forEach(trip => {
                      const dateKey = trip.scheduledDate;
                      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
                      eventsByDate[dateKey].push(trip);
                    });

                    return calendarDays.map((day, idx) => {
                      const dayTrips = eventsByDate[day.date] || [];

                      return (
                        <div
                          key={idx}
                          className={`min-h-28 p-2 rounded-lg border transition-all ${
                            day.isToday
                              ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                              : 'bg-white border-gray-200'
                          } ${dayTrips.length > 0 ? 'hover:shadow-md' : 'opacity-60'}`}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-semibold ${day.isToday ? 'text-red-700' : 'text-gray-500'}`}>
                                {day.day}
                              </span>
                              <span className={`text-sm font-bold ${day.isToday ? 'text-red-700' : 'text-gray-900'}`}>
                                {day.dayNum}
                              </span>
                            </div>
                            
                            <div className="flex-1 space-y-1 overflow-hidden">
                              {dayTrips.slice(0, 4).map((trip, tripIdx) => {
                                const colors = getVehicleColor(trip.vehicleId);
                                return (
                                  <div
                                    key={tripIdx}
                                    className="text-xs p-1.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{
                                      backgroundColor: colors.bg,
                                      borderLeft: `3px solid ${colors.border}`
                                    }}
                                    title={`${trip.tripNumber} - ${trip.vehicleName} (${trip.driverName})`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCalendarTrip(trip);
                                    }}
                                  >
                                    <div className="flex items-center gap-1">
                                      <Truck className="w-3 h-3 flex-shrink-0" style={{ color: colors.text }} />
                                      <span className="font-medium truncate flex-1" style={{ color: colors.text }}>
                                        {trip.vehicleName}
                                      </span>
                                    </div>
                                    <div className="truncate text-[10px] mt-0.5" style={{ color: colors.text, opacity: 0.8 }}>
                                      {trip.driverName}
                                    </div>
                                  </div>
                                );
                              })}
                              {dayTrips.length > 4 && (
                                <div className="text-[10px] text-gray-500 text-center font-medium pt-0.5">
                                  +{dayTrips.length - 4} more
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dispatch Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{transportType === 'truck' ? 'Dispatch Queue' : 'Shipment Queue'}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {transportType === 'truck' ? (
                /* TRUCK DISPATCH TABLE */
                <>
                <div className="hidden md:block">
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

              <div className="md:hidden divide-y divide-gray-200">
                {filteredTrips.map((trip) => (
                  <div key={trip.id} className="p-4 space-y-3 w-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 break-words">{trip.tripNumber}</p>
                        <p className="text-xs text-gray-500 mt-1 break-words">
                          {trip.orders.length} order{trip.orders.length > 1 ? 's' : ''} • {trip.vehicleName}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(trip.status)} className="flex-shrink-0">
                        {trip.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Driver</p>
                        <p className="text-gray-900 break-words">{trip.driverName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Schedule</p>
                        <p className="text-gray-900">{trip.departureTime || trip.scheduledDate}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Route</p>
                        <p className="text-gray-900 break-words">{trip.destinations.join(' -> ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Capacity</p>
                        <p className="text-gray-900">{trip.capacityUsed}% full</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ETA</p>
                        <p className="text-gray-900">{trip.eta || 'TBD'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => {
                          setSelectedTrip(trip);
                          setShowTripDetails(true);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 justify-center"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Contact
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
                </>
              ) : (
                /* INTER-ISLAND SHIPMENTS TABLE */
                <>
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shipment Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vessel & Captain
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Schedule
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cargo
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
                      {shipments.map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${
                                shipment.status === 'In Transit' ? 'bg-blue-100' :
                                shipment.status === 'Arrived' ? 'bg-green-100' :
                                shipment.status === 'Delayed' ? 'bg-red-100' :
                                'bg-gray-100'
                              }`}>
                                {shipment.type === 'Sea Freight' ? (
                                  <Ship className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Plane className="w-4 h-4 text-purple-600" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{shipment.shipmentNumber}</div>
                                <div className="text-xs text-gray-500">{shipment.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Ship className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{shipment.carrier || 'Carrier TBD'}</div>
                                <div className="text-xs text-gray-500">{shipment.trackingNumber || 'No tracking'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-900">
                                  {shipment.port} → {shipment.destination}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{shipment.departureDate}</div>
                            <div className="text-xs text-gray-500">ETA: {shipment.eta}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{shipment.orders.length} orders</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={getStatusColor(shipment.status)}>
                              {shipment.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="text-blue-600 hover:text-blue-800"
                                title="View Details"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                className="text-gray-600 hover:text-gray-800"
                                title="Track Shipment"
                              >
                                <Globe className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-200">
                  {shipments.map((shipment) => (
                    <div key={shipment.id} className="p-4 space-y-3 w-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 break-words">{shipment.shipmentNumber}</p>
                          <p className="text-xs text-gray-500 mt-1 break-words">
                            {shipment.orders.length} order{shipment.orders.length > 1 ? 's' : ''} • {shipment.type}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(shipment.status)} className="flex-shrink-0">
                          {shipment.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Carrier</p>
                          <p className="text-gray-900 break-words">{shipment.carrier || 'TBD'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Departure</p>
                          <p className="text-gray-900">{shipment.departureDate}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Route</p>
                          <p className="text-gray-900 break-words">{shipment.port} → {shipment.destination}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tracking</p>
                          <p className="text-gray-900 break-words">{shipment.trackingNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">ETA</p>
                          <p className="text-gray-900">{shipment.eta}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-center"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-center"
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          Track
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* FLEET MANAGEMENT VIEW */}
      {viewMode === 'fleet' && transportType === 'truck' && (
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
                      <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow w-full max-w-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg ${
                              vehicle.status === 'Available' ? 'bg-green-100' :
                              vehicle.status === 'On Trip' ? 'bg-blue-100' :
                              vehicle.status === 'Loading' ? 'bg-yellow-100' :
                              'bg-red-100'
                            }`}>
                              {getVehicleStatusIcon(vehicle.status)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 break-words">{vehicle.vehicleName}</div>
                              <div className="text-xs text-gray-500 break-words">{vehicle.vehicleId}</div>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(vehicle.status)} className="text-xs flex-shrink-0">
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
                              <span className="text-blue-600 font-medium text-xs break-words text-right">{vehicle.currentTrip}</span>
                            </div>
                          )}
                          {vehicle.nextAvailableTime && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Available at:</span>
                              <span className="text-gray-900 font-medium text-xs break-words text-right">{vehicle.nextAvailableTime}</span>
                            </div>
                          )}
                          {vehicle.maintenanceDue && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Maintenance:</span>
                              <span className="text-orange-600 font-medium text-xs break-words text-right">{vehicle.maintenanceDue}</span>
                            </div>
                          )}
                        </div>

                        {vehicle.alerts && vehicle.alerts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            {vehicle.alerts.map((alert, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-orange-600">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="break-words">{alert}</span>
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

      {/* FLEET MANAGEMENT VIEW - INTER-ISLAND */}
      {viewMode === 'fleet' && transportType === 'interisland' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fleet Overview */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vessel Fleet Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {shipments.map((shipment) => (
                      <div key={shipment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow w-full max-w-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg ${
                              shipment.status === 'Arrived' ? 'bg-green-100' :
                              shipment.status === 'In Transit' ? 'bg-blue-100' :
                              shipment.status === 'Preparing' ? 'bg-yellow-100' :
                              'bg-red-100'
                            }`}>
                              {shipment.type === 'Sea Freight' ? (
                                <Ship className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Plane className="w-4 h-4 text-purple-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 break-words">{shipment.carrier || 'Carrier TBD'}</div>
                              <div className="text-xs text-gray-500 break-words">{shipment.shipmentNumber}</div>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(shipment.status)} className="text-xs flex-shrink-0">
                            {shipment.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Type:</span>
                            <span className="text-gray-900 font-medium">{shipment.type}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Route:</span>
                            <span className="text-gray-900 font-medium truncate">{shipment.port} → {shipment.destination}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Cargo:</span>
                            <span className="text-gray-900 font-medium">{shipment.orders.length} orders</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">ETA:</span>
                            <span className="text-gray-900 font-medium">{shipment.eta}</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                        >
                          View Details
                        </Button>
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
                  <CardTitle className="text-base">Vessel Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Total Vessels</span>
                      <span className="text-gray-900 font-bold">{shipments.length}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">In Transit</span>
                      <span className="text-gray-900 font-bold">
                        {shipments.filter(s => s.status === 'In Transit').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(shipments.filter(s => s.status === 'In Transit').length / shipments.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Preparing</span>
                      <span className="text-gray-900 font-bold">
                        {shipments.filter(s => s.status === 'Preparing').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full transition-all"
                        style={{ width: `${(shipments.filter(s => s.status === 'Preparing').length / shipments.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Arrived</span>
                      <span className="text-gray-900 font-bold">
                        {shipments.filter(s => s.status === 'Arrived').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(shipments.filter(s => s.status === 'Arrived').length / shipments.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Book New Shipment
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Globe className="w-4 h-4 mr-2" />
                    Track All Shipments
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Manifest
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

      {/* Calendar Trip Detail Modal */}
      {selectedCalendarTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div 
              className="flex items-center gap-3 p-6 border-b border-gray-200"
              style={{
                backgroundColor: getVehicleColor(selectedCalendarTrip.vehicleId).bg,
                borderLeftWidth: '6px',
                borderLeftColor: getVehicleColor(selectedCalendarTrip.vehicleId).border
              }}
            >
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <Truck className="w-6 h-6" style={{ color: getVehicleColor(selectedCalendarTrip.vehicleId).text }} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold" style={{ color: getVehicleColor(selectedCalendarTrip.vehicleId).text }}>
                  {selectedCalendarTrip.tripNumber}
                </h2>
                <p className="text-sm opacity-80" style={{ color: getVehicleColor(selectedCalendarTrip.vehicleId).text }}>
                  Scheduled for {selectedCalendarTrip.scheduledDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedCalendarTrip(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Vehicle & Driver */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-medium">Vehicle</p>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{selectedCalendarTrip.vehicleName}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-medium">Driver</p>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{selectedCalendarTrip.driverName}</p>
                  </div>
                </div>
              </div>

              {/* Status & Schedule */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-medium">Status</p>
                  <Badge variant={getStatusColor(selectedCalendarTrip.status)}>
                    {selectedCalendarTrip.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-medium">Departure</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedCalendarTrip.departureTime || 'TBD'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-medium">ETA</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedCalendarTrip.eta || 'TBD'}
                  </p>
                </div>
              </div>

              {/* Route */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase font-medium">Route</p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-900">{selectedCalendarTrip.destinations.join(' → ')}</p>
                </div>
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 uppercase font-medium">Capacity Used</p>
                  <p className="text-sm font-bold text-gray-900">{selectedCalendarTrip.capacityUsed}%</p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${selectedCalendarTrip.capacityUsed}%`,
                      backgroundColor: getVehicleColor(selectedCalendarTrip.vehicleId).border
                    }}
                  />
                </div>
              </div>

              {/* Orders */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase font-medium">Orders ({selectedCalendarTrip.orders.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCalendarTrip.orders.map((orderId, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {orderId}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setSelectedCalendarTrip(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedTrip(selectedCalendarTrip);
                  setShowTripDetails(true);
                  setSelectedCalendarTrip(null);
                }}
              >
                View Full Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
