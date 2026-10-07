import { useCallback } from 'react';
import { ScreenshotService, SCREENSHOT_STABILIZE_DELAY } from '@/utils/screenshotService';

interface CaptureRef {
  capture?: () => string | null;
}

interface UseScreenshotCapture3DParams {
  screenshotRef: React.RefObject<CaptureRef | null>;
  productType: 'shirt' | 'pants';
  placeholder?: string;
  productName?: string;
  customerId?: string;
}

/**
 * Hook for capturing 3D preview screenshots. Calls the capture method on the ref (e.g. ProductPreview3D)
 * and uploads the resulting data URL.
 */
export function useScreenshotCapture3D({
  screenshotRef,
  productType,
  placeholder = '',
  productName = 'custom-product',
  customerId,
}: UseScreenshotCapture3DParams): (folderType?: 'saved-designs' | 'cart-items') => Promise<string> {
  return useCallback(async (folderType: 'saved-designs' | 'cart-items' = 'saved-designs'): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, SCREENSHOT_STABILIZE_DELAY));

    const dataUrl = screenshotRef.current?.capture?.() ?? null;
    const url = await ScreenshotService.capture3DAndUpload(dataUrl, productType, productName, folderType, placeholder, customerId);

    return url || placeholder;
  }, [screenshotRef, productType, placeholder, productName, customerId]);
}
