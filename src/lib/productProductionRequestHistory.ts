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

export async function fetchProductProductionRequestHistory(
  productId: string,
): Promise<ProductPrHistoryRow[]> {
  const { data, error } = await supabase
    .from('production_request_items')
    .select(`
      id, request_id, product_variant_id, quantity, quantity_completed,
      product_variants ( sku, size ),
      production_requests (
        id, pr_number, status, request_date, expected_completion_date, created_by,
        branches:branches!branch_id ( name )
      )
    `)
    .eq('product_id', productId)
    .order('id', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProductPrHistoryRow[];
}
