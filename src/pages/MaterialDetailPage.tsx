import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import { useAppContext } from '@/src/store/AppContext';
import StockAdjustmentModal from '@/src/components/warehouse/StockAdjustmentModal';
import AddMaterialModal, { MaterialFormData } from '@/src/components/materials/AddMaterialModal';
import { supabase } from '@/src/lib/supabase';
import {
  fetchMaterialMonthlyUsageFromConsumption,
  resolveBranchCode,
  type MonthlyMovementChartRow,
} from '@/src/lib/warehouseMovementsData';
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
  Link2,
  Building2,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
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
  ResponsiveContainer,
} from 'recharts';
import type { MaterialStatus } from '@/src/types/materials';

const poLogRoleMap: Record<string, string> = {
  Executive:  'Admin',
  Agent:      'Agent',
  Warehouse:  'Warehouse Staff',
  Logistics:  'Logistics',
  Driver:     'Logistics',
};

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
  const { selectedBranch, employeeName, role, session } = useAppContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'analytics'>('overview');

  // PO creation
  const [creatingPO, setCreatingPO]   = useState(false);
  // PO history
  const [poHistory, setPOHistory]     = useState<POHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySortKey, setHistorySortKey] = useState<string>('order_date');
  const [historySortDir, setHistorySortDir] = useState<'asc' | 'desc'>('desc');
  const [historyTablePage, setHistoryTablePage] = useState(1);
  /** '' = all PO statuses in purchase order history */
  const [headerPoHistoryStatusFilter, setHeaderPoHistoryStatusFilter] = useState('');

  interface LinkedVariantRow {
    pvrId: string;
    quantityNeeded: number;
    uom: string | null;
    variantId: string;
    sku: string;
    size: string;
    productId: string;
    productName: string;
    categorySlug: string | null;
  }
  interface MaterialSupplierRow {
    smId: string;
    unitPrice: number;
    leadTimeDays: number;
    minOrderQty: number;
    isCatalogPreferred: boolean;
    supplierId: string;
    name: string;
    paymentTerms: string | null;
    supplierPreferred: boolean;
    status: string;
  }
  const [linkedVariants, setLinkedVariants]   = useState<LinkedVariantRow[]>([]);
  const [materialSuppliers, setMaterialSuppliers] = useState<MaterialSupplierRow[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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
    if (activeTab === 'history' || activeTab === 'analytics') fetchPOHistory();
  }, [activeTab, fetchPOHistory]);

  const fetchAnalyticsLinks = useCallback(async () => {
    if (!id) return;
    setAnalyticsLoading(true);
    try {
      const [pvrRes, smRes] = await Promise.all([
        supabase
          .from('product_variant_raw_materials')
          .select(
            'id, quantity_needed, unit_of_measure, product_variants!inner ( id, sku, size, products!inner ( id, name, product_categories ( slug, name ) ) )',
          )
          .eq('raw_material_id', id),
        supabase
          .from('supplier_materials')
          .select(
            'id, unit_price, lead_time_days, min_order_qty, is_preferred, suppliers!inner ( id, name, payment_terms, preferred_supplier, status )',
          )
          .eq('material_id', id)
          .order('is_preferred', { ascending: false })
          .order('unit_price', { ascending: true }),
      ]);

      if (!pvrRes.error && pvrRes.data) {
        const rows: LinkedVariantRow[] = (pvrRes.data as unknown as Array<{
          id: string;
          quantity_needed: number;
          unit_of_measure: string | null;
          product_variants: {
            id: string;
            sku: string;
            size: string;
            products: {
              id: string;
              name: string;
              product_categories: { slug: string; name: string } | null;
            } | null;
          } | null;
        }>).map(row => {
          const pv = row.product_variants;
          const p  = pv?.products;
          return {
            pvrId:         row.id,
            quantityNeeded: Number(row.quantity_needed),
            uom:           row.unit_of_measure,
            variantId:     pv?.id ?? '',
            sku:           pv?.sku ?? '',
            size:          pv?.size ?? '',
            productId:     p?.id ?? '',
            productName:   p?.name ?? '—',
            categorySlug:  p?.product_categories?.slug ?? null,
          };
        });
        setLinkedVariants(rows);
      } else {
        setLinkedVariants([]);
        if (pvrRes.error && import.meta.env.DEV) console.warn('[linked variants]', pvrRes.error.message);
      }

      if (!smRes.error && smRes.data) {
        setMaterialSuppliers(
          (smRes.data as unknown as Array<{
            id: string;
            unit_price: number;
            lead_time_days: number;
            min_order_qty: number;
            is_preferred: boolean;
            suppliers: {
              id: string;
              name: string;
              payment_terms: string;
              preferred_supplier: boolean;
              status: string;
            } | null;
          }>).map(r => {
            const s = r.suppliers;
            return {
              smId: r.id,
              unitPrice:       Number(r.unit_price),
              leadTimeDays:    r.lead_time_days,
              minOrderQty:     Number(r.min_order_qty),
              isCatalogPreferred: r.is_preferred,
              supplierId:   s?.id ?? '',
              name:           s?.name ?? '—',
              paymentTerms:   s?.payment_terms ?? null,
              supplierPreferred: s?.preferred_supplier ?? false,
              status:         s?.status ?? 'Active',
            };
          }),
        );
      } else {
        setMaterialSuppliers([]);
        if (smRes.error && import.meta.env.DEV) console.warn('[material suppliers]', smRes.error.message);
      }
    } finally {
      setAnalyticsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'analytics' && id) fetchAnalyticsLinks();
  }, [activeTab, id, fetchAnalyticsLinks]);

  /** Monthly series from `material_consumption` (BOM / production), for Analytics usage chart. */
  const [consumptionMonthlySeries, setConsumptionMonthlySeries] = useState<MonthlyMovementChartRow[]>([]);
  const [consumptionSeriesLoading, setConsumptionSeriesLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'analytics' || !id) return;
    let cancelled = false;
    void (async () => {
      setConsumptionSeriesLoading(true);
      const bCode = await resolveBranchCode(selectedBranch ?? null);
      if (cancelled) return;
      const rows = await fetchMaterialMonthlyUsageFromConsumption(id, bCode);
      if (!cancelled) {
        setConsumptionMonthlySeries(rows);
        setConsumptionSeriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, id, selectedBranch]);

  const usageForecastData = useMemo(() => {
    if (!material) {
      return [] as { month: string; actual: number | null; forecast: number | null }[];
    }
    const y = new Date().getFullYear();
    const m0 = new Date().getMonth();
    const mLab = (d: Date) => d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });

    if (consumptionMonthlySeries.length > 0) {
      return consumptionMonthlySeries.map((r) => ({
        month: r.month,
        actual: r.qty,
        forecast: null as number | null,
      }));
    }

    const uRows: { month: string; actual: number | null; forecast: number | null }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(y, m0 - 11 + i, 1);
      const t = 0.72 + 0.02 * (i % 5) + 0.01 * i;
      uRows.push({ month: mLab(d), actual: material.monthly_consumption * t, forecast: null });
    }
    return uRows;
  }, [material, consumptionMonthlySeries]);

  const usageHasConsumptionData = consumptionMonthlySeries.length > 0;

  /** Price = monthly avg unit price from PO lines (unchanged). */
  const { priceHistoryData, priceHasPoData } = useMemo(() => {
    if (!material) {
      return { priceHistoryData: [] as { month: string; price: number | null }[], priceHasPoData: false };
    }

    const pAgg = new Map<string, { sum: number; n: number }>();
    for (const row of poHistory) {
      const od = row.purchase_orders?.order_date;
      if (!od) continue;
      const key = od.slice(0, 7);
      const up = Number(row.unit_price) || 0;
      if (up > 0) {
        const cur = pAgg.get(key) || { sum: 0, n: 0 };
        cur.sum += up;
        cur.n += 1;
        pAgg.set(key, cur);
      }
    }

    const y = new Date().getFullYear();
    const m0 = new Date().getMonth();
    const mKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mLab = (d: Date) => d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });

    const pRows: { month: string; price: number | null }[] = [];
    for (let k = 17; k >= 0; k--) {
      const d = new Date(y, m0 - k, 1);
      const key = mKey(d);
      const ag = pAgg.get(key);
      pRows.push({
        month: mLab(d),
        price: ag && ag.n > 0 ? Math.round((ag.sum / ag.n) * 100) / 100 : null,
      });
    }
    const priceFromPo = pRows.some(r => r.price != null);
    if (!priceFromPo && material.cost_per_unit > 0) {
      for (let i = 0; i < pRows.length; i++) {
        pRows[i].price = material.cost_per_unit;
      }
    } else if (priceFromPo) {
      const i0 = pRows.findIndex(r => r.price != null);
      if (i0 > 0) pRows.splice(0, i0);
    }
    if (!priceFromPo && material.cost_per_unit > 0 && pRows.length > 12) {
      pRows.splice(0, pRows.length - 12);
    }

    return {
      priceHistoryData: pRows,
      priceHasPoData: priceFromPo,
    };
  }, [material, poHistory]);

  const handleHistorySort = (key: string) => {
    if (historySortKey === key) {
      setHistorySortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setHistorySortKey(key);
      setHistorySortDir('asc');
    }
  };

  const historySortIcon = (col: string) => {
    if (historySortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return historySortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline text-red-600" />
      : <ArrowDown className="w-3 h-3 ml-1 inline text-red-600" />;
  };

  const distinctPoHistoryStatuses = useMemo(() => {
    const s = new Set(
      poHistory
        .filter((r) => r.purchase_orders)
        .map((r) => r.purchase_orders!.status)
        .filter(Boolean)
    );
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [poHistory]);

  const historyRowsMatchingFilters = useMemo(() => {
    const valid = poHistory.filter(
      (r): r is POHistoryRow & { purchase_orders: NonNullable<POHistoryRow['purchase_orders']> } => r.purchase_orders != null
    );
    if (headerPoHistoryStatusFilter === '') return valid;
    return valid.filter((r) => r.purchase_orders.status === headerPoHistoryStatusFilter);
  }, [poHistory, headerPoHistoryStatusFilter]);

  const sortedPoHistory = useMemo(() => {
    const valid = historyRowsMatchingFilters;
    const cmp = (a: string | number, b: string | number) => {
      if (typeof a === 'number' && typeof b === 'number') {
        if (a < b) return historySortDir === 'asc' ? -1 : 1;
        if (a > b) return historySortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(a);
      const bs = String(b);
      if (as < bs) return historySortDir === 'asc' ? -1 : 1;
      if (as > bs) return historySortDir === 'asc' ? 1 : -1;
      return 0;
    };
    return [...valid].sort((a, b) => {
      const poa = a.purchase_orders;
      const pob = b.purchase_orders;
      if (!poa || !pob) return 0;
      let av: string | number;
      let bv: string | number;
      switch (historySortKey) {
        case 'po_number': av = poa.po_number; bv = pob.po_number; break;
        case 'supplier': av = poa.suppliers?.name ?? ''; bv = pob.suppliers?.name ?? ''; break;
        case 'status': av = poa.status; bv = pob.status; break;
        case 'order_date': av = poa.order_date; bv = pob.order_date; break;
        case 'expected': av = poa.expected_delivery_date ?? ''; bv = pob.expected_delivery_date ?? ''; break;
        case 'qty_ordered': av = a.quantity_ordered; bv = b.quantity_ordered; break;
        case 'qty_received': av = a.quantity_received; bv = b.quantity_received; break;
        case 'unit_price': av = a.unit_price; bv = b.unit_price; break;
        default: av = poa.order_date; bv = pob.order_date;
      }
      return cmp(av, bv);
    });
  }, [historyRowsMatchingFilters, historySortKey, historySortDir]);

  const historyTotalPages = Math.max(1, Math.ceil(sortedPoHistory.length / TABLE_PAGE_SIZE) || 1);
  const pagedPoHistory = useMemo(() => {
    const p = Math.min(historyTablePage, historyTotalPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedPoHistory.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedPoHistory, historyTablePage, historyTotalPages]);

  useEffect(() => {
    if (historyTablePage > historyTotalPages) setHistoryTablePage(historyTotalPages);
  }, [historyTablePage, historyTotalPages]);

  useEffect(() => {
    setHeaderPoHistoryStatusFilter('');
  }, [id]);

  useEffect(() => {
    setHistoryTablePage(1);
  }, [id, poHistory.length, headerPoHistoryStatusFilter]);

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
      const actor    = employeeName || session?.user?.email || 'User';
      const { data: poData, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          po_number:    poNumber,
          branch_id:    branchId,
          status:       'Requested',
          order_date:   new Date().toISOString().split('T')[0],
          total_amount: material.cost_per_unit,
          created_by:   actor,
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
      const logRole = poLogRoleMap[role] ?? 'System';
      const { error: logErr } = await supabase.from('purchase_order_logs').insert({
        order_id:         poData.id,
        action:           'requested',
        performed_by:     actor,
        performed_by_role: logRole,
        description:     `Purchase order requested from material screen (${material.name})`,
        metadata:         { po_number: poNumber, material_id: material.id, material_sku: material.sku },
      });
      if (logErr && import.meta.env.DEV) console.warn('[PO request log]', logErr.message);
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
        .update({
          total_stock: newTotal,
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(adjustment.type === 'add'
            ? { last_restock_date: new Date().toISOString().split('T')[0] }
            : {}),
        })
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
            History
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
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  <ClipboardList className="w-5 h-5" />
                  <span>Purchase Order History</span>
                  <span className="text-base font-medium text-gray-500 tabular-nums">
                    ({historyRowsMatchingFilters.length})
                  </span>
                </CardTitle>
                <Button variant="primary" onClick={handleCreatePO} disabled={creatingPO} className="gap-2">
                  {creatingPO
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    : <><ShoppingCart className="w-4 h-4" /> Create PO</>
                  }
                </Button>
              </div>
              {!historyLoading && poHistory.length > 0 && (
                <div className="md:hidden mt-3">
                  <select
                    aria-label="Filter by PO status"
                    value={headerPoHistoryStatusFilter}
                    onChange={(e) => setHeaderPoHistoryStatusFilter(e.target.value)}
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                  >
                    <option value="">Status</option>
                    {distinctPoHistoryStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
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
                          <th onClick={() => handleHistorySort('po_number')} className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                            <span className="inline-flex items-center">PO Number{historySortIcon('po_number')}</span>
                          </th>
                          <th onClick={() => handleHistorySort('supplier')} className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                            <span className="inline-flex items-center">Supplier{historySortIcon('supplier')}</span>
                          </th>
                          <th className="px-3 py-3 text-center font-medium align-top min-w-[8.5rem] max-w-[12rem]">
                            <div className="normal-case flex justify-center">
                              <select
                                aria-label="Filter by PO status"
                                value={headerPoHistoryStatusFilter}
                                onChange={(e) => setHeaderPoHistoryStatusFilter(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-[10rem] text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                              >
                                <option value="">Status</option>
                                {distinctPoHistoryStatuses.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          </th>
                          <th onClick={() => handleHistorySort('order_date')} className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                            <span className="inline-flex items-center">Order Date{historySortIcon('order_date')}</span>
                          </th>
                          <th onClick={() => handleHistorySort('expected')} className="px-5 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                            <span className="inline-flex items-center">Expected{historySortIcon('expected')}</span>
                          </th>
                          <th onClick={() => handleHistorySort('qty_ordered')} className="px-5 py-3 text-right font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                            <span className="inline-flex items-center justify-end w-full">Qty Ordered{historySortIcon('qty_ordered')}</span>
                          </th>
                          <th onClick={() => handleHistorySort('qty_received')} className="px-5 py-3 text-right font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                            <span className="inline-flex items-center justify-end w-full">Qty Received{historySortIcon('qty_received')}</span>
                          </th>
                          <th onClick={() => handleHistorySort('unit_price')} className="px-5 py-3 text-right font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                            <span className="inline-flex items-center justify-end w-full">Unit Price{historySortIcon('unit_price')}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {historyRowsMatchingFilters.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">
                              No purchase orders match the selected status. Choose <span className="font-medium text-gray-700">Status</span> to show all.
                            </td>
                          </tr>
                        ) : (
                          pagedPoHistory.map(row => {
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
                                <td className="px-5 py-3 text-center align-middle">
                                  <Badge variant={
                                    po.status === 'Completed' ? 'success' :
                                    po.status === 'Partially Received' ? 'warning' :
                                    po.status === 'Requested' ? 'warning' :
                                    po.status === 'Rejected' || po.status === 'Cancelled' ? 'danger' :
                                    po.status === 'Accepted' ? 'default' : 'neutral'
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
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {historyRowsMatchingFilters.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500">
                        No purchase orders match the selected status. Choose <span className="font-medium text-gray-700">Status</span> to show all.
                      </div>
                    ) : (
                      pagedPoHistory.map(row => {
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
                            <div className="space-y-2">
                              <div className="min-w-0">
                                <p className="font-mono text-xs text-indigo-600 font-semibold break-all">{po.po_number}</p>
                                <p className="text-sm font-medium text-gray-900 mt-0.5">{po.suppliers?.name ?? '—'}</p>
                              </div>
                              <div className="flex justify-center">
                                <Badge variant={
                                  po.status === 'Completed' ? 'success' :
                                  po.status === 'Partially Received' ? 'warning' :
                                  po.status === 'Requested' ? 'warning' :
                                  po.status === 'Rejected' || po.status === 'Cancelled' ? 'danger' :
                                  po.status === 'Accepted' ? 'default' : 'neutral'
                                }>
                                  {po.status}
                                </Badge>
                              </div>
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
                      })
                    )}
                  </div>

                  {historyRowsMatchingFilters.length > 0 && (
                    <TablePagination
                      page={historyTablePage}
                      total={sortedPoHistory.length}
                      onPageChange={setHistoryTablePage}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content - Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Usage history: BOM consumption (material_consumption); fallback model from monthly_consumption */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Usage History
              </CardTitle>
              {usageHasConsumptionData ? (
                <p className="text-xs text-gray-500 font-normal mt-1">
                  Monthly <strong>BOM consumption</strong> (production and finished-good stock adds).{' '}
                  {selectedBranch ? 'Uses the selected branch only.' : null}
                </p>
              ) : (
                <p className="text-xs text-amber-800/90 font-normal mt-1 bg-amber-50/80 border border-amber-100 rounded-lg px-2 py-1.5">
                  No BOM consumption logged yet for this material — showing a <strong>model trend</strong> from the
                  material&apos;s monthly consumption field. Usage appears after production runs or finished-good stock
                  adds that apply BOM deductions.
                </p>
              )}
            </CardHeader>
            <CardContent>
              {consumptionSeriesLoading ? (
                <div className="flex h-[350px] items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={usageForecastData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} minTickGap={28} height={32} />
                      <YAxis tick={{ fontSize: 11 }} width={52} tickFormatter={v => Number(v).toLocaleString()} />
                      <Tooltip
                        formatter={(value: number | string, name: string) => {
                          if (value == null || value === '') return ['—', name];
                          const n = typeof value === 'number' ? value : parseFloat(String(value));
                          if (Number.isNaN(n)) return ['—', name];
                          return [`${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${material.unit_of_measure}`, name];
                        }}
                      />
                      <Line
                        type="linear"
                        dataKey="actual"
                        stroke="#d97706"
                        strokeWidth={2}
                        name="Consumed (BOM)"
                        dot={{ fill: '#d97706', r: 2 }}
                        activeDot={{ r: 4 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-0.5 bg-amber-600" />
                      <span>Consumed (BOM / production)</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Unit price history — from PO line prices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Unit price history
              </CardTitle>
              {priceHasPoData ? (
                <p className="text-xs text-gray-500 font-normal mt-1">
                  Monthly <strong>average</strong> unit price from purchase order lines for this material.
                </p>
              ) : (
                <p className="text-xs text-gray-500 font-normal mt-1">
                  <strong>Unit cost</strong> from this record until PO line prices fill in the chart.
                </p>
              )}
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex h-[300px] items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={priceHistoryData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} minTickGap={28} height={32} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      width={56}
                      tickFormatter={v => `₱${Number(v).toLocaleString()}`}
                    />
                    <Tooltip
                      formatter={(value: number | string) => {
                        if (value == null || value === '') return ['—', 'Price'];
                        const n = typeof value === 'number' ? value : parseFloat(String(value));
                        if (Number.isNaN(n)) return ['—', 'Price'];
                        return [`₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Avg unit price'];
                      }}
                    />
                    <Line
                      type="linear"
                      dataKey="price"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="Avg unit price"
                      dot={priceHasPoData ? { fill: '#3B82F6', r: 3 } : false}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-500" />
                  Linked Products
                </CardTitle>
                <p className="text-xs text-gray-500 font-normal">
                  Product variants that include this material in their consumption (BOM) per unit.
                </p>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                ) : linkedVariants.length === 0 ? (
                  <p className="text-sm text-gray-500">No product variants use this material in their bill of materials yet.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {linkedVariants.map(row => {
                      const cat = row.categorySlug || 'uncategorized';
                      const toProduct = () =>
                        navigate(`/products/category/${encodeURIComponent(cat)}/family/${row.productId}`);
                      return (
                        <button
                          key={row.pvrId}
                          type="button"
                          onClick={toProduct}
                          className="w-full text-left p-3 rounded-lg border border-gray-100 bg-gray-50/80 hover:border-indigo-200 hover:bg-indigo-50/60 transition-colors flex items-start justify-between gap-2 group"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-800">
                              {row.productName}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              <span className="font-mono text-gray-600">{row.sku}</span>
                              {' · '}
                              {row.size}
                            </p>
                            <p className="text-xs text-indigo-600 mt-1">
                              {row.quantityNeeded.toLocaleString()}{' '}
                              {row.uom || material.unit_of_measure} / unit
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 flex-shrink-0 mt-0.5" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Existing suppliers
              </CardTitle>
              <p className="text-xs text-gray-500 font-normal">
                Suppliers that list this material in your catalogue (pricing & lead times from the Suppliers page).
              </p>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </div>
              ) : materialSuppliers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No suppliers linked to this material yet. Add links under{' '}
                  <span className="font-medium text-gray-700">Suppliers</span> to see who can supply it.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {materialSuppliers.map(sup => (
                    <div
                      key={sup.smId}
                      role="link"
                      tabIndex={0}
                      title="View supplier in Suppliers"
                      onClick={() => navigate(`/suppliers?supplier=${encodeURIComponent(sup.supplierId)}`)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/suppliers?supplier=${encodeURIComponent(sup.supplierId)}`);
                        }
                      }}
                      className="group rounded-xl border border-indigo-100 bg-white p-4 shadow-sm flex flex-col gap-2 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-indigo-900 leading-tight group-hover:underline">
                          {sup.name}
                        </p>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {sup.isCatalogPreferred && (
                            <Badge variant="default" className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                              Cat. preferred
                            </Badge>
                          )}
                          {sup.supplierPreferred && (
                            <Badge variant="default" className="text-[10px] bg-slate-100 text-slate-700">
                              Preferred supplier
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Listed net price (catalogue)</p>
                      <p className="text-lg font-bold text-indigo-700">₱{sup.unitPrice.toLocaleString()}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-gray-100">
                        <div>
                          <span className="text-gray-400 block">Lead time</span>
                          <span className="font-medium">{sup.leadTimeDays} days</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Min. order</span>
                          <span className="font-medium">{sup.minOrderQty.toLocaleString()}</span>
                        </div>
                        {sup.paymentTerms && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Est. terms / delivery</span>
                            <span className="ml-1 font-medium text-gray-800">{sup.paymentTerms}</span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded ${sup.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {sup.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
