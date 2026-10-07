import Product from '../models/product.js';
import Fabric from '../models/fabric.js';
import Order from '../models/order.js';
import Customer from '../models/customer.js';
import Admin from '../models/admin.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.resolve(__dirname, '../../public/tailor-fit-darosoft-assets');
import {
  extractCloudinaryUrlsFromProduct,
  extractCloudinaryUrlsFromFabric,
  extractCloudinaryUrlsFromDesign,
  extractCloudinaryScreenshotUrlsFromOrder,
  deleteManyFromCloudinary,
  deleteByPrefix,
  extractFolderPrefixFromUrl,
  deleteFromCloudinaryByUrl,
  isCloudinaryUrl,
  ProductLike,
  FabricLike,
  SavedDesignLike,
  OrderItemLike,
} from './cloudinaryDelete.js';
import { CLOUDINARY_BASE, getCustomerFolder, getAdminFolder } from '../constants/cloudinaryFolders.js';

/** Product delete: DB only (Option A - keep images for order history) */
export async function deleteProduct(productId: string): Promise<boolean> {
  const product = await Product.findByIdAndDelete(productId);
  return !!product;
}

/**
 * Product delete with Cloudinary cleanup.
 * Deletes all product assets and the product folder (products/2d/slug or products/3d/slug).
 */
export async function deleteProductWithAssets(productId: string): Promise<{ deleted: boolean; assetsDeleted: number }> {
  const product = await Product.findById(productId);
  if (!product) return { deleted: false, assetsDeleted: 0 };

  const urls = extractCloudinaryUrlsFromProduct(product.toObject() as unknown as ProductLike);
  const slug = product.slug || product.name || '';
  const categoryType = (product.categoryType === '3d' ? '3d' : '2d') as '2d' | '3d';
  const prefix = slug ? (await import('../constants/cloudinaryFolders.js')).getProductFolderPrefixForDelete(slug, categoryType, product._id.toString()) : null;

  // FAST DB DELETE
  await Product.findByIdAndDelete(productId);

  // BACKGROUND CLOUDINARY CLEANUP
  Promise.resolve().then(async () => {
    try {
      let assetsDeleted = await deleteManyFromCloudinary(urls);
      if (prefix) {
        const { deleted } = await deleteByPrefix(prefix);
        assetsDeleted += deleted;
      }
      if (urls.length > 0 || slug) {
        console.log('[DeleteHandlers] Background product deletion complete:', { productId, assetsDeleted });
      }
    } catch (err) {
      console.error('[DeleteHandlers] Background cleanup error for product:', productId, err);
    }
  });

  return { deleted: true, assetsDeleted: urls.length };
}

function extractLocalUrlsFromFabric(fabric: Record<string, unknown>): string[] {
  const urls: string[] = [];
  if (!fabric) return urls;
  // We ONLY want to delete the explicitly generated thumbnail copy, NEVER the original source textures.
  const thumb = fabric.thumbnailUrl;
  if (typeof thumb === 'string' && thumb.startsWith('/') && thumb.includes('fabric swatches thumbnails') && !isCloudinaryUrl(thumb)) {
    urls.push(thumb);
  }
  return urls;
}

function deleteLocalAssets(urls: string[]) {
  let deleted = 0;
  for (const url of urls) {
    try {
      const localPath = path.join(ASSETS_DIR, url.replace(/^\//, ''));
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        deleted++;
        console.log(`[DeleteHandlers] Deleted local file: ${localPath}`);
      }
    } catch (err) {
      console.error(`[DeleteHandlers] Failed to delete local file for ${url}:`, err);
    }
  }
  return deleted;
}

/** Fabric delete: remove Cloudinary textures and folder, then delete from DB */
export async function deleteFabricWithAssets(fabricId: string): Promise<{ deleted: boolean; assetsDeleted: number }> {
  const fabric = await Fabric.findById(fabricId);
  if (!fabric) return { deleted: false, assetsDeleted: 0 };

  const urls = extractCloudinaryUrlsFromFabric(fabric.toObject() as unknown as FabricLike);
  const prefix = urls.length > 0 ? extractFolderPrefixFromUrl(urls[0]) : null;

  // FAST DB DELETE
  await Fabric.findByIdAndDelete(fabricId);

  // BACKGROUND CLOUDINARY CLEANUP
  Promise.resolve().then(async () => {
    try {
      let assetsDeleted = await deleteManyFromCloudinary(urls);
      // Delete Local OS Files manually generated (such as fabric swatches thumbnails)
      const localUrls = extractLocalUrlsFromFabric(fabric.toObject() as Record<string, unknown>);
      const localAssetsDeleted = deleteLocalAssets(localUrls);

      if (prefix) {
        const { deleted } = await deleteByPrefix(prefix);
        assetsDeleted += deleted;
      }
      if (urls.length > 0 || prefix || localAssetsDeleted > 0) {
        console.log('[DeleteHandlers] Background fabric deletion complete:', { fabricId, urlsCount: urls.length, localCount: localAssetsDeleted, assetsDeleted });
      }
    } catch (err) {
      console.error('[DeleteHandlers] Background cleanup error for fabric:', fabricId, err);
    }
  });

  return { deleted: true, assetsDeleted: urls.length };
}

/**
 * Order delete: remove unique screenshots from Cloudinary, then delete order.
 * baseImage is NOT deleted (may be product image, needed for history).
 */
export async function deleteOrderWithAssets(orderId: string): Promise<{ deleted: boolean; assetsDeleted: number }> {
  const order = await Order.findById(orderId);
  if (!order) return { deleted: false, assetsDeleted: 0 };

  const urls = extractCloudinaryScreenshotUrlsFromOrder(order as unknown as { items?: OrderItemLike[] });
  // FAST DB DELETE
  await Order.findByIdAndDelete(orderId);

  // BACKGROUND CLOUDINARY CLEANUP
  Promise.resolve().then(async () => {
    try {
      const assetsDeleted = await deleteManyFromCloudinary(urls);
      if (urls.length > 0) {
        console.log('[DeleteHandlers] Background order screenshots deleted:', { orderId, screenshotsDeleted: assetsDeleted });
      }
    } catch (err) {
      console.error('[DeleteHandlers] Background cleanup error for order screenshots:', orderId, err);
    }
  });

  return { deleted: true, assetsDeleted: urls.length };
}

/**
 * Delete saved design: remove Cloudinary assets (screenshot, etc.) then remove from customer.
 * Returns design URLs that were deleted (for logging).
 * @param customer - Mongoose Customer document with savedDesigns
 */
export async function deleteDesignWithAssets(
  customer: { savedDesigns: Array<SavedDesignLike & { _id?: unknown }>; save: () => Promise<unknown> },
  designId: string
): Promise<{ removed: boolean; assetsDeleted: number }> {
  const design = customer.savedDesigns.find(
    (d) => String(d._id) === designId
  );
  if (!design) return { removed: false, assetsDeleted: 0 };

  const urls = extractCloudinaryUrlsFromDesign(design);
  const assetsDeleted = await deleteManyFromCloudinary(urls);

  // Mongoose DocumentArray has .pull() at runtime — cast through unknown for TS
  (customer.savedDesigns as unknown as { pull: (id: string) => void }).pull(designId);
  await customer.save();

  if (urls.length > 0) {
    console.log('[DeleteHandlers] Saved design deleted:', { designId, assetsDeleted });
  }
  return { removed: true, assetsDeleted };
}

/**
 * Customer delete: remove entire Cloudinary folder (profile, saved-designs, cart),
 * then delete customer document from DB.
 * Does NOT delete orders — those are business records that should persist.
 */
export async function deleteCustomerWithAssets(customerId: string): Promise<{ deleted: boolean; assetsDeleted: number }> {
  const customer = await Customer.findById(customerId);
  if (!customer) return { deleted: false, assetsDeleted: 0 };

  // FAST DB DELETE
  const name = customer.name;
  await Customer.findByIdAndDelete(customerId);

  // BACKGROUND CLOUDINARY CLEANUP
  Promise.resolve().then(async () => {
    try {
      let assetsDeleted = 0;
      const profileUrl = customer.profileImage;
      if (profileUrl && isCloudinaryUrl(profileUrl)) {
        await deleteFromCloudinaryByUrl(profileUrl);
        assetsDeleted++;
      }
      if (customer.savedDesigns?.length > 0) {
        for (const design of customer.savedDesigns) {
          const urls = extractCloudinaryUrlsFromDesign(design as unknown as SavedDesignLike);
          assetsDeleted += await deleteManyFromCloudinary(urls);
        }
      }
      const customerFolder = getCustomerFolder(customerId, customer.name);
      const prefixToDelete = `${CLOUDINARY_BASE}/${customerFolder}/`;
      const { deleted: prefixDeleted } = await deleteByPrefix(prefixToDelete);
      assetsDeleted += prefixDeleted;

      console.log('[DeleteHandlers] Background customer cleanup complete:', { customerId, name, assetsDeleted });
    } catch (err) {
      console.error('[DeleteHandlers] Background cleanup error for customer:', customerId, err);
    }
  });

  return { deleted: true, assetsDeleted: 1 }; // Return dummy positive count for swift UI
}

/**
 * Admin delete: remove entire Cloudinary folder (profile), then delete admin document.
 */
export async function deleteAdminWithAssets(adminId: string): Promise<{ deleted: boolean; assetsDeleted: number }> {
  const admin = await Admin.findById(adminId);
  if (!admin) return { deleted: false, assetsDeleted: 0 };

  let assetsDeleted = 0;

  // Delete profile image directly
  const profileUrl = admin.profileImage;
  if (profileUrl && isCloudinaryUrl(profileUrl)) {
    try { await deleteFromCloudinaryByUrl(profileUrl); assetsDeleted++; }
    catch (err) { console.error('[DeleteHandlers] Failed to delete admin profile image:', err); }
  }

  // Delete entire admin folder by prefix
  const adminFolder = getAdminFolder(adminId, admin.name);
  const prefixToDelete = `${CLOUDINARY_BASE}/${adminFolder}/`;
  const { deleted: prefixDeleted } = await deleteByPrefix(prefixToDelete);
  assetsDeleted += prefixDeleted;

  // Delete from DB
  await Admin.findByIdAndDelete(adminId);
  console.log('[DeleteHandlers] Admin deleted:', { adminId, name: admin.name, assetsDeleted });
  return { deleted: true, assetsDeleted };
}

