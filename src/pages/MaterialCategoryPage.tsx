import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
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
  Edit,
  Plus,
  Edit3,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import AddMaterialModal, { MaterialFormData } from '../components/materials/AddMaterialModal';
import StockAdjustmentModal from '../components/warehouse/StockAdjustmentModal';
import { supabase } from '../lib/supabase';

// ── Supabase row shape ───────────────────────────────────────────────────────
interface MaterialStockRow {
  quantity: number;
  branches: { code: string; name: string } | null;
}

interface RawMaterialRow {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category_id: string | null;
  description: string | null;
  image_url: string | null;
  unit_of_measure: string;
  total_stock: number;
  reorder_point: number;
  cost_per_unit: number;
  monthly_consumption: number;
  status: string;
  specifications: { label: string; value: string }[] | null;
  material_stock: MaterialStockRow[];
}

export default function MaterialCategoryPage() {
  const navigate = useNavigate();
  const { categoryName } = useParams<{ categoryName: string }>();
  const { selectedBranch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'usage'>('name');

  // Modal states
  const [editingMaterial, setEditingMaterial] = useState<MaterialFormData | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Stock adjustment modal
  const [showStockAdjustmentModal, setShowStockAdjustmentModal] = useState(false);
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<any>(null);

  // Supabase state
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryTitle, setCategoryTitle] = useState<string>(
    categoryName
      ? categoryName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Materials'
  );
  const [materials, setMaterials] = useState<RawMaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch category row (to get its UUID) then fetch its materials ───────────
  const fetchMaterials = useCallback(async () => {
    if (!categoryName) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Resolve category UUID from slug
      const { data: catData, error: catError } = await supabase
        .from('material_categories')
        .select('id, name')
        .eq('slug', categoryName)
        .single();

      if (catError || !catData) {
        setError(`Category "${categoryName}" not found`);
        setLoading(false);
        return;
      }
      setCategoryId(catData.id);
      setCategoryTitle(catData.name);

      // 2. Fetch raw_materials for this category (with per-branch stock)
      const { data, error: matError } = await supabase
        .from('raw_materials')
        .select('id, name, sku, brand, category_id, description, image_url, unit_of_measure, total_stock, reorder_point, cost_per_unit, monthly_consumption, status, specifications, material_stock ( quantity, branches ( code, name ) )')
        .eq('category_id', catData.id)
        .order('name', { ascending: true });

      if (matError) throw matError;
      setMaterials((data ?? []) as unknown as RawMaterialRow[]);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, [categoryName]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleEditMaterial = (m: RawMaterialRow) => {
    setEditingMaterial({
      id: m.id,
      name: m.name,
      sku: m.sku,
      brand: m.brand ?? '',
      description: m.description ?? '',
      imageUrl: m.image_url ?? '',
      category: categoryTitle,
      unitOfMeasure: m.unit_of_measure,
      costPerUnit: m.cost_per_unit,
      reorderPoint: m.reorder_point,
      specifications: Array.isArray(m.specifications) ? m.specifications : [],
    });
    setEditingMaterialId(m.id);
    setIsEditMode(true);
  };

  const handleCloseModal = () => {
    setEditingMaterial(null);
    setEditingMaterialId(null);
    setIsEditMode(false);
  };

  const handleSaveMaterial = async (formData: MaterialFormData) => {
    if (!categoryId) return;
    setSaving(true);
    try {
      if (isEditMode && editingMaterialId) {
        const { error } = await supabase
          .from('raw_materials')
          .update({
            name: formData.name.trim(),
            sku: formData.sku.trim().toUpperCase(),
            brand: formData.brand.trim() || null,
            description: formData.description.trim() || null,
            image_url: formData.imageUrl || null,
            unit_of_measure: formData.unitOfMeasure,
            cost_per_unit: formData.costPerUnit,
            reorder_point: formData.reorderPoint,
            specifications: formData.specifications.filter(s => s.label.trim()),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMaterialId);
        if (error) throw error;
      } else {
        const { data: newMaterial, error } = await supabase
          .from('raw_materials')
          .insert({
            name: formData.name.trim(),
            sku: formData.sku.trim().toUpperCase(),
            brand: formData.brand.trim() || null,
            description: formData.description.trim() || null,
            image_url: formData.imageUrl || null,
            category_id: categoryId,
            unit_of_measure: formData.unitOfMeasure,
            cost_per_unit: formData.costPerUnit,
            reorder_point: formData.reorderPoint,
            specifications: formData.specifications.filter(s => s.label.trim()),
            status: 'Active',
          })
          .select('id')
          .single();
        if (error) throw error;

        // Create a material_stock row for the current branch
        if (newMaterial && selectedBranch) {
          const { data: branchRow } = await supabase
            .from('branches')
            .select('id')
            .eq('name', selectedBranch)
            .single();
          if (branchRow) {
            await supabase.from('material_stock').insert({
              material_id: newMaterial.id,
              branch_id: branchRow.id,
              quantity: 0,
            });
          }
        }
      }
      await fetchMaterials();
      handleCloseModal();
    } catch (err: any) {
      alert(`Failed to save material: ${err.message ?? 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!editingMaterialId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', editingMaterialId);
      if (error) throw error;
      await fetchMaterials();
      handleCloseModal();
    } catch (err: any) {
      alert(`Failed to delete material: ${err.message ?? 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleMaterialClick = (m: RawMaterialRow) => {
    navigate(`/materials/category/${categoryName}/details/${m.id}`);
  };

  const handleOpenAdjustment = (m: RawMaterialRow, e: MouseEvent) => {
    e.stopPropagation();
    setSelectedItemForAdjustment({
      id: m.id,
      name: m.name,
      sku: m.sku,
      currentStock: m.total_stock,
      unit: m.unit_of_measure,
      reorderPoint: m.reorder_point,
    });
    setShowStockAdjustmentModal(true);
  };

  const handleStockAdjustment = (adjustment: any) => {
    console.log('Stock Adjustment:', { item: selectedItemForAdjustment, adjustment });
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const filteredMaterials = materials
    .filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock') return b.total_stock - a.total_stock;
      if (sortBy === 'usage') return b.monthly_consumption - a.monthly_consumption;
      return 0;
    });

  const totalValue = filteredMaterials.reduce((sum, m) => sum + (m.total_stock * m.cost_per_unit), 0);
  const lowStockCount = filteredMaterials.filter(m => m.status === 'Low Stock' || m.status === 'Critical').length;

  const getStockBarColor = (m: RawMaterialRow) => {
    if (m.reorder_point > 0 && m.total_stock <= m.reorder_point * 0.5) return 'bg-red-500';
    if (m.reorder_point > 0 && m.total_stock <= m.reorder_point) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStockPercentage = (m: RawMaterialRow) => {
    if (m.reorder_point <= 0) return 100;
    return Math.min((m.total_stock / (m.reorder_point * 2)) * 100, 100);
  };

  const getStockForBranch = (m: RawMaterialRow) => {
    if (!selectedBranch) return m.total_stock;
    const row = m.material_stock.find(s => s.branches?.name === selectedBranch);
    return row?.quantity ?? 0;
  };

  const getStatusBadge = (m: RawMaterialRow): 'success' | 'warning' | 'danger' | 'default' => {
    if (m.reorder_point > 0 && m.total_stock <= m.reorder_point * 0.5) return 'danger';
    if (m.reorder_point > 0 && m.total_stock <= m.reorder_point) return 'warning';
    return 'success';
  };

  const getStatusLabel = (m: RawMaterialRow) => {
    if (m.reorder_point > 0 && m.total_stock <= m.reorder_point * 0.5) return 'Critical';
    if (m.reorder_point > 0 && m.total_stock <= m.reorder_point) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Button variant="ghost" onClick={() => navigate('/materials')} className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{categoryTitle}</h1>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {filteredMaterials.length} materials • ₱{(totalValue / 1000000).toFixed(2)}M total value
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="flex-1 sm:flex-none">
            <ShoppingCart className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create Purchase Order</span>
            <span className="sm:hidden">Purchase Order</span>
          </Button>
          <Button
            variant="primary"
            className="flex-1 sm:flex-none"
            onClick={() => {
              setIsEditMode(false);
              setEditingMaterialId(null);
              setEditingMaterial({
                name: '', sku: '', description: '', imageUrl: '',
                category: categoryTitle, unitOfMeasure: 'kg',
                costPerUnit: 0, reorderPoint: 0, specifications: [],
              });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Material</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-red-500" />
        </div>
      )}

      {error && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Failed to load materials</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button onClick={fetchMaterials} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg mx-auto hover:bg-red-700 transition-all">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredMaterials.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg"><AlertTriangle className="w-6 h-6 text-orange-600" /></div>
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
                  <div className="p-3 bg-green-100 rounded-lg"><TrendingUp className="w-6 h-6 text-green-600" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Category Value</p>
                    <p className="text-2xl font-bold text-gray-900">₱{(totalValue / 1000000).toFixed(2)}M</p>
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div className="relative min-w-[200px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
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

          {/* Materials Grid */}
          {filteredMaterials.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'No materials found' : 'No materials yet'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery ? 'Try adjusting your search' : 'Add the first material to this category'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setEditingMaterialId(null);
                      setEditingMaterial({ name: '', sku: '', description: '', imageUrl: '', category: categoryTitle, unitOfMeasure: 'kg', costPerUnit: 0, reorderPoint: 0, specifications: [] });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg mx-auto hover:bg-red-700 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Material
                  </button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials.map((m) => {
                const stockPct = getStockPercentage(m);
                const statusLabel = getStatusLabel(m);
                const statusVariant = getStatusBadge(m);
                const daysOfCover = m.monthly_consumption > 0
                  ? (m.total_stock / (m.monthly_consumption / 30))
                  : Infinity;

                return (
                  <div key={m.id} className="group relative">
                    {/* Edit Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditMaterial(m); }}
                      className="absolute top-2 right-2 z-10 p-2.5 bg-white hover:bg-red-600 text-gray-700 hover:text-white rounded-lg shadow-lg border border-gray-300 group-hover:border-red-600 transition-all duration-200 hover:scale-110"
                      title="Edit material"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <Card
                      className="group-hover:shadow-xl transition-all duration-200 border-2 group-hover:border-red-500 cursor-pointer"
                      onClick={() => handleMaterialClick(m)}
                    >
                      <CardContent className="p-0">
                        {/* Image */}
                        <div className="h-48 bg-gray-100 overflow-hidden border-b">
                          {m.image_url ? (
                            <img src={m.image_url} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                              <Package className="w-16 h-16 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 text-lg group-hover:text-red-600 transition-colors">
                                {m.name}
                              </h3>
                              <Badge variant={statusVariant} size="sm" className="whitespace-nowrap shrink-0 mt-1">{statusLabel}</Badge>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2">{m.description}</p>
                            <p className="text-xs text-gray-400 mt-1 font-mono">
                              {m.brand ? `Brand: ${m.brand}` : `SKU: ${m.sku}`}
                            </p>
                          </div>

                          {/* Stock bar */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                {!selectedBranch ? 'Total Stock' : `${selectedBranch} Stock`}
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                {getStockForBranch(m).toLocaleString()} {m.unit_of_measure}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${getStockBarColor(m)}`}
                                style={{ width: `${stockPct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">Reorder: {m.reorder_point.toLocaleString()}</span>
                              <span className={`text-xs font-medium ${m.total_stock <= m.reorder_point ? 'text-orange-600' : 'text-gray-500'}`}>
                                {stockPct.toFixed(0)}% of capacity
                              </span>
                            </div>
                          </div>

                          {/* Usage */}
                          <div className="pt-3 border-t space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Monthly Usage:</span>
                              <span className="font-medium text-gray-900">{m.monthly_consumption.toLocaleString()} {m.unit_of_measure}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Days of Cover:</span>
                              <span className={`font-bold ${daysOfCover < 7 ? 'text-red-600' : daysOfCover < 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {daysOfCover === Infinity ? '∞' : `${daysOfCover.toFixed(1)} days`}
                              </span>
                            </div>
                          </div>

                          {/* Warnings */}
                          {statusLabel === 'Critical' && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-red-700"><span className="font-semibold">Critical Stock!</span> Immediate reorder required.</p>
                            </div>
                          )}
                          {statusLabel === 'Low Stock' && (
                            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-yellow-700"><span className="font-semibold">Low Stock.</span> Consider reordering soon.</p>
                            </div>
                          )}

                          {/* Price & Actions */}
                          <div className="pt-4 border-t space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs text-gray-500">Cost per Unit</div>
                                <div className="text-xl font-bold text-gray-900">₱{m.cost_per_unit.toLocaleString()}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Total Value</div>
                                <div className="text-lg font-semibold text-gray-900">₱{((m.total_stock * m.cost_per_unit) / 1000).toFixed(0)}K</div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleOpenAdjustment(m, e)}
                              className="w-full flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                              Adjust Stock
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Material Modal */}
      {editingMaterial && (
        <AddMaterialModal
          isOpen={!!editingMaterial}
          onClose={handleCloseModal}
          onSave={handleSaveMaterial}
          onDelete={isEditMode ? handleDeleteMaterial : undefined}
          categoryName={categoryTitle}
          initialData={editingMaterial}
          isEditMode={isEditMode}
        />
      )}

      {/* Stock Adjustment Modal */}
      {showStockAdjustmentModal && selectedItemForAdjustment && (
        <StockAdjustmentModal
          isOpen={showStockAdjustmentModal}
          onClose={() => { setShowStockAdjustmentModal(false); setSelectedItemForAdjustment(null); }}
          item={selectedItemForAdjustment}
          onAdjust={handleStockAdjustment}
          itemType="raw-material"
        />
      )}
    </div>
  );
}