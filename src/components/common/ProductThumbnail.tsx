import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getItemPreviewImage } from '@/lib/screenshotUtils';
import { getProductPlaceholder } from '@/lib/placeholders';
import { AlertCircle } from 'lucide-react';

// Define a common interface for items that have images
// This covers CartItem, SavedDesign, and OrderItem
interface ProductItem {
    productName?: string;
    baseImage?: string;
    screenshot?: string;
    productCategory?: string;
    // Some items might have different property names, can expand as needed
    [key: string]: any;
}

interface ProductThumbnailProps {
    item: ProductItem;
    className?: string; // Class for the container
    imageClassName?: string; // Class for the img element
    showPlaceholder?: boolean;
    /** Phase 5: Show "Product unavailable" badge when image fails to load */
    showUnavailableBadge?: boolean;
}

export function ProductThumbnail({
    item,
    className,
    imageClassName,
    showPlaceholder = true,
    showUnavailableBadge = true,
}: ProductThumbnailProps) {
    const primarySrc = getItemPreviewImage(item);
    const fallbackSrc = showPlaceholder ? getProductPlaceholder(item.productCategory) : undefined;
    const [imageError, setImageError] = useState(false);

    const imageSrc = imageError || !primarySrc ? fallbackSrc : primarySrc;
    const altText = item.productName || 'Product Image';
    const isUnavailable = imageError && showUnavailableBadge;

    if (!imageSrc) return null;

    return (
        <div className={cn("relative overflow-hidden flex items-center justify-center bg-white", className)}>
            <img
                src={imageSrc}
                alt={altText}
                loading="lazy"
                className={cn("w-full h-full object-contain", imageClassName)}
                onError={() => setImageError(true)}
            />
            {isUnavailable && (
                <span className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 rounded bg-destructive/90 px-2 py-0.5 text-[10px] font-medium text-white">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Product unavailable
                </span>
            )}
        </div>
    );
}
