import { useState, useEffect, useMemo } from 'react';
import { Box, Layers, Trash2, Edit2, Sparkles } from 'lucide-react';
import { DesignPreviewContent } from '@/components/preview/DesignPreviewContent';
import { COLLAR_OPTIONS, CUFF_OPTIONS, POCKET_OPTIONS } from '@/constants/shirtOptions3D';
import { getTextureUrl } from '@/services/fabricService';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface SavedDesignPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    design: any;
    onRestore: (design: any) => void;
    onRequestDelete: (designId: string) => void;
}

export function SavedDesignPreviewModal({
    isOpen,
    onClose,
    design,
    onRestore,
    onRequestDelete
}: SavedDesignPreviewModalProps) {
    const [viewMode, setViewMode] = useState<'front' | 'back'>('front');

    // Stable design id for effects
    const designId = design?._id ?? design?.id ?? design?.savedAt ?? design?.productId;

    // Build config from design. API returns fabric+styles; cart/local has design.config
    const rawConfig = useMemo(() => {
        if (!design) return null;
        if (design.config) return design.config;
        return {
            fabric: design.fabric,
            collar: design.styles?.collar,
            cuff: design.styles?.cuff,
            pocket: design.styles?.pocket,
            sleeve: design.styles?.sleeve,
            button: design.styles?.button,
            back: design.styles?.back,
            necktie: design.styles?.necktie,
            bowtie: design.styles?.bowtie,
            styles: design.styles,
        };
    }, [designId, design]);

    // Set after async hydrate. Used for preview rendering. Null until hydrate completes.
    const [hydratedConfig, setHydratedConfig] = useState<any>(null);

    const styles = useMemo(() => design?.config?.styles ?? design?.styles ?? {}, [designId, design]);
    // True if 3D design (from name, styles.viewMode, placketButton, cuffButton)
    const is3D = design?.is3D ||
        design?.name?.includes('(3D)') ||
        design?.productName?.includes('(3D)') ||
        styles?.viewMode ||
        styles?.placketButton || // 3D specific
        styles?.cuffButton;      // 3D specific
    const productType = design?.productCategory || 'shirt';

    // Reset view to front and clear hydrated config when modal closes or design changes
    useEffect(() => {
        if (isOpen) {
            setViewMode('front');
        }
        if (!isOpen || !design) {
            setHydratedConfig(null);
        }
    }, [isOpen, designId]);

    // Hydrate: merge API minimal data with full product/fabric data. 3D: add colorMapUrl to collar/cuff/placket/pocket.
    // 2D pants: add layersByFabric to styles. Re-runs when modal opens (close→reopen) so back view works.
    useEffect(() => {
        if (!design || !designId || !isOpen) return;

        const raw = design.config || {
            fabric: design.fabric,
            collar: design.styles?.collar,
            cuff: design.styles?.cuff,
            pocket: design.styles?.pocket,
            sleeve: design.styles?.sleeve,
            button: design.styles?.button,
            back: design.styles?.back,
            necktie: design.styles?.necktie,
            bowtie: design.styles?.bowtie,
            styles: design.styles,
            collarFabric: design.styles?.collarFabric,
            cuffFabric: design.styles?.cuffFabric,
            placketFabric: design.styles?.placketFabric,
            pocketFabric: design.styles?.pocketFabric,
        };
        const st = design.config?.styles ?? design.styles ?? {};

        const hydrate = async () => {
            const mainFabricWithUrls = raw.fabric ? {
                ...raw.fabric,
                colorMapUrl: getTextureUrl(raw.fabric.image || raw.fabric.colorMapUrl) || raw.fabric.image || raw.fabric.colorMapUrl,
                normalMapUrl: getTextureUrl(raw.fabric.normalMapUrl) || raw.fabric.normalMapUrl,
                roughnessMapUrl: getTextureUrl(raw.fabric.roughnessMapUrl) || raw.fabric.roughnessMapUrl,
            } : null;

            let currentConfig = is3D ? {
                ...raw,
                fabric: mainFabricWithUrls || raw.fabric,
                collar: st.collarStyle || 'button-down',
                cuff: st.cuffStyle || 'double-squared',
                pocket: st.pocketStyle || 'chest',
                placketButton: st.placketButton?.id || '#ffffff',
                cuffButton: st.cuffButton?.id || '#ffffff',
                collarFabric: raw.collarFabric || st.collarFabric || (st.collar?.id && st.collar.id !== 'default' && !COLLAR_OPTIONS.some(c => c.id === st.collar.id) ? { id: st.collar.id, name: st.collar.name } : mainFabricWithUrls),
                cuffFabric: raw.cuffFabric || st.cuffFabric || (st.cuff?.id && st.cuff.id !== 'default' && !CUFF_OPTIONS.some(c => c.id === st.cuff.id) ? { id: st.cuff.id, name: st.cuff.name } : mainFabricWithUrls),
                placketFabric: raw.placketFabric || st.placketFabric || (st.placket?.id && st.placket.id !== 'default' ? { id: st.placket.id, name: st.placket.name } : mainFabricWithUrls),
                pocketFabric: raw.pocketFabric || st.pocketFabric || (st.pocket?.id && st.pocket.id !== 'default' && !POCKET_OPTIONS.some(p => p.id === st.pocket.id) ? { id: st.pocket.id, name: st.pocket.name } : mainFabricWithUrls),
            } : raw;

            // For 3D "Same as Body" components: use main fabric when id is 'default'
            if (is3D && mainFabricWithUrls) {
                if (currentConfig.collarFabric?.id === 'default') {
                    currentConfig = { ...currentConfig, collarFabric: mainFabricWithUrls };
                }
                if (currentConfig.cuffFabric?.id === 'default') {
                    currentConfig = { ...currentConfig, cuffFabric: mainFabricWithUrls };
                }
                if (currentConfig.placketFabric?.id === 'default') {
                    currentConfig = { ...currentConfig, placketFabric: mainFabricWithUrls };
                }
                if (currentConfig.pocketFabric?.id === 'default') {
                    currentConfig = { ...currentConfig, pocketFabric: mainFabricWithUrls };
                }
            }

            const needsMainHydration = currentConfig.fabric?.id && !currentConfig.fabric.colorMapUrl && !currentConfig.fabric.image;
            const needs3DFabricHydration = is3D && (
                (currentConfig.collarFabric?.id && currentConfig.collarFabric.id !== 'default' && !currentConfig.collarFabric.colorMapUrl && !currentConfig.collarFabric.image) ||
                (currentConfig.cuffFabric?.id && currentConfig.cuffFabric.id !== 'default' && !currentConfig.cuffFabric.colorMapUrl && !currentConfig.cuffFabric.image) ||
                (currentConfig.placketFabric?.id && currentConfig.placketFabric.id !== 'default' && !currentConfig.placketFabric.colorMapUrl && !currentConfig.placketFabric.image) ||
                (currentConfig.pocketFabric?.id && currentConfig.pocketFabric.id !== 'default' && !currentConfig.pocketFabric.colorMapUrl && !currentConfig.pocketFabric.image)
            );

            if (needsMainHydration || needs3DFabricHydration) {
                try {
                    const { fetchFabrics, getTextureUrl } = await import('@/services/fabricService');
                    const allFabrics = await fetchFabrics();

                    const findAndMerge = (partialFabric: any) => {
                        if (!partialFabric?.id || partialFabric.id === 'default') return partialFabric;
                        const partialId = String(partialFabric.id);
                        const fullFabric = allFabrics.find((f: any) =>
                            String(f._id) === partialId || String(f.id) === partialId
                        );
                        if (fullFabric) {
                            return {
                                ...partialFabric,
                                ...partialFabric,
                                colorMapUrl: getTextureUrl(fullFabric.colorMapUrl),
                                normalMapUrl: getTextureUrl(fullFabric.normalMapUrl),
                                roughnessMapUrl: getTextureUrl(fullFabric.roughnessMapUrl),
                                image: partialFabric.image || getTextureUrl(fullFabric.colorMapUrl),
                            };
                        }
                        return partialFabric;
                    };

                    const mergeOrMain = (f: any) => {
                        if (!f?.id || f.id === 'default') return mainFabricWithUrls;
                        const merged = findAndMerge(f);
                        return (merged.colorMapUrl || merged.image) ? merged : mainFabricWithUrls;
                    };

                    currentConfig = {
                        ...currentConfig,
                        ...(needsMainHydration && { fabric: findAndMerge(currentConfig.fabric) }),
                        collarFabric: mergeOrMain(currentConfig.collarFabric),
                        cuffFabric: mergeOrMain(currentConfig.cuffFabric),
                        placketFabric: mergeOrMain(currentConfig.placketFabric),
                        pocketFabric: mergeOrMain(currentConfig.pocketFabric),
                    };
                } catch (err) {
                    console.error('[SavedDesignPreviewModal] Failed to hydrate:', err);
                }
            }

            // ── PRODUCT & FABRIC HYDRATION ──
            // For 2D previews (pants AND shirts): merge design's style IDs with product's full options (layersByFabric) for layered preview.
            // We need the full product structure because ProductPreview.tsx iterates `product.customizationOptions.optionGroups`.
            const pType = design.productCategory || design.productType || 'shirt';
            const needsProductHydration = !!design.productId;

            let fetchedProduct = null;

            if (needsProductHydration) {
                try {
                    const { productService } = await import('@/services/products');
                    fetchedProduct = await productService.getById(design.productId);

                    // Attach the fetched product straight to our config object so DesignPreviewContent can pass it down
                    if (fetchedProduct) {
                        currentConfig = { ...currentConfig, _fullProductData: fetchedProduct };
                    }

                    // For pants specifically, we merge layer data into the styles block
                    if (pType === 'pants' || pType === 'trouser') {
                        const stylesLackLayers = !currentConfig.styles?.fit?.layersByFabric;
                        if (stylesLackLayers) {
                            const optGroups = fetchedProduct?.customizationOptions?.optionGroups || [];
                            const mergedStyles: Record<string, any> = { ...(currentConfig.styles || {}) };
                            optGroups.forEach((g: any) => {
                                const key = g.category || g.id;
                                const savedOpt = currentConfig.styles?.[key];
                                if (savedOpt?.id) {
                                    const fullOpt = (g.options || []).find((o: any) => String(o.id) === String(savedOpt.id));
                                    if (fullOpt) mergedStyles[key] = { ...savedOpt, ...fullOpt };
                                }
                            });
                            currentConfig = { ...currentConfig, styles: mergedStyles };
                        }
                    }

                    // Enrich fabric from product when missing previewImage/backPreviewImage (e.g. old saved designs)
                    if (currentConfig.fabric?.id && (!currentConfig.fabric.previewImage || !currentConfig.fabric.backPreviewImage)) {
                        const productFabrics = fetchedProduct?.customizationOptions?.fabrics || [];
                        const fullFabric = productFabrics.find((f: any) =>
                            String(f.id) === String(currentConfig.fabric.id)
                        );
                        if (fullFabric) {
                            currentConfig = {
                                ...currentConfig,
                                fabric: {
                                    ...currentConfig.fabric,
                                    previewImage: currentConfig.fabric.previewImage || fullFabric.previewImage,
                                    backPreviewImage: currentConfig.fabric.backPreviewImage || fullFabric.backPreviewImage,
                                },
                            };
                        }
                    }
                } catch (err) {
                    console.error('[SavedDesignPreviewModal] Failed to hydrate full product options:', err);
                }
            }

            setHydratedConfig(currentConfig);
        };
        hydrate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [designId, is3D, isOpen]);

    if (!design) return null;

    // Same main fabric with resolved texture URLs so 3D collar/cuff/placket/pocket use fabric color
    const mainFabricWithUrlsFallback = rawConfig?.fabric ? {
        ...rawConfig.fabric,
        colorMapUrl: getTextureUrl(rawConfig.fabric.image || rawConfig.fabric.colorMapUrl) || rawConfig.fabric.image || rawConfig.fabric.colorMapUrl,
        normalMapUrl: getTextureUrl(rawConfig.fabric.normalMapUrl) || rawConfig.fabric.normalMapUrl,
        roughnessMapUrl: getTextureUrl(rawConfig.fabric.roughnessMapUrl) || rawConfig.fabric.roughnessMapUrl,
    } : null;

    // Extract actual config used for rendering (3D: collar/cuff/pocket are STYLE ids)
    const config = hydratedConfig || (is3D ? {
        ...rawConfig,
        fabric: mainFabricWithUrlsFallback || rawConfig.fabric,
        collar: styles.collarStyle || 'button-down',
        cuff: styles.cuffStyle || 'double-squared',
        pocket: styles.pocketStyle || 'chest',
        placketButton: styles.placketButton?.id || '#ffffff',
        cuffButton: styles.cuffButton?.id || '#ffffff',
        collarFabric: rawConfig.collarFabric || (styles.collar?.id && styles.collar.id !== 'default' ? { id: styles.collar.id, name: styles.collar.name } : mainFabricWithUrlsFallback),
        cuffFabric: rawConfig.cuffFabric || (styles.cuff?.id && styles.cuff.id !== 'default' ? { id: styles.cuff.id, name: styles.cuff.name } : mainFabricWithUrlsFallback),
        placketFabric: rawConfig.placketFabric || (styles.placket?.id && styles.placket.id !== 'default' ? { id: styles.placket.id, name: styles.placket.name } : mainFabricWithUrlsFallback),
        pocketFabric: rawConfig.pocketFabric || (styles.pocket?.id && styles.pocket.id !== 'default' ? { id: styles.pocket.id, name: styles.pocket.name } : mainFabricWithUrlsFallback),
    } : rawConfig);

    // Always show 3D if it's a 3D design, regardless of texture presence
    // ProductPreview3D should handle fallback textures
    const show3D = is3D;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent elevated className="w-[95vw] sm:w-full sm:max-w-2xl h-[90dvh] sm:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-xl rounded-xl">

                {/* Header */}
                <DialogHeader className="p-4 sm:p-6 border-b border-border/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
                                {is3D ? <Box className="w-5 h-5 text-primary" /> : <Layers className="w-5 h-5 text-primary" />}
                                {design.name || design.productName}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground mt-1">
                                Saved on {new Date(design.savedAt || Date.now()).toLocaleDateString()}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Main preview area. Same layout as Customize3D right side. */}
                <div className="flex-1 w-full h-full flex flex-col p-4 sm:p-6 relative overflow-hidden bg-background">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        {/* Left spacer to push toggles to right */}
                        <div />

                        {/* Front/Back view toggle */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setViewMode('front')}
                                className={`px-4 py-2 sm:px-3 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg text-sm sm:text-xs font-medium transition-all shadow-sm ${viewMode === 'front' ? 'bg-primary text-white' : 'bg-white border border-border/50 text-foreground hover:bg-muted'}`}
                            >
                                Front
                            </button>
                            <button
                                onClick={() => setViewMode('back')}
                                className={`px-4 py-2 sm:px-3 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg text-sm sm:text-xs font-medium transition-all shadow-sm ${viewMode === 'back' ? 'bg-primary text-white' : 'bg-white border border-border/50 text-foreground hover:bg-muted'}`}
                            >
                                Back
                            </button>
                        </div>
                    </div>

                    {/* Preview content. 2D or 3D based on design. */}
                    <div className="flex-1 mb-4">
                        <div className="w-full h-full flex items-center justify-center relative rounded-xl bg-primary/5 border border-primary/20 shadow-soft overflow-hidden">
                            <DesignPreviewContent
                                design={design}
                                viewMode={viewMode}
                                config={config}
                                is3D={show3D}
                                productType={productType}
                                className={`w-full h-full max-w-2xl mx-auto object-contain relative z-10 ${show3D ? '' : 'drop-shadow-2xl'}`}
                            />
                        </div>
                    </div>

                    {/* Bottom section. Selected customizations list. */}
                    <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-border/50 shadow-sm p-4 shrink-0 overflow-scroll">
                        <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            Selected Customizations
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {/* Body Fabric */}
                            {config.fabric?.name && (
                                <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                                    Body: {config.fabric.name}
                                </span>
                            )}

                            {/* 3D shirt. Show fabric names per component (collar, cuff, pocket, placket). */}
                            {is3D && (
                                <>
                                    <span className="px-3 py-1.5 bg-accent/10 text-primary rounded-lg text-xs font-semibold border border-accent/20">
                                        Collar: {config.collarFabric?.name || config.fabric?.name || 'Custom Fabric'}
                                    </span>
                                    <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                                        Cuff: {config.cuffFabric?.name || config.fabric?.name || 'Custom Fabric'}
                                    </span>
                                    {config.pocket && config.pocket !== 'none' && (
                                        <span className="px-3 py-1.5 bg-accent/10 text-primary rounded-lg text-xs font-semibold border border-accent/20">
                                            Pocket: {config.pocketFabric?.name || config.fabric?.name || 'Custom Fabric'}
                                        </span>
                                    )}
                                    <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                                        Placket: {config.placketFabric?.name || config.fabric?.name || 'Custom Fabric'}
                                    </span>
                                </>
                            )}

                            {/* 2D Details */}
                            {!is3D && (
                                <>
                                    {config.collar && (
                                        <span className="px-3 py-1.5 bg-accent/10 text-primary rounded-lg text-xs font-semibold border border-accent/20">
                                            {config.collar.name || config.collar}
                                        </span>
                                    )}
                                    {config.cuff && (
                                        <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                                            {config.cuff.name || config.cuff}
                                        </span>
                                    )}
                                    {config.pocket && (
                                        <span className="px-3 py-1.5 bg-accent/10 text-primary rounded-lg text-xs font-semibold border border-accent/20">
                                            {config.pocket.name || config.pocket}
                                        </span>
                                    )}
                                    {config.sleeve && (
                                        <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                                            {config.sleeve.name || config.sleeve}
                                        </span>
                                    )}
                                    {config.button && (
                                        <span className="px-3 py-1.5 bg-accent/10 text-primary rounded-lg text-xs font-semibold border border-accent/20">
                                            {config.button.name || config.button}
                                        </span>
                                    )}
                                    {config.back && (
                                        <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                                            {config.back.name || config.back}
                                        </span>
                                    )}
                                    {config.necktie && (
                                        <span className="px-3 py-1.5 bg-accent/10 text-primary rounded-lg text-xs font-semibold border border-accent/20">
                                            {config.necktie.name || config.necktie}
                                        </span>
                                    )}
                                    {config.bowtie && (
                                        <span className="px-3 py-1.5 bg-accent/10 text-primary rounded-lg text-xs font-semibold border border-accent/20">
                                            {config.bowtie.name || config.bowtie}
                                        </span>
                                    )}

                                    {/* Pants. Fit and style options. */}
                                    {productType !== 'shirt' && config.styles && Object.entries(config.styles).map(([key, opt]: [string, any]) => (
                                        opt && opt.name && (
                                            <span key={key} className="px-3 py-1.5 bg-accent/10 text-primary rounded-lg text-xs font-semibold border border-accent/20">
                                                {opt.name}
                                            </span>
                                        )
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <DialogFooter className="p-4 sm:p-6 border-t border-border/10 bg-background/50 backdrop-blur-sm mt-auto shrink-0">
                    <div className="flex flex-col-reverse sm:flex-row w-full items-center justify-end gap-3">
                        <div className="flex w-full sm:w-auto gap-3 ">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    // Close modal FIRST to unmount 3D canvas cleanly, then trigger delete
                                    const designId = design.id || design._id;
                                    onClose();
                                    // Small delay to let the 3D canvas unmount before parent processes deletion
                                    setTimeout(() => onRequestDelete(designId), 150);
                                }}
                                className="w-full sm:w-auto gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </Button>
                            <Button
                                onClick={() => {
                                    onRestore(design);
                                    onClose();
                                }}
                                className="flex-1 sm:flex-none gap-2 min-w-[140px]"
                            >
                                {is3D ? <Box className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                {is3D ? 'Open 3D Editor' : 'Edit Design'}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}
