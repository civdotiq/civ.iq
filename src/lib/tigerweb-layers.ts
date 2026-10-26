/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * TIGERweb Legislative MapServer layers for the sitting bodies' lines,
 * resolved by name. Client-safe: the district map's boundary tiles and the
 * server boundary service both use it.
 */

import logger from '@/lib/logging/simple-logger';

export const TIGERWEB_BASE =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer';

// Layers in TIGERweb Legislative MapServer for the SITTING bodies' lines
// (see src/lib/census-vintage.ts). Census renumbers layers each vintage
// (Sept 2026: layers 0-2 became the 120th Congress / 2026 legislatures), so
// they are resolved by name; the IDs are only fallbacks.
export const TIGERWEB_SITTING_LAYERS = {
  cd: { name: '119th Congressional Districts', fallback: 4 },
  upper: { name: '2024 State Legislative Districts - Upper', fallback: 5 },
  lower: { name: '2024 State Legislative Districts - Lower', fallback: 6 },
} as const;

const layerIdPromises = new Map<string, Promise<number>>();

/** Resolve a Legislative MapServer layer ID from its name, memoized per name. */
export function resolveTigerwebLayer(name: string, fallback: number): Promise<number> {
  let promise = layerIdPromises.get(name);
  if (!promise) {
    promise = (async () => {
      try {
        const response = await fetch(`${TIGERWEB_BASE}?f=json`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as {
          layers?: Array<{ id: number; name: string }>;
        };
        const layer = data.layers?.find(l => l.name === name);
        if (layer) return layer.id;
        logger.warn('TIGERweb layer not found by name; using fallback', { name, fallback });
      } catch (error) {
        logger.warn('TIGERweb layer list unavailable; using fallback', {
          name,
          error: error instanceof Error ? error.message : String(error),
        });
        layerIdPromises.delete(name); // retry resolution on the next call
      }
      return fallback;
    })();
    layerIdPromises.set(name, promise);
  }
  return promise;
}
