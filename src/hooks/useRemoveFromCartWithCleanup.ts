import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { uploadService } from '@/services/upload';

/**
 * Returns removeFromCart that also deletes Cloudinary screenshot when removing a cart item.
 * Runs securely for both Authenticated Users AND Guests via backend path-filtering.
 */
export function useRemoveFromCartWithCleanup(): (id: string) => void {
  const { removeFromCart, getItemById } = useCart();

  return useCallback(
    (id: string) => {
      const item = getItemById(id);
      
      // Fire and forget - don't block cart removal if delete fails (e.g. offline)
      if (item?.screenshot && item.screenshot.includes('cloudinary.com') && item.screenshot.includes('/cart/')) {
        uploadService.deleteCartItem(item.screenshot).catch(() => {
          console.warn(`[Cleanup] Failed to instantly delete Cloudinary asset for ${id}`);
        });
      }

      removeFromCart(id);
      toast.success('Item removed from cart');
    },
    [removeFromCart, getItemById]
  );
}
