import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { useAppContext } from '@/src/store/AppContext';
import {
  Package,
  ArrowLeft,
  Edit,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Box,
  AlertTriangle,
  BarChart3,
  Activity,
  FileText,
  Truck,
  ClipboardList,
  Calendar,
  Tag,
  Layers,
  Factory,
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
} from '@/src/mock/rawMaterials';
import type { MaterialStatus } from '@/src/types/materials';

export function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBranch } = useAppContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'analytics'>('overview');

  const material = getRawMaterialById(id || '');
  const batches = getBatchesByMaterialId(id || '');

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

  // Get stock for selected branch
  const getStockForBranch = () => {
    if (selectedBranch === 'A') return material.stockBranchA;
    if (selectedBranch === 'B') return material.stockBranchB;
    if (selectedBranch === 'C') return material.stockBranchC;
    return material.totalStock;
  };

  const currentStock = getStockForBranch();
  const avgDailyUsage = material.monthlyConsumption / 30;
  const daysOfCover = avgDailyUsage > 0 ? currentStock / avgDailyUsage : Infinity;

  // Prepare chart data
  const stockByBranchData = [
    { branch: 'Branch A', stock: material.stockBranchA },
    { branch: 'Branch B', stock: material.stockBranchB },
    { branch: 'Branch C', stock: material.stockBranchC },
  ];

  // Usage and Forecast data (6 months historical + 3 months forecast)
  const today = new Date();
  const forecastData = [
    { 
      month: 'Jan', 
      actual: material.monthlyConsumption * 0.75,
      forecast: null,
      date: new Date(today.getFullYear(), today.getMonth() - 5, 1)
    },
    { 
      month: 'Feb', 
      actual: material.monthlyConsumption * 0.82,
      forecast: null,
      date: new Date(today.getFullYear(), today.getMonth() - 4, 1)
    },
    { 
      month: 'Mar', 
      actual: material.monthlyConsumption * 0.95,
      forecast: null,
      date: new Date(today.getFullYear(), today.getMonth() - 3, 1)
    },
    { 
      month: 'Apr', 
      actual: material.monthlyConsumption * 0.88,
      forecast: null,
      date: new Date(today.getFullYear(), today.getMonth() - 2, 1)
    },
    { 
      month: 'May', 
      actual: material.monthlyConsumption * 1.05,
      forecast: null,
      date: new Date(today.getFullYear(), today.getMonth() - 1, 1)
    },
    { 
      month: 'Jun', 
      actual: material.monthlyConsumption,
      forecast: material.monthlyConsumption,
      date: new Date(today.getFullYear(), today.getMonth(), 1)
    },
    { 
      month: 'Jul', 
      actual: null,
      forecast: material.monthlyConsumption * 1.08,
      date: new Date(today.getFullYear(), today.getMonth() + 1, 1)
    },
    { 
      month: 'Aug', 
      actual: null,
      forecast: material.monthlyConsumption * 1.12,
      date: new Date(today.getFullYear(), today.getMonth() + 2, 1)
    },
    { 
      month: 'Sep', 
      actual: null,
      forecast: material.monthlyConsumption * 1.15,
      date: new Date(today.getFullYear(), today.getMonth() + 3, 1)
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/materials')} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{material.name}</h1>
            <p className="text-sm text-gray-500 mt-1 truncate">{material.category} • {material.sku}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate(`/purchase-requests/new/${material.id}`)} className="flex-1 sm:flex-none">
            <FileText className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create PR</span>
            <span className="sm:hidden">PR</span>
          </Button>
          <Button variant="outline" onClick={() => navigate(`/materials/${id}/edit`)} className="flex-1 sm:flex-none">
            <Edit className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Edit Material</span>
            <span className="sm:hidden">Edit</span>
          </Button>
        </div>
      </div>

      {/* Material Image, Summary Cards & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Material Image - Spans full height */}
        <div className="lg:row-span-2">
          <Card className="h-full">
            <CardContent className="p-4 h-full flex flex-col">
              {material.imageUrl ? (
                <div className="flex-1 rounded-lg overflow-hidden">
                  <img
                    src={material.imageUrl}
                    alt={material.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex-1 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Material Image</h3>
                <p className="text-xs text-gray-400">SKU: {material.sku}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards - Right side, 2 rows of 2 cards */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Material Info & Status - Right side, below KPI cards */}
        <Card className="lg:col-span-3">
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
      </div>

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
        <div className="space-y-6">
          {/* Current Batches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Current Batches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {batches.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
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

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {batches.map((batch) => (
                      <div key={batch.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm font-medium text-gray-900 break-all">{batch.batchNumber}</p>
                            <p className="font-mono text-xs text-gray-600 mt-1 break-all">Lot: {batch.lotNumber}</p>
                          </div>
                          <Badge variant={getQualityStatusColor(batch.qualityStatus)}>
                            {batch.qualityStatus}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Received</p>
                            <p className="font-medium text-gray-900">{batch.quantityReceived.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Available</p>
                            <p className="font-medium text-gray-900">{batch.quantityAvailable.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Issued</p>
                            <p className="text-gray-600">{batch.quantityIssued.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Branch</p>
                            <Badge variant="outline" size="sm">Branch {batch.branch}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                          <span>Received: {batch.receivedDate}</span>
                          <span>Expiry: {batch.expiryDate || '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-sm">No batches recorded for this material</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduled Batches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Scheduled Incoming Batches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">PO Number</th>
                      <th className="px-6 py-3 text-left font-medium">Supplier</th>
                      <th className="px-6 py-3 text-left font-medium">Expected Quantity</th>
                      <th className="px-6 py-3 text-left font-medium">Expected Delivery</th>
                      <th className="px-6 py-3 text-left font-medium">Destination Branch</th>
                      <th className="px-6 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs text-blue-600 font-medium">PO-2024-0847</td>
                      <td className="px-6 py-4 text-gray-900">ChemCorp Philippines</td>
                      <td className="px-6 py-4 font-medium text-gray-900">5,000 kg</td>
                      <td className="px-6 py-4 text-gray-600">March 15, 2026</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">Branch A</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="default">In Transit</Badge>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs text-blue-600 font-medium">PO-2024-0892</td>
                      <td className="px-6 py-4 text-gray-900">Global Materials Inc.</td>
                      <td className="px-6 py-4 font-medium text-gray-900">3,500 kg</td>
                      <td className="px-6 py-4 text-gray-600">March 22, 2026</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">Branch B</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="warning">Pending Shipment</Badge>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs text-blue-600 font-medium">PO-2024-0915</td>
                      <td className="px-6 py-4 text-gray-900">ChemCorp Philippines</td>
                      <td className="px-6 py-4 font-medium text-gray-900">4,000 kg</td>
                      <td className="px-6 py-4 text-gray-600">April 5, 2026</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">Branch A</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="default">Confirmed</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-blue-600 font-medium break-all">PO-2024-0847</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">ChemCorp Philippines</p>
                    </div>
                    <Badge variant="default">In Transit</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Expected Quantity</p>
                      <p className="font-medium text-gray-900">5,000 kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Destination</p>
                      <Badge variant="outline" size="sm">Branch A</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Expected Delivery: March 15, 2026
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-blue-600 font-medium break-all">PO-2024-0892</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">Global Materials Inc.</p>
                    </div>
                    <Badge variant="warning">Pending Shipment</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Expected Quantity</p>
                      <p className="font-medium text-gray-900">3,500 kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Destination</p>
                      <Badge variant="outline" size="sm">Branch B</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Expected Delivery: March 22, 2026
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-blue-600 font-medium break-all">PO-2024-0915</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">ChemCorp Philippines</p>
                    </div>
                    <Badge variant="default">Confirmed</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Expected Quantity</p>
                      <p className="font-medium text-gray-900">4,000 kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Destination</p>
                      <Badge variant="outline" size="sm">Branch A</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Expected Delivery: April 5, 2026
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content - Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Usage & Forecast Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Usage History & Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [
                      `${value.toLocaleString()} ${material.unitOfMeasure}`,
                      ''
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name="Actual Usage"
                    dot={{ fill: '#EF4444', r: 4 }}
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forecast" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Forecasted Usage"
                    dot={{ fill: '#F59E0B', r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-red-500"></div>
                  <span>Historical Usage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-orange-500 border-dashed"></div>
                  <span>ML Forecast (Next 3 Months)</span>
                </div>
              </div>
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
