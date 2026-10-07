import { useCallback } from 'react';
import { ScreenshotService, SCREENSHOT_STABILIZE_DELAY } from '@/utils/screenshotService';

const SCREENSHOT_TIMEOUT_MS = 20000;

interface UseScreenshotCapture2DParams {
  mobileRef: React.RefObject<HTMLElement | null>;
  desktopRef: React.RefObject<HTMLElement | null>;
  productType: 'shirt' | 'pants';
  productName?: string;
  customerId?: string;
}

/**
 * Hook for capturing 2D preview screenshots. Uses desktop ref on viewport >= 1024px, otherwise mobile ref.
 * Returns a capture function that resolves to the uploaded screenshot URL or a placeholder.
 */
export function useScreenshotCapture2D({
  mobileRef,
  desktopRef,
  productType,
  productName = 'custom-product',
  customerId,
}: UseScreenshotCapture2DParams): (folderType?: 'saved-designs' | 'cart-items') => Promise<string> {
  const placeholder = `/images/placeholders/${productType}.svg`;

  return useCallback(async (folderType: 'saved-designs' | 'cart-items' = 'saved-designs'): Promise<string> => {
    const elementToCapture =
      window.innerWidth >= 1024 && desktopRef.current ? desktopRef.current : mobileRef.current;

    if (!elementToCapture) return placeholder;

    await new Promise((resolve) => setTimeout(resolve, SCREENSHOT_STABILIZE_DELAY));

    const result = await Promise.race([
      ScreenshotService.capture2DAndUpload(elementToCapture, productType, productName, folderType, placeholder, customerId),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Screenshot timeout')), SCREENSHOT_TIMEOUT_MS)
      ),
    ]).then((r) => (typeof r === 'string' ? r : placeholder)).catch(() => placeholder);

    return result;
  }, [mobileRef, desktopRef, productType, productName, customerId]);
}
