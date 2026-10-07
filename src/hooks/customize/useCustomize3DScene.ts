import { useState, useEffect } from 'react';
import { productService } from '@/services/products';
import { fetchFabrics } from '@/services/fabricService';
import { Fabric3D } from '@/types/fabric';
import { preloadFabricTextures } from '@/utils/textureCache';

interface UseCustomize3DSceneProps {
    id: string; // Can be a product _id, SEO slug, or legacy category ('shirt' | 'pants')
}

export function useCustomize3DScene({ id }: UseCustomize3DSceneProps) {
    const [product, setProduct] = useState<any>(null);
    // No hardcoded defaults — these are null until a real product loads
    const [modelPath, setModelPath] = useState<string | null>(null);
    const [environmentUrl, setEnvironmentUrl] = useState<string | null>(null);
    const [fabrics, setFabrics] = useState<Fabric3D[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [validProductType, setValidProductType] = useState<string>('shirt');

    useEffect(() => {
        const loadScene = async () => {
            setIsLoading(true);
            setError(null);

            try {
                let product3D;
                // 1. Check if the ID provided is just a raw category fallback (e.g. from "Switch to 3D" button on 2D customizer)
                if (id === 'shirt' || id === 'pants' || id === 'suit') {
                    const products = await productService.getAll();
                    product3D = products?.find((p: any) => p.category === id && p.categoryType === '3d');
                } else {
                    // 2. Try to fetch the explicit 3D product by ID/Slug
                    try {
                        product3D = await productService.getById(id);
                    } catch (e) {
                        console.warn("[Customize3D] Could not find 3D product by ID/Slug:", id);
                    }

                    // 3. Fallback: If they passed a 2D product's explicit ID (e.g. from a Switch button), 
                    // we find the 3D equivalent based on the loaded 2D product's category.
                    if (product3D && product3D.categoryType !== '3d') {
                        const products = await productService.getAll();
                        product3D = products?.find((p: any) => p.category === product3D.category && p.categoryType === '3d');
                    }
                }

                if (!product3D) {
                    setError(`No 3D product found for this selection. Please create one from the Admin Dashboard.`);
                    setIsLoading(false);
                    return;
                }

                setValidProductType(product3D.category || 'shirt');

                let finalModelPath = product3D.modelUrl;

                // Fallback for local testing / offline if modelUrl is missing or user is offline
                if (!finalModelPath || !window.navigator.onLine) {
                    if (product3D.category === 'shirt') {
                        finalModelPath = '/tailor-fit-darosoft-assets/3d-shirt-style-customization/models/shirt-new1.glb';
                        console.log('Using local fallback model:', finalModelPath);
                    }
                }


                if (!finalModelPath) {
                    setError(`The 3D ${product3D.category || 'product'} is missing a 3D model (.glb). Please upload one in the Admin Dashboard.`);
                    setIsLoading(false);
                    return;
                }

                setProduct(product3D);
                setModelPath(finalModelPath);
                if (product3D.environmentMapUrl) setEnvironmentUrl(product3D.environmentMapUrl);

                // 2. Load fabrics — only product-linked fabrics
                const data = await fetchFabrics(
                    product3D.fabricIds?.length ? product3D._id : undefined
                );
                const usableFabrics = data.filter((f: Fabric3D) => !f.is3DPreview);
                setFabrics(usableFabrics);

                // Eagerly preload ONLY the first fabric to prevent massive network payloads (50MB+)
                // The rest will lazy-load when the user clicks them in the FabricSelector.
                if (usableFabrics.length > 0) {
                    preloadFabricTextures(usableFabrics[0]);
                }

                if (usableFabrics.length === 0) {
                    setError(`The 3D ${product3D.category || 'product'} has no fabrics assigned. Please add fabrics in the Admin Dashboard.`);
                }
            } catch (err) {
                console.error('[Customize3D] Error loading scene:', err);
                setError('Failed to load 3D customizer data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        loadScene();
    }, [id]);

    return {
        product,
        modelPath,
        environmentUrl,
        fabrics,
        isLoading,
        error,
        validProductType
    };
}

