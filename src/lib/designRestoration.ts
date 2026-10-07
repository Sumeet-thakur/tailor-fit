// Design restoration: URL helpers for restore param and navigation.
import { ROUTES } from '@/constants/routes';

interface SavedDesignLike {
  _id?: string;
  id?: string;
  productId?: string;
  productName?: string;
  name?: string;
  is3D?: boolean;
  styles?: any;
  config?: any;
}

/** Returns restore design ID from URL search params, or null. */
export function getRestoreDesignId(searchParams: URLSearchParams): string | null {
  return searchParams.get('restore');
}

/** Returns true if design is for 3D customizer. */
export function isDesign3D(design: SavedDesignLike): boolean {
  const styles = design.config?.styles ?? design.styles ?? {};
  return !!(
    design.is3D ||
    (design.productName ?? '').includes('3D') ||
    (design.name ?? '').includes('3D') ||
    styles.viewMode ||
    styles.placketButton ||
    styles.cuffButton
  );
}

/** Returns URL to navigate for restoring a design (2D or 3D). */
export function getRestoreUrl(design: SavedDesignLike, productIdFallback?: string): string {
  const designId = design._id ?? design.id ?? '';
  const productId = design.productId ?? productIdFallback ?? 'shirt';

  if (isDesign3D(design)) {
    return `${ROUTES.CUSTOMIZE_3D('shirt')}?restore=${designId}`;
  }
  return `${ROUTES.CUSTOMIZE(productId)}?restore=${designId}`;
}
