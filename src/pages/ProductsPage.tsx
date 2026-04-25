import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  Search,
  Plus,
  DollarSign,
  Box,
  AlertTriangle,
  Download,
  Edit,
  Loader2,
  Factory,
} from 'lucide-react';
import AddCategoryModal, { CategoryFormData } from '@/src/components/products/AddCategoryModal';
import { supabase } from '@/src/lib/supabase';

// Local fallback images per category slug
import hdpePipeImg     from '@/src/assets/product-images/HDPE Pipe.webp';
import elbowPipeImg    from '@/src/assets/product-images/Elbow Pipe.webp';
import sanitaryPipeImg from '@/src/assets/product-images/Sanitary Pipe.webp';
import electricImg     from '@/src/assets/product-images/Electric Conduit Pipe.webp';
import inHouseImg      from '@/src/assets/product-images/In House Pipe.webp';
import pressureImg     from '@/src/assets/product-images/Pressure Line Pipe.webp';
import pipesImg        from '@/src/assets/product-images/Pipes.webp';
import teePipeImg      from '@/src/assets/product-images/Tee Pipe.webp';
import gardenHoseImg   from '@/src/assets/product-images/Garden Hose.webp';
import couplingImg     from '@/src/assets/product-images/Coupling.webp';
import pvcCementImg    from '@/src/assets/product-images/PVC Cement.webp';


const categoryImageMap: Record<string, string> = {
  // old slugs
  'hdpe-pipes':         hdpePipeImg,
  'hdpe-fittings':      elbowPipeImg,
  'upvc-sanitary':      sanitaryPipeImg,
  'upvc-electrical':    electricImg,
  'upvc-potable-water': inHouseImg,
  'upvc-pressurized':   pressureImg,
  'ppr-pipes':          pipesImg,
  'ppr-fittings':       teePipeImg,
  'telecom-pipes':      gardenHoseImg,
  'garden-hoses':       gardenHoseImg,
  'flexible-hoses':     couplingImg,
  'others':             pvcCementImg,
  // Manila slugs
  'm-hdpe-pipes':       hdpePipeImg,
  'm-hdpe-fittings':    elbowPipeImg,
  'm-upvc-sanitary':    sanitaryPipeImg,
  'm-upvc-electrical':  electricImg,
  'm-pressure-line':    pressureImg,
  'm-ppr-pipes':        pipesImg,
  // Cebu slugs
  'c-hdpe-pipes':       hdpePipeImg,
  'c-pvc-conduits':     electricImg,
  'c-sanitary-fittings': sanitaryPipeImg,
  'c-garden-hoses':     gardenHoseImg,
  // Batangas slugs
  'b-industrial-pipes': pipesImg,
  'b-hdpe-fittings':    elbowPipeImg,
  'b-chemical-pvc':     pvcCementImg,
  'b-drainage-systems': inHouseImg,
  'b-flexible-hoses':   couplingImg,
};

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

interface ProductStatRow {
  category_id: string | null;
  status: string;
  total_variants: number;
  total_revenue: number;
}

interface SummaryStats {
  totalProducts: number;
  totalVariants: number;
  lowStockCount: number;
  totalRevenue: number;
}

export function ProductsPage() {
  const navigate = useNavigate();
  const { branch } = useAppContext();

  const [searchQuery, setSearchQuery]             = useState('');
  const [categories, setCategories]               = useState<CategoryRow[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productStats, setProductStats]           = useState<ProductStatRow[]>([]);
  const [summaryStats, setSummaryStats]           = useState<SummaryStats>({
    totalProducts: 0, totalVariants: 0, lowStockCount: 0, totalRevenue: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory]           = useState<CategoryFormData | null>(null);
  const [editingCategoryId, setEditingCategoryId]       = useState<string | null>(null);
  const [isEditMode, setIsEditMode]                     = useState(false);
  const [saving, setSaving]                             = useState(false);

  // â”€â”€ Fetch categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    let q = supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (branch) q = q.eq('branch', branch);
    const { data, error } = await q;
    if (!error) setCategories(data ?? []);
    setCategoriesLoading(false);
  };

  // â”€â”€ Fetch product stats (branch-aware) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchProductStats = async (currentBranch: string) => {
    setSummaryLoading(true);
    let q = supabase
      .from('products')
      .select('category_id, status, total_variants, total_revenue');
    if (currentBranch) q = q.eq('branch', currentBranch);
    const { data } = await q;
    if (data) {
      setProductStats(data as ProductStatRow[]);
      setSummaryStats({
        totalProducts: data.length,
        totalVariants: data.reduce((s, p) => s + (p.total_variants ?? 0), 0),
        lowStockCount: data.filter(p => ['Low Stock', 'Critical', 'Out of Stock'].includes(p.status)).length,
        totalRevenue:  data.reduce((s, p) => s + (Number(p.total_revenue) || 0), 0),
      });
    }
    setSummaryLoading(false);
  };

  useEffect(() => { fetchCategories(); }, [branch]);
  useEffect(() => { fetchProductStats(branch); }, [branch]);

  const getCategoryImage = (cat: CategoryRow) =>
    cat.image_url ?? categoryImageMap[cat.slug] ?? hdpePipeImg;

  const getStatsForCategory = (catId: string) => {
    const rows = productStats.filter(p => p.category_id === catId);
    return {
      count:    rows.length,
      lowStock: rows.filter(p => ['Low Stock', 'Critical', 'Out of Stock'].includes(p.status)).length,
    };
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // â”€â”€ Category CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleEditCategory = (cat: CategoryRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory({ name: cat.name, description: cat.description ?? '', imageUrl: cat.image_url ?? '', icon: 'category' });
    setEditingCategoryId(cat.id);
    setIsEditMode(true);
    setShowAddCategoryModal(true);
  };

  const handleCloseModal = () => {
    setShowAddCategoryModal(false);
    setIsEditMode(false);
    setEditingCategory(null);
    setEditingCategoryId(null);
  };

  const handleSaveCategory = async (formData: CategoryFormData) => {
    setSaving(true);
    try {
      if (isEditMode && editingCategoryId) {
        const { error } = await supabase.from('product_categories').update({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          image_url: formData.imageUrl || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editingCategoryId);
        if (error) throw error;
      } else {
        const nameSlug = formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const branchPrefix = branch ? branch.toLowerCase().slice(0, 3) + '-' : '';
        const slug = branchPrefix + nameSlug;
        const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;
        const { error } = await supabase.from('product_categories').insert({
          name: formData.name.trim(), slug,
          description: formData.description?.trim() || null,
          image_url: formData.imageUrl || null,
          sort_order: maxOrder + 1, is_active: true,
          branch: branch || null,
        });
        if (error) throw error;
      }
      await fetchCategories();
      handleCloseModal();
    } catch (err: any) {
      alert(`Failed to save category: ${err.message ?? 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!editingCategoryId) return;
    if (!window.confirm(`Delete category "${editingCategory?.name}"?\n\nProducts will be unassigned. Cannot be undone.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('product_categories').update({ is_active: false }).eq('id', editingCategoryId);
      if (error) throw error;
      await fetchCategories();
      handleCloseModal();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message ?? 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse products by category{branch ? ` · ${branch}` : ' · All Branches'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() => navigate('/production-requests')}
          >
            <Factory className="w-4 h-4 mr-2" />
            Production requests
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Product Families</p>
                <p className="text-2xl font-bold text-gray-900">{summaryLoading ? '...' : summaryStats.totalProducts}</p>
                {!summaryLoading && summaryStats.lowStockCount > 0 && (
                  <p className="text-xs text-orange-600 font-medium mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {summaryStats.lowStockCount} low / critical stock
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg"><Box className="w-6 h-6 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Variants</p>
                <p className="text-2xl font-bold text-gray-900">{summaryLoading ? '...' : summaryStats.totalVariants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg"><AlertTriangle className="w-6 h-6 text-orange-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Low / Out of Stock</p>
                <p className="text-2xl font-bold text-gray-900">{summaryLoading ? '...' : summaryStats.lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg"><DollarSign className="w-6 h-6 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Revenue YTD</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryLoading ? '...' : `₱${(summaryStats.totalRevenue / 1_000_000).toFixed(1)}M`}
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
            <Button variant="primary" onClick={() => { setEditingCategory(null); setIsEditMode(false); setShowAddCategoryModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading categories...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3" />
              <p>No categories found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCategories.map((cat) => {
                const stats = getStatsForCategory(cat.id);
                return (
                  <div
                    key={cat.id}
                    className="group relative overflow-hidden border-2 border-gray-200 rounded-lg hover:border-red-500 hover:shadow-lg transition-all duration-200"
                  >
                    <button
                      onClick={(e) => handleEditCategory(cat, e)}
                      className="absolute top-2 right-2 z-10 p-2.5 bg-white hover:bg-red-600 text-gray-700 hover:text-white rounded-lg shadow-lg border border-gray-300 group-hover:border-red-600 transition-all duration-200 hover:scale-110"
                      title="Edit category"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/products/category/${cat.slug}`)}
                      className="w-full text-left"
                    >
                      <div className="aspect-video w-full min-h-[120px] overflow-hidden bg-gray-100">
                        <img
                          src={getCategoryImage(cat)}
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3 sm:p-4">
                        <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                          {cat.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {stats.count} {stats.count === 1 ? 'product family' : 'product families'}
                        </p>
                        {stats.lowStock > 0 && (
                          <p className="text-xs text-orange-600 font-medium mt-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {stats.lowStock} low / critical stock
                          </p>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Category Modal */}
      {showAddCategoryModal && (
        <AddCategoryModal
          isOpen={showAddCategoryModal}
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
