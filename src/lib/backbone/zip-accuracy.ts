/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ZIP-input accuracy degradation for backbone responses.
 *
 * ZIP codes do not align with congressional district boundaries; 10–20% of ZIPs
 * span multiple districts, and even single-district ZIPs can be wrong after
 * redistricting. When a consumer (SDK, MCP tool, UI) queries by ZIP, we must
 * surface this programmatically — docs are not enough.
 *
 * - For BackboneResponse-shaped routes: `applyZipAccuracyDegradation` wraps
 *   the response, downgrading dataQuality to 'partial' and attaching
 *   `accuracyNote`.
 * - For legacy-shaped routes that cannot be migrated in-place:
 *   `getZipAccuracyNote` returns the note string (or undefined) so the route
 *   can surface it as a sibling field.
 *
 * See: .claude/rules/security.md ("Address, not ZIP")
 * See: memory/feedback_address-not-zip.md
 */

import type { BackboneResponse } from '@/types/backbone-response';

export type InputMode = 'zip' | 'address' | 'lat-lon';

export const ZIP_ACCURACY_NOTE =
  'ZIP-based district lookup is approximate. ZIP boundaries and congressional district boundaries do not align; 10–20% of ZIPs span multiple districts. For authoritative results, provide a full street address.';

/**
 * Apply ZIP-input degradation to a BackboneResponse. If the input was a ZIP,
 * downgrade dataQuality to 'partial' (unless already 'unavailable') and attach
 * the accuracy note. No-op when the input was an address or lat-lon pair.
 */
export function applyZipAccuracyDegradation<T>(
  response: BackboneResponse<T>,
  inputMode: InputMode
): BackboneResponse<T> {
  if (inputMode !== 'zip') return response;
  if (response.dataQuality === 'unavailable') return response;
  return {
    ...response,
    dataQuality: 'partial',
    accuracyNote: ZIP_ACCURACY_NOTE,
  };
}

/**
 * Return the ZIP accuracy note string when the input was a ZIP, otherwise
 * undefined. Use this for routes not yet migrated to BackboneResponse.
 */
export function getZipAccuracyNote(inputMode: InputMode): string | undefined {
  return inputMode === 'zip' ? ZIP_ACCURACY_NOTE : undefined;
}
