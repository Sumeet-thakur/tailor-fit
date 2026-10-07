import { cloudinary } from '../config/cloudinary.js';
import Product from '../models/product.js';
import Fabric from '../models/fabric.js';
import { extractCloudinaryUrlsFromProduct, extractCloudinaryUrlsFromFabric, extractPublicIdFromUrl } from './cloudinaryDelete.js';
import { CLOUDINARY_BASE } from '../constants/cloudinaryFolders.js';

interface ReconResult {
    totalCloudinaryFiles: number;
    totalDbReferences: number;
    orphansFound: number;
    assetsDeleted: number;
    spaceSavedBytes: number;
}

/**
 * Searches Cloudinary for all assets under the current environment's base folder,
 * cross-references them against all active MongoDB records, and deletes the orphans.
 */
export const runFullReconciliation = async (): Promise<ReconResult> => {
    console.log(`[Recon] Starting Cloudinary Reconciliation for base: ${CLOUDINARY_BASE}...`);

    try {
        // 1. Fetch all assets from Cloudinary in the active environment's products & fabrics folders.
        // We only care about products and fabrics as they are the primary source of orphan bloat.
        // We intentionally ignore `customers` and `orders` as those are handled by distinct, strict lifecycles.
        const foldersToScan = [
            `${CLOUDINARY_BASE}/products`,
            `${CLOUDINARY_BASE}/fabrics`
        ];

        let allCloudinaryAssets: any[] = [];

        for (const folder of foldersToScan) {
            let nextCursor: string | undefined = undefined;
            do {
                const result: any = await cloudinary.api.resources({
                    type: 'upload',
                    prefix: folder,
                    max_results: 500,
                    next_cursor: nextCursor,
                });

                allCloudinaryAssets = allCloudinaryAssets.concat(result.resources);
                nextCursor = result.next_cursor;
            } while (nextCursor);
        }

        console.log(`[Recon] Cloudinary scan complete. Found ${allCloudinaryAssets.length} total files.`);

        // 2. Fetch all MongoDB references
        const [products, fabrics] = await Promise.all([
            Product.find().lean(),
            Fabric.find().lean()
        ]);

        let activeUrls: string[] = [];

        for (const p of products) {
            activeUrls = activeUrls.concat(extractCloudinaryUrlsFromProduct(p as any));
        }
        for (const f of fabrics) {
            activeUrls = activeUrls.concat(extractCloudinaryUrlsFromFabric(f as any));
        }

        // Convert active URLs to a Set of Public IDs for fast O(1) matching
        const activePublicIds = new Set<string>();
        for (const url of activeUrls) {
            const pid = extractPublicIdFromUrl(url);
            if (pid) activePublicIds.add(pid);
        }

        console.log(`[Recon] DB scan complete. Found ${activePublicIds.size} unique active references.`);

        // 3. Diff: Find Cloudinary assets that do NOT exist in the MongoDB Set
        const orphanAssets = allCloudinaryAssets.filter(asset => {
            // asset.public_id is precisely what we extract from DB URLs
            return !activePublicIds.has(asset.public_id);
        });

        console.log(`[Recon] Diff complete. Detected ${orphanAssets.length} orphaned files.`);

        const result: ReconResult = {
            totalCloudinaryFiles: allCloudinaryAssets.length,
            totalDbReferences: activePublicIds.size,
            orphansFound: orphanAssets.length,
            assetsDeleted: 0,
            spaceSavedBytes: 0,
        };

        // 4. Destroy Orchans
        if (orphanAssets.length > 0) {
            const pidsToDelete = orphanAssets.map(a => a.public_id);

            // Calculate bytes saved
            result.spaceSavedBytes = orphanAssets.reduce((total, asset) => total + (asset.bytes || 0), 0);

            // Delete in batches of 100 as per Cloudinary limits
            const batchSize = 100;
            for (let i = 0; i < pidsToDelete.length; i += batchSize) {
                const batch = pidsToDelete.slice(i, i + batchSize);
                console.log(`[Recon] Deleting batch of ${batch.length} orphans...`);
                const delResult = await cloudinary.api.delete_resources(batch);

                // Count successful deletions
                if (delResult.deleted) {
                    result.assetsDeleted += Object.values(delResult.deleted).filter(status => status === 'deleted').length;
                }
            }

            console.log(`[Recon] Cleanup complete. Deleted ${result.assetsDeleted} files, saving ${formatBytes(result.spaceSavedBytes)}.`);
        }

        return result;

    } catch (error) {
        console.error('[Recon] Critical failure during Cloudinary reconciliation:', error);
        throw error;
    }
};

// Helper for human-readable bytes
function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
