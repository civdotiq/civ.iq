/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Contributor Aggregation Service
 * Shared logic for processing and deduplicating FEC contributions
 * Used by both /finance and /finance/comprehensive endpoints
 */

import { FECContribution } from '@/lib/fec/fec-api-service';
import { standardizeEmployerName } from '@/lib/fec/entity-resolution';

export interface AggregatedContributor {
  name: string;
  totalAmount: number;
  contributionCount: number;
  occupations: Set<string>;
  employers: Set<string>;
}

export interface ContributorAggregationOptions {
  excludeConduits?: boolean;
  excludeCandidate?: string;
  limit?: number;
  minAmount?: number;
}

/**
 * Aggregate contributions by contributor name with deduplication
 * Combines contributions from the same person/org across multiple records
 */
export function aggregateContributors(
  contributions: FECContribution[],
  options: ContributorAggregationOptions = {}
): AggregatedContributor[] {
  const { excludeConduits = false, excludeCandidate, limit = 50, minAmount = 0 } = options;

  const map = new Map<string, AggregatedContributor>();

  // Known conduit organizations to filter
  const conduitNames = new Set(['ACTBLUE', 'WINRED', 'ANEDOT']);

  for (const contrib of contributions) {
    const contributorName = contrib.contributor_name?.trim().toUpperCase() || 'UNKNOWN';

    // Skip if filtering conduits and this is a conduit
    if (excludeConduits && conduitNames.has(contributorName)) {
      continue;
    }

    // Skip candidate self-contributions if specified
    if (excludeCandidate && contributorName.includes(excludeCandidate.toUpperCase())) {
      continue;
    }

    const amount = contrib.contribution_receipt_amount || 0;

    // Skip contributions below minimum amount
    if (amount < minAmount) {
      continue;
    }

    if (!map.has(contributorName)) {
      map.set(contributorName, {
        name: contributorName,
        totalAmount: 0,
        contributionCount: 0,
        occupations: new Set(),
        employers: new Set(),
      });
    }

    const aggregated = map.get(contributorName)!;
    aggregated.totalAmount += amount;
    aggregated.contributionCount += 1;

    // Track occupations and employers
    if (contrib.contributor_occupation) {
      aggregated.occupations.add(contrib.contributor_occupation);
    }
    if (contrib.contributor_employer) {
      const standardizedEmployer = standardizeEmployerName(contrib.contributor_employer);
      aggregated.employers.add(standardizedEmployer);
    }
  }

  // Convert to array and sort by total amount
  return Array.from(map.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

/**
 * Aggregate contributions by employer with standardization
 * Deduplicates similar employer names (e.g., "GOOGLE INC" vs "GOOGLE LLC")
 */
export function aggregateByEmployer(
  contributions: FECContribution[],
  options: ContributorAggregationOptions = {}
): Array<{ employer: string; totalAmount: number; count: number }> {
  const { excludeCandidate, limit = 50 } = options;

  const employerMap = new Map<string, { totalAmount: number; count: number }>();

  for (const contrib of contributions) {
    const contributorName = contrib.contributor_name?.trim().toUpperCase() || '';

    // Skip candidate self-contributions
    if (excludeCandidate && contributorName.includes(excludeCandidate.toUpperCase())) {
      continue;
    }

    if (!contrib.contributor_employer) continue;

    const standardized = standardizeEmployerName(contrib.contributor_employer);
    const amount = contrib.contribution_receipt_amount || 0;

    if (!employerMap.has(standardized)) {
      employerMap.set(standardized, { totalAmount: 0, count: 0 });
    }

    const agg = employerMap.get(standardized)!;
    agg.totalAmount += amount;
    agg.count += 1;
  }

  return Array.from(employerMap.entries())
    .map(([employer, data]) => ({
      employer,
      totalAmount: data.totalAmount,
      count: data.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

/**
 * Calculate total contribution amount excluding specific contributors
 */
export function calculateTotalExcluding(
  contributions: FECContribution[],
  excludeNames: string[]
): number {
  const excludeSet = new Set(excludeNames.map(name => name.toUpperCase()));

  return contributions.reduce((total, contrib) => {
    const contributorName = contrib.contributor_name?.trim().toUpperCase() || '';

    // Skip if contributor is in exclude list
    if (excludeSet.has(contributorName)) {
      return total;
    }

    // Skip if contributor name contains any excluded name
    for (const excludeName of excludeSet) {
      if (contributorName.includes(excludeName)) {
        return total;
      }
    }

    return total + (contrib.contribution_receipt_amount || 0);
  }, 0);
}
