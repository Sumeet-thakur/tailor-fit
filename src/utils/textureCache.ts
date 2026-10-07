/**
 * Texture cache with anisotropic filtering.
 * Extracted from ProductPreview3D to fix HMR Fast Refresh compatibility
 * (component files must only export React components).
 *
 * Anisotropic filtering eliminates moiré / wavy-line artifacts that appear
 * when a repeating texture is viewed at an angle under directional light.
 */
import * as THREE from 'three';
import { getTextureUrl } from '@/services/fabricService';

// --- Texture cache: loads textures asynchronously and keeps the previous texture visible until new one is ready ---
const textureCache = new Map<string, THREE.Texture>();
const loadingPromises = new Map<string, Promise<THREE.Texture>>();
const textureLoader = new THREE.TextureLoader();

export function loadCachedTexture(url: string): THREE.Texture | null {
    if (textureCache.has(url)) return textureCache.get(url)!;
    if (!loadingPromises.has(url)) {
        const promise = new Promise<THREE.Texture>((resolve) => {
            textureLoader.load(url, (tex) => {
                // Enable anisotropic filtering to prevent moiré patterns
                tex.anisotropy = 16;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.generateMipmaps = true;

                textureCache.set(url, tex);
                loadingPromises.delete(url);
                resolve(tex);
            }, undefined, () => {
                // On error, resolve with empty to avoid hanging
                loadingPromises.delete(url);
                resolve(null as unknown as THREE.Texture);
            });
        });
        loadingPromises.set(url, promise);
    }
    return null; // Not yet loaded
}

// Preload a fabric's textures so they're cached before user selects them
export function preloadFabricTextures(fabric: any) {
    if (!fabric) return;
    const isValidUrl = (url: string | undefined) => url && url.length > 5 && !url.includes('undefined') && !url.includes('null');
    const urls = [fabric.colorMapUrl || fabric.image, fabric.normalMapUrl, fabric.roughnessMapUrl].filter(isValidUrl);
    urls.forEach(url => {
        const fullUrl = getTextureUrl(url);
        if (fullUrl && !textureCache.has(fullUrl)) loadCachedTexture(fullUrl);
    });
}

export { textureCache, loadingPromises };
