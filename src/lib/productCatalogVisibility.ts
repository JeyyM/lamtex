/** Greyscale styling for hidden catalog rows/cards. */
export const CATALOG_HIDDEN_CLASS = 'grayscale opacity-60';

export function isCategoryCatalogHidden(isActive: boolean | null | undefined): boolean {
  return isActive === false;
}

export function isVariantCatalogHidden(
  variantHidden: boolean | null | undefined,
  categoryActive: boolean | null | undefined = true,
): boolean {
  if (isCategoryCatalogHidden(categoryActive)) return true;
  return variantHidden === true;
}

/** Hidden when category is inactive or every variant is hidden. */
export function isProductFamilyCatalogHidden(
  variants: Array<{ is_hidden?: boolean | null }>,
  categoryActive: boolean | null | undefined = true,
): boolean {
  if (isCategoryCatalogHidden(categoryActive)) return true;
  if (variants.length === 0) return false;
  return variants.every((v) => v.is_hidden === true);
}

export function catalogHiddenClassForFamily(
  variants: Array<{ is_hidden?: boolean | null }>,
  categoryActive: boolean | null | undefined = true,
): string {
  return isProductFamilyCatalogHidden(variants, categoryActive) ? CATALOG_HIDDEN_CLASS : '';
}

export function catalogHiddenClassForVariant(
  variantHidden: boolean | null | undefined,
  categoryActive: boolean | null | undefined = true,
): string {
  return isVariantCatalogHidden(variantHidden, categoryActive) ? CATALOG_HIDDEN_CLASS : '';
}
