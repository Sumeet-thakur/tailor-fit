import { createContext, useContext, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { productService } from '@/services/products';
import { uploadService } from '@/services/upload';
import { useLocation } from 'react-router-dom';
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  baseImage: string;
  fabric: {
    id: string;
    name: string;
    image?: string;
    priceModifier: number;
  } | null;
  styles: Record<string, {
    id: string;
    name: string;
    priceModifier: number;
  } | string>;
  measurements: Record<string, string>;
  basePrice: number;
  totalPrice: number;
  quantity: number;
  addedAt: string;
  screenshot?: string;
  config?: any;
  is3D?: boolean;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  addToCart: (item: Omit<CartItem, 'id' | 'addedAt' | 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  getItemById: (id: string) => CartItem | undefined;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = 'tailorFitCart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalStorage<CartItem[]>(CART_STORAGE_KEY, []);
  const validatedRef = useRef(false);

  /** Phase 5: Validate cart on load - remove items whose product no longer exists */
  useEffect(() => {
    if (items.length === 0) return;
    if (validatedRef.current) return;
    validatedRef.current = true;

    let cancelled = false;
    productService
      .getAll()
      .then((products) => {
        if (cancelled) return;
        const validIds = new Set(products.map((p) => p._id));
        const filtered = items.filter((item) => validIds.has(item.productId));
        if (filtered.length < items.length) {
          setItems(filtered);
        }
      })
      .catch(() => {
        /* Keep cart as-is on API error */
      });
    return () => {
      cancelled = true;
    };
  }, [items, setItems]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0);

  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'addedAt' | 'quantity'>) => {
    const newItem: CartItem = {
      ...item,
      id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      quantity: 1,
      addedAt: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<CartItem>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    // Before clearing the frontend state, asynchronously delete all temporary cart screenshot assets from Cloudinary.
    // NOTE: This fires post-checkout (OrderOrganizer handles copying the assets to `orders/` folder first).
    // The strict `/cart/` backend validation ensures we only delete the original orphaned cart items, not the orders copies.
    setItems((currentItems) => {
      currentItems.forEach((item) => {
        if (item.screenshot && item.screenshot.includes('cloudinary.com') && item.screenshot.includes('/cart/')) {
           uploadService.deleteCartItem(item.screenshot).catch(() => {
             console.warn(`[Cart Clear] Failed to instantly delete Cloudinary cart asset: ${item.id}`);
           });
        }
      });
      return []; // Instantly clear UI state while deletions happen in background
    });
  }, []);

  const getItemById = useCallback((id: string) => {
    return items.find(item => item.id === id);
  }, [items]);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      totalAmount,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateItem,
      clearCart,
      getItemById,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
