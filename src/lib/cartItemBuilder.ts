// Single source for cart item shape. Used by Customize (2D), Customize3D (3D).
// Change once, reflects everywhere. Future: add paymentIntentId for online payment.
import type { CartItem } from '@/context/CartContext';
import { mapConfigToStyles } from '@/lib/mapConfigToStyles';
import { getImageUrl } from '@/utils/imageHelper';
import { getTextureUrl } from '@/services/fabricService';

export type CartItemInput = Omit<CartItem, 'id' | 'addedAt' | 'quantity'>;

interface ProductBase {
  _id: string;
  name: string;
  category: string;
  basePrice: number;
  images?: { baseImage?: string; backImage?: string; thumbnailImage?: string };
}

interface Config2D {
  fabric?: { id: string; name: string; image?: string; priceModifier?: number } | null;
  collar?: { id: string; name: string };
  cuff?: { id: string; name: string };
  pocket?: { id: string; name: string };
  button?: { id: string; name: string };
  sleeve?: { id: string; name: string };
  back?: { id: string; name: string };
  necktie?: { id: string; name: string };
  bowtie?: { id: string; name: string };
  styles?: Record<string, { id: string; name: string; priceModifier?: number }>;
  measurements?: Record<string, string>;
}

export function buildCartItem2D(params: {
  product: ProductBase;
  config: Config2D;
  totalPrice: number;
  screenshot?: string;
  configForPreview?: unknown;
}): CartItemInput {
  const { product, config, totalPrice, screenshot = '', configForPreview } = params;
  const styles = mapConfigToStyles(config as Parameters<typeof mapConfigToStyles>[0]);

  return {
    productId: product._id,
    productName: product.name,
    productCategory: product.category,
    baseImage: getImageUrl(product.images?.baseImage) || `/images/placeholders/${product.category}.svg`,
    fabric: config.fabric
      ? {
          id: config.fabric.id,
          name: config.fabric.name,
          priceModifier: config.fabric.priceModifier ?? 0,
        }
      : null,
    styles,
    measurements: config.measurements ?? {},
    basePrice: product.basePrice,
    totalPrice,
    screenshot,
    ...(configForPreview !== undefined && { config: configForPreview }),
  };
}

interface Fabric3D {
  _id: string;
  name: string;
  price: number;
  colorMapUrl?: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
}

interface Styles3D {
  collar: { id: string; name: string };
  cuff: { id: string; name: string };
  pocket: { id: string; name: string };
  placket: { id: string; name: string };
  collarButton: { id: string; name: string };
  placketButton: { id: string; name: string };
  cuffButton: { id: string; name: string };
  collarFabric?: { id: string; name: string };
  cuffFabric?: { id: string; name: string };
  placketFabric?: { id: string; name: string };
  pocketFabric?: { id: string; name: string };
  collarEdgeColor?: string;
  collarStitchColor?: string;
  cuffEdgeColor?: string;
  cuffStitchColor?: string;
  placketEdgeColor?: string;
  placketStitchColor?: string;
  pocketEdgeColor?: string;
  pocketStitchColor?: string;
  monogramText?: string;
  monogramFont?: string;
  monogramColor?: string;
  monogramPosition?: string;
}

export function buildCartItem3D(params: {
  productId: string;
  productType: string;
  fabric: Fabric3D;
  styles: Styles3D;
  measurements: Record<string, string>;
  screenshot?: string;
  includeTextureUrls?: boolean;
}): CartItemInput {
  const {
    productId,
    productType,
    fabric,
    styles,
    measurements,
    screenshot = '',
    includeTextureUrls = false,
  } = params;

  const productName =
    productType === 'shirt'
      ? 'Custom Shirt'
      : productType === 'pants'
        ? 'Custom Pants'
        : 'Custom Product';
  const baseImage = getTextureUrl(fabric.colorMapUrl) ?? '';

  const fabricPayload = includeTextureUrls
    ? {
        id: fabric._id,
        name: fabric.name,
        priceModifier: 0,
        image: fabric.colorMapUrl,
        colorMapUrl: fabric.colorMapUrl,
        normalMapUrl: fabric.normalMapUrl,
        roughnessMapUrl: fabric.roughnessMapUrl,
      }
    : {
        id: fabric._id,
        name: fabric.name,
        priceModifier: 0,
      };

  const stylesPayload: Record<string, { id: string; name: string; priceModifier: number } | string> = {
    collar: { id: styles.collar.id, name: styles.collar.name, priceModifier: 0 },
    cuff: { id: styles.cuff.id, name: styles.cuff.name, priceModifier: 0 },
    pocket: { id: styles.pocket.id, name: styles.pocket.name, priceModifier: 0 },
    placket: { id: styles.placket.id, name: styles.placket.name, priceModifier: 0 },
    collarButton: { id: styles.collarButton.id, name: styles.collarButton.name, priceModifier: 0 },
    placketButton: { id: styles.placketButton.id, name: styles.placketButton.name, priceModifier: 0 },
    cuffButton: { id: styles.cuffButton.id, name: styles.cuffButton.name, priceModifier: 0 },
  };
  if (styles.collarFabric) stylesPayload.collarFabric = { id: styles.collarFabric.id, name: styles.collarFabric.name, priceModifier: 0 };
  if (styles.cuffFabric) stylesPayload.cuffFabric = { id: styles.cuffFabric.id, name: styles.cuffFabric.name, priceModifier: 0 };
  if (styles.placketFabric) stylesPayload.placketFabric = { id: styles.placketFabric.id, name: styles.placketFabric.name, priceModifier: 0 };
  if (styles.pocketFabric) stylesPayload.pocketFabric = { id: styles.pocketFabric.id, name: styles.pocketFabric.name, priceModifier: 0 };
  if (styles.monogramText) {
    stylesPayload.monogramText = styles.monogramText;
    stylesPayload.monogramFont = styles.monogramFont || 'serif';
    stylesPayload.monogramColor = styles.monogramColor || '#1e3a8a';
    stylesPayload.monogramPosition = styles.monogramPosition || 'loc_monogram_chest_left';
  }

  return {
    productId: productId || 'custom-shirt-3d',
    productName: `${productName} (3D Design)`,
    productCategory: productType,
    baseImage,
    fabric: fabricPayload,
    styles: stylesPayload,
    measurements,
    basePrice: fabric.price,
    totalPrice: fabric.price,
    screenshot,
  };
}

export function buildCartItem3DWithScreenshot(
  params: Parameters<typeof buildCartItem3D>[0] & { is3D?: boolean }
): CartItemInput & { is3D?: boolean } {
  const { is3D = true, ...rest } = params;
  return { ...buildCartItem3D(rest), is3D };
}
