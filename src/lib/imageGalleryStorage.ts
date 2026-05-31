import { supabase } from '@/src/lib/supabase';
import { ORDER_PROOF_GALLERY_FOLDER } from '@/src/lib/orderProofPayments';

export const IMAGE_GALLERY_BUCKET = 'images';

export type GalleryImage = {
  name: string;
  url: string;
  created_at: string;
  size: number;
};

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.jfif', '.bmp'];

function isImageFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function mapStorageFile(
  folder: string,
  f: { name: string; created_at?: string; metadata?: Record<string, unknown> | null },
): GalleryImage {
  const filePath = folder ? `${folder}/${f.name}` : f.name;
  const { data: urlData } = supabase.storage.from(IMAGE_GALLERY_BUCKET).getPublicUrl(filePath);
  return {
    name: f.name,
    url: urlData.publicUrl,
    created_at: f.created_at ?? new Date().toISOString(),
    size: Number(f.metadata?.size ?? 0) || 0,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function listStorageFolderOnce(folder: string): Promise<GalleryImage[]> {
  const path = folder || '';
  // Avoid sortBy — it hits Postgres on storage.objects and often times out on large buckets.
  const { data, error } = await supabase.storage.from(IMAGE_GALLERY_BUCKET).list(path, { limit: 200 });
  if (error) throw error;
  const files = (data ?? []).filter(
    (f) => f.name && !f.name.startsWith('.') && isImageFileName(f.name),
  );
  return files.map((f) => mapStorageFile(folder, f));
}

async function listStorageFolderWithRetry(folder: string): Promise<GalleryImage[]> {
  const attempt = () => withTimeout(listStorageFolderOnce(folder), 20000, 'Storage list');
  try {
    return await attempt();
  } catch {
    await new Promise((r) => setTimeout(r, 600));
    return await attempt();
  }
}

export function parseOrderProofGalleryFolder(folder: string): { orderId: string; proofType: string } | null {
  const prefix = `${ORDER_PROOF_GALLERY_FOLDER}/`;
  if (!folder.startsWith(prefix)) return null;
  const rest = folder.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  return { orderId: rest.slice(0, slash), proofType: rest.slice(slash + 1) };
}

async function listOrderProofImagesFromDb(orderId: string, proofType: string): Promise<GalleryImage[]> {
  const { data, error } = await supabase
    .from('order_proof_documents')
    .select('file_name, file_url, uploaded_at, file_size')
    .eq('order_id', orderId)
    .eq('type', proofType)
    .order('uploaded_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  return (data ?? [])
    .filter((row) => {
      const name = row.file_name ?? row.file_url?.split('/').pop() ?? '';
      return row.file_url && isImageFileName(name);
    })
    .map((row) => ({
      name: row.file_name ?? row.file_url.split('/').pop() ?? 'image',
      url: row.file_url,
      created_at: row.uploaded_at ?? new Date().toISOString(),
      size: Number(row.file_size ?? 0) || 0,
    }));
}

function dedupeGalleryImages(images: GalleryImage[]): GalleryImage[] {
  const seen = new Set<string>();
  const out: GalleryImage[] = [];
  for (const img of images) {
    if (seen.has(img.url)) continue;
    seen.add(img.url);
    out.push(img);
  }
  return out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/** Load gallery images from storage; order-proof folders also merge proof rows from the DB. */
export async function fetchGalleryImages(folder: string): Promise<GalleryImage[]> {
  const parsed = parseOrderProofGalleryFolder(folder);
  let storageImages: GalleryImage[] = [];
  let storageError: Error | null = null;

  try {
    storageImages = await listStorageFolderWithRetry(folder);
  } catch (err) {
    storageError = err instanceof Error ? err : new Error(String(err));
  }

  if (parsed) {
    const dbImages = await listOrderProofImagesFromDb(parsed.orderId, parsed.proofType);
    if (storageError) {
      if (dbImages.length > 0) return dedupeGalleryImages(dbImages);
      throw storageError;
    }
    return dedupeGalleryImages([...storageImages, ...dbImages]);
  }

  if (storageError) throw storageError;
  return dedupeGalleryImages(storageImages);
}
