/**
 * Centralized utility for managing saved designs in localStorage
 * Single source of truth for saved designs operations
 */

const SAVED_DESIGNS_KEY = 'tailorFitSavedConfigs';
const MAX_SAVED_DESIGNS = 20;

export interface SavedDesign {
  id: string;
  productId: string;
  name: string;
  category: string;
  basePrice: number;
  selectedFabricId: string;
  selectedStyles: Record<string, string>;
  selectedLegacyStyles?: Record<string, string>;
  totalPrice: number;
  savedAt: string;
  screenshot?: string;
  config?: any;
  _id?: string; // For account-saved designs
}

/**
 * Get all saved designs from localStorage
 */
export function getSavedDesigns(): SavedDesign[] {
  try {
    const stored = localStorage.getItem(SAVED_DESIGNS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading saved designs from localStorage:', error);
    return [];
  }
}

/**
 * Save a design to localStorage (adds to beginning, keeps max 20)
 */
export function saveDesign(design: SavedDesign): void {
  try {
    const existing = getSavedDesigns();
    const filtered = existing.filter((d) => d.id !== design.id);
    const next = [design, ...filtered].slice(0, MAX_SAVED_DESIGNS);
    localStorage.setItem(SAVED_DESIGNS_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Error saving design to localStorage:', error);
  }
}

/**
 * Delete a design from localStorage by ID
 */
export function deleteDesign(designId: string): SavedDesign[] {
  try {
    const existing = getSavedDesigns();
    const filtered = existing.filter((d) => d.id !== designId && d._id !== designId);
    localStorage.setItem(SAVED_DESIGNS_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('Error deleting design from localStorage:', error);
    return getSavedDesigns();
  }
}

/**
 * Get designs filtered by productId
 */
export function getDesignsByProduct(productId: string): SavedDesign[] {
  return getSavedDesigns().filter((d) => d.productId === productId);
}

/**
 * Find a design by ID (checks both id and _id fields)
 */
export function findDesignById(designId: string): SavedDesign | undefined {
  return getSavedDesigns().find((d) => d.id === designId || d._id === designId);
}
