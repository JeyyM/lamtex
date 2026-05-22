import { supabase } from './supabase';
import { csvDateOnlyIso, inDatePeriodRange } from './datePeriodQuery';
import {
  fetchSuppliersExportBundle,
  type SupplierExportRow,
  type SupplierMaterialExportRow,
} from './suppliersExport';
import {
  fetchPurchaseOrderLinesForExport,
  type PurchaseOrderHeaderExportRow,
  type PurchaseOrderLineExportRow,
} from './purchaseOrdersExport';

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

function hideSupplierPOFromHistory(po: {
  inter_branch_request_id: string | null;
  is_transfer_request: boolean;
  po_number: string;
}): boolean {
  return (
    po.inter_branch_request_id != null ||
    po.po_number.startsWith('PO-IBR-') ||
    po.is_transfer_request === true
  );
}

function supplierProfileRows(s: SupplierExportRow): [string, string | number][] {
  return [
    ['Supplier Name', s.name],
    ['Type', s.type],
    ['Category', s.category],
    ['Status', s.status],
    ['Risk Level', s.risk_level],
    ['Preferred Supplier', s.preferred_supplier],
    ['Contact Person', s.contact_person],
    ['Phone', s.phone],
    ['Email', s.email],
    ['Payment Terms', s.payment_terms],
    ['Currency', s.currency],
    ['Address', s.address],
    ['City', s.city],
    ['Province', s.province],
    ['Postal Code', s.postal_code],
    ['Branches', s.branches],
    ['Performance Score', s.performance_score],
    ['Quality Rating', s.quality_rating],
    ['Delivery Rating', s.delivery_rating],
    ['Avg Lead Time (days)', s.avg_lead_time],
    ['On-Time Delivery %', s.on_time_delivery_rate],
    ['Defect Rate %', s.defect_rate],
    ['YTD Purchases', s.total_purchases_ytd],
    ['Lifetime Purchases', s.total_purchases_lifetime],
    ['Order Count', s.order_count],
    ['Avg Order Value', s.avg_order_value],
    ['Last Purchase Date', s.last_purchase_date],
    ['Account Since', s.account_since],
    ['Notes', s.notes],
  ];
}

export async function fetchSupplierExportProfile(
  supplierId: string,
): Promise<{ supplier: SupplierExportRow; materials: SupplierMaterialExportRow[] } | null> {
  const bundle = await fetchSuppliersExportBundle([supplierId]);
  const supplier = bundle.suppliers[0];
  if (!supplier) return null;
  return { supplier, materials: bundle.materials };
}

export async function fetchSupplierPurchaseOrdersForExport(
  supplierId: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ headers: PurchaseOrderHeaderExportRow[]; orderIds: string[] }> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      status,
      order_date,
      expected_delivery_date,
      actual_delivery_date,
      total_amount,
      currency,
      payment_status,
      created_by,
      inter_branch_request_id,
      is_transfer_request,
      branches:branches!branch_id(name),
      suppliers(name),
      purchase_order_items ( id )
    `)
    .eq('supplier_id', supplierId)
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const headers: PurchaseOrderHeaderExportRow[] = [];
  const orderIds: string[] = [];

  for (const row of data ?? []) {
    const po = row as {
      id: string;
      po_number: string;
      status: string;
      order_date: string;
      expected_delivery_date: string | null;
      actual_delivery_date: string | null;
      total_amount: number;
      currency: string;
      payment_status: string | null;
      created_by: string | null;
      inter_branch_request_id: string | null;
      is_transfer_request: boolean;
      branches: { name: string } | { name: string }[] | null;
      suppliers: { name: string } | { name: string }[] | null;
      purchase_order_items: Array<{ id: string }>;
    };

    if (hideSupplierPOFromHistory(po)) continue;
    if (!inDatePeriodRange(po.order_date, dateFrom, dateTo)) continue;

    orderIds.push(po.id);
    const branch = Array.isArray(po.branches) ? po.branches[0] : po.branches;
    const supplier = Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers;

    headers.push({
      po_number: po.po_number,
      order_date: csvDateOnlyIso(po.order_date),
      supplier: supplier?.name ?? '',
      branch: branch?.name ?? '',
      line_count: po.purchase_order_items?.length ?? 0,
      total_amount: Number(po.total_amount) || 0,
      currency: po.currency ?? '',
      expected_delivery_date: csvDateOnlyIso(po.expected_delivery_date),
      actual_delivery_date: csvDateOnlyIso(po.actual_delivery_date),
      status: po.status,
      payment_status: po.payment_status ?? '',
      created_by: po.created_by ?? '',
    });
  }

  return { headers, orderIds };
}

export async function downloadSupplierDetailWorkbook(params: {
  supplier: SupplierExportRow;
  materials: SupplierMaterialExportRow[];
  purchaseOrders: PurchaseOrderHeaderExportRow[];
  lines: PurchaseOrderLineExportRow[];
  periodLabel: string;
}) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Field', 'Value'],
      ['Export Period (POs)', params.periodLabel],
      ...supplierProfileRows(params.supplier),
    ]),
    'Supplier',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Material SKU',
        'Material Name',
        'Unit',
        'Unit Price',
        'Lead Time (days)',
        'Min Order Qty',
        'Preferred',
        'Material Status',
        'Notes',
      ],
      ...params.materials.map((r) => [
        r.material_sku,
        r.material_name,
        r.unit,
        r.unit_price,
        r.lead_time_days,
        r.min_order_qty,
        r.is_preferred,
        r.material_status,
        r.notes,
      ]),
    ]),
    'Materials',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'PO Number',
        'Order Date',
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
      ...params.purchaseOrders.map((r) => [
        r.po_number,
        r.order_date,
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
        'Status',
        'Material SKU',
        'Material Name',
        'Qty Ordered',
        'Qty Received',
        'Unit Price',
        'Unit',
        'Line Total',
      ],
      ...params.lines.map((r) => [
        r.po_number,
        r.order_date,
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
    'PO Lines',
  );

  const safeName = params.supplier.name.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `supplier-${safeName || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function buildSupplierDetailExportBundle(
  supplierId: string,
  dateFrom: string,
  dateTo: string,
) {
  const profile = await fetchSupplierExportProfile(supplierId);
  if (!profile) throw new Error('Could not load supplier profile for export.');

  const { headers, orderIds } = await fetchSupplierPurchaseOrdersForExport(
    supplierId,
    dateFrom,
    dateTo,
  );
  const lines = await fetchPurchaseOrderLinesForExport(orderIds);

  return {
    ...profile,
    purchaseOrders: headers,
    lines,
  };
}
