import express, { type Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import Product from '../../models/product.js';
import { protectAdmin, requireSuperAdmin } from '../../middleware/adminAuth.js';
import { runFullReconciliation } from '../../utils/cloudinaryReconciliation.js';
import { CLOUDINARY_BASE } from '../../constants/cloudinaryFolders.js';

const router = express.Router();

// Delete image from Cloudinary (admin only)
router.post('/upload/delete', protectAdmin, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        // Return immediately so the UI doesn't freeze
        res.json({ success: true, message: 'Deletion queued' });

        // Run in background
        (async () => {
            try {
                // ... logic to extract publicId ...
                const parts = url.split('/');
                const versionIndex = parts.findIndex(p => p.startsWith('v') && !isNaN(Number(p.substring(1))));
                if (versionIndex === -1) return;
                const publicIdWithExt = parts.slice(versionIndex + 1).join('/');
                const dotIndex = publicIdWithExt.lastIndexOf('.');
                const publicId = dotIndex > -1 ? publicIdWithExt.substring(0, dotIndex) : publicIdWithExt;

                const result = await cloudinary.uploader.destroy(publicId);
                if (result.result !== 'ok') {
                    console.log('[Admin] Cloudinary background delete result:', result);
                }
            } catch (err) {
                console.error('[Admin] Cloudinary background delete error:', err);
            }
        })();
    } catch (err) {
        console.error('[Admin] Cloudinary delete setup error:', err);
        res.status(500).json({ success: false, error: 'Failed to queue image deletion' });
    }
});

// Delete multiple images and their folder from Cloudinary (admin only)
router.post('/upload/delete-many', protectAdmin, async (req, res) => {
    try {
        const { urls } = req.body;
        if (!Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ success: false, error: 'urls array is required' });
        }

        res.json({ success: true, message: 'Deletion queued for multiple images' });

        (async () => {
            try {
                // Extract public_ids
                const publicIds = urls.map((url: string) => {
                    try {
                        if (!url.includes('cloudinary.com')) return url; // Assume it's already a public_id
                        const parts = url.split('/');
                        const versionIndex = parts.findIndex(p => p.startsWith('v') && !isNaN(Number(p.substring(1))));
                        if (versionIndex === -1) return null;
                        const publicIdWithExt = parts.slice(versionIndex + 1).join('/');
                        return publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
                    } catch (e) {
                        return null;
                    }
                }).filter(id => id !== null) as string[];

                if (publicIds.length > 0) {
                    await cloudinary.api.delete_resources(publicIds);
                }
            } catch (err) {
                console.error('[Admin] Cloudinary background delete-many error:', err);
            }
        })();
    } catch (err) {
        console.error('[Admin] Cloudinary delete-many setup error:', err);
        res.status(500).json({ success: false, error: 'Failed to queue images for deletion' });
    }
});

// Delete by folder prefix (admin only) - for option groups, options, etc.
router.post('/upload/delete-by-prefix', protectAdmin, async (req, res) => {
    try {
        const { prefix } = req.body;
        if (!prefix || typeof prefix !== 'string') {
            return res.status(400).json({ success: false, error: 'prefix is required' });
        }

        res.json({ success: true, message: 'Folder deletion queued in background' });

        (async () => {
            try {
                // Ensure the prefix contains the environment namespace (e.g. dev/tailor-fit/)
                let safePrefix = prefix;
                if (!safePrefix.startsWith(CLOUDINARY_BASE)) {
                    safePrefix = `${CLOUDINARY_BASE}/${safePrefix}`;
                }
                safePrefix = safePrefix.replace(/\/\/+/g, '/'); // Remove double slashes

                console.log('[Admin] Deleting resources by prefix in background:', safePrefix);

                // 1. Delete all files within this prefix and sub-prefixes
                await cloudinary.api.delete_resources_by_prefix(safePrefix);

                // 2. Recursively delete all empty nested subfolders using DFS (Bottom-Up)
                const deleteFolderRecursive = async (folderPath: string) => {
                    try {
                        const result = await cloudinary.api.sub_folders(folderPath);
                        if (result && result.folders) {
                            // Recursively delve into deeper directories first
                            for (const sub of result.folders) {
                                await deleteFolderRecursive(sub.path);
                            }
                        }
                    } catch (e: any) {
                        // Ignore if folder doesn't exist
                    }

                    // Attempt to delete this folder now that its children should be gone
                    try {
                        if (folderPath !== safePrefix) {
                            await cloudinary.api.delete_folder(folderPath);
                        }
                    } catch (e: any) {
                        if (e?.error?.http_code !== 404 && e?.error?.http_code !== 400) {
                            console.warn(`[Admin] Could not delete subfolder ${folderPath}`, e);
                        }
                    }
                };

                await deleteFolderRecursive(safePrefix);

                // 3. Delete the parent folder itself
                try {
                    await cloudinary.api.delete_folder(safePrefix);
                } catch (e: any) {
                    if (e?.error?.http_code !== 404 && e?.error?.http_code !== 400) {
                        console.warn(`[Admin] Could not delete main folder ${safePrefix}`, e);
                    }
                }
            } catch (err) {
                console.error('[Admin] Background delete-by-prefix error:', err);
            }
        })();
    } catch (err) {
        console.error('[Admin] Cloudinary delete-by-prefix setup error:', err);
        res.status(500).json({ success: false, error: 'Failed to queue delete by prefix' });
    }
});

// Fabric usage count (how many products reference this fabric in fabricIds)
router.get('/fabric-usage/:id', protectAdmin, async (req, res) => {
    try {
        const count = await Product.countDocuments({ fabricIds: req.params.id });
        res.json({ success: true, count });
    } catch (err) {
        console.error('[Admin] Asset usage error:', err);
        res.status(500).json({ success: false, error: 'Failed to get asset usage' });
    }
});

// Run deep Cloudinary <-> MongoDB reconciliation (Super Admin only)
router.post('/reconcile-cloudinary', protectAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const result = await runFullReconciliation();
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[Admin] Cloudinary reconciliation error:', err);
        res.status(500).json({ success: false, error: 'Failed to run Cloudinary reconciliation' });
    }
});

export default router;
