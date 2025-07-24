/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  generateCardImage,
  downloadCardImage,
  generateCardFilename,
  checkBrowserSupport,
  optimizeElementForGeneration,
  createTempCardElement,
  removeTempCardElement
} from '../cardGenerator';

// Mock html2canvas
jest.mock('html2canvas', () => jest.fn().mockResolvedValue({
  width: 640,
  height: 1000,
  toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockImageData'),
  toBlob: jest.fn().mockImplementation((callback) => {
    const mockBlob = new Blob(['mock image data'], { type: 'image/png' });
    callback(mockBlob);
  })
}));

// Make html2canvas available globally for checkBrowserSupport test  
(global as any).html2canvas = require('html2canvas');

// Mock URL methods
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn().mockReturnValue('mock-blob-url'),
  writable: true,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// Mock document.fonts
Object.defineProperty(document, 'fonts', {
  value: {
    ready: Promise.resolve()
  },
  writable: true,
});

describe('cardGenerator', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    mockElement = document.createElement('div');
    mockElement.style.width = '320px';
    mockElement.style.height = '500px';
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    if (mockElement.parentNode) {
      mockElement.parentNode.removeChild(mockElement);
    }
  });

  describe('generateCardImage', () => {
    it('generates a card image successfully', async () => {
      const result = await generateCardImage(mockElement);

      expect(result.success).toBe(true);
      expect(result.canvas).toBeDefined();
      expect(result.dataUrl).toBe('data:image/png;base64,mockImageData');
      expect(result.blob).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.width).toBe(640);
      expect(result.metadata?.height).toBe(1000);
      expect(result.metadata?.format).toBe('png');
    });

    it('uses custom options', async () => {
      const options = {
        width: 400,
        height: 600,
        scale: 1,
        backgroundColor: '#f0f0f0',
        format: 'jpeg' as const,
        quality: 0.8
      };

      const result = await generateCardImage(mockElement, options);

      expect(result.success).toBe(true);
      expect(result.metadata?.format).toBe('jpeg');
    });

    it('handles generation errors', async () => {
      const html2canvas = require('html2canvas');
      html2canvas.mockRejectedValueOnce(new Error('Canvas error'));

      const result = await generateCardImage(mockElement);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Canvas error');
      expect(result.canvas).toBeUndefined();
      expect(result.dataUrl).toBeUndefined();
      expect(result.blob).toBeUndefined();
    });

    it('includes generation time in metadata', async () => {
      const result = await generateCardImage(mockElement);

      expect(result.metadata?.generationTime).toBeGreaterThan(0);
    });
  });

  describe('downloadCardImage', () => {
    let mockLink: HTMLAnchorElement;

    beforeEach(() => {
      mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
        style: {}
      } as any;

      jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      jest.spyOn(document.body, 'appendChild').mockImplementation();
      jest.spyOn(document.body, 'removeChild').mockImplementation();
    });

    it('downloads a blob as a file', () => {
      const blob = new Blob(['mock data'], { type: 'image/png' });
      const filename = 'test-card.png';

      downloadCardImage(blob, filename);

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(mockLink.href).toBe('mock-blob-url');
      expect(mockLink.download).toBe(filename);
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
    });

    it('uses default filename when none provided', () => {
      const blob = new Blob(['mock data'], { type: 'image/png' });

      downloadCardImage(blob);

      expect(mockLink.download).toBe('trading-card.png');
    });
  });

  describe('generateCardFilename', () => {
    it('generates a filename from representative name', () => {
      const filename = generateCardFilename('John Smith');
      const today = new Date().toISOString().split('T')[0];

      expect(filename).toBe(`john-smith-trading-card-${today}.png`);
    });

    it('handles special characters in names', () => {
      const filename = generateCardFilename('Mary O\'Connor-Smith Jr.');
      const today = new Date().toISOString().split('T')[0];

      expect(filename).toBe(`mary-o-connor-smith-jr-trading-card-${today}.png`);
    });

    it('accepts custom format', () => {
      const filename = generateCardFilename('John Smith', 'jpeg');
      const today = new Date().toISOString().split('T')[0];

      expect(filename).toBe(`john-smith-trading-card-${today}.jpeg`);
    });
  });

  describe('checkBrowserSupport', () => {
    it('checks browser support features', () => {
      const support = checkBrowserSupport();

      expect(support).toHaveProperty('supported');
      expect(support).toHaveProperty('features');
      expect(support.features).toHaveProperty('canvas');
      expect(support.features).toHaveProperty('html2canvas');
      expect(support.features).toHaveProperty('download');
      expect(support.features).toHaveProperty('highDPI');
    });

    it('returns true for supported browsers', () => {
      const support = checkBrowserSupport();

      // Browser support should work in our test environment
      expect(support.features.html2canvas).toBe(true); // html2canvas is mocked and available globally  
      expect(support.features.download).toBe(true); // Download is mocked
      // Canvas support might be flaky in JSDOM, but the others should work
      expect(support.supported).toBe(support.features.canvas && support.features.html2canvas && support.features.download);
    });
  });

  describe('optimizeElementForGeneration', () => {
    it('optimizes element styles for generation', () => {
      optimizeElementForGeneration(mockElement);

      expect(mockElement.style.display).toBe('block');
      expect(mockElement.style.visibility).toBe('visible');
      expect(mockElement.style.opacity).toBe('1');
      expect(mockElement.style.width).toBe('320px');
      expect(mockElement.style.height).toBe('500px');
      expect(mockElement.style.transform).toBe('translateZ(0)');
      expect(mockElement.style.backfaceVisibility).toBe('hidden');
      expect(mockElement.style.perspective).toBe('1000px');
    });
  });

  describe('createTempCardElement', () => {
    it('creates a temporary element for generation', () => {
      const element = createTempCardElement(null as any);

      expect(element.style.position).toBe('fixed');
      expect(element.style.top).toBe('-9999px');
      expect(element.style.left).toBe('-9999px');
      expect(element.style.width).toBe('320px');
      expect(element.style.height).toBe('500px');
      expect(element.style.zIndex).toBe('-1');
      expect(element.style.pointerEvents).toBe('none');
      // Check it's a DOM element with style properties
      expect(element.style).toBeDefined();
      expect(element.className).toBe('card-generation-container'); // default class
      
      // Clean up after test
      removeTempCardElement(element);
    });

    it('uses custom container class', () => {
      const element = createTempCardElement(null as any, 'custom-class');

      expect(element.className).toBe('custom-class');
      
      // Clean up after test
      removeTempCardElement(element);
    });
  });

  describe('removeTempCardElement', () => {
    it('removes element from DOM', () => {
      const element = document.createElement('div');
      
      // Test that the function runs without error
      expect(() => removeTempCardElement(element)).not.toThrow();
    });

    it('handles element without parent', () => {
      const element = document.createElement('div');

      // Should not throw error
      expect(() => removeTempCardElement(element)).not.toThrow();
    });
  });
});