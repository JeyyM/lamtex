import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';

type Status =
  | 'Pending approval'
  | 'Approved'
  | 'Ordered'
  | 'Rejected'
  | 'Received';

interface PurchaseRequest {
  id: string;
  branch: string;
  material: string;
  quantity: number;
  reason: string;
  requestedBy: string;
  status: Status;
  expectedArrival: string;
}

export function PurchaseRequestsPage() {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const isCreateMode = Boolean(materialId);

  const [formData, setFormData] = useState({
    branch: 'A',
    quantity: 0,
    reason: 'Low Stock',
    expectedArrival: '',
    notes: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    navigate('/purchase-requests');
  };

  const initialRequests: PurchaseRequest[] = [
    {
      id: 'PR-001',
      branch: 'A',
      material: 'PVC Resin',
      quantity: 100,
      reason: 'Low Stock',
      requestedBy: 'John Doe',
      status: 'Pending approval',
      expectedArrival: '2026-02-25',
    },
    {
      id: 'PR-002',
      branch: 'B',
      material: 'HDPE Resin',
      quantity: 200,
      reason: 'Forecast',
      requestedBy: 'Jane Smith',
      status: 'Approved',
      expectedArrival: '2026-03-01',
    },
    {
      id: 'PR-003',
      branch: 'C',
      material: 'Colorant',
      quantity: 50,
      reason: 'Special Order',
      requestedBy: 'Alice Brown',
      status: 'Ordered',
      expectedArrival: '2026-03-05',
    },
    {
      id: 'PR-004',
      branch: 'A',
      material: 'Stabilizer',
      quantity: 75,
      reason: 'Low Stock',
      requestedBy: 'Bob White',
      status: 'Received',
      expectedArrival: '2026-02-20',
    },
    {
      id: 'PR-005',
      branch: 'B',
      material: 'Additive X',
      quantity: 30,
      reason: 'Low Stock',
      requestedBy: 'Chris Green',
      status: 'Rejected',
      expectedArrival: '2026-02-22',
    },
  ];

  const [requests, setRequests] = useState<PurchaseRequest[]>(initialRequests);

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'Pending approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-blue-100 text-blue-800';
      case 'Ordered':
        return 'bg-purple-100 text-purple-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Received':
        return 'bg-green-100 text-green-800';
      default:
        return '';
    }
  };

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Approved' } : r))
    );
  };

  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Rejected' } : r))
    );
  };

  const handleUndoReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id && r.status === 'Rejected'
          ? { ...r, status: 'Pending approval' }
          : r
      )
    );
  };

  const handleConvertToPO = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Ordered' } : r))
    );
  };

  const handleFollowUp = (id: string) => {
    console.log('Follow-up Supplier', id);
  };

  if (isCreateMode) {
    return (
      <div className="space-y-6 px-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Purchase Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Material
                </label>
                <input
                  type="text"
                  value={materialId}
                  readOnly
                  className="w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/materials/${materialId}`)}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6">
      <Card>
        <CardHeader>
          <CardTitle>Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <th className="px-6 py-3 text-left font-medium">Delay</th>
                  <th className="px-6 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3">{request.id}</td>
                    <td className="px-4 py-3">{request.branch}</td>
                    <td className="px-4 py-3">{request.material}</td>
                    <td className="px-4 py-3">{request.quantity}</td>
                    <td className="px-4 py-3">{request.reason}</td>
                    <td className="px-4 py-3">{request.requestedBy}</td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{request.expectedArrival}</td>
                    <td className="px-4 py-3">
                      {new Date(request.expectedArrival) < new Date() &&
                      request.status !== 'Received' ? (
                        <Badge className="bg-red-100 text-red-800">
                          Delayed
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {request.status === 'Pending approval' && (
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

                        {request.status === 'Approved' && (
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

                        {request.status === 'Ordered' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleFollowUp(request.id)}
                          >
                            Follow-Up Supplier
                          </Button>
                        )}

                        {request.status === 'Rejected' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUndoReject(request.id)}
                          >
                            Undo Reject
                          </Button>
                        )}

                        {request.status === 'Received' && (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
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
  );
}