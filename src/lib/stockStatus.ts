/**
 * Computes the stock status for a product variant based on its current stock
 * level relative to the reorder point.
 *
 * Rules:
 *   stock === 0                          → 'Out of Stock'
 *   0 < stock <= reorderPoint / 2        → 'Critical'      (displayed as "Critical Stock")
 *   reorderPoint / 2 < stock <= reorderPoint → 'Low Stock'
 *   stock > reorderPoint                 → 'Active'        (displayed as "In Stock")
 *
 * These string values match what the `product_variants.status` column stores.
 */
export function computeStockStatus(stock: number, reorderPoint: number): string {
  if (stock <= 0) return 'Out of Stock';
  const half = reorderPoint / 2;
  if (stock <= half) return 'Critical';
  if (stock <= reorderPoint) return 'Low Stock';
  return 'Active';
}

/**
 * Maps computed stock status to values storable in product_status / material_status enums.
 * DB enums do not include 'Critical'; persist as 'Low Stock' instead.
 */
export function toPersistedStockStatus(computed: string): string {
  if (computed === 'Critical') return 'Low Stock';
  return computed;
}

/** Like computeStockStatus, but safe to write to product_status / material_status columns. */
export function computePersistedStockStatus(stock: number, reorderPoint: number): string {
  return toPersistedStockStatus(computeStockStatus(stock, reorderPoint));
}
