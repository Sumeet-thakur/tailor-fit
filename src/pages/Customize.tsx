import { useEffect, useMemo, useState, useRef } from 'react';
import { TransitionImage } from '@/components/common/TransitionImage';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useScreenshotCapture2D } from '@/hooks/useScreenshotCapture2D';
import { getItemPreviewImage } from '@/lib/screenshotUtils';
import { useCustomization as useShirt } from '@/context/CustomizationContext';
import { useCart } from '@/context/CartContext';
import { useRemoveFromCartWithCleanup } from '@/hooks/useRemoveFromCartWithCleanup';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Eye, Layers, Ruler, Save, ShoppingBag, Sparkles, Bookmark, Clock, Settings, Scissors, Home, User, Trash2, Plus, Minus, LogOut, Package, Box, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { showSuccess, showError, showLoading, showInfo } from '@/lib/toastHelpers';
import { FABRIC_CATEGORIES } from '@/types/fabric';
import defaultShirt from '@/assets/shirt-preview.png';
import { getImageUrl } from '@/utils/imageHelper';
import { SavedDesignPreviewModal } from '@/components/modals/SavedDesignPreviewModal';
import { CustomizerHeader } from '@/components/layout/CustomizerHeader';
import { ProductPreview } from '@/components/preview/ProductPreview';
import { formatPrice } from '@/lib/formatPrice';
import { preloadImages } from '@/lib/imagePreload';
import { getSavedDesigns, saveDesign as saveDesignToLocal, deleteDesign as deleteLocalDesign, findDesignById, getDesignsByProduct } from '@/lib/savedDesignsStorage';
import { buildCartItem2D } from '@/lib/cartItemBuilder';
import { getRestoreUrl, getRestoreDesignId, isDesign3D } from '@/lib/designRestoration';
import { useDesignRestore2D } from '@/hooks/useDesignRestore2D';
import { SavedDesignsDrawer } from '@/components/drawers/SavedDesignsDrawer';
import { CartDrawer } from '@/components/drawers/CartDrawer';
import { MeasurementsForm } from '@/components/customize/MeasurementsForm';
import { SelectedCustomizationsChips } from '@/components/customize/SelectedCustomizationsChips';
import { useCustomizationDrafts } from '@/hooks/customize/useCustomizationDrafts';
import { useCustomizationSteps } from '@/hooks/customize/useCustomizationSteps';
import { CustomizationSteps } from '@/components/customize/CustomizationSteps';
import { FabricSelector } from '@/components/customize/FabricSelector';
import { StyleSelector } from '@/components/customize/StyleSelector';
import NotFound from '@/pages/NotFound';

export default function CustomizePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const restoreDesignId = getRestoreDesignId(searchParams);
  const { addToCart, itemCount, items, updateQuantity, totalAmount } = useCart();
  const removeFromCart = useRemoveFromCartWithCleanup();
  const { customer, isAuthenticated, logout, saveDesign, saveMeasurements, deleteDesign } = useCustomerAuth();

  const {
    loadProduct,
    product,
    productNotFound,
    config,
    totalPrice,
    fabrics,
    productFabrics,
    styleGroups,
    setFabric,
    setOption,
    updateMeasurements,
    viewMode,
    setViewMode,
  } = useShirt();

  // [URL Management] Ensures users are on the correct page variant (2D vs 3D) and using SEO-friendly slugs
  useEffect(() => {
    // [Action] Validate the loaded product against the current browser URL
    // [Purpose] Prevents rendering incorrect product types or using legacy Mongo IDs in the address bar
    if (!product?.slug || !id) return;

    // Check if the product's slug or _id matches what we requested
    const productMatchesUrl = product.slug === id || product._id === id;

    if (productMatchesUrl) {
      // 1. [Security Redirect] If a 3D product is accessed via the 2D route, bounce to the 3D customizer
      if (product.categoryType === '3d') {
        const queryStr = searchParams.toString();
        const suffix = queryStr ? `?${queryStr}` : '';
        navigate(`/customize-3d/${product.slug}${suffix}`, { replace: true });
        return;
      }

      // 2. [SEO Redirect] If accessed via Mongo ID, normalize the URL to use the SEO slug
      if (product.slug !== id) {
        navigate(`/customize/${product.slug}?${searchParams.toString()}`, { replace: true });
      }
    }
  }, [product, id, navigate, searchParams]);


  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // Saved Design Modal State
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);

  // Cart Preview Modal State
  const [selectedCartItem, setSelectedCartItem] = useState<any>(null);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  // Screenshot refs and state
  const mobilePreviewRef = useRef<HTMLDivElement>(null);
  const desktopPreviewRef = useRef<HTMLDivElement>(null);
  const [previewZoom, setPreviewZoom] = useState(1);


  // Track which id we're loading to prevent stale redirect
  const loadingIdRef = useRef<string | null>(null);

  // Load product when id changes
  useEffect(() => {
    if (id && id !== loadingIdRef.current) {
      loadingIdRef.current = id;
      const fabricId = searchParams.get('fabric');
      loadProduct(id, fabricId || undefined);
    }
  }, [id, loadProduct, searchParams]);

  // Lock body scroll when drawers are open


  // Load saved designs from both localStorage and account (all designs, not filtered by product)


  useDesignRestore2D({
    restoreDesignId,
    product,
    productId: id,
    customerDesigns: customer?.savedDesigns,
    productFabrics,
    styleGroups,
    setters: {
      setFabric,
      setOption,
      updateMeasurements,
    },
  });

  // Calculate color hue
  const getHueFromColor = (color: string): number => {
    if (!color || color === '#FFFFFF' || color === '#ffffff') return 0;
    // Basic hue math
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    if (max === r) h = ((g - b) / (max - min)) * 60;
    else if (max === g) h = (2 + (b - r) / (max - min)) * 60;
    else h = (4 + (r - g) / (max - min)) * 60;
    return h < 0 ? h + 360 : h;
  };

  const isShirt = !product || product.category === 'shirt';
  const productType = (product?.category === 'pants' ? 'pants' : 'shirt') as 'shirt' | 'pants';

  const captureScreenshot = useScreenshotCapture2D({
    mobileRef: mobilePreviewRef,
    desktopRef: desktopPreviewRef,
    productType,
    productName: product?.name,
    customerId: customer?._id,
  });

  const [activeCategory, setActiveCategory] = useState<string>('');

  const {
    saved,
    savedDesigns,
    showSavedDesigns,
    setShowSavedDesigns,
    pendingAction,
    setPendingAction,
    isGeneratingScreenshot,
    setIsGeneratingScreenshot,
    saveDraft,
    restoreDraft,
    removeDraft
  } = useCustomizationDrafts({
    product,
    captureScreenshot: () => captureScreenshot('saved-designs'),
    totalPrice
  });

  // Lock body scroll when drawers are open
  useEffect(() => {
    if (showSavedDesigns || showCartDrawer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSavedDesigns, showCartDrawer]);

  const {
    activeStep,
    setActiveStep,
    steps,
    getStepOptions,
    getSelectedOption,
    handleSelectOption,
  } = useCustomizationSteps({
    product
  });

  // prioritize product-specific fabrics

  const fabricOptions = useMemo(() => {
    if (productFabrics.length > 0) return productFabrics;
    if (fabrics.length > 0) return fabrics;
    return [];
  }, [productFabrics, fabrics]);

  const availableCategories = useMemo(() => {
    return FABRIC_CATEGORIES.filter(cat => fabricOptions.some(f => f.category === cat.value));
  }, [fabricOptions]);

  const filteredFabrics = useMemo(() => {
    return activeCategory && activeCategory !== 'all'
      ? fabricOptions.filter(f => f.category === activeCategory)
      : fabricOptions;
  }, [fabricOptions, activeCategory]);

  const isHalfSleeve = config?.sleeve?.name?.toLowerCase().includes('half') || config?.sleeve?.name?.toLowerCase().includes('short');





  const handleAddToCart = async () => {
    if (!product) return;

    setPendingAction('add-to-cart');
    setAddingToCart(true);
    setIsGeneratingScreenshot(true);

    let screenshotUrl = `/images/placeholders/${productType}.svg`;
    try {
      screenshotUrl = await captureScreenshot('cart-items');
    } catch (err) {
      console.error('Screenshot generation error:', err);
    }

    try {
      const item = buildCartItem2D({
        product,
        config,
        totalPrice,
        screenshot: screenshotUrl,
        configForPreview: config,
      });

      addToCart(item);

      showSuccess('Added to cart!', product.name);
      setShowCartDrawer(true);

    } catch (error) {
      console.error("Add to cart failed:", error);
      showError("Failed to add to cart");
    } finally {
      setPendingAction(null);
      setAddingToCart(false);
      setIsGeneratingScreenshot(false);
    }
  };



  const baseImage = useMemo(() => {
    // For pants: the 'fit' layer explicitly handles the base image in ProductPreview naturally via dynamic IDs
    if (product?.category === 'pants') {
      return '';
    }

    // For shirts (or default):
    if (viewMode === 'back') {
      return config.fabric?.backPreviewImage || '';
    }
    return config.fabric?.previewImage || '';
  }, [viewMode, config.fabric, product?.category]);

  // Redirect to 404 if product is explicitly not found (e.g., 2D disabled or wrong ID)
  if (productNotFound) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col lg:h-screen lg:w-screen lg:overflow-hidden">
      <CustomizerHeader
        title={product?.name || 'Customizer'}
        subtitle={product?.category || 'Loading...'}
        savedCount={savedDesigns.length}
        cartCount={itemCount}
        onSavedClick={() => { setShowSavedDesigns(!showSavedDesigns); setShowCartDrawer(false); }}
        onCartClick={() => { setShowCartDrawer(!showCartDrawer); setShowSavedDesigns(false); }}
        isAuthenticated={isAuthenticated}
        customer={customer}
        onLogout={logout}
        onCloseUserMenu={() => { }}
        showExtraLinks={true}
        isSavedOpen={isDesignModalOpen}
        isCartOpen={showCartDrawer}
      />

      <SavedDesignsDrawer
        open={showSavedDesigns}
        onClose={() => setShowSavedDesigns(false)}
        count={savedDesigns.length}
      >
        {savedDesigns.length === 0 ? (
          <div className="text-center py-8">
            <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No saved designs yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Save your current configuration to see it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedDesigns.map((design) => (
              <div key={design.id} className="p-3 rounded-xl border border-border/50 bg-muted/30 hover:border-primary/30 transition-all">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-white border border-border/30 overflow-hidden shrink-0">
                    {getItemPreviewImage(design) ? (
                      <img src={getItemPreviewImage(design)!} alt={design.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layers className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{design.name || design.productName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(design.savedAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-semibold text-primary mt-1">{formatPrice(design.totalPrice)}</p>
                  </div>
                </div>
                {design.config?.fabric && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">Fabric: {design.config.fabric.name}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setSelectedDesign(design); setIsDesignModalOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-border/50 rounded-lg hover:border-primary/50 transition-all text-primary"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => {
                      if (design.config) {
                        restoreDraft(design);
                      } else {
                        const url = getRestoreUrl(design, id ?? undefined);
                        if (isDesign3D(design)) {
                          window.location.href = url;
                        } else {
                          navigate(url);
                        }
                        setShowSavedDesigns(false);
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => removeDraft(design.id)}
                    className="px-3 py-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SavedDesignsDrawer>

      <CartDrawer
        open={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        items={items}
        itemCount={itemCount}
        totalAmount={totalAmount}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        onItemPreviewClick={(item) => {
          if (item.config) {
            setSelectedCartItem(item);
            setIsCartModalOpen(true);
          }
        }}
      />

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-0">
        {/* Mobile Layout < 1024px */}
        <div className="lg:hidden flex flex-col">
          {/* Preview Row: Preview + Step Buttons (vertical on > 450px) */}
          <div className="flex flex-row h-[60vh] min-h-[400px] max-h-[550px] min-[450px]:h-[70vh] min-[450px]:min-h-[550px] min-[450px]:max-h-[850px] min-[900px]:h-[75vh] min-[900px]:min-h-[600px] min-[900px]:max-h-[900px]">
            {/* Preview Section - Mobile */}
            <div className="flex-1 relative overflow-hidden bg-background flex flex-col">
              {/* Navigation Buttons - Upper Left - Fixed position with proper z-index */}
              <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                <Link
                  to={product ? `/products/${product._id}` : '/products'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-foreground hover:bg-muted shadow-md transition-all border border-border/50 text-xs font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </Link>
              </div>

              {/* View Toggle - Upper Right - Fixed position with proper z-index */}
              <div className="absolute top-3 right-3 z-30 flex gap-1.5">
                <button
                  onClick={() => setViewMode('front')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-md ${viewMode === 'front'
                    ? 'bg-primary text-white'
                    : 'bg-white text-foreground hover:bg-muted border border-border/50'
                    }`}
                >
                  Front
                </button>
                <button
                  onClick={() => setViewMode('back')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-md ${viewMode === 'back'
                    ? 'bg-primary text-white'
                    : 'bg-white text-foreground hover:bg-muted border border-border/50'
                    }`}
                >
                  Back
                </button>
              </div>

              <div className="flex-1 relative m-3 mt-14 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-soft border border-border/50 overflow-hidden">
                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.15]" style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.05) 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }} />

                {/* Preview Container - With top padding to avoid button overlap */}
                <div className="absolute inset-0 flex items-center justify-center min-[900px]:p-6">
                  <div
                    className="relative w-full h-full max-w-[420px] min-[450px]:max-w-[550px] min-[900px]:max-w-[650px] aspect-[3/4] transition-opacity duration-200"
                    ref={mobilePreviewRef}
                    data-screenshot-target="mobile"
                    data-product-type={product?.category || 'shirt'}
                  >
                    <ProductPreview
                      product={product}
                      config={config}
                      viewMode={viewMode}
                      baseImage={baseImage}
                      showControls={false}
                      className="w-full h-full"
                      activeStep={activeStep}
                      zoom={previewZoom}
                      onZoomIn={() => setPreviewZoom(z => Math.min(z + 0.2, 2))}
                      onZoomOut={() => setPreviewZoom(z => Math.max(z - 0.2, 0.6))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step Buttons - Vertical on screens >= 450px, hidden on smaller (shown horizontally below) */}
            <CustomizationSteps
              steps={steps}
              activeStep={activeStep}
              onStepChange={setActiveStep}
              variant="vertical"
              getSelectedOption={getSelectedOption}
              className="hidden min-[450px]:flex bg-transparent border-l border-border/50 mb-3"
            />
          </div>

          {/* Step Buttons - Horizontal on screens < 450px */}
          <CustomizationSteps
            steps={steps}
            activeStep={activeStep}
            onStepChange={setActiveStep}
            variant="horizontal"
            getSelectedOption={getSelectedOption}
            className="min-[450px]:hidden"
          />
        </div>

        {/* Mobile: Selected Customizations Section - Only for screens >= 450px and < 1024px */}
        <SelectedCustomizationsChips
          config={config}
          isShirt={isShirt}
          variant="compact"
          maxStyleChips={3}
          className="hidden min-[450px]:block lg:hidden px-3 py-3 mx-3 mb-8 mt-2 rounded-xl bg-white/80 backdrop-blur-sm border border-border/50 shadow-sm shrink-0"
        />

        {/* Desktop Layout: Left - Preview Section */}
        <div className="hidden lg:flex w-[45%] bg-background border-border/50 flex-col overflow-hidden relative z-0">
          {/* Desktop Left Column - Preview Content */}
          <div className="flex-1 bg-white/80 w-full h-full flex flex-col p-4 lg:p-5 relative overflow-hidden">
            {/* Header Controls - Non-overlapping */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              {/* Left Buttons */}
              <div className="flex items-center gap-2">
                <Link
                  to={product ? `/products/${product._id}` : '/products'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-border/50 text-foreground hover:bg-muted shadow-sm transition-all text-xs font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </Link>
                <Link
                  to="/products"
                  className="px-3 py-1.5 rounded-lg bg-white border border-border/50 text-foreground hover:bg-muted shadow-sm transition-all text-xs font-medium"
                >
                  Products
                </Link>
              </div>

              {/* Right Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewMode('front')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${viewMode === 'front'
                    ? 'bg-primary text-white'
                    : 'bg-white border border-border/50 text-foreground hover:bg-muted'
                    }`}
                >
                  Front
                </button>
                <button
                  onClick={() => setViewMode('back')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${viewMode === 'back'
                    ? 'bg-primary text-white'
                    : 'bg-white border border-border/50 text-foreground hover:bg-muted'
                    }`}
                >
                  Back
                </button>
              </div>
            </div>

            <div className="flex-1 relative rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-soft overflow-hidden w-full mb-4 border border-border/50">
              {/* Preview Container */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div
                  className="relative w-full h-full max-w-[400px] aspect-[3/4] transition-opacity duration-200 desktop-preview-container"
                  style={{ animation: 'scaleIn 0.3s ease-out' }}
                  ref={desktopPreviewRef}
                  data-screenshot-target="desktop"
                  data-product-type={product?.category || 'shirt'}
                >
                  <ProductPreview
                    product={product}
                    config={config}
                    viewMode={viewMode}
                    baseImage={baseImage}
                    showControls={false}
                    className="w-full h-full"
                    activeStep={activeStep}
                    zoom={previewZoom}
                    onZoomIn={() => setPreviewZoom(z => Math.min(z + 0.2, 2))}
                    onZoomOut={() => setPreviewZoom(z => Math.max(z - 0.2, 0.6))}
                  />
                </div>
              </div>
            </div>

            {/* Selected Choices Section - Overlay style to match 3D */}
            <SelectedCustomizationsChips
              config={config}
              isShirt={isShirt}
              variant="standard"
              maxStyleChips={4}
              className="rounded-2xl bg-white/80 backdrop-blur-sm border shadow-soft p-4 shrink-0 overflow-scroll"
            />
          </div>
        </div>

        {/* Right - Customization Panel (Options at bottom on mobile, side panel on desktop) */}
        <div className="flex-1 flex flex-col lg:flex-row bg-transparent overflow-hidden relative min-w-0">
          {/* Selection Buttons - Hidden on mobile (shown in preview section), Vertical on desktop */}
          <CustomizationSteps
            steps={steps}
            activeStep={activeStep}
            onStepChange={setActiveStep}
            variant="vertical"
            getSelectedOption={getSelectedOption}
            className="hidden lg:flex bg-white border-r border-border/50 z-10 shrink-0 h-full scrollbar-hide"
          />

          {/* Options Panel */}
          <div
            key={activeStep}
            className="w-full lg:flex-1 bg-white/80 backdrop-blur-sm flex flex-col overflow-hidden min-w-0 h-full"
          >
            {/* Header - Fixed matches 3D customizer */}
            <div className="p-4 lg:p-5 border-b border-border/50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-display text-base lg:text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-1 h-5 lg:h-6 bg-gradient-to-b from-primary to-accent rounded-full" />
                  {steps.find(s => s.id === activeStep)?.label || 'Select'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 ml-3 lg:ml-4">
                  {activeStep === 'fabric' && 'Choose from our premium fabric collection'}
                  {activeStep === 'measurements' && 'Enter your body measurements for a perfect fit'}
                  {activeStep !== 'fabric' && activeStep !== 'measurements' && 'Select your preferred style option'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(product?.category === 'shirt') && (
                  <Link
                    to={`/customize-3d/${product?.slug || product?.category}`}
                    state={{ returnProductId: id, fabric: config.fabric?.id }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-all border border-border/50 flex items-center gap-1.5 shadow-sm"
                  >
                    Switch to 3D
                  </Link>
                )}
              </div>
            </div>

            {/* Scrollable Options Content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {/* Fabric Selection */}
              {activeStep === 'fabric' && (
                <>
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeCategory === 'all' ? 'bg-primary text-white shadow-md' : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted'}`}
                    >
                      All
                    </button>
                    {availableCategories.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setActiveCategory(cat.value)}
                        className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeCategory === cat.value ? 'bg-primary text-white shadow-md' : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted'}`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <FabricSelector
                    fabrics={filteredFabrics}
                    selectedFabricId={config.fabric?.id}
                    onSelect={setFabric}
                  />
                </>
              )}

              {/* Style Options */}
              {activeStep !== 'fabric' && activeStep !== 'measurements' && (
                <StyleSelector
                  options={getStepOptions(activeStep)}
                  selectedOptionId={getSelectedOption(activeStep)?.id}
                  onSelect={(option) => handleSelectOption(activeStep, option)}
                  showNoneOption={['pocket', 'back', 'vents'].includes(activeStep)}
                  onNoneSelect={() => handleSelectOption(activeStep, null)}
                  noneLabel={steps.find(s => s.id === activeStep)?.label}
                />
              )}

              {/* Measurements */}
              {activeStep === 'measurements' && (
                <MeasurementsForm
                  measurements={(config.measurements || {}) as Record<string, string>}
                  onChange={(m) => updateMeasurements(m)}
                  productCategory={product?.category}
                  productName={product?.name}
                  isAuthenticated={isAuthenticated}
                  saveMeasurements={saveMeasurements ?? undefined}
                  variant="2d"
                />
              )}
            </div>

            {/* Bottom Actions - Fixed at bottom right */}
            <div className="p-4 lg:p-5 bg-white border-t border-border/50 shrink-0">
              {/* Selected Customizations - Only for screens < 450px, positioned before price box */}
              <SelectedCustomizationsChips
                config={config}
                isShirt={isShirt}
                variant="compact"
                maxStyleChips={3}
                className="min-[450px]:hidden mb-4 sm:mb-8 p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-border/50 shadow-sm"
              />

              {/* Price Summary */}
              <div className="flex items-center justify-between mb-3 lg:mb-4 p-3 lg:p-4 rounded-xl bg-accent/10">
                <div>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">Total Price</p>
                  <p className="font-display text-xl lg:text-2xl font-bold text-foreground">{formatPrice(totalPrice)}</p>
                </div>
                <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-accent" />
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
                <button
                  onClick={saveDraft}
                  disabled={pendingAction !== null}
                  className={`flex-1 flex items-center justify-center gap-1.5 lg:gap-2 px-4 lg:px-6 py-3 lg:py-4 rounded-xl text-xs lg:text-sm font-semibold transition-all duration-300 ${saved
                    ? 'bg-green-600 text-white'
                    : 'bg-muted/50 text-foreground hover:bg-muted'
                    } disabled:opacity-50`}
                >
                  {saved ? <Check className="w-4 h-4 lg:w-5 lg:h-5" /> : <Save className="w-4 h-4 lg:w-5 lg:h-5" />}
                  {saved ? 'Saved!' : pendingAction === 'save' ? 'Saving...' : 'Save Design'}
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={pendingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2 px-4 lg:px-6 py-3 lg:py-4 rounded-full text-xs lg:text-sm font-semibold bg-primary text-white hover:bg-primary/90 shadow-soft transition-all disabled:opacity-50"
                >
                  <ShoppingBag className="w-4 h-4 lg:w-5 lg:h-5" />
                  {pendingAction === 'add-to-cart' ? 'Adding to Cart...' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SavedDesignPreviewModal
        isOpen={isDesignModalOpen}
        onClose={() => setIsDesignModalOpen(false)}
        design={selectedDesign}
        onRequestDelete={(id) => removeDraft(id)}
        onRestore={(design) => {
          // Same restore logic as the direct button
          if (design.config) {
            restoreDraft(design);
          } else {
            const url = getRestoreUrl(design, id ?? undefined);
            if (isDesign3D(design)) {
              window.location.href = url;
            } else {
              navigate(url);
            }
            setShowSavedDesigns(false);
          }
        }}
      />
      <SavedDesignPreviewModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        design={selectedCartItem ? {
          ...selectedCartItem,
          savedAt: selectedCartItem.addedAt,
          name: selectedCartItem.productName
        } : null}
        onRequestDelete={(id) => {
          if (selectedCartItem) {
            removeFromCart(selectedCartItem.id);
            setIsCartModalOpen(false);
          }
        }}
        onRestore={() => {
          setIsCartModalOpen(false);
        }}
      />
    </div >
  );
}