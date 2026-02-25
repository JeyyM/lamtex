import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  ArrowLeft,
  Edit,
  Plus,
  TrendingUp,
  DollarSign,
  Box,
  AlertTriangle,
  BarChart3,
  Activity,
  FileText,
  Truck,
  ClipboardList,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  getRawMaterialById,
  getBatchesByMaterialId,
  getStockMovementsByMaterialId,
} from '@/src/mock/rawMaterials';
import type { MaterialStatus } from '@/src/types/materials';

export function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'movements' | 'analytics'>('overview');

  const material = getRawMaterialById(id || '');
  const batches = getBatchesByMaterialId(id || '');
  const movements = getStockMovementsByMaterialId(id || '').slice(0, 10);

  if (!material) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Material not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/materials')}>
            Back to Materials
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: MaterialStatus): 'success' | 'warning' | 'danger' | 'default' => {
    if (status === 'Active') return 'success';
    if (status === 'Low Stock') return 'warning';
    if (status === 'Out of Stock' || status === 'Discontinued' || status === 'Expired') return 'danger';
    return 'default';
  };

  const getQualityStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
    if (status === 'Passed') return 'success';
    if (status === 'Conditionally Approved') return 'warning';
    if (status === 'Failed') return 'danger';
    return 'default';
  };

  // Prepare chart data
  const stockByBranchData = [
    { branch: 'Branch A', stock: material.stockBranchA },
    { branch: 'Branch B', stock: material.stockBranchB },
    { branch: 'Branch C', stock: material.stockBranchC },
  ];

  const consumptionTrendData = [
    { month: 'Jan', consumption: material.monthlyConsumption * 0.85 },
    { month: 'Feb', consumption: material.monthlyConsumption * 0.92 },
    { month: 'Mar', consumption: material.monthlyConsumption * 1.05 },
    { month: 'Apr', consumption: material.monthlyConsumption * 0.98 },
    { month: 'May', consumption: material.monthlyConsumption * 1.12 },
    { month: 'Jun', consumption: material.monthlyConsumption },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/materials')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{material.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{material.category} • {material.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Create PR
          </Button>
          <Button variant="outline" onClick={() => navigate(`/materials/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Material
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Box className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {material.totalStock.toLocaleString()} <span className="text-sm font-normal uppercase">{material.unitOfMeasure}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{(material.totalValue / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Consumption</p>
                <p className="text-2xl font-bold text-gray-900">
                  {material.monthlyConsumption.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${material.totalStock <= material.reorderPoint ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`w-6 h-6 ${material.totalStock <= material.reorderPoint ? 'text-orange-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Reorder Point</p>
                <p className="text-2xl font-bold text-gray-900">
                  {material.reorderPoint.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Material Info & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Material Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
              <p className="text-gray-900">{material.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Status & Supplier</h3>
              <div className="space-y-2">
                <div>
                  <Badge variant={getStatusColor(material.status)} className="text-sm">
                    {material.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-900">
                  <span className="text-gray-500">Supplier:</span> {material.primarySupplier}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="text-gray-500">Lead Time:</span> {material.leadTimeDays} days
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Last Activity</h3>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Last Restock: {material.lastRestockDate}</p>
                <p className="text-xs text-gray-500">Last Issued: {material.lastIssuedDate}</p>
                <p className="text-xs text-gray-500">Created: {material.createdDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'batches'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Batches ({batches.length})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'movements'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Stock Movements
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content - Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              {material.specifications && Object.keys(material.specifications).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(material.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium text-gray-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-sm text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No specifications available</p>
              )}
            </CardContent>
          </Card>

          {/* Stock by Branch */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Stock by Branch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stockByBranchData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branch" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="stock" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Branch A</p>
                  <p className="font-medium">{material.stockBranchA.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Branch B</p>
                  <p className="font-medium">{material.stockBranchB.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Branch C</p>
                  <p className="font-medium">{material.stockBranchC.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Current Cost/Unit</span>
                  <span className="text-sm font-bold text-gray-900">₱{material.costPerUnit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Last Purchase Price</span>
                  <span className="text-sm text-gray-900">₱{material.lastPurchasePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Average Cost</span>
                  <span className="text-sm text-gray-900">₱{material.averageCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-gray-500">Total Inventory Value</span>
                  <span className="text-sm font-bold text-green-600">₱{material.totalValue.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Monthly Consumption</span>
                  <span className="text-sm text-gray-900">{material.monthlyConsumption.toLocaleString()} {material.unitOfMeasure}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Yearly Consumption</span>
                  <span className="text-sm text-gray-900">{material.yearlyConsumption.toLocaleString()} {material.unitOfMeasure}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Reorder Point</span>
                  <span className="text-sm text-orange-600 font-medium">{material.reorderPoint.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-gray-500">Safety Stock</span>
                  <span className="text-sm text-gray-900">{material.safetyStock.toLocaleString()}</span>
                </div>
                {material.shelfLifeDays && (
                  <div className="flex justify-between py-2 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Shelf Life</span>
                    <span className="text-sm text-gray-900">{material.shelfLifeDays} days</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content - Batches */}
      {activeTab === 'batches' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Material Batches
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {batches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Batch Number</th>
                      <th className="px-6 py-3 text-left font-medium">Lot Number</th>
                      <th className="px-6 py-3 text-left font-medium">Received</th>
                      <th className="px-6 py-3 text-left font-medium">Available</th>
                      <th className="px-6 py-3 text-left font-medium">Issued</th>
                      <th className="px-6 py-3 text-left font-medium">Branch</th>
                      <th className="px-6 py-3 text-left font-medium">Quality Status</th>
                      <th className="px-6 py-3 text-left font-medium">Received Date</th>
                      <th className="px-6 py-3 text-left font-medium">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-xs text-gray-900">{batch.batchNumber}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">{batch.lotNumber}</td>
                        <td className="px-6 py-4 text-gray-900">{batch.quantityReceived.toLocaleString()}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{batch.quantityAvailable.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-600">{batch.quantityIssued.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline">Branch {batch.branch}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getQualityStatusColor(batch.qualityStatus)}>
                            {batch.qualityStatus}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{batch.receivedDate}</td>
                        <td className="px-6 py-4 text-gray-600">{batch.expiryDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 text-sm">No batches recorded for this material</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Content - Stock Movements */}
      {activeTab === 'movements' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Recent Stock Movements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {movements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Date</th>
                      <th className="px-6 py-3 text-left font-medium">Type</th>
                      <th className="px-6 py-3 text-left font-medium">Quantity</th>
                      <th className="px-6 py-3 text-left font-medium">From/To</th>
                      <th className="px-6 py-3 text-left font-medium">Reference</th>
                      <th className="px-6 py-3 text-left font-medium">Reason</th>
                      <th className="px-6 py-3 text-left font-medium">Processed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{movement.movementDate}</td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={
                              movement.movementType === 'Receipt' ? 'success' :
                              movement.movementType === 'Issue' ? 'warning' :
                              movement.movementType === 'Transfer' ? 'default' : 'danger'
                            }
                          >
                            {movement.movementType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {movement.quantity.toLocaleString()} {movement.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-xs">
                          {movement.fromBranch && `From: ${movement.fromBranch}`}
                          {movement.toBranch && `To: ${movement.toBranch}`}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                          {movement.referenceNumber || '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-xs">{movement.reason}</td>
                        <td className="px-6 py-4 text-gray-600">{movement.processedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Truck className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 text-sm">No stock movements recorded</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Content - Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Consumption Trend (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={consumptionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="consumption" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name={`Consumption (${material.unitOfMeasure})`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consumption Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Average Monthly</span>
                    <span className="text-lg font-bold text-gray-900">
                      {material.monthlyConsumption.toLocaleString()} {material.unitOfMeasure}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Yearly Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      {material.yearlyConsumption.toLocaleString()} {material.unitOfMeasure}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Days Until Reorder</span>
                    <span className="text-lg font-bold text-orange-600">
                      {Math.floor((material.totalStock - material.reorderPoint) / (material.monthlyConsumption / 30))} days
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Products</CardTitle>
              </CardHeader>
              <CardContent>
                {material.linkedProducts && material.linkedProducts.length > 0 ? (
                  <div className="space-y-2">
                    {material.linkedProducts.map((productId, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{productId}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No linked products</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
