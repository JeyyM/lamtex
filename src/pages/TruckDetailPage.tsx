import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  ArrowLeft,
  Truck,
  Calendar,
  Wrench,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  DollarSign,
  Package,
  Fuel,
  User,
  Settings,
  Edit,
  Download,
  Upload,
  Star,
  Navigation,
  Weight,
  Box,
  Ruler,
  CreditCard,
  Building,
  Phone,
  Mail,
  Award,
  XCircle,
  Plus,
} from 'lucide-react';
import {
  getTruckDetails,
  getTripHistory,
  getMaintenanceHistory,
  getCalendarBookings,
  getTruckAlerts,
  getDriverAssignments,
} from '@/src/mock/truckDetails';

type TabMode = 'overview' | 'trips' | 'schedule' | 'maintenance' | 'performance';

export function TruckDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabMode>('overview');
  const [tripFilter, setTripFilter] = useState<string>('All');

  const truck = getTruckDetails(vehicleId || '');
  const tripHistory = getTripHistory(vehicleId || '');
  const maintenanceHistory = getMaintenanceHistory(vehicleId || '');
  const calendarBookings = getCalendarBookings(vehicleId || '');
  const alerts = getTruckAlerts(vehicleId || '');
  const drivers = getDriverAssignments(vehicleId || '');

  if (!truck) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Truck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-xl font-semibold text-gray-900">Truck Not Found</p>
          <p className="text-gray-500 mt-2">The truck you're looking for doesn't exist.</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/logistics')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Fleet
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'Available') return 'success';
    if (status === 'On Trip' || status === 'Loading') return 'warning';
    if (status === 'Maintenance') return 'danger';
    return 'default';
  };

  const primaryDriver = drivers.find(d => d.isPrimary);

  // Calculate financial metrics
  const totalRevenue = tripHistory.reduce((sum, trip) => sum + trip.revenue, 0);
  const totalFuelCost = tripHistory.reduce((sum, trip) => sum + trip.fuelCost, 0);
  const totalMaintenanceCost = maintenanceHistory.reduce((sum, m) => sum + m.cost, 0);
  const profitability = totalRevenue - totalFuelCost - totalMaintenanceCost;

  // Filter trips
  const filteredTrips = tripHistory.filter(trip => {
    if (tripFilter === 'All') return true;
    return trip.status === tripFilter;
  });

  // Generate calendar for current month
  const generateCalendar = () => {
    const today = new Date('2026-02-26');
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendar: (Date | null)[] = [];
    
    // Add empty cells for days before the first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendar.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(new Date(year, month, day));
    }
    
    return calendar;
  };

  const calendar = generateCalendar();

  const getBookingForDate = (date: Date | null) => {
    if (!date) return null;
    const dateStr = date.toISOString().split('T')[0];
    return calendarBookings.find(b => b.date === dateStr);
  };

  const getDateColor = (date: Date | null, booking: any) => {
    if (!date) return '';
    const today = new Date('2026-02-26');
    const isPast = date < today;
    
    if (isPast) return 'bg-gray-100 text-gray-400';
    if (!booking || booking.type === 'Available') return 'bg-white hover:bg-gray-50';
    if (booking.type === 'Trip') {
      if (booking.status === 'In Transit' || booking.status === 'Loading') return 'bg-blue-100 text-blue-800 font-semibold';
      return 'bg-blue-50 text-blue-700';
    }
    if (booking.type === 'Maintenance') return 'bg-orange-100 text-orange-800';
    return 'bg-white';
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/logistics')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Fleet
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {truck.vehicleId} - {truck.vehicleName}
              </h1>
              <Badge variant={getStatusColor(truck.status)}>{truck.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">{truck.plateNumber} • {truck.make} {truck.model}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit Details
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Trip
          </Button>
        </div>
      </div>

      {/* Hero Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{truck.totalTrips}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Distance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{truck.totalDistance.toLocaleString()} km</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Navigation className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Utilization (Week)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{truck.utilizationPercent}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Mileage</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{truck.currentMileage.toLocaleString()} km</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Truck className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    alert.type === 'Critical' ? 'bg-red-50 border border-red-200' :
                    alert.type === 'Warning' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  {alert.type === 'Critical' ? (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : alert.type === 'Warning' ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      alert.type === 'Critical' ? 'text-red-900' :
                      alert.type === 'Warning' ? 'text-yellow-900' :
                      'text-blue-900'
                    }`}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{alert.category} • {alert.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
            { id: 'trips', label: 'Trip History', icon: <MapPin className="w-4 h-4" /> },
            { id: 'schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
            { id: 'maintenance', label: 'Maintenance', icon: <Wrench className="w-4 h-4" /> },
            { id: 'performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabMode)}
              className={`
                flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
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

      {/* Tab Content */}
      <div>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Specifications */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vehicle Specifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-4">Basic Information</p>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Type</span>
                          <span className="text-sm font-medium text-gray-900">{truck.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Make</span>
                          <span className="text-sm font-medium text-gray-900">{truck.make}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Model</span>
                          <span className="text-sm font-medium text-gray-900">{truck.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Year</span>
                          <span className="text-sm font-medium text-gray-900">{truck.yearModel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Color</span>
                          <span className="text-sm font-medium text-gray-900">{truck.color}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Engine</span>
                          <span className="text-sm font-medium text-gray-900">{truck.engineType}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-4">Capacity & Dimensions</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Weight className="w-3 h-3" />
                            Max Weight
                          </span>
                          <span className="text-sm font-medium text-gray-900">{truck.maxWeight} kg</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Box className="w-3 h-3" />
                            Max Volume
                          </span>
                          <span className="text-sm font-medium text-gray-900">{truck.maxVolume} m³</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Ruler className="w-3 h-3" />
                            Length
                          </span>
                          <span className="text-sm font-medium text-gray-900">{truck.dimensions.length} m</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Ruler className="w-3 h-3" />
                            Width
                          </span>
                          <span className="text-sm font-medium text-gray-900">{truck.dimensions.width} m</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Ruler className="w-3 h-3" />
                            Height
                          </span>
                          <span className="text-sm font-medium text-gray-900">{truck.dimensions.height} m</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Registration & Acquisition */}
              <Card>
                <CardHeader>
                  <CardTitle>Registration & Acquisition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-4">Registration Details</p>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Plate Number</span>
                          <span className="text-sm font-medium text-gray-900">{truck.plateNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">OR/CR Number</span>
                          <span className="text-sm font-medium text-gray-900">{truck.orcrNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Registered</span>
                          <span className="text-sm font-medium text-gray-900">{truck.registrationDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Expires</span>
                          <span className="text-sm font-medium text-gray-900">{truck.registrationExpiry}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-4">Acquisition & Value</p>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Acquired</span>
                          <span className="text-sm font-medium text-gray-900">{truck.acquisitionDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Purchase Price</span>
                          <span className="text-sm font-medium text-gray-900">₱{truck.purchasePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Current Value</span>
                          <span className="text-sm font-medium text-gray-900">₱{truck.currentBookValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status</span>
                          <span className="text-sm font-medium text-gray-900">{truck.financingStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Branch</span>
                          <span className="text-sm font-medium text-gray-900">{truck.branch}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary (Recent Trips)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-600 mb-1">Total Revenue</p>
                      <p className="text-xl font-bold text-green-900">₱{totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-600 mb-1">Fuel Costs</p>
                      <p className="text-xl font-bold text-red-900">₱{totalFuelCost.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-600 mb-1">Maintenance</p>
                      <p className="text-xl font-bold text-orange-900">₱{totalMaintenanceCost.toLocaleString()}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${profitability >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-sm mb-1 ${profitability >= 0 ? 'text-blue-600' : 'text-gray-600'}`}>Net Profit</p>
                      <p className={`text-xl font-bold ${profitability >= 0 ? 'text-blue-900' : 'text-gray-900'}`}>₱{profitability.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Driver & Maintenance */}
            <div className="space-y-6">
              {/* Primary Driver */}
              {primaryDriver && (
                <Card>
                  <CardHeader>
                    <CardTitle>Primary Driver</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{primaryDriver.driverName}</p>
                        <p className="text-sm text-gray-500">{primaryDriver.driverId}</p>
                      </div>
                    </div>
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Trips</span>
                        <span className="text-sm font-medium text-gray-900">{primaryDriver.totalTrips}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">On-Time Rate</span>
                        <span className="text-sm font-medium text-green-600">{primaryDriver.onTimeRate}%</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      View Driver Profile
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Maintenance Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Current Mileage</span>
                        <span className="text-sm font-semibold text-gray-900">{truck.currentMileage.toLocaleString()} km</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${((truck.currentMileage - truck.mileageAtLastMaintenance) / 2000) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {(truck.currentMileage - truck.mileageAtLastMaintenance).toLocaleString()} km since last maintenance
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 space-y-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Last Maintenance</p>
                          <p className="text-xs text-gray-600">{truck.lastMaintenanceDate}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Next Due</p>
                          <p className="text-xs text-gray-600">{truck.nextMaintenanceDue}</p>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      <Wrench className="w-3 h-3 mr-2" />
                      Schedule Maintenance
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* All Drivers */}
              <Card>
                <CardHeader>
                  <CardTitle>All Drivers ({drivers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {drivers.map(driver => (
                      <div key={driver.driverId} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {driver.driverName}
                              {driver.isPrimary && (
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{driver.totalTrips} trips • {driver.onTimeRate}% OTR</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TRIP HISTORY TAB */}
        {activeTab === 'trips' && (
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <select
                    value={tripFilter}
                    onChange={(e) => setTripFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="All">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Failed">Failed</option>
                  </select>
                  <div className="flex-1" />
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Trip History Table */}
            <Card>
              <CardHeader>
                <CardTitle>Trip History ({filteredTrips.length} trips)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Trip ID</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Driver</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Route</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Orders</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Distance</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Duration</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Fuel</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Revenue</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrips.map((trip) => (
                        <tr key={trip.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                              {trip.tripNumber}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">{trip.date}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{trip.driverName}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {trip.route.join(' → ')}
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-900">{trip.ordersCount}</td>
                          <td className="py-3 px-4 text-center text-sm text-gray-900">{trip.distance} km</td>
                          <td className="py-3 px-4 text-center text-sm text-gray-900">{trip.duration}</td>
                          <td className="py-3 px-4 text-center text-sm text-gray-900">{trip.fuelUsed}L</td>
                          <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                            ₱{trip.revenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={trip.status === 'Completed' ? 'success' : trip.status === 'Delayed' ? 'warning' : 'danger'}>
                              {trip.status}
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

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>February 2026</CardTitle>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
                      <span className="text-gray-600">On Trip</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded" />
                      <span className="text-gray-600">Maintenance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-white border border-gray-300 rounded" />
                      <span className="text-gray-600">Available</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {calendar.map((date, index) => {
                    const booking = getBookingForDate(date);
                    const colorClass = getDateColor(date, booking);
                    
                    return (
                      <div
                        key={index}
                        className={`min-h-[80px] p-2 border rounded-lg ${colorClass} ${
                          date ? 'cursor-pointer transition-shadow hover:shadow-md' : ''
                        }`}
                      >
                        {date && (
                          <>
                            <p className="text-sm font-medium mb-1">{date.getDate()}</p>
                            {booking && booking.type !== 'Available' && (
                              <div className="text-xs">
                                {booking.type === 'Trip' ? (
                                  <>
                                    <p className="font-medium truncate">{booking.tripNumber}</p>
                                    <p className="text-gray-600 truncate">{booking.driver}</p>
                                  </>
                                ) : (
                                  <p className="font-medium">Maintenance</p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calendarBookings
                    .filter(b => new Date(b.date) >= new Date('2026-02-26'))
                    .slice(0, 5)
                    .map((booking, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {booking.type === 'Trip' ? (
                            <MapPin className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Wrench className="w-5 h-5 text-orange-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {booking.type === 'Trip' ? booking.tripNumber : 'Scheduled Maintenance'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {booking.date} {booking.driver && `• ${booking.driver}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant={booking.type === 'Trip' ? 'warning' : 'danger'}>
                          {booking.status || booking.type}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Maintenance History</CardTitle>
                  <Button variant="primary" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Maintenance Record
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {maintenanceHistory.map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            record.category === 'Preventive' ? 'bg-green-100' :
                            record.category === 'Corrective' ? 'bg-orange-100' :
                            'bg-red-100'
                          }`}>
                            <Wrench className={`w-5 h-5 ${
                              record.category === 'Preventive' ? 'text-green-600' :
                              record.category === 'Corrective' ? 'text-orange-600' :
                              'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{record.type}</p>
                            <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">₱{record.cost.toLocaleString()}</p>
                          <Badge variant={
                            record.category === 'Preventive' ? 'success' :
                            record.category === 'Corrective' ? 'warning' :
                            'danger'
                          }>
                            {record.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 pt-3 border-t border-gray-200 text-sm">
                        <div>
                          <span className="text-gray-500">Date</span>
                          <p className="font-medium text-gray-900">{record.date}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Mileage</span>
                          <p className="font-medium text-gray-900">{record.mileage.toLocaleString()} km</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Service Provider</span>
                          <p className="font-medium text-gray-900">{record.serviceProvider}</p>
                        </div>
                        {record.nextDue && (
                          <div>
                            <span className="text-gray-500">Next Due</span>
                            <p className="font-medium text-gray-900">{record.nextDue}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Avg Capacity Use</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {Math.round(tripHistory.reduce((sum, t) => sum + (t.distance / truck.maxWeight * 100), 0) / tripHistory.length)}%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Fuel Efficiency</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {(tripHistory.reduce((sum, t) => sum + t.distance, 0) / 
                          tripHistory.reduce((sum, t) => sum + t.fuelUsed, 0)).toFixed(1)} km/L
                      </p>
                    </div>
                    <Fuel className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">On-Time Rate</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {Math.round((tripHistory.filter(t => t.status === 'Completed').length / tripHistory.length) * 100)}%
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Avg Trip Revenue</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        ₱{Math.round(totalRevenue / tripHistory.length).toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600">Performance charts coming soon</p>
                    <p className="text-sm text-gray-500">Trip volume, revenue, and efficiency trends</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
