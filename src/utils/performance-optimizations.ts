/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Preload critical resources
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return;

  // Preload critical fonts
  const criticalFonts = [
    '/fonts/inter-var.woff2',
    // Add other critical fonts here
  ];

  criticalFonts.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = font;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });

  // Preload critical images
  const criticalImages: string[] = [
    // Add critical images that appear above the fold
  ];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = src;
    link.as = 'image';
    document.head.appendChild(link);
  });
}

// Prefetch likely next pages
export function prefetchLikelyPages() {
  if (typeof window === 'undefined') return;

  const likelyPages = [
    '/districts',
    '/analytics',
    // Add other likely navigation targets
  ];

  likelyPages.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  });
}

// Debounce function for expensive operations
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number,
  immediate?: boolean
): T {
  let timeout: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  }) as T;
}

// Throttle function for high-frequency events
export function throttle<T extends (...args: unknown[]) => void>(func: T, limit: number): T {
  let inThrottle: boolean;

  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

// Intersection Observer for lazy loading
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
}

// Memory management helpers
export function scheduleIdleCallback(callback: () => void): void {
  if (typeof window === 'undefined') return;

  if ('requestIdleCallback' in window) {
    (
      window as unknown as {
        requestIdleCallback: (cb: () => void, options: { timeout: number }) => void;
      }
    ).requestIdleCallback(callback, { timeout: 5000 });
  } else {
    setTimeout(callback, 1);
  }
}

// Image optimization helpers
export function getOptimizedImageSrc(src: string, width: number, quality = 75): string {
  // For Next.js Image optimization
  if (src.startsWith('/')) {
    return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
  }
  return src;
}

// Check if device prefers reduced motion
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Check connection quality
export function getConnectionQuality(): 'slow' | 'fast' | 'unknown' {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'unknown';
  }

  const connection = (navigator as unknown as { connection?: { effectiveType?: string } })
    .connection;
  if (!connection) return 'unknown';

  // Effective connection type (4g, 3g, 2g, slow-2g)
  const effectiveType = connection.effectiveType;

  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g') return 'fast';
  return 'slow';
}

// Adaptive loading based on connection
export function shouldLoadHighQuality(): boolean {
  const connection = getConnectionQuality();
  const prefersReduced = prefersReducedMotion();

  // Load high quality if:
  // - Fast connection AND user doesn't prefer reduced motion
  // - Connection quality unknown (assume good connection)
  return (connection === 'fast' || connection === 'unknown') && !prefersReduced;
}

// Service Worker registration helper
export function registerServiceWorker(): void {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    process.env.NODE_ENV !== 'production'
  ) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        // eslint-disable-next-line no-console
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        // eslint-disable-next-line no-console
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Critical CSS inlining helper
export function inlineCriticalCSS(css: string): void {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = css;
  style.setAttribute('data-critical', 'true');
  document.head.appendChild(style);
}

// Resource hints for better loading
export function addResourceHints(): void {
  if (typeof document === 'undefined') return;

  // DNS prefetch for external domains
  const domains = ['bioguide.congress.gov', 'www.congress.gov', 'api.congress.gov'];

  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = `//${domain}`;
    document.head.appendChild(link);
  });

  // Preconnect to critical external resources
  const criticalDomains = ['api.congress.gov'];

  criticalDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = `https://${domain}`;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// Bundle analyzer helper for development
export function analyzeBundleSize(): void {
  if (process.env.NODE_ENV !== 'development') return;

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const bundles = resources.filter(
    resource => resource.name.includes('/_next/static/') && resource.name.endsWith('.js')
  );

  const totalSize = bundles.reduce(
    (sum, bundle) => sum + (bundle.transferSize || bundle.encodedBodySize || 0),
    0
  );

  // eslint-disable-next-line no-console
  console.group('📦 Bundle Analysis');
  // eslint-disable-next-line no-console
  console.log(`Total JS Size: ${(totalSize / 1024).toFixed(2)} KB`);
  // eslint-disable-next-line no-console
  console.log(`Number of chunks: ${bundles.length}`);

  bundles
    .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
    .slice(0, 5)
    .forEach(bundle => {
      const size = bundle.transferSize || bundle.encodedBodySize || 0;
      const name = bundle.name.split('/').pop() || '';
      // eslint-disable-next-line no-console
      console.log(`${name}: ${(size / 1024).toFixed(2)} KB`);
    });
  // eslint-disable-next-line no-console
  console.groupEnd();
}
