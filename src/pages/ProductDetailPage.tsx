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
  PieChart,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getProductById, getVariantsByProductId, getProductPerformance } from '@/src/mock/products';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'variants' | 'performance' | 'specs'>('variants');

  const product = getProductById(id || '');
  const variants = getVariantsByProductId(id || '');
  const performance = getProductPerformance(id || '');

  if (!product) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Product not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/products')}>
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'Active') return 'success';
    if (status === 'Low Stock') return 'warning';
    if (status === 'Out of Stock' || status === 'Discontinued') return 'danger';
    return 'default';
  };

  // Prepare chart data
  const variantSalesData = variants.map(v => ({
    name: v.size,
    sales: v.unitsSoldYTD,
    revenue: v.revenueYTD,
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const stockByBranchData = variants.slice(0, 5).map(v => ({
    variant: v.size,
    'Branch A': v.stockBranchA,
    'Branch B': v.stockBranchB,
    'Branch C': v.stockBranchC,
  }));

  const monthlyPerformance = performance.map(p => ({
    month: p.period,
    units: p.unitsSold,
    revenue: p.revenue / 1000, // Convert to thousands
  }));

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{product.category}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Product
          </Button>
          <Button variant="primary" onClick={() => navigate(`/products/${id}/variant/new`)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Variant
          </Button>
        </div>
      </div>

      {/* Product Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Box className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Variants</p>
                <p className="text-2xl font-bold text-gray-900">{product.totalVariants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Stock</p>
                <p className="text-2xl font-bold text-gray-900">{product.totalStock.toLocaleString()}</p>
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
                <p className="text-sm text-gray-500">Units Sold YTD</p>
                <p className="text-2xl font-bold text-gray-900">{product.totalUnitsSold.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Revenue YTD</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{(product.totalRevenue / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Info & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
              <p className="text-gray-900">{product.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
              <Badge variant={getStatusColor(product.status)} className="text-sm">
                {product.status}
              </Badge>
              <div className="mt-4">
                <p className="text-xs text-gray-500">Created: {product.createdDate}</p>
                <p className="text-xs text-gray-500">Last Modified: {product.lastModified}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('variants')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'variants'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Variants ({variants.length})
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'performance'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Performance & Analytics
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'specs'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Specifications
          </button>
        </nav>
      </div>

      {/* Tab Content - Variants */}
      {activeTab === 'variants' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Variants
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">SKU</th>
                    <th className="px-6 py-3 text-left font-medium">Size</th>
                    <th className="px-6 py-3 text-left font-medium">Price</th>
                    <th className="px-6 py-3 text-left font-medium">Branch A</th>
                    <th className="px-6 py-3 text-left font-medium">Branch B</th>
                    <th className="px-6 py-3 text-left font-medium">Branch C</th>
                    <th className="px-6 py-3 text-left font-medium">Total Stock</th>
                    <th className="px-6 py-3 text-left font-medium">Sold YTD</th>
                    <th className="px-6 py-3 text-left font-medium">Revenue YTD</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {variants.map((variant) => (
                    <tr key={variant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{variant.sku}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{variant.size}</td>
                      <td className="px-6 py-4 text-gray-900">₱{variant.unitPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-600">{variant.stockBranchA}</td>
                      <td className="px-6 py-4 text-gray-600">{variant.stockBranchB}</td>
                      <td className="px-6 py-4 text-gray-600">{variant.stockBranchC}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${variant.totalStock <= variant.reorderPoint ? 'text-orange-600' : 'text-gray-900'}`}>
                            {variant.totalStock}
                          </span>
                          {variant.totalStock <= variant.reorderPoint && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{variant.unitsSoldYTD.toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        ₱{(variant.revenueYTD / 1000).toFixed(0)}K
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getStatusColor(variant.status)}>
                          {variant.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Content - Performance */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales by Variant */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Revenue by Variant (Top 8)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={variantSalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => `₱${value.toLocaleString()}`}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#EF4444" name="Revenue (₱)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stock Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  Stock by Branch (Top 5 Variants)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stockByBranchData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="variant" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Branch A" fill="#EF4444" />
                    <Bar dataKey="Branch B" fill="#F59E0B" />
                    <Bar dataKey="Branch C" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Performance */}
          {monthlyPerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Monthly Performance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="units" stroke="#EF4444" name="Units Sold" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" name="Revenue (₱ thousands)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Customers */}
          {performance.length > 0 && performance[0].topCustomers && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Customers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Customer</th>
                      <th className="px-6 py-3 text-left font-medium">Units Purchased</th>
                      <th className="px-6 py-3 text-left font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {performance[0].topCustomers.map((customer, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{customer.customerName}</td>
                        <td className="px-6 py-4 text-gray-900">{customer.unitsPurchased.toLocaleString()}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">₱{customer.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab Content - Specifications */}
      {activeTab === 'specs' && (
        <Card>
          <CardHeader>
            <CardTitle>Product Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            {product.specifications ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key}>
                    <h3 className="text-sm font-medium text-gray-500 mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <p className="text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No specifications available</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
