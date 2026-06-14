import { IMAGE_GALLERY_BUCKET } from '@/src/lib/storageConstants';

/** Supabase Storage folder for product catalog images (categories + families). */
export const PRODUCT_CATALOG_IMAGES_FOLDER = 'product-images';

/** Supabase Storage folder for raw material catalog images. */
export const RAW_MATERIAL_CATALOG_IMAGES_FOLDER = 'raw-materials';

export function catalogImageStoragePath(folder: string, fileName: string): string {
  return folder ? `${folder}/${fileName}` : fileName;
}

/** True when the URL points at our public Supabase `images` bucket. */
export function isSupabaseCatalogImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return url.includes(`/storage/v1/object/public/${IMAGE_GALLERY_BUCKET}/`);
}

function catalogFolderInUrl(url: string, folder: string): boolean {
  return url.includes(`/storage/v1/object/public/${IMAGE_GALLERY_BUCKET}/${folder}/`);
}

/** Catalog image seeded under `product-images/` (categories + product families). */
export function isProductCatalogImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return catalogFolderInUrl(url, PRODUCT_CATALOG_IMAGES_FOLDER);
}

/** Catalog image seeded under `raw-materials/`. */
export function isRawMaterialCatalogImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return catalogFolderInUrl(url, RAW_MATERIAL_CATALOG_IMAGES_FOLDER);
}

export function getCatalogImagePublicUrl(
  supabaseUrl: string,
  folder: string,
  fileName: string,
): string {
  const base = supabaseUrl.replace(/\/$/, '');
  const path = catalogImageStoragePath(folder, fileName);
  return `${base}/storage/v1/object/public/${IMAGE_GALLERY_BUCKET}/${path}`;
}
