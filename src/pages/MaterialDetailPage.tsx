import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { useAppContext } from '@/src/store/AppContext';
import StockAdjustmentModal from '@/src/components/warehouse/StockAdjustmentModal';
import AddMaterialModal, { MaterialFormData } from '@/src/components/materials/AddMaterialModal';
import { supabase } from '@/src/lib/supabase';
import { computeStockStatus } from '@/src/lib/stockStatus';
import {
  Package,
  ArrowLeft,
  Edit,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Box,
  AlertTriangle,
  BarChart3,
  Activity,
  Truck,
  ClipboardList,
  Calendar,
  Tag,
  Layers,
  Factory,
  Edit3,
  Loader2,
  ShoppingCart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MaterialStatus } from '@/src/types/materials';

interface POHistoryRow {
  id: string;
  order_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  unit_of_measure: string | null;
  purchase_orders: {
    id: string;
    po_number: string;
    status: string;
    order_date: string;
    expected_delivery_date: string | null;
    actual_delivery_date: string | null;
    total_amount: number;
    suppliers: { name: string } | null;
  } | null;
}

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
  category_name: string | null;
  description: string | null;
  image_url: string | null;
  unit_of_measure: string;
  total_stock: number;
  reorder_point: number;
  safety_stock: number;
  cost_per_unit: number;
  monthly_consumption: number;
  status: string;
  created_at: string | null;
  specifications: { label: string; value: string }[] | null;
  material_stock: MaterialStockRow[];
}

export function MaterialDetailPage() {
  const { id, categoryName } = useParams<{ id: string; categoryName: string }>();
  const navigate = useNavigate();
  const { selectedBranch } = useAppContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'analytics'>('overview');

  // PO creation
  const [creatingPO, setCreatingPO]   = useState(false);
  // PO history
  const [poHistory, setPOHistory]     = useState<POHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Stock adjustment modal states
  const [showStockAdjustmentModal, setShowStockAdjustmentModal] = useState(false);
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<any>(null);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Supabase state
  const [material, setMaterial] = useState<RawMaterialRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterial = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('raw_materials')
        .select(`
          id, name, sku, brand, category_id, description, image_url,
          unit_of_measure, total_stock, reorder_point, safety_stock,
          cost_per_unit, monthly_consumption, status, created_at,
          specifications,
          material_stock ( quantity, branches ( code, name ) ),
          material_categories ( name )
        `)
        .eq('id', id)
        .single();

      if (err || !data) {
        setError('Material not found');
        return;
      }
      const cat = (data.material_categories as unknown as { name: string } | null);
      setMaterial({ ...data, category_name: cat?.name ?? null } as unknown as RawMaterialRow);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load material');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchMaterial(); }, [fetchMaterial]);

  const fetchPOHistory = useCallback(async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('purchase_order_items')
        .select(`
          id, order_id, quantity_ordered, quantity_received, unit_price, unit_of_measure,
          purchase_orders ( id, po_number, status, order_date, expected_delivery_date, actual_delivery_date, total_amount, suppliers ( name ) )
        `)
        .eq('material_id', id)
        .order('id', { ascending: false });
      if (!err && data) setPOHistory(data as unknown as POHistoryRow[]);
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'history') fetchPOHistory();
  }, [activeTab, fetchPOHistory]);

  const handleCreatePO = async () => {
    if (!material) return;
    setCreatingPO(true);
    try {
      let branchId: string | null = null;
      if (selectedBranch) {
        const { data: bd } = await supabase.from('branches').select('id').eq('name', selectedBranch).single();
        branchId = bd?.id ?? null;
      }
      const poNumber = `PO-${Date.now()}`;
      const { data: poData, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          po_number:    poNumber,
          branch_id:    branchId,
          status:       'Draft',
          order_date:   new Date().toISOString().split('T')[0],
          total_amount: material.cost_per_unit,
        })
        .select('id')
        .single();
      if (poErr) throw poErr;
      const { error: itemErr } = await supabase.from('purchase_order_items').insert({
        order_id:          poData.id,
        material_id:       material.id,
        quantity_ordered:  1,
        quantity_received: 0,
        unit_price:        material.cost_per_unit,
        unit_of_measure:   material.unit_of_measure,
      });
      if (itemErr) throw itemErr;
      navigate(`/purchase-orders/${poData.id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingPO(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{error ?? 'Material not found'}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(categoryName ? `/materials/category/${categoryName}` : '/materials')}>
            Back to Materials
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: MaterialStatus): 'success' | 'warning' | 'danger' | 'default' => {
    if (status === 'Active') return 'success';
    if (status === 'Low Stock') return 'warning';
    if (status === 'Critical' || status === 'Out of Stock' || status === 'Discontinued' || status === 'Expired') return 'danger';
    return 'default';
  };

  const getStatusLabel = (status: string): string => {
    if (status === 'Active') return 'In Stock';
    if (status === 'Critical') return 'Critical Stock';
    return status;
  };

  const getQualityStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
    if (status === 'Passed') return 'success';
    if (status === 'Conditionally Approved') return 'warning';
    if (status === 'Failed') return 'danger';
    return 'default';
  };

  // Get stock for selected branch
  const getStockForBranch = () => {
    if (!selectedBranch) return material.total_stock;
    const row = material.material_stock.find(s => s.branches?.name === selectedBranch);
    return row?.quantity ?? 0;
  };

  const currentStock = getStockForBranch();
  const avgDailyUsage = material.monthly_consumption / 30;
  const daysOfCover = avgDailyUsage > 0 ? currentStock / avgDailyUsage : Infinity;

  // Prepare chart data — dynamic from material_stock rows
  const stockByBranchData = material.material_stock.map(s => ({
    branch: s.branches?.name ?? 'Unknown',
    stock: s.quantity,
  }));

  const forecastData = [
    { month: 'Jan', actual: material.monthly_consumption * 0.75, forecast: null },
    { month: 'Feb', actual: material.monthly_consumption * 0.82, forecast: null },
    { month: 'Mar', actual: material.monthly_consumption * 0.95, forecast: null },
    { month: 'Apr', actual: material.monthly_consumption * 0.88, forecast: null },
    { month: 'May', actual: material.monthly_consumption * 1.05, forecast: null },
    { month: 'Jun', actual: material.monthly_consumption, forecast: material.monthly_consumption },
    { month: 'Jul', actual: null, forecast: material.monthly_consumption * 1.08 },
    { month: 'Aug', actual: null, forecast: material.monthly_consumption * 1.12 },
    { month: 'Sep', actual: null, forecast: material.monthly_consumption * 1.15 },
  ];

  // Stock adjustment handlers
  const handleOpenAdjustment = () => {
    setSelectedItemForAdjustment({
      id: material.id,
      name: material.name,
      sku: material.sku,
      currentStock: material.total_stock,
      unit: material.unit_of_measure,
      reorderPoint: material.reorder_point,
      status: material.status,
    });
    setShowStockAdjustmentModal(true);
  };

  const handleStockAdjustment = async (adjustment: { type: 'add' | 'subtract'; quantity: number; notes: string }) => {
    if (!material) return;
    const newTotal = adjustment.type === 'add'
      ? Number(material.total_stock) + adjustment.quantity
      : Math.max(0, Number(material.total_stock) - adjustment.quantity);

    try {
      // 1. Update aggregate total_stock + auto-computed status
      const newStatus = computeStockStatus(newTotal, material.reorder_point);
      const { error: matErr } = await supabase
        .from('raw_materials')
        .update({ total_stock: newTotal, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', material.id);
      if (matErr) throw matErr;

      // 2. Update branch-specific stock row if it exists
      if (selectedBranch) {
        const { data: branchRow } = await supabase
          .from('branches')
          .select('id')
          .eq('name', selectedBranch)
          .single();

        if (branchRow) {
          const { data: stockRow } = await supabase
            .from('material_stock')
            .select('quantity')
            .eq('material_id', material.id)
            .eq('branch_id', branchRow.id)
            .single();

          if (stockRow) {
            const branchNewQty = adjustment.type === 'add'
              ? Number(stockRow.quantity) + adjustment.quantity
              : Math.max(0, Number(stockRow.quantity) - adjustment.quantity);
            await supabase
              .from('material_stock')
              .update({ quantity: branchNewQty })
              .eq('material_id', material.id)
              .eq('branch_id', branchRow.id);
          }
        }
      }

      // 3. Refresh page data
      await fetchMaterial();
    } catch (err: any) {
      alert(`Failed to adjust stock: ${err.message ?? 'Unknown error'}`);
    }
  };

  // Edit material save handler
  const handleSaveEdit = async (formData: MaterialFormData) => {
    setSavingEdit(true);
    try {
      const updatedStatus = computeStockStatus(material.total_stock, formData.reorderPoint);
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
          status: updatedStatus,
          specifications: formData.specifications.filter(s => s.label.trim()),
          updated_at: new Date().toISOString(),
        })
        .eq('id', material.id);
      if (error) throw error;
      setShowEditModal(false);
      await fetchMaterial();
    } catch (err: any) {
      alert(`Failed to save: ${err.message ?? 'Unknown error'}`);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(categoryName ? `/materials/category/${categoryName}` : '/materials')} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{material.name}</h1>
            <p className="text-sm text-gray-500 mt-1 truncate">{material.category_name ?? 'Materials'} • {material.sku}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleCreatePO} disabled={creatingPO} className="flex-1 sm:flex-none gap-0">
            {creatingPO
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /><span className="hidden sm:inline">Creating…</span><span className="sm:hidden">…</span></>
              : <><ShoppingCart className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Create PO</span><span className="sm:hidden">PO</span></>
            }
          </Button>
          <Button variant="outline" onClick={() => setShowEditModal(true)} className="flex-1 sm:flex-none">
            <Edit className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Edit Material</span>
            <span className="sm:hidden">Edit</span>
          </Button>
          <Button variant="primary" onClick={handleOpenAdjustment} className="flex-1 sm:flex-none">
            <Edit3 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Adjust Stock</span>
            <span className="sm:hidden">Adjust</span>
          </Button>
        </div>
      </div>

      {/* Material Image, Summary Cards & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Material Image - Spans full height */}
        <div className="lg:row-span-2">
          <Card className="h-full">
            <CardContent className="p-4 h-full flex flex-col">
              {material.image_url ? (
                <div className="flex-1 rounded-lg overflow-hidden">
                  <img
                    src={material.image_url}
                    alt={material.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex-1 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Material Image</h3>
                <p className="text-xs text-gray-400">SKU: {material.sku}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards - Right side, 2 rows of 2 cards */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Box className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Stock</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {material.total_stock.toLocaleString()} <span className="text-sm font-normal uppercase">{material.unit_of_measure}</span>
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
                    <p className="text-sm text-gray-500">Inventory Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₱{((material.total_stock * material.cost_per_unit) / 1000).toFixed(0)}K
                    </p>
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
                    <p className="text-sm text-gray-500">Monthly Consumption</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {material.monthly_consumption.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${material.total_stock <= material.reorder_point ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <AlertTriangle className={`w-6 h-6 ${material.total_stock <= material.reorder_point ? 'text-orange-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reorder Point</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {material.reorder_point.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Material Info & Status - Right side, below KPI cards */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Material Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-gray-900">{material.description ?? '—'}</p>
                {material.brand && (
                  <div className="mt-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Brand</h3>
                    <p className="text-gray-900 font-semibold">{material.brand}</p>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                <div className="space-y-2">
                  <div>
                    <Badge variant={getStatusColor(material.status as MaterialStatus)} className="text-sm">
                      {getStatusLabel(material.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-900">
                    <span className="text-gray-500">Unit:</span> {material.unit_of_measure}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Record Info</h3>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">
                    Created: {material.created_at ? new Date(material.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History ({poHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content - Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(material.specifications) && material.specifications.length > 0 ? (
                <div className="space-y-3">
                  {material.specifications.map((spec, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium text-gray-500">{spec.label}</span>
                      <span className="text-sm text-gray-900">{spec.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No specifications available</p>
              )}
            </CardContent>
          </Card>

          {/* Pricing Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Current Cost/Unit</span>
                  <span className="text-sm font-bold text-gray-900">₱{material.cost_per_unit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Last Purchase Price</span>
                  <span className="text-sm text-gray-900">—</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Average Cost</span>
                  <span className="text-sm text-gray-900">₱{material.cost_per_unit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-gray-500">Total Inventory Value</span>
                  <span className="text-sm font-bold text-green-600">₱{(material.total_stock * material.cost_per_unit).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Monthly Consumption</span>
                  <span className="text-sm text-gray-900">{material.monthly_consumption.toLocaleString()} {material.unit_of_measure}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Yearly Consumption</span>
                  <span className="text-sm text-gray-900">{(material.monthly_consumption * 12).toLocaleString()} {material.unit_of_measure}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Reorder Point</span>
                  <span className="text-sm text-orange-600 font-medium">{material.reorder_point.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-gray-500">Safety Stock</span>
                  <span className="text-sm text-gray-900">{material.safety_stock.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content - History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Purchase Order History
                </CardTitle>
                <Button variant="primary" onClick={handleCreatePO} disabled={creatingPO} className="gap-2">
                  {creatingPO
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    : <><ShoppingCart className="w-4 h-4" /> Create PO</>
                  }
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-red-400" />
                </div>
              ) : poHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-sm font-medium">No purchase orders yet for this material</p>
                  <p className="text-gray-400 text-xs mt-1">Create a PO to track procurement history</p>
                  <Button variant="outline" onClick={handleCreatePO} disabled={creatingPO} className="mt-4 gap-2">
                    {creatingPO ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    Create First PO
                  </Button>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                        <tr>
                          <th className="px-5 py-3 text-left font-medium">PO Number</th>
                          <th className="px-5 py-3 text-left font-medium">Supplier</th>
                          <th className="px-5 py-3 text-left font-medium">Status</th>
                          <th className="px-5 py-3 text-left font-medium">Order Date</th>
                          <th className="px-5 py-3 text-left font-medium">Expected</th>
                          <th className="px-5 py-3 text-right font-medium">Qty Ordered</th>
                          <th className="px-5 py-3 text-right font-medium">Qty Received</th>
                          <th className="px-5 py-3 text-right font-medium">Unit Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {poHistory.map(row => {
                          const po = row.purchase_orders;
                          if (!po) return null;
                          const pct = row.quantity_ordered > 0
                            ? Math.round((row.quantity_received / row.quantity_ordered) * 100)
                            : 0;
                          return (
                            <tr
                              key={row.id}
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => navigate(`/purchase-orders/${po.id}`)}
                            >
                              <td className="px-5 py-3 font-mono text-xs text-indigo-600 font-semibold">{po.po_number}</td>
                              <td className="px-5 py-3 text-gray-900">{po.suppliers?.name ?? '—'}</td>
                              <td className="px-5 py-3">
                                <Badge variant={
                                  po.status === 'Completed' ? 'success' :
                                  po.status === 'Partially Received' ? 'warning' :
                                  po.status === 'Cancelled' ? 'danger' : 'neutral'
                                }>
                                  {po.status}
                                </Badge>
                              </td>
                              <td className="px-5 py-3 text-gray-600 text-xs">
                                {new Date(po.order_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-5 py-3 text-gray-600 text-xs">
                                {po.expected_delivery_date
                                  ? new Date(po.expected_delivery_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                                  : '—'}
                              </td>
                              <td className="px-5 py-3 text-right font-medium text-gray-900">
                                {row.quantity_ordered.toLocaleString()} {row.unit_of_measure ?? material.unit_of_measure}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <span className={pct >= 100 ? 'text-green-600 font-semibold' : pct > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}>
                                  {row.quantity_received.toLocaleString()}
                                </span>
                                <span className="text-gray-400 text-xs ml-1">({pct}%)</span>
                              </td>
                              <td className="px-5 py-3 text-right text-gray-700 font-medium">
                                ₱{row.unit_price.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {poHistory.map(row => {
                      const po = row.purchase_orders;
                      if (!po) return null;
                      const pct = row.quantity_ordered > 0
                        ? Math.round((row.quantity_received / row.quantity_ordered) * 100)
                        : 0;
                      return (
                        <div
                          key={row.id}
                          className="p-4 space-y-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-xs text-indigo-600 font-semibold break-all">{po.po_number}</p>
                              <p className="text-sm font-medium text-gray-900 mt-0.5">{po.suppliers?.name ?? '—'}</p>
                            </div>
                            <Badge variant={
                              po.status === 'Completed' ? 'success' :
                              po.status === 'Partially Received' ? 'warning' :
                              po.status === 'Cancelled' ? 'danger' : 'neutral'
                            }>
                              {po.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-gray-500">Ordered</p>
                              <p className="font-medium text-gray-900">{row.quantity_ordered.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Received</p>
                              <p className={`font-medium ${pct >= 100 ? 'text-green-600' : pct > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {row.quantity_received.toLocaleString()} <span className="text-gray-400">({pct}%)</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Unit Price</p>
                              <p className="font-medium text-gray-700">₱{row.unit_price.toLocaleString()}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 pt-1 border-t">
                            Ordered: {new Date(po.order_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content - Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Usage & Forecast Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Usage History & Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [
                      `${value.toLocaleString()} ${material.unit_of_measure}`,
                      ''
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name="Actual Usage"
                    dot={{ fill: '#EF4444', r: 4 }}
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forecast" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Forecasted Usage"
                    dot={{ fill: '#F59E0B', r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-red-500"></div>
                  <span>Historical Usage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-orange-500 border-dashed"></div>
                  <span>ML Forecast (Next 3 Months)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consumption Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Average Monthly</span>
                    <span className="text-lg font-bold text-gray-900">
                      {material.monthly_consumption.toLocaleString()} {material.unit_of_measure}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Yearly Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      {(material.monthly_consumption * 12).toLocaleString()} {material.unit_of_measure}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Days Until Reorder</span>
                    <span className="text-lg font-bold text-orange-600">
                      {material.monthly_consumption > 0
                        ? Math.max(0, Math.floor((material.total_stock - material.reorder_point) / (material.monthly_consumption / 30)))
                        : '—'} {material.monthly_consumption > 0 ? 'days' : ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Products</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">No linked products</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      <AddMaterialModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        isEditMode={true}
        categoryName={material.category_name ?? ''}
        initialData={{
          id: material.id,
          name: material.name,
          sku: material.sku,
          brand: material.brand ?? '',
          description: material.description ?? '',
          imageUrl: material.image_url ?? '',
          category: material.category_name ?? '',
          unitOfMeasure: material.unit_of_measure,
          costPerUnit: material.cost_per_unit,
          reorderPoint: material.reorder_point,
          specifications: Array.isArray(material.specifications) ? material.specifications : [],
        }}
      />

      {/* Stock Adjustment Modal */}
      {showStockAdjustmentModal && selectedItemForAdjustment && (
        <StockAdjustmentModal
          isOpen={showStockAdjustmentModal}
          onClose={() => {
            setShowStockAdjustmentModal(false);
            setSelectedItemForAdjustment(null);
          }}
          item={selectedItemForAdjustment}
          onAdjust={handleStockAdjustment}
          itemType="raw-material"
        />
      )}
    </div>
  );
}
