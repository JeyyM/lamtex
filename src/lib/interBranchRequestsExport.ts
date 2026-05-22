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

export function inInterBranchRequestDateRange(
  createdAt: string | null | undefined,
  dateFrom: string,
  dateTo: string,
): boolean {
  return inDatePeriodRange(createdAt, dateFrom, dateTo);
}

export interface InterBranchRequestHeaderExportRow {
  ibr_number: string;
  created_at: string;
  requesting_branch_id: string;
  fulfilling_branch_id: string;
  requesting_branch: string;
  fulfilling_branch: string;
  line_count: number;
  status: string;
  created_by: string;
  scheduled_departure: string;
}

export interface InterBranchRequestLineExportRow {
  ibr_number: string;
  created_at: string;
  status: string;
  requesting_branch_id: string;
  fulfilling_branch_id: string;
  requesting_branch: string;
  fulfilling_branch: string;
  line_kind: string;
  item_name: string;
  sku: string;
  quantity: number;
  quantity_shipped: number;
  quantity_delivered: number;
}

const ALL_HEADERS_COLUMNS = [
  'IBR Number',
  'Created',
  'Requesting Branch',
  'Fulfilling Branch',
  'Lines',
  'Status',
  'Created By',
  'Scheduled Departure',
] as const;

const SENDING_HEADERS_COLUMNS = [
  'IBR Number',
  'Created',
  'To Branch',
  'Lines',
  'Status',
  'Created By',
  'Scheduled Departure',
] as const;

const RECEIVING_HEADERS_COLUMNS = [
  'IBR Number',
  'Created',
  'From Branch',
  'Lines',
  'Status',
  'Created By',
  'Scheduled Departure',
] as const;

const ALL_LINES_COLUMNS = [
  'IBR Number',
  'Created',
  'Status',
  'Requesting Branch',
  'Fulfilling Branch',
  'Line Kind',
  'Item',
  'SKU',
  'Quantity',
  'Shipped',
  'Delivered',
] as const;

const SENDING_LINES_COLUMNS = [
  'IBR Number',
  'Created',
  'Status',
  'To Branch',
  'Line Kind',
  'Item',
  'SKU',
  'Quantity',
  'Shipped',
  'Delivered',
] as const;

const RECEIVING_LINES_COLUMNS = [
  'IBR Number',
  'Created',
  'Status',
  'From Branch',
  'Line Kind',
  'Item',
  'SKU',
  'Quantity',
  'Shipped',
  'Delivered',
] as const;

function headerToAllRow(r: InterBranchRequestHeaderExportRow) {
  return [
    r.ibr_number,
    r.created_at,
    r.requesting_branch,
    r.fulfilling_branch,
    xlsxOptionalNumber(r.line_count),
    r.status,
    r.created_by,
    r.scheduled_departure,
  ];
}

function headerToSendingRow(r: InterBranchRequestHeaderExportRow) {
  return [
    r.ibr_number,
    r.created_at,
    r.requesting_branch,
    xlsxOptionalNumber(r.line_count),
    r.status,
    r.created_by,
    r.scheduled_departure,
  ];
}

function headerToReceivingRow(r: InterBranchRequestHeaderExportRow) {
  return [
    r.ibr_number,
    r.created_at,
    r.fulfilling_branch,
    xlsxOptionalNumber(r.line_count),
    r.status,
    r.created_by,
    r.scheduled_departure,
  ];
}

function lineToAllRow(r: InterBranchRequestLineExportRow) {
  return [
    r.ibr_number,
    r.created_at,
    r.status,
    r.requesting_branch,
    r.fulfilling_branch,
    r.line_kind,
    r.item_name,
    r.sku,
    xlsxOptionalNumber(r.quantity),
    xlsxOptionalNumber(r.quantity_shipped),
    xlsxOptionalNumber(r.quantity_delivered),
  ];
}

function lineToSendingRow(r: InterBranchRequestLineExportRow) {
  return [
    r.ibr_number,
    r.created_at,
    r.status,
    r.requesting_branch,
    r.line_kind,
    r.item_name,
    r.sku,
    xlsxOptionalNumber(r.quantity),
    xlsxOptionalNumber(r.quantity_shipped),
    xlsxOptionalNumber(r.quantity_delivered),
  ];
}

function lineToReceivingRow(r: InterBranchRequestLineExportRow) {
  return [
    r.ibr_number,
    r.created_at,
    r.status,
    r.fulfilling_branch,
    r.line_kind,
    r.item_name,
    r.sku,
    xlsxOptionalNumber(r.quantity),
    xlsxOptionalNumber(r.quantity_shipped),
    xlsxOptionalNumber(r.quantity_delivered),
  ];
}

export async function fetchInterBranchRequestLinesForExport(
  requestIds: string[],
): Promise<InterBranchRequestLineExportRow[]> {
  if (requestIds.length === 0) return [];

  const { data, error } = await supabase
    .from('inter_branch_request_items')
    .select(
      'line_kind, quantity, quantity_shipped, quantity_delivered, raw_materials(name, sku), product_variants(sku, products(name)), inter_branch_requests!inner(ibr_number, status, created_at, requesting_branch_id, fulfilling_branch_id, req_br:branches!requesting_branch_id(name), ful_br:branches!fulfilling_branch_id(name))',
    )
    .in('request_id', requestIds);

  if (error) throw new Error(error.message);

  const rows: InterBranchRequestLineExportRow[] = [];
  for (const row of data ?? []) {
    const ibr = embedOne<{
      ibr_number?: string;
      status?: string;
      created_at?: string;
      requesting_branch_id?: string;
      fulfilling_branch_id?: string;
      req_br?: unknown;
      ful_br?: unknown;
    }>(row.inter_branch_requests);
    if (!ibr) continue;
    const reqBr = embedOne<{ name?: string }>(ibr.req_br);
    const fulBr = embedOne<{ name?: string }>(ibr.ful_br);
    const rm = embedOne<{ name?: string; sku?: string }>(row.raw_materials);
    const pv = embedOne<{ sku?: string; products?: unknown }>(row.product_variants);
    const prod = pv ? embedOne<{ name?: string }>(pv.products) : null;
    const kind = String(row.line_kind ?? '');
    rows.push({
      ibr_number: String(ibr.ibr_number ?? ''),
      created_at: csvDateOnlyIso(ibr.created_at),
      status: String(ibr.status ?? ''),
      requesting_branch_id: String(ibr.requesting_branch_id ?? ''),
      fulfilling_branch_id: String(ibr.fulfilling_branch_id ?? ''),
      requesting_branch: reqBr?.name ? String(reqBr.name) : '',
      fulfilling_branch: fulBr?.name ? String(fulBr.name) : '',
      line_kind: kind,
      item_name: kind === 'raw_material' ? String(rm?.name ?? '') : String(prod?.name ?? ''),
      sku: kind === 'raw_material' ? String(rm?.sku ?? '') : String(pv?.sku ?? ''),
      quantity: Number(row.quantity) || 0,
      quantity_shipped: Number(row.quantity_shipped) || 0,
      quantity_delivered: Number(row.quantity_delivered) || 0,
    });
  }

  rows.sort((a, b) => {
    const byDate = b.created_at.localeCompare(a.created_at);
    if (byDate !== 0) return byDate;
    const byIbr = a.ibr_number.localeCompare(b.ibr_number, undefined, { numeric: true });
    if (byIbr !== 0) return byIbr;
    return a.sku.localeCompare(b.sku);
  });

  return rows;
}

export async function downloadInterBranchRequestsWorkbook(
  branchLabel: string,
  branchId: string | null,
  headers: InterBranchRequestHeaderExportRow[],
  lines: InterBranchRequestLineExportRow[],
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  if (branchId) {
    const sendingHeaders = headers.filter((r) => r.fulfilling_branch_id === branchId);
    const receivingHeaders = headers.filter((r) => r.requesting_branch_id === branchId);
    const sendingLines = lines.filter((r) => r.fulfilling_branch_id === branchId);
    const receivingLines = lines.filter((r) => r.requesting_branch_id === branchId);

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([SENDING_HEADERS_COLUMNS, ...sendingHeaders.map(headerToSendingRow)]),
      'Sending',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([RECEIVING_HEADERS_COLUMNS, ...receivingHeaders.map(headerToReceivingRow)]),
      'Receiving',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([SENDING_LINES_COLUMNS, ...sendingLines.map(lineToSendingRow)]),
      'Sending Lines',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([RECEIVING_LINES_COLUMNS, ...receivingLines.map(lineToReceivingRow)]),
      'Receiving Lines',
    );
  } else {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([ALL_HEADERS_COLUMNS, ...headers.map(headerToAllRow)]),
      'Inter-branch Requests',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([ALL_LINES_COLUMNS, ...lines.map(lineToAllRow)]),
      'Lines',
    );
  }

  const safeBranch = branchLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inter-branch-requests-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
