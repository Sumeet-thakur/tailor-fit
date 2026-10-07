import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Palette, Ruler, Shield, Sparkles, Star, Layers } from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import { apiClient } from '@/lib/apiClient';
import { getFabricThumbnailUrl } from '@/services/fabricService';
import { FabricPreviewThumbnails } from '@/components/common/FabricPreviewThumbnails';
import { getImageUrl, getSliderImages } from '@/utils/imageHelper';

import { productService } from '@/services/products';

/** Slugs for 3D shirt product - admin creates product with name "3D Shirt" (slug 3d-shirt) or "3D Shirt Customizer" (slug 3d-shirt-customizer) */
const PRODUCT_SLUGS_3D_SHIRT = ['3d-shirt', '3d-shirt-customizer'];

export default function Customize3DLandingPage() {
    const [fabrics, setFabrics] = useState<any[]>([]);
    const [product3d, setProduct3d] = useState<{ _id?: string; slug?: string; images?: { fabricPreviewThumbnails?: string[] }; basePrice?: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedThumbIndex, setSelectedThumbIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        setSelectedThumbIndex(0);
    }, [product3d?._id]);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            apiClient.get<any[]>('/fabrics').then(d => d || []),
            productService.getAll().then(products => {
                // Find 3D product from full list to avoid 404s
                return products.find(p => p.categoryType === '3d' || p.slug === '3d-shirt' || p.slug === '3d-shirt-customizer');
            })
        ]).then(([fabricsData, productData]) => {
            setFabrics(fabricsData);
            setProduct3d(productData ?? null);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const thumbnails = product3d?.images?.fabricPreviewThumbnails || [];
    const fabricPreviewImage = fabrics.find((f: any) => f.is3DPreview) || fabrics[0];
    const fabricSrc = fabricPreviewImage ? (getFabricThumbnailUrl(fabricPreviewImage, true) || fabricPreviewImage.thumbnailUrl || fabricPreviewImage.colorMapUrl) : undefined;
    const sliderItems = getSliderImages(thumbnails, fabricSrc, 'shirt');
    const useProductThumbnails = thumbnails.length > 0;
    const totalSlides = sliderItems.length;
    const nextSlide = () => totalSlides > 0 && setSelectedThumbIndex((prev) => (prev + 1) % totalSlides);
    const prevSlide = () => totalSlides > 0 && setSelectedThumbIndex((prev) => (prev - 1 + totalSlides) % totalSlides);

    useEffect(() => {
        if (totalSlides <= 1 || isHovered) return;
        const t = setInterval(() => setSelectedThumbIndex((p) => (p + 1) % totalSlides), 4000);
        return () => clearInterval(t);
    }, [totalSlides, isHovered]);

    const previewImage = useProductThumbnails && thumbnails[selectedThumbIndex]
        ? getImageUrl(thumbnails[selectedThumbIndex])
        : getImageUrl(fabricSrc) || sliderItems[0];

    const features = [
        { icon: Layers, label: 'Real-time 3D Preview', desc: 'See your design come to life' },
        { icon: Palette, label: 'Premium Fabrics', desc: 'Curated selection' },
        { icon: Sparkles, label: 'Full Customization', desc: 'Every detail' },
        { icon: Ruler, label: 'Made to Measure', desc: 'Perfect fit' },
    ];

    return (
        <SiteLayout>
            <div className="container mx-auto px-4 lg:px-8 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm mb-8 animate-fade-up">
                    <Link to="/products" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Collection
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-foreground font-medium truncate">3D Shirt Customizer</span>
                </nav>

                {/* Main Content */}
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* Left - 3D Preview Image */}
                    <div className="space-y-4 animate-fade-up min-w-0 w-full">
                        <div
                            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 shadow-soft"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            {/* Main Image - Slider when product thumbnails, single when fabric fallback */}
                            <div className="aspect-square p-10 flex items-center justify-center relative overflow-hidden">
                                {loading ? (
                                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                ) : useProductThumbnails && thumbnails.length > 0 ? (
                                    <>
                                        {thumbnails.map((url, index) => {
                                            const isActive = index === selectedThumbIndex;
                                            const isPrev =
                                                (selectedThumbIndex === 0 && index === totalSlides - 1) ||
                                                (selectedThumbIndex > 0 && index === selectedThumbIndex - 1);
                                            return (
                                                <div
                                                    key={`3d-${index}`}
                                                    className={`absolute inset-0 p-10 transition-all duration-700 ease-in-out ${isActive ? 'opacity-100 translate-x-0 z-10' : isPrev ? 'opacity-0 -translate-x-full z-0' : 'opacity-0 translate-x-full z-0'
                                                        }`}
                                                >
                                                    <img
                                                        src={getImageUrl(url) ?? ''}
                                                        alt={`3D Shirt Preview ${index + 1}`}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            );
                                        })}
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
                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                                                    {thumbnails.map((_, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => setSelectedThumbIndex(index)}
                                                            className={`w-2 h-2 rounded-full transition-all duration-300 ${index === selectedThumbIndex ? 'w-6 bg-primary' : 'bg-primary/30'}`}
                                                            aria-label={`View image ${index + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : previewImage ? (
                                    <img
                                        src={previewImage}
                                        alt="3D Shirt Preview"
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl flex flex-col items-center justify-center gap-6">
                                        <div className="w-32 h-32 rounded-2xl bg-gradient-luxury flex items-center justify-center shadow-elevated">
                                            <Sparkles className="w-16 h-16 text-white" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="font-display text-xl font-semibold text-foreground mb-1">Interactive 3D Model</h3>
                                            <p className="text-sm text-muted-foreground">Rotate, zoom and customize in real-time</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Category Badge */}
                            <div className="absolute top-6 left-6">
                                <span className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm text-sm font-medium text-foreground shadow-soft capitalize">
                                    3D Model
                                </span>
                            </div>

                            {/* Rating Badge */}
                            <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-soft">
                                <Star className="w-4 h-4 text-accent fill-accent" />
                                <span className="text-sm font-medium">5.0</span>
                            </div>
                        </div>

                        {/* Preview Thumbnails - Product fabricPreviewThumbnails (admin uploads) or fabrics fallback */}
                        {useProductThumbnails ? (
                            <FabricPreviewThumbnails
                                thumbnails={thumbnails}
                                selectedIndex={selectedThumbIndex}
                                onSelect={setSelectedThumbIndex}
                            />
                        ) : (
                            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 w-full relative">
                                {fabrics.slice(0, 4).map((fabric, i) => (
                                    <div
                                        key={fabric._id || i}
                                        className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-300 ${i === 0 ? 'border-primary shadow-soft' : 'border-border/50 hover:border-primary/30'}`}
                                    >
                                        <div
                                            className="w-full h-full bg-muted/30 flex items-center justify-center"
                                            style={{
                                                backgroundImage: (fabric.thumbnailUrl || fabric.colorMapUrl) ? `url(${getFabricThumbnailUrl(fabric, true) || fabric.thumbnailUrl || fabric.colorMapUrl})` : 'none',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}
                                        >
                                            {!fabric.thumbnailUrl && !fabric.colorMapUrl && (
                                                <span className="text-[10px] text-muted-foreground text-center">{fabric.name || `Fabric ${i + 1}`}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right - Details */}
                    <div className="space-y-8 animate-fade-up stagger-1">
                        {/* Title */}
                        <div>
                            <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground mb-4">
                                3D Shirt Customizer
                            </h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Design your perfect shirt with our cutting-edge 3D customization tool.
                                Select from premium Italian fabrics, customize every detail, and see your creation come to life in real-time.
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
                                {formatPrice(product3d?.basePrice ?? 5000)}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Final price depends on fabric and customization choices
                            </p>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-2 gap-3">
                            {features.map((feature) => (
                                <div
                                    key={feature.label}
                                    className="p-4 rounded-xl bg-white border border-border/50 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300"
                                >
                                    <feature.icon className="w-5 h-5 text-primary mb-2" />
                                    <h4 className="font-medium text-sm text-foreground">{feature.label}</h4>
                                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                to={product3d ? `/customize-3d/${product3d.slug || product3d._id}` : "/3d-customizer"}
                                className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-luxury text-white rounded-full font-medium shadow-elevated hover:shadow-float hover:-translate-y-1 transition-all duration-500 group"
                            >
                                Start 3D Customizing
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
            </div>
        </SiteLayout>
    );
}
