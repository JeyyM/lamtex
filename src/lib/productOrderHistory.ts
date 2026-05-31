import { supabase } from '@/src/lib/supabase';

export type ProductOrderHistoryRow = {
  lineId: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  status: string;
  orderDate: string | null;
  requiredDate: string | null;
  branchName: string | null;
  variantLabel: string;
  sku: string;
  quantity: number;
  quantityDelivered: number | null;
  lineTotal: number | null;
};

function embedOne<T>(raw: T | T[] | null | undefined): T | null {
  if (raw == null) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

/** Order lines for all variants of a product (newest orders first). */
export async function fetchProductOrderHistory(productId: string): Promise<ProductOrderHistoryRow[]> {
  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  if (vErr) throw new Error(vErr.message);

  const variantIds = (variants ?? []).map((v) => String(v.id)).filter(Boolean);
  if (variantIds.length === 0) return [];

  const rows: ProductOrderHistoryRow[] = [];
  const chunkSize = 150;

  for (let i = 0; i < variantIds.length; i += chunkSize) {
    const chunk = variantIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('order_line_items')
      .select(
        `
        id,
        sku,
        variant_description,
        quantity,
        line_total,
        quantity_delivered,
        orders!inner (
          id,
          order_number,
          customer_name,
          status,
          order_date,
          required_date,
          branches:branches!branch_id ( name )
        )
      `,
      )
      .in('variant_id', chunk);

    if (error) throw new Error(error.message);

    for (const raw of data ?? []) {
      const line = raw as {
        id?: string;
        sku?: string | null;
        variant_description?: string | null;
        quantity?: number | string | null;
        line_total?: number | string | null;
        quantity_delivered?: number | string | null;
        orders?: {
          id?: string;
          order_number?: string | null;
          customer_name?: string | null;
          status?: string;
          order_date?: string | null;
          required_date?: string | null;
          branches?: { name?: string } | { name?: string }[] | null;
        } | null;
      };
      const ord = embedOne(line.orders);
      if (!ord?.id) continue;
      const br = embedOne(ord.branches);

      rows.push({
        lineId: String(line.id ?? ''),
        orderId: String(ord.id),
        orderNumber: String(ord.order_number ?? '').trim() || ord.id.slice(0, 8),
        customerName: ord.customer_name ?? null,
        status: String(ord.status ?? ''),
        orderDate: ord.order_date ?? null,
        requiredDate: ord.required_date ?? null,
        branchName: br?.name ?? null,
        variantLabel: String(line.variant_description ?? '').trim() || '—',
        sku: String(line.sku ?? '').trim() || '—',
        quantity: Number(line.quantity) || 0,
        quantityDelivered:
          line.quantity_delivered != null ? Number(line.quantity_delivered) : null,
        lineTotal: line.line_total != null ? Number(line.line_total) : null,
      });
    }
  }

  return rows.sort((a, b) => {
    const ta = a.orderDate ? new Date(a.orderDate).getTime() : 0;
    const tb = b.orderDate ? new Date(b.orderDate).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return a.orderNumber.localeCompare(b.orderNumber, undefined, { numeric: true });
  });
}
