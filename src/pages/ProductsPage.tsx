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
} from 'lucide-react';
import { getAllProducts } from '@/src/mock/products';
import type { ProductCategory, ProductStatus } from '@/src/types/product';
import { ReceiveProductModal } from '@/src/components/products/ReceiveProductModal';
import { TransferProductModal } from '@/src/components/products/TransferProductModal';

export function ProductsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const allProducts = getAllProducts();

  const categories: ProductCategory[] = [
    'HDPE Pipes',
    'HDPE Fittings',
    'UPVC Sanitary',
    'UPVC Electrical',
    'UPVC Potable Water',
    'UPVC Pressurized',
    'PPR Pipes',
    'PPR Fittings',
    'Telecom Pipes',
    'Garden Hoses',
    'Flexible Hoses',
    'Others',
  ];

  // Filter categories by search
  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary stats
  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter(p => p.status === 'Active').length;
  const lowStockProducts = allProducts.filter(p => p.status === 'Low Stock' || p.totalStock === 0).length;
  const totalRevenue = allProducts.reduce((sum, p) => sum + p.totalRevenue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">Browse products by category</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {/* TODO: Export products data */}}>
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
                <TrendingUp className="w-6 h-6 text-green-600" />
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
                <p className="text-sm text-gray-500">Low Stock Items</p>
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
          <CardTitle className="text-xl">Browse by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCategories.map((category) => {
              const categoryProducts = allProducts.filter(p => p.category === category);
              const categoryCount = categoryProducts.length;
              const lowStockCount = categoryProducts.filter(p => p.status === 'Low Stock' || p.totalStock === 0).length;
              
              return (
                <button
                  key={category}
                  onClick={() => navigate(`/products/category/${category.toLowerCase().replace(/\s+/g, '-')}`)}
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
                        {categoryCount} {categoryCount === 1 ? 'product' : 'products'}
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
    </div>
  );
}
