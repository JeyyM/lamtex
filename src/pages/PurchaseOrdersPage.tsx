import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  ShoppingCart,
  Search,
  Filter,
  Plus,
  FileText,
  Download,
  Eye,
  Send,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  supplier: string;
  status: 'Draft' | 'Sent' | 'Confirmed' | 'Partially Received' | 'Completed' | 'Cancelled';
  totalAmount: number;
  itemCount: number;
  expectedDelivery: string;
  createdBy: string;
}

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { branch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Mock data - hardcoded purchase orders
  const [purchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: 'PO-001',
      poNumber: 'PO-2026-0215',
      date: '2026-02-15',
      supplier: 'ChemCorp Philippines',
      status: 'Confirmed',
      totalAmount: 325000,
      itemCount: 2,
      expectedDelivery: '2026-03-15',
      createdBy: 'John Santos',
    },
    {
      id: 'PO-002',
      poNumber: 'PO-2026-0220',
      date: '2026-02-20',
      supplier: 'Polytech Solutions Inc.',
      status: 'Sent',
      totalAmount: 760000,
      itemCount: 1,
      expectedDelivery: '2026-04-05',
      createdBy: 'Maria Cruz',
    },
    {
      id: 'PO-003',
      poNumber: 'PO-2026-0222',
      date: '2026-02-22',
      supplier: 'Stabilizer Corp',
      status: 'Partially Received',
      totalAmount: 187500,
      itemCount: 3,
      expectedDelivery: '2026-03-08',
      createdBy: 'John Santos',
    },
    {
      id: 'PO-004',
      poNumber: 'PO-2026-0225',
      date: '2026-02-25',
      supplier: 'ColorMaster Industries',
      status: 'Draft',
      totalAmount: 95000,
      itemCount: 2,
      expectedDelivery: '2026-03-20',
      createdBy: 'Maria Cruz',
    },
    {
      id: 'PO-005',
      poNumber: 'PO-2026-0112',
      date: '2026-01-12',
      supplier: 'ChemCorp Philippines',
      status: 'Completed',
      totalAmount: 450000,
      itemCount: 3,
      expectedDelivery: '2026-02-10',
      createdBy: 'John Santos',
    },
  ]);

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch =
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: PurchaseOrder['status']): 'success' | 'warning' | 'danger' | 'default' => {
    if (status === 'Completed') return 'success';
    if (status === 'Confirmed' || status === 'Sent') return 'default';
    if (status === 'Partially Received') return 'warning';
    if (status === 'Cancelled') return 'danger';
    return 'default';
  };

  const getStatusIcon = (status: PurchaseOrder['status']) => {
    if (status === 'Completed') return <CheckCircle className="w-4 h-4" />;
    if (status === 'Sent' || status === 'Confirmed') return <Send className="w-4 h-4" />;
    if (status === 'Partially Received') return <Clock className="w-4 h-4" />;
    if (status === 'Cancelled') return <X className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const statusOptions = ['All', 'Draft', 'Sent', 'Confirmed', 'Partially Received', 'Completed', 'Cancelled'];

  // Calculate KPIs
  const totalPOs = purchaseOrders.length;
  const pendingPOs = purchaseOrders.filter(po => ['Sent', 'Confirmed', 'Partially Received'].includes(po.status)).length;
  const completedPOs = purchaseOrders.filter(po => po.status === 'Completed').length;
  const totalValue = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage purchase orders for raw materials</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="primary" onClick={() => alert('Create PO modal would open here')}>
            <Plus className="w-4 h-4 mr-2" />
            New Purchase Order
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total POs</p>
                <p className="text-2xl font-bold text-gray-900">{totalPOs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingPOs}</p>
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
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedPOs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">₱{(totalValue / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by PO number or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPOs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">PO Number</th>
                    <th className="px-6 py-3 text-left font-medium">Date</th>
                    <th className="px-6 py-3 text-left font-medium">Supplier</th>
                    <th className="px-6 py-3 text-left font-medium">Items</th>
                    <th className="px-6 py-3 text-left font-medium">Amount</th>
                    <th className="px-6 py-3 text-left font-medium">Expected Delivery</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Created By</th>
                    <th className="px-6 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-blue-600 hover:underline cursor-pointer">
                          {po.poNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(po.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{po.supplier}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {po.itemCount} {po.itemCount === 1 ? 'item' : 'items'}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        ₱{po.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(po.expectedDelivery).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getStatusColor(po.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(po.status)}
                          {po.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {po.createdBy}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => alert(`View PO ${po.poNumber}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {po.status === 'Confirmed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => alert(`Receive against ${po.poNumber}`)}
                              title="Receive Materials"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-sm">No purchase orders found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
