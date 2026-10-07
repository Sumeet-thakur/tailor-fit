/**
 * Cloudinary folder names and path builders for uploads.
 * Frontend mirror of server/constants/cloudinaryFolders.ts.
 *
 * Convention:
 *   - Top-level entity folders use {id}-{slug} (immutable ID + browsable name)
 *   - Fixed subfolders (fabrics, options, variants, showcase, thumbnails) are static names
 *   - Dynamic items within subfolders use {id}-{slug} for the specific entity
 *
 * Structure in Cloudinary: {ENV}/{CLIENT}/{folder}/...
 * The server auto-prepends CLOUDINARY_BASE — frontend only needs to send the relative folder path.
 */
export const CLOUDINARY_FOLDERS = {
  /** Product images, fabrics, options — per-product (2d/3d) */
  products: 'products',
  /** Customer assets: profile, saved-designs, cart */
  customers: 'customers',
  /** Admin assets: profile */
  admins: 'admins',
  /** Order screenshots */
  orders: 'orders',
} as const;

export type ProductCategoryType = '2d' | '3d';

// ─── Slugify / Sanitize Helpers ────────────────────────────────────────────

export function slugify(s: string): string {
  if (!s || typeof s !== 'string') return 'item';
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function sanitizeFilename(name: string): string {
  if (!name || typeof name !== 'string') return '';
  const base = name.replace(/\.[^/.]+$/, '');
  return base.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || '';
}

function withFilename(identifier: string, originalFilename?: string): string {
  const sanitized = originalFilename ? sanitizeFilename(originalFilename) : '';
  return identifier ? slugify(identifier) : sanitized;
}

/**
 * Combine an immutable ID with a human-readable slug for Cloudinary folder naming.
 * Pattern: {id}-{slug} (e.g. "f1772218004751-white-cotton")
 * If name is missing, falls back to ID only (still functional, just less browsable).
 */
export function idSlug(id: string, name?: string): string {
  const cleanId = id || 'unknown';
  if (!name) return cleanId;
  return `${cleanId}-${slugify(name)}`;
}

// ─── Shared FolderAndId splitter ───────────────────────────────────────────

function splitFolderAndId(fullPath: string): { folder: string; customId: string } {
  const lastSlash = fullPath.lastIndexOf('/');
  const folder = lastSlash >= 0 ? fullPath.slice(0, lastSlash) : CLOUDINARY_FOLDERS.products;
  const customId = lastSlash >= 0 ? fullPath.slice(lastSlash + 1) : fullPath;
  return { folder, customId };
}

// ─── Customer Folder Helpers ───────────────────────────────────────────────

/** Customer root folder: customers/{customerId}-{slug} */
export function getCustomerFolder(customerId: string, customerName?: string): string {
  return `${CLOUDINARY_FOLDERS.customers}/${idSlug(customerId, customerName)}`;
}

/** Customer profile folder: customers/{customerId}-{slug}/profile */
export function getCustomerProfileFolder(customerId: string, customerName?: string): string {
  return `${getCustomerFolder(customerId, customerName)}/profile`;
}

/** Customer saved-designs folder: customers/{customerId}-{slug}/saved-designs/{productSlug} */
export function getCustomerDesignsFolder(customerId: string, productSlug: string, customerName?: string): string {
  return `${getCustomerFolder(customerId, customerName)}/saved-designs/${slugify(productSlug)}`;
}

/** Customer cart folder: customers/{customerId}-{slug}/cart/{productSlug} */
export function getCustomerCartFolder(customerId: string, productSlug: string, customerName?: string): string {
  return `${getCustomerFolder(customerId, customerName)}/cart/${slugify(productSlug)}`;
}

// ─── Admin Folder Helpers ──────────────────────────────────────────────────

/** Admin root folder: admins/{adminId}-{slug} */
export function getAdminFolder(adminId: string, adminName?: string): string {
  return `${CLOUDINARY_FOLDERS.admins}/${idSlug(adminId, adminName)}`;
}

/** Admin profile folder: admins/{adminId}-{slug}/profile */
export function getAdminProfileFolder(adminId: string, adminName?: string): string {
  return `${getAdminFolder(adminId, adminName)}/profile`;
}

// ─── Product Folder Helpers (2D / 3D) ──────────────────────────────────────

/** Product path prefix: products/{2d|3d}/{productId}-{productSlug} */
function productPathPrefix(productSlug: string, categoryType: ProductCategoryType, productId?: string): string {
  const type = categoryType === '3d' ? '3d' : '2d';
  const folderName = productId
    ? `${productId}-${slugify(productSlug)}`
    : slugify(productSlug);
  return `${CLOUDINARY_FOLDERS.products}/${type}/${folderName}`;
}

// ─── Product Showcase & Thumbnails ─────────────────────────────────────────

export function getProductImagePath(productSlug: string, field: string, originalFilename?: string, categoryType: ProductCategoryType = '2d', productId?: string): string {
  return `${productPathPrefix(productSlug, categoryType, productId)}/showcase/${withFilename(field, originalFilename)}`;
}

export function getProductImageFolderAndId(productSlug: string, field: string, originalFilename?: string, categoryType: ProductCategoryType = '2d', productId?: string): { folder: string; customId: string } {
  return splitFolderAndId(getProductImagePath(productSlug, field, originalFilename, categoryType, productId));
}

export function getProductFabricPreviewPath(productSlug: string, index: number, timestamp?: number, originalFilename?: string, categoryType: ProductCategoryType = '2d', productId?: string): string {
  const identifier = `thumbnail-${index}`;
  return `${productPathPrefix(productSlug, categoryType, productId)}/thumbnails/${identifier}`;
}

export function getProductFabricPreviewFolderAndId(productSlug: string, index: number, timestamp?: number, originalFilename?: string, categoryType: ProductCategoryType = '2d', productId?: string): { folder: string; customId: string } {
  return splitFolderAndId(getProductFabricPreviewPath(productSlug, index, timestamp, originalFilename, categoryType, productId));
}

// ─── 2D Product Fabrics ────────────────────────────────────────────────────

/** 2D Product fabric images: products/{type}/{id}-{slug}/fabrics/{fabricId}-{fabricSlug}/{slot} */
export function getProductFabricPath(productSlug: string, fabricId: string, fabricName: string | undefined, slot: string, originalFilename?: string, categoryType: ProductCategoryType = '2d', productId?: string): string {
  return `${productPathPrefix(productSlug, categoryType, productId)}/fabrics/${idSlug(fabricId, fabricName)}/${withFilename(slot, originalFilename)}`;
}

export function getProductFabricFolderAndId(productSlug: string, fabricId: string, fabricName: string | undefined, slot: string, originalFilename?: string, categoryType: ProductCategoryType = '2d', productId?: string): { folder: string; customId: string } {
  return splitFolderAndId(getProductFabricPath(productSlug, fabricId, fabricName, slot, originalFilename, categoryType, productId));
}

// ─── 2D Product Options ────────────────────────────────────────────────────

/** Product option images: products/{type}/{id}-{slug}/options/{groupId}-{groupSlug}/{optionId}-{optionSlug}/{field} */
export function getProductOptionPath(productSlug: string, groupId: string, groupName: string | undefined, optionId: string, optionName: string | undefined, field: string, originalFilename?: string, categoryType: ProductCategoryType = '2d', productId?: string): string {
  return `${productPathPrefix(productSlug, categoryType, productId)}/options/${idSlug(groupId, groupName)}/${idSlug(optionId, optionName)}/${withFilename(field, originalFilename)}`;
}

export function getProductOptionFolderAndId(productSlug: string, groupId: string, groupName: string | undefined, optionId: string, optionName: string | undefined, field: string, originalFilename?: string, categoryType: ProductCategoryType = '2d', productId?: string): { folder: string; customId: string } {
  return splitFolderAndId(getProductOptionPath(productSlug, groupId, groupName, optionId, optionName, field, originalFilename, categoryType, productId));
}

/** Product option variant images: products/{type}/{id}-{slug}/options/{gId}-{gSlug}/{oId}-{oSlug}/variants/{fId}-{fSlug}/{view} */
export function getProductOptionVariantPath(productSlug: string, groupId: string, groupName: string | undefined, optionId: string, optionName: string | undefined, fabricId: string, fabricName: string | undefined, view: 'front' | 'back' | string, originalFilename?: string, categoryType: ProductCategoryType = '2d', productId?: string): string {
  return `${productPathPrefix(productSlug, categoryType, productId)}/options/${idSlug(groupId, groupName)}/${idSlug(optionId, optionName)}/variants/${idSlug(fabricId, fabricName)}/${withFilename(view, originalFilename)}`;
}

export function getProductOptionVariantFolderAndId(productSlug: string, groupId: string, groupName: string | undefined, optionId: string, optionName: string | undefined, fabricId: string, fabricName: string | undefined, view: 'front' | 'back' | string, originalFilename?: string, categoryType: ProductCategoryType = '2d', productId?: string): { folder: string; customId: string } {
  return splitFolderAndId(getProductOptionVariantPath(productSlug, groupId, groupName, optionId, optionName, fabricId, fabricName, view, originalFilename, categoryType, productId));
}

// ─── 3D Product Fabrics (Texture Maps & Swatches) ──────────────────────────

/** 3D fabric texture maps: products/3d/{id}-{slug}/3d-fabrics/texture-maps/{fabricId}-{fabricSlug}/{field} */
export function getProduct3DTextureMapPath(productSlug: string, fabricId: string, fabricName: string | undefined, field: string, originalFilename?: string, productId?: string): string {
  return `${productPathPrefix(productSlug, '3d', productId)}/3d-fabrics/texture-maps/${idSlug(fabricId, fabricName)}/${withFilename(field, originalFilename)}`;
}

export function getProduct3DTextureMapFolderAndId(productSlug: string, fabricId: string, fabricName: string | undefined, field: string, originalFilename?: string, productId?: string): { folder: string; customId: string } {
  return splitFolderAndId(getProduct3DTextureMapPath(productSlug, fabricId, fabricName, field, originalFilename, productId));
}


// ─── 3D Product Assets (Models, Environment Maps) ──────────────────────────

/** Product 3D assets folder: products/3d/{id}-{slug}/assets/{subfolder} */
export function getProductAssetsFolder(productSlug: string, subfolder: '3d-model' | 'environment-map' | 'general', productId?: string): string {
  return `${productPathPrefix(productSlug, '3d', productId)}/assets/${subfolder}`;
}

// ─── Product Folder Prefix (for deletion) ──────────────────────────────────

/** Product folder prefix for deletion: products/{type}/{id}-{slug}/ */
export function getProductFolderPrefix(productSlug: string, categoryType: ProductCategoryType, productId?: string): string {
  return `${productPathPrefix(productSlug, categoryType, productId)}/`;
}
