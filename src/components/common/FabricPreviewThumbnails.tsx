import { useEffect, useRef, useState } from 'react';
import { getThumbnailImageUrl } from '@/utils/imageHelper';

export interface FabricPreviewThumbnailsProps {
  /** Thumbnail URLs to display */
  thumbnails: string[];
  /** Index of selected thumbnail (0-based). Optional - for switching main image. */
  selectedIndex?: number;
  /** Called when user clicks a thumbnail */
  onSelect?: (index: number) => void;
  /** Optional fallback when no thumbnails - e.g. fabric option render */
  fallback?: React.ReactNode;
  /** Size class for thumbnails (default: w-20 h-20) */
  sizeClass?: string;
  /** Additional container class */
  className?: string;
}

/**
 * Displays fabric preview thumbnails (product detail, customizer landing).
 * Reused for 2D shirt, 2D pant, 3D shirt. Count = admin uploads.
 */
export function FabricPreviewThumbnails({
  thumbnails = [],
  selectedIndex = 0,
  onSelect,
  fallback,
  sizeClass = 'w-[18%] sm:w-20 aspect-square',
  className = '',
}: FabricPreviewThumbnailsProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const checkScrollable = () => {
      if (scrollRef.current) {
        setIsScrollable(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
      }
    };
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [thumbnails]);

  useEffect(() => {
    if (scrollRef.current && selectedIndex !== undefined) {
      const button = scrollRef.current.children[selectedIndex] as HTMLElement;
      if (button) {
        const container = scrollRef.current;
        const scrollLeft = button.offsetLeft - container.offsetWidth / 2 + button.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);
  if (!thumbnails.length && fallback) {
    return <>{fallback}</>;
  }

  if (!thumbnails.length) {
    return <></>;
  }

  // Use absolute fading edge gradients instead of maskImage to prevent clipping the active ring border
  return (
    <div className={`relative w-full ${className}`}>
      {isScrollable && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none rounded-l-xl" />
      )}
      {isScrollable && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none rounded-r-xl" />
      )}
      <div 
        ref={scrollRef} 
        className={`flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-4 pt-2 px-12 scroll-smooth w-full ${isScrollable ? 'justify-start' : 'justify-center mx-auto'}`}
      >
        {thumbnails.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => onSelect?.(i)}
            className={`relative ${sizeClass} shrink-0 rounded-xl overflow-hidden transition-all duration-300 bg-muted/30 box-border border ${i === selectedIndex ? 'border-primary z-20' : 'border-border/50 hover:border-primary/30 z-0'}`}
          >
            <img
              src={getThumbnailImageUrl(url) ?? ''}
              alt={`Preview ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
