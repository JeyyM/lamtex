import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, FileText, Truck, Calendar, History, Search, AlertTriangle, CheckCircle, X, Factory, ShoppingCart, Clock, MapPin, TrendingUp, Activity, Brain, Target, RefreshCw, GitBranch, Loader2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Camera, CheckCircle2 } from 'lucide-react';
import { MarkInTransitModal } from '@/src/components/orders/MarkInTransitModal';
import { FulfillOrderModal, type FulfillmentData } from '@/src/components/orders/FulfillOrderModal';
import type { OrderLineItem } from '@/src/types/orders';
import { Button } from '@/src/components/ui/Button';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import OrderDetailModal from '../components/logistics/OrderDetailModal';
import { supabase } from '@/src/lib/supabase';
import { useAppContext } from '@/src/store/AppContext';
import { computeStockStatus } from '@/src/lib/stockStatus';

type TabType = 'inventory' | 'requests' | 'orders' | 'movements';
type StockStatus = 'healthy' | 'warning' | 'critical';
type RequestType = 'production' | 'purchase';

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
    case 'Scheduled':
    case 'Loading':
    case 'Packed':
    case 'Ready':
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

// Movements & Demand Forecast Types and Data
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

// Mock forecast items for selector
const mockForecastItems: ForecastItem[] = [
  {
    id: 'FG001',
    name: 'PVC Pressure Pipe 4" x 10ft',
    type: 'product',
    category: 'PVC Pipes',
    currentStock: 450,
    unit: 'pcs',
    avgDailyDemand: 38,
    forecastedDailyDemand: 40,
    daysOfCover: 11,
    predictedStockoutDate: 'Mar 11',
    recommendedReorderDate: 'Mar 4',
    recommendedQuantity: 300
  },
  {
    id: 'FG002',
    name: 'PVC Sanitary Pipe 4" x 10ft',
    type: 'product',
    category: 'PVC Pipes',
    currentStock: 380,
    unit: 'pcs',
    avgDailyDemand: 32,
    forecastedDailyDemand: 35,
    daysOfCover: 10,
    predictedStockoutDate: 'Mar 9',
    recommendedReorderDate: 'Mar 3',
    recommendedQuantity: 250
  },
  {
    id: 'RM001',
    name: 'PVC Resin Powder - K67',
    type: 'material',
    category: 'Raw Materials',
    currentStock: 3200,
    unit: 'kg',
    avgDailyDemand: 285,
    forecastedDailyDemand: 305,
    daysOfCover: 10,
    predictedStockoutDate: 'Mar 16',
    recommendedReorderDate: 'Feb 28',
    recommendedQuantity: 5000
  },
  {
    id: 'RM002',
    name: 'Plasticizer DOP',
    type: 'material',
    category: 'Raw Materials',
    currentStock: 850,
    unit: 'liters',
    avgDailyDemand: 48,
    forecastedDailyDemand: 52,
    daysOfCover: 16,
    predictedStockoutDate: 'Mar 18',
    recommendedReorderDate: 'Mar 8',
    recommendedQuantity: 800
  },
  {
    id: 'FG003',
    name: 'PVC Elbow 4" - 90 degree',
    type: 'product',
    category: 'PVC Fittings',
    currentStock: 620,
    unit: 'pcs',
    avgDailyDemand: 45,
    forecastedDailyDemand: 48,
    daysOfCover: 12,
    predictedStockoutDate: 'Mar 13',
    recommendedReorderDate: 'Mar 5',
    recommendedQuantity: 400
  }
];

// Generate demand data for selected item
const generateDemandData = (itemId: string): DemandDataPoint[] => {
  const data: DemandDataPoint[] = [];
  const today = new Date('2026-02-27');
  
  // Generate 14 days historical data (Feb 13-27)
  for (let i = -14; i < 0; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Simulate realistic patterns
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;
    
    let baseQuantity = 38;
    if (itemId === 'RM001') baseQuantity = 285;
    
    let actual = baseQuantity;
    if (isWeekend) actual *= 0.75; // Lower on weekends
    if (isMonday) actual *= 1.2; // Monday surge
    actual += (Math.random() - 0.5) * 10; // Random variation
    actual = Math.round(actual);
    
    // For materials, make it batch-based (0 on non-production days)
    if (itemId === 'RM001' && Math.random() > 0.4) {
      actual = 0;
    } else if (itemId === 'RM001') {
      actual = Math.round(actual * 2.2); // Higher quantity when used
    }
    
    data.push({
      date: dateStr,
      actual,
      isForecast: false
    });
  }
  
  // Generate 14 days forecast data (Feb 28-Mar 13)
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;
    
    let baseQuantity = 40;
    if (itemId === 'RM001') baseQuantity = 305;
    
    let forecast = baseQuantity;
    if (isWeekend) forecast *= 0.75;
    if (isMonday) forecast *= 1.25;
    if (i === 8) forecast *= 1.3; // Peak on Mar 8
    forecast += (Math.random() - 0.5) * 8;
    forecast = Math.round(forecast);
    
    // For materials, make it batch-based
    if (itemId === 'RM001' && Math.random() > 0.4) {
      forecast = 0;
    } else if (itemId === 'RM001') {
      forecast = Math.round(forecast * 2.1);
    }
    
    const confidenceMargin = forecast * 0.15;
    
    data.push({
      date: dateStr,
      forecast,
      confidenceLow: Math.round(forecast - confidenceMargin),
      confidenceHigh: Math.round(forecast + confidenceMargin),
      isForecast: true
    });
  }
  
  return data;
};

function stockComputeToUi(computed: string): StockStatus {
  if (computed === 'Critical' || computed === 'Out of Stock') return 'critical';
  if (computed === 'Low Stock') return 'warning';
  return 'healthy';
}

/** Matches ProductCategoryPage navigation: `family` id is the product row id. */
function finishedGoodProductHref(productId: string, categorySlug: string): string {
  const slug = categorySlug.trim();
  if (!slug) return `/products/${productId}`;
  return `/products/category/${encodeURIComponent(slug)}/family/${productId}`;
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
  const [warehouseOrdersLoading, setWarehouseOrdersLoading] = useState(false);
  const [showInTransitModal, setShowInTransitModal] = useState(false);
  const [inTransitOrder, setInTransitOrder] = useState<WarehouseOrderRow | null>(null);
  const [inTransitSubmitting, setInTransitSubmitting] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofOrder, setProofOrder] = useState<WarehouseOrderRow | null>(null);

  const [finishedGoodsRows, setFinishedGoodsRows] = useState<FinishedGood[]>([]);
  const [rawMaterialsRows, setRawMaterialsRows] = useState<RawMaterial[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  
  // Movements tab state
  const [selectedForecastItem, setSelectedForecastItem] = useState<ForecastItem>(mockForecastItems[0]);
  const [demandData, setDemandData] = useState<DemandDataPoint[]>(generateDemandData(mockForecastItems[0].id));

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

  const fetchWarehouseOrders = useCallback(async () => {
    setWarehouseOrdersLoading(true);
    try {
      const branchResult = branch
        ? await supabase.from('branches').select('id, code').eq('name', branch).maybeSingle()
        : null;
      const bid = branchResult?.data?.id ?? null;
      const bcode = (branchResult?.data as { code?: string } | null)?.code ?? '';

      let q = supabase
        .from('orders')
        .select('id, order_number, customer_name, delivery_address, required_date, status, urgency, branch_id')
        .not('status', 'in', '("Draft","Cancelled","Rejected","Delivered","Completed","Partially Fulfilled")')
        .order('required_date', { ascending: true });
      if (bid) q = (q as typeof q).eq('branch_id', bid);

      const { data: orderRows, error } = await q;
      if (error) throw error;
      if (!orderRows?.length) { setWarehouseOrders([]); return; }

      const orderIds = (orderRows as any[]).map((o) => o.id as string);
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

      setWarehouseOrders(
        (orderRows as any[]).map((o) => ({
          id: o.id,
          orderNumber: o.order_number ?? '—',
          customerName: o.customer_name ?? '—',
          deliveryAddress: o.delivery_address ?? null,
          requiredDate: o.required_date ?? null,
          status: o.status ?? '',
          urgency: o.urgency ?? '',
          branchId: o.branch_id ?? null,
          branchCode: bcode,
          items: linesByOrder[o.id] ?? [],
        }))
      );
    } catch (e: unknown) {
      console.error('Failed to load warehouse orders:', e);
      setWarehouseOrders([]);
    } finally {
      setWarehouseOrdersLoading(false);
    }
  }, [branch]);

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
    setScheduleSearch('');
    setScheduleStatusFilter('');
    setPrSchedulePage(1);
    setPoSchedulePage(1);
  }, [branch, requestType]);

  useEffect(() => {
    void fetchWarehouseInventory();
  }, [fetchWarehouseInventory]);

  // ── Orders & Loading tab handlers ────────────────────────────────────────
  const handleConfirmInTransit = async (rows: { itemId: string; shippedQuantity: number }[]) => {
    if (!inTransitOrder) return;
    const byLine = new Map(rows.map((r) => [r.itemId, r.shippedQuantity]));
    const order = inTransitOrder;

    for (const li of order.items) {
      const ship = byLine.get(li.id);
      if (ship === undefined) continue;
      if (ship < 0) { alert('Each sent quantity must be 0 or more.'); return; }
      const prevCum = li.quantityShipped ?? 0;
      if (prevCum + ship > li.quantity) {
        alert(`"${li.productName}": cannot send more than the remaining to fulfill this line (ordered ${li.quantity}, already ${prevCum} in transit, this shipment: ${ship}).`);
        return;
      }
    }
    if (!order.branchId) {
      alert('This order has no branch assigned.');
      return;
    }
    setInTransitSubmitting(true);
    const branchId = order.branchId;
    const branchCode = order.branchCode;
    const lineWithShip = order.items.map((li) => ({ line: li, ship: byLine.get(li.id) ?? 0 }));

    // Stock validation
    for (const { line: l, ship } of lineWithShip) {
      if (!l.variantId || ship <= 0) continue;
      const { data: pvs, error: pErr } = await supabase
        .from('product_variant_stock')
        .select('id, quantity')
        .eq('variant_id', l.variantId)
        .eq('branch_id', branchId)
        .maybeSingle();
      if (pErr) { setInTransitSubmitting(false); alert(pErr.message); return; }
      const onHand = pvs ? Number((pvs as any).quantity) : 0;
      if (onHand < ship) {
        setInTransitSubmitting(false);
        alert(`Not enough stock for "${l.productName}" at this branch. On hand: ${onHand}, sending: ${ship}.`);
        return;
      }
    }

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
          const newBranch = Math.max(0, Number((pvs as any).quantity) - ship);
          const { error: u1 } = await supabase
            .from('product_variant_stock')
            .update({ quantity: newBranch, updated_at: new Date().toISOString() })
            .eq('id', (pvs as any).id);
          if (u1) throw u1;

          const { data: vrow } = await supabase
            .from('product_variants')
            .select('total_stock, sku')
            .eq('id', l.variantId)
            .single();
          if (vrow) {
            const newTotal = Math.max(0, Number((vrow as any).total_stock ?? 0) - ship);
            const { error: u2 } = await supabase
              .from('product_variants')
              .update({ total_stock: newTotal, updated_at: new Date().toISOString() })
              .eq('id', l.variantId);
            if (u2) throw u2;
          }

          const { error: mErr } = await supabase.from('product_stock_movements').insert({
            variant_id: l.variantId,
            variant_sku: (vrow as any)?.sku ?? l.sku,
            product_name: l.productName,
            movement_type: 'Out',
            quantity: ship,
            from_branch: branchCode || null,
            reason: 'Order in transit (shipment)',
            performed_by: employeeName || session?.user?.email || role,
            reference_number: order.id,
            timestamp: new Date().toISOString(),
          });
          if (mErr) throw mErr;
        }

        const prevCum = l.quantityShipped ?? 0;
        const { error: lineErr } = await supabase
          .from('order_line_items')
          .update({ quantity_shipped: prevCum + (byLine.get(l.id) ?? 0), updated_at: new Date().toISOString() })
          .eq('id', l.id);
        if (lineErr) throw lineErr;
      }

      const { error: ordErr } = await supabase
        .from('orders')
        .update({ status: 'In Transit', updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (ordErr) throw ordErr;

      // Update local state
      setWarehouseOrders((prev) =>
        prev.map((o) =>
          o.id !== order.id
            ? o
            : {
                ...o,
                status: 'In Transit',
                items: o.items.map((li) => {
                  const ship = byLine.get(li.id) ?? 0;
                  return { ...li, quantityShipped: (li.quantityShipped ?? 0) + ship };
                }),
              }
        )
      );
      setShowInTransitModal(false);
      setInTransitOrder(null);
      addAuditLog('In transit (shipment)', 'Order', `Order ${order.orderNumber} marked in transit from Warehouse`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to confirm in transit';
      alert(msg);
    } finally {
      setInTransitSubmitting(false);
    }
  };

  const handleSendProof = (ord: WarehouseOrderRow) => {
    setProofOrder(ord);
    setShowProofModal(true);
  };

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
    setWarehouseOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const updatedItems = o.items.map((l) => {
        const fd = fulfillmentData.find((f) => f.itemId === l.id);
        return fd ? { ...l, quantityDelivered: (l.quantityDelivered ?? 0) + fd.deliveredQuantity } : l;
      });
      return { ...o, status: newStatus, items: updatedItems };
    }));

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate('/production-requests')}
              >
                <Factory className="h-4 w-4" />
                Production requests
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate('/purchase-orders')}
              >
                <ShoppingCart className="h-4 w-4" />
                Purchase orders
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate('/inter-branch-requests')}
              >
                <GitBranch className="h-4 w-4" />
                Inter-Branch
              </Button>
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
            {/* Tab heading + calendar button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900">Orders &amp; Loading</h2>
              <button
                type="button"
                onClick={openOrdersCalendar}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 bg-white shadow-sm"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                View Delivery Calendar
                {ordersCalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
              </button>
            </div>

            {/* Header with Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Ready to Load</p>
                <p className="text-2xl font-bold text-blue-600">8</p>
                <p className="text-xs text-gray-500 mt-1">Orders approved</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Currently Loading</p>
                <p className="text-2xl font-bold text-yellow-600">2</p>
                <p className="text-xs text-gray-500 mt-1">Trucks in progress</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Ready to Depart</p>
                <p className="text-2xl font-bold text-green-600">1</p>
                <p className="text-xs text-gray-500 mt-1">Loaded & verified</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Stock Issues</p>
                <p className="text-2xl font-bold text-red-600">3</p>
                <p className="text-xs text-gray-500 mt-1">Orders with shortages</p>
              </div>
            </div>

            {/* Orders — live from DB */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Orders</h3>
                <div className="flex items-center gap-2">
                  {warehouseOrdersLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  <button
                    type="button"
                    onClick={() => void fetchWarehouseOrders()}
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
                <div className="py-12 text-center text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium">No active orders for this branch</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Order</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Destination</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Required</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Urgency</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {warehouseOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{ord.orderNumber}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">{ord.customerName}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm">{ord.deliveryAddress ?? '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block text-xs font-semibold uppercase px-2 py-0.5 rounded border ${orderDeliveryStatusBadge(ord.status)}`}>
                                {ord.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">
                                  {ord.requiredDate
                                    ? new Date(ord.requiredDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                                    : '—'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {ord.urgency ? (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  ord.urgency === 'High' || ord.urgency === 'Critical'
                                    ? 'bg-red-50 text-red-700'
                                    : ord.urgency === 'Medium'
                                      ? 'bg-yellow-50 text-yellow-700'
                                      : 'bg-gray-100 text-gray-700'
                                }`}>{ord.urgency}</span>
                              ) : <span className="text-gray-400 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {['Approved', 'Scheduled', 'Loading', 'Packed', 'Ready'].includes(ord.status) && (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
                                    onClick={() => { setInTransitOrder(ord); setShowInTransitModal(true); }}
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    Mark In Transit
                                  </button>
                                )}
                                {ord.status === 'In Transit' && (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                                    onClick={() => handleSendProof(ord)}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Record delivery
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {warehouseOrders.map((ord) => (
                      <div key={ord.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 break-words">{ord.orderNumber}</p>
                            <p className="text-xs text-gray-600 mt-1">{ord.customerName}</p>
                          </div>
                          <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded border flex-shrink-0 ${orderDeliveryStatusBadge(ord.status)}`}>
                            {ord.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Destination</p>
                            <p className="text-gray-900">{ord.deliveryAddress ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Required</p>
                            <p className="text-gray-900">
                              {ord.requiredDate
                                ? new Date(ord.requiredDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                                : '—'}
                            </p>
                          </div>
                          {ord.urgency && (
                            <div>
                              <p className="text-xs text-gray-500">Urgency</p>
                              <p className={`font-medium ${
                                ord.urgency === 'High' || ord.urgency === 'Critical' ? 'text-red-600' : ord.urgency === 'Medium' ? 'text-yellow-600' : 'text-gray-700'
                              }`}>{ord.urgency}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {['Approved', 'Scheduled', 'Loading', 'Packed', 'Ready'].includes(ord.status) && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
                              onClick={() => { setInTransitOrder(ord); setShowInTransitModal(true); }}
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Mark In Transit
                            </button>
                          )}
                          {ord.status === 'In Transit' && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                              onClick={() => handleSendProof(ord)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Record delivery
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Available Trucks */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Available Trucks</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-blue-600" />
                        <div className="font-semibold text-gray-900">Truck 002</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">ABC-5678</div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Available
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Driver: Carlos Garcia</span>
                    </div>
                    <div className="text-xs text-gray-500">Next departure: 2:00 PM</div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Weight</span>
                        <span className="font-medium">0/5,000 kg (0%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Volume</span>
                        <span className="font-medium">0/25 m³ (0%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Orders: 0 • Ready for loading
                  </div>

                  <button className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Start Loading
                  </button>
                </div>

                {/* Truck 2 - Loading (64%) */}
                <div className="border border-yellow-300 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-yellow-600" />
                        <div className="font-semibold text-gray-900">Truck 003</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">DEF-9012</div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Loading
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Driver: Pedro Cruz</span>
                    </div>
                    <div className="text-xs text-gray-500">Departure: 1:00 PM</div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Weight</span>
                        <span className="font-medium">3,200/5,000 kg (64%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '64%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Volume</span>
                        <span className="font-medium">15.8/25 m³ (63%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '63%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Orders: 2 • Loading in progress
                  </div>

                  <button className="w-full px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium">
                    Continue Loading
                  </button>
                </div>

                {/* Truck 3 - Ready to Depart (85%) */}
                <div className="border border-green-300 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-green-600" />
                        <div className="font-semibold text-gray-900">Truck 001</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">ABC-1234</div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Ready
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Driver: Juan Santos</span>
                    </div>
                    <div className="text-xs text-green-600 font-medium">✓ Loaded & verified</div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Weight</span>
                        <span className="font-medium">4,250/5,000 kg (85%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Volume</span>
                        <span className="font-medium">21.3/25 m³ (85%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Orders: 3 • Ready for dispatch
                  </div>

                  <button className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    Confirm Departure
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="space-y-6">
            {/* Header with Item Selector */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Activity className="w-7 h-7 text-blue-600" />
                    Demand Forecast & Movement Analysis
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">AI-powered demand prediction using historical data and machine learning</p>
                </div>
                <div className="flex items-start sm:items-center gap-2 text-sm">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Model Accuracy: 87.3%</div>
                    <div className="text-xs text-gray-500">Last updated: Today, 6:00 AM</div>
                  </div>
                </div>
              </div>

              {/* Item Selector */}
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Item to Forecast
                  </label>
                  <select
                    value={selectedForecastItem.id}
                    onChange={(e) => {
                      const item = mockForecastItems.find(i => i.id === e.target.value);
                      if (item) {
                        setSelectedForecastItem(item);
                        setDemandData(generateDemandData(item.id));
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  >
                    <optgroup label="Finished Products">
                      {mockForecastItems.filter(i => i.type === 'product').map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {item.currentStock} {item.unit}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Raw Materials">
                      {mockForecastItems.filter(i => i.type === 'material').map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {item.currentStock} {item.unit}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <button 
                  onClick={() => setDemandData(generateDemandData(selectedForecastItem.id))}
                  className="w-full sm:w-auto px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">Current Stock</div>
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {selectedForecastItem.currentStock.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">{selectedForecastItem.unit}</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">Days of Cover</div>
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {selectedForecastItem.daysOfCover}
                </div>
                <div className="text-sm text-gray-500">days remaining</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">Predicted Stockout</div>
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {selectedForecastItem.predictedStockoutDate}
                </div>
                <div className="text-sm text-gray-500">if no replenishment</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">Recommended Reorder</div>
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {selectedForecastItem.recommendedQuantity}
                </div>
                <div className="text-sm text-gray-500">by {selectedForecastItem.recommendedReorderDate}</div>
              </div>
            </div>

            {/* Demand Forecast Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    28-Day Demand Forecast
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Historical consumption (14 days) + AI-predicted demand (14 days)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-blue-600 rounded"></div>
                    <span className="text-gray-600">Historical (Actual)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-orange-500 rounded" style={{ borderTop: '2px dashed orange' }}></div>
                    <span className="text-gray-600">Forecast (Predicted)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-4 bg-orange-100 rounded border border-orange-300"></div>
                    <span className="text-gray-600">Confidence Range</span>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={demandData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    label={{ value: `Quantity (${selectedForecastItem.unit})`, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  
                  {/* Confidence interval (shaded area) */}
                  <Area
                    type="monotone"
                    dataKey="confidenceHigh"
                    stroke="none"
                    fill="#fed7aa"
                    fillOpacity={0.3}
                    name="Confidence High"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="confidenceLow"
                    stroke="none"
                    fill="#ffffff"
                    fillOpacity={1}
                    name="Confidence Low"
                    dot={false}
                  />
                  
                  {/* Actual historical line */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', r: 4 }}
                    name="Historical Actual"
                    connectNulls={false}
                  />
                  
                  {/* Forecasted line */}
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#f97316"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={{ fill: '#f97316', r: 4 }}
                    name="Forecasted Demand"
                    connectNulls={false}
                  />
                  
                  {/* Today marker */}
                  <ReferenceLine 
                    x="Feb 27" 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ 
                      value: 'Today', 
                      position: 'top',
                      fill: '#dc2626',
                      fontWeight: 'bold',
                      fontSize: 12
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ML Insights & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ML Insights Panel */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Model Insights</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-900">Trend Analysis</div>
                      <div className="text-sm text-gray-600">
                        {selectedForecastItem.forecastedDailyDemand > selectedForecastItem.avgDailyDemand 
                          ? `Demand increasing by ${Math.round(((selectedForecastItem.forecastedDailyDemand - selectedForecastItem.avgDailyDemand) / selectedForecastItem.avgDailyDemand) * 100)}% - growth trend detected`
                          : 'Stable demand pattern with seasonal variation'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-900">Pattern Recognition</div>
                      <div className="text-sm text-gray-600">
                        Weekly cycle detected: Higher demand on weekdays (Mon-Fri), 25% drop on weekends
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-900">Peak Forecast</div>
                      <div className="text-sm text-gray-600">
                        Expected demand spike on Mar 8 (+30%) due to scheduled orders and historical patterns
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-900">Recommendation</div>
                      <div className="text-sm text-gray-600">
                        {selectedForecastItem.daysOfCover < 10 
                          ? `🚨 Urgent: Reorder ${selectedForecastItem.recommendedQuantity} ${selectedForecastItem.unit} by ${selectedForecastItem.recommendedReorderDate}`
                          : `Maintain current stock levels. Reorder ${selectedForecastItem.recommendedQuantity} ${selectedForecastItem.unit} by ${selectedForecastItem.recommendedReorderDate}`
                        }
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>📊 Data Points Used: 90 days historical + production schedule</div>
                      <div>🎯 Confidence Level: High (87.3% accuracy on validation set)</div>
                      <div>⏱️ Model Last Trained: Today, 6:00 AM</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Smart Alerts Panel */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Smart Alerts</h3>
                </div>
                
                <div className="space-y-3">
                  {selectedForecastItem.daysOfCover <= 10 && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-red-900 mb-1">Low Stock Warning</div>
                        <div className="text-sm text-red-700">
                          Only {selectedForecastItem.daysOfCover} days of stock remaining. Stockout predicted on {selectedForecastItem.predictedStockoutDate}.
                        </div>
                        <button className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 underline">
                          Create {selectedForecastItem.type === 'product' ? 'Production' : 'Purchase'} Request
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-orange-900 mb-1">Demand Spike Predicted</div>
                      <div className="text-sm text-orange-700">
                        +30% increase expected on Mar 8 (Peak: ~{Math.round(selectedForecastItem.forecastedDailyDemand * 1.3)} {selectedForecastItem.unit})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-blue-900 mb-1">Reorder Point Approaching</div>
                      <div className="text-sm text-blue-700">
                        Recommended to reorder {selectedForecastItem.recommendedQuantity} {selectedForecastItem.unit} by {selectedForecastItem.recommendedReorderDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Activity className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-green-900 mb-1">Seasonal Pattern Detected</div>
                      <div className="text-sm text-green-700">
                        Weekly cycle confirmed: 25% lower demand on weekends, Monday surge pattern
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Movement History Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-600" />
                  Recent Movement History (Last 30 Days)
                </h3>
                <p className="text-sm text-gray-600 mt-1">Actual stock movements for {selectedForecastItem.name}</p>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Feb 27, 2:45 PM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Out</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">-35 {selectedForecastItem.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">ORD-2026-045</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">J. Santos</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Customer delivery</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Feb 27, 10:30 AM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Production</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">+100 {selectedForecastItem.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">BATCH-2026-027</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">System</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Production completion</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Feb 26, 4:15 PM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Out</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">-42 {selectedForecastItem.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">ORD-2026-044</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">M. Cruz</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Manila delivery</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Feb 26, 11:00 AM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Transfer</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">+25 {selectedForecastItem.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">TRF-2026-012</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">P. Garcia</td>
                      <td className="px-6 py-4 text-sm text-gray-500">From Branch B</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Feb 25, 3:20 PM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Out</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">-38 {selectedForecastItem.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">ORD-2026-043</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">R. Santos</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Urgent order</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">Feb 27, 2:45 PM</p>
                      <p className="text-xs text-gray-500 mt-1">ORD-2026-045 • J. Santos</p>
                    </div>
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium flex-shrink-0">Out</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-600">-35 {selectedForecastItem.unit}</span>
                    <span className="text-xs text-gray-600">Customer delivery</span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">Feb 27, 10:30 AM</p>
                      <p className="text-xs text-gray-500 mt-1">BATCH-2026-027 • System</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium flex-shrink-0">Production</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-600">+100 {selectedForecastItem.unit}</span>
                    <span className="text-xs text-gray-600">Production completion</span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">Feb 26, 4:15 PM</p>
                      <p className="text-xs text-gray-500 mt-1">ORD-2026-044 • M. Cruz</p>
                    </div>
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium flex-shrink-0">Out</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-600">-42 {selectedForecastItem.unit}</span>
                    <span className="text-xs text-gray-600">Manila delivery</span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">Feb 26, 11:00 AM</p>
                      <p className="text-xs text-gray-500 mt-1">TRF-2026-012 • P. Garcia</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium flex-shrink-0">Transfer</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-600">+25 {selectedForecastItem.unit}</span>
                    <span className="text-xs text-gray-600">From Branch B</span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">Feb 25, 3:20 PM</p>
                      <p className="text-xs text-gray-500 mt-1">ORD-2026-043 • R. Santos</p>
                    </div>
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium flex-shrink-0">Out</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-600">-38 {selectedForecastItem.unit}</span>
                    <span className="text-xs text-gray-600">Urgent order</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 text-center">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View Full History (90 days) →
                </button>
              </div>
            </div>
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

      {/* ── Mark In Transit Modal ─────────────────────────────────────── */}
      {showInTransitModal && inTransitOrder && (
        <MarkInTransitModal
          isOpen={showInTransitModal}
          onClose={() => { if (!inTransitSubmitting) { setShowInTransitModal(false); setInTransitOrder(null); } }}
          orderNumber={inTransitOrder.orderNumber}
          items={inTransitOrder.items}
          submitting={inTransitSubmitting}
          onConfirm={handleConfirmInTransit}
        />
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
    </div>
  );
}
