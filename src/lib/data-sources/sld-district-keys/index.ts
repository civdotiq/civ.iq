/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Census state legislative district GEOID → OpenStates corpus district
 * string(s). Built by scripts/sync-sld-district-keys.ts; see build-keys.ts.
 */

import keysFile from '@/data/sld-district-keys.json';
import type { SldChamber, SldKey } from './build-keys';

export type { SldChamber, SldKey } from './build-keys';
export { isNonGeographicDistrict } from './build-keys';

interface SldKeysFile {
  vintage: string;
  corpusUpstreamCommit: string;
  upper: Record<string, SldKey>;
  lower: Record<string, SldKey>;
}

const KEYS = keysFile as SldKeysFile;

/** The Census SLD vintage the keys were built from ("2024"). */
export const SLD_KEYS_VINTAGE = KEYS.vintage;

/**
 * The corpus district string(s) for a geocoder GEOID, or null when the GEOID
 * isn't keyed (a New Hampshire gap, or a vintage the keys weren't built from).
 */
export function corpusDistrictsForGeoid(chamber: SldChamber, geoid: string): string[] | null {
  const key = KEYS[chamber][geoid];
  if (key === undefined) return null;
  return Array.isArray(key) ? key : [key];
}
