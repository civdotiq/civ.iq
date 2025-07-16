/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { EnhancedRepresentative } from '@/types/representative';

export interface ShareOptions {
  representative: EnhancedRepresentative;
  stats: Array<{ label: string; value: string | number }>;
  imageUrl?: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'copy' | 'email';
}

export interface ShareResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Generate share text for social media posts
 */
export function generateShareText(
  representative: EnhancedRepresentative,
  stats: Array<{ label: string; value: string | number }>,
  platform: 'twitter' | 'facebook' | 'linkedin' | 'email'
): string {
  const baseText = `Check out ${representative.name}'s trading card!`;
  const statsText = stats.slice(0, 2).map(s => `${s.label}: ${s.value}`).join(' • ');
  const hashtags = ['CivicEngagement', 'KnowYourRep', 'CivIQ'];
  
  switch (platform) {
    case 'twitter':
      // Twitter has 280 character limit
      const twitterHashtags = hashtags.map(h => `#${h}`).join(' ');
      return `${baseText}\n\n${statsText}\n\n${twitterHashtags}\n\nvia @CivIQHub`;
      
    case 'facebook':
      return `${baseText}\n\n${statsText}\n\n${hashtags.map(h => `#${h}`).join(' ')}`;
      
    case 'linkedin':
      return `${baseText}\n\nKey Stats:\n${stats.map(s => `• ${s.label}: ${s.value}`).join('\n')}\n\n${hashtags.map(h => `#${h}`).join(' ')}`;
      
    case 'email':
      return `I thought you might be interested in ${representative.name}'s trading card from CIV.IQ.\n\n${stats.map(s => `${s.label}: ${s.value}`).join('\n')}\n\nCheck it out at CIV.IQ!`;
      
    default:
      return baseText;
  }
}

/**
 * Generate share URL for different platforms
 */
export function generateShareUrl(options: ShareOptions): ShareResult {
  const { representative, stats, platform } = options;
  const shareText = generateShareText(representative, stats, platform);
  const encodedText = encodeURIComponent(shareText);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://civiq.org';
  const encodedUrl = encodeURIComponent(pageUrl);
  
  try {
    let shareUrl: string;
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
        
      case 'facebook':
        // Facebook doesn't support pre-filled text anymore, only URL
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
        
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
        
      case 'email':
        const subject = encodeURIComponent(`${representative.name}'s Trading Card`);
        shareUrl = `mailto:?subject=${subject}&body=${encodedText}%0A%0A${encodedUrl}`;
        break;
        
      default:
        return {
          success: false,
          error: `Unsupported platform: ${platform}`
        };
    }
    
    return {
      success: true,
      url: shareUrl
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate share URL'
    };
  }
}

/**
 * Open share dialog in new window
 */
export function openShareWindow(url: string, platform: string): void {
  const width = 600;
  const height = 400;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  
  window.open(
    url,
    `${platform}-share`,
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
}

/**
 * Copy image to clipboard
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      throw new Error('Clipboard API not supported');
    }
    
    const clipboardItem = new ClipboardItem({
      'image/png': blob
    });
    
    await navigator.clipboard.write([clipboardItem]);
    return true;
    
  } catch (error) {
    console.error('Failed to copy image:', error);
    return false;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

/**
 * Generate Open Graph meta tags for card sharing
 */
export function generateOpenGraphTags(
  representative: EnhancedRepresentative,
  imageUrl: string
): Record<string, string> {
  const title = `${representative.name}'s Trading Card | CIV.IQ`;
  const description = `View ${representative.name}'s civic trading card featuring key statistics and achievements. ${representative.title} representing ${representative.state}-${representative.district || 'At Large'}.`;
  
  return {
    'og:title': title,
    'og:description': description,
    'og:image': imageUrl,
    'og:image:width': '640',
    'og:image:height': '1000',
    'og:type': 'website',
    'og:site_name': 'CIV.IQ - Civic Intelligence Hub',
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': imageUrl,
    'twitter:site': '@CivIQHub'
  };
}

/**
 * Check if platform supports native sharing
 */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && 
         'share' in navigator && 
         'canShare' in navigator;
}

/**
 * Native share with fallback
 */
export async function shareWithFallback(
  options: {
    title: string;
    text: string;
    url?: string;
    files?: File[];
  }
): Promise<ShareResult> {
  try {
    if (canNativeShare()) {
      // Check if we can share files
      if (options.files && navigator.canShare && !navigator.canShare({ files: options.files })) {
        // Remove files if not supported
        delete options.files;
      }
      
      await navigator.share(options);
      return { success: true };
    } else {
      // Fallback to copying to clipboard
      const shareText = `${options.title}\n\n${options.text}${options.url ? `\n\n${options.url}` : ''}`;
      const copied = await copyTextToClipboard(shareText);
      
      return {
        success: copied,
        error: copied ? undefined : 'Failed to copy to clipboard'
      };
    }
  } catch (error) {
    // User cancelled or error occurred
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Share cancelled' };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Share failed'
    };
  }
}