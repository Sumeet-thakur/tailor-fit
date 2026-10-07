import { Link } from 'react-router-dom';
import { Check, Loader2, Sparkles, Save, ShoppingBag } from 'lucide-react';
import { FabricSelector } from '@/components/customize/FabricSelector';
import { MeasurementsForm } from '@/components/customize/MeasurementsForm';
import { FABRIC_CATEGORIES } from '@/types/fabric';
import { formatPrice } from '@/lib/formatPrice';
import { GARMENT_COLORS, COLLAR_OPTIONS, CUFF_OPTIONS, PLACKET_OPTIONS, POCKET_OPTIONS, MONOGRAM_POSITIONS, MONOGRAM_FONTS, MONOGRAM_COLORS } from '@/constants/shirtOptions3D';
import { useShirt } from '@/context/CustomizationContext';

interface Configurator3DControlsProps {
    // Config
    activeStep: string;
    setActiveStep: (step: any) => void; // Using any to avoid strict union typing issues for now
    activeCategory: string;
    setActiveCategory: (cat: any) => void;
    selectedFabric: any;
    setSelectedFabric: (fabric: any) => void;
    selectedCollar: string;
    setSelectedCollar: (collar: string) => void;
    selectedCuff: string;
    setSelectedCuff: (cuff: string) => void;
    selectedPlacket: string;
    setSelectedPlacket: (placket: string) => void;
    selectedPocket: string;
    setSelectedPocket: (pocket: string) => void;

    // Sub-parts
    collarFabric: any;
    setCollarFabric: (fabric: any) => void;
    cuffFabric: any;
    setCuffFabric: (fabric: any) => void;
    pocketFabric: any;
    setPocketFabric: (fabric: any) => void;
    placketFabric: any;
    setPlacketFabric: (fabric: any) => void;

    collarEdgeColor: string;
    setCollarEdgeColor: (c: string) => void;
    collarStitchColor: string;
    setCollarStitchColor: (c: string) => void;
    collarButtonColor: string;
    setCollarButtonColor: (c: string) => void;
    cuffEdgeColor: string;
    setCuffEdgeColor: (c: string) => void;
    cuffStitchColor: string;
    setCuffStitchColor: (c: string) => void;
    cuffButtonColor: string;
    setCuffButtonColor: (c: string) => void;
    placketEdgeColor: string;
    setPlacketEdgeColor: (c: string) => void;
    placketStitchColor: string;
    setPlacketStitchColor: (c: string) => void;
    placketButtonColor: string;
    setPlacketButtonColor: (c: string) => void;
    pocketEdgeColor: string;
    setPocketEdgeColor: (c: string) => void;
    pocketStitchColor: string;
    setPocketStitchColor: (c: string) => void;

    monogramText: string;
    setMonogramText: (t: string) => void;
    monogramFont: string;
    setMonogramFont: (f: string) => void;
    monogramColor: string;
    setMonogramColor: (c: string) => void;
    monogramPosition: string;
    setMonogramPosition: (p: string) => void;

    measurements: Record<string, string>;
    setMeasurements: (m: Record<string, string>) => void;

    // Data
    fabrics: any[];
    product: any;
    productIdFromUrl?: string | null;
    isLoading: boolean;
    error: string | null;
    useModularModel?: boolean;

    // Actions
    onSave: () => void;
    onAddToCart: () => void;
    isAuthenticated: boolean;
    saveMeasurements?: (m: any) => Promise<any>;

    // UI State
    saved: boolean;
    pendingAction: 'save' | 'add-to-cart' | null;
}

export function Configurator3DControls({
    activeStep,
    activeCategory,
    setActiveCategory,
    selectedFabric,
    setSelectedFabric,
    selectedCollar,
    setSelectedCollar,
    selectedCuff,
    setSelectedCuff,
    selectedPlacket,
    setSelectedPlacket,
    selectedPocket,
    setSelectedPocket,
    collarFabric,
    setCollarFabric,
    cuffFabric,
    setCuffFabric,
    pocketFabric,
    setPocketFabric,
    placketFabric,
    setPlacketFabric,
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
    monogramText, setMonogramText,
    monogramFont, setMonogramFont,
    monogramColor, setMonogramColor,
    monogramPosition, setMonogramPosition,
    measurements,
    setMeasurements,
    fabrics,
    product,
    productIdFromUrl,
    isLoading,
    error,
    useModularModel,
    onSave,
    onAddToCart,
    isAuthenticated,
    saveMeasurements,
    saved,
    pendingAction
}: Configurator3DControlsProps) {

    const { is2DEnabled } = useShirt();
    const isFabricStep = ['fabric', 'collar', 'cuff', 'pocket', 'placket'].includes(activeStep);
    const filteredFabrics = activeCategory && activeCategory !== 'all' ? fabrics.filter(f => f.category === activeCategory) : fabrics;
    const availableCategories = FABRIC_CATEGORIES.filter(cat => fabrics.some(f => f.category === cat.value));

    // Determine the correct 2D product slug to return to.
    let productId = productIdFromUrl;
    if (!productId) {
        // If we don't have an explicit 2D product we came from, pick the best default based on category
        if (product?.category === 'pants') productId = 'bespoke-2d-pant';
        else if (product?.categoryType === '2d') productId = product.slug || product._id;
        else productId = 'bespoke-2d-shirt'; // Default fallback for 3D shirt
    }
    const validProductType = (product?.category === 'pants' || product?.category === 'suit') ? product?.category : 'shirt';

    const renderColorSelector = (title: string, value: string, setter: (c: string) => void) => (
        <div>
            <h4 className="text-[13px] font-semibold text-foreground/80 mb-3">{title}</h4>
            <div className="flex flex-wrap gap-2">
                {GARMENT_COLORS.map(btn => (
                    <button
                        key={btn.id}
                        onClick={() => setter(btn.color)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all ${value === btn.color ? 'border-primary shadow-md scale-110' : 'border-border/50 hover:scale-105'}`}
                        style={{ backgroundColor: btn.color }}
                        title={btn.name}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full lg:flex-1 bg-white/80 backdrop-blur-sm flex flex-col overflow-hidden min-w-0 h-full">
            {/* Header */}
            <div className="p-4 lg:p-5 border-b border-border/50 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="font-display text-base lg:text-lg font-semibold text-foreground flex items-center gap-2">
                        <div className="w-1 h-5 lg:h-6 bg-gradient-to-b from-primary to-accent rounded-full" />
                        {activeStep === 'fabric' && 'Select Fabric'}
                        {activeStep === 'collar' && 'Collar Style'}
                        {activeStep === 'placket' && 'Placket Style'}
                        {activeStep === 'pocket' && 'Pocket Style'}
                        {activeStep === 'cuff' && 'Cuff Style'}
                        {activeStep === 'buttons' && 'Button Colors'}
                        {activeStep === 'monogram' && 'Custom Monogram'}
                        {activeStep === 'measurements' && 'Measurements'}
                    </h2>
                    <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5">
                        {activeStep === 'fabric' && 'Choose from our premium fabric collection'}
                        {activeStep === 'collar' && 'Select your preferred collar style and details'}
                        {activeStep === 'placket' && 'Customize placket and accents'}
                        {activeStep === 'pocket' && 'Add or remove chest pocket'}
                        {activeStep === 'cuff' && 'Choose a cuff style and accents'}
                        {activeStep === 'buttons' && 'Customize button colors'}
                        {activeStep === 'monogram' && 'Personalize with bespoke embroidered initials'}
                        {activeStep === 'measurements' && 'Enter your measurements for a perfect fit'}
                    </p>
                </div>
                {/* [Navigation Link] Visible in the top right of the 3D options panel */}
                {/* [Action] Conditional render of the link to the 2D customizer engine */}
                {/* [Purpose] Honors the global 'is2DEnabled' setting to ensure unauthorized features are hidden */}
                {is2DEnabled && (
                    <Link
                        to={`/customize/${productId}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-all border border-border/50"
                    >
                        Switch to 2D
                    </Link>
                )}
            </div>

            {/* Options Content */}
            <div className="flex-1 p-4 lg:p-5 overflow-y-auto">
                {/* Fabric Category Pills - Visible across all fabric steps */}
                {isFabricStep && (
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
                )}

                {/* Fabric Step */}
                {activeStep === 'fabric' && (
                    <>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <p className="text-sm text-muted-foreground mt-3">Loading fabrics...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
                                <p className="text-destructive mb-4">{error}</p>
                                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Retry</button>
                            </div>
                        ) : (
                            <FabricSelector
                                fabrics={filteredFabrics}
                                selectedFabricId={selectedFabric?._id}
                                onSelect={setSelectedFabric}
                            />
                        )}
                    </>
                )}

                {/* Placket Step */}
                {activeStep === 'placket' && (
                    <div className="space-y-6">
                        {/* Placket Style Selection */}
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Placket Style</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {PLACKET_OPTIONS.map(placket => (
                                    <button
                                        key={placket.id}
                                        onClick={() => setSelectedPlacket(placket.id)}
                                        className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left bg-white ${selectedPlacket === placket.id ? 'border-primary/60 bg-primary/5 shadow-md' : 'border-transparent shadow-sm hover:shadow-md hover:border-primary/30'}`}
                                    >
                                        <div className="aspect-square bg-[#EAE5DF] flex items-center justify-center overflow-hidden w-full">
                                            {placket.image ? (
                                                <img src={placket.image} alt={placket.name} className="w-3/4 h-3/4 object-contain opacity-80 transition-transform duration-300 group-hover:scale-105" />
                                            ) : (
                                                <span className="text-muted-foreground/40 text-3xl font-light">?</span>
                                            )}
                                        </div>
                                        <div className={`p-3 text-center transition-colors ${selectedPlacket === placket.id ? 'bg-gray-100' : 'bg-white'}`}>
                                            <p className="font-medium text-xs sm:text-sm text-foreground truncate mb-1">{placket.name}</p>
                                        </div>
                                        {selectedPlacket === placket.id && (
                                            <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center shadow-md scale-in animation-duration-300">
                                                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-foreground font-display tracking-tight">Placket Fabric</h3>
                                <button
                                    onClick={() => setPlacketFabric(placketFabric ? null : selectedFabric)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${placketFabric ? 'bg-gradient-luxury text-white shadow-soft' : 'bg-gradient-luxury text-white shadow-soft'}`}
                                >
                                    {placketFabric ? 'Custom Selected' : 'Same as Body'}
                                </button>
                            </div>
                            <FabricSelector
                                fabrics={filteredFabrics}
                                selectedFabricId={placketFabric?._id}
                                onSelect={setPlacketFabric}
                            />
                        </div>

                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Placket Details</h3>
                            <div className="space-y-4">
                                {renderColorSelector("Edge Trim Color", placketEdgeColor, setPlacketEdgeColor)}
                                {renderColorSelector("Stitch / Thread Color", placketStitchColor, setPlacketStitchColor)}

                            </div>
                        </div>
                    </div>
                )}

                {/* Collar Step */}
                {activeStep === 'collar' && (
                    <div className="space-y-6">
                        {/* Collar Style Selection */}
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Collar Style</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {COLLAR_OPTIONS.map(collar => (
                                    <button
                                        key={collar.id}
                                        onClick={() => setSelectedCollar(collar.id)}
                                        className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left bg-white ${selectedCollar === collar.id ? 'border-primary/60 bg-primary/5 shadow-md' : 'border-transparent shadow-sm hover:shadow-md hover:border-primary/30'}`}
                                    >
                                        <div className="aspect-square bg-[#EAE5DF] flex items-center justify-center overflow-hidden w-full">
                                            {collar.image ? (
                                                <img src={collar.image} alt={collar.name} className="w-3/4 h-3/4 object-contain opacity-80 transition-transform duration-300 group-hover:scale-105" />
                                            ) : (
                                                <span className="text-muted-foreground/40 text-3xl font-light">?</span>
                                            )}
                                        </div>
                                        <div className={`p-3 text-center transition-colors ${selectedCollar === collar.id ? 'bg-gray-100' : 'bg-white'}`}>
                                            <p className="font-medium text-xs sm:text-sm text-foreground truncate mb-1">{collar.name}</p>
                                        </div>
                                        {selectedCollar === collar.id && (
                                            <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center shadow-md scale-in animation-duration-300">
                                                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Collar Fabric Selection */}
                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-foreground font-display tracking-tight">Collar Fabric</h3>
                                <button
                                    onClick={() => setCollarFabric(collarFabric ? null : selectedFabric)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${collarFabric ? 'bg-gradient-luxury text-white shadow-soft' : 'bg-gradient-luxury text-white shadow-soft'}`}
                                >
                                    {collarFabric ? 'Custom Selected' : 'Same as Body'}
                                </button>
                            </div>
                            <FabricSelector
                                fabrics={filteredFabrics}
                                selectedFabricId={collarFabric?._id}
                                onSelect={setCollarFabric}
                            />
                        </div>

                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Collar Details</h3>
                            <div className="space-y-4">
                                {renderColorSelector("Edge Trim Color", collarEdgeColor, setCollarEdgeColor)}
                                {renderColorSelector("Stitch / Thread Color", collarStitchColor, setCollarStitchColor)}

                            </div>
                        </div>
                    </div>
                )}

                {/* Cuff Step */}
                {activeStep === 'cuff' && (
                    <div className="space-y-6">
                        {/* Cuff Style Selection */}
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Cuff Style</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {CUFF_OPTIONS.map(cuff => (
                                    <button
                                        key={cuff.id}
                                        onClick={() => setSelectedCuff(cuff.id)}
                                        className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left bg-white ${selectedCuff === cuff.id ? 'border-primary/60 bg-primary/5 shadow-md' : 'border-transparent shadow-sm hover:shadow-md hover:border-primary/30'}`}
                                    >
                                        <div className="aspect-square bg-[#EAE5DF] flex items-center justify-center overflow-hidden w-full">
                                            {cuff.image ? (
                                                <img src={cuff.image} alt={cuff.name} className="w-3/4 h-3/4 object-contain opacity-80 transition-transform duration-300 group-hover:scale-105" />
                                            ) : (
                                                <span className="text-muted-foreground/40 text-3xl font-light">?</span>
                                            )}
                                        </div>
                                        <div className={`p-3 text-center transition-colors ${selectedCuff === cuff.id ? 'bg-gray-100' : 'bg-white'}`}>
                                            <p className="font-medium text-xs sm:text-sm text-foreground truncate mb-1">{cuff.name}</p>
                                        </div>
                                        {selectedCuff === cuff.id && (
                                            <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center shadow-md scale-in animation-duration-300">
                                                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cuff Fabric Selection */}
                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-foreground font-display tracking-tight">Cuff Fabric</h3>
                                <button
                                    onClick={() => setCuffFabric(cuffFabric ? null : selectedFabric)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${cuffFabric ? 'bg-gradient-luxury text-white shadow-soft' : 'bg-gradient-luxury text-white shadow-soft'}`}
                                >
                                    {cuffFabric ? 'Custom Selected' : 'Same as Body'}
                                </button>
                            </div>
                            <FabricSelector
                                fabrics={filteredFabrics}
                                selectedFabricId={cuffFabric?._id}
                                onSelect={setCuffFabric}
                            />
                        </div>

                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Cuff Details</h3>
                            <div className="space-y-4">
                                {renderColorSelector("Edge Trim Color", cuffEdgeColor, setCuffEdgeColor)}
                                {renderColorSelector("Stitch / Thread Color", cuffStitchColor, setCuffStitchColor)}

                            </div>
                        </div>
                    </div>
                )}

                {/* Pocket Step */}
                {activeStep === 'pocket' && (
                    <div className="space-y-6">
                        {/* Pocket Style Selection */}
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Pocket Style</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {POCKET_OPTIONS.map(pocket => (
                                    <button
                                        key={pocket.id}
                                        onClick={() => setSelectedPocket(pocket.id)}
                                        className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left bg-white ${selectedPocket === pocket.id ? 'border-primary/60 bg-primary/5 shadow-md' : 'border-transparent shadow-sm hover:shadow-md hover:border-primary/30'}`}
                                    >
                                        <div className="aspect-square bg-[#EAE5DF] flex items-center justify-center overflow-hidden w-full">
                                            {pocket.image ? (
                                                <img src={pocket.image} alt={pocket.name} className="w-3/4 h-3/4 object-contain opacity-80 transition-transform duration-300 group-hover:scale-105" />
                                            ) : (
                                                <span className="text-muted-foreground/40 text-3xl font-light">{pocket.id === 'none' ? '✕' : '✓'}</span>
                                            )}
                                        </div>
                                        <div className={`p-3 text-center transition-colors ${selectedPocket === pocket.id ? 'bg-gray-100' : 'bg-white'}`}>
                                            <p className="font-medium text-xs sm:text-sm text-foreground truncate mb-1">{pocket.name}</p>
                                        </div>
                                        {selectedPocket === pocket.id && (
                                            <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center shadow-md scale-in animation-duration-300">
                                                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pocket Fabric Selection */}
                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-foreground font-display tracking-tight">Pocket Fabric</h3>
                                <button
                                    onClick={() => setPocketFabric(pocketFabric ? null : selectedFabric)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${pocketFabric ? 'bg-gradient-luxury text-white shadow-soft' : 'bg-gradient-luxury text-white shadow-soft'}`}
                                >
                                    {pocketFabric ? 'Custom Selected' : 'Same as Body'}
                                </button>
                            </div>
                            <FabricSelector
                                fabrics={filteredFabrics}
                                selectedFabricId={pocketFabric?._id}
                                onSelect={setPocketFabric}
                            />
                        </div>

                        {selectedPocket !== 'none' && (
                            <>
                                <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                                <div className="space-y-4">
                                    {renderColorSelector("Edge Trim Color", pocketEdgeColor, setPocketEdgeColor)}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Buttons Step */}
                {activeStep === 'buttons' && (
                    <div className="space-y-6">
                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Button Colors</h3>
                            <div className="space-y-4">
                                {renderColorSelector("Front Placket Buttons", placketButtonColor, setPlacketButtonColor)}
                                {renderColorSelector("Collar Buttons", collarButtonColor, setCollarButtonColor)}
                                {renderColorSelector("Cuff Buttons", cuffButtonColor, setCuffButtonColor)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Monogram Step */}
                {activeStep === 'monogram' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Initials</h3>
                            <input
                                type="text"
                                maxLength={10}
                                value={monogramText}
                                onChange={(e) => setMonogramText(e.target.value)}
                                placeholder="Enter up to 10 letters (e.g. ABC)"
                                className="w-full bg-white border border-border/80 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                            />
                        </div>

                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Placement</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {MONOGRAM_POSITIONS.map(pos => (
                                    <button
                                        key={pos.id}
                                        onClick={() => setMonogramPosition(pos.id)}
                                        className={`group relative rounded-xl px-4 py-3 border-2 transition-all duration-300 text-left bg-white ${monogramPosition === pos.id ? 'border-primary/60 bg-primary/5 shadow-md' : 'border-border/50 hover:border-primary/30'}`}
                                    >
                                        <p className="font-medium text-xs sm:text-sm text-foreground mb-1">{pos.name}</p>
                                        {monogramPosition === pos.id && (
                                            <div className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary flex items-center justify-center shadow-md scale-in animation-duration-300">
                                                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Font Style</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {MONOGRAM_FONTS.map(font => (
                                    <button
                                        key={font.id}
                                        onClick={() => setMonogramFont(font.id)}
                                        className={`group relative rounded-xl px-4 py-3 border-2 transition-all duration-300 text-left bg-white ${monogramFont === font.id ? 'border-primary/60 bg-primary/5 shadow-md' : 'border-border/50 hover:border-primary/30'}`}
                                    >
                                        <p className="text-lg text-foreground mb-1" style={{ fontFamily: font.family }}>Aa</p>
                                        <p className="font-medium text-[10px] sm:text-xs text-muted-foreground">{font.name}</p>
                                        {monogramFont === font.id && (
                                            <div className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary flex items-center justify-center shadow-md scale-in animation-duration-300">
                                                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full border-t-2 border-dashed border-border/60 my-6" />
                        <div>
                            <h3 className="text-base font-semibold text-foreground font-display tracking-tight mb-4">Thread Color</h3>
                            <div className="flex flex-wrap gap-2">
                                {MONOGRAM_COLORS.map(btn => (
                                    <button
                                        key={btn.id}
                                        onClick={() => setMonogramColor(btn.color)}
                                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all ${monogramColor === btn.color ? 'border-primary shadow-md scale-110' : 'border-border/50 hover:scale-105'}`}
                                        style={{ backgroundColor: btn.color }}
                                        title={btn.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Measurements Step */}
                {activeStep === 'measurements' && (
                    <MeasurementsForm
                        measurements={measurements}
                        onChange={setMeasurements}
                        productCategory={validProductType}
                        productName={`Custom ${validProductType} (3D)`}
                        isAuthenticated={isAuthenticated}
                        saveMeasurements={saveMeasurements}
                        variant="3d"
                    />
                )}
            </div>

            {/* Bottom - Price & Actions */}
            <div className="p-4 lg:p-5 bg-white border-t border-border/50 shrink-0">
                {/* Selected Customizations - Only for screens < 450px, styled matching 2D Customizer */}
                <div className="min-[450px]:hidden mb-4 p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-border/50 shadow-sm">
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

                {/* Price Summary */}
                <div className="flex items-center justify-between mb-3 lg:mb-4 p-3 lg:p-4 rounded-xl bg-accent/10">
                    <div>
                        <p className="text-[10px] lg:text-xs text-muted-foreground">Total Price</p>
                        <p className="font-display text-xl lg:text-2xl font-bold text-foreground">{selectedFabric ? formatPrice(selectedFabric.price) : 'Rs 0'}</p>
                    </div>
                    <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-accent" />
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
                    <button
                        onClick={onSave}
                        disabled={pendingAction !== null}
                        className={`flex-1 flex items-center justify-center gap-1.5 lg:gap-2 px-4 lg:px-6 py-3 lg:py-4 rounded-xl text-xs lg:text-sm font-semibold transition-all duration-300 ${saved ? 'bg-green-600 text-white' : 'bg-muted/50 text-foreground hover:bg-muted'} disabled:opacity-50`}
                    >
                        {saved ? <Check className="w-4 h-4 lg:w-5 lg:h-5" /> : <Save className="w-4 h-4 lg:w-5 lg:h-5" />}
                        {saved ? 'Saved!' : pendingAction === 'save' ? 'Saving...' : 'Save Design'}
                    </button>
                    <button
                        onClick={onAddToCart}
                        disabled={pendingAction !== null || !selectedFabric}
                        className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2 px-4 lg:px-6 py-3 lg:py-4 rounded-full text-xs lg:text-sm font-semibold bg-primary text-white hover:bg-primary/90 shadow-soft transition-all disabled:opacity-50"
                    >
                        <ShoppingBag className="w-4 h-4 lg:w-5 lg:h-5" />
                        {pendingAction === 'add-to-cart' ? 'Adding to Cart...' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </div>
    );
}
