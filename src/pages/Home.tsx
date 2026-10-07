import { useEffect, useMemo, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { ArrowRight, Sparkles, Ruler, Palette, Clock, Shield, ChevronRight, ChevronLeft, Box, RotateCcw, ZoomIn } from 'lucide-react';
import { productService } from '@/services/products';
import { Product } from '@/types/product';
import { formatPrice } from '@/lib/formatPrice';
import { apiClient } from '@/lib/apiClient';
import { getProductImageUrl } from '@/utils/imageHelper';
import { getFabricThumbnailUrl } from '@/services/fabricService';
import { getProductPlaceholder } from '@/lib/placeholders';
import ShopByFabric from '@/components/home/ShopByFabric';
import { ProductCard } from '@/components/common/ProductCard';
import { settingsService, SiteSettings } from '@/services/settingsService';

const PRODUCT_SLUGS_3D_SHIRT = ['3d-shirt', '3d-shirt-customizer'];

function CategoryCard({ category, shopCardWidth, gapPx }: { category: any; shopCardWidth: number; gapPx: number; }) {
  const [activeFabricId, setActiveFabricId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  const galleryImages = useMemo(() => {
    // 1. Fabric Preference
    if (activeFabricId && category.item?.images?.galleryByFabric?.[activeFabricId]) {
      return category.item.images.galleryByFabric[activeFabricId].map((img: string) => getProductImageUrl(img, category.item.category)).filter(Boolean);
    }

    // 2. Selective Card Hover View (Matches ProductCard logic)
    if (!activeFabricId && (category.item?.images?.cardHoverGallery?.length || 0) > 0) {
      return (category.item.images.cardHoverGallery || []).map((img: string) => getProductImageUrl(img, category.item.category)).filter(Boolean);
    }

    // 3. Default Fallback: Base Image + Gallery
    const refs: string[] = [];
    if (category.item?.images?.baseImage) refs.push(category.item.images.baseImage);
    if (category.item?.images?.gallery) {
      category.item.images.gallery.forEach((img: string) => {
        if (img && !refs.includes(img)) refs.push(img);
      });
    }

    const resolved = refs.map((img: string) => getProductImageUrl(img, category.item.category)).filter(Boolean);
    return resolved.length > 0 ? resolved : [category.image];
  }, [category, activeFabricId]);

  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Immediate cleanup of existing timers on dependency change
    if (slideshowTimerRef.current) clearTimeout(slideshowTimerRef.current);
    if (cycleTimerRef.current) clearInterval(cycleTimerRef.current);

    if (!isHovered || galleryImages.length <= 1) {
      setCurrentImgIdx(0);
      return;
    }

    // Delay slideshow until zoom transition is well underway
    slideshowTimerRef.current = setTimeout(() => {
      // Trigger first advance immediately after 200ms delay
      setCurrentImgIdx(1 % galleryImages.length);

      cycleTimerRef.current = setInterval(() => {
        setCurrentImgIdx(prev => (prev + 1) % galleryImages.length);
      }, 1200);
    }, 200);

    return () => {
      if (slideshowTimerRef.current) clearTimeout(slideshowTimerRef.current);
      if (cycleTimerRef.current) clearInterval(cycleTimerRef.current);
      setCurrentImgIdx(0);
    };
  }, [isHovered, galleryImages.length]);

  return (
    <Link
      to={category.path}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setActiveFabricId(null); }}
      onTouchStart={(e) => {
        if (!isHovered) {
          e.preventDefault();
          setIsHovered(true);
        }
      }}
      className={`group relative flex-shrink-0 rounded-3xl overflow-hidden bg-white border border-accent/10 shadow-soft hover:shadow-float transition-all duration-500 hover:-translate-y-2 isolate transform-gpu`}
      style={shopCardWidth > 0 ? { width: shopCardWidth } : { minWidth: 'calc((100%-3rem)/3)' }}
    >
      <div className="aspect-[4/5] bg-gradient-to-br from-muted/50 to-muted/30 relative overflow-hidden isolate transform-gpu">
        {galleryImages.map((src: string, idx: number) => (
          <div
            key={`${src}-${idx}`}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${galleryImages.length > 1
              ? (idx === currentImgIdx ? 'opacity-100' : 'opacity-0')
              : 'opacity-100'
              }`}
          >
            <div className={`w-full h-full transition-transform duration-1000 cubic-bezier(0.4, 0, 0.2, 1) transform-gpu ${isHovered ? 'scale-105' : 'scale-100'}`}>
              <OptimizedImage
                src={src}
                alt={`${category.name} view ${idx + 1}`}
                className="w-full h-full object-cover cursor-pointer drop-shadow-sm group-hover:drop-shadow-md transition-all duration-1000"
              />
            </div>
          </div>
        ))}

        {/* Fabric Swatches */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 bg-white/60 backdrop-blur-md rounded-full border border-white/40 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-10">
          {category.item?.images?.galleryByFabric && category.item?.customizationOptions?.fabrics && (
            category.item.customizationOptions.fabrics
              .filter((f: any) => category.item.images?.galleryByFabric?.[f.id])
              .slice(0, 5)
              .map((fabric: any) => (
                <button
                  key={fabric.id}
                  type="button"
                  onMouseEnter={(e) => { e.preventDefault(); e.stopPropagation(); setActiveFabricId(fabric.id); }}
                  className={`w-4 h-4 rounded-full border transition-all ${activeFabricId === fabric.id ? 'border-primary ring-1 ring-primary/30 scale-110' : 'border-white hover:scale-105'}`}
                  style={{
                    backgroundColor: fabric.color || '#fff',
                    backgroundImage: fabric.imageUrl ? `url(${fabric.imageUrl})` : 'none',
                    backgroundSize: 'cover'
                  }}
                />
              ))
          )}
        </div>

        {category.is3D && (
          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-gradient-luxury text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg z-10">
            <Box className="w-3.5 h-3.5" />
            3D Customizer
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      <div className="p-6 flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
            {category.name}
          </h3>
          <p className="text-sm text-muted-foreground">{category.price}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [product3DShirt, setProduct3DShirt] = useState<{ _id?: string; slug?: string; images?: { fabricPreviewThumbnails?: string[] } } | null>(null);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [exp3DSlide, setExp3DSlide] = useState(0);
  const [exp3DHovered, setExp3DHovered] = useState(false);
  const [shopCategorySlide, setShopCategorySlide] = useState(0);
  const [shopCategoryHovered, setShopCategoryHovered] = useState(false);
  const [internalImgIdx, setInternalImgIdx] = useState(0);

  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  // Hero carousel: products with showInHeroSlider, sorted by heroSliderOrder, expanded by heroSliderCount
  const carouselItems = useMemo(() => {
    const heroProducts = products.filter((p: Product) => p.showInHeroSlider);
    const source = heroProducts.length > 0 ? heroProducts : products;
    const sorted = [...source].sort((a, b) => (a.heroSliderOrder ?? 0) - (b.heroSliderOrder ?? 0));
    const expanded: typeof sorted = [];
    for (const p of sorted) {
      const count = Math.min(5, Math.max(1, p.heroSliderCount ?? 1));
      for (let i = 0; i < count; i++) expanded.push(p);
    }
    return expanded.map(p => {
      const is3D = p.categoryType === '3d';
      const image = p.images?.baseImage || p.images?.fabricPreviewThumbnails?.[0];

      let internalGallery: string[] = [];

      // Selective Card Hover View: Use cardHoverGallery if explicitly selected images exist
      if ((p.images?.cardHoverGallery?.length || 0) > 0) {
        internalGallery = p.images?.cardHoverGallery || [];
      } else {
        // Fallback to General View: Base Image + Gallery
        if (p.images?.baseImage) internalGallery.push(p.images.baseImage);
        if (p.images?.gallery) {
          p.images.gallery.forEach(img => {
            if (img && !internalGallery.includes(img)) internalGallery.push(img);
          });
        }
      }

      const resolvedGallery = internalGallery.map(img => getProductImageUrl(img, p.category)).filter(Boolean);

      return {
        ...p, // Spread full product data
        image: getProductImageUrl(image, p.category),
        internalGallery: resolvedGallery.length > 0 ? resolvedGallery : [getProductImageUrl(image, p.category)],
        link: is3D ? '/3d-customizer' : `/products/${p.slug || p._id}`,
        is3D
      };
    });
  }, [products]);

  useEffect(() => {
    productService.getAll()
      .then(data => {
        const safeData = data || [];
        setProducts(safeData);
        // Find 3D shirt from the full list instead of making extra 404-prone calls
        const p3d = safeData.find((p: Product) => p.categoryType === '3d' || p.slug === '3d-shirt');
        if (p3d) setProduct3DShirt(p3d);
      })
      .catch((err) => {
        console.error(err);
        setFetchError(err.message || "Failed to connect to the server. Please check your internet connection.");
      });

    apiClient.get<any[]>('/fabrics')
      .then(data => setFabrics(data || []))
      .catch(console.error);

    settingsService.getSettings()
      .then(data => setSiteSettings(data))
      .catch(console.error);
  }, []);

  // When product slide changes, reset internal image index
  useEffect(() => {
    setInternalImgIdx(0);
  }, [currentSlide]);

  const heroSlideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heroCycleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Internal Hero cycle when hovered
  useEffect(() => {
    if (heroSlideshowTimerRef.current) clearTimeout(heroSlideshowTimerRef.current);
    if (heroCycleTimerRef.current) clearInterval(heroCycleTimerRef.current);

    if (!isHovered || carouselItems.length === 0) {
      setInternalImgIdx(0);
      return;
    }

    const currentProduct = carouselItems[currentSlide];
    const galleryLength = currentProduct.internalGallery?.length || 0;

    if (galleryLength <= 1) return;

    heroSlideshowTimerRef.current = setTimeout(() => {
      // Trigger first advance immediately after 600ms delay
      setInternalImgIdx(1 % galleryLength);

      heroCycleTimerRef.current = setInterval(() => {
        setInternalImgIdx(prev => (prev + 1) % galleryLength);
      }, 1200);
    }, 800);

    return () => {
      if (heroSlideshowTimerRef.current) clearTimeout(heroSlideshowTimerRef.current);
      if (heroCycleTimerRef.current) clearInterval(heroCycleTimerRef.current);
      setInternalImgIdx(0);
    };
  }, [isHovered, currentSlide, carouselItems]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [carouselItems.length]);

  useEffect(() => {
    const totalItems = carouselItems.length;
    if (totalItems <= 1) return;
    if (isHovered) return; // Pause when hovered
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalItems);
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselItems.length, isHovered]);

  const exp3DThumbnails = product3DShirt?.images?.fabricPreviewThumbnails || [];
  const exp3DFabric = fabrics.find(f => f.is3DPreview) || fabrics[0];
  const exp3DFabricSrc = exp3DFabric ? (getFabricThumbnailUrl(exp3DFabric) || exp3DFabric.thumbnailUrl || exp3DFabric.colorMapUrl) : undefined;
  const exp3DItems = exp3DThumbnails.length > 0 ? exp3DThumbnails : (exp3DFabricSrc ? [exp3DFabricSrc] : [getProductPlaceholder('shirt')]);
  const exp3DTotal = exp3DItems.length;
  const exp3DNext = () => exp3DTotal > 1 && setExp3DSlide((p) => (p + 1) % exp3DTotal);
  const exp3DPrev = () => exp3DTotal > 1 && setExp3DSlide((p) => (p - 1 + exp3DTotal) % exp3DTotal);

  useEffect(() => {
    if (exp3DTotal <= 1 || exp3DHovered) return;
    const t = setInterval(() => setExp3DSlide((p) => (p + 1) % exp3DTotal), 4000);
    return () => clearInterval(t);
  }, [exp3DTotal, exp3DHovered]);

  // Shop by Category: 2D categories (one card per category) + 3D products (one card per product with badge)
  const shopCategories = useMemo(() => {
    const items: Array<{ id: string; item: any; name: string; price: string; image: string; path: string; is3D: boolean }> = [];
    const categoryLabels: Record<string, string> = { shirt: 'Custom Shirts', pants: 'Custom Pants', blazer: 'Custom Blazers', suit: 'Custom Suits' };

    // 2D categories - one card per unique category
    const seen2D = new Set<string>();
    for (const p of products) {
      if (p.categoryType === '3d') continue;
      if (seen2D.has(p.category)) continue;
      seen2D.add(p.category);

      // Use the first image from cardHoverGallery if it exists, otherwise baseImage
      const img = (p.images?.cardHoverGallery && p.images.cardHoverGallery.length > 0)
        ? p.images.cardHoverGallery[0]
        : (p.images?.baseImage || p.images?.fabricPreviewThumbnails?.[0]);

      items.push({
        id: `2d-${p.category}`,
        item: { ...p, is3D: false }, // Store full product
        name: categoryLabels[p.category] || `Custom ${p.category}`,
        price: `From ${formatPrice(p.basePrice)}`,
        image: getProductImageUrl(img, p.category),
        path: `/products?category=${p.category}`,
        is3D: false
      });
    }

    // 3D products - one card per product with "3D Customizer" badge + product name at bottom
    for (const p of products) {
      if (p.categoryType !== '3d') continue;

      // Use the first image from cardHoverGallery if it exists, otherwise baseImage
      const img = (p.images?.cardHoverGallery && p.images.cardHoverGallery.length > 0)
        ? p.images.cardHoverGallery[0]
        : (p.images?.baseImage || p.images?.fabricPreviewThumbnails?.[0]);

      items.push({
        id: p._id,
        item: { ...p, is3D: true }, // Store full product
        name: p.name,
        price: 'Interactive Design',
        image: getProductImageUrl(img, p.category),
        path: '/3d-customizer',
        is3D: true
      });
    }
    return items;
  }, [products]);

  const shopTotal = shopCategories.length;
  const shopContainerRef = useRef<HTMLDivElement>(null);
  const [shopContainerWidth, setShopContainerWidth] = useState(0);
  const [shopNoTransition, setShopNoTransition] = useState(false);
  const shopSlideRef = useRef(shopCategorySlide);
  shopSlideRef.current = shopCategorySlide;

  useLayoutEffect(() => {
    const el = shopContainerRef.current;
    if (!el) return;
    const update = () => setShopContainerWidth(el.offsetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const gapPx = 24;
  const safeWidth = Math.max(0, shopContainerWidth - 32); // Account for shadow bleed buffer (px-4 = 16px per side)
  const shopVisibleCount = safeWidth < 640 ? 1 : safeWidth < 1024 ? 2 : 3;
  const shopItemsForCarousel = shopTotal > shopVisibleCount
    ? [...shopCategories, ...shopCategories.slice(0, shopVisibleCount)]
    : shopCategories;
  const shopCarouselTotal = shopItemsForCarousel.length;
  const shopCardWidth = safeWidth > 0
    ? (safeWidth - (shopVisibleCount - 1) * gapPx) / shopVisibleCount
    : 0;
  const shopTrackWidth = shopCarouselTotal * shopCardWidth + (shopCarouselTotal - 1) * gapPx;

  const handleShopTransitionEnd = useCallback(() => {
    if (shopSlideRef.current >= shopTotal) {
      setShopNoTransition(true);
      setShopCategorySlide(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShopNoTransition(false));
      });
    }
  }, [shopTotal]);

  useEffect(() => {
    if (shopTotal <= shopVisibleCount || shopCategoryHovered) return;
    const t = setInterval(() => setShopCategorySlide((p) => p + 1), 3500);
    return () => clearInterval(t);
  }, [shopTotal, shopCategoryHovered]);

  const features = [
    { icon: Palette, title: 'Premium Fabrics', desc: 'Curated selection from the finest mills worldwide' },
    { icon: Ruler, title: 'Perfect Fit', desc: 'Made-to-measure precision for every body type' },
    { icon: Clock, title: 'Quick Delivery', desc: '2-3 weeks turnaround on all custom orders' },
    { icon: Shield, title: 'Quality Assured', desc: 'Handcrafted by master tailors with 20+ years experience' },
  ];

  const currentItem = carouselItems[currentSlide];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);

  return (
    <SiteLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background -mt-20 pt-20">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-primary/5 rounded-full blur-3xl opacity-50 sm:opacity-100" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-accent/10 rounded-full blur-3xl opacity-50 sm:opacity-100" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center lg:items-stretch xl:items-center">
            {/* <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10 lg:py-16"> */}
            {/* <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center"></div> */}
            {/* Left Content */}
            <div className="lg:col-span-6 flex flex-col lg:justify-between xl:justify-start lg:h-full xl:h-auto space-y-10 text-center lg:text-left py-4 transition-all duration-500">
              <div className="space-y-6 lg:space-y-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold text-accent">Premium Bespoke Tailoring</span>
                </div>

                {/* Heading */}
                <div className="space-y-4 sm:space-y-6 text-center lg:text-left">
                  <h1 className="font-display text-5xl sm:text-7xl lg:text-7xl xl:text-8xl font-semibold text-foreground leading-[1.05] tracking-tight transition-all duration-500">
                    Tailored to
                    <span className="block text-gradient-gold">Perfection</span>
                  </h1>
                  <p className="text-base sm:text-lg lg:text-lg xl:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium transition-all duration-500">
                    Experience the art of bespoke tailoring. Design custom suits, shirts, and trousers
                    crafted exclusively for you.
                  </p>
                </div>

                {/* Main CTA Group */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                  {currentItem && (
                    <>
                      <Link
                        to={currentItem.link}
                        className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-bold shadow-elevated hover:shadow-float transition-all duration-500 hover:-translate-y-1 w-full sm:w-auto text-base"
                      >
                        {currentItem.is3D ? 'Start Designing' : 'Explore Design'}
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                      <Link
                        to="/products"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/80 backdrop-blur-sm border-2 border-border/50 rounded-full font-bold text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 w-full sm:w-auto text-base"
                      >
                        All Collection
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-x-8 lg:gap-x-12 gap-y-6 pt-6 lg:pt-10 xl:pt-10 justify-center lg:justify-start transition-all duration-500">
                {[
                  { value: '500+', label: 'Happy Clients' },
                  { value: '15+', label: 'Years Exp.' },
                  { value: '100%', label: 'Satisfaction' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center lg:text-left">
                    <p className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-none">{stat.value}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Product Carousel */}
            <div
              className="lg:col-span-6 relative w-full h-full max-w-sm md:max-w-xl lg:max-w-xl xl:max-w-2xl xl:max-h-none mx-auto lg:ml-auto cursor-pointer"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onTouchStart={(e) => {
                if (!isHovered) {
                  e.preventDefault();
                  setIsHovered(true);
                }
              }}
            >
              <div className="relative lg:h-full flex flex-col bg-white rounded-[2rem] p-3 sm:p-5 shadow-float border border-primary/20">
                {/* Carousel */}
                <div className="relative aspect-[4/5] lg:aspect-auto lg:flex-1 rounded-[1.5rem] xl:aspect-square bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden">
                  {carouselItems.length > 0 ? (
                    <>
                      {carouselItems.map((item, index) => {
                        // Calculate relative position for continuous right-to-left animation
                        const isActive = index === currentSlide;
                        const isPrev = (currentSlide === 0 && index === carouselItems.length - 1) ||
                          (currentSlide > 0 && index === currentSlide - 1);

                        return (
                          <Link
                            key={`${item._id}-${index}`}
                            to={item.link}
                            className={`absolute inset-0 transition-all duration-700 ease-in-out ${isActive
                              ? 'opacity-100 translate-x-0 z-10'
                              : isPrev
                                ? 'opacity-0 -translate-x-full z-0'
                                : 'opacity-0 translate-x-full z-0'
                              }`}
                          >
                            {/* All items show image, 3D tile has overlay badge */}
                            <div className="w-full h-full relative overflow-hidden isolate transform-gpu">
                              {/* Base Image */}
                              <img
                                src={item.image}
                                alt={item.name}
                                className={`w-full h-full object-contain transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) transform-gpu ${isHovered && isActive && item.internalGallery.length > 0 ? 'opacity-0 scale-105' : 'opacity-100 scale-100'} ${isHovered && isActive ? 'drop-shadow-md' : 'drop-shadow-sm'}`}
                              />

                              {/* Internal Gallery (Crossfading) */}
                              {item.internalGallery.map((src: string, idx: number) => (
                                <div
                                  key={`${src}-${idx}`}
                                  className={`absolute inset-0 transition-opacity duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${(isActive && isHovered && (idx === (internalImgIdx % item.internalGallery.length)))
                                    ? 'opacity-100' : 'opacity-0'
                                    }`}
                                >
                                  <img
                                    src={src}
                                    alt={`${item.name} view ${idx + 1}`}
                                    className={`w-full h-full object-cover transition-transform duration-1000 cubic-bezier(0.4, 0, 0.2, 1) transform-gpu ${(isActive && isHovered) ? 'scale-105' : 'scale-100'}`}
                                  />
                                </div>
                              ))}
                              {item.is3D && (
                                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-gradient-luxury text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                                  <Box className="w-3.5 h-3.5" />
                                  3D Customizer
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}

                      {/* Navigation Arrows */}
                      <button
                        onClick={(e) => { e.preventDefault(); prevSlide(); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-soft flex items-center justify-center hover:bg-accent/30 transition-all z-10"
                      >
                        <ChevronLeft className="w-5 h-5 text-foreground" />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); nextSlide(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-soft flex items-center justify-center hover:bg-accent/30 transition-all z-10"
                      >
                        <ChevronRight className="w-5 h-5 text-foreground" />
                      </button>

                      {/* Dots */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        {carouselItems.map((_, index) => (
                          <button
                            key={index}
                            onClick={(e) => { e.preventDefault(); setCurrentSlide(index); }}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentSlide ? 'w-6 bg-primary' : 'bg-primary/30'
                              }`}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center space-y-4 px-4">
                        {fetchError ? (
                          <>
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
                              <Shield className="w-8 h-8 text-red-500" />
                            </div>
                            <p className="text-sm font-medium text-red-500">{fetchError}</p>
                            <button onClick={() => window.location.reload()} className="text-xs text-primary underline mt-2">Tap to Retry</button>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow">
                              <Sparkles className="w-8 h-8 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Loading Products...</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Info - Alignment Polish */}
                <div className="mt-6 flex items-start justify-between min-h-[70px]">
                  {currentItem ? (
                    <div className="flex items-start justify-between w-full">
                      <div className="space-y-1">
                        <p className="text-[10px] text-accent uppercase tracking-widest font-bold">Now Viewing</p>
                        <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground leading-tight tracking-tight">{currentItem.name}</h3>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] text-accent font-medium uppercase italic">starting from</p>
                        <p className="font-display text-lg sm:text-lg font-semibold text-foreground drop-shadow-sm tracking-tighter">
                          {formatPrice(currentItem.basePrice).split(' ')[0]} <span className="text-lg sm:text-lg">{formatPrice(currentItem.basePrice).split(' ')[1]}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center py-2">
                      <p className="text-sm text-muted-foreground animate-pulse">Synchronizing...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">Why Choose Us</p>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold text-foreground">
              The Tailor Fit Difference
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 bg-primary/[0.03] rounded-2xl border border-accent/20 hover:shadow-elevated hover:-translate-y-1 transition-all duration-500"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-500">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Fabric Section */}
      <ShopByFabric products={products} fabrics={fabrics} />

      {/* Categories Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8 pb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">Our Collection</p>
              <h2 className="font-display text-4xl sm:text-5xl font-semibold text-foreground">
                Shop by Category
              </h2>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all duration-300"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div
            ref={shopContainerRef}
            className="relative pt-12 pb-4 -my-12 px-4 -mx-4 overflow-hidden"
            onMouseEnter={() => setShopCategoryHovered(true)}
            onMouseLeave={() => setShopCategoryHovered(false)}
          >
            {shopCategories.length > 0 ? (
              <div className={`w-full ${shopTotal <= shopVisibleCount ? 'flex justify-center' : ''}`}>
                <div
                  className={`flex flex-nowrap ${shopNoTransition ? '' : 'transition-transform duration-500 ease-in-out'}`}
                  // [Visual Context] "Shop by Category" Carousel Track on the Homepage
                  // [Action] Dynamic width and translation logic for the horizontal scroller
                  // [Purpose] Supports infinite-looking carousel and auto-centering if items are fewer than the container width
                  style={{
                    width: shopTrackWidth,
                    justifyContent: shopTotal <= shopVisibleCount ? 'center' : 'flex-start',
                    gap: gapPx,
                    transform: shopCarouselTotal > shopVisibleCount && shopCardWidth > 0
                      ? `translateX(-${shopCategorySlide * (shopCardWidth + gapPx)}px)`
                      : 'translateX(0)'
                  }}
                  onTransitionEnd={handleShopTransitionEnd}
                >
                  {shopItemsForCarousel.map((category, idx) => (
                    <CategoryCard
                      key={`${category.id}-${idx}`}
                      category={category}
                      shopCardWidth={shopCardWidth}
                      gapPx={gapPx}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 rounded-3xl bg-muted/30 border border-border/50">
                <p className="text-muted-foreground">No categories yet. Add products in Admin.</p>
                <Link to="/admin" className="inline-flex items-center gap-2 mt-4 text-primary font-semibold hover:gap-3 transition-all">
                  Go to Admin <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          {/* [Visual Context] Bottom Call-To-Action (CTA) section on Homepage */}
          {/* [Action] Fixed-height container with background video and centered content overlay */}
          {/* [Purpose] Creates a high-impact, premium visual transition before the footer; object-top ensures model focus is preserved */}
          <div className="relative rounded-3xl overflow-hidden bg-black p-12 lg:p-20 shadow-2xl h-[500px] sm:h-[600px] flex items-center justify-center">
            {/* Video Background */}
            <video
              key={siteSettings?.homepageCtaVideoUrl || 'default'}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover object-top z-0 opacity-80"
            >
              <source src={siteSettings?.homepageCtaVideoUrl || "/videos/homepage_model.mp4"} type="video/mp4" />
            </video>

            {/* Dark/Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-primary/60 to-black/40 z-0" />

            {/* Decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl z-0" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/20 rounded-full blur-2xl z-0" />

            <div className="relative z-10 max-w-2xl mx-auto text-center">
              <Sparkles className="w-12 h-12 text-accent mx-auto mb-6" />
              <h2 className="font-display text-4xl sm:text-5xl font-semibold text-white mb-6">
                Ready to Create Something Exceptional?
              </h2>
              <p className="text-lg text-white/70 mb-8">
                Begin your bespoke journey today. Our expert tailors are ready to bring your vision to life.
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-primary rounded-full font-semibold shadow-glow hover:scale-105 transition-all duration-300"
              >
                Explore Products
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout >
  );
}
