import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAppContext } from '../store/AppContext';
import AddProductModal, { ProductFormData } from '../components/products/AddProductModal';
import {
  Package, ArrowLeft, AlertTriangle, TrendingUp,
  Search, Filter, DollarSign, Plus, Edit, Loader2, Download,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { insertProductLog, mapAppRoleToLogRole } from '../lib/domainActivityLog';
import { isCategoryCatalogHidden, isProductFamilyCatalogHidden, CATALOG_HIDDEN_CLASS } from '../lib/productCatalogVisibility';
import { scopedProductIdList } from '../lib/warehouseScope';

// Local image fallbacks
import hdpePipeImg    from '../assets/product-images/HDPE Pipe.webp';
import elbowPipeImg   from '../assets/product-images/Elbow Pipe.webp';
import sanitaryPipeImg from '../assets/product-images/Sanitary Pipe.webp';
import pipesImg       from '../assets/product-images/Pipes.webp';
import inHouseImg     from '../assets/product-images/In House Pipe.webp';
import pressureImg    from '../assets/product-images/Pressure Line Pipe.webp';

const fallbackImages = [hdpePipeImg, elbowPipeImg, sanitaryPipeImg, pipesImg, inHouseImg, pressureImg];

interface ProductRow {
  id: string;
  name: string;
  category_id: string;
  description: string | null;
  image_url: string | null;
  status: string;
  total_variants: number;
  total_stock: number;
  avg_price: number;
  total_revenue: number;
  total_units_sold: number;
  branch: string | null;
  product_variants: { is_hidden: boolean }[] | { is_hidden: boolean } | null;
}

interface ProductFamilyExportRow {
  category_code: string | null;
  category_name: string;
  product_name: string;
  description: string | null;
  variant_count: number;
  status: string;
}

interface ProductVariantExportRow {
  category_code: string | null;
  category_name: string;
  product_name: string;
  sku: string;
  variant_name: string;
  unit_price: number;
  status: string;
  total_stock: number;
}

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

async function fetchCategoryCatalogForExport(
  categoryId: string,
  branchName: string,
): Promise<{
  category_code: string | null;
  category_name: string;
  category_description: string | null;
  families: ProductFamilyExportRow[];
  variants: ProductVariantExportRow[];
}> {
  const { data: cat, error: catErr } = await supabase
    .from('product_categories')
    .select('category_code, name, description')
    .eq('id', categoryId)
    .single();
  if (catErr) throw new Error(catErr.message);
  if (!cat) throw new Error('Category not found');

  const category_code = cat.category_code ? String(cat.category_code) : null;
  const category_name = String(cat.name ?? '');
  const category_description = cat.description ? String(cat.description) : null;

  let prodQ = supabase
    .from('products')
    .select(
      'name, description, status, total_variants, product_variants(sku, size, unit_price, status, total_stock)',
    )
    .eq('category_id', categoryId)
    .order('name', { ascending: true });
  if (branchName) prodQ = prodQ.eq('branch', branchName);

  const { data: prodData, error: prodErr } = await prodQ;
  if (prodErr) throw new Error(prodErr.message);

  const families: ProductFamilyExportRow[] = [];
  const variants: ProductVariantExportRow[] = [];

  for (const row of prodData ?? []) {
    const product_name = String(row.name ?? '');
    const variantRows = row.product_variants;
    const list = Array.isArray(variantRows) ? variantRows : variantRows ? [variantRows] : [];
    families.push({
      category_code,
      category_name,
      product_name,
      description: row.description ? String(row.description) : null,
      variant_count: Number(row.total_variants ?? list.length),
      status: String(row.status ?? ''),
    });
    for (const v of list) {
      const variant = v as Record<string, unknown>;
      variants.push({
        category_code,
        category_name,
        product_name,
        sku: String(variant.sku ?? ''),
        variant_name: String(variant.size ?? ''),
        unit_price: Number(variant.unit_price ?? 0),
        status: String(variant.status ?? ''),
        total_stock: Number(variant.total_stock ?? 0),
      });
    }
  }

  variants.sort((a, b) => {
    const byProduct = a.product_name.localeCompare(b.product_name);
    if (byProduct !== 0) return byProduct;
    return a.sku.localeCompare(b.sku);
  });

  return { category_code, category_name, category_description, families, variants };
}

async function downloadCategoryWorkbook(
  categoryCode: string | null,
  categoryName: string,
  categoryDescription: string | null,
  families: ProductFamilyExportRow[],
  variants: ProductVariantExportRow[],
  slugLabel: string,
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const categoryHeaders = ['Category Code', 'Category Name', 'Description', 'Product Families'];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      categoryHeaders,
      [categoryCode ?? '', categoryName, categoryDescription ?? '', families.length],
    ]),
    'Category',
  );

  const familyHeaders = [
    'Category Code',
    'Category Name',
    'Product Name',
    'Description',
    'Variants',
    'Status',
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      familyHeaders,
      ...families.map((f) => [
        f.category_code ?? '',
        f.category_name,
        f.product_name,
        f.description ?? '',
        f.variant_count,
        f.status === 'Active' ? 'In Stock' : f.status,
      ]),
    ]),
    'Product Families',
  );

  const variantHeaders = [
    'Category Code',
    'Category Name',
    'Product Name',
    'SKU',
    'Variant Name',
    'Unit Price',
    'Status',
    'Total Stock',
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      variantHeaders,
      ...variants.map((v) => [
        v.category_code ?? '',
        v.category_name,
        v.product_name,
        v.sku,
        v.variant_name,
        xlsxOptionalNumber(v.unit_price),
        v.status,
        v.total_stock,
      ]),
    ]),
    'Products',
  );

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeSlug = slugLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  a.download = `category-${safeSlug || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProductCategoryPage() {
  const navigate = useNavigate();
  const { categoryName } = useParams<{ categoryName: string }>();
  const { branch, setHideBranchSelector, employeeName, role, session, addAuditLog, warehouseScope } = useAppContext();
  const scopedProductIds = scopedProductIdList(warehouseScope);

  // Hide branch selector while on this page
  useEffect(() => {
    setHideBranchSelector(true);
    return () => setHideBranchSelector(false);
  }, []);

  const [categoryId, setCategoryId]     = useState<string | null>(null);
  const [categoryActive, setCategoryActive] = useState(true);
  const [categoryTitle, setCategoryTitle] = useState(
    categoryName
      ? categoryName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Category'
  );
  const [products, setProducts]         = useState<ProductRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [sortBy, setSortBy]             = useState<'name' | 'stock' | 'revenue'>('name');

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct]           = useState<ProductFormData | null>(null);
  const [editingProductId, setEditingProductId]       = useState<string | null>(null);
  const [isEditMode, setIsEditMode]                   = useState(false);
  const [exportingCategory, setExportingCategory]     = useState(false);

  // â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchData = async () => {
    setLoading(true);
    const { data: catData } = await supabase
      .from('product_categories')
      .select('id, name, is_active')
      .eq('slug', categoryName)
      .single();

    if (catData) {
      setCategoryId(catData.id);
      setCategoryTitle(catData.name);
      setCategoryActive(catData.is_active !== false);

      let q = supabase
        .from('products')
        .select('id, name, category_id, description, image_url, status, total_variants, total_stock, avg_price, total_revenue, total_units_sold, branch, product_variants(is_hidden)')
        .eq('category_id', catData.id);
      if (branch) q = q.eq('branch', branch);
      if (scopedProductIds) q = q.in('id', scopedProductIds);
      const { data: prodData } = await q;
      setProducts((prodData ?? []) as ProductRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [categoryName, branch, scopedProductIds?.join('|') ?? '']);

  // â”€â”€ Product CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleEditProduct = (p: ProductRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct({
      name: p.name,
      familyCode: '',
      description: p.description ?? '',
      imageUrl: p.image_url ?? '',
      category: categoryTitle,
    });
    setEditingProductId(p.id);
    setIsEditMode(true);
    setShowAddProductModal(true);
  };

  const handleCloseModal = () => {
    setShowAddProductModal(false);
    setIsEditMode(false);
    setEditingProduct(null);
    setEditingProductId(null);
  };

  const handleSaveProduct = async (formData: ProductFormData) => {
    if (!categoryId) return;
    const actorName = employeeName || session?.user?.email || 'User';
    const actorRole = mapAppRoleToLogRole(role);
    setSaving(true);
    try {
      if (isEditMode && editingProductId) {
        const oldRow = products.find(p => p.id === editingProductId);
        const { error } = await supabase.from('products').update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          image_url: formData.imageUrl || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editingProductId);
        if (error) throw error;
        await insertProductLog(supabase, {
          productId: editingProductId,
          action: 'product_updated',
          description: `Product "${formData.name.trim()}" updated (category listing).`,
          performedBy: actorName,
          performedByRole: actorRole,
          oldValue: {
            name: oldRow?.name,
            description: oldRow?.description ?? null,
            image_url: oldRow?.image_url ?? null,
          },
          newValue: {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            image_url: formData.imageUrl || null,
          },
        });
      } else {
        const { data: newProduct, error } = await supabase.from('products').insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          image_url: formData.imageUrl || null,
          category_id: categoryId,
          branch: branch || null,
          status: 'Active',
          total_variants: 1,
        }).select('id').single();
        if (error) throw error;
        // Auto-create a default variant so the product page is usable immediately
        if (newProduct?.id) {
          const baseName = formData.name.trim().replace(/\s+/g, '-').toUpperCase().slice(0, 10);
          await supabase.from('product_variants').insert({
            product_id: newProduct.id,
            sku: `${baseName}-DEFAULT`,
            size: 'Default',
            unit_price: 0,
            cost_price: 0,
            total_stock: 0,
            reorder_point: 0,
            status: 'Active',
            units_sold_ytd: 0,
            revenue_ytd: 0,
          });
          await insertProductLog(supabase, {
            productId: newProduct.id,
            action: 'product_created',
            description: `Product "${formData.name.trim()}" created with default variant in ${categoryTitle}.`,
            performedBy: actorName,
            performedByRole: actorRole,
            newValue: {
              name: formData.name.trim(),
              category_id: categoryId,
              branch: branch || null,
            },
          });
        }
      }
      await fetchData();
      handleCloseModal();
    } catch (err: any) {
      alert(`Failed to save: ${err.message ?? 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!editingProductId) return;
    if (!window.confirm(`Delete "${editingProduct?.name}"?\n\nAll variants will also be deleted. Cannot be undone.`)) return;
    setSaving(true);
    try {
      const actorName = employeeName || session?.user?.email || 'User';
      const actorRole = mapAppRoleToLogRole(role);
      const delName = editingProduct?.name ?? '';
      await insertProductLog(supabase, {
        productId: editingProductId,
        action: 'product_deleted',
        description: `Product "${delName}" deleted from catalog.`,
        performedBy: actorName,
        performedByRole: actorRole,
        oldValue: { name: delName },
        newValue: null,
      });
      const { error } = await supabase.from('products').delete().eq('id', editingProductId);
      if (error) throw error;
      await fetchData();
      handleCloseModal();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message ?? 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filteredProducts = products
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name')    return a.name.localeCompare(b.name);
      if (sortBy === 'stock')   return b.total_stock - a.total_stock;
      if (sortBy === 'revenue') return b.total_revenue - a.total_revenue;
      return 0;
    });

  const totalRevenue  = filteredProducts.reduce((s, p) => s + (Number(p.total_revenue) || 0), 0);
  const lowStockCount = filteredProducts.filter(p => ['Low Stock', 'Critical', 'Out of Stock'].includes(p.status)).length;
  const categoryHidden = isCategoryCatalogHidden(categoryActive);

  function variantRowsFromProduct(p: ProductRow): { is_hidden?: boolean | null }[] {
    const embed = p.product_variants;
    if (Array.isArray(embed)) return embed;
    if (embed && typeof embed === 'object') return [embed];
    return [];
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Button variant="ghost" onClick={() => navigate('/products')} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{categoryTitle}</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">
              {loading ? '...' : `${filteredProducts.length} product families`}
              {' · '}₱{(totalRevenue / 1_000_000).toFixed(2)}M revenue
              {branch ? ` · ${branch}` : ''}
              {categoryHidden ? ' · Hidden category' : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto flex-shrink-0">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={exportingCategory || loading || !categoryId}
            onClick={async () => {
              if (exportingCategory || loading || !categoryId) return;
              setExportingCategory(true);
              try {
                const exported = await fetchCategoryCatalogForExport(categoryId, branch ?? '');
                await downloadCategoryWorkbook(
                  exported.category_code,
                  exported.category_name,
                  exported.category_description,
                  exported.families,
                  exported.variants,
                  categoryName ?? categoryTitle,
                );
                addAuditLog(
                  'Exported category workbook',
                  'Product',
                  `${exported.families.length} families, ${exported.variants.length} variants (${categoryTitle})`,
                );
              } catch (e) {
                window.alert(e instanceof Error ? e.message : 'Export failed.');
              } finally {
                setExportingCategory(false);
              }
            }}
          >
            {exportingCategory ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {exportingCategory ? 'Exporting…' : 'Export'}
          </Button>
          <Button
            variant="primary"
            onClick={() => { setEditingProduct(null); setIsEditMode(false); setShowAddProductModal(true); }}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Product Family</span>
            <span className="sm:hidden">Add Family</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Product Families</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : filteredProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg"><AlertTriangle className="w-6 h-6 text-orange-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg"><DollarSign className="w-6 h-6 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Category Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : `₱${(totalRevenue / 1_000_000).toFixed(2)}M`}
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 appearance-none bg-white"
              >
                <option value="name">Sort by Name</option>
                <option value="stock">Sort by Stock</option>
                <option value="revenue">Sort by Revenue</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading products...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Package className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No product families found</h3>
              <p className="text-sm text-gray-500">
                {branch
                  ? `No products for ${branch} branch in this category.`
                  : 'No products in this category yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p, idx) => {
            const familyHidden = isProductFamilyCatalogHidden(variantRowsFromProduct(p), categoryActive);
            return (
            <div key={p.id} className={`group relative ${familyHidden ? CATALOG_HIDDEN_CLASS : ''}`}>
              <button
                onClick={(e) => handleEditProduct(p, e)}
                className="absolute top-2 right-2 z-10 p-2.5 bg-white hover:bg-red-600 text-gray-700 hover:text-white rounded-lg shadow-lg border border-gray-300 group-hover:border-red-600 transition-all duration-200 hover:scale-110"
                title="Edit product family"
              >
                <Edit className="w-4 h-4" />
              </button>

              <Card className="hover:shadow-xl transition-all duration-200 border-2 hover:border-red-500 h-full">
                <Link to={`/products/category/${categoryName}/family/${p.id}`} className="block h-full">
                <CardContent className="p-0">
                  <div className="h-48 bg-gray-100 overflow-hidden border-b">
                    <img
                      src={p.image_url ?? fallbackImages[idx % fallbackImages.length]}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className={`font-semibold text-lg transition-colors ${familyHidden ? 'text-gray-600' : 'text-gray-900 group-hover:text-red-600'}`}>
                          {p.name}
                        </h3>
                        {familyHidden ? (
                          <Badge variant="secondary" size="sm" className="whitespace-nowrap text-center flex-shrink-0">
                            Hidden
                          </Badge>
                        ) : (
                        <Badge
                          variant={p.status === 'Critical' ? 'destructive' : p.status === 'Low Stock' ? 'warning' : p.status === 'Out of Stock' ? 'destructive' : 'success'}
                          size="sm"
                          className="whitespace-nowrap text-center flex-shrink-0"
                        >
                          {p.status === 'Active' ? 'In Stock' : p.status === 'Critical' ? 'Critical Stock' : p.status}
                        </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{p.description ?? 'No description'}</p>
                    </div>
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Variants:</span>
                        <span className="font-bold text-gray-900">{p.total_variants}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total Stock:</span>
                        <span className={`font-bold ${p.total_stock < 200 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {(p.total_stock ?? 0).toLocaleString()} units
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Avg. Price:</span>
                        <span className="font-semibold text-gray-900">₱{(Number(p.avg_price) || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Units Sold YTD:</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-900">{(p.total_units_sold ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Revenue YTD:</span>
                        <span className="font-bold text-green-600">
                          ₱{((Number(p.total_revenue) || 0) / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                    {['Low Stock', 'Critical', 'Out of Stock'].includes(p.status) && (
                      <div className={`flex items-start gap-2 p-3 rounded-lg border ${p.status === 'Critical' || p.status === 'Out of Stock' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                        <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${p.status === 'Critical' || p.status === 'Out of Stock' ? 'text-red-600' : 'text-orange-600'}`} />
                        <div className={`text-xs ${p.status === 'Critical' || p.status === 'Out of Stock' ? 'text-red-700' : 'text-orange-700'}`}>
                          <span className="font-semibold">{p.status === 'Critical' ? 'Critical Stock' : p.status}!</span> Consider reviewing production schedule.
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                </Link>
              </Card>
            </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showAddProductModal && (
        <AddProductModal
          isOpen={showAddProductModal}
          onClose={handleCloseModal}
          onSave={handleSaveProduct}
          onDelete={isEditMode ? handleDeleteProduct : undefined}
          categoryName={categoryTitle}
          initialData={editingProduct || undefined}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
}
