import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import { ProofOfDeliveryModal } from '@/src/components/orders/ProofOfDeliveryModal';
import { useAppContext } from '@/src/store/AppContext';
import { supabase } from '@/src/lib/supabase';
import { getPeriodRange, type PeriodKey } from '@/src/lib/agentAnalytics';
import {
  fetchDelayedTripOrderIdsForBranch,
  markOrdersDelayedForTrip,
  orderListDisplayStatus,
} from '@/src/lib/orderTripDelay';
const orderLogRoleMap: Record<string, 'Agent' | 'Warehouse Staff' | 'Manager' | 'Admin' | 'System' | 'Logistics'> = {
  Executive: 'Admin',
  Manager: 'Manager',
  Agent: 'Agent',
  'Warehouse Staff': 'Warehouse Staff',
  Warehouse: 'Warehouse Staff',
  Logistics: 'Logistics',
  Driver: 'Logistics',
};
import {
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Package,
  FileText,
  XCircle,
  Edit2,
  Camera,
  MapPin,
  Calendar,
  CalendarRange,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  X,
} from 'lucide-react';

type OrderTab = 'all' | 'draft' | 'pending' | 'approved' | 'intransit' | 'delivered' | 'rejected';

interface OrderRow {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string | null;
  /** Business ID: CUS-{BRANCH}-{NNNNNN} */
  customer_code: string | null;
  /** Tax ID or business registration from customers (optional). */
  customer_reference: string | null;
  agent_id: string | null;
  agent_name: string | null;
  /** CSV: employees.employee_id e.g. EMP-001 */
  agent_employee_id: string | null;
  branch_id: string | null;
  /** CSV: branches.code e.g. MNL */
  branch_code: string | null;
  order_date: string | null;
  required_date: string | null;
  scheduled_departure_date: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  due_date: string | null;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  payment_status: string;
  delivery_status: string | null;
  requires_approval: boolean;
  delivery_address: string | null;
  urgency: string | null;
  /** Sum of `order_line_items.discount_amount` (CSV + accurate discount peso). */
  line_items_discount_amount_total: number;
  /**
   * Effective line discount %: 100 × sum(discount_amount) / sum(line_total + discount_amount)
   * when denominator is positive (pre-discount extended subtotal per line).
   */
  line_items_discount_percent_effective: number;
}

/** Prefer aggregated line-item discount % when present (matches CSV); else header `discount_percent`. */
function resolvedOrderDiscountPercentForList(o: OrderRow): number {
  return o.line_items_discount_percent_effective > 1e-6 ? o.line_items_discount_percent_effective : o.discount_percent;
}

type OrdersPeriodKind = PeriodKey | 'all';

function pad2Local(n: number) {
  return String(n).padStart(2, '0');
}

function todayIsoLocal(): string {
  const t = new Date();
  return `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-${pad2Local(t.getDate())}`;
}

/** Period modal presets: Agent Analytics ranges + All time + Custom (same date logic). */
const ORDERS_PERIOD_OPTIONS: { kind: OrdersPeriodKind; label: string }[] = [
  { kind: 'all', label: 'All time' },
  { kind: 'day', label: '1 day' },
  { kind: 'week', label: '1 week' },
  { kind: 'month', label: '1 month' },
  { kind: 'sixMonths', label: '6 months' },
  { kind: 'ytd', label: 'YTD' },
  { kind: 'year', label: '1 year' },
  { kind: 'custom', label: 'Custom range' },
];

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Batch-load line discounts for list + export totals. */
async function fetchOrderLineDiscountAggregates(
  orderIds: string[],
): Promise<Map<string, { sumDiscountAmount: number; sumPreDiscountSubtotal: number }>> {
  const map = new Map<string, { sumDiscountAmount: number; sumPreDiscountSubtotal: number }>();
  const uniq = [...new Set(orderIds)].filter(Boolean);
  if (uniq.length === 0) return map;

  const { data, error } = await supabase
    .from('order_line_items')
    .select('order_id, discount_amount, line_total')
    .in('order_id', uniq);

  if (error || !data) return map;

  for (const row of data as { order_id: string; discount_amount?: unknown; line_total?: unknown }[]) {
    const oid = row.order_id;
    const disc = Number(row.discount_amount ?? 0);
    const lt = Number(row.line_total ?? 0);
    const d = Number.isFinite(disc) ? disc : 0;
    const lineTot = Number.isFinite(lt) ? lt : 0;
    const prev = map.get(oid) ?? { sumDiscountAmount: 0, sumPreDiscountSubtotal: 0 };
    prev.sumDiscountAmount += d;
    prev.sumPreDiscountSubtotal += lineTot + d;
    map.set(oid, prev);
  }
  return map;
}

/** Line rows for Excel “Line items” sheet (same filters as order list export). */
interface OrderLineExportRow {
  order_id: string;
  sku: string | null;
  product_name: string | null;
  variant_name: string | null;
  category_code: string | null;
  category_name: string | null;
  quantity: number;
  original_price: number | null;
  negotiated_price: number | null;
  discount_percent: number | null;
  discount_amount: number | null;
  line_total: number;
  quantity_shipped: number | null;
  quantity_delivered: number | null;
}

function categoryFromLineEmbed(raw: Record<string, unknown>): {
  category_code: string | null;
  category_name: string | null;
} {
  const pv = raw.product_variants;
  const pvRow = Array.isArray(pv) ? pv[0] : pv;
  if (!pvRow || typeof pvRow !== 'object') {
    return { category_code: null, category_name: null };
  }
  const prod = (pvRow as Record<string, unknown>).products;
  const prodRow = Array.isArray(prod) ? prod[0] : prod;
  if (!prodRow || typeof prodRow !== 'object') {
    return { category_code: null, category_name: null };
  }
  const p = prodRow as Record<string, unknown>;
  const catEmbed = p.product_categories;
  const catRow = Array.isArray(catEmbed) ? catEmbed[0] : catEmbed;
  const category_code =
    catRow && typeof catRow === 'object'
      ? String((catRow as Record<string, unknown>).category_code ?? '').trim() || null
      : null;
  const category_name =
    catRow && typeof catRow === 'object'
      ? String((catRow as Record<string, unknown>).name ?? '').trim() || null
      : null;
  return { category_code, category_name };
}

async function fetchOrderLineItemsForExport(orderIds: string[]): Promise<OrderLineExportRow[]> {
  const uniq = [...new Set(orderIds)].filter(Boolean);
  const out: OrderLineExportRow[] = [];
  const chunkSize = 150;
  for (let i = 0; i < uniq.length; i += chunkSize) {
    const chunk = uniq.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('order_line_items')
      .select(
        [
          'order_id',
          'sku',
          'product_name',
          'variant_description',
          'quantity',
          'original_price',
          'negotiated_price',
          'discount_percent',
          'discount_amount',
          'line_total',
          'quantity_shipped',
          'quantity_delivered',
          'product_variants(products(product_categories(category_code, name)))',
        ].join(','),
      )
      .in('order_id', chunk);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const { category_code, category_name } = categoryFromLineEmbed(row);
      out.push({
        order_id: String(row.order_id ?? ''),
        sku: (row.sku as string | null) ?? null,
        product_name: (row.product_name as string | null) ?? null,
        variant_name: (row.variant_description as string | null) ?? null,
        category_code,
        category_name,
        quantity: Number(row.quantity ?? 0),
        original_price: row.original_price != null ? Number(row.original_price) : null,
        negotiated_price: row.negotiated_price != null ? Number(row.negotiated_price) : null,
        discount_percent: row.discount_percent != null ? Number(row.discount_percent) : null,
        discount_amount: row.discount_amount != null ? Number(row.discount_amount) : null,
        line_total: Number(row.line_total ?? 0),
        quantity_shipped: row.quantity_shipped != null ? Number(row.quantity_shipped) : null,
        quantity_delivered: row.quantity_delivered != null ? Number(row.quantity_delivered) : null,
      });
    }
  }
  return out;
}

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

/** YYYY-MM-DD for DATE / timestamptz exports (avoids messy ISO timestamps in spreadsheets). */
function csvDateOnlyIso(v: string | null | undefined): string {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (!s) return '';
  const datePart = s.includes('T') ? s.split('T')[0]! : s.slice(0, 10);
  return datePart.length >= 10 ? datePart.slice(0, 10) : s;
}

/**
 * Order detail shows "no agent" when `agent_name` is empty. Some rows still carry a stale
 * `agent_id`; exports must not show that employee's code (e.g. AGT-MNL-001) in that case.
 */
function agentEmployeeIdWhenAssigned(
  agentId: unknown,
  agentName: unknown,
  joinedEmployeeCode: string | null | undefined,
): string | null {
  const id = agentId != null ? String(agentId).trim() : '';
  const name = typeof agentName === 'string' ? agentName.trim() : '';
  if (!id || !name) return null;
  const code = joinedEmployeeCode != null ? String(joinedEmployeeCode).trim() : '';
  return code || null;
}

function mapFetchedOrderRow(
  raw: Record<string, unknown>,
  lineDiscount: { sumDiscountAmount: number; effectiveDiscountPercent: number },
): OrderRow {
  const br = raw.branches as { code?: string } | null | undefined;
  const emp = raw.employees as { employee_id?: string } | null | undefined;
  const cust = raw.customers as { tax_id?: string | null; business_registration?: string | null; customer_code?: string | null } | null | undefined;
  const tax = typeof cust?.tax_id === 'string' ? cust.tax_id.trim() : '';
  const reg = typeof cust?.business_registration === 'string' ? cust.business_registration.trim() : '';
  const customerCode =
    typeof cust?.customer_code === 'string' && cust.customer_code.trim() !== ''
      ? cust.customer_code.trim()
      : null;

  return {
    id: String(raw.id ?? ''),
    order_number: String(raw.order_number ?? ''),
    customer_id: (raw.customer_id as string | null) ?? null,
    customer_name: (raw.customer_name as string | null) ?? null,
    customer_code: customerCode,
    customer_reference: tax || reg || null,
    agent_id: (raw.agent_id as string | null) ?? null,
    agent_name: (raw.agent_name as string | null) ?? null,
    agent_employee_id: agentEmployeeIdWhenAssigned(raw.agent_id, raw.agent_name, emp?.employee_id),
    branch_id: (raw.branch_id as string | null) ?? null,
    branch_code: br?.code ?? null,
    order_date: (raw.order_date as string | null) ?? null,
    required_date: (raw.required_date as string | null) ?? null,
    scheduled_departure_date: (raw.scheduled_departure_date as string | null) ?? null,
    estimated_delivery: (raw.estimated_delivery as string | null) ?? null,
    actual_delivery: (raw.actual_delivery as string | null) ?? null,
    due_date: (raw.due_date as string | null) ?? null,
    subtotal: Number(raw.subtotal ?? 0),
    discount_percent: Number(raw.discount_percent ?? 0),
    discount_amount: Number(raw.discount_amount ?? 0),
    total_amount: Number(raw.total_amount ?? 0),
    amount_paid: Number(raw.amount_paid ?? 0),
    balance_due: Number(raw.balance_due ?? 0),
    status: String(raw.status ?? ''),
    payment_status: String(raw.payment_status ?? ''),
    delivery_status: (raw.delivery_status as string | null) ?? null,
    requires_approval: Boolean(raw.requires_approval),
    delivery_address: (raw.delivery_address as string | null) ?? null,
    urgency: (raw.urgency as string | null) ?? null,
    line_items_discount_amount_total: roundMoney(lineDiscount.sumDiscountAmount),
    line_items_discount_percent_effective: lineDiscount.effectiveDiscountPercent,
  };
}

async function downloadOrdersWorkbook(rows: OrderRow[], lineRows: OrderLineExportRow[], branchLabel: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const orderHeaders = [
    'Order Number',
    'Customer ID',
    'Customer Name',
    'Agent ID',
    'Agent Name',
    'Branch Code',
    'Order Date',
    'Required Date',
    'Scheduled Departure Date',
    'Estimated Delivery',
    'Actual Delivery',
    'Due Date',
    'Subtotal',
    'Discount % (line items)',
    'Discount Amount (line items)',
    'Total Amount',
    'Amount Paid',
    'Balance Due',
    'Status',
    'Payment',
    'Urgency',
  ];
  const orderAoA: unknown[][] = [
    orderHeaders,
    ...rows.map((o) => [
      o.order_number,
      o.customer_code ?? o.customer_id ?? '',
      o.customer_name ?? '',
      o.agent_employee_id ?? '',
      o.agent_name ?? '',
      o.branch_code ?? '',
      csvDateOnlyIso(o.order_date),
      csvDateOnlyIso(o.required_date),
      csvDateOnlyIso(o.scheduled_departure_date),
      csvDateOnlyIso(o.estimated_delivery),
      csvDateOnlyIso(o.actual_delivery),
      csvDateOnlyIso(o.due_date),
      o.subtotal,
      o.line_items_discount_percent_effective,
      o.line_items_discount_amount_total,
      o.total_amount,
      o.amount_paid,
      o.balance_due,
      o.status ?? '',
      o.payment_status ?? '',
      o.urgency ?? '',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(orderAoA), 'Orders');

  const orderNumById = new Map(rows.map((r) => [r.id, r.order_number]));
  const customerCodeByOrderId = new Map(
    rows.map((r) => [r.id, r.customer_code ?? r.customer_id ?? '']),
  );
  const customerNameByOrderId = new Map(rows.map((r) => [r.id, r.customer_name ?? '']));
  const sortedLines = [...lineRows].sort((a, b) => {
    const na = String(orderNumById.get(a.order_id) ?? '');
    const nb = String(orderNumById.get(b.order_id) ?? '');
    const byOrder = na.localeCompare(nb, undefined, { numeric: true });
    if (byOrder !== 0) return byOrder;
    return String(a.sku ?? '').localeCompare(String(b.sku ?? ''));
  });

  const lineHeaders = [
    'Order Number',
    'Customer ID',
    'Customer Name',
    'Category Code',
    'Category Name',
    'SKU',
    'Product Name',
    'Variant Name',
    'Quantity',
    'Original Price',
    'Negotiated Price',
    'Discount %',
    'Discount Amount',
    'Line Total',
    'Qty Shipped',
    'Qty Delivered',
  ];
  const lineAoA: unknown[][] = [
    lineHeaders,
    ...sortedLines.map((li) => [
      orderNumById.get(li.order_id) ?? '',
      customerCodeByOrderId.get(li.order_id) ?? '',
      customerNameByOrderId.get(li.order_id) ?? '',
      li.category_code ?? '',
      li.category_name ?? '',
      li.sku ?? '',
      li.product_name ?? '',
      li.variant_name ?? '',
      li.quantity,
      xlsxOptionalNumber(li.original_price),
      xlsxOptionalNumber(li.negotiated_price),
      xlsxOptionalNumber(li.discount_percent),
      xlsxOptionalNumber(li.discount_amount),
      xlsxOptionalNumber(li.line_total),
      xlsxOptionalNumber(li.quantity_shipped),
      xlsxOptionalNumber(li.quantity_delivered),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lineAoA), 'Line items');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeBranch = branchLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  a.download = `orders-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function OrdersPage() {
  const navigate = useNavigate();
  const { branch, addAuditLog, role, employeeName, session } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<{ id: string; customer: string } | null>(null);
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [delayedTripOrderIds, setDelayedTripOrderIds] = useState<Set<string>>(() => new Set());
  /** UUID from `branches` for the navbar branch; export only rows matching this (avoids stale cross-branch data). */
  const [resolvedBranchIdForList, setResolvedBranchIdForList] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingOrders, setExportingOrders] = useState(false);
  /** Ignore stale responses when branch/period changes while a fetch is in flight. */
  const ordersFetchSeqRef = useRef(0);
  const [sortKey, setSortKey] = useState<string>('order_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [tablePage, setTablePage] = useState(1);
  /** '' = all values (column filter on orders table) */
  const [headerStatusFilter, setHeaderStatusFilter] = useState('');
  const [headerPaymentFilter, setHeaderPaymentFilter] = useState('');
  /** Mirrors Agent Analytics period presets (+ All time). */
  const [periodKind, setPeriodKind] = useState<OrdersPeriodKind>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [draftPeriodKind, setDraftPeriodKind] = useState<OrdersPeriodKind>('month');
  const [draftCustomStart, setDraftCustomStart] = useState('');
  const [draftCustomEnd, setDraftCustomEnd] = useState('');

  const maxCustomDate = useMemo(() => todayIsoLocal(), []);

  const ordersPeriodTriggerLabel = useMemo(() => {
    const opt = ORDERS_PERIOD_OPTIONS.find((o) => o.kind === periodKind);
    if (periodKind === 'custom') {
      if (customStart && customEnd && customStart <= customEnd) {
        return `${customStart} → ${customEnd}`;
      }
      if (customStart || customEnd) return 'Custom (invalid range)';
      return 'Custom range';
    }
    return opt?.label ?? 'Period';
  }, [periodKind, customStart, customEnd]);

  const orderQueryDates = useMemo(() => {
    if (periodKind === 'all') {
      return { from: '', to: '', invalid: false };
    }
    if (periodKind === 'custom') {
      if (customStart && customEnd && customStart > customEnd) {
        return { from: '', to: '', invalid: true };
      }
      if (customStart && customEnd && customStart <= customEnd) {
        return { from: customStart, to: customEnd, invalid: false };
      }
      const fb = getPeriodRange('month');
      return { from: fb.start, to: fb.end, invalid: false };
    }
    const r = getPeriodRange(periodKind);
    return { from: r.start, to: r.end, invalid: false };
  }, [periodKind, customStart, customEnd]);

  const dateFrom = orderQueryDates.from;
  const dateTo = orderQueryDates.to;
  const dateRangeInvalid = orderQueryDates.invalid;

  const fetchOrders = useCallback(async () => {
    const seq = ++ordersFetchSeqRef.current;
    const isStale = () => seq !== ordersFetchSeqRef.current;

    setLoading(true);
    const branchTrimmed = typeof branch === 'string' ? branch.trim() : '';
    if (!branchTrimmed) {
      if (!isStale()) {
        setAllOrders([]);
        setResolvedBranchIdForList(null);
        setLoading(false);
      }
      return;
    }

    const { data: branchData, error: branchLookupError } = await supabase
      .from('branches')
      .select('id')
      .eq('name', branchTrimmed)
      .maybeSingle();

    if (branchLookupError || !branchData?.id) {
      if (!isStale()) {
        setAllOrders([]);
        setResolvedBranchIdForList(null);
        setLoading(false);
      }
      return;
    }

    let q = supabase
      .from('orders')
      .select(
        `
          id,
          order_number,
          customer_id,
          customer_name,
          agent_id,
          agent_name,
          branch_id,
          order_date,
          required_date,
          scheduled_departure_date,
          estimated_delivery,
          actual_delivery,
          due_date,
          subtotal,
          discount_percent,
          discount_amount,
          total_amount,
          amount_paid,
          balance_due,
          status,
          payment_status,
          delivery_status,
          requires_approval,
          delivery_address,
          urgency,
          branches!branch_id(code),
          employees!agent_id(employee_id),
          customers!customer_id(customer_code, tax_id, business_registration)
        `,
      )
      .eq('branch_id', branchData.id);

    if (!dateRangeInvalid) {
      if (dateFrom) q = q.gte('order_date', dateFrom);
      if (dateTo) q = q.lte('order_date', dateTo);
    }

    const { data, error: ordersError } = await q.order('created_at', { ascending: false });

    if (ordersError) {
      console.error(ordersError);
      if (!isStale()) {
        setAllOrders([]);
        setResolvedBranchIdForList(null);
        setLoading(false);
      }
      return;
    }

    if (isStale()) return;

    const orderRows = (data ?? []) as Record<string, unknown>[];
    const ids = orderRows.map((r) => String(r.id ?? '')).filter(Boolean);
    const aggByOrder = await fetchOrderLineDiscountAggregates(ids);

    if (isStale()) return;

    const delayedIds = await fetchDelayedTripOrderIdsForBranch(branchData.id);
    if (isStale()) return;

    setDelayedTripOrderIds(delayedIds);
    setAllOrders(
      orderRows.map((raw) => {
        const id = String(raw.id ?? '');
        const agg = aggByOrder.get(id) ?? { sumDiscountAmount: 0, sumPreDiscountSubtotal: 0 };
        const effectivePct =
          agg.sumPreDiscountSubtotal > 1e-9
            ? Math.round((agg.sumDiscountAmount / agg.sumPreDiscountSubtotal) * 1_000_000) / 10000
            : 0;
        return mapFetchedOrderRow(raw, {
          sumDiscountAmount: agg.sumDiscountAmount,
          effectiveDiscountPercent: effectivePct,
        });
      }),
    );
    setResolvedBranchIdForList(branchData.id);
    setLoading(false);
  }, [branch, dateFrom, dateTo, dateRangeInvalid]);

  const handleOrdersPeriodChange = (kind: OrdersPeriodKind) => {
    setPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-${pad2Local(t.getDate())}`;
      const start = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-01`;
      setCustomStart(start);
      setCustomEnd(iso);
    }
  };

  const openOrdersPeriodModal = () => {
    setDraftPeriodKind(periodKind);
    setDraftCustomStart(customStart);
    setDraftCustomEnd(customEnd);
    setPeriodModalOpen(true);
  };

  const handleModalPresetPick = (kind: OrdersPeriodKind) => {
    if (kind !== 'custom') {
      handleOrdersPeriodChange(kind);
      setPeriodModalOpen(false);
      return;
    }
    setDraftPeriodKind('custom');
    const t = new Date();
    const iso = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-${pad2Local(t.getDate())}`;
    const start = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-01`;
    setDraftCustomStart((prev) => prev || customStart || start);
    setDraftCustomEnd((prev) => prev || customEnd || iso);
  };

  const applyModalCustomRange = () => {
    setPeriodKind('custom');
    setCustomStart(draftCustomStart);
    setCustomEnd(draftCustomEnd);
    setPeriodModalOpen(false);
  };

  const draftCustomInvalid =
    Boolean(draftCustomStart && draftCustomEnd && draftCustomStart > draftCustomEnd);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setAllOrders([]);
    setResolvedBranchIdForList(null);
    setHeaderStatusFilter('');
    setHeaderPaymentFilter('');
    setPeriodKind('month');
    setPeriodModalOpen(false);
    const t = new Date();
    const iso = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-${pad2Local(t.getDate())}`;
    const start = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-01`;
    setCustomStart(start);
    setCustomEnd(iso);
  }, [branch]);

  useEffect(() => {
    if (!periodModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPeriodModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [periodModalOpen]);

  useEffect(() => {
    setTablePage(1);
  }, [searchTerm, branch, headerStatusFilter, headerPaymentFilter, periodKind, customStart, customEnd]);

  /** Consistent list order: Approved → … → logistics pipeline (not alphabetical). */
  const orderStatusListOrder: string[] = useMemo(
    () => [
      'Draft',
      'Pending',
      'Approved',
      'Scheduled',
      'Loading',
      'Packed',
      'Ready',
      'In Transit',
      'Delayed',
      'Partially Fulfilled',
      'Delivered',
      'Completed',
      'Cancelled',
      'Rejected',
    ],
    [],
  );

  const orderDisplayStatus = useCallback(
    (o: OrderRow) => orderListDisplayStatus(o.status, o.delivery_status, delayedTripOrderIds.has(o.id)),
    [delayedTripOrderIds],
  );

  const distinctOrderStatuses = useMemo(() => {
    const s = new Set<string>();
    for (const o of allOrders) s.add(orderDisplayStatus(o));
    s.add('Delayed');
    return Array.from(s).sort((a, b) => {
      const ia = orderStatusListOrder.indexOf(a);
      const ib = orderStatusListOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [allOrders, orderStatusListOrder, orderDisplayStatus]);

  // Canonical payment-status filter options. Listed in lifecycle order so the
  // dropdown reads naturally. 'Invoiced' is intentionally excluded because the
  // invoicing flow is not in production yet.
  const distinctPaymentStatuses = useMemo(
    () => ['Unbilled', 'Partially Paid', 'On Credit', 'Paid', 'Overdue'],
    [],
  );

  const filteredOrders = allOrders.filter(order => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_name ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesHeaderStatus =
      headerStatusFilter === '' || orderDisplayStatus(order) === headerStatusFilter;
    const matchesHeaderPayment = headerPaymentFilter === '' || order.payment_status === headerPaymentFilter;

    return matchesSearch && matchesHeaderStatus && matchesHeaderPayment;
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIcon = (col: string) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-red-600" />;
  };

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'customer': av = (a.customer_name ?? '').toLowerCase(); bv = (b.customer_name ?? '').toLowerCase(); break;
        case 'agent': av = (a.agent_name ?? '').toLowerCase(); bv = (b.agent_name ?? '').toLowerCase(); break;
        case 'order_date': av = a.order_date ?? ''; bv = b.order_date ?? ''; break;
        case 'required_date': av = a.required_date ?? ''; bv = b.required_date ?? ''; break;
        case 'amount': av = a.total_amount; bv = b.total_amount; break;
        case 'status': av = orderDisplayStatus(a); bv = orderDisplayStatus(b); break;
        case 'urgency': {
          const rank = (u: string | null) => {
            const x = (u === 'Low' || u === 'Medium' || u === 'High' || u === 'Critical' ? u : 'Medium') as OrderUrgency;
            return { Low: 0, Medium: 1, High: 2, Critical: 3 }[x];
          };
          av = rank(a.urgency);
          bv = rank(b.urgency);
          break;
        }
        case 'payment': av = a.payment_status; bv = b.payment_status; break;
        default: av = a.order_date ?? ''; bv = b.order_date ?? '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return sortDir === 'asc' ? -1 : 1;
      if (as > bs) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortKey, sortDir, orderDisplayStatus]);

  const totalListPages = Math.max(1, Math.ceil(sortedOrders.length / TABLE_PAGE_SIZE) || 1);
  const pagedOrders = useMemo(() => {
    const p = Math.min(tablePage, totalListPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedOrders.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedOrders, tablePage, totalListPages]);

  useEffect(() => {
    if (tablePage > totalListPages) setTablePage(totalListPages);
  }, [tablePage, totalListPages]);

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral' | 'outline' | 'destructive' => {
    if (status === 'Delayed') return 'danger';
    if (['Delivered', 'Completed', 'Approved'].includes(status)) return 'success';
    if (['Pending', 'Scheduled', 'Loading', 'Packed', 'Ready'].includes(status)) return 'warning';
    if (['Rejected', 'Cancelled'].includes(status)) return 'danger';
    if (status === 'In Transit') return 'info';
    if (status === 'Draft') return 'neutral';
    return 'default';
  };

  const getPaymentBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral' | 'outline' | 'destructive' => {
    if (status === 'Paid') return 'success';
    if (status === 'On Credit') return 'info';
    if (status === 'Overdue') return 'danger';
    if (['Partially Paid', 'Invoiced'].includes(status)) return 'warning';
    if (status === 'Unbilled') return 'neutral';
    return 'default';
  };

  const displayUrgency = (u: string | null): OrderUrgency =>
    u === 'Low' || u === 'Medium' || u === 'High' || u === 'Critical' ? u : 'Medium';

  const getUrgencyBadgeVariant = (u: string | null): 'destructive' | 'warning' | 'info' | 'neutral' => {
    switch (displayUrgency(u)) {
      case 'Critical':
        return 'destructive';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'info';
      case 'Low':
      default:
        return 'neutral';
    }
  };

  const logOrderOpenedFromList = (orderId: string) => {
    addAuditLog('Viewed Order', 'Order', `Viewed order ${orderId}`);
  };

  /** Same pattern as production requests: create an empty shell as Draft, then edit on the detail page. */
  const handleNewOrder = async () => {
    setCreating(true);
    try {
      let branchId: string | null = null;
      if (branch) {
        const { data: bd } = await supabase.from('branches').select('id').eq('name', branch).single();
        branchId = bd?.id ?? null;
      }
      if (!branchId) {
        alert('Select a branch in the header first.');
        return;
      }
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const actor = employeeName || session?.user?.email || 'User';
      const { data, error: insErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          branch_id: branchId,
          status: 'Draft',
          order_date: new Date().toISOString().split('T')[0],
          subtotal: 0,
          total_amount: 0,
          payment_status: 'Unbilled',
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      const logRole = orderLogRoleMap[role] ?? 'System';
      const { error: logErr } = await supabase.from('order_logs').insert({
        order_id: data.id,
        action: 'created',
        performed_by: actor,
        performed_by_role: logRole,
        description: 'Created as draft — add customer and lines, then submit for approval',
        metadata: { order_number: orderNumber },
      });
      if (logErr && import.meta.env.DEV) console.warn('[order log]', logErr.message);
      addAuditLog('Created Order (draft)', 'Order', orderNumber);
      navigate(`/orders/${data.id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  const handleSendProof = (orderId: string, customer: string) => {
    setSelectedOrderForProof({ id: orderId, customer });
    setShowProofModal(true);
  };

  const handleProofSubmit = (orderId: string, imageFile: File) => {
    console.log('Proof of delivery uploaded for order:', orderId, imageFile.name);
    addAuditLog('Uploaded Proof of Delivery', 'Order', `Uploaded delivery proof for order ${orderId}`);
  };

  // Drivers use the dashboard for trips — not the orders list
  if (role === 'Driver') {
    return <Navigate to="/" replace />;
  }

  // Regular view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create, track, and manage customer orders</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="primary"
            className="gap-2 w-full sm:w-auto"
            onClick={() => void handleNewOrder()}
            disabled={creating}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New order
          </Button>
        </div>
      </div>

      {/* Tabs - Mobile Dropdown */}
      {/* Tabs - Desktop */}

      <Card>
        <CardHeader>
          <div className="flex flex-nowrap items-center gap-3 w-full min-w-0 overflow-x-auto">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer or order #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-w-0 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
            <select
              aria-label="Filter by status"
              value={headerStatusFilter}
              onChange={(e) => setHeaderStatusFilter(e.target.value)}
              className="text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none shrink-0 min-w-[10.5rem]"
            >
              <option value="">All Statuses</option>
              {distinctOrderStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by payment"
              value={headerPaymentFilter}
              onChange={(e) => setHeaderPaymentFilter(e.target.value)}
              className="text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none shrink-0 min-w-[10.5rem]"
            >
              <option value="">All Payments</option>
              {distinctPaymentStatuses.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              className="gap-2 shrink-0 border-gray-300 bg-white max-w-[18rem]"
              aria-haspopup="dialog"
              aria-expanded={periodModalOpen}
              aria-label="Choose order period"
              onClick={openOrdersPeriodModal}
            >
              <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
              <span className="truncate text-left text-sm font-normal">{ordersPeriodTriggerLabel}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 shrink-0 border-gray-300 bg-white sm:ml-auto"
              disabled={sortedOrders.length === 0 || exportingOrders || loading || resolvedBranchIdForList == null}
              onClick={async () => {
                if (
                  sortedOrders.length === 0 ||
                  exportingOrders ||
                  loading ||
                  resolvedBranchIdForList == null
                ) {
                  return;
                }
                const ordersForExport = sortedOrders.filter((o) => o.branch_id === resolvedBranchIdForList);
                if (ordersForExport.length === 0) {
                  window.alert('No orders match the selected branch. Refresh the list and try again.');
                  return;
                }
                setExportingOrders(true);
                try {
                  const ids = ordersForExport.map((o) => o.id);
                  const lines = await fetchOrderLineItemsForExport(ids);
                  await downloadOrdersWorkbook(ordersForExport, lines, branch ?? 'orders');
                  addAuditLog(
                    'Exported orders Excel',
                    'Order',
                    `${ordersForExport.length} orders, ${lines.length} line items (${branch ?? 'branch'})`,
                  );
                } catch (e) {
                  console.error(e);
                  window.alert(e instanceof Error ? e.message : 'Export failed.');
                } finally {
                  setExportingOrders(false);
                }
              }}
            >
              {exportingOrders ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Download className="w-4 h-4" aria-hidden />
              )}
              {exportingOrders ? 'Exporting…' : 'Export'}
            </Button>
          </div>
          {dateRangeInvalid && (
            <p className="text-xs text-red-600 mt-2">
              Start date must be on or before end date. Date filters were ignored for this load.
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" /><span>Loading orders...</span>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {pagedOrders.map((order) => (
                  <div key={order.id} className="relative hover:bg-gray-50 transition-colors focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-red-500">
                    <Link
                      to={`/orders/${order.id}`}
                      onClick={() => logOrderOpenedFromList(order.id)}
                      className="absolute inset-0 z-0 outline-none"
                      aria-label={`Open order ${order.order_number}`}
                    />
                    <div className="relative z-10 space-y-3 p-4 pointer-events-none">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div className="min-w-0 flex-1">
                            {order.customer_id ? (
                              <Link
                                to={`/customers/${order.customer_id}`}
                                className="font-medium text-blue-700 hover:text-blue-900 hover:underline truncate block text-left pointer-events-auto"
                                rel="noopener noreferrer"
                              >
                                {order.customer_name ?? '—'}
                              </Link>
                            ) : (
                              <div className="font-semibold text-gray-900 truncate">{order.customer_name ?? '—'}</div>
                            )}
                            <div className="text-xs text-gray-600 truncate tabular-nums">{order.order_number}</div>
                          </div>
                          {order.requires_approval && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant={getStatusBadgeVariant(orderDisplayStatus(order))} className="text-xs">{orderDisplayStatus(order)}</Badge>
                          <Badge variant={getUrgencyBadgeVariant(order.urgency)} className="text-xs">
                            {displayUrgency(order.urgency)}
                          </Badge>
                        </div>
                      </div>
                      <div className="min-w-0 -mt-1">
                        <div className="text-xs text-gray-500 truncate">{order.agent_name}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><div className="text-xs text-gray-500">Order Date</div><div className="text-gray-900 truncate">{order.order_date ?? '—'}</div></div>
                        <div><div className="text-xs text-gray-500">Required Date</div><div className="text-gray-900 truncate">{order.required_date ?? '—'}</div></div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                        <div>
                          <div className="font-semibold text-gray-900">₱{order.total_amount.toLocaleString()}</div>
                          {resolvedOrderDiscountPercentForList(order) > 0 && (
                            <div className="text-xs text-gray-500">
                              -{resolvedOrderDiscountPercentForList(order).toFixed(1)}% discount
                            </div>
                          )}
                        </div>
                        <Badge variant={getPaymentBadgeVariant(order.payment_status)} className="text-xs flex-shrink-0">{order.payment_status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {sortedOrders.length === 0 && (
                  <div className="px-4 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="font-medium">No orders found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or create a new order</p>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th onClick={() => handleSort('customer')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Customer{sortIcon('customer')}</span>
                      </th>
                      <th onClick={() => handleSort('order_date')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Order Date{sortIcon('order_date')}</span>
                      </th>
                      <th onClick={() => handleSort('required_date')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Required Date{sortIcon('required_date')}</span>
                      </th>
                      <th onClick={() => handleSort('amount')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Amount{sortIcon('amount')}</span>
                      </th>
                      <th className="px-3 py-3 text-left font-medium align-top min-w-[10.5rem] max-w-[14rem]">
                        <div className="normal-case">
                          <select
                            aria-label="Filter by status"
                            value={headerStatusFilter}
                            onChange={(e) => setHeaderStatusFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="">Status</option>
                            {distinctOrderStatuses.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </th>
                      <th onClick={() => handleSort('urgency')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900 normal-case">
                        <span className="flex items-center">Urgency{sortIcon('urgency')}</span>
                      </th>
                      <th className="px-3 py-3 text-left font-medium align-top min-w-[9.5rem] max-w-[13rem]">
                        <div className="normal-case">
                          <select
                            aria-label="Filter by payment"
                            value={headerPaymentFilter}
                            onChange={(e) => setHeaderPaymentFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="">Payment</option>
                            {distinctPaymentStatuses.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pagedOrders.map((order) => {
                      const orderHref = `/orders/${order.id}`;
                      const logOpen = () => logOrderOpenedFromList(order.id);
                      const rowOverlay = (opts: { primary?: boolean }) => (
                        <Link
                          to={orderHref}
                          onClick={logOpen}
                          tabIndex={opts.primary ? undefined : -1}
                          aria-hidden={opts.primary ? undefined : true}
                          aria-label={opts.primary ? `Open order ${order.order_number}` : undefined}
                          className="absolute inset-0 z-0 outline-none"
                        />
                      );
                      return (
                      <tr
                        key={order.id}
                        className="group hover:bg-gray-50 transition-colors focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-red-500"
                      >
                        <td className="relative px-6 py-4 align-top">
                          {rowOverlay({ primary: true })}
                          <div className="relative z-10 flex items-start gap-2 w-full pointer-events-none">
                            <div className="min-w-0">
                              {order.customer_id ? (
                                <Link
                                  to={`/customers/${order.customer_id}`}
                                  className="font-medium text-blue-700 hover:text-blue-900 hover:underline block text-left pointer-events-auto"
                                  rel="noopener noreferrer"
                                >
                                  {order.customer_name ?? '—'}
                                </Link>
                              ) : (
                                <div className="font-medium text-gray-900">{order.customer_name ?? '—'}</div>
                              )}
                              <div className="text-xs text-gray-600 tabular-nums">{order.order_number}</div>
                              <div className="text-xs text-gray-500">{order.agent_name}</div>
                            </div>
                            {order.requires_approval && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                          </div>
                        </td>
                        <td className="relative px-6 py-4 align-top text-gray-600">
                          {rowOverlay({})}
                          <span className="relative z-10 pointer-events-none">{order.order_date ?? '—'}</span>
                        </td>
                        <td className="relative px-6 py-4 align-top text-gray-600">
                          {rowOverlay({})}
                          <span className="relative z-10 pointer-events-none">{order.required_date ?? '—'}</span>
                        </td>
                        <td className="relative px-6 py-4 align-top">
                          {rowOverlay({})}
                          <div className="relative z-10 pointer-events-none">
                            <div className="font-medium text-gray-900">₱{order.total_amount.toLocaleString()}</div>
                            {resolvedOrderDiscountPercentForList(order) > 0 && (
                              <div className="text-xs text-gray-500">
                                -{resolvedOrderDiscountPercentForList(order).toFixed(1)}% discount
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="relative px-6 py-4 align-top">
                          {rowOverlay({})}
                          <span className="relative z-10 inline-flex pointer-events-none">
                            <Badge variant={getStatusBadgeVariant(orderDisplayStatus(order))} className="min-w-[120px] justify-center">{orderDisplayStatus(order)}</Badge>
                          </span>
                        </td>
                        <td className="relative px-6 py-4 align-top">
                          {rowOverlay({})}
                          <span className="relative z-10 inline-flex pointer-events-none">
                            <Badge variant={getUrgencyBadgeVariant(order.urgency)} className="min-w-[100px] justify-center">
                              {displayUrgency(order.urgency)}
                            </Badge>
                          </span>
                        </td>
                        <td className="relative px-6 py-4 align-top">
                          {rowOverlay({})}
                          <span className="relative z-10 inline-flex pointer-events-none">
                            <Badge variant={getPaymentBadgeVariant(order.payment_status)} className="min-w-[100px] justify-center">{order.payment_status}</Badge>
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                    {sortedOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="font-medium">No orders found</p>
                          <p className="text-sm mt-1">Try adjusting your filters or create a new order</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {sortedOrders.length > 0 && (
                <TablePagination page={tablePage} total={sortedOrders.length} onPageChange={setTablePage} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PortalModalOverlay open={periodModalOpen} onClose={() => setPeriodModalOpen(false)}>
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="orders-period-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="orders-period-modal-title" className="text-lg font-semibold text-gray-900">
                Order period
              </h2>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
                onClick={() => setPeriodModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">Choose a preset or set a custom date range.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ORDERS_PERIOD_OPTIONS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleModalPresetPick(kind)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      draftPeriodKind === kind
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draftPeriodKind === 'custom' && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                    <input
                      type="date"
                      value={draftCustomStart}
                      max={maxCustomDate}
                      onChange={(e) => setDraftCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftCustomEnd}
                      min={draftCustomStart || undefined}
                      max={maxCustomDate}
                      onChange={(e) => setDraftCustomEnd(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {draftCustomInvalid && (
                    <p className="text-xs text-red-600">
                      Start must be on or before end. You can still apply—orders will load without a date filter until fixed.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <Button type="button" variant="outline" className="border-gray-300 bg-white" onClick={() => setPeriodModalOpen(false)}>
                Cancel
              </Button>
              {draftPeriodKind === 'custom' && (
                <Button type="button" variant="primary" onClick={applyModalCustomRange}>
                  Apply range
                </Button>
              )}
            </div>
          </div>
      </PortalModalOverlay>

      {showProofModal && selectedOrderForProof && (
        <ProofOfDeliveryModal orderId={selectedOrderForProof.id} customerName={selectedOrderForProof.customer}
          onClose={() => { setShowProofModal(false); setSelectedOrderForProof(null); }}
          onSubmit={handleProofSubmit} />
      )}
    </div>
  );
}
