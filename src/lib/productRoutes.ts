export const UNCATEGORIZED_CATEGORY_SLUG = 'uncategorized';

function normalizeCategorySlug(slug?: string | null, name?: string | null): string {
  const fromSlug = (slug ?? '').trim();
  if (fromSlug) return fromSlug;
  const fromName = (name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return fromName || UNCATEGORIZED_CATEGORY_SLUG;
}

/** Product category list page — `:categoryName` is `product_categories.slug`. */
export function productCategoryHref(
  categorySlug?: string | null,
  categoryName?: string | null,
  branchName?: string | null,
): string {
  const slug = normalizeCategorySlug(categorySlug, categoryName);
  if (isUncategorizedProductCategorySlug(slug) && branchName?.trim()) {
    return `/products/category/${encodeURIComponent(UNCATEGORIZED_CATEGORY_SLUG)}?branch=${encodeURIComponent(branchName.trim())}`;
  }
  return `/products/category/${encodeURIComponent(slug)}`;
}

/** Material category list page — `:categoryName` is `material_categories.slug`. */
export function materialCategoryHref(
  categorySlug?: string | null,
  categoryName?: string | null,
  branchName?: string | null,
): string {
  const slug = normalizeCategorySlug(categorySlug, categoryName);
  if (isUncategorizedProductCategorySlug(slug) && branchName?.trim()) {
    return `/materials/category/${encodeURIComponent(UNCATEGORIZED_CATEGORY_SLUG)}?branch=${encodeURIComponent(branchName.trim())}`;
  }
  return `/materials/category/${encodeURIComponent(slug)}`;
}

/** Uncategorized slug is the same on every branch (`branch` / `branch_id` disambiguates). */
export function uncategorizedCategorySlugForBranchCode(_branchCode?: string | null): string {
  return UNCATEGORIZED_CATEGORY_SLUG;
}

export function uncategorizedCategorySlugForBranchName(_branchName?: string | null): string {
  return UNCATEGORIZED_CATEGORY_SLUG;
}

export function isUncategorizedProductCategorySlug(slug?: string | null): boolean {
  const s = (slug ?? '').trim().toLowerCase();
  return s === UNCATEGORIZED_CATEGORY_SLUG || s.endsWith('-uncategorized');
}

/** Map legacy slugs (m-uncategorized, etc.) to the standard route slug. */
export function normalizeProductCategorySlugParam(slug?: string | null): string {
  if (isUncategorizedProductCategorySlug(slug)) return UNCATEGORIZED_CATEGORY_SLUG;
  return (slug ?? '').trim();
}

/** Friendly label for category pickers. */
export function productCategoryOptionLabel(name: string, slug?: string | null): string {
  if (isUncategorizedProductCategorySlug(slug)) return 'Uncategorized';
  return name;
}

/** Matches ProductCategoryPage navigation: `family` id is the product row id. */
export function finishedGoodProductHref(
  productId: string,
  categorySlug?: string | null,
  branchName?: string | null,
): string {
  const slug = normalizeProductCategorySlugParam(normalizeCategorySlug(categorySlug));
  if (slug === UNCATEGORIZED_CATEGORY_SLUG && branchName?.trim()) {
    return `/products/category/${encodeURIComponent(slug)}/family/${productId}?branch=${encodeURIComponent(branchName.trim())}`;
  }
  return `/products/category/${encodeURIComponent(slug)}/family/${productId}`;
}

/** Raw material detail: category slug from `material_categories.slug` when available. */
export function rawMaterialDetailHref(
  materialId: string,
  categorySlug?: string | null,
  branchName?: string | null,
): string {
  const slug = normalizeProductCategorySlugParam(normalizeCategorySlug(categorySlug));
  if (slug === UNCATEGORIZED_CATEGORY_SLUG && branchName?.trim()) {
    return `/materials/category/${encodeURIComponent(slug)}/details/${materialId}?branch=${encodeURIComponent(branchName.trim())}`;
  }
  return `/materials/category/${encodeURIComponent(slug)}/details/${materialId}`;
}
