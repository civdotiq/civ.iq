/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  generateShareText,
  generateShareUrl,
  copyTextToClipboard,
  copyImageToClipboard,
  generateOpenGraphTags,
  canNativeShare,
  shareWithFallback
} from '../socialSharing';
import { EnhancedRepresentative } from '@/types/representative';

// Mock ClipboardItem
class MockClipboardItem {
  constructor(data: Record<string, string | Blob | PromiseLike<string | Blob>>) {
    Object.assign(this, data);
  }
  
  static supports = jest.fn().mockReturnValue(true);
}

global.ClipboardItem = MockClipboardItem as any;

// Mock navigator APIs
const mockNavigator = {
  share: jest.fn(),
  canShare: jest.fn(),
  clipboard: {
    writeText: jest.fn(),
    write: jest.fn()
  }
};

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true
});

// Mock window.open
Object.defineProperty(window, 'open', {
  value: jest.fn(),
  writable: true
});

// Mock document.execCommand for clipboard fallback
Object.defineProperty(document, 'execCommand', {
  value: jest.fn().mockReturnValue(true),
  writable: true
});

const mockRepresentative: EnhancedRepresentative = {
  bioguideId: 'S001234',
  name: 'Jane Smith',
  firstName: 'Jane',
  lastName: 'Smith',
  party: 'Democrat',
  state: 'CA',
  district: '12',
  chamber: 'House',
  title: 'U.S. Representative',
  terms: [
    {
      congress: '119',
      startYear: '2025',
      endYear: '2027'
    }
  ]
};

const mockStats = [
  { label: 'Bills Sponsored', value: '42' },
  { label: 'Party Support', value: '87%' },
  { label: 'Committee Roles', value: '3' }
];

describe('socialSharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateShareText', () => {
    it('generates Twitter share text with character limit in mind', () => {
      const text = generateShareText(mockRepresentative, mockStats, 'twitter');
      
      expect(text).toContain("Check out Jane Smith's trading card!");
      expect(text).toContain('Bills Sponsored: 42');
      expect(text).toContain('#CivicEngagement');
      expect(text).toContain('via @CivIQHub');
      expect(text.length).toBeLessThan(280);
    });

    it('generates Facebook share text', () => {
      const text = generateShareText(mockRepresentative, mockStats, 'facebook');
      
      expect(text).toContain("Check out Jane Smith's trading card!");
      expect(text).toContain('Bills Sponsored: 42');
      expect(text).toContain('#CivicEngagement');
    });

    it('generates LinkedIn share text with all stats', () => {
      const text = generateShareText(mockRepresentative, mockStats, 'linkedin');
      
      expect(text).toContain("Check out Jane Smith's trading card!");
      expect(text).toContain('Key Stats:');
      expect(text).toContain('• Bills Sponsored: 42');
      expect(text).toContain('• Party Support: 87%');
      expect(text).toContain('• Committee Roles: 3');
    });

    it('generates email share text', () => {
      const text = generateShareText(mockRepresentative, mockStats, 'email');
      
      expect(text).toContain("I thought you might be interested in Jane Smith's trading card");
      expect(text).toContain('Bills Sponsored: 42');
      expect(text).toContain('Check it out at CIV.IQ!');
    });
  });

  describe('generateShareUrl', () => {
    it('generates Twitter share URL', () => {
      const result = generateShareUrl({
        representative: mockRepresentative,
        stats: mockStats,
        platform: 'twitter'
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('twitter.com/intent/tweet');
      expect(result.url).toContain('text=');
      expect(result.url).toContain('url=');
    });

    it('generates Facebook share URL', () => {
      const result = generateShareUrl({
        representative: mockRepresentative,
        stats: mockStats,
        platform: 'facebook'
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('facebook.com/sharer/sharer.php');
      expect(result.url).toContain('u=');
    });

    it('generates LinkedIn share URL', () => {
      const result = generateShareUrl({
        representative: mockRepresentative,
        stats: mockStats,
        platform: 'linkedin'
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('linkedin.com/sharing/share-offsite');
      expect(result.url).toContain('url=');
    });

    it('generates email share URL', () => {
      const result = generateShareUrl({
        representative: mockRepresentative,
        stats: mockStats,
        platform: 'email'
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('mailto:');
      expect(result.url).toContain('subject=');
      expect(result.url).toContain('body=');
    });
  });

  describe('copyTextToClipboard', () => {
    it('uses navigator.clipboard when available', async () => {
      mockNavigator.clipboard.writeText.mockResolvedValueOnce(undefined);
      
      const result = await copyTextToClipboard('Test text');
      
      expect(result).toBe(true);
      expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith('Test text');
    });

    it('falls back to execCommand when clipboard API unavailable', async () => {
      const originalClipboard = mockNavigator.clipboard;
      delete (mockNavigator as any).clipboard;
      
      const result = await copyTextToClipboard('Test text');
      
      expect(result).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      
      mockNavigator.clipboard = originalClipboard;
    });

    it('returns false on error', async () => {
      mockNavigator.clipboard.writeText.mockRejectedValueOnce(new Error('Failed'));
      
      const result = await copyTextToClipboard('Test text');
      
      expect(result).toBe(false);
    });
  });

  describe('copyImageToClipboard', () => {
    it('copies image blob to clipboard when supported', async () => {
      mockNavigator.clipboard.write.mockResolvedValueOnce(undefined);
      const blob = new Blob(['test'], { type: 'image/png' });
      
      const result = await copyImageToClipboard(blob);
      
      expect(result).toBe(true);
      expect(mockNavigator.clipboard.write).toHaveBeenCalled();
    });

    it('returns false when clipboard API not supported', async () => {
      const originalWrite = mockNavigator.clipboard.write;
      delete (mockNavigator.clipboard as any).write;
      
      const blob = new Blob(['test'], { type: 'image/png' });
      const result = await copyImageToClipboard(blob);
      
      expect(result).toBe(false);
      
      mockNavigator.clipboard.write = originalWrite;
    });
  });

  describe('generateOpenGraphTags', () => {
    it('generates complete Open Graph tags', () => {
      const tags = generateOpenGraphTags(mockRepresentative, 'https://example.com/image.png');
      
      expect(tags['og:title']).toBe("Jane Smith's Trading Card | CIV.IQ");
      expect(tags['og:description']).toContain('View Jane Smith\'s civic trading card');
      expect(tags['og:image']).toBe('https://example.com/image.png');
      expect(tags['og:image:width']).toBe('640');
      expect(tags['og:image:height']).toBe('1000');
      expect(tags['twitter:card']).toBe('summary_large_image');
      expect(tags['twitter:site']).toBe('@CivIQHub');
    });
  });

  describe('canNativeShare', () => {
    it('returns true when native share is available', () => {
      expect(canNativeShare()).toBe(true);
    });

    it('returns false when native share is not available', () => {
      const originalShare = mockNavigator.share;
      delete (mockNavigator as any).share;
      
      expect(canNativeShare()).toBe(false);
      
      mockNavigator.share = originalShare;
    });
  });

  describe('shareWithFallback', () => {
    it('uses native share when available', async () => {
      mockNavigator.canShare.mockReturnValue(true);
      mockNavigator.share.mockResolvedValueOnce(undefined);
      
      const result = await shareWithFallback({
        title: 'Test Title',
        text: 'Test text',
        url: 'https://example.com'
      });
      
      expect(result.success).toBe(true);
      expect(mockNavigator.share).toHaveBeenCalled();
    });

    it('falls back to clipboard when native share unavailable', async () => {
      const originalShare = mockNavigator.share;
      delete (mockNavigator as any).share;
      mockNavigator.clipboard.writeText.mockResolvedValueOnce(undefined);
      
      const result = await shareWithFallback({
        title: 'Test Title',
        text: 'Test text',
        url: 'https://example.com'
      });
      
      expect(result.success).toBe(true);
      expect(mockNavigator.clipboard.writeText).toHaveBeenCalled();
      
      mockNavigator.share = originalShare;
    });

    it('handles user cancellation', async () => {
      mockNavigator.canShare.mockReturnValue(true);
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      mockNavigator.share.mockRejectedValueOnce(abortError);
      
      const result = await shareWithFallback({
        title: 'Test Title',
        text: 'Test text'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Share cancelled');
    });
  });
});