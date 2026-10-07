import { PLACEHOLDERS, getProductPlaceholder } from '@/lib/placeholders';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

// ─── Cloudinary Delivery Transform Presets ────────────────────────────────────
// Rule: NEVER hardcode f_webp — always use f_auto so Cloudinary serves
// AVIF → WebP → JPEG based on the browser. f_webp locks out AVIF savings.

/** Base delivery: auto-format + auto-quality. Used for showcase, base, and full product images. */
const CLD_AUTO = 'f_auto,q_auto';

/**
 * Small thumbnail: 256px limit, auto-format, auto-quality.
 * Use for: fabric swatches, step icons, option buttons, tiny inline previews.
 */
const CLD_THUMB_SMALL = 'w_256,h_256,c_limit,f_auto,q_auto';

/**
 * Medium thumbnail: 512px limit, auto-format, auto-quality.
 * Use for: admin edit boxes (h-40 previews), product card images in lists,
 * option group cards, anywhere the display box is under ~500px wide.
 */
const CLD_THUMB_MEDIUM = 'w_512,h_512,c_limit,f_auto,q_auto';

/**
 * 3D PBR texture: 2048px limit, best quality, auto-format.
 * Use for: colorMap, normalMap, roughnessMap in Three.js rendering.
 * q_auto:best preserves fabric micro-detail for tiled rendering.
 */
const CLD_3D_TEXTURE = 'w_2048,h_2048,c_limit,f_auto,q_auto:best';

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Strips any existing Cloudinary transformation segment from a URL so we can
 * apply a clean, single transform without chaining.
 *
 * Before: .../upload/f_auto,q_auto/v1/sample.jpg
 * After:  .../upload/v1/sample.jpg
 *
 * Also handles already-transformed thumbnail URLs like:
 * .../upload/w_256,h_256,c_limit,f_webp,q_auto/v1/sample.jpg
 */
function stripCloudinaryTransforms(url: string): string {
    // Match: /upload/ followed by transformation segment(s) before /v{digits}/ or the asset path
    // Transformation segments contain only: letters, digits, underscore, comma, colon, slash (chained steps)
    return url.replace(
        /\/upload\/((?!v\d+\/)[a-zA-Z0-9_,:/]+\/)*(?=v\d+\/|[^/]+\.(jpg|jpeg|png|webp|avif|gif|svg))/,
        '/upload/'
    );
}

/**
 * Applies a Cloudinary delivery transform to a clean URL.
 * Strips any existing transforms first to prevent chaining.
 */
function applyCloudinaryTransform(url: string, transform: string): string {
    if (!url.includes('/upload/')) return url;
    const clean = stripCloudinaryTransforms(url);
    return clean.replace('/upload/', `/upload/${transform}/`);
}

// ─── Core URL Resolver ────────────────────────────────────────────────────────

/**
 * Resolves any image path to a full URL.
 * For Cloudinary URLs, applies f_auto,q_auto delivery optimization (no resize).
 * This is the base function — use the semantic helpers below for specific contexts.
 */
export function getImageUrl(path: string | undefined): string | undefined {
    if (!path) return undefined;

    // Data URLs and blob URLs pass through unchanged
    if (path.startsWith('data:') || path.startsWith('blob:')) return path;

    // ── Cloudinary URLs ──
    if (path.includes('cloudinary.com')) {
        // Raw files (GLBs, HDRIs, SVGs) never get image transforms
        if (path.includes('/raw/upload/')) return path;

        if (!path.includes('/upload/')) return path;

        // Already has our auto transform → return as-is (no double-inject)
        if (path.includes('f_auto') && path.includes('q_auto')) return path;

        // Apply clean auto-format + auto-quality (strip any stale transforms first)
        return applyCloudinaryTransform(path, CLD_AUTO);
    }

    // Fix Mixed Content: replace hardcoded localhost with current API_BASE_URL
    if (path.includes('localhost:5002')) {
        return path.replace('http://localhost:5002', API_BASE_URL);
    }

    // Already a full HTTP URL (non-Cloudinary, non-localhost) → return as-is
    if (path.startsWith('http')) return path;

    // Static assets served from frontend public folder (Vite)
    const staticAssetPrefixes = [
        '/images/',
        '/2d-pant-style-customization/',
        '/2d-shirt-style-customization/',
        '/3d-shirt-style-customization/',
        '/pant-style-customization/',
        '/shirt-style-customization/',
        '/customization/',
        '/textures/',
    ];
    if (staticAssetPrefixes.some(prefix => path.startsWith(prefix))) {
        const darosoftPrefixes = [
            '/2d-pant-style-customization/',
            '/2d-shirt-style-customization/',
            '/3d-shirt-style-customization/',
            '/pant-style-customization/',
            '/shirt-style-customization/',
            '/customization/',
        ];
        let finalPath = path;
        if (
            darosoftPrefixes.some(prefix => path.startsWith(prefix)) &&
            !path.startsWith('/tailor-fit-darosoft-assets')
        ) {
            finalPath = `/tailor-fit-darosoft-assets${path}`;
        }
        return encodeURI(finalPath);
    }

    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ─── Semantic Delivery Helpers ────────────────────────────────────────────────

/**
 * SHOWCASE / BASE IMAGE URL
 * Returns the full-quality Cloudinary-optimized URL with NO resize transform.
 * Cloudinary auto-selects AVIF/WebP/JPEG based on browser support.
 *
 * Use for:
 * - Product base images in ProductDetail slider
 * - Fabric preview images in ProductPreview canvas layers
 * - Any full-size display context (hero images, large gallery)
 *
 * Do NOT use getThumbnailImageUrl() here — that would cap at 256/512px.
 */
export function getBaseImageUrl(path: string | undefined): string | undefined {
    // getImageUrl already adds f_auto,q_auto with no size cap — that's exactly what we want
    return getImageUrl(path);
}

/**
 * SMALL THUMBNAIL URL (256px)
 * Use for tiny UI contexts: fabric swatches, customization step icons,
 * option selector buttons, navbar cart thumbnails.
 */
export function getSmallThumbnailUrl(path: string | undefined): string | undefined {
    if (!path) return undefined;
    if (path.startsWith('data:') || path.startsWith('blob:')) return path;
    const base = getImageUrl(path);
    if (!base) return undefined;
    if (!base.includes('cloudinary.com') || base.includes('/raw/upload/')) return base;
    return applyCloudinaryTransform(base, CLD_THUMB_SMALL);
}

/**
 * MEDIUM THUMBNAIL URL (512px)
 * Use for medium-sized admin previews: product edit form image boxes,
 * product cards in listing pages, fabric management rows.
 * Larger than swatch, smaller than showcase.
 */
export function getMediumThumbnailUrl(path: string | undefined): string | undefined {
    if (!path) return undefined;
    if (path.startsWith('data:') || path.startsWith('blob:')) return path;
    const base = getImageUrl(path);
    if (!base) return undefined;
    if (!base.includes('cloudinary.com') || base.includes('/raw/upload/')) return base;
    return applyCloudinaryTransform(base, CLD_THUMB_MEDIUM);
}

/**
 * THUMBNAIL URL — backwards-compatible wrapper.
 * Defaults to small (256px) for tiny swatches.
 * Pass size='medium' for admin edit box previews.
 *
 * @deprecated Prefer getSmallThumbnailUrl() or getMediumThumbnailUrl() for clarity.
 */
export function getThumbnailImageUrl(
    path: string | undefined,
    size: 'small' | 'medium' = 'small'
): string | undefined {
    return size === 'medium' ? getMediumThumbnailUrl(path) : getSmallThumbnailUrl(path);
}

/**
 * 3D TEXTURE URL — serves stored WebP DIRECTLY, zero on-the-fly transforms.
 *
 * WHY NO TRANSFORMS:
 * The /api/upload/texture route stores PBR textures as optimized WebP
 * (format:'webp', quality:'auto:best') at upload time. The stored file IS
 * already the optimized asset. Adding any delivery transform (even f_auto or
 * w_2048) forces Cloudinary's pipeline to decode → re-process → re-encode
 * before serving — that's the 2–4 second delay seen in network logs on a
 * 20 Mbps connection. Without transforms, Cloudinary CDN serves from edge
 * cache instantly (~40–120ms).
 *
 * Use for: Three.js PBR maps — colorMap, normalMap, roughnessMap.
 * Do NOT use getImageUrl() here (it injects f_auto,q_auto → triggers pipeline).
 */
export function get3DTextureUrl(path: string | undefined): string | undefined {
    if (!path) return undefined;
    if (path.startsWith('data:') || path.startsWith('blob:')) return path;

    // Non-Cloudinary paths (localhost, blob, data) go through normal resolver
    if (!path.includes('cloudinary.com')) return getImageUrl(path);

    // Raw assets pass through as-is
    if (path.includes('/raw/upload/')) return path;

    // Strip any stale transforms that may have been saved to the DB
    // (e.g. old f_webp,q_auto segments from previous imageHelper versions)
    // then return the clean stored-file URL — no new transforms added.
    return stripCloudinaryTransforms(path);
}

// ─── Product & Avatar Helpers ─────────────────────────────────────────────────

/**
 * Returns product image URL with fallback to placeholder when missing or 404.
 * Uses getImageUrl (full quality, no resize) — for product cards use getMediumThumbnailUrl.
 */
export function getProductImageUrl(path: string | undefined, category?: string): string {
    const resolved = path ? getImageUrl(path) : undefined;
    return resolved || getProductPlaceholder(category);
}

/**
 * Returns avatar/profile image URL with fallback to default avatar when missing.
 */
export function getAvatarUrl(path: string | undefined): string {
    const resolved = path ? getSmallThumbnailUrl(path) : undefined;
    return resolved || PLACEHOLDERS.avatar;
}

/**
 * Returns slider images array for ProductDetail, Customize3DLanding, Home carousels.
 * Uses full base image URLs — no thumbnail downscaling for showcase slider.
 * Order: [Base Image, ...Gallery Images, ...Fabric Thumbnails] (or Placeholder if all empty)
 */
export function getSliderImages(
    thumbnails: string[] | undefined,
    baseImage: string | undefined,
    category?: string,
    gallery?: string[],
    galleryByFabric?: Record<string, string[]>
): string[] {
    const images: string[] = [];
    
    // 1. Base Image (always first if available)
    if (baseImage) images.push(getBaseImageUrl(baseImage) || baseImage);
    
    // 2. Gallery Images (General)
    if (gallery?.length) {
        gallery.forEach(img => {
            if (img && img !== baseImage) {
                images.push(getBaseImageUrl(img) || img);
            }
        });
    }

    // 3. Fabric-Specific Gallery Images (New)
    if (galleryByFabric) {
        Object.values(galleryByFabric).forEach(fabricImages => {
            fabricImages.forEach(img => {
                if (img && !images.includes(img)) {
                    images.push(getBaseImageUrl(img) || img);
                }
            });
        });
    }
    
    // 4. Fabric Thumbnails (Legacy/Mobile Previews)
    if (thumbnails?.length) {
        thumbnails.forEach(t => {
            if (t && !images.includes(t)) images.push(getBaseImageUrl(t) || t);
        });
    }
    
    if (images.length > 0) return images;
    
    // Fallback placeholder
    return [getProductPlaceholder(category)];
}
