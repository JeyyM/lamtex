import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { scopedProductIdList, warehouseScopeEmptyMessage } from '@/src/lib/warehouseScope';
import { effectiveInventoryBranch } from '@/src/lib/inventoryAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { StatKpiCard } from '@/src/components/ui/StatKpiCard';
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
import { isCategoryCatalogHidden, CATALOG_HIDDEN_CLASS } from '@/src/lib/productCatalogVisibility';
import { computeStockStatus } from '@/src/lib/stockStatus';

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
  category_code: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

interface ProductStatVariantStock {
  branch_id: string | null;
  quantity: number | null;
  branches?: { name?: string | null } | { name?: string | null }[] | null;
}

interface ProductStatVariant {
  id: string;
  is_hidden: boolean | null;
  total_stock: number | null;
  reorder_point: number | null;
  product_variant_stock?: ProductStatVariantStock[] | null;
}

interface ProductStatRow {
  id: string;
  category_id: string | null;
  status: string;
  total_variants: number;
  total_revenue: number;
  /** Derived client-side from the worst visible variant (branch-scoped when applicable). */
  derived_status?: string;
  product_variants?: ProductStatVariant[] | ProductStatVariant | null;
}

interface SummaryStats {
  totalProducts: number;
  totalVariants: number;
  lowStockCount: number;
  totalRevenue: number;
}

interface CategoryExportRow {
  category_code: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  product_family_count: number;
}

interface ProductVariantExportRow {
  category_code: string | null;
  category_name: string | null;
  product_name: string;
  sku: string;
  variant_name: string;
  unit_price: number;
  status: string;
  total_stock: number;
}

function embedOne<T extends Record<string, unknown>>(v: unknown): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? null;
  if (typeof v === 'object') return v as T;
  return null;
}

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

async function fetchProductCatalogForExport(branchName: string): Promise<{
  categories: CategoryExportRow[];
  variants: ProductVariantExportRow[];
}> {
  let catQ = supabase
    .from('product_categories')
    .select('id, category_code, name, description, sort_order, is_active')
    .order('sort_order', { ascending: true });
  if (branchName) catQ = catQ.eq('branch', branchName);

  let prodQ = supabase
    .from('products')
    .select(
      'name, category_id, product_categories(category_code, name), product_variants(sku, size, unit_price, status, total_stock)',
    )
    .order('name', { ascending: true });
  if (branchName) prodQ = prodQ.eq('branch', branchName);

  const [{ data: catData, error: catErr }, { data: prodData, error: prodErr }] = await Promise.all([
    catQ,
    prodQ,
  ]);
  if (catErr) throw new Error(catErr.message);
  if (prodErr) throw new Error(prodErr.message);

  const familyCountByCategory = new Map<string, number>();
  for (const row of prodData ?? []) {
    const categoryId = row.category_id as string | null;
    if (!categoryId) continue;
    familyCountByCategory.set(categoryId, (familyCountByCategory.get(categoryId) ?? 0) + 1);
  }

  const categories: CategoryExportRow[] = (catData ?? []).map((c) => ({
    category_code: c.category_code ? String(c.category_code) : null,
    name: String(c.name ?? ''),
    description: c.description ? String(c.description) : null,
    sort_order: Number(c.sort_order ?? 0),
    product_family_count: familyCountByCategory.get(String(c.id)) ?? 0,
  }));

  const variants: ProductVariantExportRow[] = [];
  for (const row of prodData ?? []) {
    const cat = embedOne<{ category_code?: string | null; name?: string | null }>(row.product_categories);
    const category_code = cat?.category_code ? String(cat.category_code) : null;
    const category_name = cat?.name ? String(cat.name) : null;
    const product_name = String(row.name ?? '');
    const variantRows = row.product_variants;
    const list = Array.isArray(variantRows) ? variantRows : variantRows ? [variantRows] : [];
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
    const byCat = (a.category_code ?? '').localeCompare(b.category_code ?? '');
    if (byCat !== 0) return byCat;
    const byProduct = a.product_name.localeCompare(b.product_name);
    if (byProduct !== 0) return byProduct;
    return a.sku.localeCompare(b.sku);
  });

  return { categories, variants };
}

async function downloadProductsWorkbook(
  categories: CategoryExportRow[],
  variants: ProductVariantExportRow[],
  branchLabel: string,
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const categoryHeaders = ['Category Code', 'Category Name', 'Description', 'Product Families'];
  const categoryAoA: unknown[][] = [
    categoryHeaders,
    ...categories.map((c) => [
      c.category_code ?? '',
      c.name,
      c.description ?? '',
      c.product_family_count,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(categoryAoA), 'Categories');

  const productHeaders = [
    'Category Code',
    'Category Name',
    'Product Name',
    'SKU',
    'Variant Name',
    'Unit Price',
    'Status',
    'Total Stock',
  ];
  const productAoA: unknown[][] = [
    productHeaders,
    ...variants.map((v) => [
      v.category_code ?? '',
      v.category_name ?? '',
      v.product_name,
      v.sku,
      v.variant_name,
      xlsxOptionalNumber(v.unit_price),
      v.status,
      v.total_stock,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(productAoA), 'Products');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeBranch = branchLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  a.download = `products-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProductsPage() {
  const navigate = useNavigate();
  const { branch, role, addAuditLog, warehouseScope, warehouseScopeLoading } = useAppContext();
  const inventoryBranch = effectiveInventoryBranch(role, branch);
  const scopedProductIds = scopedProductIdList(warehouseScope);

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
  const [exportingProducts, setExportingProducts]       = useState(false);

  // â”€â”€ Fetch categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    let q = supabase
      .from('product_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (inventoryBranch) q = q.eq('branch', inventoryBranch);
    const { data, error } = await q;
    if (!error) setCategories(data ?? []);
    setCategoriesLoading(false);
  };

  // â”€â”€ Fetch product stats (branch-aware) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchProductStats = async (currentBranch: string | null) => {
    setSummaryLoading(true);
    if (scopedProductIds && scopedProductIds.length === 1 && scopedProductIds[0] === '00000000-0000-0000-0000-000000000000') {
      setProductStats([]);
      setSummaryStats({ totalProducts: 0, totalVariants: 0, lowStockCount: 0, totalRevenue: 0 });
      setSummaryLoading(false);
      return;
    }
    let q = supabase
      .from('products')
      .select(
        `id, category_id, status, total_variants, total_revenue,
         product_variants(id, is_hidden, total_stock, reorder_point,
           product_variant_stock(branch_id, quantity, branches(name)))`,
      );
    if (currentBranch) q = q.eq('branch', currentBranch);
    if (scopedProductIds) q = q.in('id', scopedProductIds);
    const { data } = await q;
    if (data) {
      // Derive each family's worst variant status so a single low-stock variant
      // surfaces in the low/critical/out-of-stock counts even if the persisted
      // product.status (rolled up best-case) still says Active.
      const wantBranch = currentBranch?.trim().toLowerCase() ?? null;
      const rows = (data as ProductStatRow[]).map((p) => {
        const variantEmbed = p.product_variants;
        const variants: ProductStatVariant[] = Array.isArray(variantEmbed)
          ? variantEmbed
          : variantEmbed
          ? [variantEmbed]
          : [];
        const visibleVariants = variants.filter((v) => v?.is_hidden !== true);
        let worst = 'Active';
        for (const v of visibleVariants) {
          const reorder = Number(v.reorder_point) || 0;
          let stock = Number(v.total_stock) || 0;
          if (wantBranch) {
            const stockRows = Array.isArray(v.product_variant_stock) ? v.product_variant_stock : [];
            let branchQty: number | null = null;
            for (const row of stockRows) {
              const rel = row?.branches;
              const branchObj = Array.isArray(rel) ? rel[0] : rel;
              const name = branchObj?.name ? String(branchObj.name).trim().toLowerCase() : null;
              if (name === wantBranch) {
                branchQty = Number(row.quantity) || 0;
                break;
              }
            }
            stock = branchQty ?? 0;
          }
          const computed = computeStockStatus(stock, reorder);
          const rank = computed === 'Out of Stock' ? 3
            : computed === 'Critical' ? 2
            : computed === 'Low Stock' ? 1
            : 0;
          const worstRank = worst === 'Out of Stock' ? 3
            : worst === 'Critical' ? 2
            : worst === 'Low Stock' ? 1
            : 0;
          if (rank > worstRank) worst = computed;
        }
        return { ...p, derived_status: worst } as ProductStatRow;
      });

      setProductStats(rows);
      setSummaryStats({
        totalProducts: rows.length,
        totalVariants: rows.reduce((s, p) => s + (p.total_variants ?? 0), 0),
        lowStockCount: rows.filter((p) =>
          ['Low Stock', 'Critical', 'Out of Stock'].includes(p.derived_status ?? p.status),
        ).length,
        totalRevenue: rows.reduce((s, p) => s + (Number(p.total_revenue) || 0), 0),
      });
    }
    setSummaryLoading(false);
  };

  useEffect(() => { fetchCategories(); }, [inventoryBranch]);
  useEffect(() => { fetchProductStats(inventoryBranch); }, [inventoryBranch, scopedProductIds?.join('|') ?? '']);

  const scopedCategoryIds = useMemo(() => {
    if (!scopedProductIds) return null;
    return new Set(productStats.map(p => p.category_id).filter(Boolean) as string[]);
  }, [productStats, scopedProductIds]);

  const getCategoryImage = (cat: CategoryRow) =>
    cat.image_url ?? categoryImageMap[cat.slug] ?? hdpePipeImg;

  const getStatsForCategory = (catId: string) => {
    const rows = productStats.filter(p => p.category_id === catId);
    return {
      count:    rows.length,
      lowStock: rows.filter(p =>
        ['Low Stock', 'Critical', 'Out of Stock'].includes(p.derived_status ?? p.status),
      ).length,
    };
  };

  const filteredCategories = categories.filter(cat => {
    if (scopedCategoryIds && !scopedCategoryIds.has(cat.id)) return false;
    return cat.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // â”€â”€ Category CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleEditCategory = (cat: CategoryRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory({
      name: cat.name,
      description: cat.description ?? '',
      imageUrl: cat.image_url ?? '',
      icon: 'category',
      isVisible: cat.is_active,
    });
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
          is_active: formData.isVisible,
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
            Browse products by category{inventoryBranch ? ` · ${inventoryBranch}` : ' · All branches'}
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
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={exportingProducts || categoriesLoading || (role !== 'Executive' && !branch)}
            onClick={async () => {
              if (exportingProducts || categoriesLoading || (role !== 'Executive' && !branch)) return;
              setExportingProducts(true);
              try {
                const exportBranch = inventoryBranch ?? '';
                const { categories: exportCategories, variants } = await fetchProductCatalogForExport(exportBranch);
                await downloadProductsWorkbook(
                  exportCategories,
                  variants,
                  exportBranch || 'All branches',
                );
                addAuditLog(
                  'Exported products workbook',
                  'Product',
                  `${exportCategories.length} categories, ${variants.length} variants (${exportBranch || 'All branches'})`,
                );
              } catch (e) {
                window.alert(e instanceof Error ? e.message : 'Export failed.');
              } finally {
                setExportingProducts(false);
              }
            }}
          >
            {exportingProducts ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {exportingProducts ? 'Exporting…' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatKpiCard
          label="Product Families"
          value={summaryLoading ? '…' : String(summaryStats.totalProducts)}
          tone="blue"
          icon={<Package />}
          loading={summaryLoading}
          sub={
            !summaryLoading && summaryStats.lowStockCount > 0
              ? `${summaryStats.lowStockCount} low / critical stock`
              : undefined
          }
        />
        <StatKpiCard
          label="Total Variants"
          value={summaryLoading ? '…' : String(summaryStats.totalVariants)}
          tone="emerald"
          icon={<Box />}
          loading={summaryLoading}
        />
        <StatKpiCard
          label="Low / Out of Stock"
          value={summaryLoading ? '…' : String(summaryStats.lowStockCount)}
          tone="amber"
          icon={<AlertTriangle />}
          loading={summaryLoading}
        />
        <StatKpiCard
          label="Revenue YTD"
          value={summaryLoading ? '…' : `₱${(summaryStats.totalRevenue / 1_000_000).toFixed(1)}M`}
          tone="violet"
          icon={<DollarSign />}
          loading={summaryLoading}
        />
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
          {categoriesLoading || warehouseScopeLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{warehouseScopeLoading ? 'Loading your catalog access…' : 'Loading categories...'}</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3" />
              <p>{scopedProductIds ? warehouseScopeEmptyMessage('products') : 'No categories found'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCategories.map((cat) => {
                const stats = getStatsForCategory(cat.id);
                const hidden = isCategoryCatalogHidden(cat.is_active);
                return (
                  <div
                    key={cat.id}
                    className={`group relative overflow-hidden border-2 rounded-lg hover:shadow-lg transition-all duration-200 ${
                      hidden
                        ? `border-gray-300 ${CATALOG_HIDDEN_CLASS}`
                        : 'border-gray-200 hover:border-red-500'
                    }`}
                  >
                    <button
                      onClick={(e) => handleEditCategory(cat, e)}
                      className="absolute top-2 right-2 z-10 p-2.5 bg-white hover:bg-red-600 text-gray-700 hover:text-white rounded-lg shadow-lg border border-gray-300 group-hover:border-red-600 transition-all duration-200 hover:scale-110"
                      title="Edit category"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/products/category/${cat.slug}`}
                      className="w-full text-left block"
                    >
                      <div className="aspect-video w-full min-h-[120px] overflow-hidden bg-gray-100">
                        <img
                          src={getCategoryImage(cat)}
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`font-semibold transition-colors ${hidden ? 'text-gray-600' : 'text-gray-900 group-hover:text-red-600'}`}>
                            {cat.name}
                          </h3>
                          {hidden ? (
                            <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded flex-shrink-0">
                              Hidden
                            </span>
                          ) : null}
                        </div>
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
                    </Link>
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
