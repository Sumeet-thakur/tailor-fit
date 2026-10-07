import { useState, useCallback, useEffect } from 'react';
import { useCustomization } from '@/context/CustomizationContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { showSuccess, showError } from '@/lib/toastHelpers';
import { getImageUrl } from '@/utils/imageHelper';
import {
    getSavedDesigns,
    saveDesign as saveDesignToLocal,
    deleteDesign as deleteLocalDesign,
    getDesignsByProduct
} from '@/lib/savedDesignsStorage';

interface UseCustomizationDraftsProps {
    product: any;
    captureScreenshot: () => Promise<string>;
    totalPrice: number;
}

export function useCustomizationDrafts({ product, captureScreenshot, totalPrice }: UseCustomizationDraftsProps) {
    const { customer, isAuthenticated, saveDesign, deleteDesign } = useCustomerAuth();

    const {
        config,
        setFabric,
        setCollar,
        setCuff,
        setPocket,
        setButton,
        setSleeve,
        setBack,
        setNecktie,
        setBowtie,
        setStyle,
        updateMeasurements,
        isShirt // Assuming this is available or derived
    } = useCustomization();

    const [saved, setSaved] = useState(false);
    const [savedDesigns, setSavedDesigns] = useState<any[]>([]);
    const [showSavedDesigns, setShowSavedDesigns] = useState(false);
    const [pendingAction, setPendingAction] = useState<'save' | 'add-to-cart' | null>(null);
    const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState(false);

    // Load saved designs
    useEffect(() => {
        if (!product?._id) return;
        try {
            const localDesigns = getSavedDesigns();
            const accountDesigns = customer?.savedDesigns || [];
            const combined: any[] = [];
            const seenIds = new Set<string>();

            // Add account designs first
            accountDesigns.forEach((ad: any) => {
                const designId = ad._id || ad.id;
                if (designId && !seenIds.has(designId)) {
                    seenIds.add(designId);
                    combined.push({
                        ...ad,
                        id: ad._id,
                        savedAt: ad.savedAt || new Date().toISOString()
                    });
                }
            });

            // Add local designs
            localDesigns.forEach((ld: any) => {
                if (!seenIds.has(ld.id)) {
                    seenIds.add(ld.id);
                    combined.push(ld);
                }
            });

            // Filter for current product
            const productDesigns = combined.filter((d: any) => d.productId === product._id || d.productId === product.slug);

            // Sort by date desc
            productDesigns.sort((a: any, b: any) =>
                new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
            );

            setSavedDesigns(productDesigns);
        } catch (error) {
            console.error('Error loading saved designs:', error);
        }
    }, [product, customer, showSavedDesigns]);

    const saveDraft = async () => {
        if (!product) return;

        setSaved(false);
        setPendingAction('save');
        setIsGeneratingScreenshot(true);

        try {
            const screenshotUrl = await captureScreenshot();

            // Prepare styles
            const styles: Record<string, any> = {};
            if (config.styles) {
                Object.entries(config.styles).forEach(([key, opt]: [string, any]) => {
                    if (opt) {
                        styles[key] = { id: opt.id, name: opt.name, priceModifier: opt.priceModifier || 0 };
                    }
                });
            }

            // Legacy structure support for explicit parts
            const currentCategory = product.category || 'shirt';
            if (currentCategory === 'shirt') {
                if (config.collar) styles.collar = { id: config.collar.id, name: config.collar.name };
                if (config.cuff) styles.cuff = { id: config.cuff.id, name: config.cuff.name };
                if (config.pocket) styles.pocket = { id: config.pocket.id, name: config.pocket.name };
                if (config.button) styles.button = { id: config.button.id, name: config.button.name };
                if (config.sleeve) styles.sleeve = { id: config.sleeve.id, name: config.sleeve.name };
                if (config.back) styles.back = { id: config.back.id, name: config.back.name };
                if (config.necktie) styles.necktie = { id: config.necktie.id, name: config.necktie.name };
                if (config.bowtie) styles.bowtie = { id: config.bowtie.id, name: config.bowtie.name };
            }

            const payload = {
                id: `${product._id}-${Date.now()}`,
                productId: product._id,
                productName: product.name,
                productCategory: product.category,
                baseImage: getImageUrl(product.images?.baseImage) || `/images/placeholders/${product.category}.svg`,
                fabric: config.fabric ? {
                    id: config.fabric.id,
                    name: config.fabric.name,
                    image: getImageUrl(config.fabric.image),
                    ...(config.fabric.previewImage && { previewImage: config.fabric.previewImage }),
                    ...(config.fabric.backPreviewImage && { backPreviewImage: config.fabric.backPreviewImage }),
                } : null,
                styles,
                measurements: config.measurements || {},
                totalPrice,
                savedAt: new Date().toISOString(),
                screenshot: screenshotUrl,
            };

            if (isAuthenticated && saveDesign) {
                const result = await saveDesign({
                    productId: product._id,
                    productName: product.name,
                    productCategory: product.category,
                    baseImage: getImageUrl(product.images?.baseImage) || `/images/placeholders/${product.category}.svg`,
                    fabric: config.fabric ? {
                        id: config.fabric.id,
                        name: config.fabric.name,
                        image: getImageUrl(config.fabric.image) || '',
                        ...(config.fabric.previewImage && { previewImage: config.fabric.previewImage }),
                        ...(config.fabric.backPreviewImage && { backPreviewImage: config.fabric.backPreviewImage }),
                    } : null,
                    styles,
                    measurements: config.measurements || {},
                    totalPrice,
                    screenshot: screenshotUrl,
                } as any);

                if (result.success) {
                    showSuccess('Design saved to your account!');
                } else {
                    showError('Failed to save design');
                }
            } else {
                const localPayload = { ...payload, config, screenshot: screenshotUrl };
                saveDesignToLocal(localPayload as any);
                // Optimistically update
                const updatedDesigns = getDesignsByProduct(product._id);
                setSavedDesigns(updatedDesigns);
                showSuccess('Design saved!', 'Sign in to save to your account');
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);

        } catch (e) {
            console.error("Save draft failed", e);
            showError("Failed to save draft");
        } finally {
            setPendingAction(null);
            setIsGeneratingScreenshot(false);
        }
    };

    const restoreDraft = (design: any) => {
        if (!design.config) return;

        // Restore fabric
        if (design.config.fabric) {
            setFabric(design.config.fabric);
        }

        // Restore category-specific options
        // Assuming 'shirt' logic here based on original file, but safe to check
        const currentCategory = product?.category || 'shirt';
        if (currentCategory === 'shirt') {
            if (design.config.collar) setCollar(design.config.collar);
            if (design.config.cuff) setCuff(design.config.cuff);
            if (design.config.pocket) setPocket(design.config.pocket);
            if (design.config.button) setButton(design.config.button);
            if (design.config.sleeve) setSleeve(design.config.sleeve);
            if (design.config.back) setBack(design.config.back);
        }

        // Restore generic styles
        if (design.config.styles) {
            Object.entries(design.config.styles).forEach(([key, option]) => {
                if (option) setStyle(key, option as any);
            });
        }

        // Restore measurements
        if (design.config.measurements) {
            updateMeasurements(design.config.measurements);
        }

        setShowSavedDesigns(false);
        showSuccess('Design restored!');
    };

    const removeDraft = async (designId: string) => {
        if (!product) return;

        const accountDesign = customer?.savedDesigns?.find((d: any) => d._id === designId);

        if (accountDesign && isAuthenticated && deleteDesign) {
            const result = await deleteDesign(designId);
            if (result.success) {
                showSuccess('Design deleted from your account');
                // Filter out deleted design from current state
                setSavedDesigns(prev => prev.filter(d => d._id !== designId && d.id !== designId));
            } else {
                showError('Failed to delete design');
            }
        } else {
            const remaining = deleteLocalDesign(designId);
            setSavedDesigns(remaining.filter((d: any) => d.productId === product._id));
            showSuccess('Design deleted');
        }
    };

    return {
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
    };
}
