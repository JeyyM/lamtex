/**
 * Upload local catalog assets to Supabase Storage (optimized WebP) and assign
 * public CDN URLs to product/material categories and catalog rows.
 *
 * Usage:
 *   npm run seed:catalog-images
 *   npm run seed:catalog-images -- --force   # re-assign even when image_url is set
 *
 * Requires in .env (or environment):
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  PRODUCT_CATALOG_IMAGES_FOLDER,
  RAW_MATERIAL_CATALOG_IMAGES_FOLDER,
  isProductCatalogImageUrl,
  isRawMaterialCatalogImageUrl,
} from '../src/lib/catalogImageStorage.js';
import { IMAGE_GALLERY_BUCKET } from '../src/lib/storageConstants.js';
import { formatBytes, IMAGE_MIME, optimizeImageFile } from './lib/imageOptimizerNode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PRODUCT_ASSETS_DIR = path.join(ROOT, 'src/assets/product-images');
const MATERIAL_ASSETS_DIR = path.join(ROOT, 'src/assets/raw-materials');

const force = process.argv.includes('--force');

function requireEnv(name: string, fallback?: string): string {
  const value = (process.env[name] ?? fallback ?? '').trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const supabaseUrl = requireEnv('SUPABASE_URL', process.env.VITE_SUPABASE_URL);
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const IMAGE_EXT = /\.(webp|avif|jpe?g|jfif|png|gif|bmp)$/i;

async function listLocalImages(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  return entries.filter((name) => IMAGE_EXT.test(name)).sort();
}

/** Deterministic pseudo-random pick from pool based on row id. */
function pickImageUrl(id: string, pool: string[]): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return pool[Math.abs(hash) % pool.length];
}

async function uploadFolder(
  localDir: string,
  storageFolder: string,
): Promise<string[]> {
  const files = await listLocalImages(localDir);
  if (files.length === 0) {
    throw new Error(`No images found in ${localDir}`);
  }

  const urls: string[] = [];
  console.log(`\nUploading ${files.length} file(s) → ${IMAGE_GALLERY_BUCKET}/${storageFolder}/`);

  for (const file of files) {
    const inputPath = path.join(localDir, file);
    const result = await optimizeImageFile(inputPath);
    const storagePath = `${storageFolder}/${result.fileName}`;
    const saved = Math.round((1 - result.optimizedSize / result.originalSize) * 100);

    const { error } = await supabase.storage.from(IMAGE_GALLERY_BUCKET).upload(
      storagePath,
      result.buffer,
      {
        contentType: IMAGE_MIME,
        cacheControl: '31536000',
        upsert: true,
      },
    );
    if (error) throw new Error(`Upload failed for ${file}: ${error.message}`);

    const { data } = supabase.storage.from(IMAGE_GALLERY_BUCKET).getPublicUrl(storagePath);
    urls.push(data.publicUrl);
    console.log(
      `  ✓ ${file} → ${result.fileName} (${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)}, ${saved}% smaller)`,
    );
  }

  return urls;
}

type CatalogRow = { id: string; image_url: string | null };

function needsImage(url: string | null, isValid: (u: string | null | undefined) => boolean): boolean {
  if (force) return true;
  if (!url?.trim()) return true;
  return !isValid(url);
}

async function assignTableImages(
  table: 'product_categories' | 'products' | 'material_categories' | 'raw_materials',
  pool: string[],
  isValid: (u: string | null | undefined) => boolean,
): Promise<number> {
  const { data, error } = await supabase.from(table).select('id, image_url');
  if (error) throw new Error(`${table} select failed: ${error.message}`);

  const rows = (data ?? []) as CatalogRow[];
  const pending = rows.filter((row) => needsImage(row.image_url, isValid));
  if (pending.length === 0) {
    console.log(`  ${table}: nothing to update`);
    return 0;
  }

  let updated = 0;
  for (const row of pending) {
    const image_url = pickImageUrl(row.id, pool);
    const { error: updateError } = await supabase
      .from(table)
      .update({ image_url })
      .eq('id', row.id);
    if (updateError) throw new Error(`${table} update ${row.id}: ${updateError.message}`);
    updated += 1;
  }

  console.log(`  ${table}: assigned ${updated} image URL(s)`);
  return updated;
}

async function syncProductGalleryImages(pool: string[]): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select('id, image_url, images');
  if (error) throw new Error(`products gallery select failed: ${error.message}`);

  let updated = 0;
  for (const row of data ?? []) {
    const primary = row.image_url as string | null;
    const gallery = (row.images as string[] | null) ?? [];
    const hasValidGallery =
      gallery.length > 0 && gallery.every((url) => isProductCatalogImageUrl(url));

    if (!force && isProductCatalogImageUrl(primary) && hasValidGallery) continue;

    const image_url = isProductCatalogImageUrl(primary) && !force
      ? primary!
      : pickImageUrl(row.id as string, pool);

    const images = hasValidGallery && !force ? gallery : [image_url];
    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url, images })
      .eq('id', row.id);
    if (updateError) throw new Error(`products gallery update ${row.id}: ${updateError.message}`);
    updated += 1;
  }

  if (updated > 0) console.log(`  products.images: synced ${updated} row(s)`);
  return updated;
}

async function main() {
  console.log('Catalog image seed');
  console.log(`  Supabase: ${supabaseUrl}`);
  console.log(`  Force re-assign: ${force ? 'yes' : 'no'}`);

  const productUrls = await uploadFolder(PRODUCT_ASSETS_DIR, PRODUCT_CATALOG_IMAGES_FOLDER);
  const materialUrls = await uploadFolder(MATERIAL_ASSETS_DIR, RAW_MATERIAL_CATALOG_IMAGES_FOLDER);

  console.log('\nAssigning image URLs in database…');
  let total = 0;
  total += await assignTableImages('product_categories', productUrls, isProductCatalogImageUrl);
  total += await assignTableImages('products', productUrls, isProductCatalogImageUrl);
  total += await syncProductGalleryImages(productUrls);
  total += await assignTableImages('material_categories', materialUrls, isRawMaterialCatalogImageUrl);
  total += await assignTableImages('raw_materials', materialUrls, isRawMaterialCatalogImageUrl);

  console.log(`\nDone — ${total} row update(s). Catalog pages should now load Supabase CDN images.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
