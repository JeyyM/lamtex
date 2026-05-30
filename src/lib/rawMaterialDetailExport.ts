import { supabase } from './supabase';

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

function csvDateOnlyIso(v: string | null | undefined): string {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (!s) return '';
  const datePart = s.includes('T') ? s.split('T')[0]! : s.slice(0, 10);
  return datePart.length >= 10 ? datePart.slice(0, 10) : s;
}

function inDateRange(dateStr: string | null | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  const d = csvDateOnlyIso(dateStr);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export interface MaterialDetailExportData {
  materialName: string;
  sku: string;
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  materialRows: [string, string | number][];
  suppliers: {
    name: string;
    unitPrice: number;
    leadTimeDays: number;
    minOrderQty: number;
    preferred: string;
    paymentTerms: string;
    status: string;
  }[];
  linkedProducts: {
    productName: string;
    variantSku: string;
    variantSize: string;
    quantityNeeded: number;
    unit: string;
  }[];
  purchaseOrders: {
    poNumber: string;
    supplier: string;
    status: string;
    orderDate: string;
    expectedDelivery: string;
    actualDelivery: string;
    qtyOrdered: number;
    qtyReceived: number;
    unitPrice: number;
    unit: string;
    lineTotal: number;
  }[];
  consumption: {
    date: string;
    quantity: number;
    unit: string;
    productName: string;
    branch: string;
    costPerUnit: number;
    totalCost: number;
    issuedBy: string;
    remarks: string;
  }[];
  priceHistory: {
    month: string;
    monthLabel: string;
    unitPrice: number;
    source: string;
  }[];
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
}

function enumerateMonthKeys(startYm: string, endYm: string): string[] {
  const [sy, sm] = startYm.split('-').map(Number);
  const [ey, em] = endYm.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const keys: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}

function buildPriceHistory(
  poItems: { orderDate: string; unitPrice: number }[],
  logs: Array<{ action: string; created_at: string; new_value: unknown }>,
  dateFrom: string,
  dateTo: string,
): MaterialDetailExportData['priceHistory'] {
  const pAgg = new Map<string, { sum: number; n: number }>();
  for (const row of poItems) {
    if (!row.orderDate) continue;
    const key = row.orderDate.slice(0, 7);
    const up = row.unitPrice;
    if (up <= 0) continue;
    const cur = pAgg.get(key) || { sum: 0, n: 0 };
    cur.sum += up;
    cur.n += 1;
    pAgg.set(key, cur);
  }

  const logPriceByMonth = new Map<string, number>();
  const logsChrono = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  for (const log of logsChrono) {
    if (log.action !== 'material_updated' && log.action !== 'cost_synced_from_po') continue;
    const nv = log.new_value;
    if (nv == null || typeof nv !== 'object' || Array.isArray(nv)) continue;
    const cpu = Number((nv as Record<string, unknown>).cost_per_unit);
    if (!Number.isFinite(cpu) || cpu <= 0) continue;
    const key = log.created_at.slice(0, 7);
    logPriceByMonth.set(key, Math.round(cpu * 100) / 100);
  }

  let monthKeys: string[];
  if (dateFrom || dateTo) {
    const startYm = (dateFrom || dateTo).slice(0, 7);
    const endYm = (dateTo || dateFrom).slice(0, 7);
    monthKeys = enumerateMonthKeys(startYm, endYm);
  } else {
    const allKeys = new Set([...pAgg.keys(), ...logPriceByMonth.keys()]);
    if (allKeys.size === 0) return [];
    const sorted = [...allKeys].sort();
    const now = new Date();
    const endYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthKeys = enumerateMonthKeys(sorted[0]!, endYm);
  }

  const rows: MaterialDetailExportData['priceHistory'] = [];
  for (const key of monthKeys) {
    const ag = pAgg.get(key);
    const logP = logPriceByMonth.get(key);
    let price: number | null = null;
    let source = '';
    if (ag && ag.n > 0) {
      price = Math.round((ag.sum / ag.n) * 100) / 100;
      source = 'PO Average';
    } else if (logP != null) {
      price = logP;
      source = 'Catalog Cost';
    }
    if (price == null) continue;
    rows.push({
      month: key,
      monthLabel: formatMonthLabel(key),
      unitPrice: price,
      source,
    });
  }
  return rows;
}

export async function fetchMaterialDetailForExport(
  materialId: string,
  periodLabel: string,
  dateFrom: string,
  dateTo: string,
): Promise<MaterialDetailExportData> {
  const { data: matData, error: matErr } = await supabase
    .from('raw_materials')
    .select(`
      id, name, sku, brand, description, unit_of_measure, total_stock, reorder_point,
      safety_stock, cost_per_unit, monthly_consumption, status, created_at,
      material_categories ( name )
    `)
    .eq('id', materialId)
    .single();

  if (matErr || !matData) throw new Error('Material not found');

  const cat = embedOne<{ name?: string }>(matData.material_categories);
  const categoryName = cat?.name ? String(cat.name) : '';
  const materialName = String(matData.name ?? '');
  const sku = String(matData.sku ?? '');
  const totalStock = Number(matData.total_stock) || 0;
  const costPerUnit = Number(matData.cost_per_unit) || 0;
  const monthlyConsumption = Number(matData.monthly_consumption) || 0;

  const materialRows: [string, string | number][] = [
    ['Name', materialName],
    ['SKU', sku],
    ['Category', categoryName],
    ['Brand', matData.brand ? String(matData.brand) : ''],
    ['Description', matData.description ? String(matData.description) : ''],
    ['Unit', String(matData.unit_of_measure ?? 'kg')],
    ['Total Stock', totalStock],
    ['Reorder Point', Number(matData.reorder_point) || 0],
    ['Safety Stock', Number(matData.safety_stock) || 0],
    ['Cost/Unit', costPerUnit],
    ['Inventory Value', totalStock * costPerUnit],
    ['Monthly Consumption', monthlyConsumption],
    ['Status', String(matData.status ?? '')],
    ['Created', csvDateOnlyIso(matData.created_at as string | null)],
  ];

  const [pvrRes, smRes, poRes, logRes, consRes] = await Promise.all([
    supabase
      .from('product_variant_raw_materials')
      .select(
        'quantity_needed, unit_of_measure, product_variants!inner ( sku, size, products!inner ( name ) )',
      )
      .eq('raw_material_id', materialId),
    supabase
      .from('supplier_materials')
      .select(
        'unit_price, lead_time_days, min_order_qty, is_preferred, suppliers!inner ( name, payment_terms, status )',
      )
      .eq('material_id', materialId)
      .order('is_preferred', { ascending: false })
      .order('unit_price', { ascending: true }),
    supabase
      .from('purchase_order_items')
      .select(`
        quantity_ordered, quantity_received, unit_price, unit_of_measure,
        purchase_orders ( po_number, status, order_date, expected_delivery_date, actual_delivery_date, suppliers ( name ) )
      `)
      .eq('material_id', materialId),
    (() => {
      let q = supabase
        .from('raw_material_logs')
        .select('action, new_value, created_at')
        .eq('raw_material_id', materialId)
        .order('created_at', { ascending: true });
      if (dateFrom) q = q.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) q = q.lte('created_at', `${dateTo}T23:59:59.999`);
      return q;
    })(),
    (() => {
      let q = supabase
        .from('material_consumption')
        .select(
          'consumption_date, quantity_consumed, unit_of_measure, product_name, branch, cost_per_unit, total_cost, issued_by, remarks',
        )
        .eq('material_id', materialId)
        .order('consumption_date', { ascending: false });
      if (dateFrom) q = q.gte('consumption_date', dateFrom);
      if (dateTo) q = q.lte('consumption_date', dateTo);
      return q;
    })(),
  ]);

  if (pvrRes.error) throw new Error(pvrRes.error.message);
  if (smRes.error) throw new Error(smRes.error.message);
  if (poRes.error) throw new Error(poRes.error.message);
  if (logRes.error) throw new Error(logRes.error.message);
  if (consRes.error) throw new Error(consRes.error.message);

  const poPriceInputs: { orderDate: string; unitPrice: number }[] = [];

  const linkedProducts: MaterialDetailExportData['linkedProducts'] = (pvrRes.data ?? []).map((row) => {
    const pv = embedOne<{ sku?: string; size?: string; products?: unknown }>(row.product_variants);
    const prod = embedOne<{ name?: string }>(pv?.products);
    return {
      productName: prod?.name ? String(prod.name) : '—',
      variantSku: pv?.sku ? String(pv.sku) : '',
      variantSize: pv?.size ? String(pv.size) : '',
      quantityNeeded: Number(row.quantity_needed) || 0,
      unit: row.unit_of_measure ? String(row.unit_of_measure) : String(matData.unit_of_measure ?? 'kg'),
    };
  });
  linkedProducts.sort((a, b) => a.productName.localeCompare(b.productName));

  const suppliers: MaterialDetailExportData['suppliers'] = (smRes.data ?? []).map((row) => {
    const s = embedOne<{ name?: string; payment_terms?: string; status?: string }>(row.suppliers);
    return {
      name: s?.name ? String(s.name) : '—',
      unitPrice: Number(row.unit_price) || 0,
      leadTimeDays: Number(row.lead_time_days) || 0,
      minOrderQty: Number(row.min_order_qty) || 0,
      preferred: row.is_preferred ? 'Yes' : 'No',
      paymentTerms: s?.payment_terms ? String(s.payment_terms) : '',
      status: s?.status ? String(s.status) : '',
    };
  });

  const purchaseOrders: MaterialDetailExportData['purchaseOrders'] = [];
  for (const row of poRes.data ?? []) {
    const po = embedOne<{
      po_number?: string;
      status?: string;
      order_date?: string;
      expected_delivery_date?: string | null;
      actual_delivery_date?: string | null;
      suppliers?: unknown;
    }>(row.purchase_orders);
    if (!po) continue;
    const orderDate = csvDateOnlyIso(po.order_date);
    const unitPrice = Number(row.unit_price) || 0;
    if (inDateRange(orderDate, dateFrom, dateTo) && unitPrice > 0) {
      poPriceInputs.push({ orderDate, unitPrice });
    }
    if (!inDateRange(orderDate, dateFrom, dateTo)) continue;
    const sup = embedOne<{ name?: string }>(po.suppliers);
    const qtyOrdered = Number(row.quantity_ordered) || 0;
    purchaseOrders.push({
      poNumber: po.po_number ? String(po.po_number) : '',
      supplier: sup?.name ? String(sup.name) : '',
      status: po.status ? String(po.status) : '',
      orderDate,
      expectedDelivery: csvDateOnlyIso(po.expected_delivery_date),
      actualDelivery: csvDateOnlyIso(po.actual_delivery_date),
      qtyOrdered,
      qtyReceived: Number(row.quantity_received) || 0,
      unitPrice,
      unit: row.unit_of_measure ? String(row.unit_of_measure) : String(matData.unit_of_measure ?? 'kg'),
      lineTotal: qtyOrdered * unitPrice,
    });
  }
  purchaseOrders.sort((a, b) => b.orderDate.localeCompare(a.orderDate));

  const priceHistory = buildPriceHistory(
    poPriceInputs,
    (logRes.data ?? []) as Array<{ action: string; created_at: string; new_value: unknown }>,
    dateFrom,
    dateTo,
  );

  const consumption: MaterialDetailExportData['consumption'] = (consRes.data ?? []).map((row) => ({
    date: csvDateOnlyIso(row.consumption_date as string),
    quantity: Number(row.quantity_consumed) || 0,
    unit: row.unit_of_measure ? String(row.unit_of_measure) : String(matData.unit_of_measure ?? 'kg'),
    productName: row.product_name ? String(row.product_name) : '',
    branch: row.branch ? String(row.branch) : '',
    costPerUnit: Number(row.cost_per_unit) || 0,
    totalCost: Number(row.total_cost) || 0,
    issuedBy: row.issued_by ? String(row.issued_by) : '',
    remarks: row.remarks ? String(row.remarks) : '',
  }));

  return {
    materialName,
    sku,
    periodLabel,
    dateFrom,
    dateTo,
    materialRows,
    suppliers,
    linkedProducts,
    purchaseOrders,
    consumption,
    priceHistory,
  };
}

export async function downloadMaterialDetailWorkbook(data: MaterialDetailExportData) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Field', 'Value'], ...data.materialRows]),
    'Material',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Supplier', 'Unit Price', 'Lead Time (days)', 'Min Order Qty', 'Preferred', 'Payment Terms', 'Status'],
      ...data.suppliers.map((s) => [
        s.name,
        xlsxOptionalNumber(s.unitPrice),
        xlsxOptionalNumber(s.leadTimeDays),
        xlsxOptionalNumber(s.minOrderQty),
        s.preferred,
        s.paymentTerms,
        s.status,
      ]),
    ]),
    'Suppliers',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Product', 'Variant SKU', 'Variant Size', 'Qty Needed', 'Unit'],
      ...data.linkedProducts.map((r) => [
        r.productName,
        r.variantSku,
        r.variantSize,
        xlsxOptionalNumber(r.quantityNeeded),
        r.unit,
      ]),
    ]),
    'Linked Products',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'PO Number',
        'Supplier',
        'Status',
        'Order Date',
        'Expected Delivery',
        'Actual Delivery',
        'Qty Ordered',
        'Qty Received',
        'Unit Price',
        'Unit',
        'Line Total',
      ],
      ...data.purchaseOrders.map((r) => [
        r.poNumber,
        r.supplier,
        r.status,
        r.orderDate,
        r.expectedDelivery,
        r.actualDelivery,
        xlsxOptionalNumber(r.qtyOrdered),
        xlsxOptionalNumber(r.qtyReceived),
        xlsxOptionalNumber(r.unitPrice),
        r.unit,
        xlsxOptionalNumber(r.lineTotal),
      ]),
    ]),
    'Purchase Orders',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Month', 'Unit Price', 'Source'],
      ...data.priceHistory.map((r) => [
        r.monthLabel,
        xlsxOptionalNumber(r.unitPrice),
        r.source,
      ]),
    ]),
    'Price History',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Date', 'Quantity', 'Unit', 'Product', 'Branch', 'Cost/Unit', 'Total Cost', 'Issued By', 'Remarks'],
      ...data.consumption.map((r) => [
        r.date,
        xlsxOptionalNumber(r.quantity),
        r.unit,
        r.productName,
        r.branch,
        xlsxOptionalNumber(r.costPerUnit),
        xlsxOptionalNumber(r.totalCost),
        r.issuedBy,
        r.remarks,
      ]),
    ]),
    'Consumption',
  );

  const safeName = data.materialName.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const safeSku = data.sku.replace(/[^\w.-]+/g, '_').slice(0, 20);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `raw-material-${safeName || safeSku || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
