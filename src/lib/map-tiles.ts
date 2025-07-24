/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Map Tile Service with Fallback Providers
 *
 * Provides reliable map tiles by implementing fallback chain when primary
 * OpenStreetMap tiles fail (common with proxy authentication issues).
 */

import { useState } from 'react';

// Tile provider configuration
export interface TileProvider {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
  retryAttempts?: number;
}

// Available tile providers (ordered by preference)
export const TILE_PROVIDERS: TileProvider[] = [
  {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    retryAttempts: 2,
  },
  {
    name: 'CartoDB Positron',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd'],
    retryAttempts: 2,
  },
  {
    name: 'Stamen Toner Lite',
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.png',
    attribution:
      'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
    subdomains: ['a', 'b', 'c'],
    retryAttempts: 2,
  },
  {
    name: 'ESRI World Street Map',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxZoom: 17,
    retryAttempts: 2,
  },
];

// Tile service state management
class TileService {
  private currentProviderIndex = 0;
  private failedProviders = new Set<string>();
  private testPromises = new Map<string, Promise<boolean>>();

  /**
   * Get the current working tile provider
   */
  getCurrentProvider(): TileProvider {
    return TILE_PROVIDERS[this.currentProviderIndex];
  }

  /**
   * Test if a tile provider is accessible
   */
  private async testProvider(provider: TileProvider): Promise<boolean> {
    // Return cached result if already testing
    if (this.testPromises.has(provider.name)) {
      return this.testPromises.get(provider.name)!;
    }

    const testPromise = this.performProviderTest(provider);
    this.testPromises.set(provider.name, testPromise);

    return testPromise;
  }

  private async performProviderTest(provider: TileProvider): Promise<boolean> {
    try {
      // Test with a simple tile request (world view, zoom level 1)
      const subdomain = provider.subdomains?.[0] || 'a';
      const testUrl = provider.url
        .replace('{s}', subdomain)
        .replace('{z}', '1')
        .replace('{x}', '0')
        .replace('{y}', '0')
        .replace('{r}', '');

      await fetch(testUrl, {
        method: 'HEAD', // Just check if accessible
        mode: 'no-cors', // Avoid CORS issues
        cache: 'no-cache',
      });

      // For no-cors mode, we can't check the actual status
      // The fetch succeeding means the request was made
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Tile provider ${provider.name} test failed:`, error);
      return false;
    } finally {
      // Clear the test promise after a delay
      setTimeout(() => {
        this.testPromises.delete(provider.name);
      }, 30000); // Clear after 30 seconds
    }
  }

  /**
   * Find the next working tile provider
   */
  async findWorkingProvider(): Promise<TileProvider> {
    // Try current provider first
    const currentProvider = this.getCurrentProvider();
    if (!this.failedProviders.has(currentProvider.name)) {
      if (await this.testProvider(currentProvider)) {
        return currentProvider;
      } else {
        this.failedProviders.add(currentProvider.name);
      }
    }

    // Try other providers
    for (let i = 0; i < TILE_PROVIDERS.length; i++) {
      if (i === this.currentProviderIndex) continue; // Already tried

      const provider = TILE_PROVIDERS[i];
      if (this.failedProviders.has(provider.name)) continue; // Known failure

      if (await this.testProvider(provider)) {
        this.currentProviderIndex = i;
        return provider;
      } else {
        this.failedProviders.add(provider.name);
      }
    }

    // If all providers failed, reset and return the first one
    // (sometimes network issues are temporary)
    this.failedProviders.clear();
    this.currentProviderIndex = 0;
    return TILE_PROVIDERS[0];
  }

  /**
   * Handle tile load errors and switch providers if needed
   */
  async handleTileError(currentProvider: TileProvider): Promise<TileProvider> {
    this.failedProviders.add(currentProvider.name);
    return this.findWorkingProvider();
  }

  /**
   * Reset all failed providers (useful for network recovery)
   */
  reset(): void {
    this.failedProviders.clear();
    this.currentProviderIndex = 0;
    this.testPromises.clear();
  }
}

// Export singleton instance
export const tileService = new TileService();

// React hook for managing tile providers in components
export function useTileProvider() {
  const [currentProvider, setCurrentProvider] = useState<TileProvider>(
    tileService.getCurrentProvider()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Handle tile loading errors
  const handleTileError = async () => {
    setIsLoading(true);
    setRetryCount(prev => prev + 1);

    try {
      const newProvider = await tileService.handleTileError(currentProvider);
      setCurrentProvider(newProvider);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to find working tile provider:', error);
      // Keep current provider as fallback
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize with working provider
  const initializeProvider = async () => {
    setIsLoading(true);
    try {
      const workingProvider = await tileService.findWorkingProvider();
      setCurrentProvider(workingProvider);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize tile provider:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to primary provider
  const reset = () => {
    tileService.reset();
    setCurrentProvider(tileService.getCurrentProvider());
    setRetryCount(0);
  };

  return {
    currentProvider,
    isLoading,
    retryCount,
    handleTileError,
    initializeProvider,
    reset,
  };
}

// Utility function to create tile layer with error handling
export function createTileLayerConfig(provider: TileProvider, onError?: () => void) {
  return {
    url: provider.url,
    attribution: provider.attribution,
    maxZoom: provider.maxZoom,
    subdomains: provider.subdomains,
    errorTileUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Transparent pixel
    onError: onError,
  };
}

// Export default provider for backwards compatibility
export const DEFAULT_TILE_PROVIDER = TILE_PROVIDERS[0];
