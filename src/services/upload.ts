import { apiClient } from '@/lib/apiClient';

export const uploadService = {
  /**
   * Securely deletes a temporary cart item from Cloudinary.
   * This is a public route (no token required) because guests can have carts,
   * but the backend strictly enforces that ONLY paths containing `/cart/` can be deleted.
   */
  deleteCartItem: async (url: string): Promise<{ success: boolean; result?: any }> => {
    // Basic frontend safety check before pinging API
    if (!url || !url.includes('cloudinary.com') || !url.includes('/cart/')) {
        return { success: false };
    }

    try {
      return apiClient.post<{ success: boolean; result?: any }>('/upload/delete-cart-item', { url });
    } catch (error) {
        console.error('[Upload Service] Failed to delete cart asset:', error);
        return { success: false };
    }
  },
};
