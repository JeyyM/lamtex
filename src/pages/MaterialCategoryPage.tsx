import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAppContext } from '../store/AppContext';
import { 
  Package, 
  ArrowLeft, 
  AlertTriangle, 
  TrendingUp,
  Search,
  Filter,
  ShoppingCart,
  Eye
} from 'lucide-react';

// Mock data for a single category (hardcoded for now)
const mockCategoryMaterials = [
  {
    id: 'MAT-001',
    name: 'Polyester Resin',
    sku: 'RES-001',
    description: 'High-quality unsaturated polyester resin for general lamination',
    category: 'Resins',
    totalStock: 2500,
    stockBranchA: 1200,
    stockBranchB: 800,
    stockBranchC: 500,
    reorderPoint: 1000,
    unitOfMeasure: 'kg',
    costPerUnit: 185,
    monthlyConsumption: 800,
    avgDailyUsage: 26.67,
    status: 'In Stock',
    stockPercentage: 62.5, // Percentage relative to max capacity
    imageUrl: null,
  },
  {
    id: 'MAT-002',
    name: 'Epoxy Resin',
    sku: 'RES-002',
    description: 'Premium epoxy resin for high-performance applications',
    category: 'Resins',
    totalStock: 450,
    stockBranchA: 250,
    stockBranchB: 150,
    stockBranchC: 50,
    reorderPoint: 600,
    unitOfMeasure: 'kg',
    costPerUnit: 420,
    monthlyConsumption: 400,
    avgDailyUsage: 13.33,
    status: 'Low Stock',
    stockPercentage: 28.1,
    imageUrl: null,
  },
  {
    id: 'MAT-003',
    name: 'Vinyl Ester Resin',
    sku: 'RES-003',
    description: 'Corrosion-resistant vinyl ester resin for chemical applications',
    category: 'Resins',
    totalStock: 1800,
    stockBranchA: 900,
    stockBranchB: 600,
    stockBranchC: 300,
    reorderPoint: 800,
    unitOfMeasure: 'kg',
    costPerUnit: 320,
    monthlyConsumption: 600,
    avgDailyUsage: 20,
    status: 'In Stock',
    stockPercentage: 75,
    imageUrl: null,
  },
  {
    id: 'MAT-004',
    name: 'Polyester Gelcoat - White',
    sku: 'RES-004',
    description: 'Premium white gelcoat for smooth, glossy finish',
    category: 'Resins',
    totalStock: 950,
    stockBranchA: 450,
    stockBranchB: 300,
    stockBranchC: 200,
    reorderPoint: 500,
    unitOfMeasure: 'kg',
    costPerUnit: 280,
    monthlyConsumption: 350,
    avgDailyUsage: 11.67,
    status: 'In Stock',
    stockPercentage: 55,
    imageUrl: null,
  },
  {
    id: 'MAT-005',
    name: 'Phenolic Resin',
    sku: 'RES-005',
    description: 'Heat-resistant phenolic resin for specialty applications',
    category: 'Resins',
    totalStock: 180,
    stockBranchA: 100,
    stockBranchB: 50,
    stockBranchC: 30,
    reorderPoint: 400,
    unitOfMeasure: 'kg',
    costPerUnit: 450,
    monthlyConsumption: 200,
    avgDailyUsage: 6.67,
    status: 'Critical',
    stockPercentage: 15,
    imageUrl: null,
  },
  {
    id: 'MAT-006',
    name: 'Acrylic Resin',
    sku: 'RES-006',
    description: 'Clear acrylic resin for transparent applications',
    category: 'Resins',
    totalStock: 650,
    stockBranchA: 350,
    stockBranchB: 200,
    stockBranchC: 100,
    reorderPoint: 300,
    unitOfMeasure: 'kg',
    costPerUnit: 380,
    monthlyConsumption: 250,
    avgDailyUsage: 8.33,
    status: 'In Stock',
    stockPercentage: 68,
    imageUrl: null,
  },
];

export default function MaterialCategoryPage() {
  const navigate = useNavigate();
  const { categoryName } = useParams<{ categoryName: string }>();
  const { selectedBranch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'usage'>('name');

  // For now, always show the same hardcoded data regardless of category
  const categoryTitle = categoryName
    ? categoryName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Resins';

  // Filter and sort materials
  const filteredMaterials = mockCategoryMaterials
    .filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock') return b.totalStock - a.totalStock;
      if (sortBy === 'usage') return b.monthlyConsumption - a.monthlyConsumption;
      return 0;
    });

  const totalValue = filteredMaterials.reduce((sum, m) => sum + (m.totalStock * m.costPerUnit), 0);
  const lowStockCount = filteredMaterials.filter(m => m.status === 'Low Stock' || m.status === 'Critical').length;
  const totalItems = filteredMaterials.length;

  const getStockBarColor = (percentage: number, status: string) => {
    if (status === 'Critical') return 'bg-red-500';
    if (status === 'Low Stock') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStockStatusColor = (status: string) => {
    if (status === 'Critical') return 'text-red-600 bg-red-50 border-red-200';
    if (status === 'Low Stock') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  // Get stock for selected branch (default to Branch A)
  const getStockForBranch = (material: typeof mockCategoryMaterials[0]) => {
    // Default to Branch A if no branch selected or "All" selected
    if (!selectedBranch || selectedBranch === 'All') return material.stockBranchA;
    if (selectedBranch === 'A') return material.stockBranchA;
    if (selectedBranch === 'B') return material.stockBranchB;
    if (selectedBranch === 'C') return material.stockBranchC;
    return material.stockBranchA; // Fallback to Branch A
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/materials')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{categoryTitle}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalItems} materials • ₱{(totalValue / 1000000).toFixed(2)}M total value
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Create Purchase Order
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
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
                <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Category Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{(totalValue / 1000000).toFixed(2)}M
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="relative min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'stock' | 'usage')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="name">Sort by Name</option>
                <option value="stock">Sort by Stock Level</option>
                <option value="usage">Sort by Usage</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Grid - Shop Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((material) => {
          const daysOfCover = material.avgDailyUsage > 0 
            ? material.totalStock / material.avgDailyUsage 
            : Infinity;

          return (
            <Card 
              key={material.id} 
              className="group hover:shadow-xl transition-all duration-200 border-2 hover:border-red-500"
            >
              <CardContent className="p-0">
                {/* Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-b">
                  <Package className="w-16 h-16 text-gray-400" />
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg group-hover:text-red-600 transition-colors">
                        {material.name}
                      </h3>
                      <Badge 
                        variant={
                          material.status === 'Critical' ? 'danger' :
                          material.status === 'Low Stock' ? 'warning' :
                          'success'
                        }
                        size="sm"
                      >
                        {material.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {material.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      SKU: {material.sku}
                    </p>
                  </div>

                    {/* Stock Information */}
                  <div className="space-y-3">
                    {/* Stock Level Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {(!selectedBranch || selectedBranch === 'All') ? 'Branch A Stock' : `Branch ${selectedBranch} Stock`}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {getStockForBranch(material).toLocaleString()} {material.unitOfMeasure}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${getStockBarColor(material.stockPercentage, material.status)}`}
                          style={{ width: `${Math.min(material.stockPercentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">
                          Reorder: {material.reorderPoint.toLocaleString()}
                        </span>
                        <span className={`text-xs font-medium ${
                          material.totalStock <= material.reorderPoint ? 'text-orange-600' : 'text-gray-500'
                        }`}>
                          {material.stockPercentage.toFixed(0)}% of capacity
                        </span>
                      </div>
                    </div>                    {/* Usage & Days of Cover */}
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Monthly Usage:</span>
                        <span className="font-medium text-gray-900">
                          {material.monthlyConsumption.toLocaleString()} {material.unitOfMeasure}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Days of Cover:</span>
                        <span className={`font-bold ${
                          daysOfCover < 7 ? 'text-red-600' :
                          daysOfCover < 14 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {daysOfCover === Infinity ? '∞' : `${daysOfCover.toFixed(1)} days`}
                        </span>
                      </div>
                    </div>

                    {/* Warning Messages */}
                    {material.status === 'Critical' && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-red-700">
                          <span className="font-semibold">Critical Stock!</span> Immediate reorder required.
                        </div>
                      </div>
                    )}

                    {material.status === 'Low Stock' && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-700">
                          <span className="font-semibold">Low Stock</span> Consider reordering soon.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Price & Actions */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs text-gray-500">Cost per Unit</div>
                        <div className="text-xl font-bold text-gray-900">
                          ₱{material.costPerUnit.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Total Value</div>
                        <div className="text-lg font-semibold text-gray-900">
                          ₱{((material.totalStock * material.costPerUnit) / 1000).toFixed(0)}K
                        </div>
                      </div>
                    </div>

                    <Button 
                      variant="primary" 
                      className="w-full"
                      onClick={() => navigate(`/materials/category/${categoryName}/details/${material.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Package className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No materials found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
