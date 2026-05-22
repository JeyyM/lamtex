import { supabase } from './supabase';
import { csvDateOnlyIso, inDatePeriodRange } from './datePeriodQuery';

function embedOne<T extends Record<string, unknown>>(v: unknown): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? null;
  if (typeof v === 'object') return v as T;
  return null;
}

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

export function inPurchaseOrderDateRange(
  orderDate: string | null | undefined,
  dateFrom: string,
  dateTo: string,
): boolean {
  return inDatePeriodRange(orderDate, dateFrom, dateTo);
}

export interface PurchaseOrderHeaderExportRow {
  po_number: string;
  order_date: string;
  supplier: string;
  branch: string;
  line_count: number;
  total_amount: number;
  currency: string;
  expected_delivery_date: string;
  actual_delivery_date: string;
  status: string;
  payment_status: string;
  created_by: string;
}

export interface PurchaseOrderLineExportRow {
  po_number: string;
  order_date: string;
  supplier: string;
  status: string;
  material_sku: string;
  material_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  unit: string;
  line_total: number;
}

export async function fetchPurchaseOrderLinesForExport(
  orderIds: string[],
): Promise<PurchaseOrderLineExportRow[]> {
  if (orderIds.length === 0) return [];

  const { data, error } = await supabase
    .from('purchase_order_items')
    .select(
      'quantity_ordered, quantity_received, unit_price, unit_of_measure, raw_materials(sku, name), purchase_orders!inner(po_number, status, order_date, payment_status, suppliers(name))',
    )
    .in('order_id', orderIds);

  if (error) throw new Error(error.message);

  const rows: PurchaseOrderLineExportRow[] = [];
  for (const row of data ?? []) {
    const po = embedOne<{
      po_number?: string;
      status?: string;
      order_date?: string;
      payment_status?: string;
      suppliers?: unknown;
    }>(row.purchase_orders);
    if (!po) continue;
    const sup = embedOne<{ name?: string }>(po.suppliers);
    const mat = embedOne<{ sku?: string; name?: string }>(row.raw_materials);
    const qtyOrdered = Number(row.quantity_ordered) || 0;
    const unitPrice = Number(row.unit_price) || 0;
    rows.push({
      po_number: String(po.po_number ?? ''),
      order_date: csvDateOnlyIso(po.order_date),
      supplier: sup?.name ? String(sup.name) : '',
      status: String(po.status ?? ''),
      material_sku: mat?.sku ? String(mat.sku) : '',
      material_name: mat?.name ? String(mat.name) : '',
      quantity_ordered: qtyOrdered,
      quantity_received: Number(row.quantity_received) || 0,
      unit_price: unitPrice,
      unit: row.unit_of_measure ? String(row.unit_of_measure) : '',
      line_total: qtyOrdered * unitPrice,
    });
  }

  rows.sort((a, b) => {
    const byDate = b.order_date.localeCompare(a.order_date);
    if (byDate !== 0) return byDate;
    const byPo = a.po_number.localeCompare(b.po_number, undefined, { numeric: true });
    if (byPo !== 0) return byPo;
    return a.material_sku.localeCompare(b.material_sku);
  });

  return rows;
}

export async function downloadPurchaseOrdersWorkbook(
  branchLabel: string,
  headers: PurchaseOrderHeaderExportRow[],
  lines: PurchaseOrderLineExportRow[],
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'PO Number',
        'Order Date',
        'Supplier',
        'Branch',
        'Lines',
        'Total Amount',
        'Currency',
        'Expected Delivery',
        'Actual Delivery',
        'Status',
        'Payment Status',
        'Created By',
      ],
      ...headers.map((r) => [
        r.po_number,
        r.order_date,
        r.supplier,
        r.branch,
        xlsxOptionalNumber(r.line_count),
        xlsxOptionalNumber(r.total_amount),
        r.currency,
        r.expected_delivery_date,
        r.actual_delivery_date,
        r.status,
        r.payment_status,
        r.created_by,
      ]),
    ]),
    'Purchase Orders',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'PO Number',
        'Order Date',
        'Supplier',
        'Status',
        'Material SKU',
        'Material Name',
        'Qty Ordered',
        'Qty Received',
        'Unit Price',
        'Unit',
        'Line Total',
      ],
      ...lines.map((r) => [
        r.po_number,
        r.order_date,
        r.supplier,
        r.status,
        r.material_sku,
        r.material_name,
        xlsxOptionalNumber(r.quantity_ordered),
        xlsxOptionalNumber(r.quantity_received),
        xlsxOptionalNumber(r.unit_price),
        r.unit,
        xlsxOptionalNumber(r.line_total),
      ]),
    ]),
    'Lines',
  );

  const safeBranch = branchLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `purchase-orders-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
