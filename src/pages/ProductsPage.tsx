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
  TrendingUp,
  DollarSign,
  Box,
  AlertTriangle,
  Download,
  Truck,
  ArrowRightLeft,
  Edit,
} from 'lucide-react';
import { getAllProducts } from '@/src/mock/products';
import type { ProductCategory, ProductStatus } from '@/src/types/product';
import { ReceiveProductModal } from '@/src/components/products/ReceiveProductModal';
import { TransferProductModal } from '@/src/components/products/TransferProductModal';
import AddCategoryModal, { CategoryFormData } from '@/src/components/products/AddCategoryModal';

// Import category images
import hdpePipeImg from '@/src/assets/product-images/HDPE Pipe.webp';
import elbowPipeImg from '@/src/assets/product-images/Elbow Pipe.webp';
import sanitaryPipeImg from '@/src/assets/product-images/Sanitary Pipe.webp';
import electricConduitImg from '@/src/assets/product-images/Electric Conduit Pipe.webp';
import inHousePipeImg from '@/src/assets/product-images/In House Pipe.webp';
import pressureLineImg from '@/src/assets/product-images/Pressure Line Pipe.webp';
import pipesImg from '@/src/assets/product-images/Pipes.webp';
import teePipeImg from '@/src/assets/product-images/Tee Pipe.webp';
import gardenHoseImg from '@/src/assets/product-images/Garden Hose.webp';
import couplingImg from '@/src/assets/product-images/Coupling.webp';
import ballValveImg from '@/src/assets/product-images/Ball Valve.webp';
import pvcCementImg from '@/src/assets/product-images/PVC Cement.webp';

export function ProductsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const allProducts = getAllProducts();

  // Categories with images for illustration
  const categories: Array<{ name: ProductCategory; image: string }> = [
    { name: 'HDPE Pipes', image: hdpePipeImg },
    { name: 'HDPE Fittings', image: elbowPipeImg },
    { name: 'UPVC Sanitary', image: sanitaryPipeImg },
    { name: 'UPVC Electrical', image: electricConduitImg },
    { name: 'UPVC Potable Water', image: inHousePipeImg },
    { name: 'UPVC Pressurized', image: pressureLineImg },
    { name: 'PPR Pipes', image: pipesImg },
    { name: 'PPR Fittings', image: teePipeImg },
    { name: 'Telecom Pipes', image: gardenHoseImg },
    { name: 'Garden Hoses', image: gardenHoseImg },
    { name: 'Flexible Hoses', image: couplingImg },
    { name: 'Others', image: pvcCementImg },
  ];

  // Filter categories by search
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle edit category
  const handleEditCategory = (category: { name: ProductCategory; image: string }) => {
    setEditingCategory({
      name: category.name,
      description: `Description for ${category.name}`, // Mock description
      imageUrl: category.image,
      icon: 'category' // Default icon
    });
    setIsEditMode(true);
    setShowAddCategoryModal(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowAddCategoryModal(false);
    setIsEditMode(false);
    setEditingCategory(null);
  };

  // Handle save
  const handleSaveCategory = (categoryData: CategoryFormData) => {
    console.log(isEditMode ? 'Updating category:' : 'Creating category:', categoryData);
    handleCloseModal();
  };

  // Handle delete
  const handleDeleteCategory = () => {
    console.log('Deleting category:', editingCategory?.name);
    handleCloseModal();
  };

  // Summary stats
  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter(p => p.status === 'Active').length;
  const lowStockProducts = allProducts.filter(p => p.status === 'Low Stock' || p.totalStock === 0).length;
  const totalRevenue = allProducts.reduce((sum, p) => sum + p.totalRevenue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">Browse products by category</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => {/* TODO: Export products data */}}>
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
          
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setShowReceiveModal(true)}>
            <Truck className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Receive</span>
            <span className="sm:hidden">Receive</span>
          </Button>

          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Transfer</span>
            <span className="sm:hidden">Transfer</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Box className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Products</p>
                <p className="text-2xl font-bold text-gray-900">{activeProducts}</p>
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
                <p className="text-sm text-gray-500">Low/Out of Stock</p>
                <p className="text-2xl font-bold text-gray-900">{lowStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue YTD</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{(totalRevenue / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCategories.map((category) => {
              const categoryProducts = allProducts.filter(p => p.category === category.name);
              const categoryCount = categoryProducts.length;
              const lowStockCount = categoryProducts.filter(p => p.status === 'Low Stock' || p.totalStock === 0).length;
              
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
                    title="Edit category"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Category Card - Clickable Area */}
                  <button
                    onClick={() => navigate(`/products/category/${category.name.toLowerCase().replace(/\s+/g, '-')}`)}
                    className="w-full text-left"
                  >
                    {/* Category Image */}
                    <div className="aspect-video w-full min-h-[120px] overflow-hidden bg-gray-100">
                      <img 
                        src={category.image} 
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    
                    {/* Category Info */}
                    <div className="p-3 sm:p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {categoryCount} {categoryCount === 1 ? 'product' : 'products'}
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
        <ReceiveProductModal
          onClose={() => setShowReceiveModal(false)}
          onSuccess={() => {
            setShowReceiveModal(false);
            // Refresh data in real implementation
          }}
        />
      )}

      {showTransferModal && (
        <TransferProductModal
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            // Refresh data in real implementation
          }}
        />
      )}

      {showAddCategoryModal && (
        <AddCategoryModal
          isOpen={showAddCategoryModal}
          onClose={handleCloseModal}
          onSave={handleSaveCategory}
          onDelete={handleDeleteCategory}
          initialData={editingCategory || undefined}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
}
