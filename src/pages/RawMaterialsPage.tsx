import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raw Materials</h1>
          <p className="text-sm text-gray-500 mt-1">Inventory management for production materials</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </Button>
          <Button variant="primary" onClick={() => navigate('/materials/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
        </div>
      </div>

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
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMaterials.map((material) => (
                    <tr key={material.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded">
                            <Package className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{material.name}</div>
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
                      <td className="px-6 py-4">
                        <Badge variant={getStatusColor(material.status)}>
                          {material.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/materials/${material.id}`)}
                        >
                          View Details
                        </Button>
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
  );
}
