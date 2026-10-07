import { describe, it, expect, vi } from 'vitest';
import { getImageUrl, getThumbnailImageUrl, getProductImageUrl, getAvatarUrl, getSliderImages } from '@/utils/imageHelper';
import { PLACEHOLDERS, getProductPlaceholder } from '@/lib/placeholders';

// Mock dependencies if needed, but here we can just test the logic directly.
// The code relies on VITE_API_URL which defaults to http://localhost:5002 if not set.
// In test env, it might be undefined, so it should default to localhost:5002.

describe('imageHelper', () => {
    describe('getImageUrl', () => {
        it('should return undefined for undefined path', () => {
            expect(getImageUrl(undefined)).toBeUndefined();
        });

        it('should return data URLs as is', () => {
            const dataUrl = 'data:image/png;base64,abc';
            expect(getImageUrl(dataUrl)).toBe(dataUrl);
        });

        it('should return blob URLs as is', () => {
            const blobUrl = 'blob:http://localhost:5002/abc';
            expect(getImageUrl(blobUrl)).toBe(blobUrl);
        });

        it('should return absolute HTTP URLs as is', () => {
            const url = 'https://example.com/image.png';
            expect(getImageUrl(url)).toBe(url);
        });

        it('should return static assets relative paths as is', () => {
            expect(getImageUrl('/images/logo.png')).toBe('/images/logo.png');
            expect(getImageUrl('/textures/fabric.jpg')).toBe('/textures/fabric.jpg');
        });

        it('should encode spaces in static asset paths', () => {
            expect(getImageUrl('/pant-style-customization/Normal Fit.png')).toBe('/tailor-fit-darosoft-assets/pant-style-customization/Normal%20Fit.png');
        });

        it('should prepend API_BASE_URL for other relative paths', () => {
            // Default API_BASE_URL is http://localhost:5002
            expect(getImageUrl('uploads/image.png')).toBe('http://localhost:5002/uploads/image.png');
            expect(getImageUrl('/uploads/image.png')).toBe('http://localhost:5002/uploads/image.png');
        });

        it('should replace hardcoded localhost with API_BASE_URL', () => {
            const path = 'http://localhost:5002/uploads/image.png';
            expect(getImageUrl(path)).toBe('http://localhost:5002/uploads/image.png'); // Default matches
        });

        it('should inject cloudinary transformations', () => {
            const cloudUrl = 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg';
            const expected = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/sample.jpg';
            expect(getImageUrl(cloudUrl)).toBe(expected);
        });

        it('should not inject cloudinary transformations if already present', () => {
            const cloudUrl = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/sample.jpg';
            expect(getImageUrl(cloudUrl)).toBe(cloudUrl);
        });
    });

    describe('getThumbnailImageUrl', () => {
        it('should return undefined for undefined path', () => {
            expect(getThumbnailImageUrl(undefined)).toBeUndefined();
        });

        it('should return regular URL if not cloudinary', () => {
            const url = 'http://localhost:5002/image.png';
            expect(getThumbnailImageUrl(url)).toBe(url);
        });

        it('should inject small thumbnail transformation for cloudinary by default', () => {
            const cloudUrl = 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg';
            expect(getThumbnailImageUrl(cloudUrl)?.includes('w_256')).toBe(true);
        });

        it('should inject medium thumbnail transformation when size is medium', () => {
            const cloudUrl = 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg';
            expect(getThumbnailImageUrl(cloudUrl, 'medium')?.includes('w_512')).toBe(true);
        });
    });

    describe('getProductImageUrl', () => {
        it('should return resolved URL if path exists', () => {
            const url = 'http://example.com/img.png';
            expect(getProductImageUrl(url)).toBe(url);
        });

        it('should return placeholder if path is undefined', () => {
            expect(getProductImageUrl(undefined)).toBe(getProductPlaceholder());
        });
    });

    describe('getAvatarUrl', () => {
        it('should return resolved URL if path exists', () => {
            const url = 'http://example.com/avatar.png';
            expect(getAvatarUrl(url)).toBe(url);
        });

        it('should return default avatar if path is undefined', () => {
            expect(getAvatarUrl(undefined)).toBe(PLACEHOLDERS.avatar);
        });
    });
});
