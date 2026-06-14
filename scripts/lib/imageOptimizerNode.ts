import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  IMAGE_MAX_DIMENSION,
  IMAGE_OUTPUT_EXT,
  IMAGE_OUTPUT_MIME,
  IMAGE_TARGET_QUALITY,
} from '../../src/lib/imageOptimizationConfig.js';

export type NodeOptimizeResult = {
  buffer: Buffer;
  fileName: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
};

export function normalizeCatalogFileName(originalName: string): string {
  const stem = path.basename(originalName, path.extname(originalName))
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
  return `${stem || 'image'}${IMAGE_OUTPUT_EXT}`;
}

/** Resize + WebP encode — mirrors client-side `optimizeImage` settings. */
export async function optimizeImageFile(inputPath: string): Promise<NodeOptimizeResult> {
  const originalBuffer = await fs.readFile(inputPath);
  const originalSize = originalBuffer.length;
  const fileName = normalizeCatalogFileName(path.basename(inputPath));

  const image = sharp(originalBuffer, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  let width = meta.width ?? IMAGE_MAX_DIMENSION;
  let height = meta.height ?? IMAGE_MAX_DIMENSION;

  if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
    if (width >= height) {
      height = Math.round((height / width) * IMAGE_MAX_DIMENSION);
      width = IMAGE_MAX_DIMENSION;
    } else {
      width = Math.round((width / height) * IMAGE_MAX_DIMENSION);
      height = IMAGE_MAX_DIMENSION;
    }
  }

  const buffer = await image
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: Math.round(IMAGE_TARGET_QUALITY * 100) })
    .toBuffer();

  return {
    buffer,
    fileName,
    originalSize,
    optimizedSize: buffer.length,
    width,
    height,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const IMAGE_MIME = IMAGE_OUTPUT_MIME;
