/** Matches ProductCategoryPage navigation: `family` id is the product row id. */
export function finishedGoodProductHref(productId: string, categorySlug?: string | null): string {
  const slug = (categorySlug ?? '').trim();
  if (!slug) return `/products/${productId}`;
  return `/products/category/${encodeURIComponent(slug)}/family/${productId}`;
}

/** Raw material detail: category slug from `material_categories.slug` when available. */
export function rawMaterialDetailHref(materialId: string, categorySlug?: string | null): string {
  const slug = (categorySlug ?? '').trim();
  if (!slug) return `/materials/${materialId}`;
  return `/materials/category/${encodeURIComponent(slug)}/details/${materialId}`;
}
