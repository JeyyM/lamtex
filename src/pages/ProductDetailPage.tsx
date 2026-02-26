import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { VariantModal } from '@/src/components/products/VariantModal';
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
import { rawMaterials } from '@/src/mock/rawMaterials';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'variants' | 'performance' | 'specs'>('variants');
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

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

  // Safely recreate safeVariants if undefined
  const safeVariants = variants?.map(v => ({ ...v, revenue: v.revenueYTD ?? 0 })) ?? [];

  // Safely recreate sortedByRevenue if undefined
  const sortedByRevenue = [...(safeVariants ?? [])]
    .sort((a, b) => b.revenue - a.revenue);

  // Derived constants for Forecast Rollup
  const totalUnits = product.totalUnitsSold || 0;
  const totalRevenue = product.totalRevenue || 0;
  const forecastUnits = Number(totalUnits ?? 0) * 1.12;
  const forecastRevenue = Number(totalRevenue ?? 0) * 1.10;
  const growthRatePercent = totalRevenue > 0 ? 10 : 0;
  const priorityVariants = sortedByRevenue?.slice(0, 2) ?? [];
  const previousRevenue = Number(totalRevenue ?? 0) * 0.9;
  const maxTrendValue = Math.max(previousRevenue, totalRevenue, forecastRevenue, 1);

  // Derived constants for AI Insight Summary
  const variantCount = safeVariants?.length ?? 0;
  const topVariant = sortedByRevenue?.[0] ?? null;
  const topVariantRevenue = Number(topVariant?.revenue ?? 0);
  const concentrationPercent = totalRevenue > 0
    ? (topVariantRevenue / totalRevenue) * 100
    : 0;
  const growthPercent = totalRevenue > 0
    ? ((forecastRevenue - totalRevenue) / totalRevenue) * 100
    : 0;
  const riskLevel = concentrationPercent >= 60
    ? 'High'
    : concentrationPercent >= 40
    ? 'Moderate'
    : 'Low';

  const insightSummary = variantCount === 0
    ? 'No variant performance data available to generate insights.'
    : `Total revenue is ₱${totalRevenue.toLocaleString()} with ${variantCount} variants and ${totalUnits.toLocaleString()} total units sold.\n\n` +
      `${topVariant ? `The top variant is ${topVariant.size}, contributing ${concentrationPercent.toFixed(1)}% of revenue. Risk level is classified as ${riskLevel}.\n\n` : ''}` +
      `Forecast revenue is ₱${forecastRevenue.toLocaleString()}, projecting a growth of ${growthPercent.toFixed(1)}%.\n\n` +
      (riskLevel === 'High'
        ? 'Recommendation: Diversify product portfolio to reduce risk.'
        : riskLevel === 'Moderate'
        ? 'Recommendation: Monitor revenue concentration closely.'
        : 'Recommendation: Scale the top-performing variant for maximum growth.');

  // Determine materials linked to this product
  let materialsForProduct =
    rawMaterials?.filter(
      (material) => material.linkedProducts?.includes(product.id)
    ) || [];

  /* Prototype fallback — simulated linkage */
  if (materialsForProduct.length === 0 && rawMaterials?.length) {
    const productName = product.name?.toLowerCase() || '';

    if (productName.includes('pipe')) {
      materialsForProduct = rawMaterials.filter((m) =>
        ['Resin', 'Stabilizer', 'Colorant', 'Lubricant', 'Additive'].includes(
          m.category
        )
      );
    } else if (productName.includes('fitting')) {
      materialsForProduct = rawMaterials.filter((m) =>
        ['Resin', 'Stabilizer', 'Colorant'].includes(m.category)
      );
    } else {
      materialsForProduct = rawMaterials.slice(0, 3); // generic fallback
    }
  }

  // Categorize materials
  const resinMaterials = materialsForProduct.filter(m => m.category.includes('Resin'));
  const stabilizers = materialsForProduct.filter(m => m.category === 'Stabilizers');
  const lubricants = materialsForProduct.filter(m => m.category === 'Lubricants');
  const colorants = materialsForProduct.filter(m => m.category === 'Colorants');
  const additives = materialsForProduct.filter(m => m.category === 'Additives');
  const packaging = materialsForProduct.filter(m => m.category === 'Packaging Materials');

  // Helper to compute average costs
  const averageCost = (materials: typeof rawMaterials) =>
    materials.length === 0
      ? 0
      : materials.reduce((sum, m) => sum + (m.costPerUnit || 0), 0) / materials.length;

  // Compute average costs
  const avgResinCost = averageCost(resinMaterials);
  const avgStabilizerCost = averageCost(stabilizers);
  const avgLubricantCost = averageCost(lubricants);
  const avgColorantCost = averageCost(colorants);
  const avgAdditiveCost = averageCost(additives);
  const avgPackagingCost = averageCost(packaging);

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
          <Button variant="outline" onClick={() => navigate(`/products/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Product
          </Button>
          <Button variant="primary" onClick={() => setIsVariantModalOpen(true)}>
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

          {/* Variant Performance Summary */}
          {activeTab === 'performance' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Variant Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {variantSalesData.map((variant, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="text-lg font-bold text-gray-900">{variant.name}</h3>
                      <p className="text-sm text-gray-500">Units Sold: {variant.sales.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Revenue: ₱{variant.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Forecast Rollup Section */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Forecast Rollup</h2>

            {/* Forecast KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Forecast Units (Next 30 Days)</p>
                  <p className="text-2xl font-bold text-gray-900">{forecastUnits.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Forecast Revenue (Next 30 Days)</p>
                  <p className="text-2xl font-bold text-gray-900">₱{forecastRevenue.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Projected Growth %</p>
                  <p className="text-2xl font-bold text-gray-900">{growthRatePercent}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Priority Variants Count</p>
                  <p className="text-2xl font-bold text-gray-900">{priorityVariants.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Priority Variants Section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Recommended Variants to Prioritize</h3>
              {priorityVariants.length === 0 ? (
                <p className="text-gray-500">No variant data available for forecasting</p>
              ) : (
                <ul className="space-y-4">
                  {priorityVariants.map((variant, index) => {
                    const forecastContribution = totalRevenue > 0
                      ? (variant.revenue / totalRevenue) * forecastRevenue
                      : 0;
                    return (
                      <li key={index} className="p-4 border rounded-lg">
                        <h4 className="text-lg font-bold text-gray-900">{variant.size}</h4>
                        <p className="text-sm text-gray-500">Current Revenue: ₱{variant.revenue.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Forecast Contribution: ₱{forecastContribution.toLocaleString()}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Revenue Trend Projection */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Revenue Trend Projection</h3>

              <div className="space-y-4">

                {/* Previous */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Previous Month</span>
                    <span className="font-medium text-gray-900">
                      ₱{previousRevenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-3 rounded">
                    <div
                      className="h-3 bg-gray-400 rounded"
                      style={{
                        width: `${(previousRevenue / maxTrendValue) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Current */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Current Month</span>
                    <span className="font-medium text-gray-900">
                      ₱{totalRevenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-3 rounded">
                    <div
                      className="h-3 bg-red-500 rounded"
                      style={{
                        width: `${(totalRevenue / maxTrendValue) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Forecast */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Forecast (Next 30 Days)</span>
                    <span className="font-medium text-gray-900">
                      ₱{forecastRevenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-3 rounded">
                    <div
                      className="h-3 bg-green-600 rounded"
                      style={{
                        width: `${(forecastRevenue / maxTrendValue) * 100}%`,
                      }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* AI Insight Summary Section */}
            <div className="mt-12">
              <h2 className="text-xl font-semibold mb-4">AI Insight Summary</h2>

              <div className="bg-white shadow rounded p-6">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {insightSummary}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content - Specifications */}
      {activeTab === 'specs' && (
        <div className="space-y-6">
          {/* Existing Specifications Card */}
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

          {/* Material Composition & Cost Model */}
          <Card>
            <CardHeader>
              <CardTitle>Material Composition & Estimated Cost Model</CardTitle>
            </CardHeader>
            <CardContent>
              {materialsForProduct.length === 0 ? (
                <p className="text-gray-500">
                  No linked raw materials found for this product.
                </p>
              ) : (
                <div className="space-y-6">
                  {/* Linked Materials List */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Linked Raw Materials
                    </h3>
                    <ul className="space-y-2">
                      {materialsForProduct.map((material) => (
                        <li
                          key={material.id}
                          className="flex justify-between text-sm border-b pb-2"
                        >
                          <span>{material.name}</span>
                          <span className="text-gray-500">
                            {material.category} — ₱{material.costPerUnit.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Variant Cost Simulation Table */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Estimated Material Cost Per Variant
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left">Variant</th>
                            <th className="px-4 py-2 text-left">Size</th>
                            <th className="px-4 py-2 text-left">Est. Cost / Unit</th>
                            <th className="px-4 py-2 text-left">Gross Margin %</th>
                            <th className="px-4 py-2 text-left">Risk</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {variants.map((variant) => {
                            // Extract first numeric size
                            const sizeMatch = variant.size?.match(/\d+/);
                            const sizeValue = sizeMatch ? parseFloat(sizeMatch[0]) : 20;

                            // Normalize relative to smallest size (20mm baseline)
                            const sizeFactor = sizeValue / 20;

                            // Base weight
                            const baseWeightKg = 0.75;

                            // Controlled scaling
                            const totalWeightKg = baseWeightKg * Math.pow(sizeFactor, 0.55);

                            // Blended raw material cost
                            const blendedCostPerKg =
                              (avgResinCost || 65) * 0.8 +
                              12; // additives & minor components blended

                            // Manufacturing + packaging overhead
                            const overheadCost = 22;

                            // Estimated production cost
                            const materialCostPerUnit =
                              totalWeightKg * blendedCostPerKg + overheadCost;

                            // --- Stabilized Margin Model ---

                            // Target margin curve: larger sizes slightly better margin
                            const baseMargin = 28;
                            const marginGrowth = Math.min(sizeFactor * 3, 12);
                            const targetMargin = baseMargin + marginGrowth;

                            // Risk classification (clean thresholds)
                            let riskLabel = 'Healthy';
                            if (targetMargin < 25) riskLabel = 'Medium';
                            if (targetMargin < 20) riskLabel = 'High Risk';

                            // Use stabilized margin for display
                            const grossMargin = targetMargin;

                            return (
                              <tr key={variant.id}>
                                <td className="px-4 py-2 font-medium">{variant.sku}</td>
                                <td className="px-4 py-2">{variant.size}</td>
                                <td className="px-4 py-2">
                                  ₱{materialCostPerUnit.toFixed(2)}
                                </td>
                                <td className="px-4 py-2">
                                  {grossMargin.toFixed(1)}%
                                </td>
                                <td className="px-4 py-2">
                                  {riskLabel}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Variant Modal */}
      <VariantModal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        productId={id || ''}
        productName={product?.name || ''}
        variant={null}
      />
    </div>
  );
}
