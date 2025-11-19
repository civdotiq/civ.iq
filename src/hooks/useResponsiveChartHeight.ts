import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive chart heights
 * Returns appropriate chart height based on viewport size
 *
 * @param desktopHeight - Height for desktop viewports (default: 400)
 * @param mobileHeight - Height for mobile viewports (default: 250)
 * @param breakpoint - Viewport width breakpoint in pixels (default: 768)
 * @returns Responsive height value
 *
 * Usage:
 * ```tsx
 * const chartHeight = useResponsiveChartHeight(400, 250);
 * <ResponsiveContainer width="100%" height={chartHeight}>
 * ```
 */
export function useResponsiveChartHeight(
  desktopHeight: number = 400,
  mobileHeight: number = 250,
  breakpoint: number = 768
): number {
  const [height, setHeight] = useState(desktopHeight);

  useEffect(() => {
    const updateHeight = () => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < breakpoint;
      setHeight(isMobile ? mobileHeight : desktopHeight);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [desktopHeight, mobileHeight, breakpoint]);

  return height;
}
