/**
 * Centralized utility for managing customization state in localStorage
 * Single source of truth for customization state operations
 */

/**
 * Get customization state for a product from localStorage
 */
export function getCustomizationState(productId: string, storageKeyPrefix: string = 'shirt_customization'): any | null {
  try {
    const key = `${storageKeyPrefix}_${productId}`;
    const savedStateJson = localStorage.getItem(key);
    if (!savedStateJson) return null;
    return JSON.parse(savedStateJson);
  } catch (error) {
    console.error(`Error reading customization state for product ${productId}:`, error);
    return null;
  }
}

/**
 * Save customization state for a product to localStorage
 */
export function saveCustomizationState(
  productId: string,
  state: any,
  storageKeyPrefix: string = 'shirt_customization'
): void {
  try {
    const key = `${storageKeyPrefix}_${productId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error(`Error saving customization state for product ${productId}:`, error);
  }
}

/**
 * Remove customization state for a product from localStorage
 */
export function removeCustomizationState(
  productId: string,
  storageKeyPrefix: string = 'shirt_customization'
): void {
  try {
    const key = `${storageKeyPrefix}_${productId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing customization state for product ${productId}:`, error);
  }
}
