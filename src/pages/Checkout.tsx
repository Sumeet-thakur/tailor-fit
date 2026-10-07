import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { useCart } from '@/context/CartContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { ArrowLeft, ArrowRight, CreditCard, Truck, Building2, Loader2, ShoppingBag, CheckCircle2, User, Shield, Tag, X, Ticket } from 'lucide-react';
import { showError, showSuccess, showWarning } from '@/lib/toastHelpers';
import { ProductThumbnail } from '@/components/common/ProductThumbnail';
import { formatPrice } from '@/lib/formatPrice';
import { orderService } from '@/services/orders';
import { ApiError } from '@/lib/apiClient';
import { PAYMENT_METHODS } from '@/lib/paymentConstants';
import { ROUTES } from '@/constants/routes';
import { paymentService } from '@/services/payments';
import { promoCodeService, type PromoValidationResult } from '@/services/promoCode';
import { SavedDesignPreviewModal } from '@/components/modals/SavedDesignPreviewModal';

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totalAmount, clearCart } = useCart();
  const { customer, isAuthenticated } = useCustomerAuth();

  const [loading, setLoading] = useState(false);
  const [safepayLoading, setSafepayLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer' | 'safepay' | ''>('');

  const [promoCode, setPromoCode] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const [form, setForm] = useState<CustomerForm>({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const [selectedPreviewItem, setSelectedPreviewItem] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Pre-fill form with customer data if logged in
  useEffect(() => {
    if (isAuthenticated && customer) {
      setForm({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        street: customer.address?.street || '',
        city: customer.address?.city || '',
        state: customer.address?.state || '',
        postalCode: customer.address?.postalCode || '',
      });
    }
  }, [isAuthenticated, customer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ['name', 'email', 'phone', 'street', 'city', 'postalCode'];
    for (const field of required) {
      if (!form[field as keyof CustomerForm]?.trim()) {
        showError(`Please enter your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    try {
      const result = await promoCodeService.validate(promoInput.trim(), totalAmount);
      setPromoResult(result);
      setPromoCode(result.code);
      showSuccess(`Promo applied! You saved Rs. ${result.discountAmount.toLocaleString()}`);
    } catch (err: any) {
      showError(err?.message || 'Invalid promo code');
      setPromoResult(null);
      setPromoCode('');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoResult(null);
    setPromoCode('');
    setPromoInput('');
  };

  const discountAmount = promoResult?.discountAmount ?? 0;
  const finalTotal = Math.max(0, totalAmount - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (items.length === 0) {
      showError('Your cart is empty');
      return;
    }
    if (!paymentMethod) {
      showError('Please select a payment method before proceeding');
      return;
    }

    setLoading(true);

    try {
      const orderItems = items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productCategory: item.productCategory,
        baseImage: item.baseImage || '',
        fabric: item.fabric || {},
        styles: item.styles || {},
        measurements: item.measurements || {},
        basePrice: item.basePrice,
        totalPrice: item.totalPrice,
        quantity: item.quantity,
        screenshot: item.screenshot,
      }));

      const payload = {
        customer: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          address: {
            street: form.street.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            postalCode: form.postalCode.trim(),
            country: 'Pakistan',
          },
        },
        items: orderItems,
        subtotal: totalAmount,
        shippingCost: 0,
        tax: 0,
        total: finalTotal,
        paymentMethod,
        paymentGateway: paymentMethod === 'safepay' ? 'safepay' : 'none',
        discount: discountAmount,
        promoCode: promoCode || undefined,
      };

      const data = await orderService.create(payload as any);
      const { orderNumber, _id: orderId } = data as any;

      if (paymentMethod === 'safepay' && orderId) {
        setSafepayLoading(true);
        const callbackUrl = `${window.location.origin}/payment/callback`;
        const { checkoutUrl } = await paymentService.createSafepayTracker(orderId, callbackUrl);
        
        if (checkoutUrl) {
            window.location.href = checkoutUrl;
        } else {
            showError('Failed to generate Safepay checkout URL. Please try again.');
            setSafepayLoading(false);
            setLoading(false);
        }
        return; // Don't clear cart yet — wait for callback success
      }

      // COD / Bank Transfer
      clearCart();
      navigate(ROUTES.ORDER(orderNumber));
    } catch (error) {
      const apiError = error as ApiError;
      showError(apiError.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
      setSafepayLoading(false);
    }
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
              Add some items to your cart before checking out.
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
        <div className="mb-8">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Checkout
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-8">
              {/* Guest Sign-in Prompt */}
              {!isAuthenticated && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-1">Already have an account?</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Sign in for faster checkout and to track your orders easily.
                      </p>
                      <Link
                        to="/login"
                        state={{ from: { pathname: '/checkout' } }}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        Sign in to your account
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="bg-white rounded-2xl border border-border/50 shadow-soft p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Contact Information
                  </h2>
                  {isAuthenticated && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium hidden sm:inline-block">
                      Signed in as {customer?.email}
                    </span>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    placeholder="Full Name *"
                    className="w-full h-12 px-4 rounded-xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="Email Address *"
                    className="w-full h-12 px-4 rounded-xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    placeholder="Phone Number *"
                    className="w-full h-12 px-4 rounded-xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:col-span-2"
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-2xl border border-border/50 shadow-soft p-6">
                <h2 className="font-display text-lg font-semibold text-foreground mb-6">
                  Shipping Address
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="street"
                    value={form.street}
                    onChange={handleInputChange}
                    placeholder="Street Address *"
                    className="w-full h-12 px-4 rounded-xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:col-span-2"
                  />
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleInputChange}
                    placeholder="City *"
                    className="w-full h-12 px-4 rounded-xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleInputChange}
                    placeholder="State / Province"
                    className="w-full h-12 px-4 rounded-xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <input
                    type="text"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleInputChange}
                    placeholder="Postal Code *"
                    className="w-full h-12 px-4 rounded-xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <input
                    type="text"
                    value="Pakistan"
                    disabled
                    placeholder="Country (Pakistan Only)"
                    className="w-full h-12 px-4 rounded-xl bg-muted/30 border border-border/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="bg-white rounded-2xl border border-border/50 shadow-soft p-6">
                <h2 className="font-display text-lg font-semibold text-foreground mb-6">Payment Method</h2>
                <div className="grid sm:grid-cols-3 gap-4">

                  {/* Cash on Delivery */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === 'cod' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/50 hover:border-primary/30'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${paymentMethod === 'cod' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className={`w-3 h-3 rounded-full border-2 ${paymentMethod === 'cod' ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                    </div>
                    <p className="font-medium text-sm text-foreground">Cash on Delivery</p>
                    <p className="text-xs text-muted-foreground mt-1">Pay when your order arrives</p>
                  </button>

                  {/* Bank Transfer */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === 'bank_transfer' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/50 hover:border-primary/30'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${paymentMethod === 'bank_transfer' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className={`w-3 h-3 rounded-full border-2 ${paymentMethod === 'bank_transfer' ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                    </div>
                    <p className="font-medium text-sm text-foreground">Bank Transfer</p>
                    <p className="text-xs text-muted-foreground mt-1">Manually transfer & submit ID</p>
                  </button>

                  {/* Safepay */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('safepay')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === 'safepay' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/50 hover:border-primary/30'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${paymentMethod === 'safepay' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className={`w-3 h-3 rounded-full border-2 ${paymentMethod === 'safepay' ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                    </div>
                    <p className="font-medium text-sm text-foreground">Safepay</p>
                    <p className="text-xs text-muted-foreground mt-1">Debit / Credit Card · Secure</p>
                  </button>
                </div>

                {/* Safepay Info Banner */}
                {paymentMethod === 'safepay' && (
                  <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">
                      You'll be securely redirected to Safepay's hosted checkout. We accept Visa, Mastercard & all PKR debit cards.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-border/50 shadow-soft p-6 sticky top-24">
                <h2 className="font-display text-xl font-semibold text-foreground mb-6">
                  Order Summary
                </h2>

                {/* Items */}
                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div 
                        className="w-16 h-16 rounded-lg bg-white border border-border/50 shadow-sm shrink-0 overflow-hidden relative group cursor-pointer"
                        title="Click to zoom"
                        onClick={() => {
                          setSelectedPreviewItem(item);
                          setIsPreviewOpen(true);
                        }}
                      >
                        <ProductThumbnail
                          item={item}
                          className="w-full h-full"
                          imageClassName="p-1 object-contain group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold text-foreground mt-1">
                          {formatPrice(item.totalPrice * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Promo Code / Voucher - Moved inside Order Summary */}
                <div className="bg-muted/30 rounded-xl border border-border/50 p-4 mb-6">
                  {promoResult ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 w-full">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-green-800 truncate">{promoResult.code}</p>
                          <p className="text-[10px] text-green-700 truncate">{promoResult.description || `Saving Rs. ${promoResult.discountAmount.toLocaleString()}`}</p>
                        </div>
                        <button type="button" onClick={handleRemovePromo} className="p-1.5 rounded-lg hover:bg-green-100 text-green-700 shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={e => setPromoInput(e.target.value.toUpperCase())}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyPromo();
                          }
                        }}
                        placeholder="Promo Code (e.g. WELCOME20)"
                        className="flex-1 w-full h-10 px-3 rounded-lg bg-white border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm uppercase tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoInput.trim()}
                        className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center shrink-0 w-full sm:w-auto"
                      >
                        {promoLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Tag className="w-3 h-3 mr-2" />}
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-px bg-border/50 mb-4" />

                {/* Totals */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatPrice(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Promo ({promoCode})
                      </span>
                      <span className="text-green-700 font-medium">− {formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="h-px bg-border/50" />
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-display text-xl font-bold text-foreground">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || safepayLoading}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-full font-medium hover:bg-primary/90 shadow-soft transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(loading || safepayLoading) ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {paymentMethod === 'safepay' ? 'Redirecting to Safepay...' : 'Placing Order...'}
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'safepay' ? (
                        <><Shield className="w-5 h-5" /> Pay with Safepay</>
                      ) : (
                        <><CheckCircle2 className="w-5 h-5" /> Place Order</>
                      )}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  By placing this order, you agree to our Terms of Service
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Central Product Config Preview Modal */}
      <SavedDesignPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        design={selectedPreviewItem ? {
          ...selectedPreviewItem,
          name: selectedPreviewItem.productName,
          savedAt: new Date().toISOString()
        } : null}
        onRestore={() => setIsPreviewOpen(false)}
        onRequestDelete={() => setIsPreviewOpen(false)}
      />
    </SiteLayout>
  );
}
