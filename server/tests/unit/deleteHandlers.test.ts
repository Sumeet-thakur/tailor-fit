import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteProductWithAssets } from '../../utils/deleteHandlers.js';
import Product from '../../models/product.js';
import { Types } from 'mongoose';

// Mock cloudinaryDelete.js
vi.mock('../../utils/cloudinaryDelete.js', () => ({
    extractCloudinaryUrlsFromProduct: vi.fn(() => ['url1', 'url2']),
    deleteManyFromCloudinary: vi.fn(() => Promise.resolve(2)),
    deleteByPrefix: vi.fn(() => Promise.resolve({ deleted: 5 })),
    extractFolderPrefixFromUrl: vi.fn(),
    extractCloudinaryUrlsFromFabric: vi.fn(),
    extractCloudinaryScreenshotUrlsFromOrder: vi.fn(),
    extractCloudinaryUrlsFromDesign: vi.fn(),
}));

import { deleteManyFromCloudinary, deleteByPrefix } from '../../utils/cloudinaryDelete.js';

// Mock constants
vi.mock('../../constants/cloudinaryFolders.js', () => ({
    getProductFolderPrefixForDelete: vi.fn(() => 'products/2d/test-slug'),
}));


describe('deleteHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('deleteProductWithAssets', () => {
        it('should delete product, its assets, and its folder', async () => {
            // Create product
            const product = await Product.create({
                name: 'Test Product',
                description: 'Test Description',
                slug: 'test-product',
                basePrice: 100,
                categoryType: '2d',
                images: {
                    baseImage: 'http://cloudinary.com/image.jpg',
                },
            }) as any;

            const result = await deleteProductWithAssets(product._id.toString());

            expect(result.deleted).toBe(true);
            // 2 assets from extractCloudinaryUrls. deleteByPrefix runs in background now.
            expect(result.assetsDeleted).toBe(2);

            // Verify product deleted from DB
            const found = await Product.findById(product._id);
            expect(found).toBeNull();

            // Verify mocks called
            expect(deleteManyFromCloudinary).toHaveBeenCalled();
            expect(deleteByPrefix).toHaveBeenCalledWith('products/2d/test-slug'); // Mocked return
        });

        it('should return false if product not found', async () => {
            const result = await deleteProductWithAssets(new Types.ObjectId().toString());
            expect(result.deleted).toBe(false);
            expect(result.assetsDeleted).toBe(0);
        });
    });
});
