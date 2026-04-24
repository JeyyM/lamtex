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
