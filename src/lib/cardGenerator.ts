/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import html2canvas from 'html2canvas';

export interface CardGenerationOptions {
  width?: number;
  height?: number;
  scale?: number;
  backgroundColor?: string;
  pixelRatio?: number;
  useCORS?: boolean;
  allowTaint?: boolean;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

export interface CardGenerationResult {
  success: boolean;
  canvas?: HTMLCanvasElement;
  dataUrl?: string;
  blob?: Blob;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    scale: number;
    format: string;
    fileSize: number;
    generationTime: number;
  };
}

/**
 * Generate a card image from a DOM element
 */
export async function generateCardImage(
  element: HTMLElement,
  options: CardGenerationOptions = {}
): Promise<CardGenerationResult> {
  const startTime = performance.now();
  
  try {
    // Default options optimized for high-quality card generation
    const defaultOptions = {
      width: 320,
      height: 500,
      scale: window.devicePixelRatio || 2, // High-DPI support
      backgroundColor: '#ffffff',
      pixelRatio: window.devicePixelRatio || 2,
      useCORS: true,
      allowTaint: false,
      format: 'png' as const,
      quality: 0.95
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Configure html2canvas options
    const html2canvasOptions = {
      backgroundColor: finalOptions.backgroundColor,
      width: finalOptions.width,
      height: finalOptions.height,
      scale: finalOptions.scale,
      useCORS: finalOptions.useCORS,
      allowTaint: finalOptions.allowTaint,
      pixelRatio: finalOptions.pixelRatio,
      logging: false, // Disable logging for production
      removeContainer: true,
      // Optimize for better quality
      scrollX: 0,
      scrollY: 0,
      windowWidth: finalOptions.width,
      windowHeight: finalOptions.height,
      // Font loading optimization
      onclone: (clonedDoc: Document) => {
        // Ensure fonts are loaded in the cloned document
        const style = clonedDoc.createElement('style');
        style.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        `;
        clonedDoc.head.appendChild(style);
      }
    };

    // Generate the canvas
    const canvas = await html2canvas(element, html2canvasOptions);
    
    // Create blob with specified format
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        `image/${finalOptions.format}`,
        finalOptions.quality
      );
    });

    const dataUrl = canvas.toDataURL(`image/${finalOptions.format}`, finalOptions.quality);
    const generationTime = performance.now() - startTime;

    return {
      success: true,
      canvas,
      dataUrl,
      blob,
      metadata: {
        width: canvas.width,
        height: canvas.height,
        scale: finalOptions.scale,
        format: finalOptions.format,
        fileSize: blob.size,
        generationTime
      }
    };

  } catch (error) {
    console.error('Card generation failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      metadata: {
        width: 0,
        height: 0,
        scale: 1,
        format: options.format || 'png',
        fileSize: 0,
        generationTime: performance.now() - startTime
      }
    };
  }
}

/**
 * Download a generated card image
 */
export function downloadCardImage(
  blob: Blob,
  filename: string = 'trading-card.png'
): void {
  try {
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download card image');
  }
}

/**
 * Generate a unique filename for the card
 */
export function generateCardFilename(
  representativeName: string,
  format: string = 'png'
): string {
  const cleanName = representativeName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const timestamp = new Date().toISOString().split('T')[0];
  
  return `${cleanName}-trading-card-${timestamp}.${format}`;
}

/**
 * Check if the browser supports the required features
 */
export function checkBrowserSupport(): {
  supported: boolean;
  features: {
    canvas: boolean;
    html2canvas: boolean;
    download: boolean;
    highDPI: boolean;
  };
} {
  const features = {
    canvas: !!document.createElement('canvas').getContext,
    html2canvas: typeof html2canvas !== 'undefined',
    download: 'download' in document.createElement('a'),
    highDPI: window.devicePixelRatio > 1
  };

  return {
    supported: features.canvas && features.html2canvas && features.download,
    features
  };
}

/**
 * Optimize element for card generation
 */
export function optimizeElementForGeneration(element: HTMLElement): void {
  // Force layout recalculation
  element.style.display = 'block';
  element.style.visibility = 'visible';
  element.style.opacity = '1';
  
  // Ensure proper dimensions
  element.style.width = '320px';
  element.style.height = '500px';
  
  // Optimize for rendering
  element.style.transform = 'translateZ(0)'; // Force hardware acceleration
  element.style.backfaceVisibility = 'hidden';
  element.style.perspective = '1000px';
  
  // Wait for fonts to load
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      // Fonts are loaded, element is ready for capture
    });
  }
}

/**
 * Create a temporary element for card generation
 */
export function createTempCardElement(
  cardComponent: React.ReactElement,
  containerClass: string = 'card-generation-container'
): HTMLElement {
  const container = document.createElement('div');
  container.className = containerClass;
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '320px';
  container.style.height = '500px';
  container.style.zIndex = '-1';
  container.style.pointerEvents = 'none';
  
  document.body.appendChild(container);
  
  return container;
}

/**
 * Remove temporary element after generation
 */
export function removeTempCardElement(element: HTMLElement): void {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

export default {
  generateCardImage,
  downloadCardImage,
  generateCardFilename,
  checkBrowserSupport,
  optimizeElementForGeneration,
  createTempCardElement,
  removeTempCardElement
};