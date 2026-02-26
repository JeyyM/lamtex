import React, { useState } from 'react';
import { X, Package, Truck, Clock, MapPin, Calendar, User, AlertTriangle, CheckCircle, Edit } from 'lucide-react';

interface OrderItem {
  name: string;
  sku: string;
  quantity: number;
  currentStock: number;
  unit: string;
  status: 'available' | 'shortage' | 'partial';
  nextBatch?: {
    date: string;
    quantity: number;
  };
}

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderNumber: string;
    customer: string;
    destination: string;
    requiredDate: string;
    items: OrderItem[];
    totalWeight: number;
    totalVolume: number;
    urgency: 'High' | 'Medium' | 'Low';
    status: string;
    truckId?: string;
    truckName?: string;
    driverName?: string;
    scheduledDeparture?: string;
  };
}

export default function OrderDetailModal({ isOpen, onClose, order }: OrderDetailModalProps) {
  const [showProblemReport, setShowProblemReport] = useState(false);
  const [problemDescription, setProblemDescription] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(order.status);

  if (!isOpen) return null;

  const handleReportProblem = () => {
    console.log('Problem reported:', problemDescription);
    alert('Problem reported successfully!');
    setShowProblemReport(false);
    setProblemDescription('');
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    console.log('Status changed to:', newStatus);
  };

  const handleMarkAsLoaded = () => {
    console.log('Order marked as loaded:', order.orderNumber);
    alert('Order marked as loaded! Inventory will be deducted.');
    onClose();
  };

  const getStockStatusColor = (status: string) => {
    if (status === 'available') return 'text-green-600';
    if (status === 'shortage') return 'text-red-600';
    return 'text-yellow-600';
  };

  const getStockStatusIcon = (status: string) => {
    if (status === 'available') return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h2>
              <p className="text-sm text-gray-600">{order.customer}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Order Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-3">Delivery Information</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-600">Destination</div>
                      <div className="font-medium text-gray-900">{order.destination}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-600">Required Date</div>
                      <div className="font-medium text-gray-900">{order.requiredDate}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-600">Urgency</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.urgency === 'High' ? 'bg-red-100 text-red-800' :
                        order.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.urgency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-3">Capacity Requirements</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Weight</span>
                    <span className="font-semibold text-gray-900">{order.totalWeight} kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Volume</span>
                    <span className="font-semibold text-gray-900">{order.totalVolume} m³</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {order.truckId && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Assigned Truck</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-600">Vehicle</div>
                        <div className="font-medium text-gray-900">{order.truckName}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-600">Driver</div>
                        <div className="font-medium text-gray-900">{order.driverName}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-600">Scheduled Departure</div>
                        <div className="font-medium text-gray-900">{order.scheduledDeparture}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-3">Order Status</h3>
                <div className="space-y-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Assigned">Assigned to Truck</option>
                    <option value="Loading">Loading in Progress</option>
                    <option value="Loaded">Loaded & Ready</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                  <p className="text-xs text-gray-500">Update order status manually</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{item.quantity} {item.unit}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStockStatusIcon(item.status)}
                            <span className={`text-sm font-medium ${getStockStatusColor(item.status)}`}>
                              {item.status === 'available' ? 'Available' : 
                               item.status === 'shortage' ? 'Shortage' : 'Partial'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Stock: {item.currentStock}/{item.quantity} {item.unit}
                          </div>
                          {item.nextBatch && item.status !== 'available' && (
                            <div className="text-xs text-green-600 font-medium">
                              ✓ Next batch: {item.nextBatch.date} ({item.nextBatch.quantity} {item.unit})
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Problem Report Section */}
          {!showProblemReport ? (
            <button
              onClick={() => setShowProblemReport(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Report a Problem with this Order</span>
            </button>
          ) : (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Report Problem</h3>
                <button
                  onClick={() => setShowProblemReport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe the problem (e.g., damaged items, missing stock, wrong quantities, customer unavailable, etc.)"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReportProblem}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Submit Problem Report
                </button>
                <button
                  onClick={() => setShowProblemReport(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={handleMarkAsLoaded}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Mark as Loaded
          </button>
        </div>
      </div>
    </div>
  );
}
