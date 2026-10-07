/**
 * Admin Cloudinary cleanup utilities.
 * When admin cancels/closes a create/edit dialog without saving, uploaded images
 * become orphans. These helpers delete them from Cloudinary to avoid storage bloat.
 */
import { adminService } from '@/services/admin';

function isCloudinaryUrl(url: string | undefined): boolean {
  return Boolean(url && typeof url === 'string' && url.includes('cloudinary.com'));
}

function collectUrls(...urls: (string | undefined)[]): string[] {
  return urls.filter((u): u is string => isCloudinaryUrl(u));
}

function collectFromArray(arr: (string | undefined)[] | undefined): string[] {
  if (!Array.isArray(arr)) return [];
  return collectUrls(...arr);
}

function collectFromRecord(record: Record<string, string> | undefined): string[] {
  if (!record || typeof record !== 'object') return [];
  return collectUrls(...Object.values(record));
}

function collectFromOptions(obj: Record<string, unknown> | undefined, urls: string[]): void {
  if (!obj || typeof obj !== 'object') return;
  const add = (u: string | undefined) => {
    if (isCloudinaryUrl(u)) urls.push(u);
  };
  for (const v of Object.values(obj)) {
    if (typeof v === 'string') add(v);
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, string>;
      add(o.front);
      add(o.back);
      add(o.image);
    }
  }
}

/** Collect all Cloudinary URLs from a product form (for create/edit dialogs). */
export function collectProductFormCloudinaryUrls(form: {
  images?: {
    baseImage?: string;
    backImage?: string;
    thumbnailImage?: string;
    fabricPreviewThumbnails?: string[];
    fabricImages?: { imageUrl?: string }[];
  };
  modelUrl?: string;
  environmentMapUrl?: string;
  customizationOptions?: {
    fabrics?: Array<{
      imageUrl?: string;
      previewImage?: string;
      backPreviewImage?: string;
    }>;
    optionGroups?: Array<{
      options?: Array<{
        image?: string;
        previewImage?: string;
        fabricPreviewImages?: Record<string, string>;
        backHalfFabricPreviewImages?: Record<string, string>;
        backFullFabricPreviewImages?: Record<string, string>;
        layersByFabric?: Record<string, string | { front?: string; back?: string }>;
        layersByView?: Record<string, string | { front?: string; back?: string }>;
      }>;
    }>;
  };
} | null | undefined): string[] {
  const urls: string[] = [];
  if (!form) return urls;

  const add = (u: string | undefined) => {
    if (isCloudinaryUrl(u)) urls.push(u);
  };

  const img = form.images;
  if (img) {
    add(img.baseImage);
    add(img.backImage);
    add(img.thumbnailImage);
    collectFromArray(img.fabricPreviewThumbnails).forEach((u) => urls.push(u));
    (img.fabricImages || []).forEach((f) => add(f.imageUrl));
  }
  add(form.modelUrl);
  add(form.environmentMapUrl);

  const opts = form.customizationOptions;
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
        if (o.fabricPreviewImages) collectFromRecord(o.fabricPreviewImages as Record<string, string>).forEach((u) => urls.push(u));
        if (o.backHalfFabricPreviewImages) collectFromRecord(o.backHalfFabricPreviewImages as Record<string, string>).forEach((u) => urls.push(u));
        if (o.backFullFabricPreviewImages) collectFromRecord(o.backFullFabricPreviewImages as Record<string, string>).forEach((u) => urls.push(u));
        if (o.layersByFabric) collectFromOptions(o.layersByFabric as Record<string, unknown>, urls);
        if (o.layersByView) collectFromOptions(o.layersByView as Record<string, unknown>, urls);
      });
    });
  }
  return urls;
}

/** Collect Cloudinary URLs from 3D fabric form. */
export function collect3DFabricFormCloudinaryUrls(form: {
  colorMapUrl?: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  thumbnailUrl?: string;
} | null | undefined): string[] {
  if (!form) return [];
  return collectUrls(form.colorMapUrl, form.normalMapUrl, form.roughnessMapUrl, form.thumbnailUrl);
}

/** Collect Cloudinary URLs from Generic Add dialog (2D fabrics, options). */
export function collectGenericAddFormCloudinaryUrls(data: {
  newImage?: string;
  newPreviewImage?: string;
  newFabricPreviews?: Record<string, string>;
  newBackFabricHalfPreviews?: Record<string, string>;
  newBackFabricFullPreviews?: Record<string, string>;
}): string[] {
  const urls = collectUrls(data.newImage, data.newPreviewImage);
  urls.push(...collectFromRecord(data.newFabricPreviews));
  urls.push(...collectFromRecord(data.newBackFabricHalfPreviews));
  urls.push(...collectFromRecord(data.newBackFabricFullPreviews));
  return urls;
}

/** Delete Cloudinary URLs via admin API. Fire-and-forget; failures are logged. */
export async function deleteCloudinaryUrlsFromAdmin(urls: string[], token: string | null): Promise<void> {
  if (!urls.length || !token || token === 'legacy-token') return;

  const unique = [...new Set(urls)];
  const results = await Promise.allSettled(
    unique.map((url) => adminService.deleteImageFromCloudinary(url, token))
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    console.warn('[AdminCloudinaryCleanup] Some deletions failed:', failed.length, 'of', unique.length);
  }
}
