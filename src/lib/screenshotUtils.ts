/**
 * Utilities for screenshot/preview image display across the project.
 * Single source of truth for resolving which image to show (screenshot vs baseImage).
 */

/**
 * Returns the best preview image URL for an item (cart, order, saved design).
 * Prioritizes screenshot (live capture) over baseImage (product default).
 * Used consistently across Cart, Checkout, OrderSpecs, Account, Customize, Customize3D.
 */
export function getItemPreviewImage(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const p = item as { screenshot?: string; baseImage?: string };
  return p.screenshot || p.baseImage || undefined;
}

/**
 * Returns view-specific preview image for items that support front/back (e.g. pants).
 * Use screenshotFront/screenshotBack when available; otherwise falls back to screenshot.
 */
export function getItemPreviewImageForView(
  item: unknown,
  viewMode: 'front' | 'back'
): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const p = item as {
    screenshot?: string;
    screenshotFront?: string;
    screenshotBack?: string;
    baseImage?: string;
  };
  if (viewMode === 'front' && p.screenshotFront) return p.screenshotFront;
  if (viewMode === 'back' && p.screenshotBack) return p.screenshotBack;
  return p.screenshot || p.baseImage || undefined;
}
