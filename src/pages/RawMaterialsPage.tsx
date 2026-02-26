import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  Search,
  Filter,
  Plus,
  DollarSign,
  AlertTriangle,
  TrendingDown,
  FileText,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  getAllRawMaterials,
  getLowStockMaterials,
  getTotalInventoryValue,
  getMaterialsRequiringReorder,
} from '@/src/mock/rawMaterials';
import type { MaterialCategory, MaterialStatus } from '@/src/types/materials';

export function RawMaterialsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const { role } = useAppContext();

  const allMaterials = getAllRawMaterials();
  const lowStockMaterials = getLowStockMaterials();
  const totalValue = getTotalInventoryValue();
  const materialsRequiringReorder = getMaterialsRequiringReorder();

  // Apply filters
  const filteredMaterials = allMaterials.filter(material => {
    const matchesSearch = 
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' || material.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || material.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: MaterialStatus): 'success' | 'warning' | 'danger' | 'default' => {
    if (status === 'Active') return 'success';
    if (status === 'Low Stock') return 'warning';
    if (status === 'Out of Stock' || status === 'Discontinued' || status === 'Expired') return 'danger';
    return 'default';
  };

  const categories: (MaterialCategory | 'All')[] = [
    'All',
    'PVC Resin',
    'HDPE Resin',
    'PPR Resin',
    'Stabilizers',
    'Plasticizers',
    'Lubricants',
    'Colorants',
    'Additives',
    'Packaging Materials',
    'Other',
  ];

  const statuses: (MaterialStatus | 'All')[] = ['All', 'Active', 'Discontinued', 'Low Stock', 'Out of Stock', 'Expired'];

  // Derived calculations for enhanced materials
  const enhancedMaterials = filteredMaterials.map((material) => {
    // ⚠ DEMO MODE: Simulating high consumption to trigger alert
    // Force the first material into high consumption for demo purposes
    const isDemoMaterial = material.id === filteredMaterials[0]?.id;

    const adjustedMonthlyConsumption = isDemoMaterial
      ? (material.monthlyConsumption || 0) * 8
      : material.monthlyConsumption || 0;

    const adjustedStockBranchA = isDemoMaterial
      ? 20
      : material.stockBranchA || 0;

    const totalStock =
      adjustedStockBranchA +
      (material.stockBranchB || 0) +
      (material.stockBranchC || 0);

    const monthlyConsumption = adjustedMonthlyConsumption;

    const avgDailyUsage =
      monthlyConsumption > 0 ? monthlyConsumption / 30 : 0;

    const daysOfCover =
      avgDailyUsage > 0 ? totalStock / avgDailyUsage : Infinity;

    let stockRisk: 'OK' | 'Low' | 'Critical' = 'OK';

    if (daysOfCover < 15) stockRisk = 'Critical';
    else if (daysOfCover < 30) stockRisk = 'Low';

    const projectedStockOutDate =
      avgDailyUsage > 0
        ? new Date(Date.now() + daysOfCover * 24 * 60 * 60 * 1000)
        : null;

    return {
      ...material,
      totalStock,
      avgDailyUsage,
      daysOfCover,
      stockRisk,
      projectedStockOutDate,
    };
  });

  // KPI: Estimated Stock-Out Count
  const estimatedStockOutCount = enhancedMaterials.filter(
    (m) => m.daysOfCover < 15
  ).length;

  // Derive Alerts
  const criticalAlerts = enhancedMaterials
    .filter((m) => m.daysOfCover < 15)
    .sort((a, b) => a.daysOfCover - b.daysOfCover);

  const warningAlerts = enhancedMaterials
    .filter((m) => m.daysOfCover >= 15 && m.daysOfCover < 30)
    .sort((a, b) => a.daysOfCover - b.daysOfCover);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raw Materials</h1>
          <p className="text-sm text-gray-500 mt-1">Inventory management for production materials</p>
        </div>
        <div className="flex gap-2">
          {role && role.toString().toLowerCase() === 'executive' && (
            <Button
              variant="outline"
              onClick={() => navigate('/purchase-requests')}
            >
              Purchase Requests
            </Button>
          )}

          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </Button>

          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button variant="primary" onClick={() => navigate('/materials/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full overflow-hidden">

        {/* LEFT SIDE */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Materials</p>
                    <p className="text-2xl font-bold text-gray-900">{allMaterials.length}</p>
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
                    <p className="text-sm text-gray-500">Total Inventory Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₱{(totalValue / 1000000).toFixed(2)}M
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Low Stock Items</p>
                    <p className="text-2xl font-bold text-gray-900">{lowStockMaterials.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reorder Required</p>
                    <p className="text-2xl font-bold text-gray-900">{materialsRequiringReorder.length}</p>
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
                    placeholder="Search materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
                  >
                    {statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Materials Inventory</span>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredMaterials.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium">Material</th>
                        <th className="px-6 py-3 text-left font-medium">SKU</th>
                        <th className="px-6 py-3 text-left font-medium">Category</th>
                        <th className="px-6 py-3 text-left font-medium">Stock (Branch A/B/C)</th>
                        <th className="px-6 py-3 text-left font-medium">Total Stock</th>
                        <th className="px-6 py-3 text-left font-medium">UOM</th>
                        <th className="px-6 py-3 text-left font-medium">Cost/Unit</th>
                        <th className="px-6 py-3 text-left font-medium">Total Value</th>
                        <th className="px-6 py-3 text-left font-medium">Monthly Usage</th>
                        <th className="px-6 py-3 text-left font-medium">Avg Daily Usage</th>
                        <th className="px-6 py-3 text-left font-medium">Days of Cover</th>
                        <th className="px-6 py-3 text-left font-medium">Stock-Out Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {enhancedMaterials.map((material) => (
                        <tr key={material.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 rounded">
                                <Package className="w-4 h-4 text-gray-600" />
                              </div>
                              <div>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => navigate(`/materials/${material.id}`)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      navigate(`/materials/${material.id}`);
                                    }
                                  }}
                                  className="font-medium text-blue-600 hover:underline cursor-pointer"
                                >
                                  {material.name}
                                </div>
                                <div className="text-xs text-gray-500">{material.description.substring(0, 40)}...</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-gray-600">{material.sku}</td>
                          <td className="px-6 py-4">
                            <Badge variant="outline">{material.category}</Badge>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            <div className="text-xs space-y-1">
                              <div>A: {material.stockBranchA.toLocaleString()}</div>
                              <div>B: {material.stockBranchB.toLocaleString()}</div>
                              <div>C: {material.stockBranchC.toLocaleString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${material.totalStock <= material.reorderPoint ? 'text-orange-600' : 'text-gray-900'}`}>
                                {material.totalStock.toLocaleString()}
                              </span>
                              {material.totalStock <= material.reorderPoint && (
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 uppercase">{material.unitOfMeasure}</td>
                          <td className="px-6 py-4 text-gray-900">₱{material.costPerUnit.toLocaleString()}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            ₱{(material.totalValue / 1000).toFixed(0)}K
                          </td>
                          <td className="px-6 py-4 text-gray-600">{material.monthlyConsumption.toLocaleString()}</td>
                          <td className="px-6 py-4 text-gray-600">{material.avgDailyUsage.toFixed(2)}</td>
                          <td className="px-6 py-4 text-gray-600">
                            {material.daysOfCover === Infinity ? 'No usage' : material.daysOfCover.toFixed(1)}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                material.stockRisk === 'Critical'
                                  ? 'danger'
                                  : material.stockRisk === 'Low'
                                  ? 'warning'
                                  : 'success'
                              }
                            >
                              {material.stockRisk}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-sm">No materials found matching your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE: Alerts Panel */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {criticalAlerts.length === 0 && warningAlerts.length === 0 && (
                <p className="text-sm text-gray-500">
                  No immediate stock risks detected.
                </p>
              )}

              {criticalAlerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-600 mb-2">
                    Critical ({criticalAlerts.length})
                  </h4>
                  <div className="space-y-3">
                    {criticalAlerts.map((m) => (
                      <div
                        key={m.id}
                        className="border rounded-md p-3 bg-red-50"
                      >
                        <p className="text-sm font-medium">
                          {m.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {m.daysOfCover.toFixed(1)} days remaining
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/materials/${m.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {warningAlerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-yellow-600 mb-2">
                    Warning ({warningAlerts.length})
                  </h4>
                  <div className="space-y-3">
                    {warningAlerts.map((m) => (
                      <div
                        key={m.id}
                        className="border rounded-md p-3 bg-yellow-50"
                      >
                        <p className="text-sm font-medium">
                          {m.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {m.daysOfCover.toFixed(1)} days remaining
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/materials/${m.id}`)}
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
