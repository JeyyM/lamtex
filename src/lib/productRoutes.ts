/** Matches ProductCategoryPage navigation: `family` id is the product row id. */
export function finishedGoodProductHref(productId: string, categorySlug?: string | null): string {
  const slug = (categorySlug ?? '').trim();
  if (!slug) return `/products/${productId}`;
  return `/products/category/${encodeURIComponent(slug)}/family/${productId}`;
}
