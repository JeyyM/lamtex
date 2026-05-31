import { supabase } from '@/src/lib/supabase';

export type ProductPrHistoryRow = {
  id: string;
  request_id: string;
  product_variant_id: string;
  quantity: number;
  quantity_completed: number;
  product_variants: {
    sku: string;
    size: string;
  } | null;
  production_requests: {
    id: string;
    pr_number: string;
    status: string;
    request_date: string;
    expected_completion_date: string | null;
    created_by: string | null;
    branches: { name: string } | null;
  } | null;
};

const PR_HISTORY_SELECT = `
  id, request_id, product_variant_id, quantity, quantity_completed,
  product_variants ( sku, size ),
  production_requests!inner (
    id, pr_number, status, request_date, expected_completion_date, created_by,
    branches:branches!branch_id ( name )
  )
`;

/** All PR lines for a product (by product_id and any variant on the product). */
export async function fetchProductProductionRequestHistory(
  productId: string,
): Promise<ProductPrHistoryRow[]> {
  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  if (vErr) throw new Error(vErr.message);

  const variantIds = (variants ?? []).map((v) => String(v.id)).filter(Boolean);

  let query = supabase.from('production_request_items').select(PR_HISTORY_SELECT);

  if (variantIds.length > 0) {
    query = query.or(
      `product_id.eq.${productId},product_variant_id.in.(${variantIds.join(',')})`,
    );
  } else {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query.limit(1000);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as ProductPrHistoryRow[];

  return rows
    .filter((r) => r.production_requests != null)
    .sort((a, b) => {
      const da = a.production_requests?.request_date ?? '';
      const db = b.production_requests?.request_date ?? '';
      if (db !== da) return db.localeCompare(da);
      const pa = a.production_requests?.pr_number ?? '';
      const pb = b.production_requests?.pr_number ?? '';
      return pb.localeCompare(pa, undefined, { numeric: true });
    });
}
