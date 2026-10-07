import { useState } from 'react';
import { PLACEHOLDERS } from '@/lib/placeholders';

interface OptimizedImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  fallback?: string;
}

/**
 * Optimized image component with lazy loading, loading skeleton, and error fallback.
 * Reduces layout shift and improves perceived performance.
 */
export function OptimizedImage({
  src,
  alt,
  className = '',
  fallback = PLACEHOLDERS.productDefault,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const resolvedSrc = error || !src ? fallback : src;

  return (
    <div className="relative overflow-hidden w-full h-full">
      {loading && (
        <div className="absolute inset-0 animate-pulse bg-muted/50" aria-hidden />
      )}
      <img
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'} ${className.includes('object-') ? className : `object-cover ${className}`}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}
