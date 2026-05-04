import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAppContext } from '../store/AppContext';
import ImageGalleryModal from '../components/ImageGalleryModal';
import StockAdjustmentModal from '../components/warehouse/StockAdjustmentModal';
import ProductStockAdjustmentModal from '../components/products/ProductStockAdjustmentModal';
import RawMaterialPickerModal from '../components/products/RawMaterialPickerModal';
import {
  Package, ArrowLeft, AlertTriangle, ShoppingCart, Truck, Factory,
  Ruler, Weight, Info, TrendingUp, Calendar, BarChart3,
  Table as TableIcon, Edit, CheckCircle2, Lightbulb,
  Save, X, Plus, Trash2, ChevronLeft, ChevronRight, Edit3, Loader2,
} from 'lucide-react';

import hdpePipeImg    from '../assets/product-images/HDPE Pipe.webp';
import pipesImg       from '../assets/product-images/Pipes.webp';
import pressureLineImg from '../assets/product-images/Pressure Line Pipe.webp';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { computeStockStatus } from '../lib/stockStatus';
import { createDraftProductionRequestWithInitialLine } from '../lib/productionRequestDraft';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 70%, 50%)`;
};

const pesoFmt2 = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** BOM line cost: qty × cost per unit of measure (e.g. 0.01 kg × ₱100/kg = ₱1). */
function bomLineMaterialCost(quantity: number, costPerUnit: number): number {
  const q = Number(quantity);
  const u = Number(costPerUnit);
  if (!Number.isFinite(q) || !Number.isFinite(u)) return 0;
  return q * u;
}

/** Order line rows tied to these are omitted from the variant comparison sales chart. */
const CHART_EXCLUDED_ORDER_STATUSES = new Set<string>(['Cancelled', 'Rejected', 'Draft']);

// â”€â”€ UI-facing variant shape (matches the original mock structure) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface DisplayVariant {
  id: string;
  variantName: string;
  sku: string;
  size: string;
  /** Numeric string: kg per inventory unit (stick, bundle, piece—same as stock unit) */
  length: string;
  weight: string;
  /** Numeric string: m³ per inventory unit (shipping/stowage) */
  volumeCbm: string;
  thickness: string;
  pressure: string;
  stock: number;
  reorderPoint: number;
  price: number;
  cost: number;
  monthlyUsage: number;
  unitsSold: number;
  /** Sum of line revenue for this variant year-to-date (from DB). */
  revenueYtd: number;
  status: string;
  monthlyProductionQuota: number;
  currentMonthProduced: number;
  leadTimeDays: number;
  minOrderQty: number;
  specs: { label: string; value: string }[];
  /** `cost` = material master `cost_per_unit` (e.g. ₱ per kg). Line cost = quantity × cost. */
  rawMaterials: { materialId: string; name: string; quantity: number; unit: string; cost: number }[];
  bulkDiscounts: { minQty: number; discount: number; pricePerUnit: number }[];
}

// â”€â”€ DB row shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface VariantRow {
  id: string;
  sku: string;
  size: string;
  unit_price: number;
  cost_price: number | null;
  total_stock: number;
  reorder_point: number;
  status: string;
  units_sold_ytd: number;
  revenue_ytd: number;
  weight_kg: number | null;
  length_m: number | null;
  volume_cbm: number | null;
  wall_thickness_mm: number | null;
  lead_time_days: number | null;
  min_order_qty: number | null;
  specs: { label: string; value: string }[] | null;
  product_variant_stock: { quantity: number; branches: { code: string; name: string } | null }[];
  product_bulk_discounts?: { min_qty: number; max_qty: number | null; discount_percent: number }[];
  product_variant_raw_materials: { raw_material_id: string; quantity_needed: number; raw_materials: { name: string; unit_of_measure: string; cost_per_unit: number } | null }[];
}

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  images: string[] | null;
  status: string;
  branch: string | null;
  product_categories: { name: string } | null;
}

function normalizeBranchKey(label: string): string {
  const m = label.trim().toLowerCase().match(/[a-z]{2,}/);
  return m ? m[0] : '';
}

/** Stock from `product_variant_stock` only — never `total_stock` (avoids wrong branch aggregate). */
function resolveBranchStockQuantity(
  stockRows: { quantity: number; branches: { code?: string; name: string } | null }[],
  branchLabel: string,
): number {
  const rows = Array.isArray(stockRows) ? stockRows : [];
  if (!branchLabel.trim()) {
    return rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  }

  const b = branchLabel.trim().toLowerCase();
  const exact = rows.find(s => (s.branches?.name ?? '').toLowerCase() === b);
  if (exact) return Number(exact.quantity);

  const key = normalizeBranchKey(branchLabel);
  if (!key) return 0;

  const loose = rows.find(s => {
    const n = (s.branches?.name ?? '').toLowerCase();
    if (!n) return false;
    if (n === b || n.startsWith(b + ' ') || n.startsWith(b + '(') || n.startsWith(b + '-')) return true;
    const nk = normalizeBranchKey(s.branches?.name ?? '');
    if (!nk) return false;
    return (
      nk === key ||
      (key.length >= 3 && nk.startsWith(key)) ||
      (nk.length >= 3 && key.startsWith(nk))
    );
  });
  if (loose) return Number(loose.quantity);

  return 0;
}

function toDisplayVariant(v: VariantRow, selectedBranch: string): DisplayVariant {
  const stockRows = Array.isArray(v.product_variant_stock) ? v.product_variant_stock : [];
  const branchStock = resolveBranchStockQuantity(stockRows, selectedBranch);
  const cost         = v.cost_price ?? v.unit_price * 0.7;
  const monthlyUsage = Math.max(0, Math.round((v.units_sold_ytd || 0) / 12));
  const status       = v.status === 'Active' ? 'In Stock' : v.status;
  const discounts    = (v.product_bulk_discounts ?? []).map(d => ({
    minQty: d.min_qty,
    discount: d.discount_percent,
    pricePerUnit: Math.round(v.unit_price * (1 - d.discount_percent / 100) * 100) / 100,
  }));
  if (discounts.length === 0) discounts.push({ minQty: 1, discount: 0, pricePerUnit: v.unit_price });

  const rawMaterials = (v.product_variant_raw_materials ?? [])
    .filter(r => r.raw_material_id && r.raw_materials)
    .map(r => ({
      materialId: r.raw_material_id,
      name: r.raw_materials!.name,
      quantity: Number(r.quantity_needed),
      unit: r.raw_materials!.unit_of_measure,
      cost: Number(r.raw_materials!.cost_per_unit),
    }));

  const specs: { label: string; value: string }[] =
    Array.isArray(v.specs) && v.specs.length > 0
      ? v.specs
      : [
          ...(v.length_m ? [{ label: 'Length (per unit)', value: `${v.length_m} m` }] : []),
          ...(v.weight_kg ? [{ label: 'Weight (per unit)', value: `${v.weight_kg} kg` }] : []),
          ...(v.volume_cbm != null && Number(v.volume_cbm) > 0
            ? [{ label: 'Shipping volume (per unit)', value: `${v.volume_cbm} m³` }]
            : []),
          ...(v.wall_thickness_mm ? [{ label: 'Wall thickness', value: `${v.wall_thickness_mm} mm` }] : []),
        ];

  return {
    id: v.id,
    variantName: v.size,
    sku: v.sku,
    size: v.size,
    length: v.length_m != null ? String(v.length_m) : '',
    weight: v.weight_kg != null ? String(v.weight_kg) : '',
    volumeCbm: v.volume_cbm != null ? String(v.volume_cbm) : '',
    thickness: v.wall_thickness_mm != null ? String(v.wall_thickness_mm) : '',
    pressure: 'N/A',
    stock: branchStock,
    reorderPoint: v.reorder_point,
    price: v.unit_price,
    cost,
    monthlyUsage,
    unitsSold: v.units_sold_ytd,
    revenueYtd: Number(v.revenue_ytd) || 0,
    status,
    monthlyProductionQuota: Math.round(monthlyUsage * 1.5),
    currentMonthProduced: Math.round(monthlyUsage * 1.1),
    leadTimeDays: v.lead_time_days ?? 0,
    minOrderQty: v.min_order_qty ?? 0,
    specs,
    rawMaterials,
    bulkDiscounts: discounts,
  };
}

// â”€â”€ BOM editor raw materials list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const availablePVCMaterials = [
  { id: 'MAT-001', name: 'HDPE Resin',          unit: 'kg', avgCostPerUnit: 14.4  },
  { id: 'MAT-002', name: 'PVC Resin (K-67)',    unit: 'kg', avgCostPerUnit: 16.8  },
  { id: 'MAT-003', name: 'PVC Resin (K-70)',    unit: 'kg', avgCostPerUnit: 18.2  },
  { id: 'MAT-004', name: 'UV Stabilizer',       unit: 'kg', avgCostPerUnit: 56.25 },
  { id: 'MAT-005', name: 'Carbon Black',        unit: 'kg', avgCostPerUnit: 50.0  },
  { id: 'MAT-006', name: 'Titanium Dioxide',    unit: 'kg', avgCostPerUnit: 85.0  },
  { id: 'MAT-007', name: 'Calcium Carbonate',   unit: 'kg', avgCostPerUnit: 12.5  },
  { id: 'MAT-008', name: 'Heat Stabilizer',     unit: 'kg', avgCostPerUnit: 125.0 },
  { id: 'MAT-009', name: 'Processing Aid',      unit: 'kg', avgCostPerUnit: 95.0  },
  { id: 'MAT-010', name: 'Impact Modifier',     unit: 'kg', avgCostPerUnit: 110.0 },
  { id: 'MAT-011', name: 'Lubricant (PE Wax)',  unit: 'kg', avgCostPerUnit: 75.0  },
  { id: 'MAT-012', name: 'Plasticizer',         unit: 'kg', avgCostPerUnit: 45.0  },
];

export default function ProductFamilyPage() {
  const navigate = useNavigate();
  const { categoryName, familyId } = useParams<{ categoryName: string; familyId: string }>();
  const { selectedBranch: globalBranch, setHideBranchSelector, branch, employeeName, role, session, addAuditLog } =
    useAppContext();

  // Hide branch selector while on this page; the product's own branch drives data
  useEffect(() => {
    setHideBranchSelector(true);
    return () => setHideBranchSelector(false);
  }, []);

  // The effective branch: prefer the product's own branch once loaded, else fall back to global
  const [productBranch, setProductBranch] = useState<string>('');
  const selectedBranch = productBranch || globalBranch || '';
  const branchKeyForStockRef = useRef(selectedBranch);
  branchKeyForStockRef.current = selectedBranch;

  // â”€â”€ Data state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [product, setProduct]       = useState<ProductRow | null>(null);
  const [variants, setVariants]     = useState<DisplayVariant[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [requestingProduction, setRequestingProduction] = useState(false);

  // â”€â”€ UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedVariant, setSelectedVariant]     = useState<DisplayVariant | null>(null);
  const [comparisonView, setComparisonView]       = useState<'table' | 'chart'>('table');
  const [isEditingVariant, setIsEditingVariant]   = useState(false);
  const [editedVariant, setEditedVariant]         = useState<DisplayVariant | null>(null);
  const [showImageGalleryModal, setShowImageGalleryModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showStockAdjustmentModal, setShowStockAdjustmentModal] = useState(false);
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<any>(null);
  const [showMaterialPickerModal, setShowMaterialPickerModal] = useState(false);
  /** Comparison chart: one row per month, keys = variant id → units sold from order lines */
  const [usageChartData, setUsageChartData]     = useState<Record<string, string | number>[]>([]);
  const [usageChartLoading, setUsageChartLoading] = useState(false);

  // â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!familyId) return;
    (async () => {
      setLoading(true);
      // Product family info
      const { data: prod } = await supabase
        .from('products')
        .select('id, name, description, image_url, images, status, branch, product_categories(name)')
        .eq('id', familyId)
        .single();
      if (prod) {
        setProduct(prod as unknown as ProductRow);
        if ((prod as unknown as ProductRow).branch) {
          setProductBranch((prod as unknown as ProductRow).branch!);
        }
      }

      // Variants
      const { data: vars } = await supabase
        .from('product_variants')
        .select(`
          id, sku, size, unit_price, cost_price, total_stock, reorder_point,
          status, units_sold_ytd, revenue_ytd, weight_kg, length_m, volume_cbm, wall_thickness_mm,
          lead_time_days, min_order_qty, specs,
          product_variant_stock(quantity, branches(code, name)),
          product_bulk_discounts(min_qty, max_qty, discount_percent),
          product_variant_raw_materials(raw_material_id, quantity_needed, raw_materials(name, unit_of_measure, cost_per_unit))
        `)
        .eq('product_id', familyId)
        .order('size');

      if (vars && vars.length > 0) {
        const p = prod as unknown as ProductRow | null;
        const branchKeyForStock = (p?.branch?.trim() || globalBranch || '').trim();
        const display = (vars as unknown as VariantRow[]).map(v => toDisplayVariant(v, branchKeyForStock));
        setVariants(display);
        setSelectedVariant(display[0]);
      }
      setLoading(false);
    })();
  }, [familyId]);

  /** Variant comparison chart: up to 12 months of order lines, trimmed to first/last month with any sale, optional branch. */
  useEffect(() => {
    const vids = variants.map(v => v.id).filter(id => !id.startsWith('NEW-'));
    if (vids.length === 0) {
      setUsageChartData([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setUsageChartLoading(true);
      const [{ data, error }, brRes] = await Promise.all([
        supabase
          .from('order_line_items')
          .select('variant_id, quantity, orders!inner(order_date, status, branch_id)')
          .in('variant_id', vids),
        supabase.from('branches').select('id, name'),
      ]);

      if (cancelled) return;

      if (error) {
        if (import.meta.env.DEV) console.warn('[usage chart]', error.message);
        setUsageChartData([]);
        setUsageChartLoading(false);
        return;
      }

      const branchNameById = new Map<string, string>();
      for (const b of brRes.data ?? []) {
        if (b.id && b.name) branchNameById.set(b.id, b.name);
      }

      const end = new Date();
      const monthSlots: { ymk: string; label: string }[] = [];
      for (let k = 11; k >= 0; k--) {
        const d = new Date(end.getFullYear(), end.getMonth() - k, 1);
        const ymk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
        monthSlots.push({ ymk, label });
      }
      const monthSet = new Set(monthSlots.map(s => s.ymk));
      const agg = new Map<string, Map<string, number>>();

      type LineRow = {
        variant_id: string | null;
        quantity: number | null;
        orders: { order_date: string; status: string; branch_id: string | null } | { order_date: string; status: string; branch_id: string | null }[] | null;
      };
      for (const r of (data as LineRow[] | null) || []) {
        const rawO = r.orders;
        const ord = rawO == null ? null : Array.isArray(rawO) ? rawO[0] : rawO;
        if (!ord?.order_date) continue;
        if (CHART_EXCLUDED_ORDER_STATUSES.has(ord.status)) continue;
        if (selectedBranch) {
          const bid = ord.branch_id;
          const bn = bid ? branchNameById.get(bid) : null;
          if (bn !== selectedBranch) continue;
        }
        const od = new Date(ord.order_date);
        const ymk = `${od.getFullYear()}-${String(od.getMonth() + 1).padStart(2, '0')}`;
        if (!monthSet.has(ymk)) continue;
        const vid = r.variant_id;
        if (!vid) continue;
        const q = Number(r.quantity) || 0;
        if (!agg.has(ymk)) agg.set(ymk, new Map());
        const m = agg.get(ymk)!;
        m.set(vid, (m.get(vid) || 0) + q);
      }

      const rows: Record<string, string | number>[] = monthSlots.map(({ ymk, label }) => {
        const row: Record<string, string | number> = { month: label };
        for (const id of vids) {
          row[id] = agg.get(ymk)?.get(id) ?? 0;
        }
        return row;
      });

      const rowHasSales = (row: Record<string, string | number>) =>
        vids.some(id => Number(row[id] ?? 0) > 0);

      let last = rows.length - 1;
      while (last >= 0 && !rowHasSales(rows[last])) last -= 1;
      let first = 0;
      while (first <= last && !rowHasSales(rows[first])) first += 1;

      const trimmed =
        last < 0 ? [] : rows.slice(first, last + 1);

      if (!cancelled) {
        setUsageChartData(trimmed);
        setUsageChartLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variants, selectedBranch]);

  // â”€â”€ Image carousel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const productImages = product?.images?.length
    ? product.images
    : product?.image_url
    ? [product.image_url]
    : [hdpePipeImg, pipesImg, pressureLineImg];

  const handlePreviousImage = () =>
    setCurrentImageIndex(p => (p === 0 ? productImages.length - 1 : p - 1));
  const handleNextImage = () =>
    setCurrentImageIndex(p => (p === productImages.length - 1 ? 0 : p + 1));

  const handleSelectImages = async (imageUrls: string[]) => {
    if (!familyId || imageUrls.length === 0) {
      setShowImageGalleryModal(false);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('products').update({
        image_url: imageUrls[0],
        images: imageUrls,
        updated_at: new Date().toISOString(),
      }).eq('id', familyId);
      if (error) throw error;
      // Update local state so carousel reflects immediately
      setProduct(prev => prev ? { ...prev, image_url: imageUrls[0], images: imageUrls } : prev);
      setCurrentImageIndex(0);
    } catch (err: any) {
      alert(`Failed to save images: ${err.message ?? 'Unknown error'}`);
    } finally {
      setSaving(false);
      setShowImageGalleryModal(false);
    }
  };

  // â”€â”€ Edit handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleEditClick = () => {
    if (!selectedVariant) return;
    setIsEditingVariant(true);
    setEditedVariant({ ...selectedVariant });
  };

  const handleCancelEdit = () => {
    setIsEditingVariant(false);
    setEditedVariant(null);
  };

  const handleSaveEdit = async () => {
    if (!editedVariant) return;
    setSaving(true);
    const isNew = editedVariant.id.startsWith('NEW-');
    const payload = {
      product_id: familyId,
      sku:              editedVariant.sku,
      size:             editedVariant.size,
      unit_price:       editedVariant.price,
      cost_price:       editedVariant.cost,
      total_stock:      editedVariant.stock,
      reorder_point:    editedVariant.reorderPoint,
      status:           computeStockStatus(editedVariant.stock, editedVariant.reorderPoint),
      units_sold_ytd:   editedVariant.unitsSold,
      weight_kg:        parseFloat(editedVariant.weight) || null,
      length_m:         parseFloat(editedVariant.length) || null,
      volume_cbm:       parseFloat(editedVariant.volumeCbm) || null,
      wall_thickness_mm: parseFloat(editedVariant.thickness) || null,
      lead_time_days:   editedVariant.leadTimeDays || null,
      min_order_qty:    editedVariant.minOrderQty || null,
      specs:            editedVariant.specs,
    };
    if (isNew) {
      await supabase.from('product_variants').insert(payload);
    } else {
      await supabase.from('product_variants').update(payload).eq('id', editedVariant.id);
    }

    // Save BOM — replace all rows for this variant
    const variantId = isNew
      ? (await supabase.from('product_variants').select('id').eq('sku', editedVariant.sku).single()).data?.id
      : editedVariant.id;
    if (variantId) {
      await supabase.from('product_variant_raw_materials').delete().eq('variant_id', variantId);
      if (editedVariant.rawMaterials.length > 0) {
        await supabase.from('product_variant_raw_materials').insert(
          editedVariant.rawMaterials.map(m => ({
            variant_id: variantId,
            raw_material_id: m.materialId,
            quantity_needed: m.quantity,
            unit_of_measure: m.unit,
          }))
        );
      }
    }
    setSaving(false);
    setIsEditingVariant(false);
    setEditedVariant(null);
    // Refresh
    const { data: vars } = await supabase
      .from('product_variants')
      .select(`id, sku, size, unit_price, cost_price, total_stock, reorder_point,
        status, units_sold_ytd, revenue_ytd, weight_kg, length_m, volume_cbm, wall_thickness_mm,
        lead_time_days, min_order_qty, specs,
        product_variant_stock(quantity, branches(code, name)),
        product_bulk_discounts(min_qty, max_qty, discount_percent),
        product_variant_raw_materials(raw_material_id, quantity_needed, raw_materials(name, unit_of_measure, cost_per_unit))`)
      .eq('product_id', familyId)
      .order('size');
    if (vars) {
      const display = (vars as unknown as VariantRow[]).map(v => toDisplayVariant(v, branchKeyForStockRef.current));
      setVariants(display);
      const updated = display.find(d => d.sku === editedVariant.sku) ?? display[0];
      setSelectedVariant(updated);
      // Keep products.total_variants in sync
      await supabase.from('products').update({ total_variants: display.length }).eq('id', familyId);
    }
  };

  const handleDeleteVariant = async () => {
    if (!selectedVariant) return;
    if (!window.confirm(`Delete variant "${selectedVariant.variantName}" (${selectedVariant.sku})?\n\nThis cannot be undone.`)) return;
    await supabase.from('product_variants').delete().eq('id', selectedVariant.id);
    const remaining = variants.filter(v => v.id !== selectedVariant.id);
    setVariants(remaining);
    setSelectedVariant(remaining[0] ?? null);
    setIsEditingVariant(false);
    setEditedVariant(null);
    // Keep products.total_variants in sync
    await supabase.from('products').update({ total_variants: remaining.length }).eq('id', familyId);
  };

  const handleInputChange = (field: string, value: unknown) => {
    if (!editedVariant) return;
    setEditedVariant({ ...editedVariant, [field]: value });
  };

  const handleRawMaterialChange = (index: number, field: string, value: unknown) => {
    if (!editedVariant) return;
    const mats = [...editedVariant.rawMaterials];
    mats[index] = { ...mats[index], [field]: value };
    setEditedVariant({ ...editedVariant, rawMaterials: mats });
  };

  const handleAddMaterial = () => setShowMaterialPickerModal(true);

  const handleMaterialSelected = (mat: { materialId: string; name: string; unit: string; cost: number }) => {
    if (!editedVariant) return;
    setEditedVariant({
      ...editedVariant,
      rawMaterials: [...editedVariant.rawMaterials, { ...mat, quantity: 1 }],
    });
  };

  const handleRemoveMaterial = (index: number) => {
    if (!editedVariant) return;
    setEditedVariant({ ...editedVariant, rawMaterials: editedVariant.rawMaterials.filter((_, i) => i !== index) });
  };

  const handleMaterialNameChange = (_index: number, _name: string) => { /* replaced by picker modal */ };

  const handleAddSpec = () => {
    if (!editedVariant) return;
    setEditedVariant({ ...editedVariant, specs: [...editedVariant.specs, { label: '', value: '' }] });
  };

  const handleRemoveSpec = (index: number) => {
    if (!editedVariant) return;
    setEditedVariant({ ...editedVariant, specs: editedVariant.specs.filter((_, i) => i !== index) });
  };

  const handleSpecChange = (index: number, field: 'label' | 'value', val: string) => {
    if (!editedVariant) return;
    const specs = [...editedVariant.specs];
    specs[index] = { ...specs[index], [field]: val };
    setEditedVariant({ ...editedVariant, specs });
  };

  const handleOpenAdjustment = () => {
    if (!displayVariant) return;
    setShowStockAdjustmentModal(true);
  };

  const handleStockAdjustmentSuccess = (result?: { variantId: string; newDisplayedStock: number }) => {
    if (result) {
      setVariants(prev =>
        prev.map(v => (v.id === result.variantId ? { ...v, stock: result.newDisplayedStock } : v)),
      );
      setSelectedVariant(prev =>
        prev && prev.id === result.variantId ? { ...prev, stock: result.newDisplayedStock } : prev,
      );
    }
    setShowStockAdjustmentModal(false);
    // Re-fetch so totals / branch rows stay in sync with DB
    if (!familyId) return;
    void (async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id, sku, size, unit_price, cost_price, total_stock, reorder_point,
          status, units_sold_ytd, revenue_ytd, weight_kg, length_m, volume_cbm, wall_thickness_mm,
          lead_time_days, min_order_qty, specs,
          product_variant_stock(quantity, branches(code, name)),
          product_bulk_discounts(min_qty, max_qty, discount_percent),
          product_variant_raw_materials(raw_material_id, quantity_needed, raw_materials(name, unit_of_measure, cost_per_unit))
        `)
        .eq('product_id', familyId)
        .order('size');
      if (error) {
        if (import.meta.env.DEV) console.warn('[ProductFamily] refetch after stock adjust:', error.message);
        return;
      }
      if (data) {
        const branchKey = branchKeyForStockRef.current;
        const mapped = (data as unknown as VariantRow[]).map(v => toDisplayVariant(v, branchKey));
        setVariants(mapped);
        setSelectedVariant(prev => {
          const keepId = result?.variantId ?? prev?.id ?? mapped[0]?.id;
          return mapped.find(v => v.id === keepId) ?? mapped[0] ?? null;
        });
      }
    })();
  };

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const displayVariant = isEditingVariant ? editedVariant : selectedVariant;

  const handleRequestProduction = async () => {
    if (!familyId || !displayVariant) return;
    if (displayVariant.id.startsWith('NEW-')) {
      alert('Save the new variant first before requesting production.');
      return;
    }
    setRequestingProduction(true);
    try {
      let branchId: string | null = null;
      if (branch) {
        const { data: bd } = await supabase.from('branches').select('id').eq('name', branch).single();
        branchId = bd?.id ?? null;
      }
      const actor = employeeName || session?.user?.email || 'User';
      const qty = Math.max(Number(displayVariant.minOrderQty) || 0, 1);
      const lineLabel = `${product?.name ?? 'Product'} — ${displayVariant.variantName} (${displayVariant.sku || '—'})`;
      const { id, prNumber } = await createDraftProductionRequestWithInitialLine({
        branchId,
        actor,
        roleKey: role,
        productId: familyId,
        variantId: displayVariant.id,
        quantity: qty,
        lineLabel,
      });
      addAuditLog('PR draft from product', 'Production', `${prNumber} ${lineLabel} ×${qty}`);
      navigate(`/production-requests/${id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create production request');
    } finally {
      setRequestingProduction(false);
    }
  };

  const variantsPurchaseSummary = useMemo(() => {
    if (variants.length === 0) {
      return {
        totalUnits: 0,
        totalRevenue: 0,
        totalStock: 0,
        topByUnits: null as { size: string; units: number } | null,
        variantCount: 0,
      };
    }
    const totalUnits = variants.reduce((s, v) => s + (Number(v.unitsSold) || 0), 0);
    const totalRevenue = variants.reduce((s, v) => s + (Number(v.revenueYtd) || 0), 0);
    const totalStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
    const top = variants.reduce(
      (best, v) => ((v.unitsSold || 0) > (best.unitsSold || 0) ? v : best),
      variants[0],
    );
    return {
      totalUnits,
      totalRevenue,
      totalStock,
      topByUnits: { size: top.size, units: top.unitsSold },
      variantCount: variants.length,
    };
  }, [variants]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading product data...</span>
      </div>
    );
  }

  if (!displayVariant && !isEditingVariant) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="ghost" onClick={() => navigate(`/products/category/${categoryName}`)} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{product?.name ?? 'Product Family'}</h1>
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-1">0 size variants available</p>
          </div>
          <Button
            variant="primary"
            className="flex-shrink-0"
            onClick={() => {
              const newVariant: DisplayVariant = {
                id: `NEW-${Date.now()}`,
                variantName: 'New Variant',
                sku: '',
                size: '',
                length: '',
                weight: '',
                volumeCbm: '',
                thickness: '',
                pressure: '',
                stock: 0,
                reorderPoint: 0,
                price: 0,
                cost: 0,
                monthlyUsage: 0,
                unitsSold: 0,
                revenueYtd: 0,
                status: 'In Stock',
                monthlyProductionQuota: 0,
                currentMonthProduced: 0,
                leadTimeDays: 0,
                minOrderQty: 0,
                specs: [],
                rawMaterials: [],
                bulkDiscounts: [{ minQty: 1, discount: 0, pricePerUnit: 0 }],
              };
              setSelectedVariant(newVariant);
              setIsEditingVariant(true);
              setEditedVariant({ ...newVariant });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Variant
          </Button>
        </div>
        {/* Empty state */}
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Package className="w-14 h-14 text-gray-300" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-500">No variants yet</p>
            <p className="text-sm text-gray-400 mt-1">Add the first size variant to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  const categoryTitle = categoryName
    ? categoryName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Products';

  const stockPercentage = (displayVariant.stock / Math.max(displayVariant.reorderPoint, 1)) * 100;
  const avgDailyUsage   = Math.max(displayVariant.monthlyUsage / 30, 0.1);
  const daysOfCover     = Math.floor(displayVariant.stock / avgDailyUsage);
  const margin          = ((displayVariant.price - displayVariant.cost) / Math.max(displayVariant.price, 1)) * 100;

  const getStockColor = () => {
    if (displayVariant.status === 'Critical') return 'red';
    if (displayVariant.status === 'Low Stock') return 'orange';
    return 'green';
  };
  const getDaysOfCoverColor = () => {
    if (daysOfCover < 7)  return 'text-red-600';
    if (daysOfCover < 14) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Button variant="ghost" onClick={() => navigate(`/products/category/${categoryName}`)} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{product?.name ?? 'Product Family'}</h1>
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">
              {variants.length} size variant{variants.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {isEditingVariant ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit} className="flex-1 sm:flex-none">
                <X className="w-4 h-4 mr-2" />Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit} disabled={saving} className="flex-1 sm:flex-none">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleEditClick} className="flex-1 sm:flex-none">
                <Edit className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Edit {displayVariant.variantName}</span>
                <span className="sm:hidden">Edit</span>
              </Button>
              <Button
                variant="primary"
                className="flex-1 sm:flex-none"
                disabled={requestingProduction}
                onClick={() => void handleRequestProduction()}
              >
                {requestingProduction ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Creating request…</span>
                    <span className="sm:hidden">…</span>
                  </>
                ) : (
                  <>
                    <Factory className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Request Production</span>
                    <span className="sm:hidden">Request</span>
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Family Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Product Family Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Image Carousel */}
            <div className="lg:col-span-1">
              <div className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                  <img
                    src={productImages[currentImageIndex]}
                    alt={`${product?.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => setShowImageGalleryModal(true)}
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white p-2 rounded-lg shadow-lg transition-all hover:scale-105"
                  title="Edit product images"
                >
                  <Edit className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={handlePreviousImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {productImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${index === currentImageIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/75'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 h-full">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{product?.description ?? 'No description available.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Category</p>
                    <p className="text-sm font-medium text-gray-900">{product?.product_categories?.name ?? categoryTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <Badge variant={product?.status === 'Active' ? 'success' : 'secondary'} size="sm">{product?.status ?? 'Active'}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Branch</p>
                    <p className="text-sm font-medium text-gray-900">{product?.branch ?? selectedBranch ?? 'All'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Variants</p>
                    <p className="text-sm font-medium text-gray-900">{variants.length} sizes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variant Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Variant</CardTitle>
            <Button
              variant="outline"
              onClick={() => {
                const newVar: DisplayVariant = {
                  id: `NEW-${Date.now()}`,
                  variantName: '', sku: '', size: '', length: '', weight: '', volumeCbm: '',
                  thickness: '', pressure: '', stock: 0, reorderPoint: 0,
                  price: 0, cost: 0, monthlyUsage: 0, unitsSold: 0, revenueYtd: 0,
                  status: 'In Stock', monthlyProductionQuota: 0, currentMonthProduced: 0,
                  leadTimeDays: 0, minOrderQty: 0,
                  specs: [], rawMaterials: [], bulkDiscounts: [],
                };
                setIsEditingVariant(true);
                setEditedVariant(newVar);
                setSelectedVariant(newVar);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />Add New Variant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {variants.map(variant => {
              const isSelected = selectedVariant?.id === variant.id;
              const borderColor = variant.status === 'Critical' ? 'border-red-500 text-red-600' :
                variant.status === 'Low Stock' ? 'border-orange-500 text-orange-600' : 'border-gray-300 text-gray-700';
              return (
                <button
                  key={variant.id}
                  onClick={() => { setSelectedVariant(variant); setIsEditingVariant(false); setEditedVariant(null); }}
                  className={`relative px-6 py-3 rounded-lg border-2 transition-all ${
                    isSelected ? 'bg-red-600 border-red-600 text-white shadow-lg scale-105' : `bg-white ${borderColor} hover:border-red-400 hover:shadow-md`
                  }`}
                >
                  <div className="font-semibold">{variant.size || 'New'}</div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-red-100' : 'text-gray-500'}`}>{variant.stock} units</div>
                  {variant.status !== 'In Stock' && !isSelected && (
                    <div className="absolute -top-2 -right-2">
                      <div className={`w-3 h-3 rounded-full ${variant.status === 'Critical' ? 'bg-red-500' : 'bg-orange-500'}`} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Variant Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">SKU</p>
              {isEditingVariant ? (
                <input type="text" value={editedVariant!.sku} onChange={e => handleInputChange('sku', e.target.value)} className="w-full border rounded px-3 py-1.5 font-mono text-sm" />
              ) : (
                <p className="font-mono text-sm text-gray-900">{displayVariant.sku}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Size / Name</p>
              {isEditingVariant ? (
                <input type="text" value={editedVariant!.size} onChange={e => setEditedVariant(prev => prev ? { ...prev, size: e.target.value, variantName: e.target.value } : null)} className="w-full border rounded px-3 py-1.5 text-sm font-semibold" />
              ) : (
                <p className="text-sm font-semibold text-gray-900">{displayVariant.size}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
              {isEditingVariant ? (
                <select value={editedVariant!.status} onChange={e => handleInputChange('status', e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm">
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Critical">Critical</option>
                </select>
              ) : (
                <Badge variant={displayVariant.status === 'Critical' ? 'destructive' : displayVariant.status === 'Low Stock' ? 'warning' : 'success'}>
                  {displayVariant.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Levels */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Stock Levels</CardTitle>
              {!isEditingVariant && (
                <button
                  onClick={handleOpenAdjustment}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Adjust Stock
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase">Current Stock</p>
                {isEditingVariant ? (
                  <input type="number" value={editedVariant!.stock} onChange={e => handleInputChange('stock', parseInt(e.target.value))} onWheel={e => (e.target as HTMLInputElement).blur()} className="border rounded px-3 py-1 text-lg font-bold w-32 text-right" />
                ) : (
                  <p className="text-lg font-bold text-gray-900">{displayVariant.stock.toLocaleString()} units</p>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div className={`h-2 rounded-full bg-${getStockColor()}-500`} style={{ width: `${Math.min(stockPercentage, 100)}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Reorder Point:</p>
                {isEditingVariant ? (
                  <input type="number" value={editedVariant!.reorderPoint} onChange={e => handleInputChange('reorderPoint', parseInt(e.target.value))} onWheel={e => (e.target as HTMLInputElement).blur()} className="border rounded px-2 py-1 text-xs w-24 text-right" />
                ) : (
                  <p className="text-xs text-gray-500">{displayVariant.reorderPoint} units</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Days of Cover</p>
              <p className={`text-lg font-bold ${getDaysOfCoverColor()}`}>{daysOfCover} days</p>
            </div>
            {(displayVariant.status === 'Critical' || displayVariant.status === 'Low Stock') && (
              <div className={`flex items-start gap-2 p-3 rounded-lg ${displayVariant.status === 'Critical' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${displayVariant.status === 'Critical' ? 'text-red-600' : 'text-orange-600'}`} />
                <div className={`text-xs ${displayVariant.status === 'Critical' ? 'text-red-700' : 'text-orange-700'}`}>
                  <span className="font-semibold">{displayVariant.status}!</span> Consider immediate production scheduling.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Selling Price</p>
              {isEditingVariant ? (
                <input type="number" value={editedVariant!.price} onChange={e => handleInputChange('price', parseFloat(e.target.value))} onWheel={e => (e.target as HTMLInputElement).blur()} className="border rounded px-3 py-1.5 text-2xl font-bold w-full" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">₱{displayVariant.price.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">per unit</p>
                </>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Production Cost</p>
              {isEditingVariant ? (
                <input type="number" value={editedVariant!.cost} onChange={e => handleInputChange('cost', parseFloat(e.target.value))} onWheel={e => (e.target as HTMLInputElement).blur()} className="border rounded px-3 py-1.5 text-lg font-semibold w-full" />
              ) : (
                <p className="text-lg font-semibold text-gray-600">₱{displayVariant.cost.toLocaleString()}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Margin</p>
              <p className="text-lg font-bold text-green-600">{margin.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Trucking load — per inventory unit (same unit as stock qty) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trucking load (per unit)</CardTitle>
            <p className="text-xs text-gray-500 mt-1 font-normal">
              Match <strong>one</strong> stock unit (stick, bundle, or piece). Used later to compare order lines to truck max weight and volume.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Weight (kg)</p>
              {isEditingVariant ? (
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={editedVariant!.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="e.g. 8.2"
                  className="w-full border rounded px-3 py-1.5 text-sm font-medium"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {displayVariant.weight ? `${displayVariant.weight} kg` : '—'}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Length (m)</p>
              {isEditingVariant ? (
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={editedVariant!.length}
                  onChange={(e) => handleInputChange('length', e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="e.g. 3.05"
                  className="w-full border rounded px-3 py-1.5 text-sm font-medium"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {displayVariant.length ? `${displayVariant.length} m` : '—'}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Shipping volume (m³)</p>
              {isEditingVariant ? (
                <input
                  type="number"
                  min={0}
                  step="0.000001"
                  value={editedVariant!.volumeCbm}
                  onChange={(e) => handleInputChange('volumeCbm', e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="e.g. 0.048"
                  className="w-full border rounded px-3 py-1.5 text-sm font-medium"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {displayVariant.volumeCbm ? `${displayVariant.volumeCbm} m³` : '—'}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Wall thickness (mm)</p>
              {isEditingVariant ? (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editedVariant!.thickness}
                  onChange={(e) => handleInputChange('thickness', e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="w-full border rounded px-3 py-1.5 text-sm font-medium"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {displayVariant.thickness ? `${displayVariant.thickness} mm` : '—'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Raw Material BOM */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="w-4 h-4 text-blue-600" />Raw Material Consumption per Unit
              </CardTitle>
              {isEditingVariant && (
                <Button variant="outline" size="sm" onClick={handleAddMaterial} className="h-8 px-3 py-2 text-xs">
                  <Plus className="w-3 h-3 mr-1" />Add Material
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {displayVariant.rawMaterials.length > 0 ? (
              <div className="space-y-3">
                {displayVariant.rawMaterials.map((material, index) => (
                  <div key={material.materialId + index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">{material.name}</p>
                      <div className="flex items-center gap-2">
                        {isEditingVariant ? (
                          <>
                            <input type="number" value={editedVariant!.rawMaterials[index].quantity} onChange={e => handleRawMaterialChange(index, 'quantity', parseFloat(e.target.value))} onWheel={e => (e.target as HTMLInputElement).blur()} className="border rounded px-2 py-1 text-xs w-20" />
                            <span className="text-xs text-gray-500">{material.unit}</span>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">{material.quantity} {material.unit}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right min-w-[6.5rem]">
                      <p className="text-sm font-bold text-gray-900 tabular-nums">
                        ₱{pesoFmt2(bomLineMaterialCost(material.quantity, material.cost))}
                      </p>
                      <p className="text-xs text-gray-500 tabular-nums">
                        ₱{pesoFmt2(material.cost)}/{material.unit} × {material.quantity}
                      </p>
                    </div>
                    {isEditingVariant && (
                      <button onClick={() => handleRemoveMaterial(index)} className="text-red-600 hover:bg-red-50 p-1.5 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Material Cost per Unit:</span>
                    <span className="text-lg font-bold text-blue-600 tabular-nums">
                      ₱{pesoFmt2(displayVariant.rawMaterials.reduce((s, m) => s + bomLineMaterialCost(m.quantity, m.cost), 0))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                {isEditingVariant ? 'No materials added — click "Add Material" to build the Bill of Materials' : 'No Bill of Materials data available for this variant'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Technical Specs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="w-4 h-4 text-purple-600" />Technical Specifications
              </CardTitle>
              {isEditingVariant && (
                <Button variant="outline" size="sm" onClick={handleAddSpec} className="h-8 px-3 py-2 text-xs">
                  <Plus className="w-3 h-3 mr-1" />Add Spec
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {displayVariant.specs.length > 0 ? (
              displayVariant.specs.map((spec, index) => (
                <div key={index} className="flex items-center gap-2">
                  {isEditingVariant ? (
                    <>
                      <input
                        type="text"
                        value={editedVariant!.specs[index].label}
                        onChange={e => handleSpecChange(index, 'label', e.target.value)}
                        placeholder="Label"
                        className="w-2/5 border rounded px-2 py-1.5 text-xs font-medium text-gray-600"
                      />
                      <input
                        type="text"
                        value={editedVariant!.specs[index].value}
                        onChange={e => handleSpecChange(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 border rounded px-2 py-1.5 text-sm font-medium"
                      />
                      <button onClick={() => handleRemoveSpec(index)} className="text-red-600 hover:bg-red-50 p-1.5 rounded flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 uppercase w-2/5">{spec.label}</p>
                      <p className="text-sm font-medium text-gray-900">{spec.value}</p>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                {isEditingVariant ? 'No specs — click "Add Spec" to add entries' : 'No specifications available'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Usage & Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />Usage & Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Monthly Usage</p>
              {isEditingVariant ? (
                <input type="number" value={editedVariant!.monthlyUsage} onChange={e => handleInputChange('monthlyUsage', parseInt(e.target.value))} onWheel={e => (e.target as HTMLInputElement).blur()} className="w-full border rounded px-3 py-1.5 text-lg font-semibold" />
              ) : (
                <p className="text-lg font-semibold text-gray-900">{displayVariant.monthlyUsage.toLocaleString()} units</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Avg. Daily Usage</p>
              <p className="text-sm font-medium text-gray-600">{avgDailyUsage.toFixed(1)} units/day</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Units Sold YTD</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-green-600">{displayVariant.unitsSold.toLocaleString()}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Revenue YTD</p>
              <p className="text-lg font-bold text-green-600">
                ₱{((displayVariant.unitsSold * displayVariant.price) / 1000).toFixed(0)}K
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Production Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="w-4 h-4 text-blue-600" />Production Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Lead Time</p>
              {isEditingVariant ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editedVariant!.leadTimeDays}
                    onChange={e => handleInputChange('leadTimeDays', parseInt(e.target.value))}
                    onWheel={e => (e.target as HTMLInputElement).blur()}
                    className="border rounded px-3 py-1.5 text-sm font-medium w-24"
                  />
                  <span className="text-sm text-gray-500">days</span>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-900">{displayVariant.leadTimeDays} days</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Min. Order Qty</p>
              {isEditingVariant ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editedVariant!.minOrderQty}
                    onChange={e => handleInputChange('minOrderQty', parseInt(e.target.value))}
                    onWheel={e => (e.target as HTMLInputElement).blur()}
                    className="border rounded px-3 py-1.5 text-sm font-medium w-28"
                  />
                  <span className="text-sm text-gray-500">units</span>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-900">{displayVariant.minOrderQty.toLocaleString()} units</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Last Production</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" /><span>Jan 28, 2026</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Next Scheduled</p>
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <Calendar className="w-4 h-4" /><span>Feb 15, 2026</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Production Quota */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="w-4 h-4 text-blue-600" />Monthly Production Quota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase">Target Quota</p>
                {isEditingVariant ? (
                  <input type="number" value={editedVariant!.monthlyProductionQuota} onChange={e => handleInputChange('monthlyProductionQuota', parseInt(e.target.value))} onWheel={e => (e.target as HTMLInputElement).blur()} className="border rounded px-3 py-1 text-xl font-bold w-32 text-right" />
                ) : (
                  <p className="text-xl font-bold text-blue-600">{(displayVariant.monthlyProductionQuota ?? 0).toLocaleString()} units</p>
                )}
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Produced This Month</p>
                {isEditingVariant ? (
                  <input type="number" value={editedVariant!.currentMonthProduced} onChange={e => handleInputChange('currentMonthProduced', parseInt(e.target.value))} onWheel={e => (e.target as HTMLInputElement).blur()} className="border rounded px-2 py-1 text-sm font-semibold w-28 text-right" />
                ) : (
                  <p className="text-sm font-semibold text-gray-900">{(displayVariant.currentMonthProduced ?? 0).toLocaleString()} units</p>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all ${
                    ((displayVariant.currentMonthProduced ?? 0) / Math.max(displayVariant.monthlyProductionQuota ?? 1, 1)) >= 1 ? 'bg-green-500' :
                    ((displayVariant.currentMonthProduced ?? 0) / Math.max(displayVariant.monthlyProductionQuota ?? 1, 1)) >= 0.7 ? 'bg-blue-500' :
                    ((displayVariant.currentMonthProduced ?? 0) / Math.max(displayVariant.monthlyProductionQuota ?? 1, 1)) >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(((displayVariant.currentMonthProduced ?? 0) / Math.max(displayVariant.monthlyProductionQuota ?? 1, 1)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {(((displayVariant.currentMonthProduced ?? 0) / Math.max(displayVariant.monthlyProductionQuota ?? 1, 1)) * 100).toFixed(1)}% complete
                </span>
                <span className={`font-semibold ${(displayVariant.currentMonthProduced ?? 0) >= (displayVariant.monthlyProductionQuota ?? 0) ? 'text-green-600' : 'text-orange-600'}`}>
                  {Math.max(0, (displayVariant.monthlyProductionQuota ?? 0) - (displayVariant.currentMonthProduced ?? 0)).toLocaleString()} remaining
                </span>
              </div>
            </div>
            {(displayVariant.currentMonthProduced ?? 0) >= (displayVariant.monthlyProductionQuota ?? 0) ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-green-700"><span className="font-semibold">Quota Achieved!</span> This month's production target has been met.</div>
              </div>
            ) : ((displayVariant.currentMonthProduced ?? 0) / Math.max(displayVariant.monthlyProductionQuota ?? 1, 1)) < 0.5 ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-orange-700"><span className="font-semibold">Behind Schedule</span> — Less than 50% of monthly quota achieved.</div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700"><span className="font-semibold">On Track</span> — Production progressing as planned.</div>
              </div>
            )}
            <div className="pt-3 border-t border-blue-200">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Current Period:</span>
                <span className="font-medium">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Variants Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Variants Comparison</CardTitle>
            <div className="flex gap-2">
              {(['table', 'chart'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setComparisonView(v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${comparisonView === v ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {v === 'table' ? <TableIcon className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {variants.length > 0 && (
            <div className="mb-5 rounded-lg border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Product and variants (sales)</p>
                  <p className="mt-0.5 text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">{product?.name ?? 'This product'}</span>
                    <span className="text-gray-500"> — </span>
                    {variantsPurchaseSummary.variantCount} variant{variantsPurchaseSummary.variantCount !== 1 ? 's' : ''} in this family
                    {product?.product_categories?.name && (
                      <span className="text-gray-500"> · {product.product_categories.name}</span>
                    )}
                  </p>
                </div>
                {variantsPurchaseSummary.topByUnits && variantsPurchaseSummary.topByUnits.units > 0 && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-gray-800">Top by units (YTD):</span>{' '}
                    {variantsPurchaseSummary.topByUnits.size} ({variantsPurchaseSummary.topByUnits.units.toLocaleString()} sold)
                  </p>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-gray-100 bg-white/90 px-3 py-2.5">
                  <p className="text-xs text-gray-500">Total units (YTD)</p>
                  <p className="text-lg font-bold tabular-nums text-gray-900">
                    {variantsPurchaseSummary.totalUnits.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md border border-gray-100 bg-white/90 px-3 py-2.5">
                  <p className="text-xs text-gray-500">Total revenue (YTD)</p>
                  <p className="text-lg font-bold tabular-nums text-gray-900">
                    ₱{variantsPurchaseSummary.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="rounded-md border border-gray-100 bg-white/90 px-3 py-2.5">
                  <p className="text-xs text-gray-500">Combined stock</p>
                  <p className="text-lg font-bold tabular-nums text-gray-900">
                    {variantsPurchaseSummary.totalStock.toLocaleString()} <span className="text-sm font-medium text-gray-500">on hand</span>
                  </p>
                </div>
                <div className="rounded-md border border-gray-100 bg-white/90 px-3 py-2.5">
                  <p className="text-xs text-gray-500">Avg / variant (units YTD)</p>
                  <p className="text-lg font-bold tabular-nums text-gray-900">
                    {Math.round(
                      variantsPurchaseSummary.totalUnits / Math.max(variantsPurchaseSummary.variantCount, 1),
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          {comparisonView === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Size', 'SKU', 'Stock', 'Price', 'Monthly Usage', 'Units Sold YTD', 'Revenue YTD', 'Status'].map(h => (
                      <th
                        key={h}
                        className={`py-3 px-4 text-xs font-semibold text-gray-600 uppercase ${
                          h === 'Size' || h === 'SKU' ? 'text-left' : 'text-right'
                        } ${h === 'Status' ? '!text-center' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variants.map(variant => {
                    const isSel = selectedVariant?.id === variant.id;
                    return (
                      <tr
                        key={variant.id}
                        onClick={() => { setSelectedVariant(variant); setIsEditingVariant(false); setEditedVariant(null); }}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${isSel ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${isSel ? 'text-red-600' : 'text-gray-900'}`}>{variant.size}</span>
                        </td>
                        <td className="py-3 px-4"><span className="font-mono text-sm text-gray-600">{variant.sku}</span></td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${variant.status === 'Critical' ? 'text-red-600' : variant.status === 'Low Stock' ? 'text-orange-600' : 'text-gray-900'}`}>{variant.stock.toLocaleString()}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">₱{variant.price.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{variant.monthlyUsage}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">{variant.unitsSold.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-gray-800 tabular-nums">
                          ₱{variant.revenueYtd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={variant.status === 'Critical' ? 'destructive' : variant.status === 'Low Stock' ? 'warning' : 'success'} size="sm">{variant.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Units sold from customer <strong>order line items</strong> (by order month). Only months with at least one sale are shown (up to 12 months back).
                {selectedBranch ? (
                  <span> Branch: <span className="font-medium text-gray-700">{selectedBranch}</span> only.</span>
                ) : (
                  <span> All branches.</span>
                )}
              </p>
              <div className="h-[400px]">
                {usageChartLoading ? (
                  <div className="flex h-full items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span className="text-sm">Loading order data…</span>
                  </div>
                ) : usageChartData.length === 0 ? (
                  <div className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 text-center text-sm text-gray-500">
                    No order sales in the last 12 months for this product (with the current branch filter).
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={usageChartData}
                      margin={{ top: 5, right: 24, left: 8, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '11px' }} minTickGap={16} />
                      <YAxis
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        width={48}
                        tickFormatter={n => (Number(n) >= 1000 ? Number(n).toLocaleString() : String(n))}
                        label={{ value: 'Units sold (per month)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}
                        formatter={(value: number | string) => {
                          if (value == null || value === '') return ['—', ''];
                          const n = typeof value === 'number' ? value : parseFloat(String(value));
                          if (Number.isNaN(n)) return ['—', ''];
                          return [n.toLocaleString(), ''];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} iconType="line" />
                      {variants.map(v => (
                        <Line
                          key={v.id}
                          type="linear"
                          dataKey={v.id}
                          name={v.size}
                          stroke={stringToColor(v.id)}
                          strokeWidth={2}
                          dot={{ r: 2, strokeWidth: 2 }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Variant Section */}
      {isEditingVariant && selectedVariant && !selectedVariant.id.startsWith('NEW-') && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-red-900 mb-1">Danger Zone</h3>
                  <p className="text-sm text-red-700 mb-2">Permanently delete this variant. This action cannot be undone.</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleDeleteVariant} className="bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 px-6">
                <Trash2 className="w-4 h-4 mr-2" />Delete Variant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ImageGalleryModal
        isOpen={showImageGalleryModal}
        onClose={() => setShowImageGalleryModal(false)}
        onSelectImages={handleSelectImages}
        maxImages={999}
        currentImages={productImages as string[]}
      />
      <RawMaterialPickerModal
        isOpen={showMaterialPickerModal}
        onClose={() => setShowMaterialPickerModal(false)}
        onSelect={handleMaterialSelected}
        branch={selectedBranch ?? ''}
        alreadyAdded={editedVariant?.rawMaterials.map(m => m.materialId) ?? []}
      />
      {showStockAdjustmentModal && displayVariant && (
        <ProductStockAdjustmentModal
          isOpen={showStockAdjustmentModal}
          onClose={() => setShowStockAdjustmentModal(false)}
          onSuccess={handleStockAdjustmentSuccess}
          variant={{
            id: displayVariant.id,
            name: `${displayVariant.variantName} – ${displayVariant.size}`,
            sku: displayVariant.sku,
            currentStock: displayVariant.stock,
            reorderPoint: displayVariant.reorderPoint,
          }}
          productId={familyId ?? ''}
          branch={selectedBranch}
        />
      )}
    </div>
  );
}

