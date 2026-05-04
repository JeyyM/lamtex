import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, FileText, Truck, Calendar, History, Search, AlertTriangle, CheckCircle, X, Factory, ShoppingCart, Clock, TrendingUp, Activity, RefreshCw, GitBranch, Loader2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Camera, CheckCircle2, Box, DollarSign } from 'lucide-react';
import { FulfillOrderModal, type FulfillmentData } from '@/src/components/orders/FulfillOrderModal';
import { MarkInTransitModal } from '@/src/components/orders/MarkInTransitModal';
import type { OrderLineItem } from '@/src/types/orders';
import { Button } from '@/src/components/ui/Button';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import OrderDetailModal from '../components/logistics/OrderDetailModal';
import {
  WarehouseTripLoadingModal,
  type WarehouseTripSummary,
  type WarehouseOrderRowLite,
} from '@/src/components/warehouse/WarehouseTripLoadingModal';
import { EditTripModal } from '@/src/components/logistics/EditTripModal';
import type { Trip, Vehicle, OrderReadyForDispatch, DriverOption } from '@/src/types/logistics';
import {
  tripStatusBadgeClass,
  fetchTripById,
  updateTrip,
  fetchLogisticsOrderQueue,
  fetchDriversForBranch,
} from '@/src/lib/logisticsScheduling';
import { fetchFleetTrucksForBranch } from '@/src/lib/fleetTrucks';
import { supabase } from '@/src/lib/supabase';
import { useAppContext } from '@/src/store/AppContext';
import { computeStockStatus } from '@/src/lib/stockStatus';
import { finishedGoodProductHref } from '@/src/lib/productRoutes';
import {
  OrderProductSelectionModal,
  type OrderProductSelectionConfirm,
} from '@/src/components/orders/OrderProductSelectionModal';
import RawMaterialPickerModal from '@/src/components/products/RawMaterialPickerModal';
import {
  fetchVariantMonthlyOrderMetrics,
  fetchMaterialMonthlyUsageFromConsumption,
  fetchVariantInvolvedOrders,
  fetchMaterialUsageRows,
  resolveBranchCode,
  fetchVariantStockAtBranch,
  fetchMaterialStockAtBranch,
  type MonthlyMovementChartRow,
  type MonthlyRevenueChartRow,
  type VariantInvolvedOrderRow,
  type MaterialUsageRow,
} from '@/src/lib/warehouseMovementsData';

type TabType = 'inventory' | 'requests' | 'orders' | 'movements';
type StockStatus = 'healthy' | 'warning' | 'critical';
type RequestType = 'production' | 'purchase';

type MovementsTabSelection =
  | {
      kind: 'variant';
      variantId: string;
      productId: string;
      productName: string;
      variantLabel: string;
      sku: string;
      productImageUrl: string | null;
    }
  | {
      kind: 'material';
      materialId: string;
      name: string;
      sku: string;
      unit: string;
      imageUrl: string | null;
    };

function MovementsCatalogThumb({
  imageUrl,
  label,
  kind,
}: {
  imageUrl: string | null | undefined;
  label: string;
  kind: 'variant' | 'material';
}) {
  const [broken, setBroken] = useState(false);
  const show = Boolean(imageUrl && !broken);
  const PlaceholderIcon = kind === 'variant' ? Package : Factory;
  return show ? (
    <img
      src={imageUrl!}
      alt={label}
      className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0 bg-white"
      onError={() => setBroken(true)}
    />
  ) : (
    <div
      className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0"
      aria-hidden
    >
      <PlaceholderIcon className="w-7 h-7 text-gray-400" />
    </div>
  );
}

interface FinishedGood {
  /** Variant id (unique per inventory row). */
  id: string;
  /** Product / family id for links to ProductFamilyPage. */
  productId: string;
  sku: string;
  /** Variant size label (e.g. 20mm). */
  variantSize: string;
  /** Product family display name. */
  productName: string;
  /** Full row label for search and modals: product — size. */
  name: string;
  category: string;
  /** `product_categories.slug` for routing to ProductFamilyPage */
  categorySlug: string;
  currentStock: number;
  unit: string;
  reorderPoint: number;
  maxCapacity: number;
  location: string;
  lastRestocked: string;
  status: StockStatus;
}

interface RawMaterial {
  id: string;
  /** SKU — used for search only */
  code: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  maxCapacity: number;
  lastRestocked: string;
  status: StockStatus;
}

/** One table row = one production_request_items line (with parent PR context). */
interface WarehouseProductionLineRow {
  rowKey: string;
  prId: string;
  prNumber: string;
  productSku: string;
  productName: string;
  quantity: number;
  unit: string;
  requestDateFmt: string;
  expectedCompletionFmt: string;
  status: string;
  requestedBy: string;
  requestDateIso: string;
  expectedCompletionIso: string | null;
  /** For calendar cell key */
  calendarAnchorIso: string | null;
}

/** One table row = one purchase_order_items line (with parent PO context). */
interface WarehousePurchaseLineRow {
  rowKey: string;
  poId: string;
  poNumber: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  supplier: string;
  requestedDeliveryFmt: string;
  estimatedArrivalFmt: string;
  status: string;
  requestedBy: string;
  orderDateIso: string;
  calendarAnchorIso: string | null;
}

function scheduleAsOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtScheduleDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function calendarDayKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isIbrFlowProductionRequest(r: { inter_branch_request_id: string | null; pr_number: string }): boolean {
  return r.inter_branch_request_id != null || r.pr_number.startsWith('PR-IBR-');
}

function hidePoFromSchedule(po: {
  inter_branch_request_id: string | null;
  po_number: string;
  is_transfer_request: boolean;
}): boolean {
  return (
    po.inter_branch_request_id != null || po.po_number.startsWith('PO-IBR-') || po.is_transfer_request === true
  );
}

function prScheduleBadgeClass(status: string): string {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'In Progress':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'Accepted':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Requested':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Draft':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'Rejected':
    case 'Cancelled':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function poScheduleBadgeClass(status: string): string {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Partially Received':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'Sent':
    case 'Confirmed':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'Accepted':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Requested':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Draft':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'Rejected':
    case 'Cancelled':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/** Local calendar day key YYYY-MM-DD (avoids UTC shift for date-only strings). */
function dateKeyLocalFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateKeyLocalFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return dateKeyLocalFromDate(d);
}

/** DB `DATE` or ISO timestamp → anchor key. */
function normalizeAnchorDateKey(isoOrYmd: string | null | undefined): string | null {
  if (!isoOrYmd) return null;
  const s = String(isoOrYmd).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return dateKeyLocalFromIso(s);
}

interface WarehouseCalendarEvent {
  id: string;
  calendarKind: 'production' | 'purchase' | 'ibr';
  anchorDateKey: string;
  title: string;
  detail?: string;
  recordRoute: 'production' | 'purchase' | 'ibr';
  recordId: string;
  quantity?: number;
  unit?: string;
  supplier?: string;
  status: string;
  /** Set on standalone IBR rows for tab filter (product lines → PR tab, raw lines → PO tab). */
  ibrHasProduct?: boolean;
  ibrHasRawMaterial?: boolean;
}

// ── Order Delivery Calendar ────────────────────────────────────────────────
interface OrderDeliveryCalEvent {
  id: string;
  orderNumber: string;
  customer: string;
  dateKey: string;        // YYYY-MM-DD
  dateType: 'required' | 'scheduled' | 'delivered';
  status: string;
  urgency: string;
}

/** A live order row for the Orders & Loading tab. */
/** Order statuses shown on Orders & Loading (warehouse + handoff). */
const WAREHOUSE_LOADING_TAB_STATUSES = [
  'Approved',
  'Scheduled',
  'Loading',
  'Packed',
  'Ready',
  'In Transit',
  'Partially Fulfilled',
] as const;

interface WarehouseOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string | null;
  requiredDate: string | null;
  status: string;
  urgency: string;
  branchId: string | null;
  branchCode: string;
  items: OrderLineItem[];
  /** True when branch stock cannot cover remaining qty to ship for any line. */
  hasShortage: boolean;
  /** Trip linked in `trips.order_ids` for this branch, if any. */
  tripId: string | null;
}

function warehouseOrderToLite(o: WarehouseOrderRow): WarehouseOrderRowLite {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    deliveryAddress: o.deliveryAddress,
    requiredDate: o.requiredDate,
    status: o.status,
    urgency: o.urgency,
    items: o.items,
    hasShortage: o.hasShortage,
  };
}

function warehouseOrderHasShortage(order: WarehouseOrderRow, onHandByVariant: Map<string, number>): boolean {
  return order.items.some((li) => {
    if (!li.variantId) return false;
    const rem = Math.max(0, li.quantity - (li.quantityShipped ?? 0));
    if (rem <= 0) return false;
    return (onHandByVariant.get(li.variantId) ?? 0) < rem;
  });
}

/**
 * Use line-level `quantity_delivered` when `orders.status` is stale (e.g. trip marked completed
 * in Logistics but the order row was not updated).
 */
function warehouseOrderStatusResolved(dbStatus: string, items: OrderLineItem[]): string {
  if (
    dbStatus === 'Cancelled' ||
    dbStatus === 'Rejected' ||
    dbStatus === 'Delivered' ||
    dbStatus === 'Partially Fulfilled' ||
    dbStatus === 'Completed'
  ) {
    return dbStatus;
  }
  if (items.length === 0) return dbStatus;
  const allDelivered = items.every((l) => (l.quantityDelivered ?? 0) >= l.quantity);
  const anyDelivered = items.some((l) => (l.quantityDelivered ?? 0) > 0);
  if (anyDelivered && allDelivered) return 'Delivered';
  if (anyDelivered && !allDelivered) return 'Partially Fulfilled';
  return dbStatus;
}

/** Load full `WarehouseOrderRow` lists for arbitrary order IDs (any status). */
async function loadWarehouseOrderRowsByIds(
  orderIds: string[],
  bid: string | null,
  bcode: string,
  tripIdByOrderId: Map<string, string>,
): Promise<WarehouseOrderRow[]> {
  const uniq = [...new Set(orderIds)].filter(Boolean);
  if (uniq.length === 0) return [];

  let oq = supabase
    .from('orders')
    .select('id, order_number, customer_name, delivery_address, required_date, status, urgency, branch_id')
    .in('id', uniq);
  if (bid) oq = (oq as typeof oq).eq('branch_id', bid);

  const { data: orderRows, error } = await oq;
  if (error) throw error;
  if (!orderRows?.length) return [];

  const ids = (orderRows as any[]).map((o) => o.id as string);
  const { data: lineRows } = await supabase
    .from('order_line_items')
    .select(
      'id, order_id, product_name, variant_description, quantity, unit_price, quantity_shipped, quantity_delivered, variant_id, sku, line_total, discount_percent, discount_amount',
    )
    .in('order_id', ids);

  const linesByOrder: Record<string, OrderLineItem[]> = {};
  for (const lr of (lineRows ?? []) as any[]) {
    const oid = lr.order_id as string;
    if (!linesByOrder[oid]) linesByOrder[oid] = [];
    linesByOrder[oid].push({
      id: lr.id,
      sku: lr.sku ?? '',
      variantId: lr.variant_id ?? undefined,
      productName: lr.product_name ?? '',
      variantDescription: lr.variant_description ?? '',
      quantity: Number(lr.quantity ?? 0),
      unitPrice: Number(lr.unit_price ?? 0),
      discountPercent: Number(lr.discount_percent ?? 0),
      discountAmount: Number(lr.discount_amount ?? 0),
      lineTotal: Number(lr.line_total ?? 0),
      stockHint: 'Available',
      quantityShipped: Number(lr.quantity_shipped ?? 0),
      quantityDelivered: Number(lr.quantity_delivered ?? 0),
    });
  }

  const variantIds = new Set<string>();
  for (const oid of ids) {
    for (const li of linesByOrder[oid] ?? []) {
      if (li.variantId) variantIds.add(li.variantId);
    }
  }

  const imageByVariant = new Map<string, string>();
  const productLinkByVariant = new Map<string, { productId: string; categorySlug: string }>();
  if (variantIds.size > 0) {
    const { data: vimgs } = await supabase
      .from('product_variants')
      .select('id, product_id, products(image_url, product_categories(slug))')
      .in('id', [...variantIds]);
    for (const raw of (vimgs ?? []) as any[]) {
      const rowId = String(raw.id);
      const pid = raw.product_id != null ? String(raw.product_id) : null;
      const prod = Array.isArray(raw.products) ? raw.products[0] : raw.products;
      const u = prod?.image_url;
      if (typeof u === 'string' && u) imageByVariant.set(rowId, u);
      if (pid) {
        const cat = prod?.product_categories;
        const catRow = Array.isArray(cat) ? cat[0] : cat;
        const slug = catRow?.slug;
        productLinkByVariant.set(rowId, {
          productId: pid,
          categorySlug: typeof slug === 'string' ? slug : '',
        });
      }
    }
  }

  for (const oid of ids) {
    const list = linesByOrder[oid];
    if (!list?.length) continue;
    linesByOrder[oid] = list.map((li) => {
      const link = li.variantId ? productLinkByVariant.get(li.variantId) : undefined;
      return {
        ...li,
        imageUrl: li.variantId ? imageByVariant.get(li.variantId) : undefined,
        productId: link?.productId,
        categorySlug: link?.categorySlug || undefined,
      };
    });
  }

  const onHandByVariant = new Map<string, number>();
  if (bid && variantIds.size > 0) {
    const { data: pvsData } = await supabase
      .from('product_variant_stock')
      .select('variant_id, quantity')
      .eq('branch_id', bid)
      .in('variant_id', [...variantIds]);
    for (const row of (pvsData ?? []) as { variant_id: string; quantity: unknown }[]) {
      onHandByVariant.set(row.variant_id, Number(row.quantity ?? 0));
    }
  }

  return (orderRows as any[]).map((o) => {
    const items = linesByOrder[o.id] ?? [];
    const resolvedStatus = warehouseOrderStatusResolved(String(o.status ?? ''), items);
    const base: WarehouseOrderRow = {
      id: o.id,
      orderNumber: o.order_number ?? '—',
      customerName: o.customer_name ?? '—',
      deliveryAddress: o.delivery_address ?? null,
      requiredDate: o.required_date ?? null,
      status: resolvedStatus,
      urgency: o.urgency ?? '',
      branchId: o.branch_id ?? null,
      branchCode: bcode,
      items,
      hasShortage: false,
      tripId: tripIdByOrderId.get(o.id) ?? null,
    };
    return { ...base, hasShortage: warehouseOrderHasShortage(base, onHandByVariant) };
  });
}

function orderDeliveryChipClass(ev: OrderDeliveryCalEvent): string {
  if (ev.dateType === 'delivered') return 'bg-green-600 text-white';
  if (ev.dateType === 'scheduled') return 'bg-blue-600 text-white';
  // required date — colour by urgency
  switch (ev.urgency) {
    case 'High':
    case 'Critical':
      return 'bg-red-500 text-white';
    case 'Medium':
      return 'bg-amber-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

function orderDeliveryStatusBadge(status: string): string {
  switch (status) {
    case 'Delivered':
    case 'Completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'In Transit':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Ready':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'Packed':
      return 'bg-violet-100 text-violet-900 border-violet-300';
    case 'Loading':
      return 'bg-orange-100 text-orange-900 border-orange-300';
    case 'Scheduled':
    case 'Partially Fulfilled':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'Approved':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'Cancelled':
    case 'Rejected':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}
// ──────────────────────────────────────────────────────────────────────────

function calendarKindChipClass(kind: WarehouseCalendarEvent['calendarKind']): string {
  switch (kind) {
    case 'production':
      return 'bg-green-500 text-white';
    case 'purchase':
      return 'bg-blue-500 text-white';
    case 'ibr':
      return 'bg-amber-600 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

function calendarKindLabel(kind: WarehouseCalendarEvent['calendarKind']): string {
  switch (kind) {
    case 'production':
      return 'Production';
    case 'purchase':
      return 'Purchase';
    case 'ibr':
      return 'Inter-branch';
    default:
      return 'Event';
  }
}

/** Mirrors logistics status semantics from InterBranchRequestsPage. */
function ibrScheduleBadgeClass(status: string): string {
  switch (status) {
    case 'Fulfilled':
    case 'Completed':
    case 'Delivered':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Cancelled':
    case 'Rejected':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'Pending':
    case 'Loading':
    case 'Packed':
    case 'Ready':
    case 'In Transit':
    case 'Partially Fulfilled':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'Approved':
    case 'Scheduled':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'Draft':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function calendarEventStatusBadgeClass(ev: WarehouseCalendarEvent): string {
  switch (ev.recordRoute) {
    case 'production':
      return prScheduleBadgeClass(ev.status);
    case 'purchase':
      return poScheduleBadgeClass(ev.status);
    case 'ibr':
      return ibrScheduleBadgeClass(ev.status);
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * PR tab: production rows + standalone IBR rows that include product lines.
 * PO tab: purchase rows + standalone IBR rows that include raw-material lines.
 */
function warehouseCalendarEventMatchesRequestTab(ev: WarehouseCalendarEvent, tab: RequestType): boolean {
  if (ev.recordRoute === 'production') return tab === 'production';
  if (ev.recordRoute === 'purchase') return tab === 'purchase';
  if (ev.recordRoute === 'ibr') {
    if (tab === 'production') return ev.ibrHasProduct === true;
    return ev.ibrHasRawMaterial === true;
  }
  return false;
}

function stripCalendarEventHeadline(ev: WarehouseCalendarEvent): string {
  switch (ev.recordRoute) {
    case 'production':
      return 'Production request';
    case 'purchase':
      return 'Purchase order';
    case 'ibr':
      return 'Inter-branch';
    default:
      return 'Schedule';
  }
}

function stripCalendarItemLabel(ev: WarehouseCalendarEvent): string {
  switch (ev.recordRoute) {
    case 'production':
      return 'Product';
    case 'purchase':
      return 'Material';
    case 'ibr':
      return 'Details';
    default:
      return 'Item';
  }
}

function stripCalendarIconWrapClass(ev: WarehouseCalendarEvent): string {
  if (ev.calendarKind === 'ibr') return 'bg-amber-100';
  if (ev.calendarKind === 'purchase') return 'bg-blue-100';
  return 'bg-green-100';
}

function stripCalendarIconClass(ev: WarehouseCalendarEvent): string {
  if (ev.calendarKind === 'ibr') return 'text-amber-700';
  if (ev.calendarKind === 'purchase') return 'text-blue-600';
  return 'text-green-600';
}

function stripCalendarPrimaryCtaLabel(ev: WarehouseCalendarEvent): string {
  switch (ev.recordRoute) {
    case 'production':
      return 'View production request';
    case 'purchase':
      return 'View purchase order';
    case 'ibr':
      return 'View inter-branch request';
    default:
      return 'Open';
  }
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const pad = first.getDay();
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* ── Legacy mock demand forecast (disabled — Movements tab uses live DB data; see warehouseMovementsData.ts)
interface DemandDataPoint {
  date: string;
  actual?: number;
  forecast?: number;
  confidenceLow?: number;
  confidenceHigh?: number;
  isForecast: boolean;
}
interface ForecastItem {
  id: string;
  name: string;
  type: 'product' | 'material';
  category: string;
  currentStock: number;
  unit: string;
  avgDailyDemand: number;
  forecastedDailyDemand: number;
  daysOfCover: number;
  predictedStockoutDate: string;
  recommendedReorderDate: string;
  recommendedQuantity: number;
}
const mockForecastItems: ForecastItem[] = [];
const generateDemandData = (_itemId: string): DemandDataPoint[] => [];
*/

function stockComputeToUi(computed: string): StockStatus {
  if (computed === 'Critical' || computed === 'Out of Stock') return 'critical';
  if (computed === 'Low Stock') return 'warning';
  return 'healthy';
}

export default function WarehousePage() {
  const navigate = useNavigate();
  const { branch, addAuditLog, session, employeeName, role } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'finished' | 'raw'>('finished');
  const [requestType, setRequestType] = useState<RequestType>('production');
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [scheduleStripDetailDateKey, setScheduleStripDetailDateKey] = useState<string | null>(null);

  const [schedulePrLines, setSchedulePrLines] = useState<WarehouseProductionLineRow[]>([]);
  const [schedulePoLines, setSchedulePoLines] = useState<WarehousePurchaseLineRow[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('');
  const [prScheduleSortKey, setPrScheduleSortKey] = useState('requestDateIso');
  const [prScheduleSortDir, setPrScheduleSortDir] = useState<'asc' | 'desc'>('desc');
  const [poScheduleSortKey, setPoScheduleSortKey] = useState('orderDateIso');
  const [poScheduleSortDir, setPoScheduleSortDir] = useState<'asc' | 'desc'>('desc');
  const [prSchedulePage, setPrSchedulePage] = useState(1);
  const [poSchedulePage, setPoSchedulePage] = useState(1);

  const [scheduleCalendarModalOpen, setScheduleCalendarModalOpen] = useState(false);
  const [calendarModalYear, setCalendarModalYear] = useState(() => new Date().getFullYear());
  const [calendarModalMonth, setCalendarModalMonth] = useState(() => new Date().getMonth());
  const [calendarModalSelectedDateKey, setCalendarModalSelectedDateKey] = useState<string | null>(null);
  const [warehouseCalendarEvents, setWarehouseCalendarEvents] = useState<WarehouseCalendarEvent[]>([]);
  const [warehouseCalendarLoading, setWarehouseCalendarLoading] = useState(false);
  const [warehouseCalendarError, setWarehouseCalendarError] = useState<string | null>(null);

  // Orders Delivery Calendar
  const [ordersCalOpen, setOrdersCalOpen] = useState(false);
  const [ordersCalYear, setOrdersCalYear] = useState(() => new Date().getFullYear());
  const [ordersCalMonth, setOrdersCalMonth] = useState(() => new Date().getMonth());
  const [ordersCalEvents, setOrdersCalEvents] = useState<OrderDeliveryCalEvent[]>([]);
  const [ordersCalLoading, setOrdersCalLoading] = useState(false);
  const [ordersCalSelectedKey, setOrdersCalSelectedKey] = useState<string | null>(null);

  // Orders & Loading tab — live order rows + modals
  const [warehouseOrders, setWarehouseOrders] = useState<WarehouseOrderRow[]>([]);
  const [warehouseTrips, setWarehouseTrips] = useState<WarehouseTripSummary[]>([]);
  /** On-hand qty by variant for the active warehouse branch (loading pipeline). */
  const [warehouseStockByVariant, setWarehouseStockByVariant] = useState<Record<string, number>>({});
  const [warehouseOrdersLoading, setWarehouseOrdersLoading] = useState(false);
  const [pastTripGroups, setPastTripGroups] = useState<Array<{ trip: WarehouseTripSummary; orders: WarehouseOrderRow[] }>>(
    [],
  );
  const [pastTripsTotal, setPastTripsTotal] = useState(0);
  const [pastTripsPage, setPastTripsPage] = useState(1);
  const [pastTripsLoading, setPastTripsLoading] = useState(false);
  const [tripLoadingModalOpen, setTripLoadingModalOpen] = useState(false);
  const tripLoadingModalOpenRef = useRef(false);
  tripLoadingModalOpenRef.current = tripLoadingModalOpen;
  const [tripLoadingModalTrip, setTripLoadingModalTrip] = useState<WarehouseTripSummary | null>(null);
  const [tripLoadingModalOrderIds, setTripLoadingModalOrderIds] = useState<string[]>([]);
  const pastTripOrderById = useMemo(() => {
    const m = new Map<string, WarehouseOrderRow>();
    for (const g of pastTripGroups) {
      for (const o of g.orders) m.set(o.id, o);
    }
    return m;
  }, [pastTripGroups]);
  const tripLoadingModalOrders = useMemo(() => {
    if (!tripLoadingModalOpen || tripLoadingModalOrderIds.length === 0) return [];
    return tripLoadingModalOrderIds
      .map((id) => warehouseOrders.find((o) => o.id === id) ?? pastTripOrderById.get(id))
      .filter((o): o is WarehouseOrderRow => Boolean(o));
  }, [tripLoadingModalOpen, tripLoadingModalOrderIds, warehouseOrders, pastTripOrderById]);
  /** Order id while advancing Scheduled→Loading or Packed→Ready (Loading→Packed uses shipment modal). */
  const [warehouseStatusOrderId, setWarehouseStatusOrderId] = useState<string | null>(null);
  const [inTransitSubmitting, setInTransitSubmitting] = useState(false);
  const [warehouseFleetVehicles, setWarehouseFleetVehicles] = useState<Vehicle[]>([]);
  const [warehousePlanningDrivers, setWarehousePlanningDrivers] = useState<DriverOption[]>([]);
  const [warehousePlanningOrders, setWarehousePlanningOrders] = useState<OrderReadyForDispatch[]>([]);
  const [warehouseEditTrip, setWarehouseEditTrip] = useState<Trip | null>(null);
  const [showWarehouseEditTrip, setShowWarehouseEditTrip] = useState(false);
  const [warehouseEditTripOpening, setWarehouseEditTripOpening] = useState(false);

  const warehouseOrdersOnOngoingTrips = useMemo(() => {
    const tripIds = new Set(warehouseTrips.map((t) => t.id));
    return warehouseOrders.filter((o) => o.tripId != null && tripIds.has(o.tripId));
  }, [warehouseOrders, warehouseTrips]);

  const warehouseLoadingStats = useMemo(() => {
    const rows = warehouseOrdersOnOngoingTrips;
    return {
      readyToLoad: rows.filter((o) => o.status === 'Scheduled').length,
      readyToDepart: rows.filter((o) => o.status === 'Ready').length,
      stockIssues: rows.filter((o) => o.hasShortage).length,
      awaitingSchedule: rows.filter((o) => o.status === 'Approved').length,
    };
  }, [warehouseOrdersOnOngoingTrips]);

  /** Approved pipeline orders not linked to any trip yet (banner — not the trip-scoped cards). */
  const approvedAwaitingTripAssignment = useMemo(
    () => warehouseOrders.filter((o) => o.status === 'Approved' && !o.tripId).length,
    [warehouseOrders],
  );

  const warehouseTripGroups = useMemo(() => {
    const byTrip = new Map<string, WarehouseOrderRow[]>();
    for (const t of warehouseTrips) byTrip.set(t.id, []);
    for (const o of warehouseOrders) {
      if (o.tripId && byTrip.has(o.tripId)) {
        byTrip.get(o.tripId)!.push(o);
      }
    }
    return warehouseTrips
      .map((trip) => ({ trip, orders: byTrip.get(trip.id) ?? [] }))
      .filter((g) => g.orders.length > 0)
      .sort((a, b) => {
        const da = a.trip.scheduledDate ?? '';
        const db = b.trip.scheduledDate ?? '';
        if (da !== db) return da.localeCompare(db);
        return a.trip.tripNumber.localeCompare(b.trip.tripNumber);
      });
  }, [warehouseOrders, warehouseTrips]);
  const resolveWarehouseOrderRow = useCallback(
    (id: string) => warehouseOrders.find((o) => o.id === id) ?? pastTripOrderById.get(id),
    [warehouseOrders, pastTripOrderById],
  );
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofOrder, setProofOrder] = useState<WarehouseOrderRow | null>(null);
  /** Loading→Packed: same per-line qty flow as Order detail / trip logistics (`MarkInTransitModal`). */
  const [warehouseMarkPackedOpen, setWarehouseMarkPackedOpen] = useState(false);
  const [warehouseMarkPackedOrder, setWarehouseMarkPackedOrder] = useState<WarehouseOrderRow | null>(null);

  const [finishedGoodsRows, setFinishedGoodsRows] = useState<FinishedGood[]>([]);
  const [rawMaterialsRows, setRawMaterialsRows] = useState<RawMaterial[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  
  // Movements tab — live stock movements & same data sources as Product analytics / Material analytics
  const [movementsSelected, setMovementsSelected] = useState<MovementsTabSelection | null>(null);
  const [movementsShowVariantPicker, setMovementsShowVariantPicker] = useState(false);
  const [movementsShowMaterialPicker, setMovementsShowMaterialPicker] = useState(false);
  const [movementsChartData, setMovementsChartData] = useState<MonthlyMovementChartRow[]>([]);
  const [movementsRevenueChartData, setMovementsRevenueChartData] = useState<MonthlyRevenueChartRow[]>([]);
  const [movementsChartLoading, setMovementsChartLoading] = useState(false);
  const [movementsStockQty, setMovementsStockQty] = useState<number | null>(null);
  const [movementsVariantOrderRows, setMovementsVariantOrderRows] = useState<VariantInvolvedOrderRow[]>([]);
  const [movementsMaterialUsageRows, setMovementsMaterialUsageRows] = useState<MaterialUsageRow[]>([]);
  const [movementsHistoryLoading, setMovementsHistoryLoading] = useState(false);
  const [movementsLoadTick, setMovementsLoadTick] = useState(0);

  const getStatusColor = (status: StockStatus) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getStatusIcon = (status: StockStatus) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: StockStatus) => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'warning': return 'Low Stock';
      case 'critical': return 'Critical';
    }
  };

  const fetchWarehouseInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      let branchId: string | null = null;
      if (branch) {
        const { data: branchRow } = await supabase.from('branches').select('id').eq('name', branch).single();
        branchId = branchRow?.id ?? null;
      }

      let pQuery = supabase
        .from('products')
        .select(`
          id,
          name,
          status,
          total_stock,
          product_categories ( name, slug ),
          product_variants (
            id,
            sku,
            size,
            reorder_point,
            safety_stock,
            last_restocked,
            status,
            total_stock
          )
        `)
        .neq('status', 'Discontinued');
      if (branch) pQuery = pQuery.eq('branch', branch);
      const { data: prodRows, error: prodErr } = await pQuery;
      if (prodErr) throw prodErr;

      const allVariantIds: string[] = [];
      for (const p of prodRows ?? []) {
        const vars = ((p as Record<string, unknown>).product_variants as Record<string, unknown>[] | undefined) ?? [];
        for (const v of vars) {
          if ((v.status as string) !== 'Discontinued' && v.id) allVariantIds.push(String(v.id));
        }
      }

      const stockByVariant: Record<string, number> = {};
      if (branchId && allVariantIds.length > 0) {
        const { data: stRows, error: stErr } = await supabase
          .from('product_variant_stock')
          .select('variant_id, quantity')
          .eq('branch_id', branchId)
          .in('variant_id', allVariantIds);
        if (stErr) throw stErr;
        for (const r of stRows ?? []) {
          stockByVariant[r.variant_id] = r.quantity ?? 0;
        }
      }

      const finished: FinishedGood[] = [];
      for (const p of prodRows ?? []) {
        const row = p as Record<string, unknown>;
        const productId = String(row.id);
        const productName = String(row.name ?? '');
        const variants = ((row.product_variants as Record<string, unknown>[] | undefined) ?? []).filter(
          (v) => v.status !== 'Discontinued',
        );

        const cat = row.product_categories as { name?: string; slug?: string } | null;
        const categoryName = cat?.name ?? 'Uncategorized';
        const categorySlug = (cat?.slug?.trim() || categoryName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')) || 'uncategorized';

        for (const v of variants) {
          const variantId = String(v.id ?? '');
          if (!variantId) continue;

          const branchStock = branchId
            ? stockByVariant[variantId] ?? 0
            : Number(v.total_stock) || 0;
          const reorderPoint = Number(v.reorder_point) || 0;
          const computed = computeStockStatus(branchStock, reorderPoint);
          const uiStatus = stockComputeToUi(computed);

          const sizeLabel = String(v.size ?? '').trim();
          const sku = String(v.sku ?? '—');
          const rowName = sizeLabel ? `${productName} — ${sizeLabel}` : productName;

          const lr = v.last_restocked;
          const lastRestocked = lr
            ? new Date(String(lr)).toISOString().split('T')[0]
            : '—';

          const maxCapacity = Math.max(100, reorderPoint * 4, branchStock + 1);

          finished.push({
            id: variantId,
            productId,
            sku,
            variantSize: sizeLabel || '—',
            productName,
            name: rowName,
            category: categoryName,
            categorySlug,
            currentStock: branchStock,
            unit: 'pcs',
            reorderPoint,
            maxCapacity,
            location: '',
            lastRestocked,
            status: uiStatus,
          });
        }
      }

      setFinishedGoodsRows(
        finished.sort((a, b) => {
          const byProd = a.productName.localeCompare(b.productName);
          if (byProd !== 0) return byProd;
          return a.sku.localeCompare(b.sku);
        }),
      );

      const { data: catRows } = await supabase
        .from('material_categories')
        .select('id, branches ( name )')
        .eq('is_active', true);

      const branchCategoryIds = branch
        ? (catRows ?? []).filter((c) => {
            const br = (c as { branches?: { name?: string } | { name?: string }[] | null }).branches;
            const n = Array.isArray(br) ? br[0]?.name : br?.name;
            return n === branch;
          }).map((c: { id: string }) => c.id)
        : (catRows ?? []).map((c: { id: string }) => c.id);

      let rawList: RawMaterial[] = [];
      if (branchCategoryIds.length > 0) {
        const { data: matRows, error: matErr } = await supabase
          .from('raw_materials')
          .select(`
            id,
            name,
            sku,
            total_stock,
            reorder_point,
            last_restock_date,
            status,
            unit_of_measure,
            material_categories ( name )
          `)
          .in('category_id', branchCategoryIds)
          .neq('status', 'Discontinued');

        if (!matErr && matRows) {
          const matIds = matRows.map((m: { id: string }) => m.id);
          const matQtyById: Record<string, number> = {};
          if (branchId && matIds.length > 0) {
            const { data: msRows } = await supabase
              .from('material_stock')
              .select('material_id, quantity')
              .eq('branch_id', branchId)
              .in('material_id', matIds);
            for (const r of msRows ?? []) {
              matQtyById[r.material_id] = Number(r.quantity) ?? 0;
            }
          }

          rawList = matRows.map((m: Record<string, unknown>) => {
            const id = String(m.id);
            const totalAgg = Number(m.total_stock) || 0;
            const stock =
              branchId
                ? (id in matQtyById ? matQtyById[id] : totalAgg)
                : totalAgg;
            const reorderPoint = Number(m.reorder_point) || 0;
            const computed = computeStockStatus(stock, reorderPoint);
            const uiStatus = stockComputeToUi(computed);
            const uom = m.unit_of_measure ?? 'kg';
            const maxCapacity = Math.max(100, reorderPoint * 4, stock + 1);
            return {
              id,
              code: String(m.sku ?? ''),
              name: String(m.name ?? ''),
              category: (m.material_categories as { name?: string } | null)?.name ?? 'Uncategorized',
              currentStock: stock,
              unit: String(uom),
              maxCapacity,
              lastRestocked: m.last_restock_date ? String(m.last_restock_date) : '—',
              status: uiStatus,
            };
          });
        }
      }

      setRawMaterialsRows(rawList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error('[Warehouse inventory]', e);
      setFinishedGoodsRows([]);
      setRawMaterialsRows([]);
    } finally {
      setInventoryLoading(false);
    }
  }, [branch]);

  const fetchSchedule = useCallback(async () => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const branchResult = branch
        ? await supabase.from('branches').select('id').eq('name', branch).maybeSingle()
        : { data: null as { id: string } | null };
      const resolvedBranchId = branchResult.data?.id ?? null;

      const [prRes, poRes] = await Promise.all([
        supabase
          .from('production_requests')
          .select(
            `id, pr_number, branch_id, status, request_date, expected_completion_date, created_by, created_at,
            is_transfer_request, inter_branch_request_id,
            branches:branches!branch_id(name),
            production_request_items(
              id, quantity,
              product_variants(sku, size, products(name))
            )`,
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('purchase_orders')
          .select(
            `id, po_number, branch_id, status, order_date, expected_delivery_date, actual_delivery_date, created_by, created_at,
            is_transfer_request, inter_branch_request_id,
            suppliers(name),
            branches:branches!branch_id(name),
            purchase_order_items(
              id, quantity_ordered, unit_of_measure,
              raw_materials(name, sku, unit_of_measure)
            )`,
          )
          .order('created_at', { ascending: false }),
      ]);

      if (prRes.error) throw prRes.error;
      if (poRes.error) throw poRes.error;

      const prRows = (prRes.data ?? []) as Array<{
        id: string;
        pr_number: string;
        branch_id: string | null;
        status: string;
        request_date: string;
        expected_completion_date: string | null;
        created_by: string | null;
        inter_branch_request_id: string | null;
        production_request_items: Array<{
          id: string;
          quantity: number | string;
          product_variants: { sku?: string; size?: string; products?: { name?: string } | { name?: string }[] } | { sku?: string; size?: string; products?: { name?: string } | { name?: string }[] }[] | null;
        }> | null;
      }>;

      const poRows = (poRes.data ?? []) as Array<{
        id: string;
        po_number: string;
        branch_id: string | null;
        status: string;
        order_date: string;
        expected_delivery_date: string | null;
        actual_delivery_date: string | null;
        created_by: string | null;
        is_transfer_request: boolean;
        inter_branch_request_id: string | null;
        suppliers: { name?: string } | null;
        purchase_order_items: Array<{
          id: string;
          quantity_ordered: number | string;
          unit_of_measure?: string | null;
          raw_materials: { name?: string; sku?: string; unit_of_measure?: string } | null;
        }> | null;
      }>;

      const prLines: WarehouseProductionLineRow[] = [];
      for (const pr of prRows) {
        if (isIbrFlowProductionRequest(pr)) continue;
        if (resolvedBranchId && pr.branch_id !== resolvedBranchId) continue;
        const items = pr.production_request_items ?? [];
        for (const it of items) {
          const pv = scheduleAsOne(it.product_variants as Parameters<typeof scheduleAsOne>[0]);
          const prod = pv ? scheduleAsOne(pv.products as Parameters<typeof scheduleAsOne>[0]) : null;
          const productName = prod?.name ? String(prod.name) : '—';
          const size = pv?.size ? String(pv.size) : '';
          const sku = pv?.sku ? String(pv.sku) : '';
          const displayName = size ? `${productName} — ${size}` : productName;
          const requestDateIso = pr.request_date;
          const exp = pr.expected_completion_date;
          const calendarAnchorIso = exp || requestDateIso || null;
          prLines.push({
            rowKey: `${pr.id}-${it.id}`,
            prId: pr.id,
            prNumber: pr.pr_number,
            productSku: sku,
            productName: displayName,
            quantity: Number(it.quantity) || 0,
            unit: 'pcs',
            requestDateFmt: fmtScheduleDate(requestDateIso),
            expectedCompletionFmt: fmtScheduleDate(exp),
            status: pr.status,
            requestedBy: pr.created_by?.trim() || '—',
            requestDateIso,
            expectedCompletionIso: exp,
            calendarAnchorIso,
          });
        }
      }

      const poLines: WarehousePurchaseLineRow[] = [];
      for (const po of poRows) {
        if (hidePoFromSchedule(po)) continue;
        if (resolvedBranchId && po.branch_id !== resolvedBranchId) continue;
        const supplier = po.suppliers?.name?.trim() || '—';
        const items = po.purchase_order_items ?? [];
        for (const it of items) {
          const rm = it.raw_materials;
          const uom =
            (it.unit_of_measure && String(it.unit_of_measure).trim()) ||
            rm?.unit_of_measure ||
            'units';
          const calendarAnchorIso = po.expected_delivery_date || po.order_date || null;
          poLines.push({
            rowKey: `${po.id}-${it.id}`,
            poId: po.id,
            poNumber: po.po_number,
            materialCode: rm?.sku?.trim() || '—',
            materialName: rm?.name?.trim() || '—',
            quantity: Number(it.quantity_ordered) || 0,
            unit: String(uom),
            supplier,
            requestedDeliveryFmt: fmtScheduleDate(po.expected_delivery_date),
            estimatedArrivalFmt: fmtScheduleDate(po.expected_delivery_date || po.actual_delivery_date),
            status: po.status,
            requestedBy: po.created_by?.trim() || '—',
            orderDateIso: po.order_date,
            calendarAnchorIso,
          });
        }
      }

      setSchedulePrLines(prLines);
      setSchedulePoLines(poLines);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load schedule';
      setScheduleError(msg);
      setSchedulePrLines([]);
      setSchedulePoLines([]);
    } finally {
      setScheduleLoading(false);
    }
  }, [branch]);

  const fetchWarehouseCalendarEvents = useCallback(async () => {
    setWarehouseCalendarLoading(true);
    setWarehouseCalendarError(null);
    try {
      const branchResult = branch
        ? await supabase.from('branches').select('id').eq('name', branch).maybeSingle()
        : { data: null as { id: string } | null };
      const resolvedBranchId = branchResult.data?.id ?? null;

      const [prRes, poRes, ibrRes] = await Promise.all([
        supabase
          .from('production_requests')
          .select(
            `id, pr_number, branch_id, status, request_date, expected_completion_date, created_by, created_at,
            is_transfer_request, inter_branch_request_id,
            branches:branches!branch_id(name),
            production_request_items(
              id, quantity,
              product_variants(sku, size, products(name))
            )`,
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('purchase_orders')
          .select(
            `id, po_number, branch_id, status, order_date, expected_delivery_date, actual_delivery_date, created_by, created_at,
            is_transfer_request, inter_branch_request_id,
            suppliers(name),
            branches:branches!branch_id(name),
            purchase_order_items(
              id, quantity_ordered, unit_of_measure,
              raw_materials(name, sku, unit_of_measure)
            )`,
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('inter_branch_requests')
          .select(
            `id, ibr_number, status, scheduled_departure_date, created_at, submitted_at, approved_at, fulfilled_at,
            requesting_branch_id, fulfilling_branch_id,
            req_br:branches!requesting_branch_id(name),
            ful_br:branches!fulfilling_branch_id(name),
            inter_branch_request_items(line_kind)`,
          )
          .order('created_at', { ascending: false }),
      ]);

      if (prRes.error) throw prRes.error;
      if (poRes.error) throw poRes.error;
      if (ibrRes.error) throw ibrRes.error;

      const prRows = (prRes.data ?? []) as Array<{
        id: string;
        pr_number: string;
        branch_id: string | null;
        status: string;
        request_date: string;
        expected_completion_date: string | null;
        created_by: string | null;
        inter_branch_request_id: string | null;
        production_request_items: Array<{
          id: string;
          quantity: number | string;
          product_variants: { sku?: string; size?: string; products?: { name?: string } | { name?: string }[] } | { sku?: string; size?: string; products?: { name?: string } | { name?: string }[] }[] | null;
        }> | null;
      }>;

      const poRows = (poRes.data ?? []) as Array<{
        id: string;
        po_number: string;
        branch_id: string | null;
        status: string;
        order_date: string;
        expected_delivery_date: string | null;
        actual_delivery_date: string | null;
        created_by: string | null;
        is_transfer_request: boolean;
        inter_branch_request_id: string | null;
        suppliers: { name?: string } | null;
        purchase_order_items: Array<{
          id: string;
          quantity_ordered: number | string;
          unit_of_measure?: string | null;
          raw_materials: { name?: string; sku?: string; unit_of_measure?: string } | null;
        }> | null;
      }>;

      const ibrRows = (ibrRes.data ?? []) as Array<{
        id: string;
        ibr_number: string;
        status: string;
        scheduled_departure_date: string | null;
        created_at: string;
        submitted_at: string | null;
        approved_at: string | null;
        fulfilled_at: string | null;
        requesting_branch_id: string;
        fulfilling_branch_id: string;
        req_br: { name?: string } | null;
        ful_br: { name?: string } | null;
        inter_branch_request_items: Array<{ line_kind?: string }> | null;
      }>;

      const events: WarehouseCalendarEvent[] = [];

      for (const pr of prRows) {
        if (resolvedBranchId && pr.branch_id !== resolvedBranchId) continue;
        const ibrFlow = isIbrFlowProductionRequest(pr);
        const calKind = ibrFlow ? 'ibr' : 'production';
        const items = pr.production_request_items ?? [];
        for (const it of items) {
          const pv = scheduleAsOne(it.product_variants as Parameters<typeof scheduleAsOne>[0]);
          const prod = pv ? scheduleAsOne(pv.products as Parameters<typeof scheduleAsOne>[0]) : null;
          const productName = prod?.name ? String(prod.name) : '—';
          const size = pv?.size ? String(pv.size) : '';
          const sku = pv?.sku ? String(pv.sku) : '';
          const displayName = size ? `${productName} — ${size}` : productName;
          const qty = Number(it.quantity) || 0;
          const reqKey = normalizeAnchorDateKey(pr.request_date);
          const expKey = normalizeAnchorDateKey(pr.expected_completion_date);
          const base = {
            calendarKind: calKind,
            recordRoute: 'production' as const,
            recordId: pr.id,
            quantity: qty,
            unit: 'pcs',
            status: pr.status,
          };
          if (reqKey && expKey && reqKey === expKey) {
            events.push({
              id: `cal-pr-${pr.id}-${it.id}-both-${reqKey}`,
              ...base,
              anchorDateKey: reqKey,
              title: `${pr.pr_number} · ${displayName}`,
              detail: 'Request / expected completion',
            });
          } else {
            if (reqKey) {
              events.push({
                id: `cal-pr-${pr.id}-${it.id}-req-${reqKey}`,
                ...base,
                anchorDateKey: reqKey,
                title: `${pr.pr_number} · ${displayName}`,
                detail: 'Request date',
              });
            }
            if (expKey) {
              events.push({
                id: `cal-pr-${pr.id}-${it.id}-exp-${expKey}`,
                ...base,
                anchorDateKey: expKey,
                title: `${pr.pr_number} · ${displayName}`,
                detail: 'Expected completion',
              });
            }
          }
        }
      }

      for (const po of poRows) {
        if (resolvedBranchId && po.branch_id !== resolvedBranchId) continue;
        const ibrFlow = hidePoFromSchedule(po);
        const calKind = ibrFlow ? 'ibr' : 'purchase';
        const supplier = po.suppliers?.name?.trim() || '—';
        const items = po.purchase_order_items ?? [];
        for (const it of items) {
          const rm = it.raw_materials;
          const uom =
            (it.unit_of_measure && String(it.unit_of_measure).trim()) ||
            rm?.unit_of_measure ||
            'units';
          const materialName = rm?.name?.trim() || '—';
          const ordKey = normalizeAnchorDateKey(po.order_date);
          const delKey = normalizeAnchorDateKey(po.expected_delivery_date || po.actual_delivery_date);
          const qty = Number(it.quantity_ordered) || 0;
          const base = {
            calendarKind: calKind,
            recordRoute: 'purchase' as const,
            recordId: po.id,
            quantity: qty,
            unit: String(uom),
            supplier,
            status: po.status,
          };
          if (ordKey && delKey && ordKey === delKey) {
            events.push({
              id: `cal-po-${po.id}-${it.id}-both-${ordKey}`,
              ...base,
              anchorDateKey: ordKey,
              title: `${po.po_number} · ${materialName}`,
              detail: 'Order / delivery',
            });
          } else {
            if (ordKey) {
              events.push({
                id: `cal-po-${po.id}-${it.id}-ord-${ordKey}`,
                ...base,
                anchorDateKey: ordKey,
                title: `${po.po_number} · ${materialName}`,
                detail: 'Order date',
              });
            }
            if (delKey) {
              events.push({
                id: `cal-po-${po.id}-${it.id}-del-${delKey}`,
                ...base,
                anchorDateKey: delKey,
                title: `${po.po_number} · ${materialName}`,
                detail: po.actual_delivery_date ? 'Actual delivery' : 'Expected delivery',
              });
            }
          }
        }
      }

      for (const ib of ibrRows) {
        if (
          resolvedBranchId &&
          ib.requesting_branch_id !== resolvedBranchId &&
          ib.fulfilling_branch_id !== resolvedBranchId
        ) {
          continue;
        }
        const routeLabel =
          resolvedBranchId && ib.fulfilling_branch_id === resolvedBranchId ? 'Shipping branch' : 'Receiving branch';
        const partner =
          resolvedBranchId && ib.fulfilling_branch_id === resolvedBranchId
            ? ib.req_br?.name ?? 'Requesting branch'
            : ib.ful_br?.name ?? 'Fulfilling branch';

        const lineItems = ib.inter_branch_request_items ?? [];
        const ibrHasProduct = lineItems.some((i) => i.line_kind === 'product');
        const ibrHasRawMaterial = lineItems.some((i) => i.line_kind === 'raw_material');

        if (ib.scheduled_departure_date) {
          const dk = normalizeAnchorDateKey(ib.scheduled_departure_date);
          if (dk) {
            events.push({
              id: `cal-ibr-${ib.id}-dep-${dk}`,
              calendarKind: 'ibr',
              anchorDateKey: dk,
              title: `${ib.ibr_number} · Scheduled departure`,
              detail: `${routeLabel} · ${partner}`,
              recordRoute: 'ibr',
              recordId: ib.id,
              status: ib.status,
              ibrHasProduct,
              ibrHasRawMaterial,
            });
          }
        }
        const fulfilledKey = normalizeAnchorDateKey(ib.fulfilled_at);
        if (fulfilledKey) {
          events.push({
            id: `cal-ibr-${ib.id}-ful-${fulfilledKey}`,
            calendarKind: 'ibr',
            anchorDateKey: fulfilledKey,
            title: `${ib.ibr_number} · Fulfilled`,
            detail: partner,
            recordRoute: 'ibr',
            recordId: ib.id,
            status: ib.status,
            ibrHasProduct,
            ibrHasRawMaterial,
          });
        }
      }

      setWarehouseCalendarEvents(events);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load calendar';
      setWarehouseCalendarError(msg);
      setWarehouseCalendarEvents([]);
    } finally {
      setWarehouseCalendarLoading(false);
    }
  }, [branch]);

  const fetchOrdersCalendarEvents = useCallback(async () => {
    setOrdersCalLoading(true);
    try {
      const branchResult = branch
        ? await supabase.from('branches').select('id').eq('name', branch).maybeSingle()
        : null;
      const bid = branchResult?.data?.id ?? null;

      let q = supabase
        .from('orders')
        .select('id, order_number, customer_name, required_date, scheduled_departure_date, actual_delivery, status, urgency')
        .not('status', 'in', '("Draft","Cancelled","Rejected")');
      if (bid) q = (q as typeof q).eq('branch_id', bid);

      const { data, error } = await q;
      if (error) throw error;

      const events: OrderDeliveryCalEvent[] = [];
      for (const o of (data ?? []) as Array<Record<string, unknown>>) {
        const base = {
          id: String(o.id ?? ''),
          orderNumber: String(o.order_number ?? '—'),
          customer: String(o.customer_name ?? '—'),
          status: String(o.status ?? ''),
          urgency: String(o.urgency ?? ''),
        };
        const req = normalizeAnchorDateKey(o.required_date as string | null);
        if (req) events.push({ ...base, dateKey: req, dateType: 'required' });
        const sched = normalizeAnchorDateKey(o.scheduled_departure_date as string | null);
        if (sched && sched !== req) events.push({ ...base, dateKey: sched, dateType: 'scheduled' });
        const del = normalizeAnchorDateKey(o.actual_delivery as string | null);
        if (del && del !== req && del !== sched) events.push({ ...base, dateKey: del, dateType: 'delivered' });
      }
      setOrdersCalEvents(events);
    } catch (e: unknown) {
      console.error('Failed to load orders calendar:', e);
      setOrdersCalEvents([]);
    } finally {
      setOrdersCalLoading(false);
    }
  }, [branch]);

  const fetchWarehouseOrders = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setWarehouseOrdersLoading(true);
    try {
      const branchResult = branch
        ? await supabase.from('branches').select('id, code').eq('name', branch).maybeSingle()
        : null;
      const bid = branchResult?.data?.id ?? null;
      const bcode = (branchResult?.data as { code?: string } | null)?.code ?? '';

      let q = supabase
        .from('orders')
        .select('id, order_number, customer_name, delivery_address, required_date, status, urgency, branch_id')
        .in('status', [...WAREHOUSE_LOADING_TAB_STATUSES])
        .order('required_date', { ascending: true });
      if (bid) q = (q as typeof q).eq('branch_id', bid);

      const { data: orderRows, error } = await q;
      if (error) throw error;
      if (!orderRows?.length) {
        setWarehouseOrders([]);
        setWarehouseTrips([]);
        setWarehouseStockByVariant({});
        return;
      }

      const orderIds = (orderRows as any[]).map((o) => o.id as string);
      const orderIdSet = new Set(orderIds);
      const { data: lineRows } = await supabase
        .from('order_line_items')
        .select('id, order_id, product_name, variant_description, quantity, unit_price, quantity_shipped, quantity_delivered, variant_id, sku, line_total, discount_percent, discount_amount')
        .in('order_id', orderIds);

      const linesByOrder: Record<string, OrderLineItem[]> = {};
      for (const lr of (lineRows ?? []) as any[]) {
        const oid = lr.order_id as string;
        if (!linesByOrder[oid]) linesByOrder[oid] = [];
        linesByOrder[oid].push({
          id: lr.id,
          sku: lr.sku ?? '',
          variantId: lr.variant_id ?? undefined,
          productName: lr.product_name ?? '',
          variantDescription: lr.variant_description ?? '',
          quantity: Number(lr.quantity ?? 0),
          unitPrice: Number(lr.unit_price ?? 0),
          discountPercent: Number(lr.discount_percent ?? 0),
          discountAmount: Number(lr.discount_amount ?? 0),
          lineTotal: Number(lr.line_total ?? 0),
          stockHint: 'Available',
          quantityShipped: Number(lr.quantity_shipped ?? 0),
          quantityDelivered: Number(lr.quantity_delivered ?? 0),
        });
      }

      const variantIds = new Set<string>();
      for (const oid of orderIds) {
        for (const li of linesByOrder[oid] ?? []) {
          if (li.variantId) variantIds.add(li.variantId);
        }
      }

      const imageByVariant = new Map<string, string>();
      const productLinkByVariant = new Map<string, { productId: string; categorySlug: string }>();
      if (variantIds.size > 0) {
        const { data: vimgs } = await supabase
          .from('product_variants')
          .select('id, product_id, products(image_url, product_categories(slug))')
          .in('id', [...variantIds]);
        for (const raw of (vimgs ?? []) as any[]) {
          const rowId = String(raw.id);
          const pid = raw.product_id != null ? String(raw.product_id) : null;
          const prod = Array.isArray(raw.products) ? raw.products[0] : raw.products;
          const u = prod?.image_url;
          if (typeof u === 'string' && u) imageByVariant.set(rowId, u);
          if (pid) {
            const cat = prod?.product_categories;
            const catRow = Array.isArray(cat) ? cat[0] : cat;
            const slug = catRow?.slug;
            productLinkByVariant.set(rowId, {
              productId: pid,
              categorySlug: typeof slug === 'string' ? slug : '',
            });
          }
        }
      }

      for (const oid of orderIds) {
        const list = linesByOrder[oid];
        if (!list?.length) continue;
        linesByOrder[oid] = list.map((li) => {
          const link = li.variantId ? productLinkByVariant.get(li.variantId) : undefined;
          return {
            ...li,
            imageUrl: li.variantId ? imageByVariant.get(li.variantId) : undefined,
            productId: link?.productId,
            categorySlug: link?.categorySlug || undefined,
          };
        });
      }

      const onHandByVariant = new Map<string, number>();
      if (bid && variantIds.size > 0) {
        const { data: pvsData } = await supabase
          .from('product_variant_stock')
          .select('variant_id, quantity')
          .eq('branch_id', bid)
          .in('variant_id', [...variantIds]);
        for (const row of (pvsData ?? []) as { variant_id: string; quantity: unknown }[]) {
          onHandByVariant.set(row.variant_id, Number(row.quantity ?? 0));
        }
      }

      const orderIdToTripId = new Map<string, string>();
      const tripSummaries: WarehouseTripSummary[] = [];

      if (bid) {
        const { data: tripRows, error: tripErr } = await supabase
          .from('trips')
          .select('id, trip_number, vehicle_name, driver_name, status, scheduled_date, order_ids, delay_reason')
          .eq('branch_id', bid);
        if (tripErr) console.warn('Warehouse: could not load trips for grouping:', tripErr.message);
        for (const t of (tripRows ?? []) as any[]) {
          const tripStatus = String(t.status ?? '');
          if (tripStatus === 'Completed') continue;
          const oids = (t.order_ids as string[] | null) ?? [];
          if (!oids.some((id) => orderIdSet.has(id))) continue;
          tripSummaries.push({
            id: t.id,
            tripNumber: t.trip_number ?? '—',
            vehicleName: t.vehicle_name ?? '—',
            driverName: t.driver_name ?? '—',
            scheduledDate: t.scheduled_date ?? null,
            status: String(t.status ?? ''),
            delayReason:
              t.delay_reason != null && String(t.delay_reason).trim() !== ''
                ? String(t.delay_reason)
                : null,
          });
          for (const oid of oids) {
            if (orderIdSet.has(oid)) orderIdToTripId.set(oid, t.id as string);
          }
        }
        tripSummaries.sort((a, b) => {
          const da = a.scheduledDate ?? '';
          const db = b.scheduledDate ?? '';
          if (da !== db) return da.localeCompare(db);
          return a.tripNumber.localeCompare(b.tripNumber);
        });
      }

      setWarehouseStockByVariant(Object.fromEntries(onHandByVariant));
      setWarehouseTrips(tripSummaries);

      const rows: WarehouseOrderRow[] = (orderRows as any[]).map((o) => {
        const items = linesByOrder[o.id] ?? [];
        const resolvedStatus = warehouseOrderStatusResolved(String(o.status ?? ''), items);
        const base: WarehouseOrderRow = {
          id: o.id,
          orderNumber: o.order_number ?? '—',
          customerName: o.customer_name ?? '—',
          deliveryAddress: o.delivery_address ?? null,
          requiredDate: o.required_date ?? null,
          status: resolvedStatus,
          urgency: o.urgency ?? '',
          branchId: o.branch_id ?? null,
          branchCode: bcode,
          items,
          hasShortage: false,
          tripId: orderIdToTripId.get(o.id) ?? null,
        };
        return { ...base, hasShortage: warehouseOrderHasShortage(base, onHandByVariant) };
      });

      setWarehouseOrders(rows);

      setTripLoadingModalOrderIds((prev) => {
        if (!tripLoadingModalOpenRef.current || prev.length === 0) return prev;
        const idSet = new Set(rows.map((r) => r.id));
        const next = prev.filter((id) => idSet.has(id));
        return next.length > 0 ? next : prev;
      });
    } catch (e: unknown) {
      console.error('Failed to load warehouse orders:', e);
      setWarehouseOrders([]);
      setWarehouseTrips([]);
      setWarehouseStockByVariant({});
    } finally {
      if (!silent) setWarehouseOrdersLoading(false);
    }
  }, [branch]);

  const fetchPastTrips = useCallback(async () => {
    setPastTripsLoading(true);
    try {
      const branchResult = branch
        ? await supabase.from('branches').select('id, code').eq('name', branch).maybeSingle()
        : null;
      const bid = branchResult?.data?.id ?? null;
      const bcode = (branchResult?.data as { code?: string } | null)?.code ?? '';

      if (!bid) {
        setPastTripGroups([]);
        setPastTripsTotal(0);
        return;
      }

      const pageSize = TABLE_PAGE_SIZE;
      const from = (pastTripsPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: tripRows, count, error } = await supabase
        .from('trips')
        .select('id, trip_number, vehicle_name, driver_name, status, scheduled_date, order_ids, delay_reason', {
          count: 'exact',
        })
        .eq('branch_id', bid)
        .eq('status', 'Completed')
        .order('scheduled_date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setPastTripsTotal(count ?? 0);

      const trips = (tripRows ?? []) as any[];
      const orderIdToTripId = new Map<string, string>();
      const orderIdSet = new Set<string>();
      for (const t of trips) {
        const oids = (t.order_ids as string[] | null) ?? [];
        for (const oid of oids) {
          orderIdToTripId.set(oid, t.id);
          orderIdSet.add(oid);
        }
      }

      const rows = await loadWarehouseOrderRowsByIds([...orderIdSet], bid, bcode, orderIdToTripId);
      const rowById = new Map(rows.map((r) => [r.id, r]));

      const groups = trips.map((t) => {
        const trip: WarehouseTripSummary = {
          id: t.id,
          tripNumber: t.trip_number ?? '—',
          vehicleName: t.vehicle_name ?? '—',
          driverName: t.driver_name ?? '—',
          scheduledDate: t.scheduled_date ?? null,
          status: String(t.status ?? ''),
          delayReason:
            t.delay_reason != null && String(t.delay_reason).trim() !== ''
              ? String(t.delay_reason)
              : null,
        };
        const oids = (t.order_ids as string[] | null) ?? [];
        const orders = oids.map((oid) => rowById.get(oid)).filter((o): o is WarehouseOrderRow => Boolean(o));
        return { trip, orders };
      });

      setPastTripGroups(groups);
    } catch (e: unknown) {
      console.error('Failed to load past warehouse trips:', e);
      setPastTripGroups([]);
      setPastTripsTotal(0);
    } finally {
      setPastTripsLoading(false);
    }
  }, [branch, pastTripsPage]);

  useEffect(() => {
    if (activeTab === 'requests') void fetchSchedule();
  }, [activeTab, fetchSchedule]);

  useEffect(() => {
    if (activeTab === 'requests') void fetchWarehouseCalendarEvents();
  }, [activeTab, branch, fetchWarehouseCalendarEvents]);

  useEffect(() => {
    if (activeTab === 'orders') void fetchOrdersCalendarEvents();
    if (activeTab === 'orders') void fetchWarehouseOrders();
  }, [activeTab, branch, fetchOrdersCalendarEvents, fetchWarehouseOrders]);

  useEffect(() => {
    if (activeTab !== 'orders' || !branch?.trim()) {
      setWarehouseFleetVehicles([]);
      setWarehousePlanningDrivers([]);
      setWarehousePlanningOrders([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [fleet, drv, oq] = await Promise.all([
        fetchFleetTrucksForBranch(branch),
        fetchDriversForBranch(branch),
        fetchLogisticsOrderQueue(branch),
      ]);
      if (cancelled) return;
      setWarehouseFleetVehicles(fleet.vehicles);
      setWarehousePlanningDrivers(drv.drivers);
      setWarehousePlanningOrders(oq.orders);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, branch]);

  useEffect(() => {
    if (activeTab === 'orders') void fetchPastTrips();
  }, [activeTab, fetchPastTrips]);

  useEffect(() => {
    setPastTripsPage(1);
  }, [branch]);

  useEffect(() => {
    setScheduleSearch('');
    setScheduleStatusFilter('');
    setPrSchedulePage(1);
    setPoSchedulePage(1);
  }, [branch, requestType]);

  useEffect(() => {
    void fetchWarehouseInventory();
  }, [fetchWarehouseInventory]);

  useEffect(() => {
    if (activeTab !== 'movements' || !movementsSelected) return;
    let cancelled = false;
    void (async () => {
      setMovementsChartLoading(true);
      setMovementsHistoryLoading(true);
      setMovementsChartData([]);
      setMovementsRevenueChartData([]);
      setMovementsVariantOrderRows([]);
      setMovementsMaterialUsageRows([]);
      setMovementsStockQty(null);
      try {
        if (movementsSelected.kind === 'variant') {
          const [metrics, stock, orders] = await Promise.all([
            fetchVariantMonthlyOrderMetrics(movementsSelected.variantId, branch),
            fetchVariantStockAtBranch(movementsSelected.variantId, branch),
            fetchVariantInvolvedOrders(movementsSelected.variantId, branch),
          ]);
          if (cancelled) return;
          setMovementsChartData(metrics.units);
          setMovementsRevenueChartData(metrics.revenue);
          setMovementsStockQty(stock);
          setMovementsVariantOrderRows(orders);
        } else {
          const bCode = await resolveBranchCode(branch);
          if (cancelled) return;
          const [chart, stock, usage] = await Promise.all([
            fetchMaterialMonthlyUsageFromConsumption(movementsSelected.materialId, bCode),
            fetchMaterialStockAtBranch(movementsSelected.materialId, branch),
            fetchMaterialUsageRows(movementsSelected.materialId, bCode),
          ]);
          if (cancelled) return;
          setMovementsChartData(chart);
          setMovementsRevenueChartData([]);
          setMovementsStockQty(stock);
          setMovementsMaterialUsageRows(usage);
        }
      } finally {
        if (!cancelled) {
          setMovementsChartLoading(false);
          setMovementsHistoryLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, movementsSelected, branch, movementsLoadTick]);

  // ── Orders & Loading tab handlers ────────────────────────────────────────
  const applyWarehouseShipment = useCallback(
    async (
      rows: { itemId: string; shippedQuantity: number }[],
      order: WarehouseOrderRow,
      nextOrderStatus: 'Packed' | 'In Transit',
    ): Promise<boolean> => {
      const byLine = new Map(rows.map((r) => [r.itemId, r.shippedQuantity]));

      for (const li of order.items) {
        const ship = byLine.get(li.id);
        if (ship === undefined) continue;
        if (ship < 0) {
          alert('Each sent quantity must be 0 or more.');
          return false;
        }
        const prevCum = li.quantityShipped ?? 0;
        if (prevCum + ship > li.quantity) {
          alert(
            `"${li.productName}": cannot send more than the remaining to fulfill this line (ordered ${li.quantity}, already ${prevCum} recorded for this line, this shipment: ${ship}).`,
          );
          return false;
        }
      }

      if (!order.branchId) {
        alert('This order has no branch assigned.');
        return false;
      }

      const branchId = order.branchId;
      const branchCode = order.branchCode;
      const lineWithShip = order.items.map((li) => ({ line: li, ship: byLine.get(li.id) ?? 0 }));

      for (const { line: l, ship } of lineWithShip) {
        if (!l.variantId || ship <= 0) continue;
        const { data: pvs, error: pErr } = await supabase
          .from('product_variant_stock')
          .select('id, quantity')
          .eq('variant_id', l.variantId)
          .eq('branch_id', branchId)
          .maybeSingle();
        if (pErr) {
          alert(pErr.message);
          return false;
        }
        const onHand = pvs ? Number((pvs as { quantity?: unknown }).quantity) : 0;
        if (onHand < ship) {
          alert(`Not enough stock for "${l.productName}" at this branch. On hand: ${onHand}, sending: ${ship}.`);
          return false;
        }
      }

      const movementReason =
        nextOrderStatus === 'Packed' ? 'Order packed / loaded (shipment)' : 'Order in transit (shipment)';

      setInTransitSubmitting(true);
      try {
        for (const { line: l, ship } of lineWithShip) {
          if (l.variantId && ship > 0) {
            const { data: pvs } = await supabase
              .from('product_variant_stock')
              .select('id, quantity')
              .eq('variant_id', l.variantId)
              .eq('branch_id', branchId)
              .single();
            if (!pvs) throw new Error(`No inventory row for "${l.productName}" at this branch.`);
            const newBranch = Math.max(0, Number((pvs as { quantity?: unknown }).quantity) - ship);
            const { error: u1 } = await supabase
              .from('product_variant_stock')
              .update({ quantity: newBranch, updated_at: new Date().toISOString() })
              .eq('id', (pvs as { id: string }).id);
            if (u1) throw u1;

            const { data: vrow } = await supabase
              .from('product_variants')
              .select('total_stock, sku')
              .eq('id', l.variantId)
              .single();
            if (vrow) {
              const newTotal = Math.max(0, Number((vrow as { total_stock?: unknown }).total_stock ?? 0) - ship);
              const { error: u2 } = await supabase
                .from('product_variants')
                .update({ total_stock: newTotal, updated_at: new Date().toISOString() })
                .eq('id', l.variantId);
              if (u2) throw u2;
            }

            const { error: mErr } = await supabase.from('product_stock_movements').insert({
              variant_id: l.variantId,
              variant_sku: (vrow as { sku?: string } | null)?.sku ?? l.sku,
              product_name: l.productName,
              movement_type: 'Out',
              quantity: ship,
              from_branch: branchCode || null,
              reason: movementReason,
              performed_by: employeeName || session?.user?.email || role,
              reference_number: order.id,
              timestamp: new Date().toISOString(),
            });
            if (mErr) throw mErr;
          }

          const prevCum = l.quantityShipped ?? 0;
          const add = byLine.get(l.id) ?? 0;
          const { error: lineErr } = await supabase
            .from('order_line_items')
            .update({ quantity_shipped: prevCum + add, updated_at: new Date().toISOString() })
            .eq('id', l.id);
          if (lineErr) throw lineErr;
        }

        const { error: ordErr } = await supabase
          .from('orders')
          .update({ status: nextOrderStatus, updated_at: new Date().toISOString() })
          .eq('id', order.id);
        if (ordErr) throw ordErr;

        setWarehouseOrders((prev) =>
          prev.map((o) =>
            o.id !== order.id
              ? o
              : {
                  ...o,
                  status: nextOrderStatus,
                  hasShortage: nextOrderStatus === 'In Transit' ? false : o.hasShortage,
                  items: o.items.map((li) => {
                    const ship = byLine.get(li.id) ?? 0;
                    return { ...li, quantityShipped: (li.quantityShipped ?? 0) + ship };
                  }),
                },
          ),
        );
        addAuditLog(
          nextOrderStatus === 'Packed' ? 'Packed / loaded (shipment)' : 'In transit (shipment)',
          'Order',
          `Order ${order.orderNumber} → ${nextOrderStatus} from Warehouse`,
        );
        void fetchWarehouseOrders({ silent: true });
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to update shipment';
        alert(msg);
        return false;
      } finally {
        setInTransitSubmitting(false);
      }
    },
    [addAuditLog, employeeName, fetchWarehouseOrders, role, session?.user?.email],
  );

  const handleConfirmInTransit = async (
    rows: { itemId: string; shippedQuantity: number }[],
    order: WarehouseOrderRow,
  ) => {
    await applyWarehouseShipment(rows, order, 'In Transit');
  };

  const advanceWarehouseOrderStatus = async (order: WarehouseOrderRow, nextStatus: string) => {
    const allowed: Record<string, string> = {
      Scheduled: 'Loading',
      Packed: 'Ready',
    };
    if (allowed[order.status] !== nextStatus) {
      alert(`Cannot move order from ${order.status} to ${nextStatus}.`);
      return;
    }
    setWarehouseStatusOrderId(order.id);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;
      setWarehouseOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o)));
      const label = nextStatus === 'Loading' ? 'Start loading' : 'Mark ready to depart';
      addAuditLog(
        `Order ${label}`,
        'Order',
        `${order.orderNumber} → ${nextStatus} (warehouse loading)`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not update order status';
      alert(msg);
    } finally {
      setWarehouseStatusOrderId(null);
    }
  };

  const handleSendProof = (ord: WarehouseOrderRow) => {
    setProofOrder(ord);
    setShowProofModal(true);
  };

  const openTripLoadingModal = (trip: WarehouseTripSummary | null, orders: WarehouseOrderRow[]) => {
    setTripLoadingModalTrip(trip);
    setTripLoadingModalOrderIds(orders.map((o) => o.id));
    setTripLoadingModalOpen(true);
  };

  const openWarehouseEditTrip = useCallback(async (summary: WarehouseTripSummary) => {
    setWarehouseEditTripOpening(true);
    try {
      const { trip, error } = await fetchTripById(summary.id);
      if (error || !trip) {
        alert(error ?? 'Could not load trip for editing.');
        return;
      }
      setWarehouseEditTrip(trip);
      setShowWarehouseEditTrip(true);
    } finally {
      setWarehouseEditTripOpening(false);
    }
  }, []);

  const handleReportWarehouseTripDelay = useCallback(
    async (payload: { message: string }) => {
      const trip = tripLoadingModalTrip;
      if (!trip?.id) {
        alert('No trip in this session; open loading from an ongoing trip to report a delay.');
        throw new Error('No trip');
      }
      const delayReason = payload.message.trim();
      if (!delayReason) {
        alert('Enter a delay explanation.');
        throw new Error('Empty message');
      }
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('trips')
        .update({
          status: 'Delayed',
          delay_reason: delayReason,
          updated_at: now,
        })
        .eq('id', trip.id);
      if (error) {
        alert(error.message);
        throw error;
      }
      addAuditLog('Reported trip delay', 'Warehouse', `${trip.tripNumber}: ${delayReason.slice(0, 200)}`);
      setTripLoadingModalTrip((t) =>
        t?.id === trip.id ? { ...t, status: 'Delayed', delayReason } : t,
      );
      void fetchWarehouseOrders({ silent: true });
    },
    [tripLoadingModalTrip, addAuditLog, fetchWarehouseOrders],
  );

  const handleFulfillOrder = useCallback(async (fulfillmentData: FulfillmentData[], _proofImageUrls: string[]) => {
    if (!proofOrder) return;
    const orderId = proofOrder.id;
    const items = proofOrder.items;

    const newDeliveredFor = (itemId: string) => {
      const line = items.find((l) => l.id === itemId);
      const fd = fulfillmentData.find((f) => f.itemId === itemId);
      return (line?.quantityDelivered ?? 0) + (fd?.deliveredQuantity ?? 0);
    };

    // Delivered only when every line matches original ordered qty
    const isComplete = items.every((l) => newDeliveredFor(l.id) >= l.quantity);
    const newStatus = isComplete ? 'Delivered' : 'Partially Fulfilled';
    const now = new Date().toISOString();

    for (const fd of fulfillmentData) {
      const line = items.find((l) => l.id === fd.itemId);
      if (!line) continue;
      const acc = (line.quantityDelivered ?? 0) + fd.deliveredQuantity;
      const { error } = await supabase
        .from('order_line_items')
        .update({ quantity_delivered: acc, updated_at: now })
        .eq('id', fd.itemId);
      if (error) { alert('Failed to save line items: ' + error.message); return; }
    }

    const updatePayload: Record<string, unknown> = { status: newStatus, updated_at: now };
    if (isComplete) updatePayload.actual_delivery = now.slice(0, 10);

    const { error: ordErr } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
    if (ordErr) { alert('Failed to record delivery: ' + ordErr.message); return; }

    addAuditLog('Recorded Delivery', 'Order', `Order ${proofOrder.orderNumber} marked ${newStatus} from Warehouse`);

    // Update local state
    setWarehouseOrders((prev) =>
      prev
        .map((o) => {
          if (o.id !== orderId) return o;
          const updatedItems = o.items.map((l) => {
            const fd = fulfillmentData.find((f) => f.itemId === l.id);
            return fd ? { ...l, quantityDelivered: (l.quantityDelivered ?? 0) + fd.deliveredQuantity } : l;
          });
          return { ...o, status: newStatus, items: updatedItems };
        })
        .filter((o) => (WAREHOUSE_LOADING_TAB_STATUSES as readonly string[]).includes(o.status)),
    );

    setShowProofModal(false);
    setProofOrder(null);
  }, [proofOrder, addAuditLog]);
  // ─────────────────────────────────────────────────────────────────────────

  const finishedGoodsCategories = ['all', ...Array.from(new Set(finishedGoodsRows.map((item) => item.category)))];
  const safeCategoryFilter = categoryFilter !== 'all' && !finishedGoodsCategories.includes(categoryFilter)
    ? 'all'
    : categoryFilter;

  const filteredFinishedGoods = finishedGoodsRows.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.variantSize.toLowerCase().includes(q);
    const matchesCategory = safeCategoryFilter === 'all' || item.category === safeCategoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredRawMaterials = rawMaterialsRows.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const rawMaterialsCategories = ['all', ...Array.from(new Set(rawMaterialsRows.map((item) => item.category)))];

  const [finishedSortKey, setFinishedSortKey] = useState('productName');
  const [finishedSortDir, setFinishedSortDir] = useState<'asc' | 'desc'>('asc');
  const [finishedTablePage, setFinishedTablePage] = useState(1);
  const [rawSortKey, setRawSortKey] = useState('name');
  const [rawSortDir, setRawSortDir] = useState<'asc' | 'desc'>('asc');
  const [rawTablePage, setRawTablePage] = useState(1);

  const handleFinishedSort = (key: string) => {
    if (finishedSortKey === key) setFinishedSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setFinishedSortKey(key);
      setFinishedSortDir('asc');
    }
  };
  const finishedSortIcon = (col: string) => {
    if (finishedSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return finishedSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-red-600" />;
  };

  const handleRawSort = (key: string) => {
    if (rawSortKey === key) setRawSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setRawSortKey(key);
      setRawSortDir('asc');
    }
  };
  const rawSortIcon = (col: string) => {
    if (rawSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return rawSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-red-600" />;
  };

  const stockStatusRank: Record<StockStatus, number> = { healthy: 0, warning: 1, critical: 2 };

  const sortedFinishedGoods = useMemo(() => {
    return [...filteredFinishedGoods].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (finishedSortKey) {
        case 'productName':
          av = a.productName.toLowerCase();
          bv = b.productName.toLowerCase();
          break;
        case 'variantSize':
          av = a.variantSize.toLowerCase();
          bv = b.variantSize.toLowerCase();
          break;
        case 'category':
          av = a.category.toLowerCase();
          bv = b.category.toLowerCase();
          break;
        case 'currentStock':
          av = a.currentStock;
          bv = b.currentStock;
          break;
        case 'capacity': {
          const da = Math.max(a.maxCapacity, 1);
          const db = Math.max(b.maxCapacity, 1);
          av = a.currentStock / da;
          bv = b.currentStock / db;
          break;
        }
        case 'status':
          av = stockStatusRank[a.status];
          bv = stockStatusRank[b.status];
          break;
        case 'lastRestocked':
          av = a.lastRestocked === '—' ? '' : a.lastRestocked;
          bv = b.lastRestocked === '—' ? '' : b.lastRestocked;
          break;
        default:
          av = a.productName.toLowerCase();
          bv = b.productName.toLowerCase();
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av < bv) return finishedSortDir === 'asc' ? -1 : 1;
        if (av > bv) return finishedSortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return finishedSortDir === 'asc' ? -1 : 1;
      if (as > bs) return finishedSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredFinishedGoods, finishedSortKey, finishedSortDir]);

  const sortedRawMaterials = useMemo(() => {
    return [...filteredRawMaterials].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (rawSortKey) {
        case 'name':
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case 'category':
          av = a.category.toLowerCase();
          bv = b.category.toLowerCase();
          break;
        case 'currentStock':
          av = a.currentStock;
          bv = b.currentStock;
          break;
        case 'capacity': {
          const da = Math.max(a.maxCapacity, 1);
          const db = Math.max(b.maxCapacity, 1);
          av = a.currentStock / da;
          bv = b.currentStock / db;
          break;
        }
        case 'status':
          av = stockStatusRank[a.status];
          bv = stockStatusRank[b.status];
          break;
        case 'lastRestocked':
          av = a.lastRestocked === '—' ? '' : a.lastRestocked;
          bv = b.lastRestocked === '—' ? '' : b.lastRestocked;
          break;
        default:
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av < bv) return rawSortDir === 'asc' ? -1 : 1;
        if (av > bv) return rawSortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return rawSortDir === 'asc' ? -1 : 1;
      if (as > bs) return rawSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRawMaterials, rawSortKey, rawSortDir]);

  const finishedTotalListPages = Math.max(1, Math.ceil(sortedFinishedGoods.length / TABLE_PAGE_SIZE) || 1);
  const pagedFinishedGoods = useMemo(() => {
    const p = Math.min(finishedTablePage, finishedTotalListPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedFinishedGoods.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedFinishedGoods, finishedTablePage, finishedTotalListPages]);

  const rawTotalListPages = Math.max(1, Math.ceil(sortedRawMaterials.length / TABLE_PAGE_SIZE) || 1);
  const pagedRawMaterials = useMemo(() => {
    const p = Math.min(rawTablePage, rawTotalListPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedRawMaterials.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedRawMaterials, rawTablePage, rawTotalListPages]);

  useEffect(() => {
    if (finishedTablePage > finishedTotalListPages) setFinishedTablePage(finishedTotalListPages);
  }, [finishedTablePage, finishedTotalListPages]);

  useEffect(() => {
    if (rawTablePage > rawTotalListPages) setRawTablePage(rawTotalListPages);
  }, [rawTablePage, rawTotalListPages]);

  useEffect(() => {
    setFinishedTablePage(1);
    setRawTablePage(1);
  }, [searchQuery, categoryFilter, statusFilter, branch, viewMode]);

  useEffect(() => {
    setPrSchedulePage(1);
    setPoSchedulePage(1);
  }, [scheduleSearch, scheduleStatusFilter]);

  const filteredSchedulePr = useMemo(() => {
    const q = scheduleSearch.trim().toLowerCase();
    return schedulePrLines.filter((r) => {
      const matchesSearch =
        !q ||
        r.productName.toLowerCase().includes(q) ||
        r.productSku.toLowerCase().includes(q) ||
        r.prNumber.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q);
      const matchesStatus = scheduleStatusFilter === '' || r.status === scheduleStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [schedulePrLines, scheduleSearch, scheduleStatusFilter]);

  const filteredSchedulePo = useMemo(() => {
    const q = scheduleSearch.trim().toLowerCase();
    return schedulePoLines.filter((r) => {
      const matchesSearch =
        !q ||
        r.materialName.toLowerCase().includes(q) ||
        r.materialCode.toLowerCase().includes(q) ||
        r.poNumber.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q);
      const matchesStatus = scheduleStatusFilter === '' || r.status === scheduleStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [schedulePoLines, scheduleSearch, scheduleStatusFilter]);

  const schedulePrStatusOptions = useMemo(() => {
    const s = new Set(schedulePrLines.map((r) => r.status).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [schedulePrLines]);

  const schedulePoStatusOptions = useMemo(() => {
    const s = new Set(schedulePoLines.map((r) => r.status).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [schedulePoLines]);

  const prScheduleStats = useMemo(() => {
    const rows = filteredSchedulePr;
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'Draft' || r.status === 'Requested').length,
      approved: rows.filter((r) => r.status === 'Accepted').length,
      inProgress: rows.filter((r) => r.status === 'In Progress').length,
      completed: rows.filter((r) => r.status === 'Completed').length,
    };
  }, [filteredSchedulePr]);

  const poScheduleStats = useMemo(() => {
    const rows = filteredSchedulePo;
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'Draft' || r.status === 'Requested').length,
      approved: rows.filter((r) =>
        ['Accepted', 'Sent', 'Confirmed'].includes(r.status),
      ).length,
      inProgress: rows.filter((r) => r.status === 'Partially Received').length,
      completed: rows.filter((r) => r.status === 'Completed').length,
    };
  }, [filteredSchedulePo]);

  const handlePrScheduleSort = (key: string) => {
    if (prScheduleSortKey === key) setPrScheduleSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setPrScheduleSortKey(key);
      setPrScheduleSortDir('asc');
    }
  };

  const handlePoScheduleSort = (key: string) => {
    if (poScheduleSortKey === key) setPoScheduleSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setPoScheduleSortKey(key);
      setPoScheduleSortDir('asc');
    }
  };

  const prScheduleSortIcon = (col: string) => {
    if (prScheduleSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return prScheduleSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-red-600" />;
  };

  const poScheduleSortIcon = (col: string) => {
    if (poScheduleSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return poScheduleSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-red-600" />;
  };

  const sortedSchedulePr = useMemo(() => {
    return [...filteredSchedulePr].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (prScheduleSortKey) {
        case 'productName':
          av = a.productName.toLowerCase();
          bv = b.productName.toLowerCase();
          break;
        case 'productSku':
          av = a.productSku.toLowerCase();
          bv = b.productSku.toLowerCase();
          break;
        case 'quantity':
          av = a.quantity;
          bv = b.quantity;
          break;
        case 'requestDateIso':
          av = a.requestDateIso;
          bv = b.requestDateIso;
          break;
        case 'expectedCompletionIso':
          av = a.expectedCompletionIso ?? '';
          bv = b.expectedCompletionIso ?? '';
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        case 'requestedBy':
          av = a.requestedBy.toLowerCase();
          bv = b.requestedBy.toLowerCase();
          break;
        default:
          av = a.requestDateIso;
          bv = b.requestDateIso;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av < bv) return prScheduleSortDir === 'asc' ? -1 : 1;
        if (av > bv) return prScheduleSortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return prScheduleSortDir === 'asc' ? -1 : 1;
      if (as > bs) return prScheduleSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredSchedulePr, prScheduleSortKey, prScheduleSortDir]);

  const sortedSchedulePo = useMemo(() => {
    return [...filteredSchedulePo].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (poScheduleSortKey) {
        case 'materialName':
          av = a.materialName.toLowerCase();
          bv = b.materialName.toLowerCase();
          break;
        case 'materialCode':
          av = a.materialCode.toLowerCase();
          bv = b.materialCode.toLowerCase();
          break;
        case 'quantity':
          av = a.quantity;
          bv = b.quantity;
          break;
        case 'supplier':
          av = a.supplier.toLowerCase();
          bv = b.supplier.toLowerCase();
          break;
        case 'requestedDeliveryFmt':
          av = a.requestedDeliveryFmt === '—' ? '' : a.requestedDeliveryFmt;
          bv = b.requestedDeliveryFmt === '—' ? '' : b.requestedDeliveryFmt;
          break;
        case 'estimatedArrivalFmt':
          av = a.estimatedArrivalFmt === '—' ? '' : a.estimatedArrivalFmt;
          bv = b.estimatedArrivalFmt === '—' ? '' : b.estimatedArrivalFmt;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        case 'requestedBy':
          av = a.requestedBy.toLowerCase();
          bv = b.requestedBy.toLowerCase();
          break;
        case 'orderDateIso':
          av = a.orderDateIso;
          bv = b.orderDateIso;
          break;
        default:
          av = a.orderDateIso;
          bv = b.orderDateIso;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av < bv) return poScheduleSortDir === 'asc' ? -1 : 1;
        if (av > bv) return poScheduleSortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return poScheduleSortDir === 'asc' ? -1 : 1;
      if (as > bs) return poScheduleSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredSchedulePo, poScheduleSortKey, poScheduleSortDir]);

  const prScheduleTotalPages = Math.max(1, Math.ceil(sortedSchedulePr.length / TABLE_PAGE_SIZE) || 1);
  const pagedSchedulePr = useMemo(() => {
    const p = Math.min(prSchedulePage, prScheduleTotalPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedSchedulePr.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedSchedulePr, prSchedulePage, prScheduleTotalPages]);

  const poScheduleTotalPages = Math.max(1, Math.ceil(sortedSchedulePo.length / TABLE_PAGE_SIZE) || 1);
  const pagedSchedulePo = useMemo(() => {
    const p = Math.min(poSchedulePage, poScheduleTotalPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedSchedulePo.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedSchedulePo, poSchedulePage, poScheduleTotalPages]);

  useEffect(() => {
    if (prSchedulePage > prScheduleTotalPages) setPrSchedulePage(prScheduleTotalPages);
  }, [prSchedulePage, prScheduleTotalPages]);

  useEffect(() => {
    if (poSchedulePage > poScheduleTotalPages) setPoSchedulePage(poScheduleTotalPages);
  }, [poSchedulePage, poScheduleTotalPages]);

  const warehouseEventsByDateKey = useMemo(() => {
    const filtered = warehouseCalendarEvents.filter((e) => warehouseCalendarEventMatchesRequestTab(e, requestType));
    const m: Record<string, WarehouseCalendarEvent[]> = {};
    for (const e of filtered) {
      if (!m[e.anchorDateKey]) m[e.anchorDateKey] = [];
      m[e.anchorDateKey].push(e);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => {
        const byKind = a.calendarKind.localeCompare(b.calendarKind);
        if (byKind !== 0) return byKind;
        return a.title.localeCompare(b.title);
      });
    }
    return m;
  }, [warehouseCalendarEvents, requestType]);

  const openScheduleCalendarModal = () => {
    const t = new Date();
    setCalendarModalYear(t.getFullYear());
    setCalendarModalMonth(t.getMonth());
    setCalendarModalSelectedDateKey(dateKeyLocalFromDate(t));
    setScheduleCalendarModalOpen(true);
    void fetchWarehouseCalendarEvents();
  };

  const shiftCalendarModalMonth = (delta: number) => {
    const d = new Date(calendarModalYear, calendarModalMonth + delta, 1);
    setCalendarModalYear(d.getFullYear());
    setCalendarModalMonth(d.getMonth());
  };

  const openOrdersCalendar = () => {
    const t = new Date();
    setOrdersCalYear(t.getFullYear());
    setOrdersCalMonth(t.getMonth());
    setOrdersCalSelectedKey(dateKeyLocalFromDate(t));
    setOrdersCalOpen(true);
    void fetchOrdersCalendarEvents();
  };

  const shiftOrdersCalMonth = (delta: number) => {
    const d = new Date(ordersCalYear, ordersCalMonth + delta, 1);
    setOrdersCalYear(d.getFullYear());
    setOrdersCalMonth(d.getMonth());
  };

  // Group orders calendar events by dateKey
  const ordersCalByDateKey = useMemo(() => {
    const m: Record<string, OrderDeliveryCalEvent[]> = {};
    for (const ev of ordersCalEvents) {
      if (!m[ev.dateKey]) m[ev.dateKey] = [];
      m[ev.dateKey].push(ev);
    }
    return m;
  }, [ordersCalEvents]);

  const tabs = [
    { id: 'inventory' as TabType, label: 'Inventory', icon: Package },
    { id: 'requests' as TabType, label: 'Requests & Schedule', icon: FileText },
    { id: 'orders' as TabType, label: 'Orders & Loading', icon: Truck },
    { id: 'movements' as TabType, label: 'Movements', icon: History }
  ];

  const warehouseHeaderNavLinkClass =
    'inline-flex items-center justify-center gap-2 font-medium transition-colors rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 h-8 px-3 text-xs';

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 w-full max-w-full">
        <div className="px-4 md:px-6 py-4 w-full max-w-full">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Warehouse Management</h1>
              <p className="text-sm text-gray-600 mt-1">Track inventory, manage requests, and coordinate logistics</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end md:shrink-0">
              <Link to="/production-requests" className={warehouseHeaderNavLinkClass}>
                <Factory className="h-4 w-4" />
                Production requests
              </Link>
              <Link to="/purchase-orders" className={warehouseHeaderNavLinkClass}>
                <ShoppingCart className="h-4 w-4" />
                Purchase orders
              </Link>
              <Link to="/inter-branch-requests" className={warehouseHeaderNavLinkClass}>
                <GitBranch className="h-4 w-4" />
                Inter-Branch
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-6 w-full max-w-full">
          <div className="md:hidden pb-3">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
          </div>
          <div className="hidden md:flex gap-2 md:gap-4 border-b border-gray-200">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm md:text-base">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 w-full max-w-full overflow-x-hidden">
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 w-full lg:w-auto">
                  {/* View Mode Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
                    <button
                      onClick={() => setViewMode('finished')}
                      className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        viewMode === 'finished'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Finished Goods
                    </button>
                    <button
                      onClick={() => setViewMode('raw')}
                      className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        viewMode === 'raw'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Raw Materials
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-64 md:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  {/* Category Filter */}
                  <div className="w-full sm:w-auto">
                    <select
                      value={viewMode === 'finished' ? safeCategoryFilter : categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(viewMode === 'finished' ? finishedGoodsCategories : rawMaterialsCategories).map(cat => (
                        <option key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StockStatus | 'all')}
                    className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="healthy">Healthy</option>
                    <option value="warning">Low Stock</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-4 border-t border-gray-200 w-full">
                <div className="w-full">
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {viewMode === 'finished' ? filteredFinishedGoods.length : filteredRawMaterials.length}
                  </p>
                </div>
                <div className="w-full">
                  <p className="text-sm text-gray-600">Healthy Stock</p>
                  <p className="text-2xl font-bold text-green-600">
                    {viewMode === 'finished' 
                      ? filteredFinishedGoods.filter(i => i.status === 'healthy').length
                      : filteredRawMaterials.filter(i => i.status === 'healthy').length
                    }
                  </p>
                </div>
                <div className="w-full">
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {viewMode === 'finished' 
                      ? filteredFinishedGoods.filter(i => i.status === 'warning').length
                      : filteredRawMaterials.filter(i => i.status === 'warning').length
                    }
                  </p>
                </div>
                <div className="w-full">
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">
                    {viewMode === 'finished' 
                      ? filteredFinishedGoods.filter(i => i.status === 'critical').length
                      : filteredRawMaterials.filter(i => i.status === 'critical').length
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory Tables */}
            {viewMode === 'finished' ? (
              /* Finished Goods Table */
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th
                          onClick={() => handleFinishedSort('productName')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Product{finishedSortIcon('productName')}</span>
                        </th>
                        <th
                          onClick={() => handleFinishedSort('variantSize')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Size{finishedSortIcon('variantSize')}</span>
                        </th>
                        <th
                          onClick={() => handleFinishedSort('category')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Category{finishedSortIcon('category')}</span>
                        </th>
                        <th
                          onClick={() => handleFinishedSort('currentStock')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Current Stock{finishedSortIcon('currentStock')}</span>
                        </th>
                        <th
                          onClick={() => handleFinishedSort('capacity')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Capacity{finishedSortIcon('capacity')}</span>
                        </th>
                        <th
                          onClick={() => handleFinishedSort('status')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Status{finishedSortIcon('status')}</span>
                        </th>
                        <th
                          onClick={() => handleFinishedSort('lastRestocked')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Last Restocked{finishedSortIcon('lastRestocked')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventoryLoading ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-12 text-center text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500" />
                            <p className="mt-2 text-sm">Loading inventory…</p>
                          </td>
                        </tr>
                      ) : sortedFinishedGoods.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-12 text-center text-sm text-gray-500">
                            No finished goods to show. Try another branch or filters.
                          </td>
                        </tr>
                      ) : (
                        pagedFinishedGoods.map((item) => {
                          const capDenom = Math.max(item.maxCapacity, 1);
                          const pct = Math.min(100, Math.round((item.currentStock / capDenom) * 100));
                          return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm">
                            <Link
                              to={finishedGoodProductHref(item.productId, item.categorySlug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open product family in new tab"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {item.productName}
                            </Link>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.variantSize}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.category}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className="font-semibold text-gray-900">{item.currentStock}</span>
                            <span className="text-gray-500"> {item.unit}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    pct > 60 ? 'bg-green-500' :
                                    pct > 30 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              {getStatusText(item.status)}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.lastRestocked}</td>
                        </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {inventoryLoading ? (
                    <div className="p-8 flex flex-col items-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                      <p className="mt-2 text-sm">Loading…</p>
                    </div>
                  ) : sortedFinishedGoods.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">No finished goods to show.</div>
                  ) : (
                    pagedFinishedGoods.map((item) => {
                      const capDenom = Math.max(item.maxCapacity, 1);
                      const pct = Math.min(100, Math.round((item.currentStock / capDenom) * 100));
                      return (
                    <div key={item.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            to={finishedGoodProductHref(item.productId, item.categorySlug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open product family in new tab"
                            className="font-medium text-gray-900 break-words hover:text-blue-700 hover:underline block"
                          >
                            {item.productName}
                          </Link>
                          <p className="text-xs text-gray-600 mt-1">
                            {item.variantSize && item.variantSize !== '—' ? `${item.variantSize} · ` : ''}{item.category}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {getStatusText(item.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Current Stock</p>
                          <p className="font-semibold text-gray-900">{item.currentStock} {item.unit}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Last Restocked</p>
                          <p className="text-gray-900">{item.lastRestocked}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Capacity Usage</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                pct > 60 ? 'bg-green-500' :
                                pct > 30 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {pct}%
                          </span>
                        </div>
                      </div>

                      <Link
                        to={finishedGoodProductHref(item.productId, item.categorySlug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        View product family
                      </Link>
                    </div>
                      );
                    })
                  )}
                </div>
                {!inventoryLoading && sortedFinishedGoods.length > 0 && (
                  <TablePagination
                    page={finishedTablePage}
                    total={sortedFinishedGoods.length}
                    onPageChange={setFinishedTablePage}
                  />
                )}
              </div>
            ) : (
              /* Raw Materials Table */
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th
                          onClick={() => handleRawSort('name')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Material Name{rawSortIcon('name')}</span>
                        </th>
                        <th
                          onClick={() => handleRawSort('category')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Category{rawSortIcon('category')}</span>
                        </th>
                        <th
                          onClick={() => handleRawSort('currentStock')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Current Stock{rawSortIcon('currentStock')}</span>
                        </th>
                        <th
                          onClick={() => handleRawSort('capacity')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Capacity{rawSortIcon('capacity')}</span>
                        </th>
                        <th
                          onClick={() => handleRawSort('status')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Status{rawSortIcon('status')}</span>
                        </th>
                        <th
                          onClick={() => handleRawSort('lastRestocked')}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="inline-flex items-center justify-center">Last Restocked{rawSortIcon('lastRestocked')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventoryLoading ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-12 text-center text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500" />
                            <p className="mt-2 text-sm">Loading inventory…</p>
                          </td>
                        </tr>
                      ) : sortedRawMaterials.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-12 text-center text-sm text-gray-500">
                            No raw materials to show. Try another branch or filters.
                          </td>
                        </tr>
                      ) : (
                      pagedRawMaterials.map(item => {
                        const capDenom = Math.max(item.maxCapacity, 1);
                        const pct = Math.min(100, Math.round((item.currentStock / capDenom) * 100));
                        return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm text-gray-900">
                            <Link
                              to={`/materials/${item.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              {item.name}
                            </Link>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.category}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className="font-semibold text-gray-900">{item.currentStock}</span>
                            <span className="text-gray-500"> {item.unit}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    pct > 60 ? 'bg-green-500' :
                                    pct > 30 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                            </div>
                              <span className="text-xs text-gray-500">
                                {pct}%
                            </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              {getStatusText(item.status)}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.lastRestocked}</td>
                        </tr>
                        );
                      })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {inventoryLoading ? (
                    <div className="p-8 flex flex-col items-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                      <p className="mt-2 text-sm">Loading…</p>
                    </div>
                  ) : sortedRawMaterials.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">No raw materials to show.</div>
                  ) : (
                  pagedRawMaterials.map(item => {
                    const capDenom = Math.max(item.maxCapacity, 1);
                    const pct = Math.min(100, Math.round((item.currentStock / capDenom) * 100));
                    return (
                    <div key={item.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/materials/${item.id}`}
                            className="font-medium text-gray-900 break-words hover:text-blue-700 hover:underline block"
                          >
                            {item.name}
                          </Link>
                          <p className="text-xs text-gray-600 mt-1">{item.category}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {getStatusText(item.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Current Stock</p>
                          <p className="font-semibold text-gray-900">{item.currentStock} {item.unit}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Last Restocked</p>
                          <p className="text-gray-900">{item.lastRestocked}</p>
                        </div>
                        </div>

                        <div>
                        <p className="text-xs text-gray-500 mb-2">Capacity Usage</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                pct > 60 ? 'bg-green-500' :
                                pct > 30 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                        </div>
                          <span className="text-xs text-gray-600">
                            {pct}%
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/materials/${item.id}`}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        View material
                      </Link>
                    </div>
                    );
                  })
                  )}
                </div>
                {!inventoryLoading && sortedRawMaterials.length > 0 && (
                  <TablePagination
                    page={rawTablePage}
                    total={sortedRawMaterials.length}
                    onPageChange={setRawTablePage}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
                    <button
                    type="button"
                      onClick={() => setRequestType('production')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        requestType === 'production'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Factory className="w-4 h-4" />
                      Production Requests
                    </button>
                    <button
                    type="button"
                      onClick={() => setRequestType('purchase')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        requestType === 'purchase'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    Purchase Orders
                    </button>
                  </div>
                </div>

              {scheduleError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {scheduleError}
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search SKU, name, document #, requester, supplier…"
                    value={scheduleSearch}
                    onChange={(e) => setScheduleSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <select
                  value={scheduleStatusFilter}
                  onChange={(e) => setScheduleStatusFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[160px]"
                >
                  <option value="">All statuses</option>
                  {(requestType === 'production' ? schedulePrStatusOptions : schedulePoStatusOptions).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openScheduleCalendarModal}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  <Calendar className="w-4 h-4 text-gray-600" />
                  View calendar
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    Arrival Calendar (14 Days)
                    {scheduleLoading && (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" aria-hidden />
                    )}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    {requestType === 'production' && (
                      <>
                      <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-gray-600">Production request</span>
                      </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-amber-600" />
                          <span className="text-gray-600">Inter-branch</span>
                        </div>
                      </>
                    )}
                    {requestType === 'purchase' && (
                      <>
                      <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-gray-600">Purchase order</span>
                      </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-amber-600" />
                          <span className="text-gray-600">Inter-branch</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {(() => {
                    const today = new Date();
                    const ymd = (d: Date) =>
                      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const isToday = (d: Date) => ymd(d) === ymd(today);
                    const days: Date[] = [];
                    for (let i = 0; i < 14; i++) {
                      const date = new Date(today);
                      date.setDate(today.getDate() + i);
                      days.push(date);
                    }
                    return days.map((day) => {
                      const dayKey = dateKeyLocalFromDate(day);
                      const dayEvents = warehouseEventsByDateKey[dayKey] ?? [];
                      return (
                        <div
                          key={dayKey}
                          className={`min-h-24 p-2 rounded-lg border transition-all ${
                            isToday(day)
                              ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                              : 'bg-white border-gray-200'
                          } ${dayEvents.length > 0 ? 'hover:shadow-md cursor-pointer' : 'opacity-60'}`}
                          onClick={() => dayEvents.length > 0 && setScheduleStripDetailDateKey(dayKey)}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-semibold ${isToday(day) ? 'text-red-700' : 'text-gray-500'}`}>
                                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                              </span>
                              <span className={`text-sm font-bold ${isToday(day) ? 'text-red-700' : 'text-gray-900'}`}>
                                {day.getDate()}
                              </span>
                            </div>
                            <div className="flex-1 space-y-1">
                              {dayEvents.slice(0, 2).map((ev) => (
                                <div
                                  key={ev.id}
                                  className={`text-xs p-1 rounded flex items-center gap-1 ${calendarKindChipClass(ev.calendarKind)}`}
                                  title={ev.title}
                                >
                                  {ev.calendarKind === 'purchase' ? (
                                    <ShoppingCart className="w-3 h-3 flex-shrink-0" />
                                  ) : ev.calendarKind === 'ibr' ? (
                                    <GitBranch className="w-3 h-3 flex-shrink-0" />
                                  ) : (
                                    <Factory className="w-3 h-3 flex-shrink-0" />
                                  )}
                                  <span className="truncate flex-1">{ev.title}</span>
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-xs text-gray-500 font-medium text-center">
                                  +{dayEvents.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Total (lines)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {requestType === 'production' ? prScheduleStats.total : poScheduleStats.total}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {requestType === 'production' ? prScheduleStats.pending : poScheduleStats.pending}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Approved / sent</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {requestType === 'production' ? prScheduleStats.approved : poScheduleStats.approved}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">In progress</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {requestType === 'production' ? prScheduleStats.inProgress : poScheduleStats.inProgress}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {requestType === 'production' ? prScheduleStats.completed : poScheduleStats.completed}
                  </p>
                </div>
              </div>
            </div>

            {requestType === 'production' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePrScheduleSort('productName')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Product {prScheduleSortIcon('productName')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePrScheduleSort('quantity')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Qty {prScheduleSortIcon('quantity')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePrScheduleSort('requestDateIso')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Request date {prScheduleSortIcon('requestDateIso')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePrScheduleSort('expectedCompletionIso')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Est. completion {prScheduleSortIcon('expectedCompletionIso')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePrScheduleSort('status')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Status {prScheduleSortIcon('status')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePrScheduleSort('requestedBy')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Requested by {prScheduleSortIcon('requestedBy')}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {scheduleLoading && sortedSchedulePr.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-12 text-center text-sm text-gray-500">
                            <Loader2 className="w-6 h-6 animate-spin inline-block text-gray-400" />
                            <span className="ml-2">Loading production schedule…</span>
                          </td>
                        </tr>
                      ) : sortedSchedulePr.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-12 text-center text-sm text-gray-500">
                            No production lines match your filters.
                          </td>
                        </tr>
                      ) : (
                        pagedSchedulePr.map((row) => (
                          <tr key={row.rowKey} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm text-gray-900">
                            <div>
                                <Link
                                  to={`/production-requests/${row.prId}`}
                                  className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                                >
                                  {row.productName}
                                </Link>
                                <div className="text-xs text-gray-500">{row.productSku || '—'}</div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                              <span className="font-semibold text-gray-900">{row.quantity}</span>
                              <span className="text-gray-500"> {row.unit}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                                {row.requestDateFmt}
                            </div>
                          </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{row.expectedCompletionFmt}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${prScheduleBadgeClass(row.status)}`}
                              >
                                {row.status}
                            </span>
                          </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{row.requestedBy}</td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-200">
                  {sortedSchedulePr.length === 0 && !scheduleLoading ? (
                    <div className="p-8 text-center text-sm text-gray-500">No production lines match your filters.</div>
                  ) : (
                    pagedSchedulePr.map((row) => (
                      <div key={row.rowKey} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <Link
                              to={`/production-requests/${row.prId}`}
                              className="font-medium text-gray-900 break-words hover:text-blue-700"
                            >
                              {row.productName}
                            </Link>
                            <p className="text-xs text-gray-600 mt-1">{row.productSku || '—'}</p>
                        </div>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${prScheduleBadgeClass(row.status)}`}
                          >
                            {row.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {row.quantity} {row.unit}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-gray-500">Request date</p>
                          <p className="text-gray-900 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                              {row.requestDateFmt}
                          </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Est. completion</p>
                            <p className="text-gray-900">{row.expectedCompletionFmt}</p>
                        </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Requested by</p>
                            <p className="text-gray-900">{row.requestedBy}</p>
                        </div>
                        </div>
                      </div>
                    ))
                  )}
                    </div>
                {!scheduleLoading && sortedSchedulePr.length > 0 && (
                  <TablePagination page={prSchedulePage} total={sortedSchedulePr.length} onPageChange={setPrSchedulePage} />
                )}
              </div>
            )}

            {requestType === 'purchase' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePoScheduleSort('materialName')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Material {poScheduleSortIcon('materialName')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePoScheduleSort('quantity')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Qty {poScheduleSortIcon('quantity')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePoScheduleSort('supplier')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Supplier {poScheduleSortIcon('supplier')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePoScheduleSort('requestedDeliveryFmt')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Req. delivery {poScheduleSortIcon('requestedDeliveryFmt')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePoScheduleSort('estimatedArrivalFmt')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Est. arrival {poScheduleSortIcon('estimatedArrivalFmt')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePoScheduleSort('status')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Status {poScheduleSortIcon('status')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePoScheduleSort('requestedBy')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Requested by {poScheduleSortIcon('requestedBy')}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handlePoScheduleSort('orderDateIso')}
                            className="inline-flex items-center text-gray-500 hover:text-gray-800"
                          >
                            Order date {poScheduleSortIcon('orderDateIso')}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {scheduleLoading && sortedSchedulePo.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-12 text-center text-sm text-gray-500">
                            <Loader2 className="w-6 h-6 animate-spin inline-block text-gray-400" />
                            <span className="ml-2">Loading purchase schedule…</span>
                          </td>
                        </tr>
                      ) : sortedSchedulePo.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-12 text-center text-sm text-gray-500">
                            No purchase lines match your filters.
                          </td>
                        </tr>
                      ) : (
                        pagedSchedulePo.map((row) => (
                          <tr key={row.rowKey} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm text-gray-900">
                            <div>
                                <Link
                                  to={`/purchase-orders/${row.poId}`}
                                  className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                                >
                                  {row.materialName}
                                </Link>
                                <div className="text-xs text-gray-500">{row.materialCode}</div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                              <span className="font-semibold text-gray-900">{row.quantity}</span>
                              <span className="text-gray-500"> {row.unit}</span>
                          </td>
                            <td className="px-3 py-3 text-sm text-gray-600">{row.supplier}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                                {row.requestedDeliveryFmt}
                            </div>
                          </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{row.estimatedArrivalFmt}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${poScheduleBadgeClass(row.status)}`}
                              >
                                {row.status}
                            </span>
                          </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{row.requestedBy}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                              {fmtScheduleDate(row.orderDateIso)}
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-200">
                  {sortedSchedulePo.length === 0 && !scheduleLoading ? (
                    <div className="p-8 text-center text-sm text-gray-500">No purchase lines match your filters.</div>
                  ) : (
                    pagedSchedulePo.map((row) => (
                      <div key={row.rowKey} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <Link
                              to={`/purchase-orders/${row.poId}`}
                              className="font-medium text-gray-900 break-words hover:text-blue-700"
                            >
                              {row.materialName}
                            </Link>
                            <p className="text-xs text-gray-600 mt-1">{row.materialCode}</p>
                        </div>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${poScheduleBadgeClass(row.status)}`}
                          >
                            {row.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {row.quantity} {row.unit}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Supplier</p>
                            <p className="text-gray-900">{row.supplier}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Est. arrival</p>
                            <p className="text-gray-900">{row.estimatedArrivalFmt}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Req. delivery</p>
                          <p className="text-gray-900 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                              {row.requestedDeliveryFmt}
                          </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Order date</p>
                            <p className="text-gray-900">{fmtScheduleDate(row.orderDateIso)}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs text-gray-500">Requested by</p>
                            <p className="text-gray-900">{row.requestedBy}</p>
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                </div>
                {!scheduleLoading && sortedSchedulePo.length > 0 && (
                  <TablePagination page={poSchedulePage} total={sortedSchedulePo.length} onPageChange={setPoSchedulePage} />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div
              className={`flex flex-wrap items-center gap-3 w-full ${
                approvedAwaitingTripAssignment > 0 ? '' : 'justify-end'
              }`}
            >
              {approvedAwaitingTripAssignment > 0 && (
                <div
                  role="status"
                  className="m-0 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 min-h-10 min-w-0 mr-auto max-w-xl flex items-center"
                >
                  {approvedAwaitingTripAssignment === 1
                    ? '1 order is approved and waiting for a scheduled trip.'
                    : `${approvedAwaitingTripAssignment} orders are approved and waiting for a scheduled trip.`}
                </div>
              )}
              <button
                type="button"
                onClick={openOrdersCalendar}
                className="inline-flex items-center justify-center gap-2 px-4 min-h-10 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 bg-white shadow-sm shrink-0"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                View Delivery Calendar
                {ordersCalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
              </button>
            </div>

            {/* Header with Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Waiting to be scheduled</p>
                <p className="text-2xl font-bold text-amber-600">{warehouseLoadingStats.awaitingSchedule}</p>
                <p className="text-xs text-gray-500 mt-1">On a trip below — approved, not yet scheduled to load</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Ready to load</p>
                <p className="text-2xl font-bold text-blue-600">{warehouseLoadingStats.readyToLoad}</p>
                <p className="text-xs text-gray-500 mt-1">Scheduled — not yet loading</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Ready to depart</p>
                <p className="text-2xl font-bold text-green-600">{warehouseLoadingStats.readyToDepart}</p>
                <p className="text-xs text-gray-500 mt-1">Cleared — release when dispatch departs</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Stock issues</p>
                <p className="text-2xl font-bold text-red-600">{warehouseLoadingStats.stockIssues}</p>
                <p className="text-xs text-gray-500 mt-1">Short vs remaining to ship</p>
              </div>
            </div>

            {/* Orders — live from DB */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600 shrink-0" aria-hidden />
                  Ongoing Trips
                </h3>
                <div className="flex items-center gap-2">
                  {warehouseOrdersLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  <button
                    type="button"
                    onClick={() => {
                      void fetchWarehouseOrders();
                      void fetchPastTrips();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                </div>
              </div>

              {warehouseOrdersLoading ? (
                <div className="py-12 text-center text-gray-500">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
                  <p className="text-sm">Loading orders…</p>
                </div>
              ) : warehouseOrders.length === 0 ? (
                <div className="py-12 text-center text-gray-400 px-4">
                  <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-700">No orders in the loading pipeline</p>
                  <p className="text-xs mt-2 text-gray-500 max-w-lg mx-auto">
                    After logistics schedules a trip, orders move to <strong>Scheduled</strong> and show up here for loading, packing, and ready-to-depart steps.
                  </p>
                </div>
              ) : warehouseTripGroups.length === 0 ? (
                <div className="py-12 text-center text-gray-500 px-4">
                  <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-700">No orders linked to a trip yet</p>
                  <p className="text-xs mt-2 text-gray-500 max-w-lg mx-auto">
                    This list only shows orders assigned to a logistics trip. Use <strong>Logistics</strong> to plan trips and attach orders—they will appear here under each trip.
                  </p>
                </div>
              ) : (
                <>
                  <WarehouseTripLoadingModal
                    isOpen={tripLoadingModalOpen}
                    onClose={() => {
                      setTripLoadingModalOpen(false);
                      setTripLoadingModalTrip(null);
                      setTripLoadingModalOrderIds([]);
                    }}
                    trip={tripLoadingModalTrip}
                    orders={tripLoadingModalOrders.map(warehouseOrderToLite)}
                    stockByVariant={warehouseStockByVariant}
                    onReportTripDelay={handleReportWarehouseTripDelay}
                    warehouseStatusOrderId={warehouseStatusOrderId}
                    inTransitSubmitting={inTransitSubmitting}
                    advanceWarehouseOrderStatus={(lite, next) => {
                      const full =
                        tripLoadingModalOrders.find((o) => o.id === lite.id) ?? resolveWarehouseOrderRow(lite.id);
                      if (!full) {
                        alert('Could not load this order. Close the trip window and open it again, then retry.');
                        return;
                      }
                      if (next === 'Packed') {
                        setWarehouseMarkPackedOrder(full);
                        setWarehouseMarkPackedOpen(true);
                        return;
                      }
                      void advanceWarehouseOrderStatus(full, next);
                    }}
                    confirmInTransit={(lite) => {
                      const full = resolveWarehouseOrderRow(lite.id);
                      if (!full) return;
                      const rows = full.items.map((li) => ({
                        itemId: li.id,
                        shippedQuantity: Math.max(0, li.quantity - (li.quantityShipped ?? 0)),
                      }));
                      void handleConfirmInTransit(rows, full);
                    }}
                    onRecordDelivery={(lite) => {
                      const full = resolveWarehouseOrderRow(lite.id);
                      if (full) handleSendProof(full);
                    }}
                    onEditTrip={
                      tripLoadingModalTrip ? () => void openWarehouseEditTrip(tripLoadingModalTrip) : undefined
                    }
                    editTripOpening={warehouseEditTripOpening}
                  />

                  {warehouseEditTrip && (
                    <EditTripModal
                      isOpen={showWarehouseEditTrip}
                      onClose={() => {
                        setShowWarehouseEditTrip(false);
                        setWarehouseEditTrip(null);
                      }}
                      trip={warehouseEditTrip}
                      drivers={warehousePlanningDrivers}
                      vehicles={warehouseFleetVehicles}
                      availableOrders={warehousePlanningOrders}
                      onSave={async (params) => {
                        const tid = warehouseEditTrip.id;
                        const result = await updateTrip({ tripId: tid, ...params });
                        if (!result.ok) throw new Error(result.error ?? 'Failed to save trip');
                        setShowWarehouseEditTrip(false);
                        setWarehouseEditTrip(null);
                        void fetchWarehouseOrders({ silent: true });
                        void fetchPastTrips();
                      }}
                    />
                  )}

                  <div className="hidden md:block divide-y divide-gray-200">
                    {warehouseTripGroups.map(({ trip, orders }) => {
                      const tripShortage = orders.some((o) => o.hasShortage);
                      return (
                        <div key={trip.id} className="p-4 space-y-3">
                          <button
                            type="button"
                            className="w-full flex flex-wrap items-center gap-3 text-left rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
                            onClick={() => openTripLoadingModal(trip, orders)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">Trip {trip.tripNumber}</span>
                                <span className="text-sm text-gray-600">
                                  {trip.vehicleName} · {trip.driverName}
                                </span>
                                {trip.scheduledDate && (
                                  <span className="text-sm text-gray-500">
                                    {new Date(trip.scheduledDate).toLocaleDateString('en-PH', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </span>
                                )}
                                <span
                                  className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${tripStatusBadgeClass(trip.status)}`}
                                >
                                  {trip.status}
                                </span>
                                {tripShortage && (
                                  <span
                                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600"
                                    title="At least one order line is short on hand for remaining qty to ship"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Stock issue
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 shrink-0">
                              Loading & stock
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </button>
                          <div className="overflow-x-auto rounded-lg border border-gray-100">
                            <table className="w-full">
                              <thead className="bg-white border-b border-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Order</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Customer</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Required</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Urgency</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {orders.map((ord) => (
                                  <tr
                                    key={ord.id}
                                    role="button"
                                    tabIndex={0}
                                    className="hover:bg-blue-50/60 cursor-pointer"
                                    onClick={() => openTripLoadingModal(trip, orders)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openTripLoadingModal(trip, orders);
                                      }
                                    }}
                                  >
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 text-sm">{ord.orderNumber}</span>
                                        {ord.hasShortage && (
                                          <span className="inline-flex" title="Not enough stock at this branch for remaining qty to ship">
                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900">{ord.customerName}</td>
                                    <td className="px-4 py-2">
                                      <span className={`inline-block text-xs font-semibold uppercase px-2 py-0.5 rounded border ${orderDeliveryStatusBadge(ord.status)}`}>
                                        {ord.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm">
                                          {ord.requiredDate
                                            ? new Date(ord.requiredDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                                            : '—'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      {ord.urgency ? (
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            ord.urgency === 'High' || ord.urgency === 'Critical'
                                              ? 'bg-red-50 text-red-700'
                                              : ord.urgency === 'Medium'
                                                ? 'bg-yellow-50 text-yellow-700'
                                                : 'bg-gray-100 text-gray-700'
                                          }`}
                                        >
                                          {ord.urgency}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 text-xs">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}

                  </div>

                  <div className="md:hidden divide-y divide-gray-200">
                    {warehouseTripGroups.map(({ trip, orders }) => {
                      const tripShortage = orders.some((o) => o.hasShortage);
                      return (
                        <div key={trip.id} className="p-4 space-y-3">
                          <button
                            type="button"
                            className="w-full text-left rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 hover:bg-gray-100 transition-colors"
                            onClick={() => openTripLoadingModal(trip, orders)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">Trip {trip.tripNumber}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {trip.vehicleName} · {trip.driverName}
                                  {trip.scheduledDate
                                    ? ` · ${new Date(trip.scheduledDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`
                                    : ''}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {orders.length} order{orders.length !== 1 ? 's' : ''}
                                  {tripShortage ? ' · stock issue' : ''}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            </div>
                          </button>
                          {orders.map((ord) => (
                            <button
                              key={ord.id}
                              type="button"
                              className="w-full text-left rounded-lg border border-gray-100 bg-white px-3 py-2.5 hover:bg-blue-50/50 transition-colors"
                              onClick={() => openTripLoadingModal(trip, orders)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                                    {ord.orderNumber}
                                    {ord.hasShortage && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                  </p>
                                  <p className="text-xs text-gray-600">{ord.customerName}</p>
                                </div>
                                <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded border flex-shrink-0 ${orderDeliveryStatusBadge(ord.status)}`}>
                                  {ord.status}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })}

                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-500" />
                  Past trips (completed)
                </h3>
                <div className="flex items-center gap-2">
                  {pastTripsLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  <button
                    type="button"
                    onClick={() => void fetchPastTrips()}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                </div>
              </div>

              {pastTripsLoading && pastTripGroups.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
                  <p className="text-sm">Loading past trips…</p>
                </div>
              ) : pastTripsTotal === 0 ? (
                <div className="py-10 text-center text-gray-500 px-4">
                  <p className="text-sm font-medium text-gray-700">No completed trips for this branch</p>
                  <p className="text-xs mt-2 text-gray-500 max-w-md mx-auto">
                    Completed trips are listed here, newest first, {TABLE_PAGE_SIZE} trips per page.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block divide-y divide-gray-200">
                    {pastTripGroups.map(({ trip, orders }) => {
                      const tripShortage = orders.some((o) => o.hasShortage);
                      return (
                        <div key={`past-${trip.id}`} className="p-4 space-y-3">
                          <button
                            type="button"
                            className="w-full flex flex-wrap items-center gap-3 text-left rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 hover:bg-slate-50 transition-colors"
                            onClick={() => openTripLoadingModal(trip, orders)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">Trip {trip.tripNumber}</span>
                                <span className="text-sm text-gray-600">
                                  {trip.vehicleName} · {trip.driverName}
                                </span>
                                {trip.scheduledDate && (
                                  <span className="text-sm text-gray-500">
                                    {new Date(trip.scheduledDate).toLocaleDateString('en-PH', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </span>
                                )}
                                <span
                                  className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${tripStatusBadgeClass(trip.status)}`}
                                >
                                  {trip.status}
                                </span>
                                {tripShortage && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Had stock issue
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 shrink-0">
                              Details
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </button>
                          <div className="overflow-x-auto rounded-lg border border-gray-100">
                            <table className="w-full">
                              <thead className="bg-white border-b border-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Order</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Customer</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Required</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Urgency</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {orders.map((ord) => (
                                  <tr
                                    key={ord.id}
                                    role="button"
                                    tabIndex={0}
                                    className="hover:bg-slate-50/80 cursor-pointer"
                                    onClick={() => openTripLoadingModal(trip, orders)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openTripLoadingModal(trip, orders);
                                      }
                                    }}
                                  >
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 text-sm">{ord.orderNumber}</span>
                                        {ord.hasShortage && (
                                          <span className="inline-flex" title="Stock was short vs remaining at snapshot">
                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900">{ord.customerName}</td>
                                    <td className="px-4 py-2">
                                      <span className={`inline-block text-xs font-semibold uppercase px-2 py-0.5 rounded border ${orderDeliveryStatusBadge(ord.status)}`}>
                                        {ord.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm">
                                          {ord.requiredDate
                                            ? new Date(ord.requiredDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                                            : '—'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      {ord.urgency ? (
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            ord.urgency === 'High' || ord.urgency === 'Critical'
                                              ? 'bg-red-50 text-red-700'
                                              : ord.urgency === 'Medium'
                                                ? 'bg-yellow-50 text-yellow-700'
                                                : 'bg-gray-100 text-gray-700'
                                          }`}
                                        >
                                          {ord.urgency}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 text-xs">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="md:hidden divide-y divide-gray-200">
                    {pastTripGroups.map(({ trip, orders }) => {
                      const tripShortage = orders.some((o) => o.hasShortage);
                      return (
                        <div key={`past-m-${trip.id}`} className="p-4 space-y-3">
                          <button
                            type="button"
                            className="w-full text-left rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 hover:bg-slate-50 transition-colors"
                            onClick={() => openTripLoadingModal(trip, orders)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">Trip {trip.tripNumber}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {trip.vehicleName} · {trip.driverName}
                                  {trip.scheduledDate
                                    ? ` · ${new Date(trip.scheduledDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`
                                    : ''}
                                </p>
                                <p className="text-xs text-slate-600 mt-1">
                                  {orders.length} order{orders.length !== 1 ? 's' : ''}
                                  {tripShortage ? ' · stock' : ''}
                                  <span className="text-gray-500"> · completed</span>
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                            </div>
                          </button>
                          {orders.map((ord) => (
                            <button
                              key={ord.id}
                              type="button"
                              className="w-full text-left rounded-lg border border-gray-100 bg-white px-3 py-2.5 hover:bg-slate-50/80 transition-colors"
                              onClick={() => openTripLoadingModal(trip, orders)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                                    {ord.orderNumber}
                                    {ord.hasShortage && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                  </p>
                                  <p className="text-xs text-gray-600">{ord.customerName}</p>
                                </div>
                                <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded border flex-shrink-0 ${orderDeliveryStatusBadge(ord.status)}`}>
                                  {ord.status}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  <TablePagination
                    page={pastTripsPage}
                    pageSize={TABLE_PAGE_SIZE}
                    total={pastTripsTotal}
                    onPageChange={setPastTripsPage}
                  />
                </>
              )}
            </div>

          </div>
        )}

        {activeTab === 'movements' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Activity className="w-7 h-7 text-blue-600" />
                  Movements
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Real stock movements and order activity from your database. Pick a finished-good variant or raw material using the catalogue buttons below.
                </p>
                {branch ? (
                  <p className="text-xs text-gray-500 mt-2">
                    Branch context: <span className="font-medium text-gray-700">{branch}</span>
                  </p>
                ) : (
                  <p className="text-xs text-amber-800 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 inline-block">
                    Select a branch in the header to load on-hand stock and apply movement filters.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                <Button type="button" variant="primary" onClick={() => setMovementsShowVariantPicker(true)} className="inline-flex items-center justify-center gap-2">
                  <Package className="w-4 h-4" />
                  Select product variant
                </Button>
                <Button type="button" variant="outline" onClick={() => setMovementsShowMaterialPicker(true)} className="inline-flex items-center justify-center gap-2">
                  <Factory className="w-4 h-4" />
                  Select raw material
                </Button>
                <button
                  type="button"
                  disabled={!movementsSelected}
                  onClick={() => setMovementsLoadTick((t) => t + 1)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {movementsSelected && (
                <div className="mt-4 p-3 rounded-lg border border-gray-100 bg-gray-50 flex gap-3 items-center">
                  <MovementsCatalogThumb
                    imageUrl={movementsSelected.kind === 'variant' ? movementsSelected.productImageUrl : movementsSelected.imageUrl}
                    label={movementsSelected.kind === 'variant' ? movementsSelected.productName : movementsSelected.name}
                    kind={movementsSelected.kind === 'variant' ? 'variant' : 'material'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {movementsSelected.kind === 'variant' ? 'Finished good' : 'Raw material'}
                    </p>
                    {movementsSelected.kind === 'variant' ? (
                      <a
                        href={finishedGoodProductHref(movementsSelected.productId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-blue-700 hover:underline truncate block"
                      >
                        {movementsSelected.productName} — {movementsSelected.variantLabel}
                      </a>
                    ) : (
                      <a
                        href={`/materials/${encodeURIComponent(movementsSelected.materialId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-blue-700 hover:underline truncate block"
                      >
                        {movementsSelected.name}
                      </a>
                    )}
                    <p className="text-xs text-gray-600 font-mono mt-0.5">{movementsSelected.sku}</p>
                  </div>
                </div>
              )}
            </div>

            {movementsSelected && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-600">On hand (this branch)</div>
                      <Box className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {movementsStockQty == null ? '—' : movementsStockQty.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {movementsSelected.kind === 'material' ? movementsSelected.unit : 'Units at branch'}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-600">
                        {movementsSelected.kind === 'variant' ? 'Orders' : 'Usage records'}
                      </div>
                      {movementsSelected.kind === 'variant' ? (
                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Factory className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {movementsHistoryLoading
                        ? '…'
                        : movementsSelected.kind === 'variant'
                          ? movementsVariantOrderRows.length
                          : movementsMaterialUsageRows.length}
                    </div>
                    <div className="text-sm text-gray-500">
                      {movementsSelected.kind === 'variant'
                        ? 'With this variant (newest first)'
                        : 'Consumption events (newest first)'}
                    </div>
                  </div>
                </div>

                {movementsSelected.kind === 'variant' ? (
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Units sold by month
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Units per month from customer orders (uses your selected branch when set).
                      </p>
                      <div className="h-[360px] mt-4">
                        {movementsChartLoading ? (
                          <div className="flex h-full items-center justify-center gap-2 text-gray-500">
                            <Loader2 className="w-7 h-7 animate-spin" />
                            <span className="text-sm">Loading chart…</span>
                          </div>
                        ) : movementsChartData.length === 0 ? (
                          <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 text-center text-sm text-gray-500">
                            No monthly points in the last 12 months for this selection (with current filters).
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={movementsChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="month" tick={{ fontSize: 11 }} minTickGap={24} />
                              <YAxis
                                tick={{ fontSize: 11 }}
                                width={56}
                                tickFormatter={(n) => (Number(n) >= 1000 ? Number(n).toLocaleString() : String(n))}
                                label={{
                                  value: 'Units (orders)',
                                  angle: -90,
                                  position: 'insideLeft',
                                  style: { fontSize: 11 },
                                }}
                              />
                              <Tooltip
                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                formatter={(v) => {
                                  const n = typeof v === 'number' ? v : parseFloat(String(v));
                                  if (Number.isNaN(n)) return ['—', ''];
                                  return [n.toLocaleString(), ''];
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                              <Line type="linear" dataKey="qty" name="Units" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Revenue by month
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        PHP per month from each order line at the price recorded on the order.
                      </p>
                      <div className="h-[360px] mt-4">
                        {movementsChartLoading ? (
                          <div className="flex h-full items-center justify-center gap-2 text-gray-500">
                            <Loader2 className="w-7 h-7 animate-spin" />
                            <span className="text-sm">Loading chart…</span>
                          </div>
                        ) : movementsRevenueChartData.length === 0 ? (
                          <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 text-center text-sm text-gray-500">
                            No revenue in the last 12 months for this selection (with current filters).
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={movementsRevenueChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="month" tick={{ fontSize: 11 }} minTickGap={24} />
                              <YAxis
                                tick={{ fontSize: 11 }}
                                width={64}
                                tickFormatter={(n) =>
                                  Number(n) >= 1000 ? `₱${Number(n).toLocaleString()}` : `₱${n}`
                                }
                                label={{
                                  value: 'Revenue (PHP)',
                                  angle: -90,
                                  position: 'insideLeft',
                                  style: { fontSize: 11 },
                                }}
                              />
                              <Tooltip
                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                formatter={(v) => {
                                  const n = typeof v === 'number' ? v : parseFloat(String(v));
                                  if (Number.isNaN(n)) return ['—', ''];
                                  return [`₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ''];
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                              <Line
                                type="linear"
                                dataKey="revenue"
                                name="Revenue"
                                stroke="#059669"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                      Usage by month
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Quantity consumed in production per month.
                    </p>
                    <div className="h-[360px] mt-4">
                      {movementsChartLoading ? (
                        <div className="flex h-full items-center justify-center gap-2 text-gray-500">
                          <Loader2 className="w-7 h-7 animate-spin" />
                          <span className="text-sm">Loading chart…</span>
                        </div>
                      ) : movementsChartData.length === 0 ? (
                        <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 text-center text-sm text-gray-500">
                          No monthly points in the last 12 months for this selection (with current filters).
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={movementsChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} minTickGap={24} />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              width={56}
                              tickFormatter={(n) => (Number(n) >= 1000 ? Number(n).toLocaleString() : String(n))}
                              label={{
                                value: `Qty (${movementsSelected.unit})`,
                                angle: -90,
                                position: 'insideLeft',
                                style: { fontSize: 11 },
                              }}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                              formatter={(v) => {
                                const n = typeof v === 'number' ? v : parseFloat(String(v));
                                if (Number.isNaN(n)) return ['—', ''];
                                return [n.toLocaleString(), ''];
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Line type="linear" dataKey="qty" name="Consumed" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {movementsSelected.kind === 'variant' ? (
                        <ShoppingCart className="w-5 h-5 text-gray-600" />
                      ) : (
                        <Factory className="w-5 h-5 text-gray-600" />
                      )}
                      {movementsSelected.kind === 'variant' ? 'Orders with this variant' : 'Usage history'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {movementsSelected.kind === 'variant'
                        ? 'Customer orders that include this SKU (same branch and status filters as the charts above).'
                        : 'Production consumption rows for this material.'}
                    </p>
                  </div>
                  {movementsHistoryLoading ? (
                    <div className="py-16 flex justify-center text-gray-500 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Loading…
                    </div>
                  ) : movementsSelected.kind === 'variant' ? (
                    movementsVariantOrderRows.length === 0 ? (
                      <p className="p-6 text-sm text-gray-500">No matching orders for this variant yet.</p>
                    ) : (
                      <>
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty (line)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {movementsVariantOrderRows.map((row) => (
                                <tr key={row.orderId} className="hover:bg-gray-50">
                                  <td className="px-6 py-3 text-sm">
                                    <Link
                                      to={`/orders/${encodeURIComponent(row.orderId)}`}
                                      className="font-medium text-blue-700 hover:underline"
                                    >
                                      {row.orderNumber}
                                    </Link>
                                  </td>
                                  <td className="px-6 py-3 text-sm text-gray-700 max-w-[200px] truncate" title={row.customerName ?? ''}>
                                    {row.customerName ?? '—'}
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{row.status}</td>
                                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium tabular-nums text-right">
                                    {row.lineQuantity.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {row.orderDate
                                      ? new Date(row.orderDate).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                                      : '—'}
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {row.requiredDate
                                      ? new Date(row.requiredDate).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="md:hidden divide-y divide-gray-200">
                          {movementsVariantOrderRows.map((row) => (
                            <div key={row.orderId} className="p-4 space-y-1">
                              <div className="flex justify-between gap-2 items-start">
                                <Link
                                  to={`/orders/${encodeURIComponent(row.orderId)}`}
                                  className="text-sm font-semibold text-blue-700 hover:underline"
                                >
                                  {row.orderNumber}
                                </Link>
                                <span className="text-xs text-gray-600 shrink-0">{row.status}</span>
                              </div>
                              {row.customerName ? (
                                <p className="text-sm text-gray-700">{row.customerName}</p>
                              ) : null}
                              <p className="text-sm tabular-nums text-gray-900">
                                Qty (line): <span className="font-semibold">{row.lineQuantity.toLocaleString()}</span>
                              </p>
                              {row.orderDate || row.requiredDate ? (
                                <p className="text-xs text-gray-500">
                                  {[
                                    row.orderDate
                                      ? `Ordered ${new Date(row.orderDate).toLocaleDateString('en-PH', { dateStyle: 'medium' })}`
                                      : null,
                                    row.requiredDate
                                      ? `Required ${new Date(row.requiredDate).toLocaleDateString('en-PH', {
                                          dateStyle: 'medium',
                                        })}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  ) : movementsMaterialUsageRows.length === 0 ? (
                    <p className="p-6 text-sm text-gray-500">No production usage recorded for this material yet.</p>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty consumed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {movementsMaterialUsageRows.map((row) => (
                              <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {row.consumption_date
                                    ? new Date(row.consumption_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                                    : '—'}
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-700 max-w-[200px]">
                                  {row.product_id ? (
                                    <a
                                      href={finishedGoodProductHref(row.product_id)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-700 hover:underline font-medium truncate block"
                                      title={row.product_name ?? undefined}
                                    >
                                      {row.product_name ?? row.product_id.slice(0, 8)}
                                    </a>
                                  ) : (
                                    <span className="text-gray-500">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm font-medium tabular-nums text-right">
                                  {row.quantity_consumed.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="md:hidden divide-y divide-gray-200">
                        {movementsMaterialUsageRows.map((row) => (
                          <div key={row.id} className="p-4 space-y-2">
                            <p className="text-sm font-medium text-gray-900">
                              {row.consumption_date
                                ? new Date(row.consumption_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                                : '—'}
                            </p>
                            {row.product_id ? (
                              <a
                                href={finishedGoodProductHref(row.product_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-700 hover:underline block truncate"
                              >
                                {row.product_name ?? 'Product'}
                              </a>
                            ) : (
                              <span className="text-sm text-gray-500">—</span>
                            )}
                            <p className="text-sm tabular-nums text-gray-900">
                              Qty consumed: <span className="font-semibold">{row.quantity_consumed.toLocaleString()}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            <OrderProductSelectionModal
              open={movementsShowVariantPicker}
              onClose={() => setMovementsShowVariantPicker(false)}
              purpose="movements"
              excludeVariantIds={new Set()}
              onConfirm={(p: OrderProductSelectionConfirm) => {
                setMovementsSelected({
                  kind: 'variant',
                  variantId: p.variantId,
                  productId: p.productId,
                  productName: p.productName,
                  variantLabel: p.variantSizeLabel,
                  sku: p.sku,
                  productImageUrl: p.productImageUrl ?? null,
                });
                setMovementsShowVariantPicker(false);
              }}
            />

            <RawMaterialPickerModal
              isOpen={movementsShowMaterialPicker}
              onClose={() => setMovementsShowMaterialPicker(false)}
              branch={branch ?? ''}
              alreadyAdded={[]}
              onSelect={(m) => {
                setMovementsSelected({
                  kind: 'material',
                  materialId: m.materialId,
                  name: m.name,
                  sku: m.sku,
                  unit: m.unit,
                  imageUrl: m.imageUrl,
                });
                setMovementsShowMaterialPicker(false);
              }}
            />
          </div>
        )}
      </div>

      {/* ── Orders Delivery Calendar Modal ─────────────────────────── */}
      {ordersCalOpen && (() => {
        const MONTH_NAMES_CAL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const todayKey = dateKeyLocalFromDate(new Date());

        // build month grid
        const firstDay = new Date(ordersCalYear, ordersCalMonth, 1);
        const lastDay = new Date(ordersCalYear, ordersCalMonth + 1, 0);
        const cells: (Date | null)[] = [];
        for (let i = 0; i < firstDay.getDay(); i++) cells.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(ordersCalYear, ordersCalMonth, d));

        const selectedEvs = ordersCalSelectedKey ? (ordersCalByDateKey[ordersCalSelectedKey] ?? []) : [];

        return (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setOrdersCalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="orders-cal-title"
              className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-gray-200">
                <div>
                  <h2 id="orders-cal-title" className="text-lg md:text-xl font-bold text-gray-900">
                    Order Delivery Calendar
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Required dates, scheduled departures &amp; actual deliveries{branch ? ` · ${branch}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void fetchOrdersCalendarEvents()}
                    disabled={ordersCalLoading}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    title="Reload"
                  >
                    <RefreshCw className={`w-4 h-4 ${ordersCalLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrdersCalOpen(false)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
                {/* Nav + legend */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => shiftOrdersCalMonth(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Previous month">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <select value={ordersCalMonth} onChange={(e) => setOrdersCalMonth(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {MONTH_NAMES_CAL.map((n, i) => <option key={i} value={i}>{n}</option>)}
                    </select>
                    <input
                      type="number"
                      value={ordersCalYear}
                      onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== '' && Number.isFinite(n)) setOrdersCalYear(Math.trunc(n)); }}
                      className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      aria-label="Year"
                    />
                    <button type="button" onClick={() => shiftOrdersCalMonth(1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Next month">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />High urgency due</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Medium urgency due</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-500" />Low urgency due</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" />Departure</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-600" />Delivered</span>
                  </div>
                </div>

                {ordersCalLoading && ordersCalEvents.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Loading calendar…
                  </div>
                ) : (
                  <>
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {DAY_NAMES.map((d) => <div key={d} className="py-2">{d}</div>)}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {cells.map((cell, idx) => {
                        if (!cell) return <div key={`pad-${idx}`} className="min-h-[4.5rem] rounded-lg bg-gray-50/50" />;
                        const cellKey = dateKeyLocalFromDate(cell);
                        const isToday = cellKey === todayKey;
                        const isSelected = cellKey === ordersCalSelectedKey;
                        const evs = ordersCalByDateKey[cellKey] ?? [];

                        // Show first 2, overflow count
                        const shown = evs.slice(0, 2);
                        const overflow = evs.length - shown.length;

                        return (
                          <button
                            key={cellKey}
                            type="button"
                            onClick={() => setOrdersCalSelectedKey(cellKey === ordersCalSelectedKey ? null : cellKey)}
                            className={`min-h-[4.5rem] rounded-lg border p-1.5 text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/60'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/20'
                            }`}
                          >
                            <div className={`text-sm font-semibold mb-0.5 ${isToday ? 'text-red-600' : 'text-gray-900'}`}>
                              {cell.getDate()}
                            </div>
                            <div className="space-y-0.5">
                              {shown.map((ev) => (
                                <div
                                  key={ev.id + ev.dateType}
                                  className={`truncate rounded px-0.5 py-0.5 text-[10px] leading-tight font-medium ${orderDeliveryChipClass(ev)}`}
                                  title={`${ev.orderNumber} · ${ev.customer}`}
                                >
                                  {ev.orderNumber}
                                </div>
                              ))}
                              {overflow > 0 && (
                                <div className="text-[10px] text-gray-500 font-medium text-center">+{overflow}</div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Selected date detail panel */}
                {ordersCalSelectedKey && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      {(() => {
                        const [y, mo, d] = ordersCalSelectedKey.split('-').map(Number);
                        return new Date(y, mo - 1, d).toLocaleDateString('en-PH', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        });
                      })()}
                    </h3>
                    {selectedEvs.length === 0 ? (
                      <p className="text-sm text-gray-500">No orders on this date.</p>
                    ) : (
                      <ul className="space-y-2">
                        {selectedEvs.map((ev) => (
                          <li key={ev.id + ev.dateType} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                            <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                ev.dateType === 'delivered' ? 'bg-green-100' : ev.dateType === 'scheduled' ? 'bg-blue-100' : 'bg-amber-100'
                              }`}>
                                {ev.dateType === 'delivered'
                                  ? <CheckCircle className="w-5 h-5 text-green-600" />
                                  : ev.dateType === 'scheduled'
                                  ? <Truck className="w-5 h-5 text-blue-600" />
                                  : <Calendar className="w-5 h-5 text-amber-600" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900">{ev.orderNumber}</p>
                                <p className="text-sm text-gray-600">{ev.customer}</p>
                              </div>
                              <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${orderDeliveryStatusBadge(ev.status)}`}>
                                {ev.status}
                              </span>
                            </div>
                            <div className="px-3 py-2 text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                              <span>
                                <span className="font-medium">Type: </span>
                                {ev.dateType === 'required' ? 'Required date' : ev.dateType === 'scheduled' ? 'Scheduled departure' : 'Actual delivery'}
                              </span>
                              {ev.urgency && (
                                <span>
                                  <span className="font-medium">Urgency: </span>{ev.urgency}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 bg-gray-50 px-4 md:px-5 py-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOrdersCalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Full warehouse schedule calendar (month view; includes IBR) */}
      {scheduleCalendarModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setScheduleCalendarModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="warehouse-calendar-title"
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-gray-200">
              <div>
                <h2 id="warehouse-calendar-title" className="text-lg md:text-xl font-bold text-gray-900">
                  Warehouse schedule
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {requestType === 'production'
                    ? `Production requests and IBR milestones with product lines${branch ? ` · ${branch}` : ''}.`
                    : `Purchase orders and IBR milestones with raw materials${branch ? ` · ${branch}` : ''}.`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void fetchWarehouseCalendarEvents()}
                  disabled={warehouseCalendarLoading}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  title="Reload events"
                >
                  <RefreshCw className={`w-4 h-4 ${warehouseCalendarLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleCalendarModalOpen(false)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                  aria-label="Close calendar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {warehouseCalendarError && (
              <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 md:mx-5">
                {warehouseCalendarError}
              </div>
            )}

            <div className="p-4 md:p-5 overflow-y-auto flex-1 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftCalendarModalMonth(-1)}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <select
                    value={calendarModalMonth}
                    onChange={(e) => setCalendarModalMonth(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(2000, i, 1).toLocaleDateString('en-PH', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={calendarModalYear}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (e.target.value === '' || !Number.isFinite(n)) return;
                      setCalendarModalYear(Math.trunc(n));
                    }}
                    className="min-w-[5.5rem] w-28 max-w-[8rem] border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    aria-label="Year"
                  />
                  <button
                    type="button"
                    onClick={() => shiftCalendarModalMonth(1)}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                  {requestType === 'production' ? (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        Production request
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                        Inter-branch
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        Purchase order
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                        Inter-branch
                      </span>
                    </>
                  )}
                </div>
              </div>

              {warehouseCalendarLoading && warehouseCalendarEvents.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Loading calendar…
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <div key={d} className="py-2">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {buildMonthGrid(calendarModalYear, calendarModalMonth).map((cell, idx) => {
                      if (!cell) {
                        return <div key={`pad-${idx}`} className="min-h-[4.5rem] rounded-lg bg-gray-50/50" />;
                      }
                      const cellKey = dateKeyLocalFromDate(cell);
                      const evs = warehouseEventsByDateKey[cellKey] ?? [];
                      const todayKey = dateKeyLocalFromDate(new Date());
                      const isToday = cellKey === todayKey;
                      const isSel = calendarModalSelectedDateKey === cellKey;
                      return (
                        <button
                          key={cellKey}
                          type="button"
                          onClick={() => setCalendarModalSelectedDateKey(cellKey)}
                          className={`min-h-[4.5rem] rounded-lg border p-1 text-left transition-all ${
                            isSel
                              ? 'ring-2 ring-red-400 border-red-300 bg-red-50/80'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          } ${isToday && !isSel ? 'ring-1 ring-red-200' : ''}`}
                        >
                          <div className={`text-sm font-semibold ${isToday ? 'text-red-700' : 'text-gray-900'}`}>
                            {cell.getDate()}
                          </div>
                          <div className="mt-0.5 space-y-0.5">
                            {evs.slice(0, 2).map((ev) => (
                              <div
                                key={ev.id}
                                className={`truncate rounded px-0.5 py-0.5 text-[10px] leading-tight ${calendarKindChipClass(ev.calendarKind)}`}
                                title={ev.title}
                              >
                                {ev.title}
                              </div>
                            ))}
                            {evs.length > 2 && (
                              <div className="text-[10px] text-gray-500 font-medium text-center">+{evs.length - 2}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {calendarModalSelectedDateKey && (
                <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    {(() => {
                      const parts = calendarModalSelectedDateKey.split('-').map(Number);
                      const y = parts[0];
                      const mo = parts[1];
                      const d = parts[2];
                      const label = new Date(y, mo - 1, d).toLocaleDateString('en-PH', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      });
                      return `Events on ${label}`;
                    })()}
                  </h3>
                  {(warehouseEventsByDateKey[calendarModalSelectedDateKey] ?? []).length === 0 ? (
                    <p className="text-sm text-gray-500">No scheduled activity on this date.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(warehouseEventsByDateKey[calendarModalSelectedDateKey] ?? []).map((ev) => (
                        <li
                          key={ev.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-white border border-gray-200 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${calendarKindChipClass(ev.calendarKind)}`}
                              >
                                {calendarKindLabel(ev.calendarKind)}
                              </span>
                              <span className="text-sm font-medium text-gray-900">{ev.title}</span>
                            </div>
                            <span
                              className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${calendarEventStatusBadgeClass(ev)}`}
                            >
                              {ev.status}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 text-sm font-medium text-blue-700 hover:underline"
                            onClick={() => {
                              const path =
                                ev.recordRoute === 'production'
                                  ? `/production-requests/${ev.recordId}`
                                  : ev.recordRoute === 'purchase'
                                    ? `/purchase-orders/${ev.recordId}`
                                    : `/inter-branch-requests/${ev.recordId}`;
                              setScheduleCalendarModalOpen(false);
                              navigate(path);
                            }}
                          >
                            Open
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          isOpen={showOrderDetailModal}
          onClose={() => {
            setShowOrderDetailModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      )}

      {/* 14-day strip: day detail (matches full-calendar data) */}
      {scheduleStripDetailDateKey && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setScheduleStripDetailDateKey(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-strip-day-title"
          >
            <div className="p-4 md:p-5 border-b border-gray-200 flex items-start justify-between gap-3">
              <h3 id="schedule-strip-day-title" className="text-lg font-bold text-gray-900 pr-2">
                {(() => {
                  const parts = scheduleStripDetailDateKey.split('-').map(Number);
                  const y = parts[0];
                  const mo = parts[1];
                  const d0 = parts[2];
                  const label = new Date(y, mo - 1, d0).toLocaleDateString('en-PH', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                  return `Events on ${label}`;
                })()}
                  </h3>
                <button
                type="button"
                onClick={() => setScheduleStripDetailDateKey(null)}
                className="text-gray-400 hover:text-gray-600 shrink-0 p-1 rounded-lg hover:bg-gray-100"
                aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            <div className="p-4 md:p-5 space-y-4">
              {(warehouseEventsByDateKey[scheduleStripDetailDateKey] ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">No events on this date.</p>
              ) : (
                (warehouseEventsByDateKey[scheduleStripDetailDateKey] ?? []).map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${stripCalendarIconWrapClass(ev)}`}
                      >
                        {ev.calendarKind === 'purchase' ? (
                          <ShoppingCart className={`w-6 h-6 ${stripCalendarIconClass(ev)}`} />
                        ) : ev.calendarKind === 'ibr' ? (
                          <GitBranch className={`w-6 h-6 ${stripCalendarIconClass(ev)}`} />
                        ) : (
                          <Factory className={`w-6 h-6 ${stripCalendarIconClass(ev)}`} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold text-gray-900 leading-tight">{stripCalendarEventHeadline(ev)}</p>
                        <span
                          className={`inline-block mt-1.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${calendarKindChipClass(ev.calendarKind)}`}
                        >
                          {calendarKindLabel(ev.calendarKind)}
                  </span>
                </div>
                </div>
                    <div className="p-4 space-y-3 text-sm bg-gray-50">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600 shrink-0">{stripCalendarItemLabel(ev)}:</span>
                        <span className="font-medium text-right text-gray-900">{ev.title}</span>
                  </div>
                      {(ev.recordRoute === 'production' || ev.recordRoute === 'purchase') && (
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600">Quantity:</span>
                          <span className="font-medium text-gray-900">
                            {ev.quantity} {ev.unit}
                  </span>
                </div>
                      )}
                      {ev.supplier && ev.recordRoute === 'purchase' ? (
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600">Supplier:</span>
                          <span className="font-medium text-right text-gray-900">{ev.supplier}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between items-center gap-3 pt-1">
                  <span className="text-gray-600">Status:</span>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${calendarEventStatusBadgeClass(ev)}`}
                        >
                          {ev.status}
                  </span>
                </div>
              </div>

                    <div className="p-4 flex flex-col-reverse sm:flex-row gap-3 border-t border-gray-100 bg-white">
                <button
                        type="button"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        onClick={() => setScheduleStripDetailDateKey(null)}
                >
                  Close
                </button>
                <button
                        type="button"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  onClick={() => {
                          const path =
                            ev.recordRoute === 'production'
                              ? `/production-requests/${ev.recordId}`
                              : ev.recordRoute === 'purchase'
                                ? `/purchase-orders/${ev.recordId}`
                                : `/inter-branch-requests/${ev.recordId}`;
                          setScheduleStripDetailDateKey(null);
                          navigate(path);
                        }}
                      >
                        {stripCalendarPrimaryCtaLabel(ev)}
                </button>
              </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Fulfill Order (Record Delivery) Modal ────────────────────── */}
      {showProofModal && proofOrder && (
        <FulfillOrderModal
          isOpen={showProofModal}
          onClose={() => { setShowProofModal(false); setProofOrder(null); }}
          orderId={proofOrder.id}
          orderNumber={proofOrder.orderNumber}
          items={proofOrder.items}
          onFulfill={handleFulfillOrder}
        />
      )}

      {warehouseMarkPackedOpen && warehouseMarkPackedOrder && (
        <MarkInTransitModal
          key={warehouseMarkPackedOrder.id}
          isOpen={warehouseMarkPackedOpen}
          onClose={() => {
            if (!inTransitSubmitting) {
              setWarehouseMarkPackedOpen(false);
              setWarehouseMarkPackedOrder(null);
            }
          }}
          orderNumber={warehouseMarkPackedOrder.orderNumber}
          items={warehouseMarkPackedOrder.items}
          purpose="markPacked"
          submitting={inTransitSubmitting}
          onConfirm={async (rows) => {
            const ok = await applyWarehouseShipment(rows, warehouseMarkPackedOrder, 'Packed');
            if (ok) {
              setWarehouseMarkPackedOpen(false);
              setWarehouseMarkPackedOrder(null);
            }
          }}
        />
      )}
    </div>
  );
}
