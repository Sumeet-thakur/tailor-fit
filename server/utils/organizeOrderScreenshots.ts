import { cloudinary } from '../config/cloudinary.js';
import { isCloudinaryUrl, extractPublicIdFromUrl } from './cloudinaryDelete.js';
import { CLOUDINARY_BASE } from '../constants/cloudinaryFolders.js';

/**
 * Simple slugify helper (same as frontend for consistency)
 */
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/&/g, '-and-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

interface OrderItem {
    productName: string;
    screenshot?: string;
    [key: string]: any;
}

/**
 * Moves and renames screenshots from 'cart-items' (or temp) to 'orders/{orderNumber}/'.
 * Returns the updated items array with new screenshot URLs.
 */
export async function organizeOrderScreenshots(
    items: OrderItem[],
    orderNumber: string
): Promise<OrderItem[]> {
    const updatedItems = [...items];
    const orderFolder = `${CLOUDINARY_BASE}/orders/${orderNumber}`;

    console.log(`[OrderOrganizer] Starting for order ${orderNumber}. Found ${updatedItems.length} items.`);

    // Process items in parallel
    await Promise.all(
        updatedItems.map(async (item, index) => {
            if (!item.screenshot) {
                console.log(`[OrderOrganizer] Item ${index}: No screenshot, skipping.`);
                return;
            }
            if (!isCloudinaryUrl(item.screenshot)) {
                console.log(`[OrderOrganizer] Item ${index}: Not a Cloudinary URL (${item.screenshot}), skipping.`);
                return;
            }

            const currentPublicId = extractPublicIdFromUrl(item.screenshot);
            if (!currentPublicId) {
                console.log(`[OrderOrganizer] Item ${index}: Failed to extract public ID from ${item.screenshot}, skipping.`);
                return;
            }

            // Skip if already in orders folder
            if (currentPublicId.includes(`orders/${orderNumber}`)) {
                console.log(`[OrderOrganizer] Item ${index}: Already in order folder (${currentPublicId}), skipping.`);
                return;
            }

            try {
                const timestamp = Date.now();
                const slug = slugify(item.productName || 'custom-product');
                // Unique name: {slug}-preview-{timestamp}-{index} (index to avoid collisions with same product)
                const newPublicId = `${orderFolder}/${slug}-preview-${timestamp}-${index}`;

                console.log(`[OrderOrganizer] Item ${index}: Copying ${item.screenshot} -> ${newPublicId}`);

                // Cloudinary 'upload' with remote URL to perform a cross-folder copy
                // This ensures the customizer/cart still works if the user goes back or fails payment
                const result = await cloudinary.uploader.upload(item.screenshot, {
                    public_id: newPublicId,
                    overwrite: true,
                    invalidate: true,
                });

                // Update the item's screenshot URL
                if (result.secure_url) {
                    updatedItems[index].screenshot = result.secure_url;
                } else {
                    updatedItems[index].screenshot = result.url || result.secure_url;
                }

                console.log(`[OrderOrganizer] Item ${index}: Successfully copied to ${updatedItems[index].screenshot}`);
            } catch (error: any) {
                console.error(
                    `[OrderOrganizer] Failed to copy screenshot for order ${orderNumber} item ${index}:`,
                    error.message
                );
                // If copy fails, we keep the old URL (it still points to the asset)
            }
        })
    );

    return updatedItems;
}
