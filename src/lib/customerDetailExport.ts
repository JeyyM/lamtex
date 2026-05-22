import { supabase } from './supabase';
import { csvDateOnlyIso, inDatePeriodRange } from './datePeriodQuery';
import {
  fetchCustomersExportByIds,
  type CustomerExportRow,
} from './customersExport';

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return csvDateOnlyIso(d);
}

export interface CustomerOrderExportRow {
  id: string;
  order_number: string;
  order_date: string;
  required_date: string;
  scheduled_departure_date: string;
  status: string;
  payment_status: string;
  subtotal: number | '';
  discount_percent: number | '';
  discount_amount: number | '';
  total_amount: number | '';
  amount_paid: number | '';
  balance_due: number | '';
  agent_code: string;
  agent_name: string;
}

export interface CustomerOrderLineExportRow {
  order_id: string;
  order_number: string;
  sku: string;
  product_name: string;
  variant_name: string;
  category_code: string;
  category_name: string;
  quantity: number | '';
  original_price: number | '';
  negotiated_price: number | '';
  discount_percent: number | '';
  discount_amount: number | '';
  line_total: number | '';
  quantity_shipped: number | '';
  quantity_delivered: number | '';
}

function categoryFromLineEmbed(raw: Record<string, unknown>): {
  category_code: string;
  category_name: string;
} {
  const pv = raw.product_variants;
  const pvRow = Array.isArray(pv) ? pv[0] : pv;
  if (!pvRow || typeof pvRow !== 'object') {
    return { category_code: '', category_name: '' };
  }
  const prod = (pvRow as Record<string, unknown>).products;
  const prodRow = Array.isArray(prod) ? prod[0] : prod;
  if (!prodRow || typeof prodRow !== 'object') {
    return { category_code: '', category_name: '' };
  }
  const p = prodRow as Record<string, unknown>;
  const catEmbed = p.product_categories;
  const catRow = Array.isArray(catEmbed) ? catEmbed[0] : catEmbed;
  const category_code =
    catRow && typeof catRow === 'object'
      ? String((catRow as Record<string, unknown>).category_code ?? '').trim()
      : '';
  const category_name =
    catRow && typeof catRow === 'object'
      ? String((catRow as Record<string, unknown>).name ?? '').trim()
      : '';
  return { category_code, category_name };
}

function agentFieldsForExport(row: {
  agent_id?: string | null;
  agent_name?: string | null;
  employees?: { employee_id?: string } | { employee_id?: string }[] | null;
}): { agent_code: string; agent_name: string } {
  const agentId = row.agent_id != null ? String(row.agent_id).trim() : '';
  const name = typeof row.agent_name === 'string' ? row.agent_name.trim() : '';
  if (!agentId || !name) return { agent_code: '', agent_name: '' };
  const emp = row.employees;
  const empRow = Array.isArray(emp) ? emp[0] : emp;
  const code = empRow?.employee_id != null ? String(empRow.employee_id).trim() : '';
  return { agent_code: code, agent_name: name };
}

export async function fetchCustomerExportProfile(customerId: string): Promise<CustomerExportRow | null> {
  const rows = await fetchCustomersExportByIds([customerId]);
  return rows[0] ?? null;
}

export async function fetchCustomerOrdersForExport(
  customerId: string,
  dateFrom: string,
  dateTo: string,
): Promise<CustomerOrderExportRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, order_date, required_date, scheduled_departure_date, status, payment_status, subtotal, discount_percent, discount_amount, total_amount, amount_paid, balance_due, agent_id, agent_name, employees!agent_id(employee_id)',
    )
    .eq('customer_id', customerId)
    .order('order_date', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => inDatePeriodRange(row.order_date as string | null, dateFrom, dateTo))
    .map((row) => {
      const agent = agentFieldsForExport(row as Parameters<typeof agentFieldsForExport>[0]);
      return {
        id: String(row.id),
        order_number: String(row.order_number ?? ''),
        order_date: fmtDate(row.order_date as string | null),
        required_date: fmtDate(row.required_date as string | null),
        scheduled_departure_date: fmtDate(row.scheduled_departure_date as string | null),
        status: String(row.status ?? ''),
        payment_status: String(row.payment_status ?? ''),
        subtotal: xlsxOptionalNumber(row.subtotal),
        discount_percent: xlsxOptionalNumber(row.discount_percent),
        discount_amount: xlsxOptionalNumber(row.discount_amount),
        total_amount: xlsxOptionalNumber(row.total_amount),
        amount_paid: xlsxOptionalNumber(row.amount_paid),
        balance_due: xlsxOptionalNumber(row.balance_due),
        agent_code: agent.agent_code,
        agent_name: agent.agent_name,
      };
    });
}

export async function fetchCustomerOrderLinesForExport(
  orders: CustomerOrderExportRow[],
): Promise<CustomerOrderLineExportRow[]> {
  const orderIds = orders.map((o) => o.id).filter(Boolean);
  const orderNumById = new Map(orders.map((o) => [o.id, o.order_number]));
  if (!orderIds.length) return [];

  const out: CustomerOrderLineExportRow[] = [];
  const chunkSize = 150;
  for (let i = 0; i < orderIds.length; i += chunkSize) {
    const chunk = orderIds.slice(i, i + chunkSize);
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
      const orderId = String(row.order_id ?? '');
      out.push({
        order_id: orderId,
        order_number: orderNumById.get(orderId) ?? '',
        sku: String(row.sku ?? ''),
        product_name: String(row.product_name ?? ''),
        variant_name: String(row.variant_description ?? ''),
        category_code,
        category_name,
        quantity: xlsxOptionalNumber(row.quantity),
        original_price: xlsxOptionalNumber(row.original_price),
        negotiated_price: xlsxOptionalNumber(row.negotiated_price),
        discount_percent: xlsxOptionalNumber(row.discount_percent),
        discount_amount: xlsxOptionalNumber(row.discount_amount),
        line_total: xlsxOptionalNumber(row.line_total),
        quantity_shipped: xlsxOptionalNumber(row.quantity_shipped),
        quantity_delivered: xlsxOptionalNumber(row.quantity_delivered),
      });
    }
  }

  out.sort((a, b) => {
    const byOrder = a.order_number.localeCompare(b.order_number, undefined, { numeric: true });
    if (byOrder !== 0) return byOrder;
    return a.sku.localeCompare(b.sku);
  });
  return out;
}

function customerProfileRows(customer: CustomerExportRow): [string, string | number][] {
  return [
    ['Customer Code', customer.customer_code],
    ['Customer Name', customer.name],
    ['Type', customer.type],
    ['Client Type', customer.client_type],
    ['Status', customer.status],
    ['Risk Level', customer.risk_level],
    ['Payment Behavior', customer.payment_behavior],
    ['Contact Person', customer.contact_person],
    ['Phone', customer.phone],
    ['Email', customer.email],
    ['Alternate Phone', customer.alternate_phone],
    ['Alternate Email', customer.alternate_email],
    ['Address', customer.address],
    ['City', customer.city],
    ['Province', customer.province],
    ['Postal Code', customer.postal_code],
    ['Branch', customer.branch],
    ['Agent Code', customer.assigned_agent_code],
    ['Assigned Agent', customer.assigned_agent],
    ['Credit Limit', customer.credit_limit],
    ['Outstanding Balance', customer.outstanding_balance],
    ['Overdue Amount', customer.overdue_amount],
    ['Available Credit', customer.available_credit],
    ['Payment Terms', customer.payment_terms],
    ['Payment Score', customer.payment_score],
    ['Avg Payment Days', customer.avg_payment_days],
    ['YTD Purchases', customer.total_purchases_ytd],
    ['Lifetime Purchases', customer.total_purchases_lifetime],
    ['Order Count', customer.order_count],
    ['Last Order Date', customer.last_order_date],
    ['Account Since', customer.account_since],
    ['Business Registration', customer.business_registration],
    ['Tax ID', customer.tax_id],
  ];
}

export async function downloadCustomerDetailWorkbook(params: {
  customer: CustomerExportRow;
  orders: CustomerOrderExportRow[];
  lines: CustomerOrderLineExportRow[];
  periodLabel: string;
}) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Field', 'Value'],
      ['Export Period', params.periodLabel],
      ...customerProfileRows(params.customer),
    ]),
    'Customer',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Order Number',
        'Order Date',
        'Required Date',
        'Scheduled Departure',
        'Agent Code',
        'Agent Name',
        'Status',
        'Payment Status',
        'Subtotal',
        'Discount %',
        'Discount Amount',
        'Total Amount',
        'Amount Paid',
        'Balance Due',
      ],
      ...params.orders.map((o) => [
        o.order_number,
        o.order_date,
        o.required_date,
        o.scheduled_departure_date,
        o.agent_code,
        o.agent_name,
        o.status,
        o.payment_status,
        o.subtotal,
        o.discount_percent,
        o.discount_amount,
        o.total_amount,
        o.amount_paid,
        o.balance_due,
      ]),
    ]),
    'Orders',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Order Number',
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
      ],
      ...params.lines.map((li) => [
        li.order_number,
        li.category_code,
        li.category_name,
        li.sku,
        li.product_name,
        li.variant_name,
        li.quantity,
        li.original_price,
        li.negotiated_price,
        li.discount_percent,
        li.discount_amount,
        li.line_total,
        li.quantity_shipped,
        li.quantity_delivered,
      ]),
    ]),
    'Line items',
  );

  const safeName = (params.customer.customer_code || params.customer.name)
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customer-${safeName || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
