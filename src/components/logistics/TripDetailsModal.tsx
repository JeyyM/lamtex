import React, { useEffect, useState } from 'react';
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
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-0 sm:p-4">
      <div className="bg-white w-full max-w-full h-full max-h-screen sm:h-auto sm:max-w-6xl sm:max-h-[90vh] sm:rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-white border-b border-gray-200 sm:rounded-t-lg px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-base sm:text-xl font-bold text-gray-900 flex items-center gap-2 break-words min-w-0">
                <Truck className="w-6 h-6 text-blue-600" />
                Trip Details: {trip.tripNumber}
              </h2>
              <Badge variant={getStatusColor(trip.status)} className="flex-shrink-0">{trip.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1 break-words">
              {trip.vehicleName} • {trip.driverName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={onEdit} variant="outline" size="sm" className="hidden sm:inline-flex">
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-6 space-y-7 w-full max-w-full">
          {/* Trip Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">Schedule</span>
              </div>
              <p className="text-base font-semibold text-blue-900 leading-relaxed">{trip.scheduledDate}</p>
              {trip.departureTime && (
                <p className="text-sm text-blue-700 leading-relaxed">Departure: {trip.departureTime}</p>
              )}
              {trip.eta && (
                <p className="text-sm text-blue-700 leading-relaxed">ETA: {trip.eta}</p>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">Capacity</span>
              </div>
              <p className="text-base font-semibold text-green-900 leading-relaxed">{trip.capacityUsed}% Used</p>
              <p className="text-sm text-green-700 leading-relaxed">Weight: {trip.weightUsed.toLocaleString()} / {trip.maxWeight.toLocaleString()} kg</p>
              <p className="text-sm text-green-700 leading-relaxed">Volume: {trip.volumeUsed} / {trip.maxVolume} m³</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-800">Route</span>
              </div>
              <p className="text-base font-semibold text-purple-900 leading-relaxed">{trip.destinations.length} Stop{trip.destinations.length > 1 ? 's' : ''}</p>
              <p className="text-sm text-purple-700 break-words leading-relaxed">{trip.destinations.join(' → ')}</p>
            </div>
          </div>

          {/* Delay Warning */}
          {trip.status === 'Delayed' && trip.delayReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Trip Delayed</h3>
                <p className="text-sm text-red-700 leading-relaxed break-words">{trip.delayReason}</p>
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
                  <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden w-full max-w-full">
                    {/* Customer Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                            <Badge variant="default" className="text-xs">
                              Stop {index + 1}
                            </Badge>
                            <h4 className="font-bold text-gray-900 break-words">{customer.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {customer.type}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-start gap-2 text-gray-600 min-w-0">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="break-words leading-relaxed">{customer.address}, {customer.city}, {customer.province} {customer.postalCode}</span>
                            </div>
                            <div className="flex items-start gap-2 text-gray-600 min-w-0">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="break-words leading-relaxed">{customer.contactPerson}</span>
                            </div>
                            <div className="flex items-start gap-2 text-gray-600 min-w-0">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="break-words leading-relaxed">{customer.phone}</span>
                            </div>
                            <div className="flex items-start gap-2 text-gray-600 min-w-0">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="break-words leading-relaxed">{customer.email}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="sm:ml-4">
                          <Badge variant={order.status === 'Approved' ? 'success' : 'warning'}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="p-5 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Order Number</p>
                          <p className="text-base font-medium text-gray-900 break-words leading-relaxed">{order.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Order Date</p>
                          <p className="text-base font-medium text-gray-900 leading-relaxed">{order.orderDate}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Required Date</p>
                          <p className="text-base font-medium text-gray-900 leading-relaxed">{order.requiredDate}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Payment Terms</p>
                          <p className="text-base font-medium text-gray-900 leading-relaxed">{order.paymentTerms}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                          <p className="font-bold text-green-600">
                            ₱{order.totalAmount?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                          <Badge variant={order.paymentStatus === 'Paid' ? 'success' : 'warning'} className="text-xs">
                            {order.paymentStatus}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Delivery Type</p>
                          <p className="text-base font-medium text-gray-900 leading-relaxed">{order.deliveryType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Agent</p>
                          <p className="text-base font-medium text-gray-900 leading-relaxed">{order.agent}</p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-2">Order Items ({order.items.length})</p>
                        <div className="hidden md:block bg-gray-50 rounded-lg overflow-hidden">
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
                                      <p className="font-medium text-gray-900 break-words">{item.productName}</p>
                                      <p className="text-xs text-gray-500 break-words">{item.variantDescription}</p>
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

                        <div className="md:hidden bg-gray-50 rounded-lg divide-y divide-gray-200">
                          {order.items.map((item) => (
                            <div key={item.id} className="p-4 space-y-3">
                              <p className="text-base font-medium text-gray-900 break-words leading-relaxed">{item.productName}</p>
                              <p className="text-sm text-gray-500 break-words leading-relaxed">{item.variantDescription}</p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-sm text-gray-500">Qty</p>
                                  <p className="text-base font-medium text-gray-900">{item.quantity}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Unit Price</p>
                                  <p className="text-base font-medium text-gray-900">₱{item.unitPrice.toLocaleString()}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-sm text-gray-500">Line Total</p>
                                  <p className="text-base font-semibold text-gray-900">₱{item.lineTotal.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Special Instructions */}
                      {order.orderNotes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs text-yellow-700 uppercase font-medium mb-1">Special Instructions</p>
                          <p className="text-sm text-yellow-900 break-words">{order.orderNotes}</p>
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
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-semibold text-gray-900 break-words text-left sm:text-right">{trip.driverName}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-500">Contact:</span>
                  <span className="text-gray-900 break-words text-left sm:text-right">+63 917 XXX XXXX</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-500">License:</span>
                  <span className="text-gray-900 break-words text-left sm:text-right">DL-XXXXXXX</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-gray-600" />
                Vehicle Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-500">Vehicle:</span>
                  <span className="font-semibold text-gray-900 break-words text-left sm:text-right">{trip.vehicleName}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-500">Plate:</span>
                  <span className="text-gray-900 break-words text-left sm:text-right">{trip.vehicleId}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-500">Capacity:</span>
                  <span className="text-gray-900 break-words text-left sm:text-right">{trip.maxWeight.toLocaleString()} kg / {trip.maxVolume} m³</span>
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
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 sm:rounded-b-lg px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600 break-words">
              Last updated: {new Date().toLocaleString()}
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto justify-center">
                Close
              </Button>
              <Button variant="primary" onClick={onEdit} className="w-full sm:w-auto justify-center">
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
