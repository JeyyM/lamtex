import React, { useEffect, useState } from 'react';
import { X, MapPin, Truck, User, Calendar, Clock, Package, AlertTriangle, Edit, CheckCircle, Phone, Mail, Building, FileText, Navigation, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Trip } from '@/src/types/logistics';
import { supabase } from '@/src/lib/supabase';

interface OrderLineItem {
  id: string;
  productName: string;
  variantDescription: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface TripOrder {
  order: {
    id: string;
    orderNumber: string;
    customer: string;
    orderDate: string;
    requiredDate: string;
    paymentTerms: string;
    status: string;
    paymentStatus: string;
    deliveryType: string;
    agent: string;
    totalAmount: number;
    items: OrderLineItem[];
    orderNotes?: string;
  };
  customer: {
    name: string;
    type: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
  } | null;
}

interface TripDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onEdit: () => void;
}

export function TripDetailsModal({ isOpen, onClose, trip, onEdit }: TripDetailsModalProps) {
  const navigate = useNavigate();
  const [ordersData, setOrdersData] = useState<TripOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Fetch real orders whenever the modal opens or the trip changes
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const load = async () => {
      if (!trip.orders.length) { setOrdersData([]); return; }
      setOrdersLoading(true);
      try {
        // Fetch all orders for this trip in one query
        const { data: rows } = await supabase
          .from('orders')
          .select(
            'id, order_number, customer_id, customer_name, agent_name, order_date, required_date, payment_terms, status, payment_status, delivery_type, total_amount, order_notes',
          )
          .in('id', trip.orders);

        if (!rows?.length) { setOrdersData([]); setOrdersLoading(false); return; }

        // Fetch all line items for these orders in one query
        const { data: lineRows } = await supabase
          .from('order_line_items')
          .select('id, order_id, product_name, variant_description, quantity, unit_price, line_total')
          .in('order_id', trip.orders)
          .order('created_at');

        // Fetch customer details for all unique customer IDs
        const custIds = [...new Set(rows.map((r: any) => r.customer_id).filter(Boolean))];
        const { data: custRows } = custIds.length
          ? await supabase
              .from('customers')
              .select('id, name, type, contact_person, phone, email, address, city, province, postal_code')
              .in('id', custIds)
          : { data: [] };

        const custMap = new Map((custRows ?? []).map((c: any) => [c.id, c]));
        const lineMap = new Map<string, OrderLineItem[]>();
        for (const li of lineRows ?? []) {
          const oid = (li as any).order_id as string;
          if (!lineMap.has(oid)) lineMap.set(oid, []);
          lineMap.get(oid)!.push({
            id: (li as any).id,
            productName: (li as any).product_name ?? '—',
            variantDescription: (li as any).variant_description ?? '',
            quantity: Number((li as any).quantity ?? 0),
            unitPrice: Number((li as any).unit_price ?? 0),
            lineTotal: Number((li as any).line_total ?? 0),
          });
        }

        const result: TripOrder[] = rows.map((r: any) => {
          const cust = custMap.get(r.customer_id) ?? null;
          return {
            order: {
              id: r.id,
              orderNumber: r.order_number ?? r.id,
              customer: r.customer_name ?? '—',
              orderDate: r.order_date ? new Date(r.order_date).toLocaleDateString('en-PH') : '—',
              requiredDate: r.required_date ? new Date(r.required_date).toLocaleDateString('en-PH') : '—',
              paymentTerms: r.payment_terms ?? '—',
              status: r.status ?? '—',
              paymentStatus: r.payment_status ?? '—',
              deliveryType: r.delivery_type ?? '—',
              agent: r.agent_name ?? '—',
              totalAmount: Number(r.total_amount ?? 0),
              items: lineMap.get(r.id) ?? [],
              orderNotes: r.order_notes ?? undefined,
            },
            customer: cust ? {
              name: cust.name ?? '—',
              type: cust.type ?? '—',
              contactPerson: cust.contact_person ?? '—',
              phone: cust.phone ?? '—',
              email: cust.email ?? '—',
              address: cust.address ?? '—',
              city: cust.city ?? '—',
              province: cust.province ?? '—',
              postalCode: cust.postal_code ?? '',
            } : null,
          };
        });

        // Keep same order as trip.orders array
        const orderIndex = new Map(trip.orders.map((id, i) => [id, i]));
        result.sort((a, b) => (orderIndex.get(a.order.id) ?? 0) - (orderIndex.get(b.order.id) ?? 0));

        setOrdersData(result);
      } finally {
        setOrdersLoading(false);
      }
    };

    load();

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, trip.id]);

  if (!isOpen) return null;

  const customersInTrip = ordersData;

  const getStatusColor = (status: string) => {
    if (status === 'Completed' || status === 'Delivered') return 'success';
    if (status === 'In Transit' || status === 'Loading' || status === 'Scheduled') return 'warning';
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
              Orders & Customers
              {!ordersLoading && (
                <span className="text-base font-normal text-gray-500">
                  ({customersInTrip.length} order{customersInTrip.length !== 1 ? 's' : ''})
                </span>
              )}
            </h3>

            {ordersLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading orders…</span>
              </div>
            ) : customersInTrip.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No orders assigned to this trip.</p>
            ) : (
            <div className="space-y-4">
              {customersInTrip.map(({ order, customer }, index) => {
                if (!order) return null;

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
                            <h4 className="font-bold text-gray-900 break-words">{customer?.name ?? order.customer}</h4>
                            {customer?.type && (
                              <Badge variant="outline" className="text-xs">
                                {customer.type}
                              </Badge>
                            )}
                          </div>

                          {customer && (
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
                          )}
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-medium text-gray-900 break-words leading-relaxed">{order.orderNumber}</p>
                            <button
                              type="button"
                              onClick={() => { onClose(); navigate(`/orders/${order.id}`); }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                              title="Go to order page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Order
                            </button>
                          </div>
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
            )}
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
            {trip.delayReason ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{trip.delayReason}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No logistics notes for this trip.</p>
            )}
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
