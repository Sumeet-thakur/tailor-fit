import { Link, useNavigate } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { useCart } from '@/context/CartContext';
import { useRemoveFromCartWithCleanup } from '@/hooks/useRemoveFromCartWithCleanup';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft, Package, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrderSpecs } from '@/components/orders/OrderSpecs';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { showSuccess, showError } from '@/lib/toastHelpers';
import { getMeasurementFields, getMeasurementLabel } from '@/utils/measurementUtils';
import { ProductThumbnail } from '@/components/common/ProductThumbnail';
import { formatPrice } from '@/lib/formatPrice';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, itemCount, totalAmount, updateQuantity, updateItem, clearCart } = useCart();
  const removeFromCart = useRemoveFromCartWithCleanup();

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = (item: any) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Delay clearing selected item to allow dialog close animation to finish
    setTimeout(() => setSelectedItem(null), 300);
  };

  const handleUpdateItem = (itemId: string, measurements: Record<string, string>) => {
    updateItem(itemId, { measurements });
    // Update local selected item state to reflect changes immediately in the dialog
    setSelectedItem((prev: any) => ({ ...prev, measurements }));
  };

  const handleCheckout = () => {
    // Validate mandatory measurements
    const missingMeasurements: string[] = [];

    items.forEach(item => {
      const requiredFields = getMeasurementFields(item.productCategory);
      const isMissing = requiredFields.some(field => !item.measurements?.[field] || parseFloat(item.measurements[field]) <= 0);

      if (isMissing) {
        missingMeasurements.push(item.productName);
      }
    });

    if (missingMeasurements.length > 0) {
      showError('Missing Measurements', `Please fill in all required measurements for: ${missingMeasurements.join(', ')}`);
      return;
    }

    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 lg:px-8 py-20 animate-fade-up">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground mb-4">
              Your Cart is Empty
            </h1>
            <p className="text-muted-foreground mb-8">
              Start customizing your perfect garments and add them to your cart.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-all"
            >
              Browse Products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 lg:px-8 py-8 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
              Your Cart
            </h1>
            <p className="text-muted-foreground mt-2">
              {itemCount} item{itemCount !== 1 ? 's' : ''} in your cart
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-border/50 shadow-soft p-4 sm:p-6 transition-all hover:shadow-elevated group">
                <div className="flex gap-4 sm:gap-6">
                  {/* Product Image using ProductThumbnail */}
                  <ProductThumbnail
                    item={item}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl border border-border/30 bg-muted/10 shrink-0"
                    imageClassName="p-2"
                  />

                  {/* Product Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-display text-lg font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs" title={item.productName}>
                            {item.productName}
                          </h3>
                          <p className="text-sm text-muted-foreground capitalize">{item.productCategory}</p>
                        </div>
                        <p className="font-display text-lg font-bold text-primary">
                          {formatPrice(item.totalPrice)}
                        </p>
                      </div>

                      {/* Fabric Info */}
                      {item.fabric && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-5 h-5 rounded-full border border-border overflow-hidden">
                            <img src={item.fabric.image} alt={item.fabric.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-sm text-muted-foreground">{item.fabric.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-auto">
                      {/* Quantity & Actions */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-1 border border-border/50">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm hover:bg-muted transition-colors disabled:opacity-50"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm hover:bg-muted transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="h-8 w-px bg-border/50 mx-2 hidden sm:block" />

                        <div className="flex gap-2">
                          {/* View Details Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 gap-2 text-xs"
                            onClick={() => handleOpenDialog(item)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Details</span>
                          </Button>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="h-9 px-3 flex items-center gap-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-border/50 shadow-soft p-6 sticky top-24">
              <h2 className="font-display text-xl font-semibold text-foreground mb-6">
                Order Summary
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
              </div>

              <div className="h-px bg-border/50 mb-4" />

              <div className="flex justify-between mb-8">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-display text-xl font-bold text-foreground">
                  {formatPrice(totalAmount)}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-full font-medium hover:bg-primary/90 shadow-soft transition-all"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>Free shipping on all orders</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
            <DialogTitle>Item Details</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 bg-amber-50/30 custom-scrollbar">
            {selectedItem && (
              <OrderSpecs
                items={[selectedItem]}
                onUpdate={(itemId, measurements) => handleUpdateItem(itemId, measurements)}
              />
            )}
          </div>

          <div className="px-6 py-4 border-t border-border/50 bg-gray-50/50 flex justify-end shrink-0">
            <Button onClick={handleCloseDialog}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

    </SiteLayout>
  );
}
