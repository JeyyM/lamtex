import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  Search,
  Filter,
  Plus,
  DollarSign,
  AlertTriangle,
  TrendingDown,
  FileText,
  Download,
  RefreshCw,
  Truck,
  ArrowRightLeft,
  ShoppingCart,
  Users,
  Edit,
  Loader2,
} from 'lucide-react';
import { getAllRawMaterials } from '@/src/mock/rawMaterials';
import type { MaterialCategory, MaterialStatus, StockOutRisk } from '@/src/types/materials';
import { ReceiveMaterialModal } from '@/src/components/materials/ReceiveMaterialModal';
import { StockTransferModal } from '@/src/components/materials/StockTransferModal';
import AddMaterialCategoryModal, { MaterialCategoryFormData } from '@/src/components/materials/AddMaterialCategoryModal';
import { supabase } from '@/src/lib/supabase';

// Import raw material images (local fallbacks)
import whitePelletsImg from '@/src/assets/raw-materials/White Pellets.webp';
import resinPowderImg from '@/src/assets/raw-materials/Resin Powder.avif';
import pvcImg from '@/src/assets/raw-materials/Polyvinyl-Chloride.avif';
import polypropyleneImg from '@/src/assets/raw-materials/Polypropylene.jpg';
import petImg from '@/src/assets/raw-materials/Polyethylene Terephthalate.jpg';
import ldpeImg from '@/src/assets/raw-materials/Low Density Polyethylene.jpg';
import j70Img from '@/src/assets/raw-materials/J-70.jfif';

// Fallback image map: slug → local image asset
const categoryImageMap: Record<string, string> = {
  'pvc-resin': pvcImg,
  'hdpe-resin': ldpeImg,
  'ppr-resin': polypropyleneImg,
  'stabilizers': whitePelletsImg,
  'plasticizers': j70Img,
  'lubricants': resinPowderImg,
  'colorants': petImg,
  'additives': whitePelletsImg,
  'packaging-materials': resinPowderImg,
  'other': pvcImg,
};

// Supabase row shape
interface MaterialCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  branch_id: string | null;
  branches: { name: string } | null;
}

export function RawMaterialsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const { role, branch } = useAppContext();
  
  // Modal states
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MaterialCategoryFormData | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Supabase categories state
  const [categories, setCategories] = useState<MaterialCategoryRow[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Live material counts per category from Supabase
  interface MaterialCountRow { category_id: string; status: string; }
  const [materialCounts, setMaterialCounts] = useState<MaterialCountRow[]>([]);

  // Live summary stats from Supabase (branch-aware)
  interface SummaryStats {
    totalMaterials: number;
    totalValue: number;
    lowStockCount: number;
    reorderCount: number;
  }
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalMaterials: 0,
    totalValue: 0,
    lowStockCount: 0,
    reorderCount: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Live alert materials from Supabase
  interface AlertMaterial {
    id: string;
    name: string;
    total_stock: number;
    reorder_point: number;
    monthly_consumption: number;
    status: string;
    daysOfCover: number;
  }
  const [dbAlertMaterials, setDbAlertMaterials] = useState<AlertMaterial[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const allMaterials = getAllRawMaterials();

  // Fetch material categories from Supabase
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);

    const [catResult, countResult] = await Promise.all([
      supabase
        .from('material_categories')
        .select('*, branches ( name )')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('raw_materials')
        .select('category_id, status'),
    ]);

    if (catResult.error) {
      console.error('Failed to fetch material categories:', catResult.error);
      setCategoriesError(catResult.error.message);
    } else {
      setCategories(catResult.data ?? []);
    }

    if (!countResult.error) {
      setMaterialCounts(countResult.data ?? []);
    }

    setCategoriesLoading(false);
  };

  // Fetch branch-aware summary stats from Supabase
  const fetchSummaryStats = async (currentBranch: string, allCategories: MaterialCategoryRow[]) => {
    setSummaryLoading(true);

    // Collect category IDs that belong to this branch via branch_id
    const branchCategoryIds = allCategories
      .filter(c => c.branches?.name === currentBranch)
      .map(c => c.id);

    if (branchCategoryIds.length === 0) {
      setSummaryStats({ totalMaterials: 0, totalValue: 0, lowStockCount: 0, reorderCount: 0 });
      setSummaryLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('raw_materials')
      .select('total_stock, cost_per_unit, reorder_point, status, category_id')
      .in('category_id', branchCategoryIds);

    if (error || !data) {
      setSummaryLoading(false);
      return;
    }

    const totalMaterials = data.length;
    const totalValue = data.reduce((sum, m) => sum + (Number(m.total_stock) || 0) * (Number(m.cost_per_unit) || 0), 0);
    const lowStockCount = data.filter(m => ['Low Stock', 'Critical', 'Out of Stock'].includes(m.status)).length;
    const reorderCount = data.filter(m => Number(m.total_stock) <= Number(m.reorder_point)).length;

    setSummaryStats({ totalMaterials, totalValue, lowStockCount, reorderCount });
    setSummaryLoading(false);
  };

  // Fetch alert materials from Supabase (branch-aware)
  const fetchAlertMaterials = async (currentBranch: string, allCategories: MaterialCategoryRow[]) => {
    setAlertsLoading(true);

    const branchCategoryIds = allCategories
      .filter(c => c.branches?.name === currentBranch)
      .map(c => c.id);

    if (branchCategoryIds.length === 0) {
      setDbAlertMaterials([]);
      setAlertsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('raw_materials')
      .select('id, name, total_stock, reorder_point, monthly_consumption, status')
      .in('category_id', branchCategoryIds);

    if (error || !data) {
      setAlertsLoading(false);
      return;
    }

    const withDays: AlertMaterial[] = data.map(m => {
      const stock = Number(m.total_stock) || 0;
      const consumption = Number(m.monthly_consumption) || 0;
      const avgDailyUsage = consumption > 0 ? consumption / 30 : 0;
      const daysOfCover = avgDailyUsage > 0 ? stock / avgDailyUsage : Infinity;
      return {
        id: m.id,
        name: m.name,
        total_stock: stock,
        reorder_point: Number(m.reorder_point) || 0,
        monthly_consumption: consumption,
        status: m.status ?? '',
        daysOfCover,
      };
    });

    setDbAlertMaterials(withDays);
    setAlertsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (branch) {
      fetchSummaryStats(branch, categories);
      fetchAlertMaterials(branch, categories);
    }
  }, [branch, categories]);

  const visibleCategories = branch
    ? categories.filter(c => c.branches?.name === branch)
    : categories;

  // Resolve image: use image_url from DB if set, otherwise fall back to local asset map
  const getCategoryImage = (cat: MaterialCategoryRow): string => {
    if (cat.image_url) return cat.image_url;
    return categoryImageMap[cat.slug] ?? pvcImg;
  };

  // Apply search and category filters first
  const filteredBySearchAndCategory = allMaterials.filter(material => {
    const matchesSearch = 
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' || material.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
    if (status === 'Active') return 'success';
    if (status === 'Low Stock') return 'warning';
    if (status === 'Out of Stock' || status === 'Discontinued' || status === 'Expired') return 'danger';
    return 'default';
  };

  const getRiskBadgeVariant = (risk: StockOutRisk): 'success' | 'warning' | 'danger' => {
    if (risk === 'Critical') return 'danger';
    if (risk === 'Risky') return 'warning';
    return 'success';
  };

  const riskLevels: (StockOutRisk | 'All')[] = ['All', 'OK', 'Risky', 'Critical'];

  // Handler functions for category management
  const handleEditCategory = (category: MaterialCategoryRow) => {
    const categoryData: MaterialCategoryFormData = {
      name: category.name,
      description: category.description || '',
      imageUrl: category.image_url || getCategoryImage(category),
      icon: 'inventory_2',
    };
    setEditingCategory(categoryData);
    setEditingCategoryId(category.id);
    setIsEditMode(true);
  };

  const handleCloseModal = () => {
    setShowAddCategoryModal(false);
    setEditingCategory(null);
    setEditingCategoryId(null);
    setIsEditMode(false);
  };

  const handleSaveCategory = async (categoryData: MaterialCategoryFormData) => {
    setSaving(true);
    try {
      // Generate a slug from the name
      const slug = categoryData.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (isEditMode && editingCategoryId) {
        // ── UPDATE existing category ──
        const { error } = await supabase
          .from('material_categories')
          .update({
            name: categoryData.name.trim(),
            slug,
            description: categoryData.description.trim() || null,
            image_url: categoryData.imageUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategoryId);

        if (error) throw error;
      } else {
        // ── INSERT new category ──
        // Resolve branch_id from the current branch name
        let branchId: string | null = null;
        if (branch) {
          const { data: branchRow } = await supabase
            .from('branches')
            .select('id')
            .eq('name', branch)
            .single();
          branchId = branchRow?.id ?? null;
        }

        const nextSortOrder = categories.length > 0
          ? Math.max(...categories.map(c => c.sort_order)) + 1
          : 1;

        const { error } = await supabase
          .from('material_categories')
          .insert({
            name: categoryData.name.trim(),
            slug,
            description: categoryData.description.trim() || null,
            image_url: categoryData.imageUrl || null,
            sort_order: nextSortOrder,
            branch_id: branchId,
          });

        if (error) throw error;
      }

      // Refresh the categories list from the DB
      await fetchCategories();
      handleCloseModal();
    } catch (err: any) {
      console.error('Failed to save material category:', err);
      alert(`Failed to save category: ${err.message ?? 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!editingCategoryId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('material_categories')
        .delete()
        .eq('id', editingCategoryId);

      if (error) throw error;

      await fetchCategories();
      handleCloseModal();
    } catch (err: any) {
      console.error('Failed to delete material category:', err);
      alert(`Failed to delete category: ${err.message ?? 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Derived calculations for enhanced materials (immutable operations)
  const enhancedMaterials = filteredBySearchAndCategory.map((material) => {
    // ⚠ DEMO MODE: Simulating high consumption for specific material
    // Use stable material ID instead of array position to avoid mutation on filter changes
    const isDemoMaterial = material.id === 'MAT-001';

    const adjustedMonthlyConsumption = isDemoMaterial
      ? (material.monthlyConsumption || 0) * 8
      : material.monthlyConsumption || 0;

    const adjustedStockBranchA = isDemoMaterial
      ? 20
      : material.stockBranchA || 0;

    const totalStock =
      adjustedStockBranchA +
      (material.stockBranchB || 0) +
      (material.stockBranchC || 0);

    const monthlyConsumption = adjustedMonthlyConsumption;

    const avgDailyUsage =
      monthlyConsumption > 0 ? monthlyConsumption / 30 : 0;

    const daysOfCover =
      avgDailyUsage > 0 ? totalStock / avgDailyUsage : Infinity;

    // Use operationally-focused risk thresholds
    let stockRisk: StockOutRisk = 'OK';
    if (daysOfCover <= 30) stockRisk = 'Critical';
    else if (daysOfCover <= 90) stockRisk = 'Risky';

    const projectedStockOutDate =
      avgDailyUsage > 0
        ? new Date(Date.now() + daysOfCover * 24 * 60 * 60 * 1000)
        : null;

    return {
      ...material,
      totalStock,
      avgDailyUsage,
      daysOfCover,
      stockRisk,
      projectedStockOutDate,
    };
  });

  // Apply risk filter (immutable operation)
  const filteredMaterials = enhancedMaterials.filter(material => {
    const matchesRisk = riskFilter === 'All' || material.stockRisk === riskFilter;
    return matchesRisk;
  });

  // KPI: Estimated Stock-Out Count — from live DB data
  const estimatedStockOutCount = dbAlertMaterials.filter(m => m.daysOfCover <= 30).length;

  // Derive Alerts from live DB data
  const criticalAlerts = [...dbAlertMaterials]
    .filter(m => m.daysOfCover <= 30)
    .sort((a, b) => a.daysOfCover - b.daysOfCover);

  const warningAlerts = [...dbAlertMaterials]
    .filter(m => m.daysOfCover > 30 && m.daysOfCover <= 90)
    .sort((a, b) => a.daysOfCover - b.daysOfCover);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Raw Materials</h1>
          <p className="text-sm text-gray-500 mt-1">Browse materials by category</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => {/* TODO: Export materials data */}} className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>

          <Button variant="outline" onClick={() => setShowReceiveModal(true)} className="flex-1 sm:flex-none">
            <Truck className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Receive</span>
            <span className="sm:hidden">Receive</span>
          </Button>

          <Button variant="outline" onClick={() => setShowTransferModal(true)} className="flex-1 sm:flex-none">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Transfer</span>
            <span className="sm:hidden">Transfer</span>
          </Button>

          <Button variant="outline" onClick={() => navigate('/purchase-orders')} className="flex-1 sm:flex-none">
            <ShoppingCart className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Purchase Orders</span>
            <span className="sm:hidden">Orders</span>
          </Button>

          <Button variant="outline" onClick={() => navigate('/suppliers')} className="flex-1 sm:flex-none">
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Suppliers</span>
            <span className="sm:hidden">Suppliers</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Materials</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryLoading ? '…' : summaryStats.totalMaterials}
                    </p>
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
                    <p className="text-sm text-gray-500">Total Inventory Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryLoading
                        ? '…'
                        : summaryStats.totalValue >= 1_000_000
                          ? `₱${(summaryStats.totalValue / 1_000_000).toFixed(2)}M`
                          : `₱${summaryStats.totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
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
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryLoading ? '…' : summaryStats.lowStockCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reorder Required</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryLoading ? '…' : summaryStats.reorderCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Alerts */}
          {alertsLoading ? (
            <Card className="border-l-4 border-l-orange-500 shadow-sm">
              <CardContent className="p-6 flex items-center gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                <span className="text-sm">Loading stock alerts…</span>
              </CardContent>
            </Card>
          ) : (criticalAlerts.length > 0 || warningAlerts.length > 0) && (
            <Card className="border-l-4 border-l-orange-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Stock Alerts
                  <Badge variant="danger" className="ml-2">
                    {criticalAlerts.length + warningAlerts.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Critical Alerts Column */}
                  {criticalAlerts.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        <h4 className="text-sm font-semibold text-red-700 uppercase tracking-wide">
                          Critical ({criticalAlerts.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {criticalAlerts.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            className="border border-red-200 rounded-lg p-3 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {m.name}
                                </p>
                                <p className="text-xs text-red-600 font-medium mt-1">
                                  ⚠ {isFinite(m.daysOfCover) ? `${m.daysOfCover.toFixed(1)} days remaining` : `${m.total_stock} units · no consumption data`}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/materials/${m.id}`)}
                                className="flex-shrink-0 text-xs"
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warning Alerts Column */}
                  {warningAlerts.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                        <h4 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide">
                          Warning ({warningAlerts.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {warningAlerts.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            className="border border-yellow-200 rounded-lg p-3 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {m.name}
                                </p>
                                <p className="text-xs text-yellow-600 font-medium mt-1">
                                  {isFinite(m.daysOfCover) ? `${m.daysOfCover.toFixed(1)} days remaining` : `${m.total_stock} units · no consumption data`}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/materials/${m.id}`)}
                                className="flex-shrink-0 text-xs"
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Categories Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Browse by Category</CardTitle>
            <Button 
              variant="primary"
              onClick={() => {
                setEditingCategory(null);
                setIsEditMode(false);
                setShowAddCategoryModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-red-500" />
              <p className="text-sm">Loading categories…</p>
            </div>
          ) : categoriesError ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <AlertTriangle className="w-8 h-8 mb-3 text-orange-500" />
              <p className="text-sm font-medium text-gray-700">Failed to load categories</p>
              <p className="text-xs text-gray-400 mt-1">{categoriesError}</p>
              <Button variant="outline" className="mt-4" onClick={fetchCategories}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Package className="w-8 h-8 mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">No categories for this branch</p>
              <p className="text-xs text-gray-400 mt-1">Switch branches or add a category to get started.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {visibleCategories.map((category) => {
              const categoryMaterials = materialCounts.filter(m => m.category_id === category.id);
              const categoryCount = categoryMaterials.length;
              const lowStockCount = categoryMaterials.filter(m => m.status === 'Low Stock' || m.status === 'Out of Stock').length;
              return (
                <div
                  key={category.id}
                  className="group relative overflow-hidden border-2 border-gray-200 rounded-lg hover:border-red-500 hover:shadow-lg transition-all duration-200"
                >
                  {/* Edit Button - Top Right - Always visible, more prominent on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCategory(category);
                    }}
                    className="absolute top-2 right-2 z-10 p-2.5 bg-white hover:bg-red-600 text-gray-700 hover:text-white rounded-lg shadow-lg border border-gray-300 group-hover:border-red-600 transition-all duration-200 hover:scale-110"
                    title="Edit material category"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Category Card - Clickable Area */}
                  <button
                    onClick={() => navigate(`/materials/category/${category.slug}`)}
                    className="w-full text-left"
                  >
                    {/* Category Image */}
                    <div className="aspect-video w-full overflow-hidden bg-gray-100">
                      <img 
                        src={getCategoryImage(category)} 
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    
                    {/* Category Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{category.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap-none">
                        <p className="text-sm text-gray-500 shrink-0">
                          {categoryCount} {categoryCount === 1 ? 'item' : 'items'}
                        </p>
                        {lowStockCount > 0 && (
                          <Badge variant="warning" size="sm" className="whitespace-nowrap shrink-0">
                            {lowStockCount} low stock
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modals */}
      {showReceiveModal && (
        <ReceiveMaterialModal
          onClose={() => setShowReceiveModal(false)}
          onSuccess={() => {
            setShowReceiveModal(false);
            // Refresh data in real implementation
          }}
        />
      )}

      {showTransferModal && (
        <StockTransferModal
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            // Refresh data in real implementation
          }}
        />
      )}

      {/* Add/Edit Material Category Modal */}
      {(showAddCategoryModal || editingCategory) && (
        <AddMaterialCategoryModal
          isOpen={showAddCategoryModal || !!editingCategory}
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
