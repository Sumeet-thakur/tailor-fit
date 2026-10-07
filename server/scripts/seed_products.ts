import mongoose from 'mongoose';
import Product from '../models/product.js';
import Fabric from '../models/fabric.js';
import { v2 as cloudinary } from 'cloudinary';
import {
    CLOUDINARY_BASE,
    idSlug,
    getProductImagePath,
    getProductFabricPreviewPath,
    getProductFabricPath,
    getProductOptionPath,
    getProductOptionVariantPath,
    getProduct3DTextureMapPath,
    getProductAssetsFolder
} from '../constants/cloudinaryFolders.js';
import { compressAndUploadGLB } from '../utils/glbCompressor.js';
import { compressAndUploadHDR } from '../utils/hdrCompressor.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fabrics as pbrFabrics } from '../utils/fabricSeeder.js';

dotenv.config();

// Initialize Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Determine project root from server execution context
const PROJECT_ROOT = path.resolve(process.cwd(), '../');
const LOCAL_ASSETS_DIR = path.join(PROJECT_ROOT, 'public/tailor-fit-darosoft-assets');

/**
 * Upload wrapper with existence check.
 * Takes a FULL Cloudinary public_id (relative, from centralized helpers)
 * and prepends CLOUDINARY_BASE for the upload.
 */
async function uploadLocalAsset(localRelativePath: string, cloudinaryRelativePath: string) {
    const cleanRelPath = localRelativePath.replace(/^\//, '');
    const fullLocalPath = path.join(LOCAL_ASSETS_DIR, cleanRelPath);

    if (!fs.existsSync(fullLocalPath)) {
        console.warn(`⚠️ Warning: Local file missing: ${fullLocalPath}`);
        return null;
    }

    try {
        const fullCloudinaryPath = `${CLOUDINARY_BASE}/${cloudinaryRelativePath}`;
        console.log(`Uploading: ${fullLocalPath} -> ${fullCloudinaryPath}`);

        const lastSlashIdx = fullCloudinaryPath.lastIndexOf('/');
        const folder = fullCloudinaryPath.substring(0, lastSlashIdx);
        const customId = fullCloudinaryPath.substring(lastSlashIdx + 1);

        const is3DTexture = fullCloudinaryPath.includes('3d-fabrics/texture-maps');
        const isThumbnail = fullCloudinaryPath.includes('thumbnailUrl');
        const uploadOptions: any = {
            folder: folder,
            public_id: customId,
            overwrite: true,
            resource_type: 'auto',
            quality: is3DTexture ? 'auto:best' : 'auto',  // Texture maps get 'auto:best', others get standard 'auto' optimization
        };

        // Match the manual /api/upload/texture route: enforce WebP for 3D texture maps
        if (is3DTexture) {
            uploadOptions.format = 'webp';
            uploadOptions.width = isThumbnail ? 512 : 1024;
            uploadOptions.crop = 'limit';
        }

        const result = await cloudinary.uploader.upload(fullLocalPath, uploadOptions);
        return result.secure_url;
    } catch (error) {
        console.error(`❌ Failed to upload ${localRelativePath}:`, error);
        return null;
    }
}

/**
 * Recursive object walker to find and upload all asset paths
 */
async function processProductPayload(product: any) {
    const is3D = product.categoryType === '3d';
    const typeFolder = is3D ? '3d' : '2d';

    // Preserve static asset paths (GLB models, HDRI env maps) BEFORE JSON transform
    // These are served from public/ root, not Cloudinary
    const preservedModelUrl = product.modelUrl;
    const preservedEnvironmentMapUrl = product.environmentMapUrl;

    // Deep clone and transform local paths based on user's new directory names
    let jsonStr = JSON.stringify(product);
    jsonStr = jsonStr.replace(/\/pant-style-customization/g, '/2d-pant-style-customization');
    jsonStr = jsonStr.replace(/\/shirt-style-customization/g, '/2d-shirt-style-customization');
    // Use a negative lookahead to only replace "/3d-shirt" if it is NOT followed by "-style-customization"
    jsonStr = jsonStr.replace(/\/3d-shirt(?!-style-customization)/g, '/3d-shirt-style-customization');
    jsonStr = jsonStr.replace(/base-image-waffle-pique\.png/g, 'main-base-image-waffle-pique.png');
    const p = JSON.parse(jsonStr);

    // Restore static asset paths (they should NOT be transformed by the regex above)
    if (preservedModelUrl) p.modelUrl = preservedModelUrl;
    if (preservedEnvironmentMapUrl) p.environmentMapUrl = preservedEnvironmentMapUrl;

    let existingProduct = await Product.findOne({ name: p.name });
    if (existingProduct) {
        p._id = existingProduct._id;
        console.log(`🧹 Found existing product  updating new seeded assets (preserving admin uploads)...`);
        try {
            // REMOVED: Do not delete entire product prefix to preserve Admin uploads!
        } catch (err) {
            console.warn('⚠️ Could not cleanly delete old Cloudinary resources (may not exist):', err);
        }
    } else {
        p._id = new mongoose.Types.ObjectId();
    }
    const pid = p._id.toString();


    const cloudType = typeFolder;

    // Upload Fabrics
    if (p.customizationOptions?.fabrics) {
        for (const fabric of p.customizationOptions.fabrics) {
            if (!is3D && fabric.image && typeof fabric.image === 'string' && fabric.image.startsWith('/')) {
                const cloudPath = getProductFabricPath(p.name, fabric.id, fabric.name, 'base', undefined, cloudType, pid);
                fabric.image = await uploadLocalAsset(fabric.image, cloudPath);
                fabric.imageUrl = fabric.image;
                fabric.thumbnailUrl = fabric.image;
                fabric.colorMapUrl = fabric.image;
            }
            if (fabric.previewImage && typeof fabric.previewImage === 'string' && fabric.previewImage.startsWith('/')) {
                const cloudPath = getProductFabricPath(p.name, fabric.id, fabric.name, 'preview', undefined, cloudType, pid);
                fabric.previewImage = await uploadLocalAsset(fabric.previewImage, cloudPath);
            }
            if (fabric.backPreviewImage && typeof fabric.backPreviewImage === 'string' && fabric.backPreviewImage.startsWith('/')) {
                const cloudPath = getProductFabricPath(p.name, fabric.id, fabric.name, 'back-preview', undefined, cloudType, pid);
                fabric.backPreviewImage = await uploadLocalAsset(fabric.backPreviewImage, cloudPath);
            }
            // Strip any nested local mappings
            delete fabric.layersByFabric;
            delete fabric.layersByView;
        }
    }

    // Upload Option Groups
    if (p.customizationOptions?.optionGroups) {
        for (const group of p.customizationOptions.optionGroups) {
            for (const opt of group.options) {
                // Upload base option images (for admin thumbnail / base preview)
                if (opt.image && typeof opt.image === 'string' && opt.image.startsWith('/')) {
                    const cloudPath = getProductOptionPath(p.name, group.id, group.label || group.name, opt.id, opt.name, 'thumbnail', undefined, cloudType, pid);
                    opt.image = await uploadLocalAsset(opt.image, cloudPath);
                }
                if (opt.previewImage && typeof opt.previewImage === 'string' && opt.previewImage.startsWith('/')) {
                    const cloudPath = getProductOptionPath(p.name, group.id, group.label || group.name, opt.id, opt.name, 'preview', undefined, cloudType, pid);
                    opt.previewImage = await uploadLocalAsset(opt.previewImage, cloudPath);
                }

                // Process Fabric Mappings -> Upload -> Delete from DB Payload
                // Initialize the unified dictionary the UI expects
                opt.layersByFabric = opt.layersByFabric || {};

                if (opt.fabricPreviewImages) {
                    for (const [fabricKey, localPath] of Object.entries(opt.fabricPreviewImages)) {
                        if (typeof localPath === 'string' && localPath.startsWith('/')) {
                            const fabricObj = p.customizationOptions?.fabrics?.find((f: any) => f.id === fabricKey);
                            const cloudPath = getProductOptionVariantPath(p.name, group.id, group.label || group.name, opt.id, opt.name, fabricKey, fabricObj?.name, 'front', undefined, cloudType, pid);
                            const url = await uploadLocalAsset(localPath, cloudPath);
                            if (url) {
                                opt.layersByFabric[fabricKey] = opt.layersByFabric[fabricKey] || {};
                                opt.layersByFabric[fabricKey].front = url;
                            }
                        }
                    }
                    delete opt.fabricPreviewImages;
                }

                if (opt.backFullFabricPreviewImages) {
                    for (const [fabricKey, localPath] of Object.entries(opt.backFullFabricPreviewImages)) {
                        if (typeof localPath === 'string' && localPath.startsWith('/')) {
                            const fabricObj = p.customizationOptions?.fabrics?.find((f: any) => f.id === fabricKey);
                            const cloudPath = getProductOptionVariantPath(p.name, group.id, group.label || group.name, opt.id, opt.name, fabricKey, fabricObj?.name, 'back', undefined, cloudType, pid);
                            const url = await uploadLocalAsset(localPath, cloudPath);
                            if (url) {
                                opt.layersByFabric[fabricKey] = opt.layersByFabric[fabricKey] || {};
                                opt.layersByFabric[fabricKey].back = url;
                            }
                        }
                    }
                    delete opt.backFullFabricPreviewImages;
                }

                if (opt.backHalfFabricPreviewImages) {
                    for (const [fabricKey, localPath] of Object.entries(opt.backHalfFabricPreviewImages)) {
                        if (typeof localPath === 'string' && localPath.startsWith('/')) {
                            const fabricObj = p.customizationOptions?.fabrics?.find((f: any) => f.id === fabricKey);
                            const cloudPath = getProductOptionVariantPath(p.name, group.id, group.label || group.name, opt.id, opt.name, fabricKey, fabricObj?.name, 'back_half', undefined, cloudType, pid);
                            const url = await uploadLocalAsset(localPath, cloudPath);
                            if (url) {
                                opt.layersByFabric[fabricKey] = opt.layersByFabric[fabricKey] || {};
                                opt.layersByFabric[fabricKey].back_half = url;
                            }
                        }
                    }
                    delete opt.backHalfFabricPreviewImages;
                }

                // Pants logic has layersByFabric -> { front, back }
                // Since we need to replace local paths with Cloudinary paths, we'll re-assign
                const oldLayers = { ...opt.layersByFabric };
                opt.layersByFabric = {}; // Reset to build fresh with Cloudinary URLs

                for (const [fabricKey, localPaths] of Object.entries(oldLayers)) {
                    opt.layersByFabric[fabricKey] = {};
                    if (typeof localPaths === 'string' && localPaths.startsWith('/')) {
                        const fabricObj = p.customizationOptions?.fabrics?.find((f: any) => f.id === fabricKey);
                        const cloudPath = getProductOptionVariantPath(p.name, group.id, group.label || group.name, opt.id, opt.name, fabricKey, fabricObj?.name, 'front', undefined, cloudType, pid);
                        const url = await uploadLocalAsset(localPaths, cloudPath);
                        if (url) opt.layersByFabric[fabricKey].front = url;
                    } else if (typeof localPaths === 'object' && localPaths !== null) {
                        if ((localPaths as any).front && typeof (localPaths as any).front === 'string' && (localPaths as any).front.startsWith('/')) {
                            const fabricObj = p.customizationOptions?.fabrics?.find((f: any) => f.id === fabricKey);
                            const cloudPath = getProductOptionVariantPath(p.name, group.id, group.label || group.name, opt.id, opt.name, fabricKey, fabricObj?.name, 'front', undefined, cloudType, pid);
                            const url = await uploadLocalAsset((localPaths as any).front, cloudPath);
                            if (url) opt.layersByFabric[fabricKey].front = url;
                        } else if ((localPaths as any).front && typeof (localPaths as any).front === 'string' && (localPaths as any).front.includes('cloudinary.com')) {
                            // Already processed from the blocks above
                            opt.layersByFabric[fabricKey].front = (localPaths as any).front;
                        }

                        if ((localPaths as any).back && typeof (localPaths as any).back === 'string' && (localPaths as any).back.startsWith('/')) {
                            const fabricObj = p.customizationOptions?.fabrics?.find((f: any) => f.id === fabricKey);
                            const cloudPath = getProductOptionVariantPath(p.name, group.id, group.label || group.name, opt.id, opt.name, fabricKey, fabricObj?.name, 'back', undefined, cloudType, pid);
                            const url = await uploadLocalAsset((localPaths as any).back, cloudPath);
                            if (url) opt.layersByFabric[fabricKey].back = url;
                        } else if ((localPaths as any).back && typeof (localPaths as any).back === 'string' && (localPaths as any).back.includes('cloudinary.com')) {
                            opt.layersByFabric[fabricKey].back = (localPaths as any).back;
                        }
                    }
                }

                if (opt.layersByView) {
                    const oldViews = { ...opt.layersByView };
                    opt.layersByView = {};

                    for (const [viewKey, localPath] of Object.entries(oldViews)) {
                        if (typeof localPath === 'string' && localPath.startsWith('/')) {
                            const cloudPath = getProductOptionVariantPath(p.name, group.id, group.label || group.name, opt.id, opt.name, viewKey, undefined, viewKey, undefined, cloudType, pid);
                            const url = await uploadLocalAsset(localPath, cloudPath);
                            if (url) opt.layersByView[viewKey] = url;
                        } else if (typeof localPath === 'string' && localPath.includes('cloudinary.com')) {
                            opt.layersByView[viewKey] = localPath;
                        }
                    }
                }
            }
        }
    }

    // Core images
    if (p.images) {
        if (p.images.baseImage && p.images.baseImage.startsWith('/')) {
            const cloudPath = getProductImagePath(p.name, 'baseimage', undefined, cloudType, pid);
            p.images.baseImage = await uploadLocalAsset(p.images.baseImage, cloudPath);
        }
        if (p.images.backImage && p.images.backImage.startsWith('/')) {
            const cloudPath = getProductImagePath(p.name, 'backimage', undefined, cloudType, pid);
            p.images.backImage = await uploadLocalAsset(p.images.backImage, cloudPath);
        }
        if (p.images.thumbnailImage && p.images.thumbnailImage.startsWith('/')) {
            const cloudPath = getProductImagePath(p.name, 'thumbnailimage', undefined, cloudType, pid);
            p.images.thumbnailImage = await uploadLocalAsset(p.images.thumbnailImage, cloudPath);
        }

        // Handle Fabric Preview Thumbnails array for the Product General Tab
        if (p.images.fabricPreviewThumbnails && Array.isArray(p.images.fabricPreviewThumbnails)) {
            const uploadedThumbnails = [];
            for (let i = 0; i < p.images.fabricPreviewThumbnails.length; i++) {
                let thumb = p.images.fabricPreviewThumbnails[i];
                if (thumb && typeof thumb === 'string' && thumb.startsWith('/')) {
                    const cloudPath = getProductFabricPreviewPath(p.name, i, undefined, undefined, cloudType, pid);
                    const url = await uploadLocalAsset(thumb, cloudPath);
                    if (url) uploadedThumbnails.push(url);
                } else if (thumb && typeof thumb === 'string' && thumb.includes('cloudinary.com')) {
                    uploadedThumbnails.push(thumb);
                }
            }
            p.images.fabricPreviewThumbnails = uploadedThumbnails;
        }
    }

    return p;
}

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('MongoDB Connected');

        const args = process.argv.slice(2);
        const seedShirt = args.includes('--shirt') || args.length === 0;
        const seedPant = args.includes('--pant') || args.length === 0;
        const seed3d = args.includes('--3d') || args.length === 0;

        // No more Product.deleteMany()! We will safely update using findByIdAndUpdate.

        if (seedShirt) {
            // -------------------------
            // 1. SHIRT DATA
            // -------------------------
            const { shirtStyleProduct } = await import('../utils/shirtStyleSeed.js');
            shirtStyleProduct.name = 'Bespoke 2D Shirt';
            // @ts-ignore - Dynamically adding categoryType to the imported legacy payload
            shirtStyleProduct.categoryType = '2d';

            console.log('Processing 2D Shirt...');
            const processedShirt = await processProductPayload(shirtStyleProduct);
            await Product.findByIdAndUpdate(processedShirt._id, processedShirt, { upsert: true, returnDocument: 'after', runValidators: true });
            console.log('✅ 2D Shirt seeded successfully!');
        }

        if (seedPant) {
            // -------------------------
            // 2. PANT DATA
            // -------------------------
            const { pantStyleProduct } = await import('../utils/pantStyleSeed.js');
            pantStyleProduct.name = 'Bespoke 2D Pant';

            console.log('Processing 2D Pants...');
            const processedPant = await processProductPayload(pantStyleProduct);
            await Product.findByIdAndUpdate(processedPant._id, processedPant, { upsert: true, returnDocument: 'after', runValidators: true });
            console.log('✅ 2D Pant seeded successfully!');
        }

        if (seed3d) {
            // -------------------------
            // 3. 3D SHIRT DATA
            // -------------------------
            console.log('Seeding Standalone 3D Fabrics first...');
            const { seedFabrics } = await import('../utils/fabricSeeder.js');
            const insertedFabrics = await seedFabrics();

            // Build the 3D product payload with local fabric URLs (will be replaced after upload)
            const threeDShirtData = {
                name: 'Bespoke 3D Shirt',
                description: 'Fully interactive 3D tailored shirt.',
                categoryType: '3d',
                category: 'shirt',
                basePrice: 12500,
                // Initial fallback paths for local dev. After admin uploads via dashboard,
                // these will be replaced with Cloudinary URLs (auto-compressed by the pipeline).
                modelUrl: '/tailor-fit-darosoft-assets/3d-shirt-style-customization/models/shirt-new1.glb',
                environmentMapUrl: '/tailor-fit-darosoft-assets/3d-shirt-style-customization/hdri/brown_photostudio_02_2k.hdr',
                images: {
                    baseImage: '/3d-shirt-style-customization/base-image+waffle-pique.png',
                    thumbnailImage: '/3d-shirt-style-customization/base-image+waffle-pique.png',
                    fabricPreviewThumbnails: [
                        '/3d-shirt-style-customization/Fabric Preview Thumbnails/waffle-pique.png',
                        '/3d-shirt-style-customization/Fabric Preview Thumbnails/cotton-cross-shade.png',
                        '/3d-shirt-style-customization/Fabric Preview Thumbnails/floaral-jackuard.png',
                        '/3d-shirt-style-customization/Fabric Preview Thumbnails/gingham-check.png'
                    ]
                },
                customizationOptions: {
                    fabrics: insertedFabrics.map((f: any, i: number) => {
                        return {
                            id: `fabric-${f.category}-${i}`,
                            name: f.name,
                            color: f.baseColor,
                            colors: [f.baseColor],
                            image: f.colorMapUrl,
                            imageUrl: f.colorMapUrl,
                            priceModifier: f.price,
                            isDefault: i === 0
                        };
                    })
                },
                fabricIds: insertedFabrics.map((f: any) => f._id),
                isActive: true
            };

            // Create/update the product FIRST so we have a real productId for folder paths
            console.log('Processing 3D Shirt...');
            const processed3d = await processProductPayload(threeDShirtData);
            const saved3d = await Product.findByIdAndUpdate(processed3d._id, processed3d, { upsert: true, returnDocument: 'after', runValidators: true });
            const productId = saved3d!._id.toString();
            const productName = saved3d!.name;
            console.log('✅ 3D Shirt seeded successfully!');

            // NOW upload fabric textures into the correct per-product path:
            // products/3d/{productId}-{productSlug}/3d-fabrics/texture-maps/{fabricId}-{fabricSlug}/
            // This matches the exact same path the Admin dashboard uses via getProduct3DTextureMapPath()
            console.log('Uploading 3D Fabric texture maps into per-product folder...');
            for (const fabric of insertedFabrics) {
                let updated = false;
                const fabricId = fabric._id.toString();
                const fabricName = fabric.name;

                if (fabric.colorMapUrl && fabric.colorMapUrl.startsWith('/')) {
                    const cloudPath = getProduct3DTextureMapPath(productName, fabricId, fabricName, 'colorMap', undefined, productId);
                    const url = await uploadLocalAsset(fabric.colorMapUrl, cloudPath);
                    if (url) { fabric.colorMapUrl = url; updated = true; }
                }
                if (fabric.normalMapUrl && fabric.normalMapUrl.startsWith('/')) {
                    const cloudPath = getProduct3DTextureMapPath(productName, fabricId, fabricName, 'normalMap', undefined, productId);
                    const url = await uploadLocalAsset(fabric.normalMapUrl, cloudPath);
                    if (url) { fabric.normalMapUrl = url; updated = true; }
                }
                if (fabric.roughnessMapUrl && fabric.roughnessMapUrl.startsWith('/')) {
                    const cloudPath = getProduct3DTextureMapPath(productName, fabricId, fabricName, 'roughnessMap', undefined, productId);
                    const url = await uploadLocalAsset(fabric.roughnessMapUrl, cloudPath);
                    if (url) { fabric.roughnessMapUrl = url; updated = true; }
                }
                if (fabric.thumbnailUrl && fabric.thumbnailUrl.startsWith('/')) {
                    const cloudPath = getProduct3DTextureMapPath(productName, fabricId, fabricName, 'thumbnail', undefined, productId);
                    const url = await uploadLocalAsset(fabric.thumbnailUrl, cloudPath);
                    if (url) { fabric.thumbnailUrl = url; updated = true; }
                } else if (!fabric.thumbnailUrl && fabric.colorMapUrl && fabric.colorMapUrl.startsWith('/')) {
                    // Parity with manual admin upload: auto-generate a 512px thumbnail from the 2K color map
                    const cloudPath = getProduct3DTextureMapPath(productName, fabricId, fabricName, 'thumbnail', undefined, productId);
                    const url = await uploadLocalAsset(fabric.colorMapUrl, cloudPath);
                    if (url) { fabric.thumbnailUrl = url; updated = true; }
                }

                if (updated) {
                    await Fabric.findByIdAndUpdate(fabric._id, {
                        colorMapUrl: fabric.colorMapUrl,
                        normalMapUrl: fabric.normalMapUrl,
                        roughnessMapUrl: fabric.roughnessMapUrl,
                        thumbnailUrl: fabric.thumbnailUrl
                    });
                    console.log(`   ✅ ${fabricName} textures → products/3d/${idSlug(productId, productName)}/3d-fabrics/texture-maps/${idSlug(fabricId, fabricName)}/`);
                }
            }

            // ----------------------------------------------------
            // UPLOAD BINARY GLB & HDR ASSETS USING CLI COMPRESSION
            // ----------------------------------------------------
            console.log('Compressing and uploading GLB Model & HDR Environment Map...');

            let updatedModelUrl = saved3d.modelUrl;
            let updatedHdrUrl = saved3d.environmentMapUrl;

            // GLB/HDR live in public/ root, NOT inside tailor-fit-darosoft-assets/
            // CRITICAL: compressAndUploadGLB/HDR DELETE inputPath in their finally blocks.
            // We MUST copy the source file to /tmp/ first to protect the originals.
            const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

            try {
                if (saved3d.modelUrl && saved3d.modelUrl.startsWith('/models/')) {
                    const localPath = path.join(PUBLIC_DIR, saved3d.modelUrl.replace(/^\//, ''));
                    if (fs.existsSync(localPath)) {
                        const tmpCopy = path.join(os.tmpdir(), `seed-glb-${Date.now()}.glb`);
                        fs.copyFileSync(localPath, tmpCopy);
                        const folder = getProductAssetsFolder(productName, '3d-model', productId);
                        const fullFolder = `${CLOUDINARY_BASE}/${folder}`;
                        const customId = `model-${productId}`;
                        console.log(`[Seeder] Compressing GLB via pipeline: ${localPath}`);
                        const glbRes = await compressAndUploadGLB(tmpCopy, fullFolder, customId);
                        updatedModelUrl = glbRes.cloudinaryUrl;
                        console.log(`[Seeder] ✅ GLB compressed: ${glbRes.originalBytes} → ${glbRes.compressedBytes} (${glbRes.savingsPercent}% saved)`);
                    } else {
                        console.warn(`⚠️ GLB file not found at: ${localPath}`);
                    }
                }

                if (saved3d.environmentMapUrl && saved3d.environmentMapUrl.endsWith('.hdr')) {
                    const localPath = path.join(PUBLIC_DIR, saved3d.environmentMapUrl.replace(/^\//, ''));
                    if (fs.existsSync(localPath)) {
                        const tmpCopy = path.join(os.tmpdir(), `seed-hdr-${Date.now()}.hdr`);
                        fs.copyFileSync(localPath, tmpCopy);
                        const folder = getProductAssetsFolder(productName, 'environment-map', productId);
                        const fullFolder = `${CLOUDINARY_BASE}/${folder}`;
                        const customId = `hdr-${productId}`;
                        console.log(`[Seeder] Downscaling HDR via ffmpeg: ${localPath}`);
                        const hdrRes = await compressAndUploadHDR(tmpCopy, fullFolder, customId, 1024);
                        updatedHdrUrl = hdrRes.cloudinaryUrl;
                        console.log(`[Seeder] ✅ HDR compressed: ${hdrRes.originalBytes} → ${hdrRes.compressedBytes} (${hdrRes.savingsPercent}% saved)`);
                    } else {
                        console.warn(`⚠️ HDR file not found at: ${localPath}`);
                    }
                }
            } catch (err) {
                console.error('Failed to compress GLB/HDR during seeding:', err);
                console.log('Falling back to local URLs for binary assets.');
            }

            // Update the product record with the new Cloudinary fabric URLs & Assets
            const updatedFabrics = insertedFabrics.map((f: any, i: number) => ({
                id: `fabric-${f.category}-${i}`,
                name: f.name,
                color: f.baseColor,
                colors: [f.baseColor],
                image: f.colorMapUrl,
                imageUrl: f.colorMapUrl,
                priceModifier: f.price,
                isDefault: i === 0
            }));
            await Product.findByIdAndUpdate(productId, {
                'customizationOptions.fabrics': updatedFabrics,
                modelUrl: updatedModelUrl,
                environmentMapUrl: updatedHdrUrl
            });
            console.log('✅ 3D product fabric URLs and binary assets updated with Cloudinary paths.');
        }

        console.log('🎉 All seeder tasks completed.');
        process.exit(0);

    } catch (err) {
        console.error('Seeder Failure:', err);
        process.exit(1);
    }
};

seed();
