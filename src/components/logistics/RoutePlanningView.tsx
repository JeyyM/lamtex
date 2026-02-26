import React, { useState } from 'react';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import {
  Map,
  MapPin,
  Package,
  Truck,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Navigation,
  Route,
  Weight,
  Box,
  Clock,
  DollarSign,
  Target,
  Maximize2,
} from 'lucide-react';
import { OrderReadyForDispatch, Vehicle } from '@/src/types/logistics';
import { TripScheduleModal } from './TripScheduleModal';
import { getCalendarBookings } from '@/src/mock/truckDetails';

interface RoutePlanningViewProps {
  ordersReady: OrderReadyForDispatch[];
  vehicles: Vehicle[];
  onCreateTrip: (selectedOrders: string[], vehicleId: string) => void;
}

export const RoutePlanningView: React.FC<RoutePlanningViewProps> = ({
  ordersReady,
  vehicles,
  onCreateTrip,
}) => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [optimizationMode, setOptimizationMode] = useState<'distance' | 'weight' | 'priority'>('distance');
  const [showMap, setShowMap] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Calculate totals for selected orders
  const selectedOrdersData = ordersReady.filter(o => selectedOrders.includes(o.id));
  const totalWeight = selectedOrdersData.reduce((sum, o) => sum + o.weight, 0);
  const totalVolume = selectedOrdersData.reduce((sum, o) => sum + o.volume, 0);

  // Get selected vehicle capacity
  const vehicle = vehicles.find(v => v.id === selectedVehicle);
  const maxWeight = vehicle?.maxCapacityKg || 5000;
  const maxVolume = vehicle?.maxCapacityCbm || 25;
  const weightUtilization = (totalWeight / maxWeight) * 100;
  const volumeUtilization = (totalVolume / maxVolume) * 100;

  // Sort orders by optimization mode
  const sortedOrders = [...ordersReady].sort((a, b) => {
    if (optimizationMode === 'distance') {
      // In real implementation, would calculate actual distances
      return a.destination.localeCompare(b.destination);
    } else if (optimizationMode === 'weight') {
      return b.weight - a.weight; // Heaviest first
    } else {
      return (a.priority || 3) - (b.priority || 3); // Highest priority first
    }
  });

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const getUrgencyColor = (urgency: string) => {
    if (urgency === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (urgency === 'Medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const isOverCapacity = weightUtilization > 100 || volumeUtilization > 100;
  const isOptimalLoad = weightUtilization >= 80 && weightUtilization <= 95 && volumeUtilization >= 80 && volumeUtilization <= 95;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Route Planning & Order Assignment</h2>
          <p className="text-sm text-gray-600 mt-1">
            Select orders and optimize delivery routes based on location and truck capacity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={optimizationMode}
            onChange={(e) => setOptimizationMode(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="distance">Optimize by Distance</option>
            <option value="weight">Optimize by Weight</option>
            <option value="priority">Optimize by Priority</option>
          </select>
          <Button
            variant="outline"
            onClick={() => setShowMap(!showMap)}
          >
            <Map className="w-4 h-4 mr-2" />
            {showMap ? 'Hide' : 'Show'} Map
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Order Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Map Placeholder */}
          {showMap && (
            <Card>
              <CardContent className="p-4">
                <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-blue-300 h-96 flex items-center justify-center relative overflow-hidden">
                  {/* Mock Google Maps Interface */}
                  <div className="absolute inset-0 p-6">
                    {/* Mock Map Controls */}
                    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 space-y-2">
                      <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mock Markers */}
                    <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2">
                      <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="mt-1 bg-white px-2 py-1 rounded shadow text-xs font-medium">Warehouse</div>
                    </div>

                    {selectedOrdersData.slice(0, 5).map((order, idx) => (
                      <div
                        key={order.id}
                        className="absolute"
                        style={{
                          top: `${30 + idx * 12}%`,
                          left: `${40 + idx * 8}%`,
                        }}
                      >
                        <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="mt-1 bg-white px-2 py-1 rounded shadow text-xs">
                          {order.destination}
                        </div>
                      </div>
                    ))}

                    {/* Route Lines (Mock) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <defs>
                        <marker
                          id="arrowhead"
                          markerWidth="10"
                          markerHeight="10"
                          refX="9"
                          refY="3"
                          orient="auto"
                        >
                          <polygon points="0 0, 10 3, 0 6" fill="#3B82F6" />
                        </marker>
                      </defs>
                      {selectedOrdersData.slice(0, 4).map((_, idx) => (
                        <line
                          key={idx}
                          x1={`${33 + idx * 8}%`}
                          y1={`${30 + idx * 12}%`}
                          x2={`${40 + (idx + 1) * 8}%`}
                          y2={`${30 + (idx + 1) * 12}%`}
                          stroke="#3B82F6"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          markerEnd="url(#arrowhead)"
                        />
                      ))}
                    </svg>
                  </div>

                  {/* Center Info */}
                  <div className="relative z-10 text-center">
                    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-300">
                      <Navigation className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                      <p className="text-lg font-bold text-gray-900 mb-2">Google Maps Integration</p>
                      <p className="text-sm text-gray-600 mb-4">
                        Interactive map showing delivery locations and optimized routes
                      </p>
                      <div className="flex items-center justify-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>Warehouse</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          <span>Delivery Points ({selectedOrders.length})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Route Summary */}
                {selectedOrders.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Route className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-900">Optimized Route</p>
                          <p className="text-sm text-gray-600">
                            {selectedOrders.length} stops • ~{(selectedOrders.length * 5).toFixed(0)} km • ~{(selectedOrders.length * 30)} mins
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Estimated Fuel</p>
                        <p className="font-bold text-gray-900">₱{(selectedOrders.length * 250).toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Available Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Available Orders ({ordersReady.length})</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Target className="w-4 h-4" />
                  {selectedOrders.length} selected
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sortedOrders.map((order) => {
                  const isSelected = selectedOrders.includes(order.id);
                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleOrderSelection(order.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                            <p className="text-sm text-gray-600">{order.customer}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium border ${getUrgencyColor(order.urgency)}`}>
                          {order.urgency}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Destination
                          </span>
                          <p className="font-medium text-gray-900">{order.destination}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Weight className="w-3 h-3" />
                            Weight
                          </span>
                          <p className="font-medium text-gray-900">{order.weight} kg</p>
                        </div>
                        <div>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Box className="w-3 h-3" />
                            Volume
                          </span>
                          <p className="font-medium text-gray-900">{order.volume} m³</p>
                        </div>
                        <div>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Required
                          </span>
                          <p className="font-medium text-gray-900">{order.requiredDate}</p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {order.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Trip Summary */}
        <div className="space-y-4">
          {/* Vehicle Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Vehicle</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a truck...</option>
                {vehicles.filter(v => v.status === 'Available').map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleName} - {v.plateNumber}
                  </option>
                ))}
              </select>

              {vehicle && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Max Weight</span>
                    <span className="font-semibold">{vehicle.maxCapacityKg} kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Max Volume</span>
                    <span className="font-semibold">{vehicle.maxCapacityCbm} m³</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Load Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Load Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Weight */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Weight className="w-4 h-4" />
                      Weight
                    </span>
                    <span className={`text-sm font-bold ${
                      weightUtilization > 100 ? 'text-red-600' :
                      weightUtilization > 85 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {weightUtilization.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        weightUtilization > 100 ? 'bg-red-500' :
                        weightUtilization > 85 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(weightUtilization, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {totalWeight.toFixed(0)} / {maxWeight} kg
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Box className="w-4 h-4" />
                      Volume
                    </span>
                    <span className={`text-sm font-bold ${
                      volumeUtilization > 100 ? 'text-red-600' :
                      volumeUtilization > 85 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {volumeUtilization.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        volumeUtilization > 100 ? 'bg-red-500' :
                        volumeUtilization > 85 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(volumeUtilization, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {totalVolume.toFixed(1)} / {maxVolume} m³
                  </div>
                </div>

                {/* Stats */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Orders Selected</span>
                    <span className="font-semibold text-gray-900">{selectedOrders.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Estimated Distance</span>
                    <span className="font-semibold text-gray-900">~{(selectedOrders.length * 5).toFixed(0)} km</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Estimated Time</span>
                    <span className="font-semibold text-gray-900">~{Math.floor(selectedOrders.length * 30 / 60)}h {(selectedOrders.length * 30) % 60}m</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Est. Fuel Cost</span>
                    <span className="font-semibold text-gray-900">₱{(selectedOrders.length * 250).toFixed(0)}</span>
                  </div>
                </div>

                {/* Status Messages */}
                {isOverCapacity && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">
                        <span className="font-semibold">Over Capacity!</span> Remove some orders or select a larger vehicle.
                      </p>
                    </div>
                  </div>
                )}

                {isOptimalLoad && !isOverCapacity && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-700">
                        <span className="font-semibold">Optimal Load!</span> Truck utilization is efficient.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              variant="primary"
              className="w-full"
              disabled={selectedOrders.length === 0 || !selectedVehicle || isOverCapacity}
              onClick={() => setShowScheduleModal(true)}
            >
              <Truck className="w-4 h-4 mr-2" />
              Create Delivery Trip
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedOrders([])}
              disabled={selectedOrders.length === 0}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <TripScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onConfirm={(selectedDates) => {
          console.log('Trip scheduled for dates:', selectedDates);
          onCreateTrip(selectedOrders, selectedVehicle);
          setSelectedOrders([]);
          setSelectedVehicle('');
        }}
        vehicleName={vehicle?.vehicleName || 'Selected Vehicle'}
        orderCount={selectedOrders.length}
        existingBookings={selectedVehicle ? getCalendarBookings(selectedVehicle) : []}
      />
    </div>
  );
};
