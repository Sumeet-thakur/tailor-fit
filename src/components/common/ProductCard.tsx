import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Box } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import { getProductImageUrl } from '@/utils/imageHelper';
import { formatPrice } from '@/lib/formatPrice';

interface ProductCardItem {
  _id: string;
  name: string;
  description?: string;
  category: string;
  categoryType?: '2d' | '3d';
  basePrice: number;
  images?: { 
    baseImage?: string; 
    fabricPreviewThumbnails?: string[];
    gallery?: string[];
    galleryByFabric?: Record<string, string[]>;
    cardHoverGallery?: string[];
    backImage?: string;
  };
  customizationOptions?: {
    fabrics?: { id: string; name: string; imageUrl?: string; color?: string; }[];
  };
  is3D?: boolean;
  image: string;
  path?: string;
  slug?: string;
}

interface ProductCardProps {
  item: ProductCardItem;
  index: number;
}

function ProductCardComponent({ item, index }: ProductCardProps) {
  const is3D = item.is3D || item.categoryType === '3d';
  
  const [activeFabricId, setActiveFabricId] = useState<string | null>(null);
  
  // Combine base image and all gallery images or fabric-specific images
  const galleryImages = useMemo(() => {
    // 1. If a fabric is active and has specific gallery images, prioritize those
    if (activeFabricId && item.images?.galleryByFabric?.[activeFabricId]) {
      const fabricGallery = item.images.galleryByFabric[activeFabricId];
      if (fabricGallery && fabricGallery.length > 0) {
        return fabricGallery
          .map((img: string) => getProductImageUrl(img, item.category))
          .filter(Boolean) as string[];
      }
    }

    const refs: string[] = [];
    // Always prioritize the official baseImage (or fallback) for the resting state
    if (item.images?.baseImage) refs.push(item.images.baseImage);
    else if (item.image) refs.push(item.image);

    // 2. Selective Card Hover View: Use cardHoverGallery if explicitly selected images exist
    if (!activeFabricId && (item.images?.cardHoverGallery?.length || 0) > 0) {
      (item.images?.cardHoverGallery || []).forEach(img => {
        if (img && !refs.includes(img)) refs.push(img);
      });
      return refs.map(img => getProductImageUrl(img, item.category)).filter(Boolean) as string[];
    }
    
    // 3. General Fallback/Default: Base Image + Gallery
    if (item.images?.gallery) {
      item.images.gallery.forEach(img => {
        if (img && !refs.includes(img)) refs.push(img);
      });
    }

    const resolved = refs.map(img => getProductImageUrl(img, item.category)).filter(Boolean) as string[];
    return resolved.length > 0 ? resolved : [item.image];
  }, [item, activeFabricId]);

  const [hoverIndex, setHoverIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Immediate cleanup of existing timers on dependency change
    if (slideshowTimerRef.current) clearTimeout(slideshowTimerRef.current);
    if (cycleTimerRef.current) clearInterval(cycleTimerRef.current);

    if (!isHovered || galleryImages.length <= 1) {
      setHoverIndex(0);
      return;
    }
    
    // Delay slideshow until zoom transition is well underway
    slideshowTimerRef.current = setTimeout(() => {
      // Trigger first advance immediately after 200ms delay
      setHoverIndex(1 % galleryImages.length);

      cycleTimerRef.current = setInterval(() => {
        setHoverIndex(prev => (prev + 1) % galleryImages.length);
      }, 1200); 
    }, 200);

    return () => {
      if (slideshowTimerRef.current) clearTimeout(slideshowTimerRef.current);
      if (cycleTimerRef.current) clearInterval(cycleTimerRef.current);
      setHoverIndex(0);
    };
  }, [isHovered, galleryImages.length]);
  
  const linkTo = `/products/${item.slug || item._id}`;

  return (
    <Link
      to={linkTo}
      className="group rounded-3xl bg-white border border-primary/10 overflow-hidden shadow-soft hover:shadow-float transition-all duration-500 hover:-translate-y-2 animate-fade-up block isolate transform-gpu"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div 
        className="relative aspect-[4/5] bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden cursor-pointer isolate transform-gpu"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={(e) => {
          // On touch, toggle hover state instead of navigation on first tap
          if (!isHovered) {
             e.preventDefault();
             setIsHovered(true);
          }
        }}
      >
        {/* Gallery Images (Fades in/out based on hovered index) */}
        {galleryImages.map((src, idx) => (
          <div 
            key={`${src}-${idx}`}
            className={`absolute inset-0 transition-opacity duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${
              galleryImages.length > 1
                ? (idx === hoverIndex ? 'opacity-100' : 'opacity-0')
                : 'opacity-100'
            }`}
          >
            <div className={`w-full h-full transition-transform duration-1000 cubic-bezier(0.4, 0, 0.2, 1) transform-gpu ${isHovered ? 'scale-105' : 'scale-100'}`}>
               <OptimizedImage
                src={src}
                alt={`${item.name} view ${idx + 1}`}
                fallback={getProductImageUrl(undefined, item.category)}
                className={`w-full h-full ${idx === 0 ? 'object-contain p-4' : 'object-cover'} filter drop-shadow-sm transition-all duration-1000`}
              />
            </div>
          </div>
        ))}
        
        {/* Fallback if no images */}
        {galleryImages.length === 0 && (
           <div className="absolute inset-0 p-6 transition-all duration-700 group-hover:scale-110">
              <OptimizedImage
                src={getProductImageUrl(undefined, item.category) || ''}
                alt={item.name}
                className="w-full h-full object-contain"
              />
           </div>
        )}

        {/* Fabric Swatches (Appears on hover if galleryByFabric is present) */}
        {isHovered && item.images?.galleryByFabric && item.customizationOptions?.fabrics && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 bg-white/80 backdrop-blur-md rounded-full border border-white/50 shadow-lg z-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {item.customizationOptions.fabrics
              .filter(f => item.images?.galleryByFabric?.[f.id])
              .map(fabric => (
                <button
                  key={fabric.id}
                  onMouseEnter={() => setActiveFabricId(fabric.id)}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveFabricId(fabric.id); }}
                  className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${activeFabricId === fabric.id ? 'border-primary scale-125 ring-2 ring-primary/20' : 'border-white hover:scale-110'}`}
                  style={{ 
                    backgroundColor: fabric.color || '#fff', 
                    backgroundImage: fabric.imageUrl ? `url(${fabric.imageUrl})` : 'none',
                    backgroundSize: 'cover'
                  }}
                  title={fabric.name}
                />
              ))}
            {/* Reset to general gallery option */}
            <button
               onMouseEnter={() => setActiveFabricId(null)}
               onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveFabricId(null); }}
               className={`w-5 h-5 rounded-full border-2 bg-slate-200 flex items-center justify-center transition-all duration-300 ${!activeFabricId ? 'border-primary ring-2 ring-primary/20' : 'border-white hover:scale-110'}`}
               title="General View"
            >
               <div className="w-2 h-2 rounded-full bg-slate-500" />
            </button>
          </div>
        )}

        {/* View Details Button Overlay (Moved up slightly to accommodate swatches) */}
        <div className={`absolute bottom-6 left-6 right-6 transition-all duration-500 transform ${isHovered && item.images?.galleryByFabric ? '-translate-y-10 opacity-0' : 'translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100'}`}>
          <span className="flex items-center justify-center gap-2 w-full py-3 bg-white rounded-full text-sm font-medium text-foreground shadow-elevated">
            View Details
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-foreground shadow-soft capitalize">
            {item.category}
          </span>
        </div>
        {is3D && (
          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-gradient-luxury text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
            <Box className="w-3.5 h-3.5" />
            3D Customizer
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="font-display text-xl font-medium text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1 mb-2">
          {item.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {item.description}
        </p>
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Starting from</p>
            <p className="font-display text-xl font-semibold text-primary">{formatPrice(item.basePrice)}</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all duration-300">
            <ArrowRight className="w-5 h-5 text-primary group-hover:text-white transition-colors duration-300" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export const ProductCard = memo(ProductCardComponent, (prev, next) => {
  return (
    prev.item._id === next.item._id &&
    prev.item.basePrice === next.item.basePrice &&
    prev.item.name === next.item.name &&
    prev.item.is3D === next.item.is3D &&
    prev.item.categoryType === next.item.categoryType &&
    prev.index === next.index
  );
});
