import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { StatKpiCard } from '../components/ui/StatKpiCard';
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
  Edit,
  Plus,
  Edit3,
  Loader2,
  RefreshCw,
  Download,
} from 'lucide-react';
import AddMaterialModal, { MaterialFormData } from '../components/materials/AddMaterialModal';
import StockAdjustmentModal from '../components/warehouse/StockAdjustmentModal';
import { supabase } from '../lib/supabase';
import { computeStockStatus, computePersistedStockStatus } from '../lib/stockStatus';
import {
  notifyMaterialReorderPointChange,
  setMaterialBranchQuantity,
  setMaterialTotalStockDirect,
} from '../lib/rawMaterialStock';
import { insertRawMaterialLog, mapAppRoleToLogRole } from '../lib/domainActivityLog';
import { scopedMaterialIdList } from '../lib/warehouseScope';
import {
  normalizeProductCategorySlugParam,
  UNCATEGORIZED_CATEGORY_SLUG,
} from '../lib/productRoutes';
import {
  downloadMaterialCategoryWorkbook,
  fetchMaterialCategoryForExport,
} from '../lib/rawMaterialsExport';
import { useMaterialPermissions } from '../lib/permissions/materialPermissions';
import { ModuleAccessDenied } from '../components/permissions/ModuleAccessDenied';
import { EntityNotFound, looksLikeMissingEntityMessage, NOT_FOUND_COPY } from '../components/ui/NotFound';
import { overwriteMaterialStock } from '../lib/rawMaterialStock';

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

function getMaterialStockForBranch(m: RawMaterialRow, branchLabel: string): number {
  if (!branchLabel.trim()) return m.total_stock;
  const row = m.material_stock.find(s => s.branches?.name === branchLabel);
  return row?.quantity ?? 0;
}

export default function MaterialCategoryPage() {
  const navigate = useNavigate();
  const { categoryName } = useParams<{ categoryName: string }>();
  const [searchParams] = useSearchParams();
  const branchFromQuery = searchParams.get('branch')?.trim() || null;
  const categorySlug = normalizeProductCategorySlugParam(categoryName);
  const { selectedBranch, setHideBranchSelector, employeeName, role, session, addAuditLog, warehouseScope } = useAppContext();

  useEffect(() => {
    setHideBranchSelector(true);
    return () => setHideBranchSelector(false);
  }, [setHideBranchSelector]);
  const perms = useMaterialPermissions();
  const scopedMaterialIds = scopedMaterialIdList(warehouseScope);
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
    categorySlug === UNCATEGORIZED_CATEGORY_SLUG
      ? 'Uncategorized'
      : categoryName
      ? categoryName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Materials'
  );
  const [materials, setMaterials] = useState<RawMaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingCategory, setExportingCategory] = useState(false);

  useEffect(() => {
    if (!categoryName) return;
    const normalized = normalizeProductCategorySlugParam(categoryName);
    if (normalized !== categoryName) {
      const qs = branchFromQuery ? `?branch=${encodeURIComponent(branchFromQuery)}` : '';
      navigate(`/materials/category/${normalized}${qs}`, { replace: true });
    }
  }, [categoryName, branchFromQuery, navigate]);

  // ── Fetch category row (to get its UUID) then fetch its materials ───────────
  const fetchMaterials = useCallback(async () => {
    if (!categorySlug) return;
    setLoading(true);
    setError(null);
    try {
      let catQ = supabase
        .from('material_categories')
        .select('id, name')
        .eq('slug', categorySlug);
      if (categorySlug === UNCATEGORIZED_CATEGORY_SLUG) {
        const branchName = branchFromQuery ?? selectedBranch ?? null;
        if (branchName) {
          const { data: branchRow } = await supabase
            .from('branches')
            .select('id')
            .eq('name', branchName)
            .maybeSingle();
          if (branchRow?.id) catQ = catQ.eq('branch_id', branchRow.id);
        }
      }
      const { data: catData, error: catError } = await catQ.maybeSingle();

      if (catError || !catData) {
        setError(`Category "${categorySlug}" not found`);
        setLoading(false);
        return;
      }
      setCategoryId(catData.id);
      setCategoryTitle(catData.name);

      // 2. Fetch raw_materials for this category (with per-branch stock)
      let matQuery = supabase
        .from('raw_materials')
        .select('id, name, sku, brand, category_id, description, image_url, unit_of_measure, total_stock, reorder_point, cost_per_unit, monthly_consumption, status, specifications, material_stock ( quantity, branches ( code, name ) )')
        .eq('category_id', catData.id)
        .order('name', { ascending: true });
      if (scopedMaterialIds) matQuery = matQuery.in('id', scopedMaterialIds);
      const { data, error: matError } = await matQuery;

      if (matError) throw matError;
      setMaterials((data ?? []) as unknown as RawMaterialRow[]);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, [categorySlug, branchFromQuery, selectedBranch, scopedMaterialIds?.join('|') ?? '']);

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
      currentStock: getMaterialStockForBranch(m, selectedBranch),
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
    const actorName = employeeName || session?.user?.email || 'User';
    const actorRole = mapAppRoleToLogRole(role);
    setSaving(true);
    try {
      if (isEditMode && editingMaterialId) {
        const oldRow = materials.find(m => m.id === editingMaterialId);
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

        const prevStock = oldRow
          ? (selectedBranch ? getMaterialStockForBranch(oldRow, selectedBranch) : Number(oldRow.total_stock) || 0)
          : 0;
        if (
          perms.stockAccess &&
          formData.currentStock != null &&
          Number(formData.currentStock) !== prevStock
        ) {
          const persistedTotal = await overwriteMaterialStock({
            materialId: editingMaterialId,
            branchName: selectedBranch,
            newQuantity: Number(formData.currentStock),
            previousQuantity: prevStock,
            reorderPoint: formData.reorderPoint,
            triggeredBy: `Stock overwritten by ${actorName}${selectedBranch ? ` (branch ${selectedBranch})` : ''}`,
          });
          void insertRawMaterialLog(supabase, {
            rawMaterialId: editingMaterialId,
            action: 'stock_adjusted',
            description: `Stock set to ${Number(formData.currentStock)} ${formData.unitOfMeasure} — ${formData.sku.trim().toUpperCase()}${
              selectedBranch ? ` (branch ${selectedBranch})` : ''
            }`,
            performedBy: actorName,
            performedByRole: actorRole,
            oldValue: { total_stock: prevStock, branch: selectedBranch ?? null },
            newValue: { total_stock: Number(formData.currentStock), branch: selectedBranch ?? null },
            metadata: { branch_context: selectedBranch ?? null, aggregate_total: persistedTotal, overwrite: true },
          });
        }

        // Re-fire alerts if the reorder point moved — stock may now be below it.
        if (oldRow && Number(oldRow.reorder_point) !== Number(formData.reorderPoint)) {
          const stockForAlert = selectedBranch
            ? getMaterialStockForBranch(oldRow, selectedBranch)
            : Number(oldRow.total_stock) || 0;
          let branchId: string | null = null;
          if (selectedBranch?.trim()) {
            const { data: branchRow } = await supabase
              .from('branches')
              .select('id')
              .eq('name', selectedBranch.trim())
              .maybeSingle();
            branchId = branchRow?.id ?? null;
          }
          void notifyMaterialReorderPointChange({
            materialId: editingMaterialId,
            stock: stockForAlert,
            oldReorderPoint: Number(oldRow.reorder_point) || 0,
            newReorderPoint: Number(formData.reorderPoint) || 0,
            branchId,
            triggeredBy: `Reorder point updated by ${actorName}`,
          }).catch((err) =>
            console.warn('[material-stock-notify] category reorder notify failed', err),
          );
        }

        await insertRawMaterialLog(supabase, {
          rawMaterialId: editingMaterialId,
          action: 'material_updated',
          description: `Raw material "${formData.name.trim()}" updated (${categoryTitle}).`,
          performedBy: actorName,
          performedByRole: actorRole,
          oldValue: oldRow
            ? {
                name: oldRow.name,
                sku: oldRow.sku,
                cost_per_unit: oldRow.cost_per_unit,
                reorder_point: oldRow.reorder_point,
              }
            : null,
          newValue: {
            name: formData.name.trim(),
            sku: formData.sku.trim().toUpperCase(),
            cost_per_unit: formData.costPerUnit,
            reorder_point: formData.reorderPoint,
          },
        });
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
        if (newMaterial?.id) {
          await insertRawMaterialLog(supabase, {
            rawMaterialId: newMaterial.id,
            action: 'material_created',
            description: `Raw material "${formData.name.trim()}" created in ${categoryTitle}.`,
            performedBy: actorName,
            performedByRole: actorRole,
            newValue: {
              sku: formData.sku.trim().toUpperCase(),
              unit_of_measure: formData.unitOfMeasure,
              cost_per_unit: formData.costPerUnit,
            },
          });
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
    const actorName = employeeName || session?.user?.email || 'User';
    const actorRole = mapAppRoleToLogRole(role);
    const delName = editingMaterial?.name ?? materials.find(m => m.id === editingMaterialId)?.name ?? '';
    setSaving(true);
    try {
      await insertRawMaterialLog(supabase, {
        rawMaterialId: editingMaterialId,
        action: 'material_deleted',
        description: `Raw material "${delName}" deleted.`,
        performedBy: actorName,
        performedByRole: actorRole,
        oldValue: { name: delName },
        newValue: null,
      });
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
    const branchStock = getMaterialStockForBranch(m, selectedBranch);
    setSelectedItemForAdjustment({
      id: m.id,
      name: m.name,
      sku: m.sku,
      currentStock: branchStock,
      unit: m.unit_of_measure,
      reorderPoint: m.reorder_point,
      status: m.status,
    });
    setShowStockAdjustmentModal(true);
  };

  const handleStockAdjustment = async (adjustment: { type: 'add' | 'subtract'; quantity: number; notes: string }) => {
    if (!selectedItemForAdjustment) return;
    const actorName = employeeName || session?.user?.email || 'User';
    const actorRole = mapAppRoleToLogRole(role);
    const prevStock = selectedItemForAdjustment.currentStock;
    const newStock = adjustment.type === 'add'
      ? prevStock + adjustment.quantity
      : Math.max(0, prevStock - adjustment.quantity);
    const reorderPoint = selectedItemForAdjustment.reorderPoint ?? 0;
    const triggeredBy = `Manual stock adjustment by ${actorName}${selectedBranch ? ` (branch ${selectedBranch})` : ''}`;

    try {
      let resolvedBranchId: string | null = null;
      if (selectedBranch?.trim()) {
        const { data: branchRow } = await supabase
          .from('branches')
          .select('id')
          .eq('name', selectedBranch.trim())
          .maybeSingle();
        resolvedBranchId = branchRow?.id ?? null;
      }

      let persistedTotal = newStock;
      if (resolvedBranchId) {
        const result = await setMaterialBranchQuantity({
          materialId: selectedItemForAdjustment.id,
          branchId: resolvedBranchId,
          quantity: newStock,
          reorderPoint,
          updateLastRestocked: adjustment.type === 'add',
          triggeredBy,
        });
        persistedTotal = result.totalStock;
      } else {
        await setMaterialTotalStockDirect({
          materialId: selectedItemForAdjustment.id,
          totalStock: newStock,
          previousTotalStock: prevStock,
          reorderPoint,
          updateLastRestocked: adjustment.type === 'add',
          triggeredBy,
        });
      }

      const newStatus = computePersistedStockStatus(persistedTotal, reorderPoint);
      void insertRawMaterialLog(supabase, {
        rawMaterialId: selectedItemForAdjustment.id,
        action: 'stock_adjusted',
        description: `${adjustment.type === 'add' ? 'Added' : 'Removed'} ${adjustment.quantity} ${selectedItemForAdjustment.unit} — ${selectedItemForAdjustment.sku}${
          adjustment.notes.trim() ? `. ${adjustment.notes.trim()}` : ''
        }`,
        performedBy: actorName,
        performedByRole: actorRole,
        oldValue: { total_stock: prevStock, branch: selectedBranch ?? null },
        newValue: { total_stock: newStock, status: newStatus, branch: selectedBranch ?? null },
        metadata: { source: 'material_category_page', aggregate_total: persistedTotal },
      });
      void fetchMaterials();
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error('Failed to adjust stock');
    }
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
  const lowStockCount = filteredMaterials.filter(m => {
    const computed = computeStockStatus(m.total_stock, m.reorder_point);
    return ['Low Stock', 'Critical', 'Out of Stock'].includes(computed);
  }).length;

  const getStockBarColor = (m: RawMaterialRow) => {
    if (m.reorder_point > 0 && m.total_stock <= m.reorder_point * 0.5) return 'bg-red-500';
    if (m.reorder_point > 0 && m.total_stock <= m.reorder_point) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStockPercentage = (m: RawMaterialRow) => {
    if (m.reorder_point <= 0) return 100;
    return Math.min((m.total_stock / (m.reorder_point * 2)) * 100, 100);
  };

  const getStockForBranch = (m: RawMaterialRow) => getMaterialStockForBranch(m, selectedBranch);

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

  if (!perms.pageAccess) {
    return <ModuleAccessDenied moduleName="Raw Materials" />;
  }

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
              {filteredMaterials.length} materials
              {perms.paymentData ? ` · ₱${(totalValue / 1000000).toFixed(2)}M total value` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {perms.exportAccess && (
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={exportingCategory || loading || !categoryId}
            onClick={async () => {
              if (exportingCategory || loading || !categoryId) return;
              setExportingCategory(true);
              try {
                const exported = await fetchMaterialCategoryForExport(categoryId);
                await downloadMaterialCategoryWorkbook(
                  exported.categoryName,
                  exported.branch,
                  exported.categories,
                  exported.materials,
                );
                addAuditLog(
                  'Exported material category workbook',
                  'Raw Materials',
                  `${exported.materials.length} materials (${exported.categoryName})`,
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
          {perms.materialCreation && (
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
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-red-500" />
        </div>
      )}

      {error && !loading && (
        <EntityNotFound
          {...NOT_FOUND_COPY.materialCategory}
          description={
            looksLikeMissingEntityMessage(error)
              ? `The material category "${categorySlug}" does not exist or may have been removed.`
              : (error ?? NOT_FOUND_COPY.materialCategory.description)
          }
          variant={looksLikeMissingEntityMessage(error) ? 'missing' : 'error'}
          errorDetail={looksLikeMissingEntityMessage(error) ? undefined : error}
          onRetry={looksLikeMissingEntityMessage(error) ? undefined : fetchMaterials}
        />
      )}

      {!loading && !error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <StatKpiCard label="Total Items" value={String(filteredMaterials.length)} tone="blue" icon={<Package />} />
            {perms.stockAccess && (
            <StatKpiCard label="Low Stock Items" value={String(lowStockCount)} tone="amber" icon={<AlertTriangle />} />
            )}
            {perms.paymentData && (
            <StatKpiCard label="Category Value" value={`₱${(totalValue / 1000000).toFixed(2)}M`} tone="emerald" icon={<TrendingUp />} />
            )}
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
                {!searchQuery && perms.materialCreation && (
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

                return (
                  <div key={m.id} className="group relative">
                    {perms.materialCreation && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditMaterial(m); }}
                      className="absolute top-2 right-2 z-10 p-2.5 bg-white hover:bg-red-600 text-gray-700 hover:text-white rounded-lg shadow-lg border border-gray-300 group-hover:border-red-600 transition-all duration-200 hover:scale-110"
                      title="Edit material"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    )}

                    <Link to={`/materials/category/${categoryName}/details/${m.id}`} className="block">
                    <Card
                      className="overflow-hidden group-hover:shadow-xl transition-all duration-200 border-2 group-hover:border-red-500 cursor-pointer"
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

                          {perms.stockAccess && (
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
                          )}

                          {perms.stockAccess && (
                          <>
                          {/* Usage */}
                          <div className="pt-3 border-t space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Monthly Usage:</span>
                              <span className="font-medium text-gray-900">{m.monthly_consumption.toLocaleString()} {m.unit_of_measure}</span>
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
                          </>
                          )}

                          {(perms.paymentData || perms.stockAccess) && (
                          <div className="pt-4 border-t space-y-3">
                            {perms.paymentData && (
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
                            )}
                            {perms.stockAccess && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleOpenAdjustment(m, e)}
                              className="w-full flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                              Adjust Stock
                            </Button>
                            )}
                          </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    </Link>
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
          showStockOverwrite={isEditMode && perms.stockAccess}
          showCostFields={perms.materialCreation || !isEditMode}
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