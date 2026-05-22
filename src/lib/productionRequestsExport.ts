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

export function inProductionRequestDateRange(
  requestDate: string | null | undefined,
  dateFrom: string,
  dateTo: string,
): boolean {
  return inDatePeriodRange(requestDate, dateFrom, dateTo);
}

export interface ProductionRequestHeaderExportRow {
  pr_number: string;
  request_date: string;
  branch: string;
  line_count: number;
  expected_completion_date: string;
  status: string;
  created_by: string;
}

export interface ProductionRequestLineExportRow {
  pr_number: string;
  request_date: string;
  branch: string;
  status: string;
  sku: string;
  variant_name: string;
  quantity: number;
  quantity_completed: number;
}

export async function fetchProductionRequestLinesForExport(
  requestIds: string[],
): Promise<ProductionRequestLineExportRow[]> {
  if (requestIds.length === 0) return [];

  const { data, error } = await supabase
    .from('production_request_items')
    .select(
      'quantity, quantity_completed, product_variants(sku, size), production_requests!inner(pr_number, status, request_date, branches!branch_id(name))',
    )
    .in('request_id', requestIds);

  if (error) throw new Error(error.message);

  const rows: ProductionRequestLineExportRow[] = [];
  for (const row of data ?? []) {
    const pr = embedOne<{
      pr_number?: string;
      status?: string;
      request_date?: string;
      branches?: unknown;
    }>(row.production_requests);
    if (!pr) continue;
    const br = embedOne<{ name?: string }>(pr.branches);
    const pv = embedOne<{ sku?: string; size?: string }>(row.product_variants);
    rows.push({
      pr_number: String(pr.pr_number ?? ''),
      request_date: csvDateOnlyIso(pr.request_date),
      branch: br?.name ? String(br.name) : '',
      status: String(pr.status ?? ''),
      sku: pv?.sku ? String(pv.sku) : '',
      variant_name: pv?.size ? String(pv.size) : '',
      quantity: Number(row.quantity) || 0,
      quantity_completed: Number(row.quantity_completed) || 0,
    });
  }

  rows.sort((a, b) => {
    const byDate = b.request_date.localeCompare(a.request_date);
    if (byDate !== 0) return byDate;
    const byPr = a.pr_number.localeCompare(b.pr_number, undefined, { numeric: true });
    if (byPr !== 0) return byPr;
    return a.sku.localeCompare(b.sku);
  });

  return rows;
}

export async function downloadProductionRequestsWorkbook(
  branchLabel: string,
  headers: ProductionRequestHeaderExportRow[],
  lines: ProductionRequestLineExportRow[],
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['PR Number', 'Request Date', 'Branch', 'Lines', 'Target Date', 'Status', 'Created By'],
      ...headers.map((r) => [
        r.pr_number,
        r.request_date,
        r.branch,
        xlsxOptionalNumber(r.line_count),
        r.expected_completion_date,
        r.status,
        r.created_by,
      ]),
    ]),
    'Production Requests',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['PR Number', 'Request Date', 'Branch', 'Status', 'SKU', 'Variant', 'Quantity', 'Quantity Completed'],
      ...lines.map((r) => [
        r.pr_number,
        r.request_date,
        r.branch,
        r.status,
        r.sku,
        r.variant_name,
        xlsxOptionalNumber(r.quantity),
        xlsxOptionalNumber(r.quantity_completed),
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
  a.download = `production-requests-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
