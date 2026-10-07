import * as htmlToImage from 'html-to-image';
import { apiClient } from '@/lib/apiClient';
import { ApiError } from '@/lib/apiClient';
import { getCustomerDesignsFolder, getCustomerCartFolder } from '@/lib/cloudinaryFolders';

interface ScreenshotOptions {
    quality?: number;
    format?: 'png' | 'jpeg' | 'webp';
    scale?: number;
}

/** Delay before 2D/3D capture to allow transitions to settle (ms). Reduced for faster UX. */
export const SCREENSHOT_STABILIZE_DELAY = 100;

/** Delay in captureElement for style application (ms). Reduced for speed. */
const CAPTURE_STYLE_DELAY = 50;

export class ScreenshotService {
    /**
     * Ensures all images are loaded before capture
     */
    private static async ensureImagesLoaded(element: HTMLElement): Promise<void> {
        const images = element.querySelectorAll('img');
        const imagePromises = Array.from(images).map((img) => {
            return new Promise<void>((resolve) => {
                if (img.complete && img.naturalHeight !== 0) {
                    resolve();
                } else {
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // Resolve even on error to not block
                    // Trigger reload if stuck
                    if (!img.complete) {
                        const src = img.src;
                        img.src = '';
                        img.src = src;
                    }
                }
            });
        });
        await Promise.all(imagePromises);
    }

    /**
     * Stabilizes element before capture (removes animations, ensures visibility)
     */
    private static stabilizeElement(element: HTMLElement): () => void {
        const originalStyles: Map<HTMLElement, string> = new Map();

        // Get all img elements
        const images = element.querySelectorAll('img');

        images.forEach((img) => {
            const htmlImg = img as HTMLElement;
            // Store original style
            originalStyles.set(htmlImg, htmlImg.style.cssText);

            // Force stable styles
            htmlImg.style.setProperty('opacity', '1', 'important');
            htmlImg.style.setProperty('visibility', 'visible', 'important');
            htmlImg.style.setProperty('transition', 'none', 'important');
            htmlImg.style.setProperty('animation', 'none', 'important');
            htmlImg.style.setProperty('display', 'block', 'important');
            htmlImg.style.setProperty('filter', 'none', 'important');
        });

        // Also stabilize the container
        const container = element as HTMLElement;
        if (!originalStyles.has(container)) {
            originalStyles.set(container, container.style.cssText);
        }
        container.style.setProperty('transition', 'none', 'important');
        container.style.setProperty('animation', 'none', 'important');
        
        // === ASPECT RATIO FIX ===
        // Apply dimensions directly before capture (replaces onclone logic)
        const targets = Array.from(element.querySelectorAll('[data-screenshot-target]'));
        if (element.matches && element.matches('[data-screenshot-target]')) {
            targets.push(element);
        }
        
        targets.forEach((target) => {
            const el = target as HTMLElement;
            if (!originalStyles.has(el)) originalStyles.set(el, el.style.cssText);

            const productType = el.dataset.productType || 'shirt';

            if (productType === 'pants') {
                // Pants are taller/narrower: 230px width / 400px height
                el.style.width = '230px';
                el.style.height = '400px';
            } else {
                // Shirts are standard: 300px width / 380px height
                el.style.width = '300px';
                el.style.height = '380px';
            }

            el.style.maxWidth = 'none';

            // Force all images inside to FILL this new container
            const innerImages = el.querySelectorAll('img');
            innerImages.forEach((img) => {
                const imgEl = img as HTMLElement;
                if (!originalStyles.has(imgEl)) originalStyles.set(imgEl, imgEl.style.cssText);
                imgEl.style.objectFit = 'contain';
                imgEl.style.width = '100%';
                imgEl.style.height = '100%';
                imgEl.style.maxWidth = 'none';
                imgEl.style.maxHeight = 'none';
            });
        });

        // Return cleanup function
        return () => {
            // Restore backwards to prevent layout jumps
            const entries = Array.from(originalStyles.entries()).reverse();
            for (const [el, style] of entries) {
                el.style.cssText = style;
            }
        };
    }

    /**
     * Captures DOM element and converts to Blob
     */
    static async captureElement(
        element: HTMLElement,
        options: ScreenshotOptions = {}
    ): Promise<Blob> {
        const {
            quality = 0.95,
            format = 'png',
            scale = 2
        } = options;

        let cleanup: (() => void) | null = null;

        try {
            await this.ensureImagesLoaded(element);
            cleanup = this.stabilizeElement(element);

            await new Promise(resolve => setTimeout(resolve, CAPTURE_STYLE_DELAY));

            // Capture using html-to-image settings
            const h2iOptions = {
                pixelRatio: scale,
                quality: quality,
                cacheBust: true,
                skipFonts: true, // Speeds up capture when web fonts are complex
                style: {
                    margin: '0',
                    padding: '0'
                }
            };

            let blob: Blob | null = null;
            if (format === 'webp') {
                // To get webp, generate canvas then export blob
                const canvas = await htmlToImage.toCanvas(element, h2iOptions);
                blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(
                        (b) => {
                            if (b) resolve(b);
                            else reject(new Error('Failed to create webp blob from canvas'));
                        },
                        `image/${format}`,
                        quality
                    );
                });
            } else if (format === 'jpeg') {
                const dataUrl = await htmlToImage.toJpeg(element, h2iOptions);
                blob = await (await fetch(dataUrl)).blob();
            } else {
                // Default SVG-to-PNG
                blob = await htmlToImage.toBlob(element, h2iOptions);
            }

            if (!blob) throw new Error('Failed to create blob from element');
            
            return blob;

        } catch (error) {
            console.error('Screenshot capture failed:', error);
            throw new Error('Failed to capture preview image');
        } finally {
            if (cleanup) {
                cleanup();
            }
        }
    }

    /**
     * Simple slugify helper for folder names
     */
    private static slugify(text: string): string {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')     // Replace spaces with -
            .replace(/&/g, '-and-')   // Replace & with 'and'
            .replace(/[^\w\-]+/g, '') // Remove all non-word chars
            .replace(/\-\-+/g, '-')   // Replace multiple - with single -
            .replace(/^-+/, '')       // Trim - from start of text
            .replace(/-+$/, '');      // Trim - from end of text
    }

    /**
     * Captures and uploads to Cloudinary with structured path
     */
    static async captureAndUpload(
        element: HTMLElement,
        productType: 'shirt' | 'pants',
        productName: string,
        folderType: 'saved-designs' | 'cart-items' = 'saved-designs',
        customerId?: string,
        customerName?: string
    ): Promise<string> {
        try {
            // Capture screenshot with WebP for transparency and size
            const blob = await this.captureElement(element, {
                format: 'webp',
                quality: 0.9
            });

            return await this.uploadImage(blob, productType, productName, folderType, customerId, customerName);
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    /**
     * Uploads a Blob directly to the backend with structured path.
     * If customerId is provided, uploads to customers/{id}/saved-designs/{slug}/ or customers/{id}/cart/{slug}/
     */
    static async uploadImage(
        blob: Blob,
        productType: 'shirt' | 'pants' | 'suit' = 'shirt',
        productName: string = 'custom-product',
        folderType: 'saved-designs' | 'cart-items' = 'saved-designs',
        customerId?: string,
        customerName?: string
    ): Promise<string> {
        try {
            const formData = new FormData();
            const slug = this.slugify(productName);

            // Construct structured filename: {slug}-preview-{timestamp}.webp
            // Cloudinary public_id should not include extension if we want clean IDs, 
            // but the filename sent to multer usually implies format.
            // server/config/cloudinary.ts uses custom_public_id if present.
            const timestamp = Date.now();
            const publicId = `${slug}-preview-${timestamp}`;
            const filename = `${publicId}.webp`;

            // Construct per-customer folder path: customers/{id}/saved-designs/{slug} or customers/{id}/cart/{slug}
            // Falls back to a generic path if customerId is not available
            let folderPath: string;
            if (customerId) {
                folderPath = folderType === 'saved-designs'
                    ? getCustomerDesignsFolder(customerId, slug, customerName)
                    : getCustomerCartFolder(customerId, slug, customerName);
            } else {
                // Fallback for guest/unauthenticated users
                const baseFolder = folderType === 'saved-designs' ? 'saved-designs' : 'cart';
                folderPath = `${baseFolder}/${slug}`;
            }

            // IMPORTANT: Append text fields BEFORE file so multer can read them in req.body
            // before processing the file storage configuration.
            formData.append('folder', folderPath);
            formData.append('custom_public_id', publicId);
            formData.append('image', blob, filename);

            // Upload to backend
            const data = await apiClient.upload<{ path: string }>('/upload', formData);
            return data.path;
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    /**
     * Captures 2D preview element and uploads. 
     */
    static async capture2DAndUpload(
        element: HTMLElement | null,
        productType: 'shirt' | 'pants',
        productName: string,
        folderType: 'saved-designs' | 'cart-items' = 'saved-designs',
        fallbackPlaceholder = '/images/placeholders/shirt.svg',
        customerId?: string,
        customerName?: string
    ): Promise<string> {
        if (!element) return fallbackPlaceholder;
        try {
            const blob = await this.captureElement(element, { format: 'webp', quality: 0.9 });
            const path = await this.uploadImage(blob, productType, productName, folderType, customerId, customerName);
            return path || fallbackPlaceholder;
        } catch (err) {
            console.error('2D screenshot capture failed:', err);
            return fallbackPlaceholder;
        }
    }

    /**
     * Captures 3D preview from data URL and uploads.
     */
    static async capture3DAndUpload(
        dataUrl: string | null | undefined,
        productType: 'shirt' | 'pants',
        productName: string,
        folderType: 'saved-designs' | 'cart-items' = 'saved-designs',
        fallbackPlaceholder = '',
        customerId?: string,
        customerName?: string
    ): Promise<string> {
        if (!dataUrl) return fallbackPlaceholder;
        try {
            const blob = await (await fetch(dataUrl)).blob();
            const path = await this.uploadImage(blob, productType, productName, folderType, customerId, customerName);
            return path || fallbackPlaceholder;
        } catch (err) {
            console.error('3D screenshot upload failed:', err);
            return dataUrl || fallbackPlaceholder; // Fallback to base64 data URL if upload fails
        }
    }
}
