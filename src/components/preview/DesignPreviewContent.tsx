// Single preview for saved designs. Used in saved design modal (header drawer, Account, cart/order details),
// OrderSpecs, Account page. Routes to 3D shirt or 2D shirt/pants preview.
import { lazy, Suspense } from 'react';
import { ProductPreview } from '@/components/preview/ProductPreview';
import { getItemPreviewImage, getItemPreviewImageForView } from '@/lib/screenshotUtils';
import { getImageUrl } from '@/utils/imageHelper';

// Lazy-load ProductPreview3D to avoid loading Three.js (~5.5 MB) on every page.
// Three.js only loads when a 3D design preview is actually rendered.
const ProductPreview3D = lazy(() => import('@/components/preview/ProductPreview3D'));

interface DesignPreviewContentProps {
  design: any;
  viewMode: 'front' | 'back';
  config: any;
  is3D: boolean;
  productType: string;
  className?: string;
}

// Resolves base image for 2D layered preview. Pants: view screenshot or fabric preview. Shirt: fabric body base.
function get2DBaseImage(design: any, config: any, viewMode: 'front' | 'back', productType: string): string | undefined {
  if (productType === 'pants' || productType === 'trouser') {
    const viewScreenshot = getItemPreviewImageForView(design, viewMode);
    if (viewScreenshot) return viewScreenshot;
    // Use fabric view-specific preview when no view screenshot (saved designs often have single screenshot)
    if (viewMode === 'back' && config?.fabric?.backPreviewImage) return getImageUrl(config.fabric.backPreviewImage);
    if (viewMode === 'front' && config?.fabric?.previewImage) return getImageUrl(config.fabric.previewImage);
    // Try any selected style's layersByFabric as base (e.g. "fit" for pants, "body" for future products)
    const fabricId = config?.fabric?.id;
    if (fabricId) {
      for (const [, opt] of Object.entries(config?.styles || {})) {
        const option = opt as { layersByFabric?: Record<string, string | { front?: string; back?: string }> } | null;
        const variant = option?.layersByFabric?.[fabricId];
        if (variant) {
          const path = typeof variant === 'string' ? variant : (viewMode === 'back' ? variant.back : variant.front);
          if (path) return getImageUrl(path);
        }
      }
    }
    return getImageUrl(config?.fabric?.image);
  }
  const fabric = config?.fabric;
  if (fabric?.previewImage && viewMode === 'front') return getImageUrl(fabric.previewImage);
  if (fabric?.backPreviewImage && viewMode === 'back') return getImageUrl(fabric.backPreviewImage);
  return undefined;
}

export function DesignPreviewContent({
  design,
  viewMode,
  config,
  is3D,
  productType,
  className = '',
}: DesignPreviewContentProps) {
  // ProductPreview expects product shape; derive from design
  const mockProduct = config?._fullProductData || design?.product || {
    ...design,
    _id: design?.productId,
    category: productType,
    name: design?.productName,
  };

  if (is3D) {
    return (
      <Suspense fallback={<div className={`flex items-center justify-center ${className}`}><div className="animate-spin h-8 w-8 border-2 border-amber-600 border-t-transparent rounded-full" /></div>}>
        <ProductPreview3D
          config={config}
          productType={productType as any}
          viewMode={viewMode}
          className={className}
          modelUrl={mockProduct?.modelUrl}
          environmentUrl={mockProduct?.environmentMapUrl || mockProduct?.environmentUrl}
        />
      </Suspense>
    );
  }

  // Base image for 2D shirt/pants preview. Fallback to design screenshot
  const baseImage = get2DBaseImage(design, config, viewMode, productType) || getItemPreviewImage(design);

  return (
    <ProductPreview
      product={mockProduct}
      config={config}
      viewMode={viewMode}
      baseImage={baseImage ?? null}
      showControls={false}
      className={className}
    />
  );
}
