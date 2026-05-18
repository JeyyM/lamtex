// Shared shapes + helpers for suppliers list and detail pages.

export interface SupplierMaterialRow {
  id: string;
  material_id: string;
  unit_price: number;
  lead_time_days: number;
  min_order_qty: number;
  is_preferred: boolean;
  notes: string | null;
  raw_materials: { name: string; sku: string; unit_of_measure: string; status: string; image_url: string | null } | null;
}

export interface SupplierBranchRow {
  branch_id: string;
  is_primary: boolean;
  branches: { name: string; code: string } | null;
}

export function supplierCoord(n: unknown): number | null {
  if (n == null || n === '') return null;
  const x = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(x) ? x : null;
}

export function supplierAddressQuery(s: {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
}): string | null {
  const parts = [s.address, [s.city, s.province].filter(Boolean).join(', ') || null, s.postal_code]
    .map((x) => (x != null ? String(x).trim() : ''))
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export interface SupplierRow {
  id: string;
  name: string;
  type: string;
  category: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  map_lat: number | string | null;
  map_lng: number | string | null;
  payment_terms: string;
  currency: string;
  status: string;
  performance_score: number;
  quality_rating: number;
  delivery_rating: number;
  avg_lead_time: number;
  on_time_delivery_rate: number;
  defect_rate: number;
  total_purchases_ytd: number;
  total_purchases_lifetime: number;
  order_count: number;
  avg_order_value: number;
  last_purchase_date: string | null;
  account_since: string | null;
  preferred_supplier: boolean;
  risk_level: string;
  notes: string | null;
  created_at: string;
  supplier_branches: SupplierBranchRow[];
  supplier_materials: SupplierMaterialRow[];
}

/** Same nested select as list fetch — use for a single supplier by id. */
export const SUPPLIER_DETAIL_SELECT = `
  *,
  supplier_branches ( branch_id, is_primary, branches ( name, code ) ),
  supplier_materials (
    id, material_id, unit_price, lead_time_days, min_order_qty, is_preferred, notes,
    raw_materials ( name, sku, unit_of_measure, status, image_url )
  )
` as const;
