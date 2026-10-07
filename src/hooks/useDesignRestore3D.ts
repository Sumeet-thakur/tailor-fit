// Hook for restoring 3D design from URL. Used by Customize3D page.
import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getRestoreDesignId } from '@/lib/designRestoration';
import { findDesignById } from '@/lib/savedDesignsStorage';
import { showSuccess } from '@/lib/toastHelpers';
import type { Fabric3D } from '@/types/fabric';

interface UseDesignRestore3DParams {
  customerDesigns: any[] | undefined;
  fabrics: Fabric3D[];
  productType: string;
  setSelectedFabric: (f: Fabric3D) => void;
  setActiveCategory: (c: string) => void;
  setCollarFabric: (f: Fabric3D) => void;
  setCuffFabric: (f: Fabric3D) => void;
  setPocketFabric: (f: Fabric3D) => void;
  setPlacketFabric: (f: Fabric3D) => void;
  setSelectedCollar: (c: string) => void;
  setSelectedCuff: (c: string) => void;
  setSelectedPocket: (c: string) => void;
  setSelectedPlacket: (c: string) => void;
  setCollarEdgeColor: (c: string) => void;
  setCollarStitchColor: (c: string) => void;
  setCollarButtonColor: (c: string) => void;
  setCuffEdgeColor: (c: string) => void;
  setCuffStitchColor: (c: string) => void;
  setCuffButtonColor: (c: string) => void;
  setPlacketEdgeColor: (c: string) => void;
  setPlacketStitchColor: (c: string) => void;
  setPlacketButtonColor: (c: string) => void;
  setPocketEdgeColor: (c: string) => void;
  setPocketStitchColor: (c: string) => void;
  setMeasurements: (m: Record<string, string>) => void;
}

export function useDesignRestore3D({
  customerDesigns,
  fabrics,
  productType,
  setSelectedFabric,
  setActiveCategory,
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
}: UseDesignRestore3DParams): void {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const restoreInProgressRef = useRef<string | null>(null);

  useEffect(() => {
    const restoreId = getRestoreDesignId(searchParams);
    if (!restoreId || !customerDesigns || fabrics.length === 0) return;
    if (restoreInProgressRef.current === restoreId) return;

    const design = customerDesigns?.find((d) => d._id === restoreId) ?? findDesignById(restoreId);
    if (!design) return;

    // Use design.config if available (cart items store styles inside config)
    const configToRestore = design.config || design;

    restoreInProgressRef.current = restoreId;

    if (configToRestore.fabric) {
      const matchingFabric = fabrics.find(
        (f) => f._id === configToRestore.fabric?.id || f.name === configToRestore.fabric?.name
      );
      if (matchingFabric) {
        setSelectedFabric(matchingFabric);
        setActiveCategory(matchingFabric.category);
      }
    }

    if (configToRestore.styles) {
      // 1. Restore Structural Shapes
      if (configToRestore.styles.collar?.id) {
        setSelectedCollar(configToRestore.styles.collar.id);
      }
      if (configToRestore.styles.cuff?.id) {
        setSelectedCuff(configToRestore.styles.cuff.id);
      }
      if (configToRestore.styles.pocket?.id) {
        setSelectedPocket(configToRestore.styles.pocket.id);
      }

      // 2. Restore Individual Component Fabrics (if they exist)
      const colTabId = configToRestore.styles.collarFabric?.id || configToRestore.collarFabric?.id;
      if (colTabId && colTabId !== 'default') {
        const fabric = fabrics.find((f) => f._id === colTabId);
        if (fabric) setCollarFabric(fabric);
      }
      
      const cufTabId = configToRestore.styles.cuffFabric?.id || configToRestore.cuffFabric?.id;
      if (cufTabId && cufTabId !== 'default') {
        const fabric = fabrics.find((f) => f._id === cufTabId);
        if (fabric) setCuffFabric(fabric);
      }
      
      const pocTabId = configToRestore.styles.pocketFabric?.id || configToRestore.pocketFabric?.id;
      if (pocTabId && pocTabId !== 'default') {
        const fabric = fabrics.find((f) => f._id === pocTabId);
        if (fabric) setPocketFabric(fabric);
      }
      
      const plaTabId = configToRestore.styles.placketFabric?.id || configToRestore.placketFabric?.id;
      if (plaTabId && plaTabId !== 'default') {
        const fabric = fabrics.find((f) => f._id === plaTabId);
        if (fabric) setPlacketFabric(fabric);
      }

      // 3. Restore Button Colors
      if (configToRestore.styles.placketButton?.id) setPlacketButtonColor(configToRestore.styles.placketButton.id);
      if (configToRestore.styles.cuffButton?.id) setCuffButtonColor(configToRestore.styles.cuffButton.id);

      // 4. Restore Edge & Stitch Colors for Pocket
      if (configToRestore.styles.pocketEdgeColor) setPocketEdgeColor(configToRestore.styles.pocketEdgeColor);
      if (configToRestore.styles.pocketStitchColor) setPocketStitchColor(configToRestore.styles.pocketStitchColor);

      // 5. Restore Edge & Stitch Colors for Collar, Cuff, Placket
      if (configToRestore.styles.collarEdgeColor) setCollarEdgeColor(configToRestore.styles.collarEdgeColor);
      if (configToRestore.styles.collarStitchColor) setCollarStitchColor(configToRestore.styles.collarStitchColor);
      if (configToRestore.styles.collarButton?.id) setCollarButtonColor(configToRestore.styles.collarButton.id);
      if (configToRestore.styles.cuffEdgeColor) setCuffEdgeColor(configToRestore.styles.cuffEdgeColor);
      if (configToRestore.styles.cuffStitchColor) setCuffStitchColor(configToRestore.styles.cuffStitchColor);
      if (configToRestore.styles.placketEdgeColor) setPlacketEdgeColor(configToRestore.styles.placketEdgeColor);
      if (configToRestore.styles.placketStitchColor) setPlacketStitchColor(configToRestore.styles.placketStitchColor);
    }

    if (configToRestore.measurements) {
      setMeasurements(configToRestore.measurements);
    }

    showSuccess('3D Design restored!');
    navigate(`/customize-3d/${productType}`, { replace: true });
  }, [
    searchParams,
    customerDesigns,
    fabrics,
    productType,
    navigate,
    setSelectedFabric,
    setActiveCategory,
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
  ]);
}
