import { supabase } from './supabase';
import { csvDateOnlyIso } from './datePeriodQuery';

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return csvDateOnlyIso(d);
}

export interface CustomerExportRow {
  id: string;
  customer_code: string;
  name: string;
  type: string;
  client_type: string;
  status: string;
  risk_level: string;
  payment_behavior: string;
  contact_person: string;
  phone: string;
  email: string;
  alternate_phone: string;
  alternate_email: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  branch: string;
  assigned_agent_code: string;
  assigned_agent: string;
  credit_limit: number | '';
  outstanding_balance: number | '';
  overdue_amount: number | '';
  available_credit: number | '';
  payment_terms: string;
  payment_score: number | '';
  avg_payment_days: number | '';
  total_purchases_ytd: number | '';
  total_purchases_lifetime: number | '';
  order_count: number | '';
  last_order_date: string;
  account_since: string;
  business_registration: string;
  tax_id: string;
}

type DbCustomerRow = {
  id: string;
  customer_code: string | null;
  name: string;
  type: string | null;
  client_type: string | null;
  status: string | null;
  risk_level: string | null;
  payment_behavior: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  alternate_phone: string | null;
  alternate_email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  credit_limit: number | string | null;
  outstanding_balance: number | string | null;
  overdue_amount: number | string | null;
  available_credit: number | string | null;
  payment_terms: string | null;
  payment_score: number | null;
  avg_payment_days: number | null;
  total_purchases_ytd: number | string | null;
  total_purchases_lifetime: number | string | null;
  order_count: number | null;
  last_order_date: string | null;
  account_since: string | null;
  business_registration: string | null;
  tax_id: string | null;
  branches?: { name: string } | null;
  employees?: { employee_id: string; employee_name: string } | null;
};

function mapCustomerRow(row: DbCustomerRow): CustomerExportRow {
  return {
    id: row.id,
    customer_code: row.customer_code ?? '',
    name: row.name,
    type: row.type ?? '',
    client_type: row.client_type ?? '',
    status: row.status ?? '',
    risk_level: row.risk_level ?? '',
    payment_behavior: row.payment_behavior ?? '',
    contact_person: row.contact_person ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    alternate_phone: row.alternate_phone ?? '',
    alternate_email: row.alternate_email ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    province: row.province ?? '',
    postal_code: row.postal_code ?? '',
    branch: row.branches?.name ?? '',
    assigned_agent_code: row.employees?.employee_id ?? '',
    assigned_agent: row.employees?.employee_name ?? '',
    credit_limit: xlsxOptionalNumber(row.credit_limit),
    outstanding_balance: xlsxOptionalNumber(row.outstanding_balance),
    overdue_amount: xlsxOptionalNumber(row.overdue_amount),
    available_credit: xlsxOptionalNumber(row.available_credit),
    payment_terms: row.payment_terms ?? '',
    payment_score: xlsxOptionalNumber(row.payment_score),
    avg_payment_days: xlsxOptionalNumber(row.avg_payment_days),
    total_purchases_ytd: xlsxOptionalNumber(row.total_purchases_ytd),
    total_purchases_lifetime: xlsxOptionalNumber(row.total_purchases_lifetime),
    order_count: xlsxOptionalNumber(row.order_count),
    last_order_date: fmtDate(row.last_order_date),
    account_since: fmtDate(row.account_since),
    business_registration: row.business_registration ?? '',
    tax_id: row.tax_id ?? '',
  };
}

const CUSTOMER_EXPORT_SELECT = `
  id, customer_code, name, type, client_type, status, risk_level, payment_behavior,
  contact_person, phone, email, alternate_phone, alternate_email,
  address, city, province, postal_code,
  credit_limit, outstanding_balance, overdue_amount, available_credit,
  payment_terms, payment_score, avg_payment_days,
  total_purchases_ytd, total_purchases_lifetime, order_count, last_order_date, account_since,
  business_registration, tax_id,
  employees!assigned_agent_id ( employee_id, employee_name ),
  branches!branch_id ( name )
`;

export async function fetchCustomersExportByIds(ids: string[]): Promise<CustomerExportRow[]> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_EXPORT_SELECT)
    .in('id', uniqueIds);

  if (error) throw new Error(error.message);

  const byId = new Map((data ?? []).map((row) => [String((row as DbCustomerRow).id), mapCustomerRow(row as DbCustomerRow)]));
  return uniqueIds.map((id) => byId.get(id)).filter((row): row is CustomerExportRow => Boolean(row));
}

export async function downloadCustomersWorkbook(branchLabel: string, rows: CustomerExportRow[]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Customer Code',
        'Customer Name',
        'Type',
        'Client Type',
        'Status',
        'Risk Level',
        'Payment Behavior',
        'Contact Person',
        'Phone',
        'Email',
        'Alternate Phone',
        'Alternate Email',
        'Address',
        'City',
        'Province',
        'Postal Code',
        'Branch',
        'Agent Code',
        'Assigned Agent',
        'Credit Limit',
        'Outstanding Balance',
        'Overdue Amount',
        'Available Credit',
        'Payment Terms',
        'Payment Score',
        'Avg Payment Days',
        'YTD Purchases',
        'Lifetime Purchases',
        'Order Count',
        'Last Order Date',
        'Account Since',
        'Business Registration',
        'Tax ID',
      ],
      ...rows.map((r) => [
        r.customer_code,
        r.name,
        r.type,
        r.client_type,
        r.status,
        r.risk_level,
        r.payment_behavior,
        r.contact_person,
        r.phone,
        r.email,
        r.alternate_phone,
        r.alternate_email,
        r.address,
        r.city,
        r.province,
        r.postal_code,
        r.branch,
        r.assigned_agent_code,
        r.assigned_agent,
        r.credit_limit,
        r.outstanding_balance,
        r.overdue_amount,
        r.available_credit,
        r.payment_terms,
        r.payment_score,
        r.avg_payment_days,
        r.total_purchases_ytd,
        r.total_purchases_lifetime,
        r.order_count,
        r.last_order_date,
        r.account_since,
        r.business_registration,
        r.tax_id,
      ]),
    ]),
    'Customers',
  );

  const safeBranch = branchLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customers-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
