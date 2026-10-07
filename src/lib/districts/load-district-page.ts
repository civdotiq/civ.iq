/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Server data for /districts/[districtId]. The id has already been checked
 * against the seat list, so a miss here is never a 404:
 *
 * - found: the page renders in full on the server.
 * - no-member: the roster has nobody in the seat (a vacancy, or the roster
 *   hasn't caught up). The page says so instead of "not found".
 * - unavailable: a source failed or ran past the budget. The page's browser
 *   fetch takes over, and the server work still fills the cache for next time.
 */

import { getCachedDistrictDetails, type DistrictDetails } from './district-details';
import logger from '@/lib/logging/simple-logger';

export type DistrictPageData =
  | { status: 'found'; district: DistrictDetails }
  | { status: 'no-member' }
  | { status: 'unavailable' };

/**
 * Usually a Redis hit. A cold Census/Wikidata miss measured 2–4.5s; past the
 * budget the browser would start a second cold fetch anyway, so waiting is
 * cheaper than handing off. This only bounds a hung upstream.
 */
const DISTRICT_BUDGET_MS = 8000;

export async function loadDistrictPage(districtId: string): Promise<DistrictPageData> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<DistrictPageData>(resolve => {
    timer = setTimeout(() => {
      logger.warn('[district-page] details over budget; browser will fetch', { districtId });
      resolve({ status: 'unavailable' });
    }, DISTRICT_BUDGET_MS);
  });

  const work = getCachedDistrictDetails(districtId).then(
    (district): DistrictPageData =>
      district ? { status: 'found', district } : { status: 'no-member' },
    (error: unknown): DistrictPageData => {
      logger.warn('[district-page] details failed; browser will fetch', {
        districtId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { status: 'unavailable' };
    }
  );

  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
