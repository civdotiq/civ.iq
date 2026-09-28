/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Load maplibre-gl v6 with its worker pointed at the copy that
 * scripts/copy-maplibre-worker.mjs puts in public/maplibre/. Without this
 * the bundled worker fails to load and maps render no layers.
 */
export const MAPLIBRE_WORKER_URL = '/maplibre/maplibre-gl-worker.mjs';

export async function loadMaplibre(): Promise<typeof import('maplibre-gl')> {
  const maplibregl = await import('maplibre-gl');
  maplibregl.setWorkerUrl(MAPLIBRE_WORKER_URL);
  return maplibregl;
}
