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
  Truck,
  ArrowRightLeft,
  ShoppingCart,
  Users,
} from 'lucide-react';
import {
  getAllRawMaterials,
  getLowStockMaterials,
  getTotalInventoryValue,
  getMaterialsRequiringReorder,
} from '@/src/mock/rawMaterials';
import type { MaterialCategory, MaterialStatus } from '@/src/types/materials';
import { ReceiveMaterialModal } from '@/src/components/materials/ReceiveMaterialModal';
import { StockTransferModal } from '@/src/components/materials/StockTransferModal';

export function RawMaterialsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const { role } = useAppContext();
  
  // Modal states
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

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
          <p className="text-sm text-gray-500 mt-1">Browse materials by category</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => {/* TODO: Export materials data */}}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button variant="outline" onClick={() => setShowReceiveModal(true)}>
            <Truck className="w-4 h-4 mr-2" />
            Receive
          </Button>

          <Button variant="outline" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transfer
          </Button>

          <Button variant="outline" onClick={() => navigate('/purchase-orders')}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Purchase Orders
          </Button>

          <Button variant="outline" onClick={() => navigate('/suppliers')}>
            <Users className="w-4 h-4 mr-2" />
            Suppliers
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

          {/* Stock Alerts */}
          {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
            <Card className="border-l-4 border-l-orange-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Stock Alerts
                  <Badge variant="danger" className="ml-2">
                    {criticalAlerts.length + warningAlerts.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Critical Alerts Column */}
                  {criticalAlerts.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        <h4 className="text-sm font-semibold text-red-700 uppercase tracking-wide">
                          Critical ({criticalAlerts.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {criticalAlerts.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            className="border border-red-200 rounded-lg p-3 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {m.name}
                                </p>
                                <p className="text-xs text-red-600 font-medium mt-1">
                                  ⚠ {m.daysOfCover.toFixed(1)} days remaining
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/materials/category/${m.category.toLowerCase().replace(/\s+/g, '-')}`)}
                                className="flex-shrink-0 text-xs"
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warning Alerts Column */}
                  {warningAlerts.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                        <h4 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide">
                          Warning ({warningAlerts.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {warningAlerts.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            className="border border-yellow-200 rounded-lg p-3 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {m.name}
                                </p>
                                <p className="text-xs text-yellow-600 font-medium mt-1">
                                  {m.daysOfCover.toFixed(1)} days remaining
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/materials/category/${m.category.toLowerCase().replace(/\s+/g, '-')}`)}
                                className="flex-shrink-0 text-xs"
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

      {/* Categories Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Browse by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.filter(cat => cat !== 'All').map((category) => {
              const categoryMaterials = allMaterials.filter(m => m.category === category);
              const categoryCount = categoryMaterials.length;
              const lowStockCount = categoryMaterials.filter(m => m.status === 'Low Stock' || m.status === 'Out of Stock').length;
              
              return (
                <button
                  key={category}
                  onClick={() => navigate(`/materials/category/${category.toLowerCase().replace(/\s+/g, '-')}`)}
                  className="group relative p-6 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:shadow-lg transition-all duration-200 text-left"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-4 bg-gray-100 rounded-full group-hover:bg-red-50 transition-colors">
                      <Package className="w-8 h-8 text-gray-600 group-hover:text-red-600 transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                        {category}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {categoryCount} {categoryCount === 1 ? 'item' : 'items'}
                      </p>
                      {lowStockCount > 0 && (
                        <Badge variant="warning" size="sm" className="mt-2">
                          {lowStockCount} low stock
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Modals */}
      {showReceiveModal && (
        <ReceiveMaterialModal
          onClose={() => setShowReceiveModal(false)}
          onSuccess={() => {
            setShowReceiveModal(false);
            // Refresh data in real implementation
          }}
        />
      )}

      {showTransferModal && (
        <StockTransferModal
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            // Refresh data in real implementation
          }}
        />
      )}
    </div>
  );
}
