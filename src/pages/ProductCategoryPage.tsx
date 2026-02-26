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
  Eye,
  DollarSign,
} from 'lucide-react';

// Mock product families for a category (hardcoded)
const mockProductFamilies = [
  {
    id: 'PROD-001',
    name: 'Heavy Duty Industrial Pipes',
    familyCode: 'HDPE-HD',
    description: 'High-density polyethylene pipes for industrial applications',
    category: 'HDPE Pipes',
    variantCount: 8,
    totalStock: 2450,
    avgPrice: 850,
    unitsSold: 1245,
    revenue: 1058250,
    status: 'Active',
    imageUrl: null,
  },
  {
    id: 'PROD-002',
    name: 'Standard HDPE Pipes',
    familyCode: 'HDPE-STD',
    description: 'Standard grade HDPE pipes for general use',
    category: 'HDPE Pipes',
    variantCount: 12,
    totalStock: 4200,
    avgPrice: 450,
    unitsSold: 3580,
    revenue: 1611000,
    status: 'Active',
    imageUrl: null,
  },
  {
    id: 'PROD-003',
    name: 'Agricultural HDPE Pipes',
    familyCode: 'HDPE-AGR',
    description: 'HDPE pipes designed for agricultural and irrigation systems',
    category: 'HDPE Pipes',
    variantCount: 6,
    totalStock: 1850,
    avgPrice: 380,
    unitsSold: 2240,
    revenue: 851200,
    status: 'Active',
    imageUrl: null,
  },
  {
    id: 'PROD-004',
    name: 'Mining Grade HDPE Pipes',
    familyCode: 'HDPE-MNG',
    description: 'Extra heavy duty HDPE pipes for mining applications',
    category: 'HDPE Pipes',
    variantCount: 5,
    totalStock: 420,
    avgPrice: 1250,
    unitsSold: 680,
    revenue: 850000,
    status: 'Low Stock',
    imageUrl: null,
  },
  {
    id: 'PROD-005',
    name: 'HDPE Gas Distribution Pipes',
    familyCode: 'HDPE-GAS',
    description: 'Specialized HDPE pipes for natural gas distribution',
    category: 'HDPE Pipes',
    variantCount: 7,
    totalStock: 1120,
    avgPrice: 950,
    unitsSold: 1450,
    revenue: 1377500,
    status: 'Active',
    imageUrl: null,
  },
  {
    id: 'PROD-006',
    name: 'HDPE Drainage Pipes',
    familyCode: 'HDPE-DRN',
    description: 'Corrugated HDPE pipes for drainage and sewage systems',
    category: 'HDPE Pipes',
    variantCount: 10,
    totalStock: 3600,
    avgPrice: 320,
    unitsSold: 4850,
    revenue: 1552000,
    status: 'Active',
    imageUrl: null,
  },
];

export default function ProductCategoryPage() {
  const navigate = useNavigate();
  const { categoryName } = useParams<{ categoryName: string }>();
  const { selectedBranch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'revenue'>('name');

  const categoryTitle = categoryName
    ? categoryName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'HDPE Pipes';

  // Filter and sort product families
  const filteredFamilies = mockProductFamilies
    .filter(family =>
      family.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      family.familyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      family.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock') return b.totalStock - a.totalStock;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      return 0;
    });

  const totalValue = filteredFamilies.reduce((sum, f) => sum + f.revenue, 0);
  const lowStockCount = filteredFamilies.filter(f => f.status === 'Low Stock' || f.totalStock < 500).length;
  const totalFamilies = filteredFamilies.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/products')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{categoryTitle}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalFamilies} product families • ₱{(totalValue / 1000000).toFixed(2)}M total revenue
            </p>
          </div>
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
                <p className="text-sm text-gray-500">Product Families</p>
                <p className="text-2xl font-bold text-gray-900">{totalFamilies}</p>
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
                <p className="text-sm text-gray-500">Low Stock Families</p>
                <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
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
                <p className="text-sm text-gray-500">Category Revenue</p>
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
                placeholder="Search product families..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="relative min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'stock' | 'revenue')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="name">Sort by Name</option>
                <option value="stock">Sort by Stock Level</option>
                <option value="revenue">Sort by Revenue</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Families Grid - Shop Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFamilies.map((family) => {
          return (
            <Card
              key={family.id}
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
                        {family.name}
                      </h3>
                      <Badge
                        variant={
                          family.status === 'Low Stock' ? 'warning' : 'success'
                        }
                        size="sm"
                      >
                        {family.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {family.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Family Code: {family.familyCode}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Variants:</span>
                      <span className="font-bold text-gray-900">{family.variantCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Stock:</span>
                      <span className={`font-bold ${
                        family.totalStock < 500 ? 'text-orange-600' : 'text-gray-900'
                      }`}>
                        {family.totalStock.toLocaleString()} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Avg. Price:</span>
                      <span className="font-semibold text-gray-900">
                        ₱{family.avgPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Revenue & Sales */}
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Units Sold YTD:</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-900">
                          {family.unitsSold.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Revenue YTD:</span>
                      <span className="font-bold text-green-600">
                        ₱{(family.revenue / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>

                  {/* Warning */}
                  {family.status === 'Low Stock' && (
                    <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-orange-700">
                        <span className="font-semibold">Low Stock!</span> Consider reviewing production schedule.
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-4 border-t">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => navigate(`/products/category/${categoryName}/family/${family.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Variants
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredFamilies.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Package className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No product families found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
