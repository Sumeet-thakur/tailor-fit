// Main layout: header, nav, cart drawer (header right), saved designs drawer (header right), footer.
// Cart icon and saved designs icon open drawers. Click design thumbnail opens preview modal.
import { ReactNode, useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Scissors, Settings, ChevronDown, Menu, X, ArrowUpRight, Mail, Phone, MapPin, ShoppingBag, User, LogOut, Bookmark, Package, Clock, Layers, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { useRemoveFromCartWithCleanup } from '@/hooks/useRemoveFromCartWithCleanup';
import { ProductThumbnail } from '@/components/common/ProductThumbnail';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { SavedDesignPreviewModal } from '@/components/modals/SavedDesignPreviewModal';
import { formatPrice } from '@/lib/formatPrice';
import { getRestoreUrl } from '@/lib/designRestoration';
import { SavedDesignsDrawer } from '@/components/drawers/SavedDesignsDrawer';
import { CartDrawer } from '@/components/drawers/CartDrawer';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { UserMenuDropdown } from '@/components/layout/UserMenuDropdown';
import { getAvatarUrl } from '@/utils/imageHelper';
// Alert dialog import removed

type SiteLayoutProps = {
  children: ReactNode;
};

const customCategories = [
  { id: 'dress-shirts', label: 'Custom Shirts', desc: 'Premium cotton shirts', path: '/products/bespoke-2d-shirt' },
  { id: 'dress-pants', label: 'Custom Pants', desc: 'Tailored trousers', path: '/products/bespoke-2d-pant' },
  { id: '3d-model', label: '3D Customizer', desc: 'Design in 3D', path: '/products/bespoke-3d-shirt' },
];

export function SiteLayout({ children }: SiteLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showSavedDesigns, setShowSavedDesigns] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount, items, totalAmount, updateQuantity } = useCart();
  const removeFromCart = useRemoveFromCartWithCleanup();
  const { customer, isAuthenticated, logout, deleteDesign } = useCustomerAuth();

  const savedDesignsCount = customer?.savedDesigns?.length || 0;

  // Dynamic categories for header nav dropdown
  // Initialize with static categories to prevent flash - async update only if different
  const [dynamicCategories, setDynamicCategories] = useState<{ id: string, label: string, desc: string, path?: string }[]>(customCategories);

  useEffect(() => {
    import('@/services/products').then(({ getProducts }) => {
      getProducts().then(productsResponse => {
        const products = productsResponse || [];
        const uniqueCats = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
        const mapped = uniqueCats.map(c => {
          let label: string = c;
          let desc = `Custom ${c}`;
          if (c === 'shirt') { label = 'Custom Shirts'; desc = 'Premium cotton shirts'; }
          else if (c === 'pants') { label = 'Custom Pants'; desc = 'Tailored trousers'; }
          else { label = `Custom ${c.charAt(0).toUpperCase() + c.slice(1)}s`; desc = `Tailored ${c}s`; }

          // Prefer 2D product for category link (skip 3D products which have their own separate link)
          const twoDProduct = products.find(p => p.category === c && (p as any).categoryType !== '3d');
          const firstProduct = twoDProduct || products.find(p => p.category === c);
          const categoryId = c === 'shirt' ? 'dress-shirts' : (c === 'pants' ? 'dress-pants' : c);

          return {
            id: categoryId,
            label,
            desc,
            // Link to the 2D product's landing page
            path: firstProduct ? `/products/${firstProduct.slug || firstProduct._id}` : `/products?category=${categoryId}`
          };
        });

        // Custom 3D Tool Link — use first 3D product's slug if available for SEO-friendly URL
        const threeDProduct = products.find(p => (p as any).categoryType === '3d');
        const modelLink = {
          id: '3d-model',
          label: '3D Customizer',
          desc: 'Design in 3D',
          path: threeDProduct ? `/products/${threeDProduct.slug || threeDProduct._id}` : '/3d-customizer'
        };

        // Sorting: Shirts, Pants, [Others], 3D
        const order = ['dress-shirts', 'dress-pants'];
        const sorted = [...mapped].sort((a, b) => {
          const ia = order.indexOf(a.id);
          const ib = order.indexOf(b.id);
          if (ia !== -1 && ib !== -1) return ia - ib;
          if (ia !== -1) return -1;
          if (ib !== -1) return 1;
          return a.label.localeCompare(b.label);
        });

        const newCategories = [...sorted, modelLink];

        // Only update state if categories actually changed (prevents unnecessary re-render)
        setDynamicCategories(prev => {
          const prevIds = prev.map(c => c.id + c.path).join(',');
          const newIds = newCategories.map(c => c.id + (c.path || '')).join(',');
          if (prevIds === newIds) return prev; // No change, don't trigger re-render
          return newCategories;
        });
      });
    });
  }, []);

  // Lock body scroll when drawers are open
  useEffect(() => {
    if (showCartDrawer || showSavedDesigns) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCartDrawer, showSavedDesigns]);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-500 ${isScrolled
          ? 'bg-primary/95 backdrop-blur-xl shadow-elevated py-2'
          : 'bg-primary py-3'
          }`}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between relative">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-accent shadow-glow transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scissors h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-45">
                    <circle cx="6" cy="6" r="3"></circle>
                    <path d="M8.12 8.12 12 12"></path>
                    <path d="M20 4 8.12 15.88"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <path d="M14.8 14.8 20 20"></path>
                  </svg>
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display text-xl font-bold text-white">Tailor Fit</h1>
                <p className="text-[11px] font-medium text-white/60">Bespoke Tailoring</p>
              </div>
            </Link>

            {/* Center Navigation - Absolutely centered */}
            <nav className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-2 py-1.5">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-10 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${isActive
                      ? 'bg-white text-primary shadow-soft'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  Home
                </NavLink>

                {/* Custom Dropdown */}
                <div
                  className="relative"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <button
                    className="flex items-center justify-center gap-1.5 px-7 py-2.5 rounded-full text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
                    type="button"
                  >
                    Custom
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  <div className={`absolute left-1/2 -translate-x-1/2 top-full pt-4 transition-all duration-300 ease-out ${isDropdownOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}>
                    <div className="w-[380px] rounded-2xl bg-white border border-border/50 p-3 shadow-float">
                      <div className="grid grid-cols-2 gap-1">
                        {(dynamicCategories.length > 0 ? dynamicCategories : customCategories).map((category, i) => (
                          <Link
                            key={category.id}
                            to={category.path || `/products?category=${category.id}`}
                            className="group flex items-start gap-3 rounded-xl p-3 hover:bg-muted/50 transition-all duration-300"
                          >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center shrink-0 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                              <Scissors className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{category.label}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{category.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <NavLink
                  to="/products"
                  className={({ isActive }) =>
                    `px-7 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${isActive
                      ? 'bg-white text-primary shadow-soft'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  Collection
                </NavLink>
              </div>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3 z-10">
              {/* Notifications - Only show when authenticated */}
              {isAuthenticated && <NotificationPanel />}

              {/* Saved Designs Button - Only show when authenticated */}
              {isAuthenticated && (
                <button
                  onClick={() => {
                    if (showSavedDesigns) {
                      setShowSavedDesigns(false);
                    } else {
                      setShowSavedDesigns(true);
                      setShowCartDrawer(false);
                    }
                  }}
                  className={`relative p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:ring-1 hover:ring-white transition-all duration-300 ${showSavedDesigns ? 'bg-white/20 ring-1 ring-white' : ''}`}
                  title="Saved Designs"
                >
                  <Bookmark className="w-5 h-5" />
                  {savedDesignsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-primary text-xs font-bold flex items-center justify-center">
                      {savedDesignsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Cart Button */}
              <button
                onClick={() => {
                  if (showCartDrawer) {
                    setShowCartDrawer(false);
                  } else {
                    setShowCartDrawer(true);
                    setShowSavedDesigns(false);
                  }
                }}
                className={`relative p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:ring-1 hover:ring-white transition-all duration-300 ${showCartDrawer ? 'bg-white/20 ring-1 ring-white' : ''}`}
              >
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-primary text-xs font-bold flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* User Account */}
              {isAuthenticated ? (
                <div className="hidden sm:block">
                  <UserMenuDropdown showExtraLinks={true} />
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
                >
                  <User className="h-4 w-4" />
                  <span>Sign In</span>
                </Link>
              )}



              {/* Mobile Menu Toggle */}
              <button
                className="lg:hidden p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden absolute top-full left-0 right-0 bg-primary border-t border-white/10 shadow-elevated transition-all duration-300 ease-out overflow-y-auto max-h-[80vh] origin-top ${isMobileMenuOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
            }`}>
          <nav className="container mx-auto px-4 py-6 space-y-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `block px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `block px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              Collection
            </NavLink>

            <div className="pt-3 mt-3 border-t border-white/10">
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                Custom Clothing
              </p>
              {(dynamicCategories.length > 0 ? dynamicCategories : customCategories).map((category) => (
                <Link
                  key={category.id}
                  to={category.path || `/products?category=${category.id}`}
                  className="block px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {category.label}
                </Link>
              ))}
            </div>

            <div className="pt-3 mt-3 border-t border-white/10">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/account"
                    className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-white/80 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-300"
                  >
                    <User className="w-4 h-4" />
                    My Account
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-base font-semibold text-red-300 hover:bg-white/10 hover:text-red-200 rounded-xl transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-white/80 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-300"
                >
                  <User className="w-4 h-4" />
                  Sign In / Sign Up
                </Link>
              )}
            </div>


          </nav>
        </div>
      </header>

      {isAuthenticated && (
        <SavedDesignsDrawer
          open={showSavedDesigns}
          onClose={() => setShowSavedDesigns(false)}
          count={savedDesignsCount}
        >
          {savedDesignsCount === 0 ? (
            <div className="text-center py-8">
              <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No saved designs yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Save your current configuration to see it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...(customer?.savedDesigns || [])]
                .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
                .map((design) => (
                  <div key={design._id} className="p-3 rounded-xl border border-border/50 bg-muted/30 hover:border-primary/30 transition-all">
                    <div className="flex gap-3">
                      <div
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => { setSelectedDesign(design); setIsDesignModalOpen(true); }}
                      >
                        <ProductThumbnail
                          item={design}
                          className="w-16 h-16 rounded-lg bg-white border border-border/30 shrink-0"
                          imageClassName="p-1"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{design.productName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(design.savedAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm font-semibold text-primary mt-1">{formatPrice(design.totalPrice)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          navigate(getRestoreUrl(design));
                          setShowSavedDesigns(false);
                        }}
                        className="flex-1 px-3 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                      >
                        Open Design
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();

                          // Direct deletion without confirmation modal
                          try {
                            const result = await deleteDesign(design._id);
                            if (result.success) {
                              toast.success('Design deleted successfully');
                            } else {
                              toast.error(result.message || 'Failed to delete design');
                            }
                          } catch (err) {
                            toast.error('An error occurred while deleting');
                          }
                        }}
                        className="px-3 py-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </SavedDesignsDrawer>
      )}

      <CartDrawer
        open={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        items={items}
        itemCount={itemCount}
        totalAmount={totalAmount}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        useProductThumbnail
        onItemPreviewClick={(item) => {
          // Adapt CartItem to Design structure for the modal
          const design = {
            ...item,
            _id: item.id, // Modal expects _id or id
            name: item.productName,
            config: item.config,
            styles: item.styles || item.config?.styles,
            fabric: item.fabric || item.config?.fabric,
            productCategory: item.productCategory,
          };
          setSelectedDesign(design);
          setIsDesignModalOpen(true);
        }}
      />

      <ChatWidget />

      {/* Main Content */}
      <main className="flex-1 pt-14">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white mt-auto overflow-hidden">
        {/* Top Section */}
        <div className="container mx-auto px-4 lg:px-8 py-16">
          <div className="grid gap-12 lg:grid-cols-4 min-w-0">
            {/* Brand */}
            <div className="lg:col-span-2 space-y-6">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-glow">
                  <Scissors className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">Tailor Fit</h2>
                  <p className="text-sm text-white/60">Bespoke Tailoring</p>
                </div>
              </Link>
              <p className="text-white/70 leading-relaxed max-w-md">
                Crafting exceptional custom garments since 2020. Every piece is tailored to perfection,
                combining traditional craftsmanship with modern design.
              </p>
              <div className="flex gap-4">
                {['facebook', 'instagram', 'twitter'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-all duration-300"
                  >
                    <span className="text-xs font-bold uppercase">{social[0]}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-display text-lg font-semibold mb-6">Quick Links</h3>
              <ul className="space-y-3">
                {[
                  ...(dynamicCategories.length > 0 ? dynamicCategories : customCategories).map(c => ({
                    label: c.label,
                    path: c.path || '/'
                  })),
                  { label: 'Track Order', path: '/track-order' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className="text-white/70 hover:text-accent transition-colors duration-300 flex items-center gap-2 group"
                    >
                      <span className="w-0 h-px bg-accent transition-all duration-300 group-hover:w-4" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold mb-6">Contact Us</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 min-w-0">
                  <MapPin className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-white/70 break-words">Clifton, Karachi<br />Pakistan</span>
                </li>
                <li className="flex items-center gap-3 min-w-0">
                  <Mail className="w-5 h-5 text-accent shrink-0" />
                  <a href="mailto:info@tailorfit.pk" className="text-white/70 hover:text-accent transition-colors break-all">
                    info@tailorfit.pk
                  </a>
                </li>
                <li className="flex items-center gap-3 min-w-0">
                  <Phone className="w-5 h-5 text-accent shrink-0" />
                  <a href="tel:+923001234567" className="text-white/70 hover:text-accent transition-colors whitespace-nowrap">
                    +92 300 1234567
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-white/50">
                © {new Date().getFullYear()} Tailor Fit. All rights reserved.
              </p>
              <p className="text-sm text-white/50 flex items-center gap-2">
                Crafted with <span className="text-red-400">♥</span> at <a href="https://darosoft.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">DAROSOFT</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
      {/* Saved Design Preview Modal */}
      {
        selectedDesign && (
          <SavedDesignPreviewModal
            isOpen={isDesignModalOpen}
            onClose={() => setIsDesignModalOpen(false)}
            design={selectedDesign}
            onRestore={(design) => {
              navigate(getRestoreUrl(design));
              setIsDesignModalOpen(false);
              setShowSavedDesigns(false);
            }}
            onRequestDelete={(designId) => {
              // Direct deletion without confirmation modal
              if (designId.startsWith('cart')) {
                removeFromCart(designId);
                toast.success('Removed from cart');
              } else {
                deleteDesign(designId)
                  .then((result) => {
                    if (result.success) {
                      toast.success('Design deleted successfully');
                    } else {
                      toast.error(result.message || 'Failed to delete design');
                    }
                  })
                  .catch(() => {
                    toast.error('An error occurred while deleting');
                  });
              }
              setIsDesignModalOpen(false);
            }}
          />
        )
      }
    </div>
  );
}
