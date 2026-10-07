import { cloudinary } from '../config/cloudinary.js';

/**
 * Checks if a URL is a Cloudinary URL and acts as a type guard.
 */
export function isCloudinaryUrl(url: string | undefined | null): url is string {
  return Boolean(url && typeof url === 'string' && url.includes('cloudinary.com'));
}

/** Transformation segments: w_100, f_auto, q_auto, c_fill, etc. */
const TRANSFORM_PATTERN = /^[a-z]_[a-z0-9_,]+$/i;

/**
 * Extracts Cloudinary public_id from a URL or path.
 * Handles: .../upload/[transformations]/v{version}/{public_id}.{ext}
 * or .../upload/[transformations]/{public_id}.{ext}
 */
export function extractPublicIdFromUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com')) return null;

  const withoutQuery = url.split('?')[0];
  // Match /v{version}/{public_id}.{ext} - public_id can have slashes
  const withVersion = withoutQuery.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|webp|gif)$/i);
  if (withVersion) return withVersion[1];

  // Fallback: no version - parse path, skip transformation segments
  const uploadIdx = withoutQuery.indexOf('/upload/');
  if (uploadIdx === -1) return null;
  const afterUpload = withoutQuery.slice(uploadIdx + 8);
  const parts = afterUpload.split('/');
  if (!parts.length) return null;
  const last = parts[parts.length - 1];
  const extMatch = last.match(/^(.+)\.(jpg|jpeg|png|webp|gif)$/i);
  if (!extMatch) return null;
  const lastBase = extMatch[1];
  const versionIdx = parts.findIndex((p) => /^v\d+$/.test(p));
  let fromIdx = versionIdx >= 0 ? versionIdx + 1 : 0;
  // Skip transformation segments (e.g. f_auto,q_auto, w_500)
  while (fromIdx < parts.length && TRANSFORM_PATTERN.test(parts[fromIdx])) {
    fromIdx++;
  }
  const publicIdParts = parts.slice(fromIdx);
  if (!publicIdParts.length) return null;
  publicIdParts[publicIdParts.length - 1] = lastBase;
  return publicIdParts.join('/');
}

/**
 * Extracts folder prefix from a URL (e.g. tailor-fit/fabrics-3d/fabric-name from .../fabric-name/colorMap.png).
 * Use with delete_resources_by_prefix to delete all assets in that folder.
 */
export function extractFolderPrefixFromUrl(url: string | undefined): string | null {
  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) return null;
  const lastSlash = publicId.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  return publicId.slice(0, lastSlash) + '/';
}

/**
 * Deletes an image from Cloudinary by URL.
 * Returns true if deleted, false if not a Cloudinary URL or already deleted.
 * Logs failures for monitoring.
 */
export async function deleteFromCloudinaryByUrl(url: string | undefined): Promise<boolean> {
  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    const ok = result.result === 'ok' || result.result === 'not found';
    if (!ok && result.result !== 'not found') {
      console.error('[Cloudinary] Delete failed:', { publicId, result: result.result });
    }
    return ok;
  } catch (err) {
    console.error('[Cloudinary] Delete error:', { publicId, error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/**
 * Renames a folder by moving all assets from oldPrefix to newPrefix.
 * Use when updating fabric/option/group names.
 */
export async function renameFolderByPrefix(oldPrefix: string, newPrefix: string): Promise<{ renamed: number }> {
  if (!oldPrefix?.endsWith('/') || !newPrefix?.endsWith('/') || oldPrefix === newPrefix) return { renamed: 0 };
  let renamed = 0;
  try {
    const result = await cloudinary.api.resources({ prefix: oldPrefix, type: 'upload', max_results: 500 });
    const resources = result.resources || [];
    const oldBase = oldPrefix.slice(0, -1);
    const newBase = newPrefix.slice(0, -1);
    for (const r of resources) {
      const fromId = r.public_id;
      const suffix = fromId.startsWith(oldBase) ? fromId.slice(oldBase.length) : fromId.split('/').pop() || '';
      const toId = (newBase + suffix).replace(/\.[^.]+$/, '');
      if (fromId === toId) continue;
      try {
        await cloudinary.uploader.rename(fromId, toId);
        renamed++;
      } catch (e) {
        console.warn('[Cloudinary] Rename failed:', { fromId, toId, error: e instanceof Error ? e.message : String(e) });
      }
    }
  } catch (err) {
    console.error('[Cloudinary] Rename folder error:', { oldPrefix, error: err instanceof Error ? err.message : String(err) });
  }
  return { renamed };
}

/**
 * Deletes all assets under a prefix (folder) and optionally the folder itself.
 * Use when deleting fabrics to ensure no orphaned assets or empty folders remain.
 */
export async function deleteByPrefix(prefix: string): Promise<{ deleted: number }> {
  if (!prefix || !prefix.endsWith('/')) return { deleted: 0 };
  let total = 0;
  try {
    for (const resourceType of ['image', 'raw'] as const) {
      const result = await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: resourceType });
      const deleted = result.deleted ? Object.keys(result.deleted).length : 0;
      total += deleted;
    }

    // Attempt to recursively delete the empty folder and its empty parents
    let currentFolder = prefix.slice(0, -1);
    while (currentFolder.includes('/')) {
      try {
        await cloudinary.api.delete_folder(currentFolder);
        currentFolder = currentFolder.split('/').slice(0, -1).join('/');
      } catch (err) {
        // Stop going up the tree if a folder isn't empty yet or permission is denied
        break;
      }
    }
  } catch (err) {
    console.error('[Cloudinary] Delete by prefix error:', { prefix, error: err instanceof Error ? err.message : String(err) });
  }
  return { deleted: total };
}

/**
 * Batch delete multiple images from Cloudinary.
 * Only processes Cloudinary URLs; skips others.
 * Returns count of successfully deleted.
 * Logs summary when any failures occur.
 */
export async function deleteManyFromCloudinary(urls: (string | undefined)[]): Promise<number> {
  const cloudinaryUrls = urls.filter((u): u is string => isCloudinaryUrl(u));
  if (cloudinaryUrls.length === 0) return 0;

  let deleted = 0;
  for (const url of cloudinaryUrls) {
    const ok = await deleteFromCloudinaryByUrl(url);
    if (ok) deleted++;
  }
  if (deleted < cloudinaryUrls.length) {
    console.warn('[Cloudinary] Batch delete partial:', { deleted, total: cloudinaryUrls.length });
  }
  return deleted;
}

/** Helper to extract URLs from mixed object (layersByFabric, fabricPreviewImages, etc.) */
function extractUrlsFromMixed(obj: unknown, urls: string[]): void {
  if (!obj || typeof obj !== 'object') return;
  const add = (url: string | undefined) => {
    if (isCloudinaryUrl(url)) urls.push(url);
  };
  const values = Object.values(obj);
  for (const v of values) {
    if (typeof v === 'string') add(v);
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, string>;
      add(o.front);
      add(o.back);
      add(o.image);
    }
  }
}

/** Product document shape for extracting image URLs */
export interface ProductLike {
  images?: {
    baseImage?: string | null;
    backImage?: string | null;
    thumbnailImage?: string | null;
    gallery?: string[];
    fabricPreviewThumbnails?: string[];
    fabricImages?: Array<{ imageUrl?: string | null }>;
  } | null;
  modelUrl?: string | null;
  environmentMapUrl?: string | null;
  customizationOptions?: {
    fabrics?: Array<{
      imageUrl?: string | null;
      previewImage?: string | null;
      backPreviewImage?: string | null;
    }>;
    optionGroups?: Array<{
      options?: Array<{
        image?: string | null;
        previewImage?: string | null;
        fabricPreviewImages?: Record<string, string>;
        backHalfFabricPreviewImages?: Record<string, string>;
        backFullFabricPreviewImages?: Record<string, string>;
        layersByFabric?: Record<string, string | { front?: string; back?: string }>;
        layersByView?: Record<string, string | { front?: string; back?: string }>;
      }>;
    }>;
  } | null;
}

/**
 * Collects all Cloudinary image URLs from a product document.
 */
export function extractCloudinaryUrlsFromProduct(product: ProductLike | null | undefined): string[] {
  const urls: string[] = [];
  if (!product) return urls;

  const add = (url: string | undefined | null) => {
    if (isCloudinaryUrl(url)) urls.push(url);
  };

  const img = product.images;
  if (img) {
    add(img.baseImage);
    add(img.backImage);
    add(img.thumbnailImage);
    (img.gallery || []).forEach(url => add(url));
    (img.fabricPreviewThumbnails || []).forEach(url => add(url));
    (img.fabricImages || []).forEach((f) => add(f.imageUrl));
  }
  add(product.modelUrl);
  add(product.environmentMapUrl);

  const opts = product.customizationOptions;
  if (opts?.fabrics) {
    opts.fabrics.forEach((f) => {
      add(f.imageUrl);
      add(f.previewImage);
      add(f.backPreviewImage);
    });
  }
  if (opts?.optionGroups) {
    opts.optionGroups.forEach((g) => {
      (g.options || []).forEach((o) => {
        add(o.image);
        add(o.previewImage);
        extractUrlsFromMixed(o.fabricPreviewImages, urls);
        extractUrlsFromMixed(o.backHalfFabricPreviewImages, urls);
        extractUrlsFromMixed(o.backFullFabricPreviewImages, urls);
        extractUrlsFromMixed(o.layersByFabric, urls);
        extractUrlsFromMixed(o.layersByView, urls);
      });
    });
  }
  return urls;
}

/** Fabric document shape */
export interface FabricLike {
  colorMapUrl?: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Collects all Cloudinary image URLs from a 3D fabric document.
 */
export function extractCloudinaryUrlsFromFabric(fabric: FabricLike | null | undefined): string[] {
  const urls: string[] = [];
  if (!fabric) return urls;
  const add = (url: string | undefined) => {
    if (isCloudinaryUrl(url)) urls.push(url);
  };
  add(fabric.colorMapUrl);
  add(fabric.normalMapUrl);
  add(fabric.roughnessMapUrl);
  add(fabric.thumbnailUrl);
  return urls;
}

/** Saved design shape */
export interface SavedDesignLike {
  screenshot?: string;
  baseImage?: string;
  fabric?: { image?: string; previewImage?: string; backPreviewImage?: string };
}

/**
 * Collects Cloudinary URLs from a saved design (e.g. screenshot).
 */
export function extractCloudinaryUrlsFromDesign(design: SavedDesignLike | null | undefined): string[] {
  const urls: string[] = [];
  if (!design) return urls;
  const add = (url: string | undefined) => {
    if (isCloudinaryUrl(url)) urls.push(url as string);
  };
  // SAFETY: Only delete the screenshot generated for this specific design.
  // Do NOT delete baseImage or fabric images as they belong to the product/fabric.
  add(design.screenshot);

  return urls;
}

/** Order item shape */
export interface OrderItemLike {
  baseImage?: string;
  screenshot?: string;
}

/**
 * Collects Cloudinary URLs from order items (baseImage, screenshot).
 */
export function extractCloudinaryUrlsFromOrder(order: { items?: OrderItemLike[] } | null | undefined): string[] {
  const urls: string[] = [];
  if (!order?.items) return urls;
  const add = (url: string | undefined) => {
    if (isCloudinaryUrl(url)) urls.push(url);
  };
  order.items.forEach((item) => {
    add(item.baseImage);
    add(item.screenshot);
  });
  return urls;
}

/**
 * Collects only screenshot URLs from order items.
 * Use when deleting order - baseImage may be product image (don't delete).
 */
export function extractCloudinaryScreenshotUrlsFromOrder(order: { items?: OrderItemLike[] } | null | undefined): string[] {
  const urls: string[] = [];
  if (!order?.items) return urls;
  const add = (url: string | undefined) => {
    if (isCloudinaryUrl(url)) urls.push(url);
  };
  order.items.forEach((item) => add(item.screenshot));
  return urls;
}
