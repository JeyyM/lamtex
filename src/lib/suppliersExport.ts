import { supabase } from './supabase';
import { csvDateOnlyIso } from './datePeriodQuery';
import { SUPPLIER_DETAIL_SELECT, type SupplierRow } from '@/src/pages/supplierModel';

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return csvDateOnlyIso(d);
}

export interface SupplierExportRow {
  name: string;
  type: string;
  category: string;
  status: string;
  risk_level: string;
  preferred_supplier: string;
  contact_person: string;
  phone: string;
  email: string;
  payment_terms: string;
  currency: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  branches: string;
  performance_score: number | '';
  quality_rating: number | '';
  delivery_rating: number | '';
  avg_lead_time: number | '';
  on_time_delivery_rate: number | '';
  defect_rate: number | '';
  total_purchases_ytd: number | '';
  total_purchases_lifetime: number | '';
  order_count: number | '';
  avg_order_value: number | '';
  last_purchase_date: string;
  account_since: string;
  notes: string;
}

export interface SupplierMaterialExportRow {
  supplier_name: string;
  material_sku: string;
  material_name: string;
  unit: string;
  unit_price: number | '';
  lead_time_days: number | '';
  min_order_qty: number | '';
  is_preferred: string;
  material_status: string;
  notes: string;
}

function mapSupplierRow(row: SupplierRow): SupplierExportRow {
  const branchNames = row.supplier_branches
    .map((sb) => {
      const name = sb.branches?.name ?? '';
      const code = sb.branches?.code ?? '';
      return code ? `${name} [${code}]` : name;
    })
    .filter(Boolean)
    .join('; ');

  return {
    name: row.name,
    type: row.type,
    category: row.category ?? '',
    status: row.status,
    risk_level: row.risk_level,
    preferred_supplier: row.preferred_supplier ? 'Yes' : 'No',
    contact_person: row.contact_person ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    payment_terms: row.payment_terms ?? '',
    currency: row.currency ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    province: row.province ?? '',
    postal_code: row.postal_code ?? '',
    branches: branchNames,
    performance_score: xlsxOptionalNumber(row.performance_score),
    quality_rating: xlsxOptionalNumber(row.quality_rating),
    delivery_rating: xlsxOptionalNumber(row.delivery_rating),
    avg_lead_time: xlsxOptionalNumber(row.avg_lead_time),
    on_time_delivery_rate: xlsxOptionalNumber(row.on_time_delivery_rate),
    defect_rate: xlsxOptionalNumber(row.defect_rate),
    total_purchases_ytd: xlsxOptionalNumber(row.total_purchases_ytd),
    total_purchases_lifetime: xlsxOptionalNumber(row.total_purchases_lifetime),
    order_count: xlsxOptionalNumber(row.order_count),
    avg_order_value: xlsxOptionalNumber(row.avg_order_value),
    last_purchase_date: fmtDate(row.last_purchase_date),
    account_since: fmtDate(row.account_since),
    notes: row.notes ?? '',
  };
}

function mapMaterialRows(supplier: SupplierRow): SupplierMaterialExportRow[] {
  return supplier.supplier_materials.map((m) => ({
    supplier_name: supplier.name,
    material_sku: m.raw_materials?.sku ?? '',
    material_name: m.raw_materials?.name ?? '',
    unit: m.raw_materials?.unit_of_measure ?? '',
    unit_price: xlsxOptionalNumber(m.unit_price),
    lead_time_days: xlsxOptionalNumber(m.lead_time_days),
    min_order_qty: xlsxOptionalNumber(m.min_order_qty),
    is_preferred: m.is_preferred ? 'Yes' : 'No',
    material_status: m.raw_materials?.status ?? '',
    notes: m.notes ?? '',
  }));
}

export async function fetchSuppliersExportBundle(supplierIds: string[]): Promise<{
  suppliers: SupplierExportRow[];
  materials: SupplierMaterialExportRow[];
}> {
  const uniqueIds = [...new Set(supplierIds.map((id) => id.trim()).filter(Boolean))];
  if (!uniqueIds.length) {
    return { suppliers: [], materials: [] };
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select(SUPPLIER_DETAIL_SELECT)
    .in('id', uniqueIds);

  if (error) throw new Error(error.message);

  const byId = new Map(((data ?? []) as SupplierRow[]).map((row) => [row.id, row]));

  const suppliers: SupplierExportRow[] = [];
  const materials: SupplierMaterialExportRow[] = [];

  for (const id of uniqueIds) {
    const row = byId.get(id);
    if (!row) continue;
    suppliers.push(mapSupplierRow(row));
    materials.push(...mapMaterialRows(row));
  }

  materials.sort((a, b) => {
    const bySupplier = a.supplier_name.localeCompare(b.supplier_name);
    if (bySupplier !== 0) return bySupplier;
    return a.material_sku.localeCompare(b.material_sku);
  });

  return { suppliers, materials };
}

export async function downloadSuppliersWorkbook(params: {
  branchLabel: string;
  suppliers: SupplierExportRow[];
  materials: SupplierMaterialExportRow[];
}) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Supplier Name',
        'Type',
        'Category',
        'Status',
        'Risk Level',
        'Preferred',
        'Contact Person',
        'Phone',
        'Email',
        'Payment Terms',
        'Currency',
        'Address',
        'City',
        'Province',
        'Postal Code',
        'Branches',
        'Performance Score',
        'Quality Rating',
        'Delivery Rating',
        'Avg Lead Time (days)',
        'On-Time Delivery %',
        'Defect Rate %',
        'YTD Purchases',
        'Lifetime Purchases',
        'Order Count',
        'Avg Order Value',
        'Last Purchase Date',
        'Account Since',
        'Notes',
      ],
      ...params.suppliers.map((r) => [
        r.name,
        r.type,
        r.category,
        r.status,
        r.risk_level,
        r.preferred_supplier,
        r.contact_person,
        r.phone,
        r.email,
        r.payment_terms,
        r.currency,
        r.address,
        r.city,
        r.province,
        r.postal_code,
        r.branches,
        r.performance_score,
        r.quality_rating,
        r.delivery_rating,
        r.avg_lead_time,
        r.on_time_delivery_rate,
        r.defect_rate,
        r.total_purchases_ytd,
        r.total_purchases_lifetime,
        r.order_count,
        r.avg_order_value,
        r.last_purchase_date,
        r.account_since,
        r.notes,
      ]),
    ]),
    'Suppliers',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Supplier Name',
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
        r.supplier_name,
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

  const safeBranch = params.branchLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `suppliers-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
