/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * MCP Health Tools (CMS)
 *
 * CMS:
 *   Tier 1: search_healthcare_providers
 *   Tier 2: get_district_healthcare_profile
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { cmsProviderService } from '@/lib/data-sources/cms-provider-service';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { getCountiesForDistrict } from '@/lib/data/county-district-mapping';
import logger from '@/lib/logging/simple-logger';

/** Fetch recent health-related bills directly from Congress.gov API */
async function fetchHealthBills(limit: number): Promise<unknown[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return [];
  try {
    const url = `https://api.congress.gov/v3/bill/119?format=json&limit=${limit}&sort=updateDate+desc`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
        'X-API-Key': apiKey,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.bills ?? []).filter((b: { policyArea?: { name?: string } }) =>
      b.policyArea?.name?.toLowerCase().includes('health')
    );
  } catch {
    return [];
  }
}

export function registerHealthTools(server: McpServer): void {
  // ── Tier 1: CMS healthcare provider search ────────────────────
  server.tool(
    'search_healthcare_providers',
    'Search CMS hospitals and nursing homes by state with quality ratings. Returns overall star ratings, safety/mortality comparisons for hospitals, and inspection/staffing ratings for nursing homes.',
    {
      state: z.string().length(2).describe('Two-letter state code (e.g., CA)'),
      city: z.string().optional().describe('City name to filter results'),
      type: z
        .enum(['hospital', 'nursing_home', 'both'])
        .optional()
        .describe('Provider type (default: both)'),
    },
    async ({ state, city, type }) => {
      try {
        const providerType = type ?? 'both';
        const stateUpper = state.toUpperCase();

        const results: { hospitals?: unknown[]; nursingHomes?: unknown[] } = {};

        if (providerType === 'hospital' || providerType === 'both') {
          results.hospitals = await cmsProviderService.searchHospitals(stateUpper, city);
        }

        if (providerType === 'nursing_home' || providerType === 'both') {
          results.nursingHomes = await cmsProviderService.searchNursingHomes(stateUpper, city);
        }

        const totalCount = (results.hospitals?.length ?? 0) + (results.nursingHomes?.length ?? 0);

        if (totalCount === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No healthcare providers found for the given criteria.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ total: totalCount, ...results }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: District healthcare profile ───────────────────────
  server.tool(
    'get_district_healthcare_profile',
    "Healthcare infrastructure for a congressional district: CMS hospitals and nursing homes with quality ratings, representative's Health committee membership, and pending health legislation context.",
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., TX)'),
      districtNumber: z.number().int().min(0).max(53).describe('District number (0 for at-large)'),
    },
    async ({ stateCode, districtNumber }) => {
      try {
        const state = stateCode.toUpperCase();
        const districtStr = String(districtNumber).padStart(2, '0');
        const countyFipsList = getCountiesForDistrict(state, districtNumber);

        if (countyFipsList.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No county mapping found for ${state}-${districtStr}`,
              },
            ],
            isError: true,
          };
        }

        // Get representative
        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        const districtRep = allReps.find(
          r => r.state === state && r.district === districtStr && r.chamber === 'House'
        );

        // Get state-level healthcare providers (CMS doesn't filter by county easily)
        const [hospitals, nursingHomes] = await Promise.all([
          cmsProviderService.searchHospitals(state),
          cmsProviderService.searchNursingHomes(state),
        ]);

        // Compute quality summaries
        const hospitalRatings = hospitals
          .map(h => h.overallRating)
          .filter((r): r is number => r !== null);
        const nursingHomeRatings = nursingHomes
          .map(n => n.overallRating)
          .filter((r): r is number => r !== null);

        const avgHospitalRating =
          hospitalRatings.length > 0
            ? hospitalRatings.reduce((a, b) => a + b, 0) / hospitalRatings.length
            : null;
        const avgNursingHomeRating =
          nursingHomeRatings.length > 0
            ? nursingHomeRatings.reduce((a, b) => a + b, 0) / nursingHomeRatings.length
            : null;

        // Check Health committee membership
        const healthCommittees = districtRep
          ? (districtRep.committees ?? []).filter(c => {
              const name = c.name.toLowerCase();
              return (
                name.includes('health') ||
                name.includes('energy and commerce') ||
                name.includes('help') ||
                name.includes('ways and means')
              );
            })
          : [];

        // Get recent health legislation
        let healthBills: unknown[] = [];
        try {
          healthBills = await fetchHealthBills(5);
        } catch (e) {
          logger.warn('Health legislation search failed', {
            error: (e as Error).message,
          });
        }

        // Cross-reference with healthcare spending via USASpending
        let healthcareSpending: unknown[] = [];
        try {
          const spendingResponse = await fetch(
            'https://api.usaspending.gov/api/v2/search/spending_by_award/',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filters: {
                  place_of_performance_locations: [
                    {
                      country: 'USA',
                      state,
                      ...(districtNumber > 0 ? { congressional_code: districtStr } : {}),
                    },
                  ],
                  agencies: [
                    {
                      type: 'funding',
                      tier: 'toptier',
                      name: 'Department of Health and Human Services',
                    },
                  ],
                  time_period: [
                    {
                      start_date: `${new Date().getFullYear() - 2}-01-01`,
                      end_date: new Date().toISOString().split('T')[0],
                    },
                  ],
                },
                fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Award Type', 'Description'],
                limit: 10,
                page: 1,
                sort: 'Award Amount',
                order: 'desc',
              }),
              signal: AbortSignal.timeout(15_000),
            }
          );

          if (spendingResponse.ok) {
            const spendingData = await spendingResponse.json();
            healthcareSpending = spendingData.results ?? [];
          }
        } catch (e) {
          logger.warn('USASpending healthcare cross-reference failed', {
            error: (e as Error).message,
          });
        }

        const profile = {
          district: `${state}-${districtStr}`,
          representative: districtRep
            ? {
                name: districtRep.name,
                party: districtRep.party,
                bioguideId: districtRep.bioguideId,
              }
            : null,
          healthcareInfrastructure: {
            hospitals: {
              total: hospitals.length,
              withEmergencyServices: hospitals.filter(h => h.emergencyServices).length,
              averageOverallRating: avgHospitalRating
                ? Math.round(avgHospitalRating * 10) / 10
                : null,
              ratingDistribution: {
                fiveStar: hospitalRatings.filter(r => r === 5).length,
                fourStar: hospitalRatings.filter(r => r === 4).length,
                threeStar: hospitalRatings.filter(r => r === 3).length,
                twoStar: hospitalRatings.filter(r => r === 2).length,
                oneStar: hospitalRatings.filter(r => r === 1).length,
              },
            },
            nursingHomes: {
              total: nursingHomes.length,
              averageOverallRating: avgNursingHomeRating
                ? Math.round(avgNursingHomeRating * 10) / 10
                : null,
              inSpecialFocusProgram: nursingHomes.filter(n => n.inSpecialFocusFacilityProgram)
                .length,
              withAbuseFlags: nursingHomes.filter(n => n.abuseIcon !== null).length,
            },
          },
          committeeOverlap: {
            healthRelatedCommittees: healthCommittees.map(c => c.name),
            hasHealthOversight: healthCommittees.length > 0,
          },
          recentHealthLegislation: healthBills,
          federalSpending: {
            source: 'USASpending.gov',
            agency: 'Department of Health and Human Services',
            topAwards: healthcareSpending,
          },
          note: 'CMS data aggregated at state level. District-level patterns approximate based on county mapping.',
          relevantPolicyArea: 'Health',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [
              'CMS Hospital Compare',
              'CMS Nursing Home Compare',
              'Congress.gov (committees, legislation)',
              'USASpending.gov',
            ],
            totalCountiesInDistrict: countyFipsList.length,
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(profile, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
