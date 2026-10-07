import type { Fabric3D, FabricCategory } from '@/types/fabric';
import { getImageUrl, getThumbnailImageUrl, get3DTextureUrl } from '@/utils/imageHelper';
import { apiClient } from '@/lib/apiClient';

/**
 * Fetch all active fabrics, or fabrics for a specific product when productId is provided
 */
export async function fetchFabrics(productId?: string): Promise<Fabric3D[]> {
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    return apiClient.get<Fabric3D[]>(`/fabrics${query}`);
}

/**
 * Fetch fabrics by category
 */
export async function fetchFabricsByCategory(category: FabricCategory): Promise<Fabric3D[]> {
    return apiClient.get<Fabric3D[]>(`/fabrics/category/${category}`);
}

/**
 * Get full URL for texture files (use for 3D preview, screenshot, etc.)
 * Routes through Cloudinary 2K lossless WebP transform for optimal download size.
 */
export function getTextureUrl(texturePath: string | undefined): string | undefined {
    return get3DTextureUrl(texturePath);
}

/**
 * Get thumbnail URL for lists/buttons - uses Cloudinary resize when possible.
 * Always prefers thumbnailUrl (uploaded optimized swatch) over colorMapUrl.
 * Falls back to colorMapUrl (via Cloudinary resize transform) only when
 * thumbnailUrl is not available. This ensures the SAME thumbnail is used
 * across Admin Dashboard, 3D Customizer, Shop By Fabric, etc.
 *
 * @param fabric - Fabric object
 * @param _forTextureSelection - Deprecated, kept for API compat. Ignored.
 */
export function getFabricThumbnailUrl(
    fabric: { thumbnailUrl?: string; colorMapUrl?: string } | undefined,
    _forTextureSelection = false
): string | undefined {
    if (!fabric) return undefined;
    // Always prefer the dedicated thumbnail (small, optimized WebP)
    const url = fabric.thumbnailUrl || fabric.colorMapUrl;
    if (!url) return undefined;
    return getThumbnailImageUrl(url);
}
