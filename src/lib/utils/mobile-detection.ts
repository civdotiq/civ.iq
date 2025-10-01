/**
 * Mobile detection and optimization utilities
 * Provides helpers for mobile-specific optimizations and feature detection
 */

/**
 * Detects if the user is on a mobile device
 * @returns true if user agent indicates mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detects if the user is on a slow network connection
 * Uses Network Information API when available
 * @returns true if connection is 2G/slow-2G or save-data is enabled
 */
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false;
  }

  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return (
    conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g' || conn?.saveData === true
  );
}

/**
 * Determines if data reduction strategies should be applied
 * Combines mobile detection with slow connection detection
 * @returns true if user is on mobile with slow connection
 */
export function shouldReduceData(): boolean {
  return isMobileDevice() && isSlowConnection();
}

/**
 * Gets optimal image quality based on device and connection
 * @returns quality value (60-85) for image optimization
 */
export function getOptimalImageQuality(): number {
  if (shouldReduceData()) return 60;
  if (isMobileDevice()) return 75;
  return 85;
}

/**
 * Generates responsive sizes attribute for images
 * @param baseWidth - Base width in pixels for desktop
 * @returns Responsive sizes string for use with next/image
 */
export function getOptimalImageSizes(baseWidth: number): string {
  // Mobile gets 50% of base width, desktop gets full width
  return `(max-width: 640px) ${Math.floor(baseWidth * 0.5)}px, ${baseWidth}px`;
}

/**
 * Detects if the device supports hover interactions
 * Useful for conditionally showing hover states
 * @returns true if device supports hover
 */
export function supportsHover(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Detects if the user prefers reduced motion
 * Respects accessibility preferences
 * @returns true if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Gets the device pixel ratio for retina displays
 * @returns pixel ratio (typically 1, 2, or 3)
 */
export function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
}

/**
 * Determines if the device has a retina display
 * @returns true if pixel ratio is 2 or higher
 */
export function isRetinaDisplay(): boolean {
  return getDevicePixelRatio() >= 2;
}

/**
 * Gets the viewport width in pixels
 * @returns viewport width or 0 if not available
 */
export function getViewportWidth(): number {
  if (typeof window === 'undefined') return 0;
  return window.innerWidth || document.documentElement.clientWidth || 0;
}

/**
 * Gets the viewport height in pixels
 * @returns viewport height or 0 if not available
 */
export function getViewportHeight(): number {
  if (typeof window === 'undefined') return 0;
  return window.innerHeight || document.documentElement.clientHeight || 0;
}

/**
 * Checks if the viewport is mobile-sized
 * @param breakpoint - Optional breakpoint in pixels (default: 640)
 * @returns true if viewport width is less than breakpoint
 */
export function isMobileViewport(breakpoint: number = 640): boolean {
  return getViewportWidth() < breakpoint;
}

/**
 * Checks if the viewport is tablet-sized
 * @param minWidth - Minimum width for tablet (default: 640)
 * @param maxWidth - Maximum width for tablet (default: 1024)
 * @returns true if viewport is in tablet range
 */
export function isTabletViewport(minWidth: number = 640, maxWidth: number = 1024): boolean {
  const width = getViewportWidth();
  return width >= minWidth && width < maxWidth;
}

/**
 * Checks if the viewport is desktop-sized
 * @param breakpoint - Minimum width for desktop (default: 1024)
 * @returns true if viewport width is greater than or equal to breakpoint
 */
export function isDesktopViewport(breakpoint: number = 1024): boolean {
  return getViewportWidth() >= breakpoint;
}

/**
 * Network Information API types
 */
interface NetworkInformation {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
}

/**
 * Gets detailed network information if available
 * @returns Network information object or null
 */
export function getNetworkInfo(): NetworkInformation | null {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return null;
  }
  return (navigator as Navigator & { connection?: NetworkInformation }).connection || null;
}

/**
 * Estimates the current connection speed category
 * @returns 'fast' | 'medium' | 'slow' | 'unknown'
 */
export function getConnectionSpeed(): 'fast' | 'medium' | 'slow' | 'unknown' {
  const conn = getNetworkInfo();
  if (!conn) return 'unknown';

  switch (conn.effectiveType) {
    case '4g':
      return 'fast';
    case '3g':
      return 'medium';
    case '2g':
    case 'slow-2g':
      return 'slow';
    default:
      return 'unknown';
  }
}

/**
 * Debounces a function to prevent excessive calls
 * Useful for scroll and resize event handlers
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttles a function to limit execution rate
 * Ensures function runs at most once per specified time period
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
