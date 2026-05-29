import { supabase } from '@/src/lib/supabase';
import { localYmd } from '@/src/lib/dispatchQueueUi';

export type WarehouseCalendarTab = 'production' | 'purchase';

export interface WarehouseCalendarEvent {
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
  ibrHasProduct?: boolean;
  ibrHasRawMaterial?: boolean;
}

function scheduleAsOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function dateKeyLocalFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return localYmd(d);
}

export function normalizeAnchorDateKey(isoOrYmd: string | null | undefined): string | null {
  if (!isoOrYmd) return null;
  const s = String(isoOrYmd).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return dateKeyLocalFromIso(s);
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

export function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const pad = first.getDay();
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function calendarKindChipClass(kind: WarehouseCalendarEvent['calendarKind']): string {
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

export function calendarKindLabel(kind: WarehouseCalendarEvent['calendarKind']): string {
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
    case 'Received':
      return 'bg-blue-100 text-blue-800 border-blue-300';
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

function ibrScheduleBadgeClass(status: string): string {
  switch (status) {
    case 'Fulfilled':
    case 'Completed':
    case 'Delivered':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Cancelled':
    case 'Rejected':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-amber-100 text-amber-900 border-amber-300';
  }
}

export function calendarEventStatusBadgeClass(ev: WarehouseCalendarEvent): string {
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

export function warehouseCalendarEventMatchesTab(
  ev: WarehouseCalendarEvent,
  tab: WarehouseCalendarTab,
): boolean {
  if (ev.recordRoute === 'production') return tab === 'production';
  if (ev.recordRoute === 'purchase') return tab === 'purchase';
  if (ev.recordRoute === 'ibr') {
    if (tab === 'production') return ev.ibrHasProduct === true;
    return ev.ibrHasRawMaterial === true;
  }
  return false;
}

export function warehouseCalendarEventHref(ev: WarehouseCalendarEvent): string {
  if (ev.recordRoute === 'production') return `/production-requests/${ev.recordId}`;
  if (ev.recordRoute === 'purchase') return `/purchase-orders/${ev.recordId}`;
  return `/inter-branch-requests/${ev.recordId}`;
}

export async function fetchWarehouseCalendarEvents(branchId: string | null): Promise<WarehouseCalendarEvent[]> {
  const [prRes, poRes, ibrRes] = await Promise.all([
    supabase
      .from('production_requests')
      .select(
        `id, pr_number, branch_id, status, request_date, expected_completion_date, created_by, created_at,
        is_transfer_request, inter_branch_request_id,
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

  const events: WarehouseCalendarEvent[] = [];

  for (const pr of (prRes.data ?? []) as Array<Record<string, unknown>>) {
    if (branchId && String(pr.branch_id ?? '') !== branchId) continue;
    const ibrFlow = isIbrFlowProductionRequest({
      inter_branch_request_id: (pr.inter_branch_request_id as string | null) ?? null,
      pr_number: String(pr.pr_number ?? ''),
    });
    const calKind = ibrFlow ? 'ibr' : 'production';
    const items = (pr.production_request_items as Array<Record<string, unknown>> | null) ?? [];
    for (const it of items) {
      const pv = scheduleAsOne(it.product_variants as Parameters<typeof scheduleAsOne>[0]);
      const prod = pv ? scheduleAsOne((pv as { products?: unknown }).products as Parameters<typeof scheduleAsOne>[0]) : null;
      const productName = (prod as { name?: string } | null)?.name ? String((prod as { name?: string }).name) : '—';
      const size = (pv as { size?: string } | null)?.size ? String((pv as { size?: string }).size) : '';
      const displayName = size ? `${productName} — ${size}` : productName;
      const qty = Number(it.quantity) || 0;
      const reqKey = normalizeAnchorDateKey(pr.request_date as string | null);
      const expKey = normalizeAnchorDateKey(pr.expected_completion_date as string | null);
      const prNumber = String(pr.pr_number ?? '—');
      const base = {
        calendarKind: calKind as WarehouseCalendarEvent['calendarKind'],
        recordRoute: 'production' as const,
        recordId: String(pr.id),
        quantity: qty,
        unit: 'pcs',
        status: String(pr.status ?? ''),
      };
      if (reqKey && expKey && reqKey === expKey) {
        events.push({
          id: `cal-pr-${pr.id}-${it.id}-both-${reqKey}`,
          ...base,
          anchorDateKey: reqKey,
          title: `${prNumber} · ${displayName}`,
          detail: 'Request / expected completion',
        });
      } else {
        if (reqKey) {
          events.push({
            id: `cal-pr-${pr.id}-${it.id}-req-${reqKey}`,
            ...base,
            anchorDateKey: reqKey,
            title: `${prNumber} · ${displayName}`,
            detail: 'Request date',
          });
        }
        if (expKey) {
          events.push({
            id: `cal-pr-${pr.id}-${it.id}-exp-${expKey}`,
            ...base,
            anchorDateKey: expKey,
            title: `${prNumber} · ${displayName}`,
            detail: 'Expected completion',
          });
        }
      }
    }
  }

  for (const po of (poRes.data ?? []) as Array<Record<string, unknown>>) {
    if (branchId && String(po.branch_id ?? '') !== branchId) continue;
    const ibrFlow = hidePoFromSchedule({
      inter_branch_request_id: (po.inter_branch_request_id as string | null) ?? null,
      po_number: String(po.po_number ?? ''),
      is_transfer_request: po.is_transfer_request === true,
    });
    const calKind = ibrFlow ? 'ibr' : 'purchase';
    const supplier =
      scheduleAsOne(po.suppliers as Parameters<typeof scheduleAsOne>[0]) as { name?: string } | null;
    const supplierName = supplier?.name?.trim() || '—';
    const items = (po.purchase_order_items as Array<Record<string, unknown>> | null) ?? [];
    for (const it of items) {
      const rm = it.raw_materials as { name?: string; unit_of_measure?: string } | null;
      const uom =
        (it.unit_of_measure && String(it.unit_of_measure).trim()) ||
        rm?.unit_of_measure ||
        'units';
      const materialName = rm?.name?.trim() || '—';
      const ordKey = normalizeAnchorDateKey(po.order_date as string | null);
      const delKey = normalizeAnchorDateKey(
        (po.expected_delivery_date as string | null) || (po.actual_delivery_date as string | null),
      );
      const qty = Number(it.quantity_ordered) || 0;
      const poNumber = String(po.po_number ?? '—');
      const base = {
        calendarKind: calKind as WarehouseCalendarEvent['calendarKind'],
        recordRoute: 'purchase' as const,
        recordId: String(po.id),
        quantity: qty,
        unit: String(uom),
        supplier: supplierName,
        status: String(po.status ?? ''),
      };
      if (ordKey && delKey && ordKey === delKey) {
        events.push({
          id: `cal-po-${po.id}-${it.id}-both-${ordKey}`,
          ...base,
          anchorDateKey: ordKey,
          title: `${poNumber} · ${materialName}`,
          detail: 'Order / delivery',
        });
      } else {
        if (ordKey) {
          events.push({
            id: `cal-po-${po.id}-${it.id}-ord-${ordKey}`,
            ...base,
            anchorDateKey: ordKey,
            title: `${poNumber} · ${materialName}`,
            detail: 'Order date',
          });
        }
        if (delKey) {
          events.push({
            id: `cal-po-${po.id}-${it.id}-del-${delKey}`,
            ...base,
            anchorDateKey: delKey,
            title: `${poNumber} · ${materialName}`,
            detail: po.actual_delivery_date ? 'Actual delivery' : 'Expected delivery',
          });
        }
      }
    }
  }

  for (const ib of (ibrRes.data ?? []) as Array<Record<string, unknown>>) {
    if (
      branchId &&
      String(ib.requesting_branch_id ?? '') !== branchId &&
      String(ib.fulfilling_branch_id ?? '') !== branchId
    ) {
      continue;
    }
    const routeLabel =
      branchId && String(ib.fulfilling_branch_id ?? '') === branchId ? 'Shipping branch' : 'Receiving branch';
    const reqBr = scheduleAsOne(ib.req_br as Parameters<typeof scheduleAsOne>[0]) as { name?: string } | null;
    const fulBr = scheduleAsOne(ib.ful_br as Parameters<typeof scheduleAsOne>[0]) as { name?: string } | null;
    const partner =
      branchId && String(ib.fulfilling_branch_id ?? '') === branchId
        ? reqBr?.name ?? 'Requesting branch'
        : fulBr?.name ?? 'Fulfilling branch';

    const lineItems = (ib.inter_branch_request_items as Array<{ line_kind?: string }> | null) ?? [];
    const ibrHasProduct = lineItems.some((i) => i.line_kind === 'product');
    const ibrHasRawMaterial = lineItems.some((i) => i.line_kind === 'raw_material');
    const ibrNumber = String(ib.ibr_number ?? '—');

    const depKey = normalizeAnchorDateKey(ib.scheduled_departure_date as string | null);
    if (depKey) {
      events.push({
        id: `cal-ibr-${ib.id}-dep-${depKey}`,
        calendarKind: 'ibr',
        anchorDateKey: depKey,
        title: `${ibrNumber} · Scheduled departure`,
        detail: `${routeLabel} · ${partner}`,
        recordRoute: 'ibr',
        recordId: String(ib.id),
        status: String(ib.status ?? ''),
        ibrHasProduct,
        ibrHasRawMaterial,
      });
    }
    const fulfilledKey = normalizeAnchorDateKey(ib.fulfilled_at as string | null);
    if (fulfilledKey) {
      events.push({
        id: `cal-ibr-${ib.id}-ful-${fulfilledKey}`,
        calendarKind: 'ibr',
        anchorDateKey: fulfilledKey,
        title: `${ibrNumber} · Fulfilled`,
        detail: partner,
        recordRoute: 'ibr',
        recordId: String(ib.id),
        status: String(ib.status ?? ''),
        ibrHasProduct,
        ibrHasRawMaterial,
      });
    }
  }

  return events;
}
