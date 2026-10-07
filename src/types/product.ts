export type CustomizationOption = {
  id: string;
  name: string;
  category?: string;
  image?: string;
  imageUrl?: string;
  previewImage?: string;
  layersByFabric?: Record<string, string>;
  layersByView?: Record<string, string>;
  priceModifier?: number;
  order?: number;
  isDefault?: boolean;
  tags?: string[];
};

export type FabricOption = {
  id: string;
  name: string;
  category?: string;
  color?: string;
  colors?: string[]; // Add colors array
  pattern?: string;
  image?: string;    // Add image property
  imageUrl?: string;
  previewImage?: string;
  backPreviewImage?: string;
  layersByFabric?: Record<string, string>;
  layersByView?: Record<string, string>;
  priceModifier?: number;
  order?: number;
  isDefault?: boolean;
  tags?: string[];
};

export type Product = {
  _id: string;
  slug?: string;
  name: string;
  description: string;
  /** 2D or 3D - controls 3D customizer badge visibility */
  categoryType?: '2d' | '3d';
  category:
  | 'suit'
  | 'shirt'
  | 'pants'
  | 'jacket'
  | 'vest'
  | 'blazer'
  | 'jeans'
  | 'chinos'
  | 'tuxedo'
  | 'coat'
  | 'polo'
  | 'dress-shoes'
  | 'sneakers';
  basePrice: number;
  images?: {
    baseImage?: string;
    backImage?: string;
    thumbnailImage?: string;
    gallery?: string[];
    /** Selected gallery images to show in card hover slider */
    cardHoverGallery?: string[];
    /** Categorized gallery images per fabric ID */
    galleryByFabric?: Record<string, string[]>;
    /** Pre-made fabric preview thumbnails shown before customization. Admin uploads per product. */
    fabricPreviewThumbnails?: string[];
    /** URL to a video file demonstrating the product (e.g. model walking). Handled in Phase 57+. */
    videoUrl?: string;
  };
  customizationOptions?: {
    fabrics?: FabricOption[];
    styles?: Record<string, CustomizationOption[]>;
    optionGroups?: {
      id: string;
      label: string;
      category: string;
      order?: number;
      options: CustomizationOption[];
    }[];
  };
  /** 3D product only: model and environment URLs */
  modelUrl?: string;
  environmentMapUrl?: string;
  /** 3D product only: fabric IDs assigned to this product. Empty = use all fabrics. */
  fabricIds?: string[];
  /** Hero slider: include on homepage hero carousel */
  showInHeroSlider?: boolean;
  /** Hero slider: sort order (lower = first) */
  heroSliderOrder?: number;
  /** Hero slider: how many times to show (1-5) */
  heroSliderCount?: number;
};
