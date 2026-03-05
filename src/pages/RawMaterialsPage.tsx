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
  Edit,
} from 'lucide-react';
import {
  getAllRawMaterials,
  getLowStockMaterials,
  getTotalInventoryValue,
  getMaterialsRequiringReorder,
} from '@/src/mock/rawMaterials';
import type { MaterialCategory, MaterialStatus, StockOutRisk } from '@/src/types/materials';
import { ReceiveMaterialModal } from '@/src/components/materials/ReceiveMaterialModal';
import { StockTransferModal } from '@/src/components/materials/StockTransferModal';
import AddMaterialCategoryModal, { MaterialCategoryFormData } from '@/src/components/materials/AddMaterialCategoryModal';

// Import raw material images
import whitePelletsImg from '@/src/assets/raw-materials/White Pellets.webp';
import resinPowderImg from '@/src/assets/raw-materials/Resin Powder.avif';
import pvcImg from '@/src/assets/raw-materials/Polyvinyl-Chloride.avif';
import polypropyleneImg from '@/src/assets/raw-materials/Polypropylene.jpg';
import petImg from '@/src/assets/raw-materials/Polyethylene Terephthalate.jpg';
import ldpeImg from '@/src/assets/raw-materials/Low Density Polyethylene.jpg';
import j70Img from '@/src/assets/raw-materials/J-70.jfif';

export function RawMaterialsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const { role } = useAppContext();
  
  // Modal states
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MaterialCategoryFormData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const allMaterials = getAllRawMaterials();
  const lowStockMaterials = getLowStockMaterials();
  const totalValue = getTotalInventoryValue();
  const materialsRequiringReorder = getMaterialsRequiringReorder();

  // Apply search and category filters first
  const filteredBySearchAndCategory = allMaterials.filter(material => {
    const matchesSearch = 
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' || material.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
    if (status === 'Active') return 'success';
    if (status === 'Low Stock') return 'warning';
    if (status === 'Out of Stock' || status === 'Discontinued' || status === 'Expired') return 'danger';
    return 'default';
  };

  const getRiskBadgeVariant = (risk: StockOutRisk): 'success' | 'warning' | 'danger' => {
    if (risk === 'Critical') return 'danger';
    if (risk === 'Risky') return 'warning';
    return 'success';
  };

  const categories = [
    { name: 'PVC Resin', image: pvcImg, icon: 'science', description: 'Polyvinyl chloride resin for pipe manufacturing' },
    { name: 'HDPE Resin', image: ldpeImg, icon: 'inventory_2', description: 'High-density polyethylene for durable products' },
    { name: 'PPR Resin', image: polypropyleneImg, icon: 'layers', description: 'Polypropylene random copolymer resin' },
    { name: 'Stabilizers', image: whitePelletsImg, icon: 'shield', description: 'Heat and UV stabilizers for material protection' },
    { name: 'Plasticizers', image: j70Img, icon: 'water_drop', description: 'Additives for flexibility and workability' },
    { name: 'Lubricants', image: resinPowderImg, icon: 'oil_barrel', description: 'Processing aids and lubricants' },
    { name: 'Colorants', image: petImg, icon: 'palette', description: 'Pigments and color masterbatches' },
    { name: 'Additives', image: whitePelletsImg, icon: 'add_circle', description: 'Performance-enhancing additives' },
    { name: 'Packaging Materials', image: resinPowderImg, icon: 'package_2', description: 'Packaging supplies and materials' },
    { name: 'Other', image: pvcImg, icon: 'category', description: 'Miscellaneous raw materials' },
  ];

  const riskLevels: (StockOutRisk | 'All')[] = ['All', 'OK', 'Risky', 'Critical'];

  // Handler functions for category management
  const handleEditCategory = (category: { name: string; image: string; icon?: string; description?: string }) => {
    const categoryData: MaterialCategoryFormData = {
      name: category.name,
      description: category.description || '',
      imageUrl: category.image,
      icon: category.icon || 'inventory_2',
    };
    setEditingCategory(categoryData);
    setIsEditMode(true);
  };

  const handleCloseModal = () => {
    setShowAddCategoryModal(false);
    setEditingCategory(null);
    setIsEditMode(false);
  };

  const handleSaveCategory = (categoryData: MaterialCategoryFormData) => {
    console.log('Material category saved:', categoryData);
    handleCloseModal();
  };

  const handleDeleteCategory = () => {
    console.log('Material category deleted');
    handleCloseModal();
  };

  // Derived calculations for enhanced materials (immutable operations)
  const enhancedMaterials = filteredBySearchAndCategory.map((material) => {
    // ⚠ DEMO MODE: Simulating high consumption for specific material
    // Use stable material ID instead of array position to avoid mutation on filter changes
    const isDemoMaterial = material.id === 'MAT-001';

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

    // Use operationally-focused risk thresholds
    let stockRisk: StockOutRisk = 'OK';
    if (daysOfCover <= 30) stockRisk = 'Critical';
    else if (daysOfCover <= 90) stockRisk = 'Risky';

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

  // Apply risk filter (immutable operation)
  const filteredMaterials = enhancedMaterials.filter(material => {
    const matchesRisk = riskFilter === 'All' || material.stockRisk === riskFilter;
    return matchesRisk;
  });

  // KPI: Estimated Stock-Out Count (immutable filter)
  const estimatedStockOutCount = enhancedMaterials.filter(
    (m) => m.daysOfCover <= 30
  ).length;

  // Derive Alerts (immutable operations)
  const criticalAlerts = [...enhancedMaterials]
    .filter((m) => m.daysOfCover <= 30)
    .sort((a, b) => a.daysOfCover - b.daysOfCover);

  const warningAlerts = [...enhancedMaterials]
    .filter((m) => m.daysOfCover > 30 && m.daysOfCover <= 90)
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Browse by Category</CardTitle>
            <Button 
              variant="primary"
              onClick={() => {
                setEditingCategory(null);
                setIsEditMode(false);
                setShowAddCategoryModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category) => {
              const categoryMaterials = allMaterials.filter(m => m.category === category.name);
              const categoryCount = categoryMaterials.length;
              const lowStockCount = categoryMaterials.filter(m => m.status === 'Low Stock' || m.status === 'Out of Stock').length;
              
              return (
                <div
                  key={category.name}
                  className="group relative overflow-hidden border-2 border-gray-200 rounded-lg hover:border-red-500 hover:shadow-lg transition-all duration-200"
                >
                  {/* Edit Button - Top Right - Always visible, more prominent on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCategory(category);
                    }}
                    className="absolute top-2 right-2 z-10 p-2.5 bg-white hover:bg-red-600 text-gray-700 hover:text-white rounded-lg shadow-lg border border-gray-300 group-hover:border-red-600 transition-all duration-200 hover:scale-110"
                    title="Edit material category"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Category Card - Clickable Area */}
                  <button
                    onClick={() => navigate(`/materials/category/${category.name.toLowerCase().replace(/\s+/g, '-')}`)}
                    className="w-full text-left"
                  >
                    {/* Category Image */}
                    <div className="aspect-video w-full overflow-hidden bg-gray-100">
                      <img 
                        src={category.image} 
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    
                    {/* Category Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                        {category.name}
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
                  </button>
                </div>
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

      {/* Add/Edit Material Category Modal */}
      {(showAddCategoryModal || editingCategory) && (
        <AddMaterialCategoryModal
          isOpen={showAddCategoryModal || !!editingCategory}
          onClose={handleCloseModal}
          onSave={handleSaveCategory}
          onDelete={isEditMode ? handleDeleteCategory : undefined}
          initialData={editingCategory || undefined}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
}
