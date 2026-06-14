import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { StatKpiCard } from '../components/ui/StatKpiCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAppContext } from '../store/AppContext';
import AddProductModal, { ProductFormData, type ProductCategoryOption } from '../components/products/AddProductModal';
import {
  Package, ArrowLeft, AlertTriangle, TrendingUp,
  Search, Filter, DollarSign, Plus, Edit, Loader2, Download,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { insertProductLog, mapAppRoleToLogRole } from '../lib/domainActivityLog';
import { isCategoryCatalogHidden, isProductFamilyCatalogHidden, CATALOG_HIDDEN_CLASS } from '../lib/productCatalogVisibility';
import { useProductPermissions } from '../lib/permissions/productPermissions';
import { ModuleAccessDenied } from '../components/permissions/ModuleAccessDenied';
import { scopedProductIdList } from '../lib/warehouseScope';
import { effectiveInventoryBranch } from '../lib/inventoryAccess';
import { computeStockStatus } from '../lib/stockStatus';

// Local image fallbacks
import hdpePipeImg    from '../assets/product-images/HDPE Pipe.webp';
import elbowPipeImg   from '../assets/product-images/Elbow Pipe.webp';
import sanitaryPipeImg from '../assets/product-images/Sanitary Pipe.webp';
import pipesImg       from '../assets/product-images/Pipes.webp';
import inHouseImg     from '../assets/product-images/In House Pipe.webp';
import pressureImg    from '../assets/product-images/Pressure Line Pipe.webp';

const fallbackImages = [hdpePipeImg, elbowPipeImg, sanitaryPipeImg, pipesImg, inHouseImg, pressureImg];

interface VariantStockRow {
  branch_id: string | null;
  quantity: number | null;
  branches?: { name?: string | null } | { name?: string | null }[] | null;
}

interface VariantRow {
  id: string;
  is_hidden: boolean | null;
  total_stock: number | null;
  reorder_point: number | null;
  product_variant_stock?: VariantStockRow[] | null;
}

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
  product_variants: VariantRow[] | VariantRow | null;
}

// Severity ranking — higher = worse. Used to roll variants up to a family status.
const STATUS_RANK: Record<string, number> = {
  'Active': 0,
  'In Stock': 0,
  'Low Stock': 1,
  'Critical': 2,
  'Out of Stock': 3,
};

function variantsArrayFromProduct(p: ProductRow): VariantRow[] {
  const embed = p.product_variants;
  if (Array.isArray(embed)) return embed;
  if (embed && typeof embed === 'object') return [embed];
  return [];
}

/**
 * Compute the family's effective stock status from the *worst* visible variant.
 * Uses branch-scoped quantity when an inventory branch is selected, otherwise
 * the variant's aggregate `total_stock`.
 */
function deriveFamilyStockStatus(p: ProductRow, inventoryBranch: string | null): string {
  const variants = variantsArrayFromProduct(p).filter((v) => v?.is_hidden !== true);
  if (variants.length === 0) {
    return p.status ?? 'Active';
  }

  const wantBranch = inventoryBranch?.trim().toLowerCase() ?? null;
  let worst = 'Active';
  for (const v of variants) {
    const reorder = Number(v.reorder_point) || 0;

    let stock = Number(v.total_stock) || 0;
    if (wantBranch) {
      const rows = Array.isArray(v.product_variant_stock) ? v.product_variant_stock : [];
      let branchQty: number | null = null;
      for (const row of rows) {
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
    if ((STATUS_RANK[computed] ?? 0) > (STATUS_RANK[worst] ?? 0)) {
      worst = computed;
    }
  }
  return worst;
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
  const perms = useProductPermissions();
  const inventoryBranch = effectiveInventoryBranch(role, branch);
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
  const [categoryOptions, setCategoryOptions]         = useState<ProductCategoryOption[]>([]);

  // â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchData = async () => {
    setLoading(true);
    const { data: catData } = await supabase
      .from('product_categories')
      .select('id, name, is_active, branch, slug')
      .eq('slug', categoryName)
      .single();

    if (catData) {
      setCategoryId(catData.id);
      setCategoryTitle(catData.name);
      setCategoryActive(catData.is_active !== false);

      const branchFilter = catData.branch ?? inventoryBranch ?? null;
      let catQ = supabase
        .from('product_categories')
        .select('id, name, slug')
        .order('sort_order', { ascending: true });
      if (branchFilter) catQ = catQ.eq('branch', branchFilter);
      const { data: allCats } = await catQ;
      setCategoryOptions(allCats ?? []);

      let q = supabase
        .from('products')
        .select(
          `id, name, category_id, description, image_url, status, total_variants,
           total_stock, avg_price, total_revenue, total_units_sold, branch,
           product_variants(id, is_hidden, total_stock, reorder_point,
             product_variant_stock(branch_id, quantity, branches(name)))`,
        )
        .eq('category_id', catData.id);
      if (inventoryBranch) q = q.eq('branch', inventoryBranch);
      if (scopedProductIds) q = q.in('id', scopedProductIds);
      const { data: prodData } = await q;
      setProducts((prodData ?? []) as ProductRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [categoryName, inventoryBranch, scopedProductIds?.join('|') ?? '']);

  // â”€â”€ Product CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleEditProduct = (p: ProductRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct({
      name: p.name,
      familyCode: '',
      description: p.description ?? '',
      imageUrl: p.image_url ?? '',
      category: categoryTitle,
      categoryId: p.category_id,
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
        const nextCategoryId = formData.categoryId?.trim() || oldRow?.category_id || categoryId;
        const { error } = await supabase.from('products').update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          image_url: formData.imageUrl || null,
          category_id: nextCategoryId,
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
            category_id: oldRow?.category_id ?? null,
          },
          newValue: {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            image_url: formData.imageUrl || null,
            category_id: nextCategoryId ?? null,
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
  // Roll up to the worst variant per family so a single low-stock variant counts the whole family.
  const familyDerivedStatus = new Map<string, string>();
  for (const p of filteredProducts) {
    familyDerivedStatus.set(p.id, deriveFamilyStockStatus(p, inventoryBranch));
  }
  const lowStockCount = filteredProducts.filter((p) => {
    const s = familyDerivedStatus.get(p.id) ?? p.status;
    return ['Low Stock', 'Critical', 'Out of Stock'].includes(s);
  }).length;
  const categoryHidden = isCategoryCatalogHidden(categoryActive);

  function variantRowsFromProduct(p: ProductRow): { is_hidden?: boolean | null }[] {
    return variantsArrayFromProduct(p);
  }

  // ── Render ──
  if (!perms.pageAccess) {
    return <ModuleAccessDenied moduleName="Products" />;
  }

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
              {perms.paymentData ? ` · ₱${(totalRevenue / 1_000_000).toFixed(2)}M revenue` : ''}
              {branch ? ` · ${branch}` : ''}
              {categoryHidden ? ' · Hidden category' : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto flex-shrink-0">
          {perms.exportAccess && (
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={exportingCategory || loading || !categoryId}
            onClick={async () => {
              if (exportingCategory || loading || !categoryId) return;
              setExportingCategory(true);
              try {
                const exported = await fetchCategoryCatalogForExport(categoryId, inventoryBranch ?? '');
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
          )}
          {perms.productCreation && (
          <Button
            variant="primary"
            onClick={() => { setEditingProduct(null); setIsEditMode(false); setShowAddProductModal(true); }}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Product Family</span>
            <span className="sm:hidden">Add Family</span>
          </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <StatKpiCard
          label="Product Families"
          value={loading ? '…' : String(filteredProducts.length)}
          tone="blue"
          icon={<Package />}
          loading={loading}
        />
        {perms.stockAccess && (
        <StatKpiCard
          label="Low Stock"
          value={loading ? '…' : String(lowStockCount)}
          tone="amber"
          icon={<AlertTriangle />}
          loading={loading}
        />
        )}
        {perms.paymentData && (
        <StatKpiCard
          label="Category Revenue"
          value={loading ? '…' : `₱${(totalRevenue / 1_000_000).toFixed(2)}M`}
          tone="emerald"
          icon={<DollarSign />}
          loading={loading}
        />
        )}
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
            // Derived from the worst variant — keeps the badge honest when one
            // variant goes low while siblings still have plenty of stock.
            const derivedStatus = familyDerivedStatus.get(p.id) ?? p.status;
            return (
            <div key={p.id} className={`group relative ${familyHidden ? CATALOG_HIDDEN_CLASS : ''}`}>
              {perms.productCreation && (
              <button
                onClick={(e) => handleEditProduct(p, e)}
                className="absolute top-2 right-2 z-10 p-2.5 bg-white hover:bg-red-600 text-gray-700 hover:text-white rounded-lg shadow-lg border border-gray-300 group-hover:border-red-600 transition-all duration-200 hover:scale-110"
                title="Edit product family"
              >
                <Edit className="w-4 h-4" />
              </button>
              )}

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
                          variant={derivedStatus === 'Critical' ? 'destructive' : derivedStatus === 'Low Stock' ? 'warning' : derivedStatus === 'Out of Stock' ? 'destructive' : 'success'}
                          size="sm"
                          className="whitespace-nowrap text-center flex-shrink-0"
                        >
                          {derivedStatus === 'Active' ? 'In Stock' : derivedStatus === 'Critical' ? 'Critical Stock' : derivedStatus}
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
                      {perms.stockAccess && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total Stock:</span>
                        <span className={`font-bold ${p.total_stock < 200 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {(p.total_stock ?? 0).toLocaleString()} units
                        </span>
                      </div>
                      )}
                      {perms.paymentData && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Avg. Price:</span>
                        <span className="font-semibold text-gray-900">₱{(Number(p.avg_price) || 0).toLocaleString()}</span>
                      </div>
                      )}
                    </div>
                    {perms.paymentData && (
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
                    )}
                    {perms.stockAccess && ['Low Stock', 'Critical', 'Out of Stock'].includes(derivedStatus) && (
                      <div className={`flex items-start gap-2 p-3 rounded-lg border ${derivedStatus === 'Critical' || derivedStatus === 'Out of Stock' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                        <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${derivedStatus === 'Critical' || derivedStatus === 'Out of Stock' ? 'text-red-600' : 'text-orange-600'}`} />
                        <div className={`text-xs ${derivedStatus === 'Critical' || derivedStatus === 'Out of Stock' ? 'text-red-700' : 'text-orange-700'}`}>
                          <span className="font-semibold">{derivedStatus === 'Critical' ? 'Critical Stock' : derivedStatus}!</span> Consider reviewing production schedule.
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
          categoryOptions={categoryOptions}
          initialData={editingProduct || undefined}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
}
