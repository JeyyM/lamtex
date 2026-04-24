/**
 * Client-side image optimizer using the Canvas API.
 *
 * - Resizes to fit within MAX_DIMENSION × MAX_DIMENSION (preserving aspect ratio)
 * - Converts to WebP at TARGET_QUALITY
 * - Falls back to JPEG if WebP is not supported by the browser
 * - Returns a new File whose size is typically 80-95% smaller than the original
 */

const MAX_DIMENSION = 1280;   // px — longest edge
const TARGET_QUALITY = 0.82;  // 0–1 (WebP quality)

export interface OptimizeResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
}

export async function optimizeImage(original: File): Promise<OptimizeResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(original);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down to fit within MAX_DIMENSION, preserving aspect ratio
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first, fall back to JPEG
      const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';
      const ext = mimeType === 'image/webp' ? '.webp' : '.jpg';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }
          // Keep the original filename stem, just swap the extension
          const stem = original.name.replace(/\.[^.]+$/, '').replace(/\s+/g, '-').toLowerCase();
          const optimizedFile = new File([blob], `${stem}${ext}`, { type: mimeType });
          resolve({
            file: optimizedFile,
            originalSize: original.size,
            optimizedSize: optimizedFile.size,
            width,
            height,
          });
        },
        mimeType,
        TARGET_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for optimization'));
    };

    img.src = objectUrl;
  });
}

/** Human-readable file size string, e.g. "1.2 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
