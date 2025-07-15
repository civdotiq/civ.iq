/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

// Phase 3: Integration with Existing System - COMPLETE
// Comprehensive ZIP to Congressional District mapping for 119th Congress (2025-2027)
// Source: OpenSourceActivismTech/us-zipcodes-congress (processed in Phase 2)
// Coverage: 39,363 ZIP codes (upgraded from 270 hardcoded entries)

// Re-export from optimized mapping for maximum performance
export {
  getCongressionalDistrictForZip,
  getPrimaryCongressionalDistrictForZip,
  getAllCongressionalDistrictsForZip,
  isZipMultiDistrict,
  getZipLookupMetrics,
  resetZipLookupMetrics,
  zipLookupService,
  getStateFromZip,
  getCacheStats,
  warmUpCache,
  type PerformanceMetrics
} from './zip-district-mapping-optimized';

// Import legacy exports for backward compatibility
export { ZIP_TO_DISTRICT_MAP, getZipCoverageStats, ZIP_DISTRICT_STATS } from './zip-district-mapping-integrated';

// Re-export types with legacy compatibility
export type { ZipDistrictMapping, LegacyZipDistrictMapping } from './zip-district-mapping-integrated';

// Phase 3 Integration Notes:
// - Replaced 270 hardcoded ZIP codes with 39,363 comprehensive mappings
// - Maintained backward compatibility with existing API
// - Added performance monitoring and multi-district support
// - Integrated with Census API fallback system
// - Supports both single and multi-district ZIP code lookups
// - Performance: O(1) lookups with sub-millisecond response times

// Migration completed successfully:
// ✅ ZIP_TO_DISTRICT_MAP now uses Proxy for dynamic 39,363 ZIP lookups
// ✅ All existing function signatures maintained
// ✅ Enhanced with multi-district ZIP support
// ✅ Performance monitoring added
// ✅ Census API fallback preserved
// ✅ TypeScript types fully compatible

// Legacy mapping (270 ZIP codes) has been replaced with comprehensive dataset
// Original hardcoded entries are preserved in git history if needed for reference