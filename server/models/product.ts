import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true, trim: true },
  /** 2D or 3D - controls whether 3D customizer badge shows on product cards */
  categoryType: {
    type: String,
    enum: ['2d', '3d'],
    default: '2d',
  },
  category: {
    type: String,
    required: true,
    enum: [
      'shirt', 'suit', 'pants', 'jacket', 'vest', 'blazer', 'jeans', 'chinos',
      'tuxedo', 'coat', 'polo', 'dress-shoes', 'sneakers'
    ],
    default: 'shirt',
  },
  basePrice: { type: Number, required: true, default: 0 },
  images: {
    baseImage: { type: String },
    backImage: { type: String },
    thumbnailImage: { type: String },
    gallery: [{ type: String }],
    cardHoverGallery: [{ type: String }],
    fabricImages: [{ fabricId: String, imageUrl: String }],
    /** Pre-made fabric preview thumbnails shown on product detail / customizer landing. Admin uploads per product. */
    fabricPreviewThumbnails: [{ type: String }],
    /** URL to a video file demonstrating the product (e.g. model walking). Handled in Phase 57+. */
    videoUrl: { type: String },
  },
  modelUrl: { type: String },
  environmentMapUrl: { type: String },
  /** 3D product only: fabric IDs assigned to this product. Empty = use all fabrics (backward compat). */
  fabricIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Fabric' }],
  customizationOptions: {
    fabrics: [{
      id: String,
      name: String,
      color: String,
      colors: [{ type: String }],
      pattern: String,
      imageUrl: String,
      previewImage: String,
      backPreviewImage: String,
      priceModifier: { type: Number, default: 0 },
      order: { type: Number, default: 0 },
      isDefault: { type: Boolean, default: false },
      tags: [{ type: String }],
      layersByFabric: { type: mongoose.Schema.Types.Mixed },
      layersByView: { type: mongoose.Schema.Types.Mixed },
    }],
    styles: { type: mongoose.Schema.Types.Mixed, default: {} },
    optionGroups: [{
      id: String,
      label: String,
      category: String,
      variantType: { type: String, enum: ['fabric', 'front-back', 'front-only', 'back-only'], default: 'fabric' },
      order: { type: Number, default: 0 },
      options: [{
        id: String,
        name: String,
        category: String,
        image: String,
        previewImage: String,
        fabricPreviewImages: { type: mongoose.Schema.Types.Mixed },
        backHalfFabricPreviewImages: { type: mongoose.Schema.Types.Mixed },
        backFullFabricPreviewImages: { type: mongoose.Schema.Types.Mixed },
        priceModifier: { type: Number, default: 0 },
        order: { type: Number, default: 0 },
        isDefault: { type: Boolean, default: false },
        tags: [{ type: String }],
        layersByFabric: { type: mongoose.Schema.Types.Mixed },
        layersByView: { type: mongoose.Schema.Types.Mixed },
      }],
    }],
    colors: [{ id: String, name: String, hexCode: String }],
  },
  isActive: { type: Boolean, default: true },
  /** Hero slider: include this product on homepage hero carousel */
  showInHeroSlider: { type: Boolean, default: false },
  /** Hero slider: sort order (lower = first). Used when showInHeroSlider is true. */
  heroSliderOrder: { type: Number, default: 0 },
  /** Hero slider: how many times to show this product (1-5). Default 1. */
  heroSliderCount: { type: Number, default: 1, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-generate SEO slug from product name if not explicitly provided.
// Uses pre('validate') so it fires BEFORE unique index checks,
// ensuring every entry point (seeder, controller, admin CRUD) gets a slug.
productSchema.pre('validate', function () {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

productSchema.pre('save', function () {
  this.updatedAt = new Date();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
