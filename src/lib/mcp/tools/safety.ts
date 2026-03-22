/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * MCP Safety Tools (FEMA)
 *
 * Tier 1: search_fema_disasters — raw FEMA disaster declaration query
 * Tier 2: get_district_disaster_history — district-joined disaster + USASpending data
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { femaService } from '@/lib/data-sources/fema-service';
import { getCountiesForDistrict } from '@/lib/data/county-district-mapping';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { STATE_FIPS } from '@/app/api/districts/census-helpers';
import logger from '@/lib/logging/simple-logger';

export function registerSafetyTools(server: McpServer): void {
  // ── Tier 1: FEMA disaster declaration search ───────────────────
  server.tool(
    'search_fema_disasters',
    'Search FEMA disaster declarations by state, year, or type (DR=Major Disaster, EM=Emergency, FM=Fire Management). Returns declaration number, dates, programs, and designated areas.',
    {
      state: z.string().length(2).describe('Two-letter state code (e.g., CA)'),
      year: z.number().int().min(1953).max(2030).optional().describe('Fiscal year declared'),
      type: z
        .enum(['DR', 'EM', 'FM'])
        .optional()
        .describe('Declaration type: DR (Major Disaster), EM (Emergency), FM (Fire Management)'),
      limit: z.number().int().min(1).max(200).optional().describe('Max results (default 50)'),
    },
    async ({ state, year, type, limit }) => {
      try {
        const disasters = await femaService.searchDisasters({
          state: state.toUpperCase(),
          year,
          type,
          limit: Math.min(limit ?? 50, 200),
        });

        if (disasters.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No FEMA disaster declarations found for the given criteria.',
              },
            ],
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(disasters, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: District disaster history ──────────────────────────
  server.tool(
    'get_district_disaster_history',
    'Disaster history for a congressional district: FEMA declarations, recurring hazard types, total assistance amounts. Cross-references with USASpending disaster relief in the district.',
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., FL)'),
      districtNumber: z.number().int().min(0).max(53).describe('District number (0 for at-large)'),
      yearsBack: z
        .number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .describe('Years of history (default 10)'),
    },
    async ({ stateCode, districtNumber, yearsBack }) => {
      try {
        const state = stateCode.toUpperCase();
        const districtStr = String(districtNumber).padStart(2, '0');
        const lookback = yearsBack ?? 10;
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

        // Get state FIPS for county matching
        const stateFips = STATE_FIPS[state] ?? '';

        // Fetch disasters for the state over the lookback period
        const currentYear = new Date().getFullYear();
        const disasters = await femaService.searchDisasters({
          state,
          limit: 200,
        });

        // Filter to lookback period
        const recentDisasters = disasters.filter(d => d.fyDeclared >= currentYear - lookback);

        // Filter disasters to those affecting this district's counties
        // FEMA county FIPS is the 3-digit county code (no state prefix)
        const districtCountyCodes = new Set(
          countyFipsList.map(f => f.slice(2)) // strip 2-digit state FIPS prefix
        );
        const districtDisasters = recentDisasters.filter(d => {
          // If countyCode is "000", it's statewide — include it
          if (d.fipsCountyCode === '000') return true;
          return districtCountyCodes.has(d.fipsCountyCode);
        });

        // Aggregate by hazard type
        const hazardCounts: Record<string, number> = {};
        for (const d of districtDisasters) {
          hazardCounts[d.incidentType] = (hazardCounts[d.incidentType] ?? 0) + 1;
        }
        const recurringHazards = Object.entries(hazardCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({ type, count }));

        // Fetch assistance amounts for top disasters
        const uniqueDisasterNumbers = [
          ...new Set(districtDisasters.map(d => d.disasterNumber)),
        ].slice(0, 10);

        const assistancePromises = uniqueDisasterNumbers.map(n =>
          femaService.getDisasterAssistance(n)
        );
        const assistanceResults = await Promise.all(assistancePromises);

        let totalIhpApproved = 0;
        let totalPaObligated = 0;
        let totalHmgp = 0;
        for (const a of assistanceResults) {
          if (a) {
            totalIhpApproved += a.totalAmountIhpApproved ?? 0;
            totalPaObligated += a.totalObligatedAmountPa ?? 0;
            totalHmgp += a.totalObligatedAmountHmgp ?? 0;
          }
        }

        // Cross-reference with USASpending disaster relief
        let usaSpendingDisasterRelief: unknown[] = [];
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
                    { type: 'funding', tier: 'toptier', name: 'Department of Homeland Security' },
                  ],
                  time_period: [
                    {
                      start_date: `${currentYear - lookback}-01-01`,
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
            usaSpendingDisasterRelief = spendingData.results ?? [];
          }
        } catch (e) {
          logger.warn('USASpending disaster relief cross-reference failed', {
            error: (e as Error).message,
          });
        }

        const history = {
          district: `${state}-${districtStr}`,
          representative: districtRep
            ? {
                name: districtRep.name,
                party: districtRep.party,
                bioguideId: districtRep.bioguideId,
              }
            : null,
          summary: {
            totalDeclarations: districtDisasters.length,
            yearsAnalyzed: lookback,
            uniqueDisasters: uniqueDisasterNumbers.length,
            recurringHazards,
          },
          assistance: {
            totalIndividualHouseholdAssistance: totalIhpApproved,
            totalPublicAssistanceObligated: totalPaObligated,
            totalHazardMitigationGrants: totalHmgp,
          },
          declarations: districtDisasters.slice(0, 30).map(d => ({
            declaration: d.femaDeclarationString,
            title: d.declarationTitle,
            type: d.declarationType,
            incidentType: d.incidentType,
            declarationDate: d.declarationDate,
            incidentBegin: d.incidentBeginDate,
            incidentEnd: d.incidentEndDate,
            area: d.designatedArea,
            programs: {
              individualAssistance: d.iaProgramDeclared,
              publicAssistance: d.paProgramDeclared,
              hazardMitigation: d.hmProgramDeclared,
            },
          })),
          federalSpending: {
            source: 'USASpending.gov',
            topAwards: usaSpendingDisasterRelief,
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['FEMA OpenAPI', 'FemaWebDisasterSummaries', 'USASpending.gov'],
            countyCount: countyFipsList.length,
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(history, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
