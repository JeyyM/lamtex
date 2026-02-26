import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { useAppContext } from '@/src/store/AppContext';
import {
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Plus,
  Download,
} from 'lucide-react';

// Enums for proper type safety
export enum PurchaseRequestStatus {
  PENDING_APPROVAL = 'Pending approval',
  APPROVED = 'Approved',
  ORDERED = 'Ordered',
  REJECTED = 'Rejected',
  RECEIVED = 'Received',
}

export enum PurchaseRequestReason {
  LOW_STOCK = 'Low stock',
  FORECAST = 'Forecast',
  SPECIAL_ORDER = 'Special order',
}

interface PurchaseRequest {
  id: string;
  branch: string;
  material: string;
  quantity: number;
  reason: PurchaseRequestReason;
  requestedBy: string;
  status: PurchaseRequestStatus;
  expectedArrival: string;
}

// Helper function to check if request is delayed
const isDelayed = (request: PurchaseRequest): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expectedDate = new Date(request.expectedArrival);
  expectedDate.setHours(0, 0, 0, 0);
  
  return (
    expectedDate < today &&
    request.status !== PurchaseRequestStatus.RECEIVED
  );
};

export function PurchaseRequestsPage() {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const { role } = useAppContext();
  const isCreateMode = Boolean(materialId);
  const isBoss = role === 'Executive';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');

  const [formData, setFormData] = useState({
    requestNumber: `PR-${Date.now().toString().slice(-6)}`, // Auto-generated
    branch: 'A',
    materialId: materialId || '',
    quantity: 1,
    reason: PurchaseRequestReason.LOW_STOCK,
    expectedArrival: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<{
    quantity?: string;
    material?: string;
    expectedArrival?: string;
  }>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Handle number inputs
    if (name === 'quantity') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    // Clear validation error for this field
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const errors: typeof formErrors = {};
    
    if (formData.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
    
    if (!formData.materialId) {
      errors.material = 'Material is required';
    }
    
    if (!formData.expectedArrival) {
      errors.expectedArrival = 'Expected arrival date is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Submit logic (in real app, this would call an API)
    console.log('Form submitted:', formData);
    navigate('/purchase-requests');
  };

  const initialRequests: PurchaseRequest[] = [
    {
      id: 'PR-001',
      branch: 'A',
      material: 'PVC Resin Grade S-65',
      quantity: 100,
      reason: PurchaseRequestReason.LOW_STOCK,
      requestedBy: 'John Doe',
      status: PurchaseRequestStatus.PENDING_APPROVAL,
      expectedArrival: '2026-02-25',
    },
    {
      id: 'PR-002',
      branch: 'B',
      material: 'HDPE Resin HD-5502',
      quantity: 200,
      reason: PurchaseRequestReason.FORECAST,
      requestedBy: 'Jane Smith',
      status: PurchaseRequestStatus.APPROVED,
      expectedArrival: '2026-03-01',
    },
    {
      id: 'PR-003',
      branch: 'C',
      material: 'Colorant Blue K-40',
      quantity: 50,
      reason: PurchaseRequestReason.SPECIAL_ORDER,
      requestedBy: 'Alice Brown',
      status: PurchaseRequestStatus.ORDERED,
      expectedArrival: '2026-03-05',
    },
    {
      id: 'PR-004',
      branch: 'A',
      material: 'Stabilizer ST-100',
      quantity: 75,
      reason: PurchaseRequestReason.LOW_STOCK,
      requestedBy: 'Bob White',
      status: PurchaseRequestStatus.RECEIVED,
      expectedArrival: '2026-02-20',
    },
    {
      id: 'PR-005',
      branch: 'B',
      material: 'Additive XL-250',
      quantity: 30,
      reason: PurchaseRequestReason.LOW_STOCK,
      requestedBy: 'Chris Green',
      status: PurchaseRequestStatus.REJECTED,
      expectedArrival: '2026-02-22',
    },
    {
      id: 'PR-006',
      branch: 'A',
      material: 'PVC Stabilizer Lead-Free',
      quantity: 120,
      reason: PurchaseRequestReason.LOW_STOCK,
      requestedBy: 'Emily Davis',
      status: PurchaseRequestStatus.PENDING_APPROVAL,
      expectedArrival: '2026-02-20', // Delayed
    },
    {
      id: 'PR-007',
      branch: 'C',
      material: 'Plasticizer DOP',
      quantity: 300,
      reason: PurchaseRequestReason.FORECAST,
      requestedBy: 'Michael Lee',
      status: PurchaseRequestStatus.ORDERED,
      expectedArrival: '2026-02-23', // Delayed
    },
  ];

  const [requests, setRequests] = useState<PurchaseRequest[]>(initialRequests);

  // Apply filters
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.material.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestedBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' || request.status === statusFilter;

    const matchesBranch =
      branchFilter === 'All' || request.branch === branchFilter;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  // Calculate KPIs
  const totalRequests = requests.length;
  const pendingApproval = requests.filter(
    (r) => r.status === PurchaseRequestStatus.PENDING_APPROVAL
  ).length;
  const delayedRequests = requests.filter(isDelayed).length;
  const receivedThisMonth = requests.filter(
    (r) => r.status === PurchaseRequestStatus.RECEIVED
  ).length;

  // CENTRALIZED STATUS COLOR MAPPING
  // Returns both badge variant and optional custom className for precise color control
  const getStatusBadgeConfig = (
    status: PurchaseRequestStatus
  ): { variant: 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'; className?: string } => {
    switch (status) {
      case PurchaseRequestStatus.PENDING_APPROVAL:
        return { variant: 'warning' }; // Yellow/Amber
      case PurchaseRequestStatus.APPROVED:
        return { variant: 'info' }; // Blue
      case PurchaseRequestStatus.ORDERED:
        return { variant: 'neutral', className: 'bg-purple-100 text-purple-800' }; // Purple (in-progress)
      case PurchaseRequestStatus.RECEIVED:
        return { variant: 'success' }; // Green
      case PurchaseRequestStatus.REJECTED:
        return { variant: 'danger' }; // Red
      default:
        return { variant: 'neutral' };
    }
  };

  // Get reason badge variant
  const getReasonBadgeVariant = (
    reason: PurchaseRequestReason
  ): 'default' | 'warning' | 'danger' => {
    switch (reason) {
      case PurchaseRequestReason.LOW_STOCK:
        return 'danger';
      case PurchaseRequestReason.FORECAST:
        return 'default';
      case PurchaseRequestReason.SPECIAL_ORDER:
        return 'warning';
      default:
        return 'default';
    }
  };

  // Action handlers
  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: PurchaseRequestStatus.APPROVED } : r
      )
    );
  };

  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: PurchaseRequestStatus.REJECTED } : r
      )
    );
  };

  const handleUndoReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id && r.status === PurchaseRequestStatus.REJECTED
          ? { ...r, status: PurchaseRequestStatus.PENDING_APPROVAL }
          : r
      )
    );
  };

  const handleConvertToPO = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: PurchaseRequestStatus.ORDERED } : r
      )
    );
  };

  const handleFollowUp = (id: string) => {
    console.log('Follow-up Supplier for request:', id);
    // In a real app, this would open a modal or navigate to supplier contact page
  };

  // Create mode - Complete form implementation
  if (isCreateMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Purchase Request</h1>
            <p className="text-sm text-gray-500 mt-1">
              Submit a new material procurement request
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Request Number
                  </label>
                  <input
                    type="text"
                    name="requestNumber"
                    value={formData.requestNumber}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-generated</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="A">Branch A</option>
                    <option value="B">Branch B</option>
                    <option value="C">Branch C</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Material Information */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Material Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="materialId"
                      value={formData.materialId}
                      onChange={handleInputChange}
                      placeholder="Enter material name or ID"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                        formErrors.material ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.material && (
                      <p className="text-xs text-red-600 mt-1">{formErrors.material}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      min="1"
                      step="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                        formErrors.quantity ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.quantity && (
                      <p className="text-xs text-red-600 mt-1">{formErrors.quantity}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value={PurchaseRequestReason.LOW_STOCK}>Low stock</option>
                      <option value={PurchaseRequestReason.FORECAST}>Forecast</option>
                      <option value={PurchaseRequestReason.SPECIAL_ORDER}>Special order</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Delivery & Notes */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Delivery & Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Arrival Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="expectedArrival"
                      value={formData.expectedArrival}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                        formErrors.expectedArrival ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.expectedArrival && (
                      <p className="text-xs text-red-600 mt-1">{formErrors.expectedArrival}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Additional information or special instructions..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(materialId ? `/materials/${materialId}` : '/materials')}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage material procurement requests across branches
          </p>
        </div>
        {isBoss && (
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="primary" onClick={() => navigate('/materials')}>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{pendingApproval}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Delayed</p>
                <p className="text-2xl font-bold text-gray-900">{delayedRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Received This Month</p>
                <p className="text-2xl font-bold text-gray-900">{receivedThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by ID, material, or requester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none bg-white"
              >
                <option value="All">All Statuses</option>
                <option value={PurchaseRequestStatus.PENDING_APPROVAL}>
                  Pending Approval
                </option>
                <option value={PurchaseRequestStatus.APPROVED}>Approved</option>
                <option value={PurchaseRequestStatus.ORDERED}>Ordered</option>
                <option value={PurchaseRequestStatus.RECEIVED}>Received</option>
                <option value={PurchaseRequestStatus.REJECTED}>Rejected</option>
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none bg-white"
              >
                <option value="All">All Branches</option>
                <option value="A">Branch A</option>
                <option value="B">Branch B</option>
                <option value="C">Branch C</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Request #</th>
                    <th className="px-6 py-3 text-left font-medium">Branch</th>
                    <th className="px-6 py-3 text-left font-medium">Material</th>
                    <th className="px-6 py-3 text-left font-medium">Qty</th>
                    <th className="px-6 py-3 text-left font-medium">Reason</th>
                    <th className="px-6 py-3 text-left font-medium">Requested By</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Expected Arrival</th>
                    {isBoss && (
                      <th className="px-6 py-3 text-left font-medium">Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => {
                    const delayed = isDelayed(request);
                    
                    return (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-blue-600">
                            {request.id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline">Branch {request.branch}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {request.material}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 font-medium">
                            {request.quantity.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getReasonBadgeVariant(request.reason)}>
                            {request.reason}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{request.requestedBy}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={getStatusBadgeConfig(request.status).variant}
                              className={getStatusBadgeConfig(request.status).className}
                            >
                              {request.status}
                            </Badge>
                            {delayed && (
                              <Badge variant="danger" className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Delayed
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {new Date(request.expectedArrival).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </td>
                        {isBoss && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {request.status === PurchaseRequestStatus.PENDING_APPROVAL && (
                                <>
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleApprove(request.id)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleReject(request.id)}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}

                              {request.status === PurchaseRequestStatus.APPROVED && (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleConvertToPO(request.id)}
                                  >
                                    Convert to PO
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleReject(request.id)}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}

                              {request.status === PurchaseRequestStatus.ORDERED && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleFollowUp(request.id)}
                                >
                                  Follow-Up Supplier
                                </Button>
                              )}

                              {request.status === PurchaseRequestStatus.REJECTED && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUndoReject(request.id)}
                                >
                                  Undo Reject
                                </Button>
                              )}

                              {request.status === PurchaseRequestStatus.RECEIVED && (
                                <span className="text-gray-400 text-xs">No actions</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-sm">No purchase requests found</p>
              <p className="text-gray-400 text-xs mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}