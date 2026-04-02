/**
 * Shared utilities for transforming comprehensive bill data into legacy response format.
 * Used by both the bills API route and the batch service.
 */

import type { OptimizedBillsResponse } from './optimized-congress.service';

export function createLegacyResponse(result: OptimizedBillsResponse, congress: number) {
  const sponsoredCount = result.metadata?.sponsoredCount || 0;
  const cosponsoredCount = result.metadata?.cosponsoredCount || 0;

  // Separate bills by relationship type
  const sponsoredBills = result.bills.filter(bill => bill.relationship === 'sponsored');
  const cosponsoredBills = result.bills.filter(bill => bill.relationship === 'cosponsored');

  // Remove relationship field from final output for backward compatibility
  const cleanBills = result.bills.map(({ relationship: _relationship, ...bill }) => bill);

  return {
    // Legacy format (keep for backward compatibility)
    sponsoredLegislation: cleanBills,

    // Enhanced format with counts and structure
    sponsored: {
      count: sponsoredCount,
      bills: sponsoredBills.map(({ relationship: _relationship, ...bill }) => bill),
    },
    cosponsored: {
      count: cosponsoredCount,
      bills: cosponsoredBills.map(({ relationship: _relationship, ...bill }) => bill),
    },

    // Summary
    totalSponsored: sponsoredCount,
    totalCosponsored: cosponsoredCount,
    totalBills: result.bills.length,

    // Include pagination info
    pagination: result.pagination,

    metadata: {
      ...result.metadata,
      source: 'Congress.gov API (Comprehensive & Cached)',
      congressLabel: `${congress}th Congress`,
      dataStructure: 'enhanced',
      note: 'Now includes both sponsored AND cosponsored legislation',
    },

    // Progressive loading properties
    progressive: false,
    cached: false,
    loadingComplete: false,
  };
}
