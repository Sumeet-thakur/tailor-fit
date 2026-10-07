/**
 * Placeholder image paths for when assets are missing or deleted.
 * These are served from the frontend public folder.
 * Mirrors server/constants/placeholders.ts for consistency.
 */
export const PLACEHOLDERS = {
  /** Product images by category: shirt, pants, suit, etc. */
  product: (category: string) => `/images/placeholders/${category || 'product'}.svg`,
  /** Default product when category unknown */
  productDefault: '/images/placeholders/product.svg',
  /** Avatar/profile when no image */
  avatar: '/images/placeholders/avatar.svg',
  /** Single image for empty sliders (ProductDetail, Customize3DLanding, etc.) */
  slider: '/images/placeholders/product.svg',
} as const;

/** Product categories that have placeholder SVGs */
export const PRODUCT_CATEGORIES_WITH_PLACEHOLDERS = [
  'shirt',
  'pants',
  'suit',
  'blazer',
  'jacket',
  'vest',
  'tuxedo',
  'product',
] as const;

/** Get product placeholder for category, falling back to product.svg when unknown */
export function getProductPlaceholder(category?: string): string {
  const valid = category && (PRODUCT_CATEGORIES_WITH_PLACEHOLDERS as readonly string[]).includes(category);
  return valid ? PLACEHOLDERS.product(category!) : PLACEHOLDERS.productDefault;
}
