/**
 * Warehouse Manager Dashboard data layer.
 *
 * The warehouse manager is responsible for the inventory and operations of
 * their branch, scoped to the product families and raw materials assigned to
 * them on `employee_product_assignments` / `employee_material_assignments`.
 *
 * Live signals surfaced here:
 *   - Stockouts and low-stock alerts (inside their scope)
 *   - Incoming purchase orders awaiting receipt at their branch
 *   - Customer orders awaiting warehouse fulfilment
 *   - Inter-branch requests their branch needs to fulfil
 *   - Their own production requests and purchase orders (by `created_by`)
 *   - Recent stock movements (product + material) and a 7-day inbound/outbound
 *     activity trend
 *   - Estimated inventory value at the branch
 */

import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import type { WarehouseAssignmentScope } from '@/src/lib/warehouseScope';

/** Toggle stock movements chart/table on the warehouse dashboard. */
export const WAREHOUSE_DASHBOARD_SHOW_STOCK_MOVEMENTS = false;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WarehouseKPI {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  status: 'good' | 'warning' | 'danger' | 'neutral';
  href?: string;
}

export interface ProductStockoutRow {
  variantId: string;
  productId: string;
  categorySlug: string | null;
  productName: string;
  size: string;
  sku: string;
  totalStock: number;
  reorderPoint: number;
  lastRestocked: string | null;
}

export interface ProductLowStockRow extends ProductStockoutRow {
  safetyStock: number;
}

export interface MaterialLowStockRow {
  materialId: string;
  name: string;
  sku: string;
  unit: string;
  totalStock: number;
  reorderPoint: number;
  safetyStock: number;
  monthlyConsumption: number;
  daysOfCover: number | null;
  primarySupplier: string | null;
}

export interface IncomingPORow {
  id: string;
  poNumber: string;
  status: string;
  supplierName: string | null;
  expectedDeliveryDate: string | null;
  daysUntilExpected: number | null;
  totalAmount: number;
  itemCount: number;
  quantityRemaining: number;
}

export interface OrderToFulfillRow {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  agentName: string | null;
  requiredDate: string | null;
  daysUntilRequired: number | null;
  totalAmount: number;
  lineCount: number;
  urgency: 'overdue' | 'today' | 'soon' | 'later';
}

export interface IBRToFulfillRow {
  id: string;
  ibrNumber: string;
  status: string;
  requestingBranchName: string | null;
  scheduledDepartureDate: string | null;
  daysUntilDeparture: number | null;
  lineKindSummary: string;
  itemCount: number;
}

export interface MyPRRow {
  id: string;
  prNumber: string;
  status: string;
  requestDate: string | null;
  expectedCompletionDate: string | null;
  itemCount: number;
}

export interface MyPORow {
  id: string;
  poNumber: string;
  status: string;
  supplierName: string | null;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  totalAmount: number;
  itemCount: number;
}

export interface RecentMovementRow {
  id: string;
  kind: 'product' | 'material';
  /** Product id or raw material id for detail links. */
  entityId: string | null;
  type: string;
  itemName: string;
  sku: string | null;
  unit: string | null;
  quantity: number;
  performedBy: string | null;
  reference: string | null;
  reason: string | null;
  timestamp: string;
}

export interface MovementTrendPoint {
  /** `YYYY-MM-DD` */
  dayKey: string;
  label: string;
  inbound: number;
  outbound: number;
  net: number;
}

export interface WarehouseManagerDashboardBundle {
  branchId: string | null;
  branchName: string | null;
  scopeActive: boolean;
  scopeSummary: { productCount: number; materialCount: number };
  generatedAt: string;
  kpis: WarehouseKPI[];

  criticalInventory: {
    stockouts: ProductStockoutRow[];
    lowStockProducts: ProductLowStockRow[];
    lowStockMaterials: MaterialLowStockRow[];
    stockoutCount: number;
    lowStockProductCount: number;
    lowStockMaterialCount: number;
  };

  incomingPurchaseOrders: IncomingPORow[];
  incomingPurchaseOrderCount: number;
  incomingPurchaseOrderValue: number;

  ordersAwaitingFulfillment: OrderToFulfillRow[];
  ordersAwaitingFulfillmentCount: number;

  ibrsToFulfill: IBRToFulfillRow[];
  ibrsToFulfillCount: number;

  myProductionRequests: { recent: MyPRRow[]; statusCounts: Record<string, number>; activeCount: number };
  myPurchaseOrders: { recent: MyPORow[]; statusCounts: Record<string, number>; activeCount: number };

  recentMovements: RecentMovementRow[];
  movementsTrend: MovementTrendPoint[];

  inventoryValue: { productsValue: number; materialsValue: number; total: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Orders the warehouse owns until they go in transit. */
const WAREHOUSE_PIPELINE_STATUSES = ['Approved', 'Loading', 'Packed', 'Ready'];

/** PO states where stock physically arrives — warehouse books the receipt. */
const INCOMING_PO_STATUSES = ['Sent', 'Confirmed', 'Partially Received'];

/** IBR states the *fulfilling* branch warehouse has to act on. */
const IBR_FULFILL_STATUSES = ['Pending', 'Approved', 'Scheduled', 'Loading', 'Packed', 'Ready'];

/** "Active" worker-created PRs the manager is still tracking. */
const ACTIVE_PR_STATUSES = ['Draft', 'Requested', 'Accepted', 'In Progress'];

/** "Active" worker-created POs the manager is still tracking. */
const ACTIVE_PO_STATUSES = ['Draft', 'Requested', 'Accepted', 'Sent', 'Confirmed', 'Partially Received'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toStr(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  if (typeof v === 'number') return String(v);
  return null;
}

function nestedName(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return toStr((value[0] as { name?: unknown } | undefined)?.name ?? null);
  }
  if (typeof value === 'object') {
    return toStr((value as { name?: unknown }).name ?? null);
  }
  return null;
}

function nestedAs<T>(value: unknown): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return value as T;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(from: string | null | undefined, ref: Date): number | null {
  if (!from) return null;
  const d = new Date(from);
  if (!Number.isFinite(d.getTime())) return null;
  return Math.floor((startOfDay(d).getTime() - startOfDay(ref).getTime()) / 86_400_000);
}

function logDev(scope: string, err: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[warehouse dashboard] ${scope}`, err);
  }
}

function pesos(amount: number): string {
  if (!Number.isFinite(amount)) return '₱0';
  if (Math.abs(amount) >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `₱${(amount / 1_000).toFixed(0)}K`;
  return `₱${Math.round(amount).toLocaleString()}`;
}

/**
 * The PR/PO `created_by` field stores either the actor's name or email.
 * We attempt to match either when the dashboard says "my PR/PO".
 */
function buildCreatorMatchers(name: string | null): string[] {
  const out = new Set<string>();
  if (!name) return [];
  const trimmed = name.trim();
  if (trimmed) out.add(trimmed);
  return [...out];
}

// ---------------------------------------------------------------------------
// Sub-fetchers
// ---------------------------------------------------------------------------

interface StockSourceRow {
  variantId: string;
  productId: string;
  categorySlug: string | null;
  productName: string;
  sku: string;
  size: string;
  totalStock: number;
  reorderPoint: number;
  safetyStock: number;
  lastRestocked: string | null;
}

async function fetchScopedVariants(scope: WarehouseAssignmentScope): Promise<StockSourceRow[]> {
  try {
    let q = supabase
      .from('product_variants')
      .select(
        `id, sku, size, total_stock, reorder_point, safety_stock, last_restocked,
         products!inner(id, name, is_hidden, product_categories(slug))`,
      )
      .eq('is_hidden', false)
      .order('total_stock', { ascending: true })
      .limit(500);

    if (scope.productIds !== null) {
      if (scope.productIds.size === 0) return [];
      q = q.in('products.id', [...scope.productIds]);
    }

    const { data, error } = await q;
    if (error) throw error;

    return ((data ?? []) as Array<Record<string, unknown>>)
      .map((r) => {
        const product = nestedAs<{
          id?: unknown;
          name?: unknown;
          is_hidden?: unknown;
          product_categories?: { slug?: unknown } | { slug?: unknown }[] | null;
        }>(r.products);
        if (!product) return null;
        if (product.is_hidden === true) return null;
        const category = product.product_categories;
        const categoryObj = Array.isArray(category) ? category[0] : category;
        return {
          variantId: String(r.id),
          productId: String(product.id ?? ''),
          categorySlug: toStr(categoryObj?.slug),
          productName: toStr(product.name) ?? '—',
          sku: toStr(r.sku) ?? '—',
          size: toStr(r.size) ?? '—',
          totalStock: toNumber(r.total_stock),
          reorderPoint: toNumber(r.reorder_point),
          safetyStock: toNumber(r.safety_stock),
          lastRestocked: toStr(r.last_restocked),
        };
      })
      .filter((r): r is StockSourceRow => r !== null);
  } catch (e) {
    logDev('scoped variants', e);
    return [];
  }
}

interface MaterialSourceRow {
  materialId: string;
  name: string;
  sku: string;
  unit: string;
  totalStock: number;
  reorderPoint: number;
  safetyStock: number;
  monthlyConsumption: number;
  costPerUnit: number;
  primarySupplier: string | null;
}

async function fetchScopedMaterials(scope: WarehouseAssignmentScope): Promise<MaterialSourceRow[]> {
  try {
    let q = supabase
      .from('raw_materials')
      .select(
        'id, name, sku, unit_of_measure, total_stock, reorder_point, safety_stock, monthly_consumption, cost_per_unit, primary_supplier, status',
      )
      .neq('status', 'Discontinued')
      .order('total_stock', { ascending: true })
      .limit(500);

    if (scope.materialIds !== null) {
      if (scope.materialIds.size === 0) return [];
      q = q.in('id', [...scope.materialIds]);
    }

    const { data, error } = await q;
    if (error) throw error;

    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      materialId: String(r.id),
      name: toStr(r.name) ?? '—',
      sku: toStr(r.sku) ?? '—',
      unit: toStr(r.unit_of_measure) ?? '',
      totalStock: toNumber(r.total_stock),
      reorderPoint: toNumber(r.reorder_point),
      safetyStock: toNumber(r.safety_stock),
      monthlyConsumption: toNumber(r.monthly_consumption),
      costPerUnit: toNumber(r.cost_per_unit),
      primarySupplier: toStr(r.primary_supplier),
    }));
  } catch (e) {
    logDev('scoped materials', e);
    return [];
  }
}

async function fetchIncomingPurchaseOrders(branchId: string | null): Promise<IncomingPORow[]> {
  try {
    let q = supabase
      .from('purchase_orders')
      .select(
        `id, po_number, status, expected_delivery_date, total_amount,
         suppliers(name),
         purchase_order_items(id, quantity_ordered, quantity_received)`,
      )
      .in('status', INCOMING_PO_STATUSES)
      .order('expected_delivery_date', { ascending: true });
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q.limit(20);
    if (error) throw error;

    const now = new Date();
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const items = (r.purchase_order_items as Array<{ quantity_ordered?: unknown; quantity_received?: unknown }> | null) ?? [];
      const totalOrdered = items.reduce((s, it) => s + toNumber(it.quantity_ordered), 0);
      const totalReceived = items.reduce((s, it) => s + toNumber(it.quantity_received), 0);
      return {
        id: String(r.id),
        poNumber: toStr(r.po_number) ?? String(r.id),
        status: toStr(r.status) ?? '—',
        supplierName: nestedName(r.suppliers),
        expectedDeliveryDate: toStr(r.expected_delivery_date),
        daysUntilExpected: diffDays(toStr(r.expected_delivery_date), now),
        totalAmount: toNumber(r.total_amount),
        itemCount: items.length,
        quantityRemaining: Math.max(0, totalOrdered - totalReceived),
      };
    });
  } catch (e) {
    logDev('incoming POs', e);
    return [];
  }
}

async function fetchOrdersAwaitingFulfillment(branchId: string | null): Promise<OrderToFulfillRow[]> {
  try {
    let q = supabase
      .from('orders')
      .select(
        `id, order_number, status, customer_name, agent_name, required_date, total_amount,
         order_line_items(id)`,
      )
      .in('status', WAREHOUSE_PIPELINE_STATUSES)
      .order('required_date', { ascending: true });
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q.limit(50);
    if (error) throw error;

    const now = new Date();
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const requiredDate = toStr(r.required_date);
      const days = diffDays(requiredDate, now);
      const urgency: OrderToFulfillRow['urgency'] =
        days == null ? 'later' : days < 0 ? 'overdue' : days === 0 ? 'today' : days <= 3 ? 'soon' : 'later';
      return {
        id: String(r.id),
        orderNumber: toStr(r.order_number) ?? String(r.id),
        status: toStr(r.status) ?? '—',
        customerName: toStr(r.customer_name) ?? '—',
        agentName: toStr(r.agent_name),
        requiredDate,
        daysUntilRequired: days,
        totalAmount: toNumber(r.total_amount),
        lineCount: Array.isArray(r.order_line_items) ? (r.order_line_items as unknown[]).length : 0,
        urgency,
      };
    });
  } catch (e) {
    logDev('orders awaiting fulfilment', e);
    return [];
  }
}

async function fetchIBRsToFulfill(branchId: string | null): Promise<IBRToFulfillRow[]> {
  if (!branchId) return [];
  try {
    const { data, error } = await supabase
      .from('inter_branch_requests')
      .select(
        `id, ibr_number, status, scheduled_departure_date,
         req_br:branches!requesting_branch_id(name),
         inter_branch_request_items(line_kind)`,
      )
      .eq('fulfilling_branch_id', branchId)
      .in('status', IBR_FULFILL_STATUSES)
      .order('scheduled_departure_date', { ascending: true })
      .limit(20);
    if (error) throw error;

    const now = new Date();
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const items = (r.inter_branch_request_items as Array<{ line_kind?: unknown }> | null) ?? [];
      let rawCount = 0;
      let productCount = 0;
      for (const it of items) {
        const kind = toStr(it.line_kind);
        if (kind === 'raw_material') rawCount += 1;
        else if (kind === 'product') productCount += 1;
      }
      const summary: string[] = [];
      if (productCount > 0) summary.push(`${productCount} product line${productCount === 1 ? '' : 's'}`);
      if (rawCount > 0) summary.push(`${rawCount} material line${rawCount === 1 ? '' : 's'}`);
      const lineKindSummary = summary.length > 0 ? summary.join(' · ') : 'No lines';
      const departure = toStr(r.scheduled_departure_date);
      return {
        id: String(r.id),
        ibrNumber: toStr(r.ibr_number) ?? String(r.id),
        status: toStr(r.status) ?? '—',
        requestingBranchName: nestedName(r.req_br),
        scheduledDepartureDate: departure,
        daysUntilDeparture: diffDays(departure, now),
        lineKindSummary,
        itemCount: items.length,
      };
    });
  } catch (e) {
    logDev('IBRs to fulfil', e);
    return [];
  }
}

async function fetchMyProductionRequests(
  branchId: string | null,
  creators: string[],
): Promise<{ recent: MyPRRow[]; statusCounts: Record<string, number>; activeCount: number }> {
  if (creators.length === 0) {
    return { recent: [], statusCounts: {}, activeCount: 0 };
  }
  try {
    let q = supabase
      .from('production_requests')
      .select(
        'id, pr_number, status, request_date, expected_completion_date, created_by, production_request_items(id)',
      )
      .in('created_by', creators)
      .order('created_at', { ascending: false });
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q.limit(50);
    if (error) throw error;

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const statusCounts: Record<string, number> = {};
    let activeCount = 0;
    for (const r of rows) {
      const status = toStr(r.status) ?? 'Unknown';
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      if (ACTIVE_PR_STATUSES.includes(status)) activeCount += 1;
    }
    const recent: MyPRRow[] = rows.slice(0, 5).map((r) => ({
      id: String(r.id),
      prNumber: toStr(r.pr_number) ?? String(r.id),
      status: toStr(r.status) ?? '—',
      requestDate: toStr(r.request_date),
      expectedCompletionDate: toStr(r.expected_completion_date),
      itemCount: Array.isArray(r.production_request_items)
        ? (r.production_request_items as unknown[]).length
        : 0,
    }));
    return { recent, statusCounts, activeCount };
  } catch (e) {
    logDev('my PRs', e);
    return { recent: [], statusCounts: {}, activeCount: 0 };
  }
}

async function fetchMyPurchaseOrders(
  branchId: string | null,
  creators: string[],
): Promise<{ recent: MyPORow[]; statusCounts: Record<string, number>; activeCount: number }> {
  if (creators.length === 0) {
    return { recent: [], statusCounts: {}, activeCount: 0 };
  }
  try {
    let q = supabase
      .from('purchase_orders')
      .select(
        `id, po_number, status, order_date, expected_delivery_date, total_amount, created_by,
         suppliers(name),
         purchase_order_items(id)`,
      )
      .in('created_by', creators)
      .order('created_at', { ascending: false });
    if (branchId) q = q.eq('branch_id', branchId);

    const { data, error } = await q.limit(50);
    if (error) throw error;

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const statusCounts: Record<string, number> = {};
    let activeCount = 0;
    for (const r of rows) {
      const status = toStr(r.status) ?? 'Unknown';
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      if (ACTIVE_PO_STATUSES.includes(status)) activeCount += 1;
    }
    const recent: MyPORow[] = rows.slice(0, 5).map((r) => ({
      id: String(r.id),
      poNumber: toStr(r.po_number) ?? String(r.id),
      status: toStr(r.status) ?? '—',
      supplierName: nestedName(r.suppliers),
      orderDate: toStr(r.order_date),
      expectedDeliveryDate: toStr(r.expected_delivery_date),
      totalAmount: toNumber(r.total_amount),
      itemCount: Array.isArray(r.purchase_order_items)
        ? (r.purchase_order_items as unknown[]).length
        : 0,
    }));
    return { recent, statusCounts, activeCount };
  } catch (e) {
    logDev('my POs', e);
    return { recent: [], statusCounts: {}, activeCount: 0 };
  }
}

async function fetchRecentMovements(
  branchCode: string | null,
  scope: WarehouseAssignmentScope,
): Promise<{ recent: RecentMovementRow[]; trend: MovementTrendPoint[] }> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 7);
  const sinceIso = sinceDate.toISOString();

  try {
    const productQuery = supabase
      .from('product_stock_movements')
      .select(
        `id, variant_id, variant_sku, product_name, movement_type, quantity, reason,
         performed_by, reference_number, timestamp,
         product_variants(product_id, products(id, name))`,
      )
      .gte('timestamp', sinceIso)
      .order('timestamp', { ascending: false })
      .limit(80);

    const materialQuery = supabase
      .from('material_stock_movements')
      .select(
        `id, material_id, material_name, material_sku, movement_type, quantity, unit_of_measure,
         reason, processed_by, reference_number, movement_date, created_at,
         from_branch, to_branch`,
      )
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(80);

    const [productRes, materialRes] = await Promise.all([productQuery, materialQuery]);

    if (productRes.error) throw productRes.error;
    if (materialRes.error) throw materialRes.error;

    const productRows: RecentMovementRow[] = ((productRes.data ?? []) as Array<Record<string, unknown>>)
      .map((r) => {
        const pv = nestedAs<{ product_id?: unknown; products?: unknown }>(r.product_variants);
        const product = pv ? nestedAs<{ id?: unknown; name?: unknown }>(pv.products) : null;
        const productId = product ? toStr(product.id) : null;
        if (scope.productIds !== null) {
          if (!productId) return null;
          if (!scope.productIds.has(productId)) return null;
        }
        const reference = toStr(r.reference_number);
        return {
          id: String(r.id),
          kind: 'product' as const,
          entityId: productId,
          type: toStr(r.movement_type) ?? '—',
          itemName: toStr(product?.name) ?? toStr(r.product_name) ?? '—',
          sku: toStr(r.variant_sku),
          unit: 'pcs',
          quantity: toNumber(r.quantity),
          performedBy: toStr(r.performed_by),
          reference,
          reason: toStr(r.reason),
          timestamp: toStr(r.timestamp) ?? new Date().toISOString(),
        };
      })
      .filter((r): r is RecentMovementRow => r !== null);

    const materialRows: RecentMovementRow[] = ((materialRes.data ?? []) as Array<Record<string, unknown>>)
      .map((r) => {
        const materialId = toStr(r.material_id);
        if (scope.materialIds !== null) {
          if (!materialId) return null;
          if (!scope.materialIds.has(materialId)) return null;
        }
        const wantCode = branchCode?.toUpperCase() ?? null;
        if (wantCode) {
          const from = toStr(r.from_branch)?.toUpperCase() ?? null;
          const to = toStr(r.to_branch)?.toUpperCase() ?? null;
          // Branch column may be empty for org-wide actions — keep those rows.
          if (from && to && from !== wantCode && to !== wantCode) return null;
        }
        return {
          id: String(r.id),
          kind: 'material' as const,
          entityId: materialId,
          type: toStr(r.movement_type) ?? '—',
          itemName: toStr(r.material_name) ?? '—',
          sku: toStr(r.material_sku),
          unit: toStr(r.unit_of_measure) ?? '',
          quantity: toNumber(r.quantity),
          performedBy: toStr(r.processed_by),
          reference: toStr(r.reference_number),
          reason: toStr(r.reason),
          timestamp:
            toStr(r.created_at) ?? toStr(r.movement_date) ?? new Date().toISOString(),
        };
      })
      .filter((r): r is RecentMovementRow => r !== null);

    const combined = [...productRows, ...materialRows].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Build trend (last 7 days)
    const trend: MovementTrendPoint[] = [];
    const today = new Date();
    const dayMap = new Map<string, MovementTrendPoint>();
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = isoDate(dt);
      const pt: MovementTrendPoint = {
        dayKey: key,
        label: dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        inbound: 0,
        outbound: 0,
        net: 0,
      };
      trend.push(pt);
      dayMap.set(key, pt);
    }

    for (const m of combined) {
      const dt = new Date(m.timestamp);
      if (!Number.isFinite(dt.getTime())) continue;
      const key = isoDate(startOfDay(dt));
      const pt = dayMap.get(key);
      if (!pt) continue;
      const t = m.type;
      const isInbound = t === 'In' || t === 'Receipt' || t === 'Return';
      const isOutbound = t === 'Out' || t === 'Issue';
      if (isInbound) pt.inbound += 1;
      else if (isOutbound) pt.outbound += 1;
    }
    for (const pt of trend) pt.net = pt.inbound - pt.outbound;

    return { recent: combined.slice(0, 12), trend };
  } catch (e) {
    logDev('recent movements', e);
    return { recent: [], trend: [] };
  }
}

async function fetchBranchCode(branchId: string | null): Promise<string | null> {
  if (!branchId) return null;
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('code')
      .eq('id', branchId)
      .maybeSingle();
    if (error) throw error;
    return toStr(data?.code);
  } catch (e) {
    logDev('branch code', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// KPI builder
// ---------------------------------------------------------------------------

function buildKpis(opts: {
  scopeSummary: { productCount: number; materialCount: number };
  stockoutCount: number;
  lowStockProductCount: number;
  lowStockMaterialCount: number;
  incomingPOCount: number;
  incomingPOValue: number;
  ordersAwaitingFulfillment: number;
  ibrsToFulfill: number;
  myActivePRs: number;
  myActivePOs: number;
}): WarehouseKPI[] {
  const inventoryAlerts = opts.stockoutCount + opts.lowStockProductCount + opts.lowStockMaterialCount;

  return [
    {
      id: 'kpi-catalog',
      label: 'Catalog in scope',
      value: `${opts.scopeSummary.productCount}/${opts.scopeSummary.materialCount}`,
      subtitle: `Products · materials assigned to you`,
      status: 'neutral',
      href: '/warehouse',
    },
    {
      id: 'kpi-stockouts',
      label: 'Stockouts',
      value: opts.stockoutCount.toString(),
      subtitle: opts.stockoutCount > 0 ? 'Variants at zero stock' : 'No stockouts',
      status: opts.stockoutCount > 0 ? 'danger' : 'good',
      href: '/warehouse',
    },
    {
      id: 'kpi-low-stock',
      label: 'Low stock alerts',
      value: (opts.lowStockProductCount + opts.lowStockMaterialCount).toString(),
      subtitle: `${opts.lowStockProductCount} products · ${opts.lowStockMaterialCount} materials`,
      status: inventoryAlerts > 0 ? 'warning' : 'good',
      href: '/warehouse',
    },
    {
      id: 'kpi-incoming-po',
      label: 'Incoming POs',
      value: opts.incomingPOCount.toString(),
      subtitle:
        opts.incomingPOCount > 0
          ? `${pesos(opts.incomingPOValue)} on the way`
          : 'Nothing inbound',
      status: opts.incomingPOCount > 0 ? 'warning' : 'good',
      href: '/purchase-orders',
    },
    {
      id: 'kpi-orders-pipeline',
      label: 'Orders to fulfil',
      value: opts.ordersAwaitingFulfillment.toString(),
      subtitle: 'Approved → Ready at your branch',
      status: opts.ordersAwaitingFulfillment > 0 ? 'warning' : 'good',
      href: '/warehouse',
    },
    {
      id: 'kpi-ibrs',
      label: 'IBRs to fulfil',
      value: opts.ibrsToFulfill.toString(),
      subtitle: 'Inter-branch requests your branch ships',
      status: opts.ibrsToFulfill > 0 ? 'warning' : 'good',
      href: '/inter-branch-requests',
    },
    {
      id: 'kpi-my-prs',
      label: 'My active PRs',
      value: opts.myActivePRs.toString(),
      subtitle: 'Production requests you raised',
      status: 'neutral',
      href: '/production-requests',
    },
    {
      id: 'kpi-my-pos',
      label: 'My active POs',
      value: opts.myActivePOs.toString(),
      subtitle: 'Purchase orders you raised',
      status: 'neutral',
      href: '/purchase-orders',
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchWarehouseManagerDashboard(opts: {
  branchName: string | null;
  employeeName: string | null;
  scope: WarehouseAssignmentScope;
}): Promise<WarehouseManagerDashboardBundle> {
  const branchTrim = opts.branchName?.trim() || '';
  const branchName = branchTrim === '' ? null : branchTrim;
  const branchId = branchName ? await resolveBranchIdByName(branchName) : null;
  const branchCode = WAREHOUSE_DASHBOARD_SHOW_STOCK_MOVEMENTS
    ? await fetchBranchCode(branchId)
    : null;
  const creators = buildCreatorMatchers(opts.employeeName);

  const [
    variants,
    materials,
    incomingPOs,
    orders,
    ibrs,
    myPRs,
    myPOs,
    movements,
  ] = await Promise.all([
    fetchScopedVariants(opts.scope),
    fetchScopedMaterials(opts.scope),
    fetchIncomingPurchaseOrders(branchId),
    fetchOrdersAwaitingFulfillment(branchId),
    fetchIBRsToFulfill(branchId),
    fetchMyProductionRequests(branchId, creators),
    fetchMyPurchaseOrders(branchId, creators),
    WAREHOUSE_DASHBOARD_SHOW_STOCK_MOVEMENTS
      ? fetchRecentMovements(branchCode, opts.scope)
      : Promise.resolve({ recent: [], trend: [] }),
  ]);

  // Inventory derivation
  const stockoutRows: ProductStockoutRow[] = [];
  const lowStockProducts: ProductLowStockRow[] = [];
  let productsValue = 0;
  for (const v of variants) {
    if (v.totalStock <= 0 && v.reorderPoint > 0) {
      stockoutRows.push({
        variantId: v.variantId,
        productId: v.productId,
        categorySlug: v.categorySlug,
        productName: v.productName,
        size: v.size,
        sku: v.sku,
        totalStock: v.totalStock,
        reorderPoint: v.reorderPoint,
        lastRestocked: v.lastRestocked,
      });
    } else if (v.reorderPoint > 0 && v.totalStock <= v.reorderPoint) {
      lowStockProducts.push({
        variantId: v.variantId,
        productId: v.productId,
        categorySlug: v.categorySlug,
        productName: v.productName,
        size: v.size,
        sku: v.sku,
        totalStock: v.totalStock,
        reorderPoint: v.reorderPoint,
        safetyStock: v.safetyStock,
        lastRestocked: v.lastRestocked,
      });
    }
    // Stock value estimate uses reorder point as anchor when no cost is available
  }

  const lowStockMaterials: MaterialLowStockRow[] = [];
  let materialsValue = 0;
  for (const m of materials) {
    materialsValue += m.totalStock * m.costPerUnit;
    if (m.reorderPoint > 0 && m.totalStock <= m.reorderPoint) {
      const daily = m.monthlyConsumption / 30;
      const daysOfCover =
        daily > 0 ? Math.round(m.totalStock / daily) : m.totalStock > 0 ? null : 0;
      lowStockMaterials.push({
        materialId: m.materialId,
        name: m.name,
        sku: m.sku,
        unit: m.unit,
        totalStock: m.totalStock,
        reorderPoint: m.reorderPoint,
        safetyStock: m.safetyStock,
        monthlyConsumption: m.monthlyConsumption,
        daysOfCover,
        primarySupplier: m.primarySupplier,
      });
    }
  }
  // Approximate products value using `total_stock * (unit_price equivalent)` — we don't
  // have cost_price in the scoped variant query, so we estimate via reorder_point fallback
  // when a price isn't readily available. The number is presented as an estimate.
  productsValue = 0; // intentionally left as 0 until pricing is wired (will be filled below)

  // Fill products value with a second targeted query for unit_price / cost_price (best effort).
  try {
    const variantIds = variants.map((v) => v.variantId);
    if (variantIds.length > 0) {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, total_stock, unit_price, cost_price')
        .in('id', variantIds);
      if (!error && data) {
        for (const row of data as Array<Record<string, unknown>>) {
          const stock = toNumber(row.total_stock);
          const cost = toNumber(row.cost_price);
          const price = toNumber(row.unit_price);
          const valuationUnit = cost > 0 ? cost : price * 0.7; // fallback margin assumption
          productsValue += stock * valuationUnit;
        }
      }
    }
  } catch (e) {
    logDev('inventory value', e);
  }

  const incomingPOValue = incomingPOs.reduce((s, r) => s + r.totalAmount, 0);

  const kpis = buildKpis({
    scopeSummary: { productCount: variants.length, materialCount: materials.length },
    stockoutCount: stockoutRows.length,
    lowStockProductCount: lowStockProducts.length,
    lowStockMaterialCount: lowStockMaterials.length,
    incomingPOCount: incomingPOs.length,
    incomingPOValue,
    ordersAwaitingFulfillment: orders.length,
    ibrsToFulfill: ibrs.length,
    myActivePRs: myPRs.activeCount,
    myActivePOs: myPOs.activeCount,
  });

  return {
    branchId,
    branchName,
    scopeActive: opts.scope.productIds !== null || opts.scope.materialIds !== null,
    scopeSummary: { productCount: variants.length, materialCount: materials.length },
    generatedAt: new Date().toISOString(),
    kpis,

    criticalInventory: {
      stockouts: stockoutRows.slice(0, 5),
      lowStockProducts: lowStockProducts.slice(0, 5),
      lowStockMaterials: lowStockMaterials.slice(0, 5),
      stockoutCount: stockoutRows.length,
      lowStockProductCount: lowStockProducts.length,
      lowStockMaterialCount: lowStockMaterials.length,
    },

    incomingPurchaseOrders: incomingPOs.slice(0, 6),
    incomingPurchaseOrderCount: incomingPOs.length,
    incomingPurchaseOrderValue: incomingPOValue,

    ordersAwaitingFulfillment: orders.slice(0, 6),
    ordersAwaitingFulfillmentCount: orders.length,

    ibrsToFulfill: ibrs.slice(0, 5),
    ibrsToFulfillCount: ibrs.length,

    myProductionRequests: myPRs,
    myPurchaseOrders: myPOs,

    recentMovements: movements.recent,
    movementsTrend: movements.trend,

    inventoryValue: {
      productsValue,
      materialsValue,
      total: productsValue + materialsValue,
    },
  };
}

/** Currency helper exported for the page to reuse formatting. */
export function formatWarehousePeso(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '₱0';
  return pesos(amount);
}
