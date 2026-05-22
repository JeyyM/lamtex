import { supabase } from './supabase';
import { isProductFamilyCatalogHidden } from './productCatalogVisibility';

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

function branchMatchesFilter(branchName: string | null | undefined, filter: string): boolean {
  if (!filter.trim()) return true;
  if (!branchName) return false;
  return branchName.trim() === filter.trim();
}

export interface ProductFamilyExportRow {
  product_name: string;
  description: string | null;
  category_code: string | null;
  category_name: string | null;
  branch: string | null;
  catalog_status: string;
  stock_status: string;
}

export interface VariantExportRow {
  sku: string;
  variant_name: string;
  unit_price: number;
  cost_price: number | null;
  total_stock: number;
  reorder_point: number;
  catalog_visible: string;
  stock_status: string;
  lead_time_days: number | null;
  min_order_qty: number | null;
  units_sold_ytd: number;
  revenue_ytd: number;
}

export interface OrderLineExportRow {
  order_number: string;
  order_date: string;
  customer_name: string;
  branch_code: string;
  order_status: string;
  payment_status: string;
  sku: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  quantity_shipped: number | null;
  quantity_delivered: number | null;
}

export interface ProductionRequestExportRow {
  pr_number: string;
  status: string;
  request_date: string;
  expected_completion_date: string;
  branch_code: string;
  sku: string;
  variant_name: string;
  quantity: number;
  quantity_completed: number;
  notes: string;
  created_by: string;
}

export async function fetchProductFamilyExportData(
  productId: string,
  branchFilter: string,
): Promise<{
  family: ProductFamilyExportRow;
  variants: VariantExportRow[];
  orderLines: OrderLineExportRow[];
  productionRequests: ProductionRequestExportRow[];
}> {
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('name, description, status, branch, product_categories(category_code, name, is_active)')
    .eq('id', productId)
    .single();
  if (prodErr) throw new Error(prodErr.message);
  if (!product) throw new Error('Product not found');

  const cat = embedOne<{ category_code?: string | null; name?: string | null; is_active?: boolean }>(
    product.product_categories,
  );
  const categoryActive = cat?.is_active !== false;

  const { data: variantRows, error: varErr } = await supabase
    .from('product_variants')
    .select(
      'id, sku, size, unit_price, cost_price, total_stock, reorder_point, status, is_hidden, units_sold_ytd, revenue_ytd, lead_time_days, min_order_qty',
    )
    .eq('product_id', productId)
    .order('size', { ascending: true });
  if (varErr) throw new Error(varErr.message);

  const variants: VariantExportRow[] = (variantRows ?? []).map((v) => ({
    sku: String(v.sku ?? ''),
    variant_name: String(v.size ?? ''),
    unit_price: Number(v.unit_price ?? 0),
    cost_price: v.cost_price != null ? Number(v.cost_price) : null,
    total_stock: Number(v.total_stock ?? 0),
    reorder_point: Number(v.reorder_point ?? 0),
    catalog_visible: v.is_hidden === true ? 'No' : 'Yes',
    stock_status: v.status === 'Active' ? 'In Stock' : String(v.status ?? ''),
    lead_time_days: v.lead_time_days != null ? Number(v.lead_time_days) : null,
    min_order_qty: v.min_order_qty != null ? Number(v.min_order_qty) : null,
    units_sold_ytd: Number(v.units_sold_ytd ?? 0),
    revenue_ytd: Number(v.revenue_ytd ?? 0),
  }));

  const familyCatalogHidden = isProductFamilyCatalogHidden(
    (variantRows ?? []).map((v) => ({ is_hidden: v.is_hidden })),
    categoryActive,
  );

  const family: ProductFamilyExportRow = {
    product_name: String(product.name ?? ''),
    description: product.description ? String(product.description) : null,
    category_code: cat?.category_code ? String(cat.category_code) : null,
    category_name: cat?.name ? String(cat.name) : null,
    branch: product.branch ? String(product.branch) : null,
    catalog_status: familyCatalogHidden ? 'Hidden' : 'Visible',
    stock_status: product.status === 'Active' ? 'In Stock' : String(product.status ?? ''),
  };

  const variantIds = (variantRows ?? []).map((v) => String(v.id)).filter(Boolean);
  const orderLines: OrderLineExportRow[] = [];

  if (variantIds.length > 0) {
    const chunkSize = 150;
    for (let i = 0; i < variantIds.length; i += chunkSize) {
      const chunk = variantIds.slice(i, i + chunkSize);
      const { data: lines, error: lineErr } = await supabase
        .from('order_line_items')
        .select(
          [
            'sku',
            'variant_description',
            'quantity',
            'unit_price',
            'discount_amount',
            'line_total',
            'quantity_shipped',
            'quantity_delivered',
            'orders!inner(order_number, order_date, customer_name, status, payment_status, branches!branch_id(code, name))',
          ].join(','),
        )
        .in('variant_id', chunk);
      if (lineErr) throw new Error(lineErr.message);

      for (const row of lines ?? []) {
        const ord = embedOne<{
          order_number?: string;
          order_date?: string;
          customer_name?: string | null;
          status?: string;
          payment_status?: string;
          branches?: { code?: string; name?: string } | { code?: string; name?: string }[] | null;
        }>(row.orders);
        if (!ord) continue;
        const br = embedOne<{ code?: string; name?: string }>(ord.branches);
        const branchName = br?.name ?? null;
        if (!branchMatchesFilter(branchName, branchFilter)) continue;

        orderLines.push({
          order_number: String(ord.order_number ?? ''),
          order_date: csvDateOnlyIso(ord.order_date),
          customer_name: String(ord.customer_name ?? ''),
          branch_code: br?.code ? String(br.code) : '',
          order_status: String(ord.status ?? ''),
          payment_status: String(ord.payment_status ?? ''),
          sku: String(row.sku ?? ''),
          variant_name: String(row.variant_description ?? ''),
          quantity: Number(row.quantity ?? 0),
          unit_price: Number(row.unit_price ?? 0),
          discount_amount: Number(row.discount_amount ?? 0),
          line_total: Number(row.line_total ?? 0),
          quantity_shipped: row.quantity_shipped != null ? Number(row.quantity_shipped) : null,
          quantity_delivered: row.quantity_delivered != null ? Number(row.quantity_delivered) : null,
        });
      }
    }
  }

  orderLines.sort((a, b) => {
    const byDate = b.order_date.localeCompare(a.order_date);
    if (byDate !== 0) return byDate;
    return a.order_number.localeCompare(b.order_number, undefined, { numeric: true });
  });

  const { data: prItems, error: prErr } = await supabase
    .from('production_request_items')
    .select(
      [
        'quantity',
        'quantity_completed',
        'product_variants(sku, size)',
        'production_requests!inner(pr_number, status, request_date, expected_completion_date, notes, created_by, branches!branch_id(code, name))',
      ].join(','),
    )
    .eq('product_id', productId);
  if (prErr) throw new Error(prErr.message);

  const productionRequests: ProductionRequestExportRow[] = [];
  for (const row of prItems ?? []) {
    const pr = embedOne<{
      pr_number?: string;
      status?: string;
      request_date?: string;
      expected_completion_date?: string | null;
      notes?: string | null;
      created_by?: string | null;
      branches?: { code?: string; name?: string } | { code?: string; name?: string }[] | null;
    }>(row.production_requests);
    if (!pr) continue;
    const br = embedOne<{ code?: string; name?: string }>(pr.branches);
    if (!branchMatchesFilter(br?.name ?? null, branchFilter)) continue;
    const pv = embedOne<{ sku?: string; size?: string }>(row.product_variants);

    productionRequests.push({
      pr_number: String(pr.pr_number ?? ''),
      status: String(pr.status ?? ''),
      request_date: csvDateOnlyIso(pr.request_date),
      expected_completion_date: csvDateOnlyIso(pr.expected_completion_date),
      branch_code: br?.code ? String(br.code) : '',
      sku: pv?.sku ? String(pv.sku) : '',
      variant_name: pv?.size ? String(pv.size) : '',
      quantity: Number(row.quantity ?? 0),
      quantity_completed: Number(row.quantity_completed ?? 0),
      notes: pr.notes ? String(pr.notes) : '',
      created_by: pr.created_by ? String(pr.created_by) : '',
    });
  }

  productionRequests.sort((a, b) => {
    const byDate = b.request_date.localeCompare(a.request_date);
    if (byDate !== 0) return byDate;
    return a.pr_number.localeCompare(b.pr_number, undefined, { numeric: true });
  });

  return { family, variants, orderLines, productionRequests };
}

export async function downloadProductFamilyWorkbook(
  family: ProductFamilyExportRow,
  variants: VariantExportRow[],
  orderLines: OrderLineExportRow[],
  productionRequests: ProductionRequestExportRow[],
  slugLabel: string,
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Product Name',
        'Description',
        'Category Code',
        'Category Name',
        'Branch',
        'Catalog Status',
        'Stock Status',
      ],
      [
        family.product_name,
        family.description ?? '',
        family.category_code ?? '',
        family.category_name ?? '',
        family.branch ?? '',
        family.catalog_status,
        family.stock_status,
      ],
    ]),
    'Product Family',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'SKU',
        'Variant Name',
        'Unit Price',
        'Cost Price',
        'Total Stock',
        'Reorder Point',
        'Catalog Visible',
        'Stock Status',
        'Lead Time (days)',
        'Min Order Qty',
        'Units Sold YTD',
        'Revenue YTD',
      ],
      ...variants.map((v) => [
        v.sku,
        v.variant_name,
        xlsxOptionalNumber(v.unit_price),
        xlsxOptionalNumber(v.cost_price),
        v.total_stock,
        v.reorder_point,
        v.catalog_visible,
        v.stock_status,
        xlsxOptionalNumber(v.lead_time_days),
        xlsxOptionalNumber(v.min_order_qty),
        v.units_sold_ytd,
        xlsxOptionalNumber(v.revenue_ytd),
      ]),
    ]),
    'Variants',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Order Number',
        'Order Date',
        'Customer Name',
        'Branch Code',
        'Order Status',
        'Payment Status',
        'SKU',
        'Variant Name',
        'Quantity',
        'Unit Price',
        'Discount Amount',
        'Line Total',
        'Qty Shipped',
        'Qty Delivered',
      ],
      ...orderLines.map((o) => [
        o.order_number,
        o.order_date,
        o.customer_name,
        o.branch_code,
        o.order_status,
        o.payment_status,
        o.sku,
        o.variant_name,
        o.quantity,
        xlsxOptionalNumber(o.unit_price),
        xlsxOptionalNumber(o.discount_amount),
        xlsxOptionalNumber(o.line_total),
        xlsxOptionalNumber(o.quantity_shipped),
        xlsxOptionalNumber(o.quantity_delivered),
      ]),
    ]),
    'Orders',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'PR Number',
        'Status',
        'Request Date',
        'Expected Completion',
        'Branch Code',
        'SKU',
        'Variant Name',
        'Quantity',
        'Quantity Completed',
        'Notes',
        'Created By',
      ],
      ...productionRequests.map((pr) => [
        pr.pr_number,
        pr.status,
        pr.request_date,
        pr.expected_completion_date,
        pr.branch_code,
        pr.sku,
        pr.variant_name,
        xlsxOptionalNumber(pr.quantity),
        xlsxOptionalNumber(pr.quantity_completed),
        pr.notes,
        pr.created_by,
      ]),
    ]),
    'Production Requests',
  );

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeSlug = slugLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  a.download = `product-${safeSlug || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface VariantsComparisonExportRow {
  size: string;
  sku: string;
  stock: number;
  price: number;
  monthlyUsage: number;
  unitsSold: number;
  revenue: number;
  status: string;
}

export async function downloadVariantsComparisonWorkbook(params: {
  productName: string;
  categoryName: string | null;
  branch: string | null;
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  summary: {
    totalUnits: number;
    totalRevenue: number;
    totalStock: number;
    variantCount: number;
    topByUnits: { size: string; units: number } | null;
  };
  rows: VariantsComparisonExportRow[];
}) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const periodRange =
    params.dateFrom && params.dateTo
      ? `${params.dateFrom} → ${params.dateTo}`
      : params.dateFrom || params.dateTo || 'All time';

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Product Name', 'Category', 'Branch', 'Period', 'Date Range'],
      [
        params.productName,
        params.categoryName ?? '',
        params.branch ?? 'All branches',
        params.periodLabel,
        periodRange,
      ],
      [],
      ['Total Units', 'Total Revenue', 'Combined Stock', 'Variant Count', 'Top Variant (units)'],
      [
        params.summary.totalUnits,
        xlsxOptionalNumber(params.summary.totalRevenue),
        params.summary.totalStock,
        params.summary.variantCount,
        params.summary.topByUnits
          ? `${params.summary.topByUnits.size} (${params.summary.topByUnits.units})`
          : '',
      ],
    ]),
    'Summary',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Size',
        'SKU',
        'Stock',
        'Unit Price',
        'Avg Monthly Usage',
        'Units Sold',
        'Revenue',
        'Status',
      ],
      ...params.rows.map((r) => [
        r.size,
        r.sku,
        r.stock,
        xlsxOptionalNumber(r.price),
        r.monthlyUsage,
        r.unitsSold,
        xlsxOptionalNumber(r.revenue),
        r.status,
      ]),
    ]),
    'Variants',
  );

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeSlug = params.productName.replace(/[^\w.-]+/g, '_').slice(0, 40);
  a.download = `variants-comparison-${safeSlug || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
