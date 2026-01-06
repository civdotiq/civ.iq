/**
 * Representatives Service - Shared data fetching for representatives
 * Used by both API routes and server components
 */

import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { getCongressionalDistrictFromZip } from '@/lib/census-api';
import { getAllCongressionalDistrictsForZip } from '@/lib/data/zip-district-mapping';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative } from '@/types/representative';

/**
 * Get all representatives - direct service call
 */
export async function getAllRepresentativesService(): Promise<EnhancedRepresentative[]> {
  try {
    return await RepresentativesCoreService.getAllRepresentatives();
  } catch (error) {
    logger.error('Error fetching all representatives', error as Error);
    return [];
  }
}

/**
 * Get representatives by ZIP code - direct service call
 */
export async function getRepresentativesByZipService(
  zipCode: string
): Promise<EnhancedRepresentative[]> {
  try {
    // Get ALL district info for this ZIP (handles multi-district ZIPs)
    const allDistrictMappings = getAllCongressionalDistrictsForZip(zipCode);

    let districtInfos: { state: string; district: string }[] = [];

    if (allDistrictMappings && allDistrictMappings.length > 0) {
      districtInfos = allDistrictMappings.map(mapping => ({
        state: mapping.state,
        district: mapping.district,
      }));
    } else {
      // Fallback to Census API
      const districtInfo = await getCongressionalDistrictFromZip(zipCode);
      if (districtInfo) {
        districtInfos = [{ state: districtInfo.state, district: districtInfo.district }];
      }
    }

    if (districtInfos.length === 0) {
      logger.warn('No district found for ZIP', { zipCode });
      return [];
    }

    // Get all representatives
    const allReps = await RepresentativesCoreService.getAllRepresentatives();

    // Get the primary state
    const primaryState = districtInfos[0]?.state;
    const allDistricts = districtInfos.map(d => d.district);

    // Filter to matching representatives
    const matchingReps = allReps.filter(rep => {
      // Include both senators from the state
      if (rep.chamber === 'Senate' && rep.state === primaryState) {
        return true;
      }

      // Include House representatives from matching districts
      if (rep.chamber === 'House' && rep.state === primaryState) {
        // Check if this rep's district matches any of the ZIP's districts
        const repDistrict = rep.district?.toString().padStart(2, '0');
        return allDistricts.some(d => {
          const normalizedD = d.padStart(2, '0');
          return repDistrict === normalizedD || d === '00' || repDistrict === '00';
        });
      }

      return false;
    });

    logger.info('Found representatives for ZIP', {
      zipCode,
      state: primaryState,
      districts: allDistricts,
      count: matchingReps.length,
    });

    return matchingReps;
  } catch (error) {
    logger.error('Error fetching representatives by ZIP', error as Error, { zipCode });
    return [];
  }
}
