import React, { useState, useEffect } from 'react';
import { isImageCached, markImageLoaded } from '@/lib/imagePreload';

interface TransitionImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    onLoadingChange?: (isLoading: boolean) => void;
}

/**
 * A smart image component that prevents "white flashes" by keeping the old image
 * visible until the new image source is fully loaded.
 * Uses a cache so repeated loads (e.g. switching back to same fabric) are instant.
 */
export const TransitionImage: React.FC<TransitionImageProps> = ({
    src,
    className = '',
    alt,
    onLoadingChange,
    ...props
}) => {
    const [currentSrc, setCurrentSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(false);

    const { crossOrigin, ...otherProps } = props as any;

    // When the requested source changes, load it in background first
    useEffect(() => {
        if (src !== currentSrc) {
            // If already cached, skip loading state
            if (isImageCached(src)) {
                setCurrentSrc(src);
                onLoadingChange?.(false);
                return;
            }

            setIsLoading(true);
            onLoadingChange?.(true);

            const img = new Image();
            if (crossOrigin) img.crossOrigin = crossOrigin;
            img.src = src;

            img.onload = () => {
                markImageLoaded(src);
                setCurrentSrc(src);
                setIsLoading(false);
                onLoadingChange?.(false);
            };

            img.onerror = () => {
                setCurrentSrc(src);
                setIsLoading(false);
                onLoadingChange?.(false);
            };
        }
    }, [src, currentSrc, onLoadingChange, crossOrigin]);

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={`${className} transition-opacity duration-200 ${isLoading ? 'opacity-90' : 'opacity-100'}`}
            crossOrigin={crossOrigin}
            {...otherProps}
        />
    );
};
