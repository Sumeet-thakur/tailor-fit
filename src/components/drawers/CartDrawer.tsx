// Cart drawer: uses SliderDrawer. Reused in Customize, Customize3D, SiteLayout.
import { Link } from 'react-router-dom';
import { ShoppingBag, Layers, Eye, Minus, Plus, Trash2 } from 'lucide-react';
import { SliderDrawer } from '@/components/ui/SliderDrawer';
import { formatPrice } from '@/lib/formatPrice';
import { getItemPreviewImage } from '@/lib/screenshotUtils';
import { ProductThumbnail } from '@/components/common/ProductThumbnail';
import type { CartItem } from '@/context/CartContext';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  onItemPreviewClick?: (item: CartItem) => void;
  fullWidthMobile?: boolean;
  /** Use ProductThumbnail (SiteLayout) vs img (Customize). Default: img */
  useProductThumbnail?: boolean;
}

export function CartDrawer({
  open,
  onClose,
  items,
  itemCount,
  totalAmount,
  updateQuantity,
  removeFromCart,
  onItemPreviewClick,
  fullWidthMobile = false,
  useProductThumbnail = false,
}: CartDrawerProps) {
  const footer =
    items.length > 0 ? (
      <>
        <div className="flex justify-between mb-4">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-display text-lg font-bold">{formatPrice(totalAmount)}</span>
        </div>
        <Link
          to="/checkout"
          onClick={onClose}
          className="block w-full py-3 bg-primary text-white text-center font-semibold rounded-full hover:bg-primary/90 transition-colors"
        >
          Proceed to Checkout
        </Link>
        <Link
          to="/cart"
          onClick={onClose}
          className="block w-full py-2 mt-2 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View Full Cart
        </Link>
      </>
    ) : undefined;

  return (
    <SliderDrawer
      open={open}
      onClose={onClose}
      title="Shopping Cart"
      subtitle={`${itemCount} item${itemCount !== 1 ? 's' : ''}`}
      icon={<ShoppingBag className="w-5 h-5 text-primary" />}
      footer={footer}
      fullWidthMobile={fullWidthMobile}
    >
      {items.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Your cart is empty</p>
          <p className="text-xs text-muted-foreground mt-1">Add items to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="p-3 rounded-xl border border-border/50 bg-muted/30">
              <div className="flex gap-3">
                <div
                  className={`w-14 h-14 rounded-lg bg-white border border-border/30 overflow-hidden shrink-0 ${onItemPreviewClick ? 'cursor-pointer hover:border-primary/50 transition-colors relative group' : ''}`}
                  onClick={onItemPreviewClick ? () => onItemPreviewClick(item) : undefined}
                >
                  {useProductThumbnail ? (
                    <ProductThumbnail
                      item={item}
                      className="w-full h-full"
                      imageClassName="p-1"
                    />
                  ) : getItemPreviewImage(item) ? (
                    <img
                      src={getItemPreviewImage(item)!}
                      alt={item.productName}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                  )}
                  {onItemPreviewClick && item.config && (
                    <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                      <Eye className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.productCategory}</p>
                  <p className="text-sm font-semibold text-primary mt-1">{formatPrice(item.totalPrice)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SliderDrawer>
  );
}
