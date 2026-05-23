function normalizeCategorySlug(slug?: string | null, name?: string | null): string {
  const fromSlug = (slug ?? '').trim();
  if (fromSlug) return fromSlug;
  const fromName = (name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return fromName || 'uncategorized';
}

/** Product category list page — `:categoryName` is `product_categories.slug`. */
export function productCategoryHref(categorySlug?: string | null, categoryName?: string | null): string {
  return `/products/category/${encodeURIComponent(normalizeCategorySlug(categorySlug, categoryName))}`;
}

/** Material category list page — `:categoryName` is `material_categories.slug`. */
export function materialCategoryHref(categorySlug?: string | null, categoryName?: string | null): string {
  return `/materials/category/${encodeURIComponent(normalizeCategorySlug(categorySlug, categoryName))}`;
}

/** Matches ProductCategoryPage navigation: `family` id is the product row id. */
export function finishedGoodProductHref(productId: string, categorySlug?: string | null): string {
  const slug = normalizeCategorySlug(categorySlug);
  if (slug === 'uncategorized') return `/products/${productId}`;
  return `/products/category/${encodeURIComponent(slug)}/family/${productId}`;
}

/** Raw material detail: category slug from `material_categories.slug` when available. */
export function rawMaterialDetailHref(materialId: string, categorySlug?: string | null): string {
  const slug = normalizeCategorySlug(categorySlug);
  if (slug === 'uncategorized') return `/materials/${materialId}`;
  return `/materials/category/${encodeURIComponent(slug)}/details/${materialId}`;
}
