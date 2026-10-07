import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { getProductById } from '@/services/products';
import { Product } from '@/types/product';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Palette, Ruler, Shield, Sparkles, Star, Clock } from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import { FabricPreviewThumbnails } from '@/components/common/FabricPreviewThumbnails';
import { getImageUrl, getSliderImages } from '@/utils/imageHelper';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedThumbIndex, setSelectedThumbIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Track which product we've already loaded to prevent double-fetch
  const loadedProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    setSelectedThumbIndex(0);
  }, [product?._id]);

  useEffect(() => {
    if (!id) return;

    // Skip fetch if we already loaded this product (by ID or slug)
    if (product && (product._id === id || product.slug === id)) {
      // Already have the right product, just canonicalize URL if needed
      if (product.slug && product.slug !== id) {
        navigate(`/products/${product.slug}`, { replace: true });
      }
      return;
    }

    // Skip if we're re-fetching the same ID (e.g., after redirect)
    if (loadedProductIdRef.current === id) return;
    loadedProductIdRef.current = id;

    setProduct(null);
    setLoading(true);
    getProductById(id)
      .then((data) => {
        setProduct(data);
        // Canonicalize URL: If we loaded by ID but have a slug, update URL
        if (data.slug && data.slug !== id) {
          navigate(`/products/${data.slug}`, { replace: true });
        }
      })
      .catch((err) => setError(err.message || 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [id, navigate, product]);

  const features = [
    { icon: Palette, label: 'Premium Fabrics', desc: 'Curated selection' },
    { icon: Sparkles, label: 'Full Customization', desc: 'Every detail' },
    { icon: Ruler, label: 'Made to Measure', desc: 'Perfect fit' },
    { icon: Clock, label: 'Fast Delivery', desc: '2-3 weeks' },
  ];

  // Carousel items: only gallery images with fallback to base image
  const carouselItems = product?.images?.gallery?.length
    ? product.images.gallery
    : (product?.images?.baseImage ? [product.images.baseImage] : []);

  const totalSlides = carouselItems.length;
  const nextSlide = () => totalSlides > 0 && setSelectedThumbIndex((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => totalSlides > 0 && setSelectedThumbIndex((prev) => (prev - 1 + totalSlides) % totalSlides);

  useEffect(() => {
    if (totalSlides <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setSelectedThumbIndex((prev) => (prev + 1) % totalSlides);
    }, 4000);
    return () => clearInterval(interval);
  }, [totalSlides, isHovered]);

  const getVisibleDots = () => {
    const maxVisible = 5;
    if (totalSlides <= maxVisible) return carouselItems.map((_, i) => i);
    const half = Math.floor(maxVisible / 2);
    let start = selectedThumbIndex - half;
    let end = selectedThumbIndex + half;
    if (start < 0) {
      end += Math.abs(start);
      start = 0;
    } else if (end >= totalSlides) {
      start -= (end - totalSlides + 1);
      end = totalSlides - 1;
    }
    start = Math.max(0, start);
    end = Math.min(totalSlides - 1, end);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <SiteLayout>
      <div className="bg-white min-h-[calc(100vh)] flex flex-col -mt-20 pt-20">
        <div className="container mx-auto px-4 lg:px-8 pt-8 pb-12 flex-1">
          {/* Show skeleton while loading - matches final layout */}
          {loading ? (
            <div className="animate-pulse">
              {/* Breadcrumb skeleton */}
              <div className="flex items-center gap-2 mb-8">
                <div className="h-4 bg-muted/50 rounded w-20" />
                <div className="h-4 bg-muted/50 rounded w-4" />
                <div className="h-4 bg-muted/50 rounded w-32" />
              </div>
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
                {/* Left - Image skeleton */}
                <div className="space-y-4">
                  <div className="aspect-square rounded-3xl bg-muted/50" />
                  <div className="flex gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-20 h-20 rounded-xl bg-muted/50" />
                    ))}
                  </div>
                </div>
                {/* Right - Details skeleton */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="h-8 bg-muted/50 rounded w-3/4" />
                    <div className="h-4 bg-muted/50 rounded w-full" />
                    <div className="h-4 bg-muted/50 rounded w-2/3" />
                  </div>
                  <div className="h-32 rounded-2xl bg-muted/50" />
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-20 rounded-xl bg-muted/50" />
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 h-14 rounded-full bg-muted/50" />
                    <div className="flex-1 h-14 rounded-full bg-muted/50" />
                  </div>
                </div>
              </div>
            </div>
          ) : !product || error ? (
            // Show error state inline
            <div className="flex flex-col items-center justify-center py-32 animate-fade-up">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
                <span className="text-4xl">😕</span>
              </div>
              <h2 className="font-display text-2xl font-medium text-foreground mb-2">Product Not Found</h2>
              <p className="text-muted-foreground mb-8">{error || 'This product doesn\'t exist or has been removed.'}</p>
              <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-all">
                <ArrowLeft className="w-4 h-4" />
                Back to Products
              </Link>
            </div>
          ) : (
            // Show product content
            <>
              {/* Mobile Header / Breadcrumb */}
              <nav className="flex items-center justify-between mb-6 lg:mb-8 py-2 animate-fade-up relative">
                <Link to="/products" className="text-muted-foreground hover:text-foreground transition-colors flex shrink-0 items-center justify-center w-10 h-10 bg-muted/30 rounded-full border border-border/50 z-10 hover:bg-muted/50 hover:shadow-soft">
                  <ArrowLeft className="w-5 h-5" />
                </Link>

                {/* Mobile Title Centered in Header */}
                <div className="lg:hidden absolute inset-0 flex items-center justify-center pointer-events-none px-14">
                  <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground truncate text-center pt-0.5">
                    {product.name}
                  </h1>
                </div>

                <div className="hidden lg:flex items-center gap-2 text-sm justify-end w-full">
                  <span className="text-muted-foreground">/</span>
                  <span className="text-foreground font-medium truncate">{product.name}</span>
                </div>
              </nav>

              {/* Main Content */}
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
                {/* Left - Images */}
                <div className="lg:sticky lg:top-10 space-y-4 animate-fade-up min-w-0 w-full">
                  <div
                    className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 shadow-soft"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    {/* Carousel - same as homepage hero */}
                    <div className="relative aspect-[4/5] md:aspect-square lg:aspect-[4/5] xl:aspect-square rounded-2xl overflow-hidden">
                      {carouselItems.map((url, index) => {
                        const isActive = index === selectedThumbIndex;
                        const isPrev =
                          (selectedThumbIndex === 0 && index === totalSlides - 1) ||
                          (selectedThumbIndex > 0 && index === selectedThumbIndex - 1);

                        return (
                          <div
                            key={`${url}-${index}`}
                            className={`absolute inset-0 transition-all duration-700 ease-in-out ${isActive
                              ? 'opacity-100 translate-x-0 z-10'
                              : isPrev
                                ? 'opacity-0 -translate-x-full z-0'
                                : 'opacity-0 translate-x-full z-0'
                              }`}
                          >
                            <div className="w-full h-full">
                              <img
                                src={getImageUrl(url) ?? url}
                                alt={`${product.name} - view ${index + 1}`}
                                className="w-full h-full object-cover rounded-xl"
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* Navigation Arrows */}
                      {totalSlides > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={prevSlide}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-soft flex items-center justify-center hover:bg-accent/30 transition-all z-20"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="w-5 h-5 text-foreground" />
                          </button>
                          <button
                            type="button"
                            onClick={nextSlide}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-soft flex items-center justify-center hover:bg-accent/30 transition-all z-20"
                            aria-label="Next image"
                          >
                            <ChevronRight className="w-5 h-5 text-foreground" />
                          </button>

                          {/* Dots Indicator - Only show 5 at a time if > 5 images */}
                          <div className="absolute bottom-4 left-0 right-0 w-full flex justify-center z-20 pointer-events-none">
                            {carouselItems.length <= 5 ? (
                              <div className="flex items-center justify-center gap-2 pointer-events-auto">
                                {carouselItems.map((_, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedThumbIndex(index); }}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${index === selectedThumbIndex ? 'w-6 bg-primary' : 'bg-primary/30'}`}
                                    aria-label={`View image ${index + 1}`}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="w-[100px] overflow-hidden pointer-events-auto relative">
                                <div
                                  className="flex items-center gap-2 transition-transform duration-500 ease-out py-1 px-[42px]"
                                  style={{ transform: `translateX(${-selectedThumbIndex * 16}px)` }}
                                >
                                  {carouselItems.map((_, index) => {
                                    const distance = Math.abs(index - selectedThumbIndex);
                                    // Scale and Opacity logic for 5 visible dots (index 0 is active, 1 is small, 2 is tiny)
                                    const scale = distance === 0 ? 1 : distance === 1 ? 0.8 : distance === 2 ? 0.6 : 0.4;
                                    const opacity = distance === 0 ? 1 : distance === 1 ? 0.7 : distance === 2 ? 0.4 : 0.2;
                                    
                                    return (
                                      <button
                                        key={index}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setSelectedThumbIndex(index); }}
                                        className={`shrink-0 w-2 h-2 rounded-full transition-all duration-300 ${index === selectedThumbIndex ? 'w-6 bg-primary' : 'bg-primary/30'}`}
                                        style={{ transform: `scale(${scale})`, opacity }}
                                        aria-label={`View image ${index + 1}`}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-6 left-6 z-10">
                      <span className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm text-sm font-medium text-foreground shadow-soft capitalize">
                        {product.category}
                      </span>
                    </div>

                    {/* Rating Badge */}
                    <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-soft z-10">
                      <Star className="w-4 h-4 text-accent fill-accent" />
                      <span className="text-sm font-medium">4.9</span>
                    </div>
                  </div>

                  {/* Fabric Preview Thumbnails - Full Gallery */}
                  <FabricPreviewThumbnails
                    thumbnails={carouselItems}
                    selectedIndex={selectedThumbIndex}
                    onSelect={setSelectedThumbIndex}
                  />
                </div>

                {/* Right - Details */}
                <div className="space-y-8 animate-fade-up stagger-1">
                  {/* Title & Description Desktop & Mobile */}
                  <div className="text-left mt-0 lg:mt-0">
                    <h1 className="hidden lg:block font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground mb-3 lg:mb-4">
                      {product.name}
                    </h1>
                    <p className="text-base sm:text-lg lg:text-lg text-muted-foreground leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Price Card */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-muted-foreground">Starting Price</span>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 text-accent">
                        <Sparkles className="w-3 h-3" />
                        <span className="text-xs font-medium">Customizable</span>
                      </div>
                    </div>
                    <p className="font-display text-4xl font-semibold text-foreground">
                      {formatPrice(product.basePrice)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Final price depends on fabric and customization choices
                    </p>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                    {features.map((feature, i) => (
                      <div
                        key={feature.label}
                        className="group p-5 sm:p-6 bg-primary/[0.03] rounded-2xl border border-accent/20 hover:shadow-elevated hover:-translate-y-1 transition-all duration-500 flex flex-row items-center text-left gap-5"
                      >
                        <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-500 shadow-soft">
                          <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display text-base sm:text-lg font-semibold text-foreground mb-1 leading-tight">{feature.label}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      to={product.categoryType === '3d' ? `/customize-3d/${product.slug || product._id}` : `/customize/${product.slug || product._id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-luxury text-white rounded-full font-medium shadow-elevated hover:shadow-float hover:-translate-y-1 transition-all duration-500 group"
                    >
                      {product.categoryType === '3d' ? 'Start 3D Customizing' : 'Start Customizing'}
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <Link
                      to="/products"
                      className="flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-border rounded-full font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
                    >
                      Browse More
                    </Link>
                  </div>

                  {/* Trust */}
                  <div className="flex items-center justify-center gap-6 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="w-4 h-4 text-primary" />
                      Quality Guaranteed
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Expert Craftsmanship
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
