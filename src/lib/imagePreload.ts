/**
 * Simple image preload cache.
 * Tracks loaded URLs so we can skip loading state for cached images.
 */
const loadedUrls = new Set<string>();

export function isImageCached(url: string): boolean {
  if (!url) return false;
  return loadedUrls.has(url);
}

export function markImageLoaded(url: string): void {
  if (url) loadedUrls.add(url);
}

export function preloadImage(url: string, crossOrigin?: string): Promise<void> {
  if (!url) return Promise.resolve();
  if (loadedUrls.has(url)) return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => {
      loadedUrls.add(url);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Preloads images, resolves when ALL load successfully. Rejects if any fail. */
export function preloadImagesStrict(urls: string[], crossOrigin?: string): Promise<void> {
  const valid = urls.filter(Boolean);
  if (valid.length === 0) return Promise.resolve();

  return Promise.all(
    valid.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          if (loadedUrls.has(url)) return resolve();
          const img = new Image();
          if (crossOrigin) img.crossOrigin = crossOrigin;
          img.onload = () => {
            loadedUrls.add(url);
            resolve();
          };
          img.onerror = () => reject(new Error(`Failed to load: ${url}`));
          img.src = url;
        })
    )
  ).then(() => {});
}

export function preloadImages(urls: string[], crossOrigin?: string): Promise<void> {
  return Promise.all(urls.map((url) => preloadImage(url, crossOrigin))).then(() => {});
}
