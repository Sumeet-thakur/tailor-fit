import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';

import { getImageUrl } from '@/utils/imageHelper';
import { preloadImages } from '@/lib/imagePreload';

// ─── URL Resolution ──────────────────────────────────────────────────────────

/**
 * Resolves the preview image URL for an option from the product's DB data.
 * Checks layersByFabric (per-fabric, per-view) then layersByView (view-only).
 * Returns empty string when no image exists — callers should skip rendering.
 */
function getOptionPreviewUrl(
    product: any,
    optionId: string,
    fabricId: string,
    viewMode: 'front' | 'back' | 'back_half'
): string {
    const groups = product?.customizationOptions?.optionGroups || [];
    for (const group of groups) {
        const option = group.options?.find((o: any) => o.id === optionId);
        if (!option) continue;

        let src = '';

        // Per-fabric, per-view images (highest priority)
        if (option.layersByFabric?.[fabricId]?.[viewMode]) {
            src = option.layersByFabric[fabricId][viewMode];
        }
        // View-only layers (e.g. buttons, neckties that don't change per fabric)
        else if (option.layersByView?.[viewMode]) {
            src = option.layersByView[viewMode];
        }

        // Safety check: Never render SVG UI icons as product layers on the canvas
        if (src && src.toLowerCase().endsWith('.svg')) {
            return '';
        }

        return src;
    }
    return '';
}

// ─── Data-Driven Preloading ──────────────────────────────────────────────────

/**
 * Collects all preview image URLs for batch preload.
 * Iterates config.styles (data-driven) — works for any product type.
 */
function collectPreviewUrls(config: any, baseImage: string | null, viewMode: 'front' | 'back', product: any): string[] {
    const urls: string[] = [];

    // Base fabric image
    const base = viewMode === 'back'
        ? (config.fabric?.backPreviewImage || '')
        : (config.fabric?.previewImage || baseImage || '');
    if (base) urls.push(getImageUrl(base) || base);

    // Preload every selected option's layer image
    const fabricId = config.fabric?.id || 'fabric-white';
    const styles = config.styles || {};

    for (const [, option] of Object.entries(styles)) {
        const opt = option as any;
        if (!opt?.id) continue;

        let src = getOptionPreviewUrl(product, opt.id, fabricId, viewMode);

        // Match the fallback logic in the render method to ensure we preload what we render
        if (!src && opt.previewImage && typeof opt.previewImage === 'string') {
            const previewLower = opt.previewImage.toLowerCase();
            if (!previewLower.endsWith('.svg') && !previewLower.includes('thumbnail')) {
                src = opt.previewImage;
            }
        }

        if (src) urls.push(getImageUrl(src) || src);
    }

    return urls.filter(Boolean);
}

// ─── Layout Helpers ──────────────────────────────────────────────────────────

/** Aspect ratio per product type. Pants = 2:3, Shirts = 3:4. */
const getAspectRatioClass = (category: string) => {
    if (category === 'pants' || category === 'trouser') return 'aspect-[2/3] max-w-[420px]';
    return 'aspect-[3/4] max-w-[700px]';
};

// ─── Component ───────────────────────────────────────────────────────────────

interface ProductPreviewProps {
    config: any;
    product: any;
    viewMode: 'front' | 'back';
    setViewMode?: (mode: 'front' | 'back') => void;
    baseImage: string | null;
    showControls?: boolean;
    className?: string;
    onLoadingChange?: (isLoading: boolean) => void;
    activeStep?: string;
    zoom?: number;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
}

export function ProductPreview({
    config,
    product,
    viewMode,
    setViewMode,
    baseImage,
    showControls = true,
    className = '',
    onLoadingChange,
    activeStep,
    zoom = 1,
    onZoomIn,
    onZoomOut
}: ProductPreviewProps) {

    const isShirt = !product || product.category === 'shirt';
    const isPants = product?.category === 'pants' || product?.category === 'trouser';

    // ── Staged Reveal (preload all images before showing) ─────────────────

    const [displayConfig, setDisplayConfig] = useState(config);
    const [displayBaseImage, setDisplayBaseImage] = useState(baseImage);
    const [displayViewMode, setDisplayViewMode] = useState(viewMode);
    const [isPreloading, setIsPreloading] = useState(true);
    const mountedRef = useRef(true);
    const hasInitialPreloadRef = useRef(false);

    // ── Dragging (Panning) State ──────────────────────────────────────────
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (zoom <= 1) setDragPos({ x: 0, y: 0 });
    }, [zoom]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (zoom <= 1) return;
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX - dragPos.x, y: e.clientY - dragPos.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDraggingRef.current || zoom <= 1) return;
        setDragPos({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        hasInitialPreloadRef.current = false;
    }, [product?._id]);

    useEffect(() => {
        const configChanged = config !== displayConfig || baseImage !== displayBaseImage || viewMode !== displayViewMode;
        const needsPreload = configChanged || !hasInitialPreloadRef.current;
        if (!needsPreload) return;

        if (!product) {
            setIsPreloading(true);
            return;
        }

        const urls = collectPreviewUrls(config, baseImage, viewMode, product);
        if (urls.length === 0) {
            setDisplayConfig(config);
            setDisplayBaseImage(baseImage);
            setDisplayViewMode(viewMode);
            setIsPreloading(false);
            hasInitialPreloadRef.current = true;
            onLoadingChange?.(false);
            return;
        }

        setIsPreloading(true);
        onLoadingChange?.(true);
        const startTime = Date.now();
        const minLoaderMs = 150;

        preloadImages(urls, 'anonymous')
            .then(() => {
                const elapsed = Date.now() - startTime;
                // If it loaded almost instantly (< 50ms) AND it's not the very first page load,
                // it means it was a cache hit. Skip the artificial delay to prevent UI flickering.
                if (elapsed < 50 && hasInitialPreloadRef.current) {
                    return Promise.resolve();
                }
                const remaining = Math.max(0, minLoaderMs - elapsed);
                return new Promise<void>((resolve) => setTimeout(resolve, remaining));
            })
            .then(() => {
                if (mountedRef.current) {
                    setDisplayConfig(config);
                    setDisplayBaseImage(baseImage);
                    setDisplayViewMode(viewMode);
                    hasInitialPreloadRef.current = true;
                    setIsPreloading(false);
                    onLoadingChange?.(false);
                }
            });

    }, [config, baseImage, viewMode, product, displayConfig, displayBaseImage, displayViewMode]);

    // ── Render values (only updated after preload completes) ──────────────

    const renderConfig = displayConfig;
    const renderBaseImage = displayBaseImage;
    const renderViewMode = displayViewMode;
    const currentFabricId = renderConfig.fabric?.id || 'fabric-white';

    // ── Data-driven preview layers ────────────────────────────────────────
    //
    // Builds layers from product.optionGroups + config.styles.
    // No hardcoded product keys — works for any product type automatically.
    //
    // For shirts: we maintain specific z-index ordering since layer stacking
    // is critical (collar over body, buttons over collar, etc.)
    // For everything else: z-indices derived from optionGroups order.

    const previewLayers = React.useMemo(() => {
        const optionGroups = product?.customizationOptions?.optionGroups || [];

        // Shirt z-index map: category → zIndex (visual stacking order matters)
        const SHIRT_Z_MAP: Record<string, number> = {
            back: 10, placket: 12, sleeve: 20, cuff: 30,
            collar: 50, button: 55, pocket: 60, necktie: 70, bowtie: 70,
        };

        // Pants z-index map: belt (waist) must be on top of pleats and fastening
        const PANTS_Z_MAP: Record<string, number> = {
            fit: 20,
            'back-pockets': 25,
            'backpocket': 25,
            cuffs: 30,
            pleats: 40,
            fastening: 50,
            waist: 60, // Belt
        };

        return optionGroups.map((group: any, index: number) => {
            const category = group.category || group.id;
            const selectedOption = renderConfig.styles?.[category] || null;

            let zIndex = group.renderOrder ?? (10 + index * 10);
            if (isShirt) {
                zIndex = SHIRT_Z_MAP[category] ?? (80 + index * 10);
            } else if (isPants) {
                zIndex = PANTS_Z_MAP[category] ?? (80 + index * 10);
            }

            return {
                key: category,
                zIndex,
                option: selectedOption,
                groupId: group.id,
            };
        }).filter((layer: any) => layer.option);
    }, [product?.customizationOptions?.optionGroups, renderConfig.styles, isShirt, isPants]);

    // Shirt-specific guard: hide cuffs when half-sleeve is selected
    const isHalfSleeve = renderConfig.styles?.sleeve?.name?.toLowerCase().includes('half')
        || renderConfig.styles?.sleeve?.name?.toLowerCase().includes('short');

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className={`relative w-full h-full flex flex-col ${className}`}>

            {/* View Toggle Controls */}
            {showControls && setViewMode && (
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
            )}

            {/* Zoom Controls */}
            {onZoomIn && onZoomOut && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm z-30">
                    <button onClick={onZoomOut} className="p-0.5 sm:p-1 hover:bg-muted rounded transition-colors" aria-label="Zoom out">
                        <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground" />
                    </button>
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{Math.round(zoom * 100)}%</span>
                    <button onClick={onZoomIn} className="p-0.5 sm:p-1 hover:bg-muted rounded transition-colors" aria-label="Zoom in">
                        <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground" />
                    </button>
                </div>
            )}

            {/* Preview Area */}
            <div className="flex-1  min-h-[300px]">
                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.05) 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                }} />

                {/* Loader Overlay - Blocks unstyled pop-in with a premium blur */}
                <div
                    className={`absolute inset-0 z-[50] flex flex-col items-center justify-center bg-transparent backdrop-blur-sm rounded-xl transition-opacity duration-300 ease-out ${isPreloading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    <span className="text-xs font-medium text-muted-foreground animate-pulse">
                        {!hasInitialPreloadRef.current ? 'Loading Layers...' : 'Applying Style...'}
                    </span>
                </div>

                {/* Image Container */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    <div
                        className={`relative w-full h-full ${getAspectRatioClass(product?.category)} ease-out ${isPreloading ? 'opacity-0 scale-[0.98] transition-all duration-300' : 'opacity-100 scale-100 transition-opacity duration-300'}`}
                        style={{ 
                            transform: `scale(${isPreloading ? zoom * 0.98 : zoom}) translate(${dragPos.x / zoom}px, ${dragPos.y / zoom}px)`,
                            cursor: zoom > 1 ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'default',
                            touchAction: zoom > 1 ? 'none' : 'auto'
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        data-screenshot-target="preview-modal"
                        data-product-type={product?.category || 'shirt'}
                    >
                        {/* Base Image (fabric body) */}
                        {renderBaseImage && (
                            <img
                                key={`base-${renderViewMode}-${product?._id}`}
                                src={getImageUrl(renderViewMode === 'back' ? (renderConfig.fabric?.backPreviewImage || renderBaseImage) : (renderConfig.fabric?.previewImage || renderBaseImage)) || ''}
                                alt="Base"
                                crossOrigin="anonymous"
                                className="absolute inset-0 w-full h-full object-contain"
                                style={{ zIndex: 1 }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        )}

                        {/* Unified Layers — data-driven, works for any product type */}
                        {previewLayers.map((layer: any) => {
                            const option = layer.option;
                            if (!option?.id) return null;

                            // Skip "no" options only when they have no actual image data
                            const optName = (option.name || '').toLowerCase();
                            if (optName.startsWith('no ') || optName === 'none') {
                                if (!getOptionPreviewUrl(product, option.id, currentFabricId, renderViewMode)) {
                                    return null;
                                }
                            }

                            // ── View filtering (Front/Back) ──
                            // Prevent front layers from showing on the back, and vice versa.
                            const lowerKey = layer.key.toLowerCase();
                            if (renderViewMode === 'back') {
                                // On BACK view, hide layers explicitly meant for the front
                                if (lowerKey.includes('front') || optName.includes('front')) return null;
                            } else {
                                // On FRONT view, hide layers explicitly meant for the back
                                if (lowerKey.includes('back') || optName.includes('back')) return null;
                            }

                            // ── Shirt-specific rendering guards ──
                            if (isShirt) {
                                // Hide cuffs when half-sleeve
                                if (layer.key === 'cuff' && isHalfSleeve) return null;

                                // Shirt specific exact-key allowlists
                                if (renderViewMode === 'back') {
                                    if (!['sleeve', 'collar', 'back'].includes(layer.key)) return null;
                                }
                            } else {
                                // ── Pants/General rendering guards ──
                                // Strictly hide back pockets/details from the front view
                                if (renderViewMode !== 'back') {
                                    if (['backpocket', 'back_pocket', 'back pocket'].some(p => lowerKey.includes(p) || optName.includes(p))) return null;
                                    // If it's a generic "pocket" but the group category implies back, hide it
                                    if (lowerKey === 'pocket' && (layer.groupId?.toLowerCase().includes('back'))) return null;
                                } else {
                                    // Strictly hide front pockets/details from the back view
                                    if (['frontpocket', 'front_pocket', 'front pocket', 'side pocket', 'sidepocket'].some(p => lowerKey.includes(p) || optName.includes(p))) return null;
                                    // Hide generic "pocket" on back view if group category implies front
                                    if (lowerKey === 'pocket' && (layer.groupId?.toLowerCase().includes('front'))) return null;
                                }
                            }

                            // Resolve the image URL from DB data
                            let previewSrc = getOptionPreviewUrl(product, option.id, currentFabricId, renderViewMode);

                            // Fallback to previewImage if the option has one (e.g. non-fabric-specific overlays)
                            // IMPORTANT: Never fallback to an SVG or a UI thumbnail icon
                            if (!previewSrc && option.previewImage && typeof option.previewImage === 'string') {
                                const previewLower = option.previewImage.toLowerCase();
                                if (!previewLower.endsWith('.svg') && !previewLower.includes('thumbnail')) {
                                    previewSrc = option.previewImage;
                                }
                            }

                            if (!previewSrc) return null;

                            const resolvedSrc = getImageUrl(previewSrc) || previewSrc;
                            const isCuff = isShirt && layer.key === 'cuff';

                            return (
                                <img
                                    key={`layer-${layer.key}-${renderViewMode}`}
                                    src={resolvedSrc}
                                    alt={layer.key}
                                    crossOrigin="anonymous"
                                    className="absolute inset-0 w-full h-full object-contain"
                                    style={{
                                        zIndex: layer.zIndex,
                                        ...(isCuff && { transform: 'translateX(-15%) translateY(10%) scale(0.7)', transformOrigin: 'left center' })
                                    }}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
