import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { StatKpiCard } from '@/src/components/ui/StatKpiCard';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
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
import { computePersistedStockStatus } from '@/src/lib/stockStatus';
import {
  notifyMaterialReorderPointChange,
  overwriteMaterialStock,
  setMaterialBranchQuantity,
  setMaterialTotalStockDirect,
} from '@/src/lib/rawMaterialStock';
import { useMaterialPermissions } from '@/src/lib/permissions/materialPermissions';
import { usePurchaseOrderPermissions } from '@/src/lib/permissions/purchaseOrderPermissions';
import { ModuleAccessDenied } from '@/src/components/permissions/ModuleAccessDenied';
import { EntityNotFound, looksLikeMissingEntityMessage, NOT_FOUND_COPY } from '@/src/components/ui/NotFound';
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
  Download,
  CalendarRange,
  X,
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
import type { EntityActivityLogRow } from '@/src/components/domain/EntityActivityLogCard';
import { EntityActivityLogCard } from '@/src/components/domain/EntityActivityLogCard';
import { insertRawMaterialLog, mapAppRoleToLogRole } from '@/src/lib/domainActivityLog';
import {
  DATE_PERIOD_OPTIONS,
  avgMonthlyUsage,
  inDatePeriodRange,
  lastNMonthSlots,
  monthSlotsBetween,
  periodTriggerLabel,
  resolveDatePeriodQuery,
  todayIsoLocal,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';
import {
  fetchMaterialDetailForExport,
  downloadMaterialDetailWorkbook,
} from '@/src/lib/rawMaterialDetailExport';

import { createDraftPurchaseOrderWithInitialLine } from '@/src/lib/createDraftPurchaseOrder';

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

function MaterialSupplierCatalogueCards({ suppliers }: { suppliers: MaterialSupplierRow[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {suppliers.map(sup => (
        <Link
          key={sup.smId}
          to={`/suppliers/${encodeURIComponent(sup.supplierId)}`}
          title="View supplier"
          className="group rounded-xl border border-indigo-100 bg-white p-4 shadow-sm flex flex-col gap-2 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
        >
          <div className="flex gap-2 items-start">
            <p className="min-w-0 flex-1 text-sm font-semibold text-indigo-900 leading-tight group-hover:underline">
              {sup.name}
            </p>
            <div className="flex shrink-0 flex-col items-end gap-1 self-start">
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
          <p className="text-xs text-gray-500">Listed net price</p>
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
        </Link>
      ))}
    </div>
  );
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
  const { selectedBranch, employeeName, role, session, addAuditLog } = useAppContext();
  const perms = useMaterialPermissions();
  const poPerms = usePurchaseOrderPermissions();
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
  const [materialLogRows, setMaterialLogRows] = useState<EntityActivityLogRow[]>([]);

  const [exportPeriodKind, setExportPeriodKind] = useState<DatePeriodKind>('month');
  const [exportCustomStart, setExportCustomStart] = useState('');
  const [exportCustomEnd, setExportCustomEnd] = useState('');
  const [exportPeriodModalOpen, setExportPeriodModalOpen] = useState(false);
  const [draftExportPeriodKind, setDraftExportPeriodKind] = useState<DatePeriodKind>('month');
  const [draftExportCustomStart, setDraftExportCustomStart] = useState('');
  const [draftExportCustomEnd, setDraftExportCustomEnd] = useState('');
  const [exportingMaterial, setExportingMaterial] = useState(false);

  const fetchMaterialLogs = useCallback(async () => {
    if (!id) return;
    const { data, error: logErr } = await supabase
      .from('raw_material_logs')
      .select('id, action, description, performed_by, performed_by_role, created_at, old_value, new_value, metadata')
      .order('created_at', { ascending: false })
      .limit(150);
    if (logErr) console.warn('[raw_material_logs] fetch failed:', logErr.message);
    setMaterialLogRows((data ?? []) as EntityActivityLogRow[]);
  }, [id]);

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
  useEffect(() => {
    void fetchMaterialLogs();
  }, [fetchMaterialLogs]);

  const exportQueryDates = useMemo(
    () => resolveDatePeriodQuery(exportPeriodKind, exportCustomStart, exportCustomEnd),
    [exportPeriodKind, exportCustomStart, exportCustomEnd],
  );

  const maxExportCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftExportCustomInvalid = Boolean(
    draftExportCustomStart && draftExportCustomEnd && draftExportCustomStart > draftExportCustomEnd,
  );

  const openExportPeriodModal = () => {
    setDraftExportPeriodKind(exportPeriodKind);
    setDraftExportCustomStart(exportCustomStart);
    setDraftExportCustomEnd(exportCustomEnd);
    setExportPeriodModalOpen(true);
  };

  const handleExportPeriodChange = (kind: DatePeriodKind) => {
    setExportPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = todayIsoLocal();
      const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
      setExportCustomStart(start);
      setExportCustomEnd(iso);
    }
  };

  const handleExportModalPresetPick = (kind: DatePeriodKind) => {
    if (kind !== 'custom') {
      handleExportPeriodChange(kind);
      setExportPeriodModalOpen(false);
      return;
    }
    setDraftExportPeriodKind('custom');
    const t = new Date();
    const iso = todayIsoLocal();
    const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
    setDraftExportCustomStart((prev) => prev || exportCustomStart || start);
    setDraftExportCustomEnd((prev) => prev || exportCustomEnd || iso);
  };

  const applyExportModalCustomRange = () => {
    setExportPeriodKind('custom');
    setExportCustomStart(draftExportCustomStart);
    setExportCustomEnd(draftExportCustomEnd);
    setExportPeriodModalOpen(false);
  };

  useEffect(() => {
    if (!exportPeriodModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportPeriodModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exportPeriodModalOpen]);

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
    if ((activeTab === 'overview' || activeTab === 'analytics') && id) fetchAnalyticsLinks();
  }, [activeTab, id, fetchAnalyticsLinks]);

  /** Monthly series from `material_consumption` (BOM / production), for Analytics usage chart. */
  const [consumptionMonthlySeries, setConsumptionMonthlySeries] = useState<MonthlyMovementChartRow[]>([]);
  const [consumptionSeriesLoading, setConsumptionSeriesLoading] = useState(false);
  /** When branch filter returns no points but other sites have BOM consumption, we show all branches and set this true. */
  const [bomUsageAllBranches, setBomUsageAllBranches] = useState(false);

  useEffect(() => {
    if (activeTab !== 'analytics' || !id || exportQueryDates.invalid) return;
    let cancelled = false;
    void (async () => {
      setConsumptionSeriesLoading(true);
      setBomUsageAllBranches(false);
      const bCode = await resolveBranchCode(selectedBranch ?? null);
      if (cancelled) return;
      const periodOpts = {
        dateFrom: exportQueryDates.from,
        dateTo: exportQueryDates.to,
      };
      let rows = await fetchMaterialMonthlyUsageFromConsumption(id, bCode, periodOpts);
      let allBranchFallback = false;
      if (rows.length === 0 && bCode) {
        const allRows = await fetchMaterialMonthlyUsageFromConsumption(id, null, periodOpts);
        if (!cancelled && allRows.length > 0) {
          rows = allRows;
          allBranchFallback = true;
        }
      }
      if (!cancelled) {
        setConsumptionMonthlySeries(rows);
        setBomUsageAllBranches(allBranchFallback);
        setConsumptionSeriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, id, selectedBranch, exportQueryDates.from, exportQueryDates.to, exportQueryDates.invalid]);

  const usageForecastData = useMemo(() => {
    if (!material) {
      return [] as { month: string; actual: number | null; forecast: number | null }[];
    }
    if (consumptionMonthlySeries.length > 0) {
      return consumptionMonthlySeries.map((r) => ({
        month: r.month,
        actual: r.qty,
        forecast: null as number | null,
      }));
    }
    return [];
  }, [material, consumptionMonthlySeries]);

  const usageHasConsumptionData = consumptionMonthlySeries.length > 0;

  /** Analytics summary numbers only from logged BOM consumption in the selected period. */
  const analyticsConsumptionFromBom = useMemo(() => {
    if (!material || consumptionMonthlySeries.length === 0) return null;
    const periodTotal = consumptionMonthlySeries.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const avgMonthly = avgMonthlyUsage(periodTotal, exportQueryDates.from, exportQueryDates.to);
    return { avgMonthly, periodTotal };
  }, [material, consumptionMonthlySeries, exportQueryDates.from, exportQueryDates.to]);

  /** Monthly unit price: PO line averages when present; else catalog cost from activity log (material_updated / cost_synced_from_po). */
  const { priceHistoryData, hasPriceHistory: priceHasPoData } = useMemo(() => {
    if (!material || exportQueryDates.invalid) {
      return { priceHistoryData: [] as { month: string; price: number | null }[], hasPriceHistory: false };
    }

    const pAgg = new Map<string, { sum: number; n: number }>();
    for (const row of poHistory) {
      const od = row.purchase_orders?.order_date;
      if (!od) continue;
      if (!inDatePeriodRange(od, exportQueryDates.from, exportQueryDates.to)) continue;
      const key = od.slice(0, 7);
      const up = Number(row.unit_price) || 0;
      if (up > 0) {
        const cur = pAgg.get(key) || { sum: 0, n: 0 };
        cur.sum += up;
        cur.n += 1;
        pAgg.set(key, cur);
      }
    }

    /** Latest catalog cost in each month from activity log (chronological last wins within the month). */
    const logPriceByMonth = new Map<string, number>();
    const logsChrono = [...materialLogRows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    for (const log of logsChrono) {
      if (log.action !== 'material_updated' && log.action !== 'cost_synced_from_po') continue;
      if (!inDatePeriodRange(log.created_at, exportQueryDates.from, exportQueryDates.to)) continue;
      const nv = log.new_value;
      if (nv == null || typeof nv !== 'object' || Array.isArray(nv)) continue;
      const cpu = Number((nv as Record<string, unknown>).cost_per_unit);
      if (!Number.isFinite(cpu) || cpu <= 0) continue;
      const key = log.created_at.slice(0, 7);
      logPriceByMonth.set(key, Math.round(cpu * 100) / 100);
    }

    const monthSlots =
      exportQueryDates.from && exportQueryDates.to
        ? monthSlotsBetween(exportQueryDates.from, exportQueryDates.to)
        : lastNMonthSlots(18);

    const pRows: { month: string; price: number | null }[] = monthSlots.map(({ ymk, label }) => {
      const ag = pAgg.get(ymk);
      const logP = logPriceByMonth.get(ymk);
      let price: number | null = null;
      if (ag && ag.n > 0) {
        price = Math.round((ag.sum / ag.n) * 100) / 100;
      } else if (logP != null) {
        price = logP;
      }
      return { month: label, price };
    });
    const hasPriceHistory = pRows.some(r => r.price != null);
    if (!hasPriceHistory) {
      return { priceHistoryData: [] as { month: string; price: number | null }[], hasPriceHistory: false };
    }
    const i0 = pRows.findIndex(r => r.price != null);
    if (i0 > 0) pRows.splice(0, i0);

    return {
      priceHistoryData: pRows,
      hasPriceHistory: true,
    };
  }, [material, poHistory, materialLogRows, exportQueryDates.from, exportQueryDates.to, exportQueryDates.invalid]);

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

  useEffect(() => {
    if (activeTab === 'history' && !perms.purchaseOrdersHistory) setActiveTab('overview');
    if (activeTab === 'analytics' && !perms.analyticsAccess) setActiveTab('overview');
  }, [activeTab, perms.purchaseOrdersHistory, perms.analyticsAccess]);

  const handleCreatePO = async () => {
    if (!material) return;
    setCreatingPO(true);
    try {
      let branchId: string | null = null;
      if (selectedBranch) {
        const { data: bd } = await supabase.from('branches').select('id').eq('name', selectedBranch).single();
        branchId = bd?.id ?? null;
      }
      const actor = employeeName || session?.user?.email || 'User';
      const { id } = await createDraftPurchaseOrderWithInitialLine({
        branchId,
        actor,
        roleKey: role,
        materialId: material.id,
        materialName: material.name,
        materialSku: material.sku,
        quantity: 1,
        unitPrice: material.cost_per_unit,
        unitOfMeasure: material.unit_of_measure,
      });
      navigate(`/purchase-orders/${id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create purchase order');
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

  if (!perms.pageAccess) {
    return <ModuleAccessDenied moduleName="Raw Materials" />;
  }

  if (error || !material) {
    const missing = !material || looksLikeMissingEntityMessage(error);
    return (
      <EntityNotFound
        {...NOT_FOUND_COPY.material}
        description={missing ? NOT_FOUND_COPY.material.description : (error ?? NOT_FOUND_COPY.material.description)}
        variant={missing ? 'missing' : 'error'}
        errorDetail={missing ? undefined : error}
        onBack={() => navigate(categoryName ? `/materials/category/${categoryName}` : '/materials')}
        backLabel="Back to Materials"
      />
    );
  }

  const monthlyConsumptionValue = Number(material.monthly_consumption) || 0;
  const hasMonthlyConsumptionData = monthlyConsumptionValue > 0;

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
      currentStock,
      unit: material.unit_of_measure,
      reorderPoint: material.reorder_point,
      status: material.status,
    });
    setShowStockAdjustmentModal(true);
  };

  const handleStockAdjustment = async (adjustment: { type: 'add' | 'subtract'; quantity: number; notes: string }) => {
    if (!material) return;
    const actorName = employeeName || session?.user?.email || 'User';
    const actorRole = mapAppRoleToLogRole(role);
    const prevStock = currentStock;
    const newStock = adjustment.type === 'add'
      ? prevStock + adjustment.quantity
      : Math.max(0, prevStock - adjustment.quantity);
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
          materialId: material.id,
          branchId: resolvedBranchId,
          quantity: newStock,
          reorderPoint: material.reorder_point,
          updateLastRestocked: adjustment.type === 'add',
          triggeredBy,
        });
        persistedTotal = result.totalStock;
      } else {
        await setMaterialTotalStockDirect({
          materialId: material.id,
          totalStock: newStock,
          previousTotalStock: prevStock,
          reorderPoint: material.reorder_point,
          updateLastRestocked: adjustment.type === 'add',
          triggeredBy,
        });
      }

      const newStatus = computePersistedStockStatus(persistedTotal, material.reorder_point);
      void insertRawMaterialLog(supabase, {
        rawMaterialId: material.id,
        action: 'stock_adjusted',
        description: `${adjustment.type === 'add' ? 'Added' : 'Removed'} ${adjustment.quantity} ${material.unit_of_measure} — ${material.sku}${
          selectedBranch ? ` (branch ${selectedBranch})` : ''
        }${adjustment.notes.trim() ? `. ${adjustment.notes.trim()}` : ''}`,
        performedBy: actorName,
        performedByRole: actorRole,
        oldValue: { total_stock: prevStock, branch: selectedBranch ?? null },
        newValue: { total_stock: newStock, status: newStatus, branch: selectedBranch ?? null },
        metadata: { branch_context: selectedBranch ?? null, aggregate_total: persistedTotal },
      });

      void fetchMaterial();
      void fetchMaterialLogs();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to adjust stock';
      throw new Error(msg);
    }
  };

  const handleSaveEdit = async (formData: MaterialFormData) => {
    if (!material) return;
    setSavingEdit(true);
    const actorName = employeeName || session?.user?.email || 'User';
    const actorRole = mapAppRoleToLogRole(role);
    const prevReorderPoint = material.reorder_point;
    try {
      const stockForStatus = currentStock;
      const updatedStatus = computePersistedStockStatus(stockForStatus, formData.reorderPoint);
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

      if (
        perms.stockAccess &&
        formData.currentStock != null &&
        Number(formData.currentStock) !== currentStock
      ) {
        const persistedTotal = await overwriteMaterialStock({
          materialId: material.id,
          branchName: selectedBranch,
          newQuantity: Number(formData.currentStock),
          previousQuantity: currentStock,
          reorderPoint: formData.reorderPoint,
          triggeredBy: `Stock overwritten by ${actorName}${selectedBranch ? ` (branch ${selectedBranch})` : ''}`,
        });
        void insertRawMaterialLog(supabase, {
          rawMaterialId: material.id,
          action: 'stock_adjusted',
          description: `Stock set to ${Number(formData.currentStock)} ${material.unit_of_measure} — ${material.sku}${
            selectedBranch ? ` (branch ${selectedBranch})` : ''
          }`,
          performedBy: actorName,
          performedByRole: actorRole,
          oldValue: { total_stock: currentStock, branch: selectedBranch ?? null },
          newValue: { total_stock: Number(formData.currentStock), branch: selectedBranch ?? null },
          metadata: { branch_context: selectedBranch ?? null, aggregate_total: persistedTotal, overwrite: true },
        });
      }

      // A reorder-point change can flip stock from "above" to "below" the
      // threshold without moving the quantity, so notify in that case too.
      if (prevReorderPoint !== formData.reorderPoint) {
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
          materialId: material.id,
          stock: currentStock,
          oldReorderPoint: prevReorderPoint,
          newReorderPoint: formData.reorderPoint,
          branchId,
          triggeredBy: `Reorder point updated by ${actorName}`,
        }).catch((err) =>
          console.warn('[material-stock-notify] reorder point notify failed', err),
        );
      }
      await insertRawMaterialLog(supabase, {
        rawMaterialId: material.id,
        action: 'material_updated',
        description: `Material details saved for "${formData.name.trim()}".`,
        performedBy: actorName,
        performedByRole: actorRole,
        oldValue: {
          name: material.name,
          sku: material.sku,
          cost_per_unit: material.cost_per_unit,
          reorder_point: material.reorder_point,
          unit_of_measure: material.unit_of_measure,
        },
        newValue: {
          name: formData.name.trim(),
          sku: formData.sku.trim().toUpperCase(),
          cost_per_unit: formData.costPerUnit,
          reorder_point: formData.reorderPoint,
          unit_of_measure: formData.unitOfMeasure,
        },
      });
      setShowEditModal(false);
      await fetchMaterial();
      void fetchMaterialLogs();
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
          {poPerms.creation && (
          <Button variant="outline" onClick={handleCreatePO} disabled={creatingPO} className="flex-1 sm:flex-none gap-0">
            {creatingPO
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /><span className="hidden sm:inline">Creating…</span><span className="sm:hidden">…</span></>
              : <><ShoppingCart className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Create PO</span><span className="sm:hidden">PO</span></>
            }
          </Button>
          )}
          {perms.materialCreation && (
          <Button variant="outline" onClick={() => setShowEditModal(true)} className="flex-1 sm:flex-none">
            <Edit className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Edit Material</span>
            <span className="sm:hidden">Edit</span>
          </Button>
          )}
          {perms.stockAccess && (
          <Button variant="primary" onClick={handleOpenAdjustment} className="flex-1 sm:flex-none">
            <Edit3 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Adjust Stock</span>
            <span className="sm:hidden">Adjust</span>
          </Button>
          )}
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
            <StatKpiCard
              label={selectedBranch ? `Stock (${selectedBranch})` : 'Total Stock'}
              value={perms.stockAccess ? `${currentStock.toLocaleString()} ${material.unit_of_measure}` : '—'}
              tone="blue"
              icon={<Box />}
            />
            {perms.paymentData && (
            <StatKpiCard
              label="Inventory Value"
              value={`₱${((currentStock * material.cost_per_unit) / 1000).toFixed(0)}K`}
              tone="emerald"
              icon={<DollarSign />}
            />
            )}
            {perms.analyticsAccess && (
            <StatKpiCard
              label="Monthly Consumption"
              value={
                hasMonthlyConsumptionData
                  ? `${monthlyConsumptionValue.toLocaleString()} ${material.unit_of_measure}`
                  : '—'
              }
              tone="violet"
              icon={<TrendingUp />}
            />
            )}
            {perms.stockAccess && (
            <StatKpiCard
              label="Reorder Point"
              value={material.reorder_point.toLocaleString()}
              tone={currentStock <= material.reorder_point ? 'amber' : 'teal'}
              icon={<AlertTriangle />}
            />
            )}
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

      {/* Tabs + export controls */}
      <div className="border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
          {perms.purchaseOrdersHistory && (
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
          )}
          {perms.analyticsAccess && (
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
          )}
        </nav>
        {activeTab === 'analytics' && perms.analyticsAccess && (
        <div className="flex flex-wrap items-center gap-2 pb-2 sm:pb-0">
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-gray-300 bg-white max-w-[18rem]"
            aria-haspopup="dialog"
            aria-expanded={exportPeriodModalOpen}
            aria-label="Choose analytics period"
            onClick={openExportPeriodModal}
          >
            <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
            <span className="truncate text-left text-sm font-normal">
              {periodTriggerLabel(exportPeriodKind, exportCustomStart, exportCustomEnd)}
            </span>
          </Button>
          {perms.exportAccess && (
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-gray-300 bg-white"
            disabled={exportingMaterial || loading || !id || exportQueryDates.invalid}
            onClick={async () => {
              if (exportingMaterial || loading || !id || exportQueryDates.invalid) return;
              setExportingMaterial(true);
              try {
                const exported = await fetchMaterialDetailForExport(
                  id,
                  exportQueryDates.displayLabel,
                  exportQueryDates.from,
                  exportQueryDates.to,
                );
                await downloadMaterialDetailWorkbook(exported);
                addAuditLog(
                  'Exported raw material workbook',
                  'Raw Materials',
                  `${exported.materialName} (${exported.sku}) · ${exportQueryDates.displayLabel}`,
                );
              } catch (e) {
                window.alert(e instanceof Error ? e.message : 'Export failed.');
              } finally {
                setExportingMaterial(false);
              }
            }}
          >
            {exportingMaterial ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Download className="w-4 h-4" aria-hidden />
            )}
            {exportingMaterial ? 'Exporting…' : 'Export'}
          </Button>
          )}
        </div>
        )}
      </div>

      {/* Tab Content - Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
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
          {perms.paymentData && (
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
          )}

          {/* Usage Info */}
          {perms.stockAccess && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Monthly Consumption</span>
                  <span className={`text-sm ${hasMonthlyConsumptionData ? 'text-gray-900' : 'text-gray-400'}`}>
                    {hasMonthlyConsumptionData
                      ? `${monthlyConsumptionValue.toLocaleString()} ${material.unit_of_measure}`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Yearly Consumption</span>
                  <span className={`text-sm ${hasMonthlyConsumptionData ? 'text-gray-900' : 'text-gray-400'}`}>
                    {hasMonthlyConsumptionData
                      ? `${(monthlyConsumptionValue * 12).toLocaleString()} ${material.unit_of_measure}`
                      : '—'}
                  </span>
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
          )}
          </div>

          <Card className="border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                Where to order
              </CardTitle>
              <p className="text-xs text-gray-500 font-normal">
                Suppliers you can purchase this raw material from, with pricing and lead times. Manage links on each supplier's page.
              </p>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading suppliers…
                </div>
              ) : materialSuppliers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No suppliers linked to this material yet. Add this material under{' '}
                  <span className="font-medium text-gray-700">Suppliers</span> to show where to order it.
                </p>
              ) : (
                <MaterialSupplierCatalogueCards suppliers={materialSuppliers} />
              )}
            </CardContent>
          </Card>

          <EntityActivityLogCard
            logs={materialLogRows}
            emptyHint="No activity recorded yet. Edits, stock adjustments, and PO price sync events appear here."
          />
        </div>
      )}

      {/* Tab Content - History */}
      {activeTab === 'history' && perms.purchaseOrdersHistory && (
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
                {poPerms.creation && (
                <Button variant="primary" onClick={handleCreatePO} disabled={creatingPO} className="gap-2">
                  {creatingPO
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    : <><ShoppingCart className="w-4 h-4" /> Create PO</>
                  }
                </Button>
                )}
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
                  {poPerms.creation && (
                  <Button variant="outline" onClick={handleCreatePO} disabled={creatingPO} className="mt-4 gap-2">
                    {creatingPO ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    Create First PO
                  </Button>
                  )}
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
                                className={poPerms.pageAccess ? 'hover:bg-gray-50 cursor-pointer' : undefined}
                                onClick={poPerms.pageAccess ? () => navigate(`/purchase-orders/${po.id}`) : undefined}
                              >
                                <td className="px-5 py-3 font-mono text-xs text-indigo-600 font-semibold">{po.po_number}</td>
                                <td className="px-5 py-3 text-gray-900">{po.suppliers?.name ?? '—'}</td>
                                <td className="px-5 py-3 text-center align-middle">
                                  <Badge variant={
                                    po.status === 'Completed' ? 'success' :
                                    po.status === 'Received' ? 'default' :
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
                            className={poPerms.pageAccess ? 'p-4 space-y-3 cursor-pointer hover:bg-gray-50' : 'p-4 space-y-3'}
                            onClick={poPerms.pageAccess ? () => navigate(`/purchase-orders/${po.id}`) : undefined}
                          >
                            <div className="space-y-2">
                              <div className="min-w-0">
                                <p className="font-mono text-xs text-indigo-600 font-semibold break-all">{po.po_number}</p>
                                <p className="text-sm font-medium text-gray-900 mt-0.5">{po.suppliers?.name ?? '—'}</p>
                              </div>
                              <div className="flex justify-center">
                                <Badge variant={
                                  po.status === 'Completed' ? 'success' :
                                  po.status === 'Received' ? 'default' :
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
      {activeTab === 'analytics' && perms.analyticsAccess && (
        <div className="space-y-6">
          {/* Usage history: BOM consumption (material_consumption) only */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Usage History
              </CardTitle>
              {usageHasConsumptionData ? (
                <p className="text-xs text-gray-500 font-normal mt-1">
                  Monthly <strong>BOM consumption</strong> for{' '}
                  <strong>{exportQueryDates.displayLabel}</strong>
                  {bomUsageAllBranches && selectedBranch
                    ? ` — showing all branches (no rows tagged for ${selectedBranch} in this period).`
                    : selectedBranch
                      ? ` · filtered to site code for ${selectedBranch}.`
                      : ' · all branches.'}
                </p>
              ) : !consumptionSeriesLoading ? (
                <p className="text-xs text-gray-500 font-normal mt-1">
                  BOM usage appears after production posts <strong>material_consumption</strong> for this material. If your
                  plant uses another branch in the header, totals may include all sites when none match the filter.
                </p>
              ) : null}
            </CardHeader>
            <CardContent>
              {consumptionSeriesLoading ? (
                <div className="flex h-[350px] items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : usageForecastData.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center px-4 py-12 text-center text-sm text-gray-500">
                  No BOM consumption data yet.
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
                  Monthly <strong>average</strong> unit price for{' '}
                  <strong>{exportQueryDates.displayLabel}</strong> from purchase orders when available; otherwise the
                  catalog <strong>unit cost</strong> recorded in the activity log for that month.
                </p>
              ) : null}
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex h-[300px] items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : !priceHasPoData ? (
                <div className="flex min-h-[220px] items-center justify-center px-4 py-12 text-center text-sm text-gray-500">
                  No purchase order or activity-log price history yet.
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
                      dot={{ fill: '#3B82F6', r: 3 }}
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
                    <span className={`text-lg font-bold ${analyticsConsumptionFromBom ? 'text-gray-900' : 'text-gray-400 font-normal'}`}>
                      {analyticsConsumptionFromBom
                        ? `${analyticsConsumptionFromBom.avgMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${material.unit_of_measure}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Period Total</span>
                    <span className={`text-lg font-bold ${analyticsConsumptionFromBom ? 'text-gray-900' : 'text-gray-400 font-normal'}`}>
                      {analyticsConsumptionFromBom
                        ? `${analyticsConsumptionFromBom.periodTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${material.unit_of_measure}`
                        : '—'}
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
                Suppliers that list this material, with pricing and lead times from the Suppliers page.
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
                <MaterialSupplierCatalogueCards suppliers={materialSuppliers} />
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
          currentStock,
          specifications: Array.isArray(material.specifications) ? material.specifications : [],
        }}
        showStockOverwrite={perms.stockAccess}
        showCostFields={perms.materialCreation}
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

      <PortalModalOverlay
        open={exportPeriodModalOpen}
        onClose={() => setExportPeriodModalOpen(false)}
        mobileBottomSheet
      >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="material-export-period-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="material-export-period-modal-title" className="text-lg font-semibold text-gray-900">
                Export period
              </h2>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
                onClick={() => setExportPeriodModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Choose a preset or custom range. Purchase orders, price history, and consumption are filtered by this period. Current material details are always included.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DATE_PERIOD_OPTIONS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleExportModalPresetPick(kind)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      draftExportPeriodKind === kind
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draftExportPeriodKind === 'custom' && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                    <input
                      type="date"
                      value={draftExportCustomStart}
                      max={maxExportCustomDate}
                      onChange={(e) => setDraftExportCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftExportCustomEnd}
                      min={draftExportCustomStart || undefined}
                      max={maxExportCustomDate}
                      onChange={(e) => setDraftExportCustomEnd(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {draftExportCustomInvalid && (
                    <p className="text-xs text-red-600">Start must be on or before end.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 bg-white"
                onClick={() => setExportPeriodModalOpen(false)}
              >
                Cancel
              </Button>
              {draftExportPeriodKind === 'custom' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={draftExportCustomInvalid}
                  onClick={applyExportModalCustomRange}
                >
                  Apply range
                </Button>
              )}
            </div>
          </div>
      </PortalModalOverlay>
    </div>
  );
}
