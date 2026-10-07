import { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import type { Fabric3D, FabricCategory } from '@/types/fabric';
import { fetchFabrics, getTextureUrl, getFabricThumbnailUrl } from '@/services/fabricService';
import { FABRIC_CATEGORIES } from '@/types/fabric';
import { useCart } from '@/context/CartContext';
import { useRemoveFromCartWithCleanup } from '@/hooks/useRemoveFromCartWithCleanup';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { ArrowLeft, ZoomIn, ZoomOut, User, Bookmark, Layers, Sparkles, Shirt, Loader2 } from 'lucide-react';
import { showSuccess, showError, showLoading, showInfo } from '@/lib/toastHelpers';
import { Input } from '@/components/ui/input';
import { useScreenshotCapture3D } from '@/hooks/useScreenshotCapture3D';
import { getItemPreviewImage } from '@/lib/screenshotUtils';
import ProductPreview3D from '@/components/preview/ProductPreview3D';
import { CustomizerHeader } from '@/components/layout/CustomizerHeader';
import { formatPrice } from '@/lib/formatPrice';
import { productService } from '@/services/products';
import { buildCartItem3D, buildCartItem3DWithScreenshot } from '@/lib/cartItemBuilder';
import { getRestoreUrl, getRestoreDesignId, isDesign3D } from '@/lib/designRestoration';
import { useDesignRestore3D } from '@/hooks/useDesignRestore3D';
import { SavedDesignsDrawer } from '@/components/drawers/SavedDesignsDrawer';
import { CartDrawer } from '@/components/drawers/CartDrawer';
import { MeasurementsForm } from '@/components/customize/MeasurementsForm';
import { Configurator3DControls } from '@/components/customize/Configurator3DControls';
import { StepNavigation3D } from '@/components/customize/StepNavigation3D';
import { MobileStepNavigation3D } from '@/components/customize/MobileStepNavigation3D';
import { useCustomize3DScene } from '@/hooks/customize/useCustomize3DScene';
import { use3DConfiguration } from '@/hooks/customize/use3DConfiguration';

import { GARMENT_COLORS, COLLAR_OPTIONS, CUFF_OPTIONS, POCKET_OPTIONS, PLACKET_OPTIONS } from '@/constants/shirtOptions3D';





// Main 3D Customizer Page
export default function Customize3D() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const location = useLocation();

    // Read from state first, fallback to query params for legacy links
    const productIdFromUrl = location.state?.returnProductId || searchParams.get('productId');
    const fabricIdFromUrl = location.state?.fabric || searchParams.get('fabric');

    const navigate = useNavigate();

    const backHref = productIdFromUrl ? `/products/${productIdFromUrl}` : '/products';

    // Scene Hook
    const {
        product,
        modelPath,
        environmentUrl,
        fabrics,
        isLoading,
        error: sceneError,
        validProductType: pType // Comes directly from the loaded 3D product
    } = useCustomize3DScene({ id: id || '' });

    // Configuration Hook
    const {
        selectedFabric, setSelectedFabric,
        activeCategory, setActiveCategory,
        activeStep, setActiveStep,
        useModularModel, setUseModularModel,
        selectedCollar, setSelectedCollar,
        selectedCuff, setSelectedCuff,
        selectedPocket, setSelectedPocket,
        selectedPlacket, setSelectedPlacket,
        collarEdgeColor, setCollarEdgeColor,
        collarStitchColor, setCollarStitchColor,
        collarButtonColor, setCollarButtonColor,
        cuffEdgeColor, setCuffEdgeColor,
        cuffStitchColor, setCuffStitchColor,
        cuffButtonColor, setCuffButtonColor,
        placketEdgeColor, setPlacketEdgeColor,
        placketStitchColor, setPlacketStitchColor,
        placketButtonColor, setPlacketButtonColor,
        pocketEdgeColor, setPocketEdgeColor,
        pocketStitchColor, setPocketStitchColor,
        collarFabric, setCollarFabric,
        cuffFabric, setCuffFabric,
        placketFabric, setPlacketFabric,
        pocketFabric, setPocketFabric,
        monogramText, setMonogramText,
        monogramFont, setMonogramFont,
        monogramColor, setMonogramColor,
        monogramPosition, setMonogramPosition,
        measurements, setMeasurements,
    } = use3DConfiguration({ fabrics, defaultFabricId: fabricIdFromUrl || undefined });

    // UI functions
    const [viewMode, setViewMode] = useState<'front' | 'back'>('front');
    const [zoom, setZoom] = useState(4.5);
    const [saved, setSaved] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);
    const [showSavedDesigns, setShowSavedDesigns] = useState(false);
    const [showCartDrawer, setShowCartDrawer] = useState(false);
    const [isLargeScreen, setIsLargeScreen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);

    // Screenshot handling
    const screenshotRef = useRef<any>(null);
    const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState(false);
    const [isScreenshotReady, setIsScreenshotReady] = useState(false);
    const [pendingAction, setPendingAction] = useState<'save' | 'add-to-cart' | null>(null);

    const { addToCart, itemCount, items, totalAmount, updateQuantity } = useCart();
    const removeFromCart = useRemoveFromCartWithCleanup();
    const { customer, isAuthenticated, logout, saveDesign, deleteDesign, saveMeasurements } = useCustomerAuth();

    // Initial load delay to ensure textures are ready before screenshot
    useEffect(() => {
        if (!isLoading && selectedFabric) {
            const timer = setTimeout(() => {
                setIsScreenshotReady(true);
            }, 1500); // Wait for textures to fully load
            return () => clearTimeout(timer);
        }
    }, [isLoading, selectedFabric]);

    // [URL Normalization] Guards against cross-linking between 2D/3D customizers and legacy IDs
    useEffect(() => {
        // [Action] Check if the loaded 3D product actually belongs on this route
        // [Purpose] Keeps the application state clean and redirects users to the correct engine (2D vs 3D)
        if (!product?.slug || !id) return;

        // 1. [Security Redirect] If a 2D-only product was accessed via 3D URL, bounce user to 2D customizer
        if (product.categoryType !== '3d') {
            const queryStr = searchParams.toString();
            const suffix = queryStr ? `?${queryStr}` : '';
            navigate(`/customize/${product.slug}${suffix}`, {
                replace: true,
                state: location.state
            });
            return;
        }

        // 2. [SEO Normalization] Ensure the user is on the slug-based URL instead of the raw database ID
        if (id !== product.slug) {
            const queryStr = searchParams.toString();
            const suffix = queryStr ? `?${queryStr}` : '';
            navigate(`/customize-3d/${product.slug}${suffix}`, {
                replace: true,
                state: location.state
            });
        }
    }, [product?.slug, product?.categoryType, id, navigate, searchParams, location.state]);

    const captureScreenshot = useScreenshotCapture3D({
        screenshotRef,
        productType: pType as 'shirt' | 'pants',
        placeholder: getTextureUrl(selectedFabric?.colorMapUrl) || '',
        productName: product?.name,
        customerId: customer?._id,
    });

    const handleAddToCart = () => {
        if (!product || !selectedFabric) return;
        setAddingToCart(true);

        const item = buildCartItem3D({
            productId: product?._id || '',
            productType: pType,
            fabric: selectedFabric,
            styles: {
                collar: { id: selectedCollar, name: COLLAR_OPTIONS.find(c => c.id === selectedCollar)?.name || selectedCollar },
                cuff: { id: selectedCuff, name: CUFF_OPTIONS.find(c => c.id === selectedCuff)?.name || selectedCuff },
                pocket: { id: selectedPocket, name: POCKET_OPTIONS.find(p => p.id === selectedPocket)?.name || selectedPocket },
                placket: { id: selectedPlacket, name: PLACKET_OPTIONS.find(p => p.id === selectedPlacket)?.name || selectedPlacket },
                collarButton: { id: collarButtonColor, name: GARMENT_COLORS.find(b => b.color === collarButtonColor)?.name || collarButtonColor },
                placketButton: { id: placketButtonColor, name: GARMENT_COLORS.find(b => b.color === placketButtonColor)?.name || placketButtonColor },
                cuffButton: { id: cuffButtonColor, name: GARMENT_COLORS.find(b => b.color === cuffButtonColor)?.name || cuffButtonColor },
                collarEdgeColor,
                collarStitchColor,
                cuffEdgeColor,
                cuffStitchColor,
                placketEdgeColor,
                placketStitchColor,
                pocketEdgeColor,
                pocketStitchColor,
                ...(collarFabric && { collarFabric: { id: collarFabric._id, name: collarFabric.name } }),
                ...(cuffFabric && { cuffFabric: { id: cuffFabric._id, name: cuffFabric.name } }),
                ...(placketFabric && { placketFabric: { id: placketFabric._id, name: placketFabric.name } }),
                ...(pocketFabric && { pocketFabric: { id: pocketFabric._id, name: pocketFabric.name } }),
                ...(monogramText && {
                    monogramText,
                    monogramFont,
                    monogramColor,
                    monogramPosition
                }),
            },
            measurements,
            screenshot: '',
            includeTextureUrls: true,
        });

        addToCart(item);
        setAddingToCart(false);
        showSuccess('Added to cart (No Preview Available)');
        setShowCartDrawer(true);
    };

    const handleAddToCartWithScreenshot = async () => {
        if (addingToCart || !selectedFabric) return;
        setPendingAction('add-to-cart');
        setAddingToCart(true);
        setIsGeneratingScreenshot(true);

        try {
            const screenshotUrl = await captureScreenshot('cart-items');

            const item = buildCartItem3DWithScreenshot({
                productId: product?._id || '',
                productType: pType,
                fabric: selectedFabric,
                styles: {
                    collar: { id: selectedCollar, name: COLLAR_OPTIONS.find(c => c.id === selectedCollar)?.name || selectedCollar },
                    cuff: { id: selectedCuff, name: CUFF_OPTIONS.find(c => c.id === selectedCuff)?.name || selectedCuff },
                    pocket: { id: selectedPocket, name: POCKET_OPTIONS.find(p => p.id === selectedPocket)?.name || selectedPocket },
                    placket: { id: selectedPlacket, name: PLACKET_OPTIONS.find(p => p.id === selectedPlacket)?.name || selectedPlacket },
                    collarButton: { id: collarButtonColor, name: GARMENT_COLORS.find(b => b.color === collarButtonColor)?.name || collarButtonColor },
                    placketButton: { id: placketButtonColor, name: GARMENT_COLORS.find(b => b.color === placketButtonColor)?.name || placketButtonColor },
                    cuffButton: { id: cuffButtonColor, name: GARMENT_COLORS.find(b => b.color === cuffButtonColor)?.name || cuffButtonColor },
                    ...(collarFabric && { collarFabric: { id: collarFabric._id, name: collarFabric.name } }),
                    ...(cuffFabric && { cuffFabric: { id: cuffFabric._id, name: cuffFabric.name } }),
                    ...(placketFabric && { placketFabric: { id: placketFabric._id, name: placketFabric.name } }),
                    ...(pocketFabric && { pocketFabric: { id: pocketFabric._id, name: pocketFabric.name } }),
                    ...(monogramText && {
                        monogramText,
                        monogramFont,
                        monogramColor,
                        monogramPosition
                    }),
                },
                measurements,
                screenshot: screenshotUrl,
                includeTextureUrls: false,
            });

            addToCart(item);
            showSuccess('Added to cart with 3D Preview!');
            setShowCartDrawer(true);
        } catch (error) {
            console.error("Screenshot failed:", error);
            handleAddToCart(); // Fallback
        } finally {
            setPendingAction(null);
            setAddingToCart(false);
            setIsGeneratingScreenshot(false);
        }
    };

    // Use toggle for independent fabrics (managed by checking if sub-fabrics are set?)
    // UI toggle state
    const [useIndependentFabrics, setUseIndependentFabrics] = useState(false);

    // Cart + Auth hooks are declared above (before captureScreenshot which needs customer._id)

    // Responsive zoom - adjust based on screen size
    // Higher numbers push the camera further out (Z-axis).
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setIsLargeScreen(width >= 1024);
            if (width < 640) {
                setZoom(6.8); // Mobile - zoomed out more
            } else if (width < 1024) {
                setZoom(5.5); // Tablet
            } else {
                setZoom(5.5); // Desktop - originally 3.5
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);



    useDesignRestore3D({
        customerDesigns: customer?.savedDesigns,
        fabrics,
        productType: pType as 'shirt' | 'pants' | 'suit',
        setSelectedFabric,
        setActiveCategory: (c: string) => setActiveCategory(c as FabricCategory),
        setCollarFabric,
        setCuffFabric,
        setPocketFabric,
        setPlacketFabric,
        setSelectedCollar,
        setSelectedCuff,
        setSelectedPocket,
        setSelectedPlacket,
        setCollarEdgeColor,
        setCollarStitchColor,
        setCollarButtonColor,
        setCuffEdgeColor,
        setCuffStitchColor,
        setCuffButtonColor,
        setPlacketEdgeColor,
        setPlacketStitchColor,
        setPlacketButtonColor,
        setPocketEdgeColor,
        setPocketStitchColor,
        setMeasurements,
    });



    const filteredFabrics = fabrics.filter(f => f.category === activeCategory);
    const availableCategories = FABRIC_CATEGORIES.filter(cat => fabrics.some(f => f.category === cat.value));
    const productId = product?._id || '';


    const handleZoomIn = () => setZoom(z => Math.max(2, z - 0.5));
    const handleZoomOut = () => setZoom(z => Math.min(7, z + 0.5));
    
    const handleResetView = () => {
        const width = window.innerWidth;
        if (width < 640) {
            setZoom(6.8);
        } else {
            setZoom(5.5);
        }
    };

    const handleSaveDesign = async () => {
        if (!selectedFabric) {
            showError('Please select a fabric first');
            return;
        }

        if (!isAuthenticated) {
            showError('Please login to save designs');
            navigate('/login');
            return;
        }

        setPendingAction('save');
        setIsGeneratingScreenshot(true);

        try {
            const screenshotUrl = await captureScreenshot('saved-designs');

            // Save to account via CustomerAuthContext
            const result = await saveDesign({
                productId: productId,
                productName: `Custom ${pType} (3D)`,
                productCategory: pType,
                baseImage: getTextureUrl(selectedFabric.colorMapUrl) || '',
                fabric: { id: selectedFabric._id, name: selectedFabric.name, image: getTextureUrl(selectedFabric.colorMapUrl) || '' },
                styles: {
                    viewMode,
                    collarStyle: selectedCollar,
                    cuffStyle: selectedCuff,
                    pocketStyle: selectedPocket,
                    placketStyle: selectedPlacket,
                    collar: {
                        id: collarFabric?._id || 'default',
                        name: collarFabric ? collarFabric.name : 'Same as Body',
                        priceModifier: 0
                    },
                    cuff: {
                        id: cuffFabric?._id || 'default',
                        name: cuffFabric ? cuffFabric.name : 'Same as Body',
                        priceModifier: 0
                    },
                    pocket: {
                        id: pocketFabric?._id || 'default',
                        name: pocketFabric ? pocketFabric.name : 'Same as Body',
                        priceModifier: 0
                    },
                    placket: {
                        id: placketFabric?._id || 'default',
                        name: placketFabric ? placketFabric.name : 'Same as Body',
                        priceModifier: 0
                    },
                    placketButton: { id: placketButtonColor, name: GARMENT_COLORS.find(b => b.color === placketButtonColor)?.name || placketButtonColor, priceModifier: 0 },
                    cuffButton: { id: cuffButtonColor, name: GARMENT_COLORS.find(b => b.color === cuffButtonColor)?.name || cuffButtonColor, priceModifier: 0 },
                    collarEdgeColor,
                    collarStitchColor,
                    collarButtonColor,
                    cuffStitchColor,
                    placketEdgeColor,
                    placketStitchColor,
                    pocketEdgeColor,
                    pocketStitchColor,
                    ...(monogramText && {
                        monogramText,
                        monogramFont,
                        monogramColor,
                        monogramPosition
                    }),
                },
                measurements: measurements,
                totalPrice: selectedFabric.price,
                screenshot: screenshotUrl,
            });

            if (result.success) {
                setSaved(true);
                showSuccess(result.message || 'Design saved to your account!');
                setTimeout(() => setSaved(false), 2000);
            } else {
                showError(result.message || 'Failed to save design');
            }
        } catch (error) {
            console.error("Save design failed:", error);
            showError("Failed to save design");
        } finally {
            setPendingAction(null);
            setIsGeneratingScreenshot(false);
        }
    };



    // Category icons mapping
    const categoryIcons: Record<FabricCategory, any> = {
        cotton: Shirt,
        wool: Shirt,
        linen: Shirt,
        silk: Shirt,
        polyester: Shirt,
        denim: Shirt,
    };

    // Memoize the config object to prevent ProductPreview3D from re-rendering unncessarily
    const previewConfig = useMemo(() => ({
        fabric: selectedFabric,
        collar: selectedCollar,
        cuff: selectedCuff,
        pocket: selectedPocket,
        placket: selectedPlacket,
        collarEdgeColor, collarStitchColor, collarButton: collarButtonColor,
        cuffEdgeColor, cuffStitchColor, cuffButton: cuffButtonColor,
        placketEdgeColor, placketStitchColor, placketButton: placketButtonColor,
        pocketEdgeColor, pocketStitchColor,
        collarFabric: collarFabric,
        cuffFabric: cuffFabric,
        placketFabric: placketFabric,
        pocketFabric: pocketFabric,
        monogramText, monogramFont, monogramColor, monogramPosition
    }), [
        selectedFabric, selectedCollar, selectedCuff, selectedPocket, selectedPlacket,
        collarEdgeColor, collarStitchColor, collarButtonColor,
        cuffEdgeColor, cuffStitchColor, cuffButtonColor,
        placketEdgeColor, placketStitchColor, placketButtonColor,
        pocketEdgeColor, pocketStitchColor,
        collarFabric, cuffFabric, placketFabric, pocketFabric,
        monogramText, monogramFont, monogramColor, monogramPosition
    ]);

    return (
        <div className="min-h-screen bg-gradient-soft flex flex-col lg:h-screen lg:w-screen lg:overflow-hidden">
            <CustomizerHeader
                title={`3D ${pType} Customizer`}
                subtitle="3D Preview"
                savedCount={customer?.savedDesigns?.length || 0}
                cartCount={itemCount}
                onSavedClick={() => setShowSavedDesigns(!showSavedDesigns)}
                onCartClick={() => setShowCartDrawer(!showCartDrawer)}
                isAuthenticated={isAuthenticated}
                customer={customer}
                onLogout={logout}
                onCloseUserMenu={() => { }}
                showExtraLinks={true}
                isSavedOpen={showSavedDesigns}
                isCartOpen={showCartDrawer}
            />

            {/* ========== MAIN ========== */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-0">

                {/* Error State — No 3D product exists */}
                {!isLoading && sceneError && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-md px-6">
                            <h1 className="mb-4 text-4xl font-bold">3D Product Not Found</h1>
                            <p className="mb-4 text-xl text-muted-foreground">{sceneError}</p>
                            <Link to="/products" className="text-primary underline hover:text-primary/90">
                                Return to Products
                            </Link>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Loaded successfully — show customizer */}
                {!isLoading && !sceneError && modelPath && (
                    <>
                        {/* ===== MOBILE LAYOUT (< 1024px) ===== */}
                        <div className="lg:hidden flex flex-col">
                            {/* Mobile Preview Section */}
                            {/* Height logic matches Customize.tsx exactly for consistency */}
                            <div className="flex flex-row h-[55vh] min-h-[400px] max-h-[550px] min-[450px]:h-[70vh] min-[450px]:min-h-[550px] min-[450px]:max-h-[850px] min-[900px]:h-[75vh] min-[900px]:min-h-[600px] min-[900px]:max-h-[900px]">
                                <div className="flex-1 relative overflow-hidden bg -background flex flex-col">
                                    {/* Nav Buttons (Absolute Top Left) */}
                                    <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                                        <Link to={backHref} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-foreground hover:bg-muted shadow-md transition-all border border-border/50 text-xs font-medium">
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                            <span>Back</span>
                                        </Link>
                                    </div>

                                    {/* View Toggle (Absolute Top Right) */}
                                    <div className="absolute top-3 right-3 z-30 flex gap-1.5">
                                        {/* MODULAR TOGGLE HIDDEN - Uncomment to restore base/modular switch
                                <button onClick={() => setUseModularModel(!useModularModel)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-md ${useModularModel ? 'bg-accent text-primary' : 'bg-white text-foreground hover:bg-muted border border-border/50'}`}>
                                    {useModularModel ? '✨' : 'B'}
                                </button>
                                */}
                                        <button onClick={() => setViewMode('front')} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-md ${viewMode === 'front' ? 'bg-primary text-white' : 'bg-white text-foreground hover:bg-muted border border-border/50'}`}>
                                            Front
                                        </button>
                                        <button onClick={() => setViewMode('back')} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-md ${viewMode === 'back' ? 'bg-primary text-white' : 'bg-white text-foreground hover:bg-muted border border-border/50'}`}>
                                            Back
                                        </button>
                                    </div>

                                    {/* Canvas Area */}
                                    <div className="flex-1 relative m-3 mt-14 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-soft border overflow-hidden">
                                        {!isLargeScreen && modelPath && (
                                            <ProductPreview3D
                                                ref={screenshotRef}
                                                productType={pType as 'shirt' | 'pants' | 'suit'}
                                                config={previewConfig}
                                                viewMode={viewMode}
                                                zoom={zoom}
                                                onZoomIn={handleZoomIn}
                                                onZoomOut={handleZoomOut}
                                                onResetView={handleResetView}
                                                className="w-full h-full"
                                                modelUrl={modelPath}
                                                environmentUrl={environmentUrl || undefined}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Step Buttons (Horizontal Scroll) */}
                            {/* Mobile Step Navigation */}
                            <MobileStepNavigation3D
                                activeStep={activeStep}
                                setActiveStep={setActiveStep}
                                showModularOptions={useModularModel || pType === 'shirt'}
                                selectedCollar={selectedCollar}
                                selectedCuff={selectedCuff}
                                selectedPocket={selectedPocket}
                                selectedPlacket={selectedPlacket}
                            />

                            {/* Selected Customizations (Tablet/Mobile >= 450px) */}
                            <div className="hidden min-[450px]:block lg:hidden px-3 py-3 mx-3 mb-8 mt-2 rounded-xl bg-white/80 backdrop-blur-sm border border-border/50 shadow-sm shrink-0">
                                <p className="text-[10px] font-bold text-foreground mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-primary" />
                                    Selected Customizations
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedFabric && (
                                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-semibold border border-primary/20">Body: {selectedFabric.name}</span>
                                    )}
                                    {useModularModel && (
                                        <>
                                            <span className="px-2 py-1 bg-accent/10 text-primary rounded-lg text-[10px] font-semibold border border-accent/20">Collar: {collarFabric?.name || selectedFabric?.name || 'Same as Body'}</span>
                                            <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-semibold border border-primary/20">Cuff: {cuffFabric?.name || selectedFabric?.name || 'Same as Body'}</span>
                                            {selectedPocket !== 'none' && (
                                                <span className="px-2 py-1 bg-accent/10 text-primary rounded-lg text-[10px] font-semibold border border-accent/20">Pocket: {pocketFabric?.name || selectedFabric?.name || 'Same as Body'}</span>
                                            )}
                                            <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-semibold border border-primary/20">Placket: {placketFabric?.name || selectedFabric?.name || 'Same as Body'}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ===== DESKTOP PREVIEW (>= 1024px) ===== */}
                        <div className="hidden lg:flex w-[50%] bg-background border-border/50 flex-col overflow-hidden relative">
                            {/* Desktop Left Column - Preview Content */}
                            <div className="flex-1 bg-white/80 w-full h-full flex flex-col p-4 lg:p-5 relative overflow-hidden">
                                {/* Header Controls - Non-overlapping */}
                                <div className="flex items-center justify-between mb-4 shrink-0">
                                    {/* Left Buttons */}
                                    <div className="flex items-center gap-2">
                                        <Link to={backHref} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-border/50 text-foreground hover:bg-muted shadow-sm transition-all text-xs font-medium">
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                            <span>Back</span>
                                        </Link>
                                        <Link to="/products" className="px-3 py-1.5 rounded-lg bg-white border border-border/50 text-foreground hover:bg-muted shadow-sm transition-all text-xs font-medium">
                                            Products
                                        </Link>
                                    </div>

                                    {/* Right Toggles */}
                                    <div className="flex items-center gap-1.5">
                                        {/* MODULAR TOGGLE HIDDEN - Uncomment to restore base/modular switch
                                <button
                                    onClick={() => setUseModularModel(!useModularModel)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${useModularModel ? 'bg-accent text-primary' : 'bg-white border border-border/50 text-foreground hover:bg-muted'}`}
                                >
                                    {useModularModel ? '✨ Modular' : 'Basic'}
                                </button>
                                <div className="w-px h-6 bg-border/50 mx-1" />
                                */}
                                        <button onClick={() => setViewMode('front')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${viewMode === 'front' ? 'bg-primary text-white' : 'bg-white border border-border/50 text-foreground hover:bg-muted'}`}>
                                            Front
                                        </button>
                                        <button onClick={() => setViewMode('back')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${viewMode === 'back' ? 'bg-primary text-white' : 'bg-white border border-border/50 text-foreground hover:bg-muted'}`}>
                                            Back
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 relative rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-soft border  overflow-hidden w-full mb-4">
                                    {modelPath && (
                                        <ProductPreview3D
                                            ref={screenshotRef}
                                            productType={pType as 'shirt' | 'pants' | 'suit'}
                                            config={previewConfig}
                                            viewMode={viewMode}
                                            zoom={zoom}
                                            onZoomIn={handleZoomIn}
                                            onZoomOut={handleZoomOut}
                                            onResetView={handleResetView}
                                            className="w-full h-full"
                                            modelUrl={modelPath}
                                            environmentUrl={environmentUrl || undefined}
                                        />
                                    )}
                                </div>

                                {/* Selected Customizations Overlay - Below Canvas */}
                                <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border shadow-soft p-4 shrink-0 overflow-scroll">
                                    <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                                        Selected Customizations
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFabric && (
                                            <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                                                Body: {selectedFabric.name}
                                            </span>
                                        )}
                                        {useModularModel && (
                                            <>
                                                <span className="px-3 py-1.5 bg-accent/10 text-primary rounded-lg text-xs font-semibold border border-accent/20">
                                                    Collar: {collarFabric?.name || selectedFabric?.name || 'Same as Body'}
                                                </span>
                                                <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                                                    Cuff: {cuffFabric?.name || selectedFabric?.name || 'Same as Body'}
                                                </span>
                                                {selectedPocket !== 'none' && (
                                                    <span className="px-3 py-1.5 bg-accent/10 text-primary rounded-lg text-xs font-semibold border border-accent/20">
                                                        Pocket: {pocketFabric?.name || selectedFabric?.name || 'Same as Body'}
                                                    </span>
                                                )}
                                                <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                                                    Placket: {placketFabric?.name || selectedFabric?.name || 'Same as Body'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ===== RIGHT CONTAINER (SIDEBAR + OPTIONS) ===== */}
                        <div className="flex-1 flex flex-col lg:flex-row min-w-0 bg-transparent overflow-hidden relative h-full">

                            {/* Step Sidebar - Desktop Only (Vertical) */}
                            <StepNavigation3D
                                activeStep={activeStep}
                                setActiveStep={setActiveStep}
                                showModularOptions={useModularModel || pType === 'shirt'}
                                selectedCollar={selectedCollar}
                                selectedCuff={selectedCuff}
                                selectedPocket={selectedPocket}
                                selectedPlacket={selectedPlacket}
                            />

                            {/* Options Panel */}
                            <Configurator3DControls
                                activeStep={activeStep}
                                setActiveStep={setActiveStep}
                                activeCategory={activeCategory}
                                setActiveCategory={setActiveCategory}
                                selectedFabric={selectedFabric}
                                setSelectedFabric={setSelectedFabric}
                                selectedCollar={selectedCollar}
                                setSelectedCollar={setSelectedCollar}
                                selectedCuff={selectedCuff}
                                setSelectedCuff={setSelectedCuff}
                                selectedPocket={selectedPocket}
                                setSelectedPocket={setSelectedPocket}
                                selectedPlacket={selectedPlacket}
                                setSelectedPlacket={setSelectedPlacket}
                                collarEdgeColor={collarEdgeColor}
                                setCollarEdgeColor={setCollarEdgeColor}
                                collarStitchColor={collarStitchColor}
                                setCollarStitchColor={setCollarStitchColor}
                                collarButtonColor={collarButtonColor}
                                setCollarButtonColor={setCollarButtonColor}
                                cuffEdgeColor={cuffEdgeColor}
                                setCuffEdgeColor={setCuffEdgeColor}
                                cuffStitchColor={cuffStitchColor}
                                setCuffStitchColor={setCuffStitchColor}
                                cuffButtonColor={cuffButtonColor}
                                setCuffButtonColor={setCuffButtonColor}
                                placketEdgeColor={placketEdgeColor}
                                setPlacketEdgeColor={setPlacketEdgeColor}
                                placketStitchColor={placketStitchColor}
                                setPlacketStitchColor={setPlacketStitchColor}
                                placketButtonColor={placketButtonColor}
                                setPlacketButtonColor={setPlacketButtonColor}
                                pocketEdgeColor={pocketEdgeColor}
                                setPocketEdgeColor={setPocketEdgeColor}
                                pocketStitchColor={pocketStitchColor}
                                setPocketStitchColor={setPocketStitchColor}
                                collarFabric={collarFabric}
                                setCollarFabric={setCollarFabric}
                                cuffFabric={cuffFabric}
                                setCuffFabric={setCuffFabric}
                                pocketFabric={pocketFabric}
                                setPocketFabric={setPocketFabric}
                                placketFabric={placketFabric}
                                setPlacketFabric={setPlacketFabric}
                                monogramText={monogramText}
                                setMonogramText={setMonogramText}
                                monogramFont={monogramFont}
                                setMonogramFont={setMonogramFont}
                                monogramColor={monogramColor}
                                setMonogramColor={setMonogramColor}
                                monogramPosition={monogramPosition}
                                setMonogramPosition={setMonogramPosition}
                                measurements={measurements}
                                setMeasurements={setMeasurements}
                                fabrics={fabrics}
                                product={product}
                                productIdFromUrl={productIdFromUrl}
                                isLoading={isLoading}
                                error={sceneError}
                                useModularModel={useModularModel}
                                onSave={handleSaveDesign}
                                onAddToCart={handleAddToCartWithScreenshot}
                                isAuthenticated={isAuthenticated}
                                saveMeasurements={saveMeasurements}
                                saved={saved}
                                pendingAction={pendingAction}
                            />
                        </div>
                    </>
                )}

            </div>

            <SavedDesignsDrawer
                open={showSavedDesigns}
                onClose={() => setShowSavedDesigns(false)}
                count={customer?.savedDesigns?.length || 0}
                fullWidthMobile
            >
                {(!customer?.savedDesigns || customer.savedDesigns.length === 0) ? (
                    <div className="text-center py-8">
                        <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No saved designs yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Save your current configuration to see it here.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {[...customer.savedDesigns]
                            .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
                            .map((design) => (
                                <div key={design._id} className="p-3 rounded-xl border border-border/50 bg-muted/30 hover:border-primary/30 transition-all">
                                    <div className="flex gap-3">
                                        <div className="w-16 h-16 rounded-lg bg-white border border-border/30 overflow-hidden shrink-0">
                                            {getItemPreviewImage(design) ? (
                                                <img src={getItemPreviewImage(design)} alt={design.productName} className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Layers className="w-6 h-6 text-muted-foreground/30" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-foreground truncate">{design.name || design.productName}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {new Date(design.savedAt).toLocaleDateString()}
                                            </p>
                                            <p className="text-sm font-semibold text-primary mt-1">{formatPrice(design.totalPrice)}</p>
                                        </div>
                                    </div>
                                    {design.fabric && (
                                        <p className="text-xs text-muted-foreground mt-2 truncate">
                                            Fabric: {design.fabric.name}
                                        </p>
                                    )}
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => {
                                                if (!isDesign3D(design)) {
                                                    window.location.href = getRestoreUrl(design);
                                                    return;
                                                }
                                                if (design.fabric) {
                                                    const matchingFabric = fabrics.find(f => f._id === design.fabric?.id || f.name === design.fabric?.name);
                                                    if (matchingFabric) setSelectedFabric(matchingFabric);
                                                }
                                                setShowSavedDesigns(false);
                                                showSuccess('Design restored!');
                                            }}
                                            className="flex-1 px-3 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                                        >
                                            Restore
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const result = await deleteDesign(design._id);
                                                if (result.success) showSuccess(result.message);
                                                else showError(result.message);
                                            }}
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
                fullWidthMobile
            />
        </div >
    );
}
