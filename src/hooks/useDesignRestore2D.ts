// Hook for restoring 2D design from URL. Used by Customize page.
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRestoreUrl } from '@/lib/designRestoration';
import { findDesignById } from '@/lib/savedDesignsStorage';
import { showSuccess } from '@/lib/toastHelpers';
import { FabricOption, CustomizationOption } from '@/types/shirt';

interface RestoreSetters {
  setFabric: (f: FabricOption | null) => void;
  setOption: (category: string, opt: CustomizationOption | null) => void;
  updateMeasurements: (m: Record<string, string>) => void;
}

interface UseDesignRestore2DParams {
  restoreDesignId: string | null;
  product: { _id: string; slug?: string } | null;
  productId: string | undefined;
  customerDesigns: any[] | undefined;
  productFabrics: FabricOption[];
  styleGroups: Record<string, CustomizationOption[]>;
  setters: RestoreSetters;
}

export function useDesignRestore2D({
  restoreDesignId,
  product,
  productId,
  customerDesigns,
  productFabrics,
  styleGroups,
  setters,
}: UseDesignRestore2DParams): void {
  const navigate = useNavigate();
  const [restoredId, setRestoredId] = useState<string | null>(null);
  const restoreInProgressRef = useRef<string | null>(null);

  useEffect(() => {
    setRestoredId(null);
    restoreInProgressRef.current = null;
  }, [productId, restoreDesignId]);

  useEffect(() => {
    if (!restoreDesignId || restoredId === restoreDesignId) return;
    if (restoreInProgressRef.current === restoreDesignId) return;
    if (!product) return;

    const {
      setFabric,
      setOption,
      updateMeasurements,
    } = setters;

    const performRestore = () => {
      try {
        restoreInProgressRef.current = restoreDesignId;

        const savedDesign: any =
          customerDesigns?.find((d: any) => d._id === restoreDesignId || d.id === restoreDesignId) ??
          findDesignById(restoreDesignId);

        if (!savedDesign) {
          restoreInProgressRef.current = null;
          return;
        }

        const designProductId = savedDesign.productId;
        const currentProductId = product._id;
        const currentProductSlug = product.slug;

        if (designProductId !== currentProductId && designProductId !== currentProductSlug) {
          if (productId === designProductId || productId === savedDesign.productCategory) {
            return;
          }
          if (designProductId) {
            navigate(getRestoreUrl({ productId: designProductId, _id: restoreDesignId }), { replace: true });
            return;
          }
        }

        setRestoredId(restoreDesignId);
        const designToRestore = savedDesign;

        setTimeout(() => {
          try {
            if (designToRestore.fabric && Array.isArray(productFabrics) && productFabrics.length > 0) {
              const fabricOption = productFabrics.find((f: any) => f.id === designToRestore.fabric.id);
              if (fabricOption) setFabric(fabricOption);
            }

            setTimeout(() => {
              if (designToRestore.styles) {
                Object.entries(designToRestore.styles).forEach(([key, value]: [string, any], index) => {
                  if (!value?.id) return;

                  // Generic restore using styleGroups
                  // We try to find the option in styleGroups[key]
                  // Note: Some legacy keys might need mapping if they differ from styleGroup keys, 
                  // but generally they match (collar, cuff, pocket, button, sleeve, back, etc.)

                  // For shirt specific arrays that were previously separate props (collars, cuffs...),
                  // they are now expected to be in styleGroups['collar'], styleGroups['cuff'], etc.

                  const group = styleGroups[key];
                  if (group?.length > 0) {
                    const opt = group.find((o: any) => o.id === value.id);
                    // Stagger updates to avoid state batching issues or UI jank
                    if (opt) setTimeout(() => setOption(key, opt), 50 * (index + 1));
                  }
                });
              }

              setTimeout(() => {
                if (designToRestore.measurements) {
                  const measurements = designToRestore.measurements as Record<string, string>;
                  Object.entries(measurements).forEach(([key, value]) => {
                    if (value) updateMeasurements({ [key]: value });
                  });
                }
                showSuccess('Design restored!', designToRestore.productName || designToRestore.name);
              }, 600);
            }, 200);
          } catch (error) {
            console.error('Error restoring design:', error);
          }
        }, 1500);
      } catch (error) {
        console.error('Error in restore useEffect:', error);
      }
    };

    if (Array.isArray(productFabrics) && productFabrics.length > 0) {
      performRestore();
    } else {
      const checkInterval = setInterval(() => {
        if (Array.isArray(productFabrics) && productFabrics.length > 0) {
          clearInterval(checkInterval);
          performRestore();
        }
      }, 200);
      const timeout = setTimeout(() => clearInterval(checkInterval), 10000);
      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [
    restoreDesignId,
    restoredId,
    customerDesigns,
    product,
    productFabrics,
    styleGroups,
    productId,
    navigate,
    setters.setFabric,
    setters.setOption,
    setters.updateMeasurements,
  ]);
}
