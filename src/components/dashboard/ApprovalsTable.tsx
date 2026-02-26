import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { ApprovalOrder } from '@/src/types/executive';
import { useAppContext } from '@/src/store/AppContext';
import { Check, X, AlertTriangle, MapPin, Edit, ExternalLink, MessageSquare, ArrowRight } from 'lucide-react';

interface ApprovalsTableProps {
  orders: ApprovalOrder[];
  showViewAll?: boolean;
}

export function ApprovalsTable({ orders, showViewAll = false }: ApprovalsTableProps) {
  const navigate = useNavigate();
  const { addAuditLog } = useAppContext();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [rejectingOrder, setRejectingOrder] = useState<ApprovalOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingOrder, setApprovingOrder] = useState<ApprovalOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<ApprovalOrder | null>(null);

  const handleApprove = (order: ApprovalOrder) => {
    setApprovingOrder(order);
  };

  const confirmApprove = () => {
    if (!approvingOrder) return;
    addAuditLog('Approved Order', 'Order', `Approved ${approvingOrder.orderNumber} - ${approvingOrder.customer} - ₱${approvingOrder.totalAmount.toLocaleString()}`);
    alert(`✅ Order ${approvingOrder.orderNumber} approved successfully!`);
    setApprovingOrder(null);
  };

  const handleReject = (order: ApprovalOrder) => {
    setRejectingOrder(order);
    setRejectReason('');
  };

  const confirmReject = () => {
    if (!rejectingOrder || !rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    addAuditLog('Rejected Order', 'Order', `Rejected ${rejectingOrder.orderNumber} - Reason: ${rejectReason}`);
    alert(`❌ Order ${rejectingOrder.orderNumber} rejected.`);
    setRejectingOrder(null);
    setRejectReason('');
  };

  const handleBulkApprove = () => {
    if (selectedOrders.length === 0) return;
    if (window.confirm(`Are you sure you want to approve ${selectedOrders.length} orders?`)) {
      const orderNumbers = orders.filter(o => selectedOrders.includes(o.id)).map(o => o.orderNumber).join(', ');
      addAuditLog('Bulk Approved Orders', 'Order', `Approved ${selectedOrders.length} orders: ${orderNumbers}`);
      alert(`✅ Successfully approved ${selectedOrders.length} orders.`);
      setSelectedOrders([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(oId => oId !== id) : [...prev, id]
    );
  };

  const openGoogleMaps = (location?: string, customer?: string) => {
    if (!location) {
      alert('No location data available for this customer.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(url, '_blank');
  };

  const handleEdit = (order: ApprovalOrder) => {
    setEditingOrder(order);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Priority Action Center: Approvals</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {orders.length} pending approval{orders.length !== 1 ? 's' : ''} • Sorted by urgency
            </p>
          </div>
          {selectedOrders.length > 0 && (
            <Button variant="primary" size="sm" className="gap-2" onClick={handleBulkApprove}>
              <Check className="w-4 h-4" />
              Bulk Approve ({selectedOrders.length})
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input 
                      type="checkbox" 
                      onChange={(e) => setSelectedOrders(e.target.checked ? orders.map(o => o.id) : [])}
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Order #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Margin</th>
                  <th className="px-4 py-3 font-medium">Req. Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No pending approvals for this branch.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900">{order.orderNumber}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <span>{order.customer}</span>
                          {order.customerLocation && (
                            <button
                              onClick={() => openGoogleMaps(order.customerLocation, order.customer)}
                              className="text-blue-600 hover:text-blue-700"
                              title="View on Google Maps"
                            >
                              <MapPin className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{order.agent}</div>
                      </td>
                      <td className="px-4 py-4">{order.branch}</td>
                      <td className="px-4 py-4 text-gray-600">{order.productsSummary}</td>
                      <td className="px-4 py-4 font-medium">₱{order.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <span className={order.requestedDiscount > 10 ? 'text-red-600 font-medium' : ''}>
                          {order.requestedDiscount}%
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={order.marginImpact === 'Green' ? 'success' : order.marginImpact === 'Yellow' ? 'warning' : 'danger'}>
                          {order.marginImpact}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <span className={new Date(order.requestedDeliveryDate) <= new Date('2026-02-26') ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {order.requestedDeliveryDate}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEdit(order)}
                            title="Edit order"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleReject(order)} 
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Reject order"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={() => handleApprove(order)}
                            title="Approve order"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Approve Confirmation Modal */}
      {approvingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Approve Order</h3>
                  <p className="text-sm text-gray-500">{approvingOrder.orderNumber}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{approvingOrder.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">₱{approvingOrder.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">{approvingOrder.requestedDiscount}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Date:</span>
                  <span className="font-medium">{approvingOrder.requestedDeliveryDate}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setApprovingOrder(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={confirmApprove}
                >
                  Confirm Approval
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal with Reason */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Reject Order</h3>
                  <p className="text-sm text-gray-500">{rejectingOrder.orderNumber}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a detailed reason..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-24"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setRejectingOrder(null);
                    setRejectReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={confirmReject}
                  disabled={!rejectReason.trim()}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Edit Order</h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                  <input 
                    type="text" 
                    value={editingOrder.orderNumber} 
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                  <input 
                    type="date" 
                    defaultValue={editingOrder.requestedDeliveryDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                  <input 
                    type="number" 
                    defaultValue={editingOrder.requestedDiscount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes for Agent</label>
                  <textarea
                    placeholder="Add notes or instructions for the agent..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 min-h-20"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setEditingOrder(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1"
                  onClick={() => {
                    addAuditLog('Edited Order', 'Order', `Modified ${editingOrder.orderNumber} schedule and terms`);
                    alert('✏️ Order updated successfully! Agent will be notified.');
                    setEditingOrder(null);
                  }}
                >
                  Save Changes & Notify Agent
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
