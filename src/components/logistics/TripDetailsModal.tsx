import React, { useState } from 'react';
import { X, MapPin, Truck, User, Calendar, Clock, Package, AlertTriangle, Edit, CheckCircle, Phone, Mail, Building, FileText, Navigation } from 'lucide-react';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Trip } from '@/src/types/logistics';

interface TripDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onEdit: () => void;
}

export function TripDetailsModal({ isOpen, onClose, trip, onEdit }: TripDetailsModalProps) {
  if (!isOpen) return null;

  // Fixed illustrative orders for demo purposes
  const customersInTrip = [
    {
      order: {
        id: 'ORD-2026-1234',
        customer: 'ABC Hardware',
        customerId: 'CUS-001',
        orderDate: '2026-02-24',
        requiredDate: '2026-02-26',
        paymentTerms: '30 Days',
        status: 'Approved',
        paymentStatus: 'Unbilled',
        deliveryType: 'Truck',
        agent: 'Pedro Reyes',
        totalAmount: 125500,
        items: [
          {
            id: 'OL-1',
            productName: 'UPVC Sanitary Pipe',
            variantDescription: '4" x 10ft - Standard white',
            quantity: 50,
            unitPrice: 950,
            lineTotal: 47500,
          },
          {
            id: 'OL-2',
            productName: 'PVC Elbow',
            variantDescription: '4" - 90 degree',
            quantity: 100,
            unitPrice: 120,
            lineTotal: 12000,
          },
          {
            id: 'OL-3',
            productName: 'Solvent Cement',
            variantDescription: '500ml Industrial Grade',
            quantity: 20,
            unitPrice: 450,
            lineTotal: 9000,
          },
        ],
        orderNotes: 'Urgent delivery - Construction project deadline. Call before arrival.',
      },
      customer: {
        name: 'ABC Hardware',
        type: 'Hardware Store',
        contactPerson: 'Roberto Santos',
        phone: '+63 917 123 4567',
        email: 'roberto@abchardware.com',
        address: '123 Commonwealth Avenue',
        city: 'Quezon City',
        province: 'Metro Manila',
        postalCode: '1121',
      },
    },
    {
      order: {
        id: 'ORD-2026-1250',
        customer: 'BuildPro Manila',
        customerId: 'CUS-002',
        orderDate: '2026-02-23',
        requiredDate: '2026-02-26',
        paymentTerms: '45 Days',
        status: 'Approved',
        paymentStatus: 'Unbilled',
        deliveryType: 'Truck',
        agent: 'Juan Dela Cruz',
        totalAmount: 89750,
        items: [
          {
            id: 'OL-4',
            productName: 'PVC Conduit Pipe',
            variantDescription: '3/4" x 10ft - Orange',
            quantity: 75,
            unitPrice: 380,
            lineTotal: 28500,
          },
          {
            id: 'OL-5',
            productName: 'Junction Box',
            variantDescription: '4" x 4" - Heavy duty',
            quantity: 150,
            unitPrice: 85,
            lineTotal: 12750,
          },
          {
            id: 'OL-6',
            productName: 'PVC Coupling',
            variantDescription: '3/4" - Standard',
            quantity: 200,
            unitPrice: 45,
            lineTotal: 9000,
          },
        ],
      },
      customer: {
        name: 'BuildPro Manila',
        type: 'Construction Company',
        contactPerson: 'Maria Gonzales',
        phone: '+63 917 234 5678',
        email: 'maria@buildpro.ph',
        address: '456 Taft Avenue',
        city: 'Manila',
        province: 'Metro Manila',
        postalCode: '1004',
      },
    },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'Completed' || status === 'Delivered') return 'success';
    if (status === 'In Transit' || status === 'Loading' || status === 'Planned') return 'warning';
    if (status === 'Delayed' || status === 'Failed') return 'danger';
    return 'default';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-lg px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Truck className="w-6 h-6 text-blue-600" />
                Trip Details: {trip.tripNumber}
              </h2>
              <Badge variant={getStatusColor(trip.status)}>{trip.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {trip.vehicleName} • {trip.driverName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onEdit} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit Trip Info
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Trip Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Schedule</span>
              </div>
              <p className="text-lg font-bold text-blue-900">{trip.scheduledDate}</p>
              {trip.departureTime && (
                <p className="text-sm text-blue-700">Departure: {trip.departureTime}</p>
              )}
              {trip.eta && (
                <p className="text-sm text-blue-700">ETA: {trip.eta}</p>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Capacity</span>
              </div>
              <p className="text-lg font-bold text-green-900">{trip.capacityUsed}% Used</p>
              <p className="text-sm text-green-700">Weight: {trip.weightUsed.toLocaleString()} / {trip.maxWeight.toLocaleString()} kg</p>
              <p className="text-sm text-green-700">Volume: {trip.volumeUsed} / {trip.maxVolume} m³</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Route</span>
              </div>
              <p className="text-lg font-bold text-purple-900">{trip.destinations.length} Stop{trip.destinations.length > 1 ? 's' : ''}</p>
              <p className="text-sm text-purple-700">{trip.destinations.join(' → ')}</p>
            </div>
          </div>

          {/* Delay Warning */}
          {trip.status === 'Delayed' && trip.delayReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Trip Delayed</h3>
                <p className="text-sm text-red-700">{trip.delayReason}</p>
              </div>
            </div>
          )}

          {/* Orders & Customers */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-600" />
              Orders & Customers ({customersInTrip.length} order{customersInTrip.length > 1 ? 's' : ''})
            </h3>
            
            <div className="space-y-4">
              {customersInTrip.map(({ order, customer }, index) => {
                if (!order || !customer) return null;
                
                return (
                  <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Customer Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="default" className="text-xs">
                              Stop {index + 1}
                            </Badge>
                            <h4 className="font-bold text-gray-900">{customer.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {customer.type}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span>{customer.address}, {customer.city}, {customer.province} {customer.postalCode}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="w-4 h-4 text-gray-400" />
                              <span>{customer.contactPerson}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{customer.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{customer.email}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Badge variant={order.status === 'Approved' ? 'success' : 'warning'}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Order Number</p>
                          <p className="font-semibold text-gray-900">{order.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Order Date</p>
                          <p className="text-gray-900">{order.orderDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Required Date</p>
                          <p className="text-gray-900">{order.requiredDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Payment Terms</p>
                          <p className="text-gray-900">{order.paymentTerms}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Total Amount</p>
                          <p className="font-bold text-green-600">
                            ₱{order.totalAmount?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Payment Status</p>
                          <Badge variant={order.paymentStatus === 'Paid' ? 'success' : 'warning'} className="text-xs">
                            {order.paymentStatus}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Delivery Type</p>
                          <p className="text-gray-900">{order.deliveryType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Agent</p>
                          <p className="text-gray-900">{order.agent}</p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-2">Order Items ({order.items.length})</p>
                        <div className="bg-gray-50 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 border-b border-gray-200">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Product</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Qty</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Unit Price</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Line Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {order.items.map((item) => (
                                <tr key={item.id} className="hover:bg-white">
                                  <td className="px-3 py-2">
                                    <div>
                                      <p className="font-medium text-gray-900">{item.productName}</p>
                                      <p className="text-xs text-gray-500">{item.variantDescription}</p>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-900">{item.quantity}</td>
                                  <td className="px-3 py-2 text-right text-gray-900">₱{item.unitPrice.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                    ₱{item.lineTotal.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Special Instructions */}
                      {order.orderNotes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs text-yellow-700 uppercase font-medium mb-1">Special Instructions</p>
                          <p className="text-sm text-yellow-900">{order.orderNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Driver & Vehicle Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                Driver Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-semibold text-gray-900">{trip.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contact:</span>
                  <span className="text-gray-900">+63 917 XXX XXXX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">License:</span>
                  <span className="text-gray-900">DL-XXXXXXX</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-gray-600" />
                Vehicle Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle:</span>
                  <span className="font-semibold text-gray-900">{trip.vehicleName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Plate:</span>
                  <span className="text-gray-900">{trip.vehicleId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Capacity:</span>
                  <span className="text-gray-900">{trip.maxWeight.toLocaleString()} kg / {trip.maxVolume} m³</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logistics Notes */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Logistics Notes
            </h3>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Add notes for driver, special delivery instructions, route changes, etc..."
              defaultValue={trip.delayReason || ''}
            />
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 rounded-b-lg px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Last updated: {new Date().toLocaleString()}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Trip Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
