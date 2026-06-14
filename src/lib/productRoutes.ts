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

/** Branch code → uncategorized category slug (matches DB `branch_uncategorized_slug`). */
export function uncategorizedCategorySlugForBranchCode(branchCode?: string | null): string {
  const code = (branchCode ?? '').trim().toUpperCase();
  if (code === 'MNL') return 'm-uncategorized';
  if (code === 'CEB') return 'c-uncategorized';
  if (code === 'BTG') return 'b-uncategorized';
  if (!code) return 'm-uncategorized';
  return `${code.toLowerCase()}-uncategorized`;
}

/** Infer uncategorized slug from branch display name or product branch string. */
export function uncategorizedCategorySlugForBranchName(branchName?: string | null): string {
  const b = (branchName ?? '').trim().toLowerCase();
  if (!b) return 'm-uncategorized';
  if (b.startsWith('manila') || b === 'ncr') return 'm-uncategorized';
  if (b.startsWith('cebu') || b.includes('visayas')) return 'c-uncategorized';
  if (b.startsWith('batangas') || b.includes('calabarzon')) return 'b-uncategorized';
  if (b.startsWith('quezon') || b === 'qzn') return 'qzn-uncategorized';
  return 'm-uncategorized';
}

/** Matches ProductCategoryPage navigation: `family` id is the product row id. */
export function finishedGoodProductHref(
  productId: string,
  categorySlug?: string | null,
  branchName?: string | null,
): string {
  let slug = normalizeCategorySlug(categorySlug);
  if (slug === 'uncategorized') {
    slug = uncategorizedCategorySlugForBranchName(branchName);
  }
  return `/products/category/${encodeURIComponent(slug)}/family/${productId}`;
}

/** Raw material detail: category slug from `material_categories.slug` when available. */
export function rawMaterialDetailHref(
  materialId: string,
  categorySlug?: string | null,
  branchName?: string | null,
): string {
  let slug = normalizeCategorySlug(categorySlug);
  if (slug === 'uncategorized') {
    slug = uncategorizedCategorySlugForBranchName(branchName);
  }
  return `/materials/category/${encodeURIComponent(slug)}/details/${materialId}`;
}
