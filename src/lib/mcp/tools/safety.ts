/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * MCP Safety Tools (FEMA + FBI + CFPB + HUD + NHTSA)
 *
 * FEMA:
 *   Tier 1: search_fema_disasters
 *   Tier 2: get_district_disaster_history
 *
 * FBI Crime:
 *   Tier 1: search_crime_statistics
 *   Tier 2: get_state_public_safety_profile
 *
 * CFPB Consumer Complaints:
 *   Tier 1: search_consumer_complaints
 *   Tier 2: get_district_consumer_complaints
 *   Tier 3: analyze_consumer_protection_influence
 *
 * HUD Housing:
 *   Tier 1: get_housing_affordability
 *   Tier 2: get_district_housing_profile
 *
 * NHTSA Vehicle Safety:
 *   Tier 1: search_vehicle_recalls
 *   Tier 1: search_vehicle_complaints
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { femaService } from '@/lib/data-sources/fema-service';
import { fbiUcrService } from '@/lib/data-sources/fbi-ucr-service';
import { cfpbComplaintService } from '@/lib/data-sources/cfpb-complaint-service';
import { hudService } from '@/lib/data-sources/hud-service';
import { nhtsaService } from '@/lib/data-sources/nhtsa-service';
import { getCountiesForDistrict } from '@/lib/data/county-district-mapping';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { STATE_FIPS } from '@/app/api/districts/census-helpers';
import { entitiesMatch } from '@civiq/entity-resolution';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import {
  describeCorpusCoverage,
  getCommitteeLobbyingFromCorpus,
} from '@/lib/data-sources/lda-corpus/committee-lobbying';
import type { CommitteeLobbyingData } from '@/lib/data-sources/senate-lobbying-api';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { READ_ONLY_EXTERNAL } from '@/lib/mcp/tool-annotations';
import { coverageOf } from '@/lib/mcp/tools/coverage';
import logger from '@/lib/logging/simple-logger';

/** Rows the district disaster profile asks FEMA for. */
const FEMA_DISASTER_CAP = 200;

export function registerSafetyTools(server: McpServer): void {
  // ── Tier 1: FEMA disaster declaration search ───────────────────
  server.registerTool(
    'search_fema_disasters',
    {
      title: 'FEMA disaster search',
      description:
        'Search FEMA disaster declarations by state, year, or type (DR=Major Disaster, EM=Emergency, FM=Fire Management). Returns declaration number, dates, programs, and designated areas.',
      inputSchema: {
        state: z.string().length(2).describe('Two-letter state code (e.g., CA)'),
        year: z.number().int().min(1953).max(2030).optional().describe('Fiscal year declared'),
        type: z
          .enum(['DR', 'EM', 'FM'])
          .optional()
          .describe('Declaration type: DR (Major Disaster), EM (Emergency), FM (Fire Management)'),
        limit: z.number().int().min(1).max(200).optional().describe('Max results (default 50)'),
      },
      annotations: READ_ONLY_EXTERNAL,
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

        return { content: [{ type: 'text' as const, text: JSON.stringify(disasters) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: District disaster history ──────────────────────────
  server.registerTool(
    'get_district_disaster_history',
    {
      title: 'District disaster history',
      description:
        'Disaster history for a congressional district: FEMA declarations, recurring hazard types, total assistance amounts. Cross-references with USASpending disaster relief in the district.',
      inputSchema: {
        stateCode: z.string().length(2).describe('Two-letter state code (e.g., FL)'),
        districtNumber: z
          .number()
          .int()
          .min(0)
          .max(53)
          .describe('District number (0 for at-large)'),
        yearsBack: z
          .number()
          .int()
          .min(1)
          .max(30)
          .optional()
          .describe('Years of history (default 10)'),
      },
      annotations: READ_ONLY_EXTERNAL,
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
        const disasterResult = await femaService.searchDisastersWithTotal({
          state,
          limit: FEMA_DISASTER_CAP,
        });
        const disasters = disasterResult.items;

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
            // Declarations are filtered down from one bounded statewide fetch,
            // so a disaster-heavy state's district counts are floors. The
            // population here is OpenFEMA's statewide count for the query.
            coverage: coverageOf(
              disasters.length,
              disasterResult.totalAvailable,
              'statewide disaster declarations'
            ),
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

        return { content: [{ type: 'text' as const, text: JSON.stringify(history) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 1: FBI crime statistics search ─────────────────────────
  server.registerTool(
    'search_crime_statistics',
    {
      title: 'Crime statistics search',
      description:
        'FBI UCR crime statistics by state and offense type. Returns actual counts, rates per 100,000, clearances, and national comparison. Offense types: violent-crime, property-crime, HOM, RPE, ROB, ASS, BUR, LAR, MVT, ARS.',
      inputSchema: {
        state: z.string().length(2).describe('Two-letter state code (e.g., CA)'),
        year: z
          .number()
          .int()
          .min(1985)
          .max(2030)
          .optional()
          .describe('Year (default: most recent available)'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ state, year }) => {
      try {
        const stats = await fbiUcrService.getCrimeStatsByState(state, year);

        if (!stats) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No FBI crime data available. DATA_GOV_API_KEY may not be configured.',
              },
            ],
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(stats) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: State public safety profile ─────────────────────────
  server.registerTool(
    'get_state_public_safety_profile',
    {
      title: 'State public safety profile',
      description:
        "State crime trends with national comparison, Judiciary committee memberships from the state's congressional delegation, and relevant policy area context for criminal justice legislation.",
      inputSchema: {
        stateCode: z.string().length(2).describe('Two-letter state code (e.g., TX)'),
        yearsBack: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe('Years of trend data (default 5)'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ stateCode, yearsBack }) => {
      try {
        const state = stateCode.toUpperCase();
        const lookback = yearsBack ?? 5;
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - lookback;

        // Fetch crime trends
        const [violentTrend, propertyTrend] = await Promise.all([
          fbiUcrService.getCrimeTrend(state, startYear, currentYear - 1, 'violent-crime'),
          fbiUcrService.getCrimeTrend(state, startYear, currentYear - 1, 'property-crime'),
        ]);

        // Get state's congressional delegation
        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        const stateDelegation = allReps.filter(r => r.state === state);

        // Find Judiciary committee members
        const judiciaryMembers = stateDelegation.filter(r =>
          (r.committees ?? []).some(c => c.name.toLowerCase().includes('judiciary'))
        );

        const profile = {
          state,
          crimeTrends: {
            violentCrime: {
              dataPoints: violentTrend.length,
              yearRange: `${startYear}-${currentYear - 1}`,
              trend: violentTrend,
            },
            propertyCrime: {
              dataPoints: propertyTrend.length,
              yearRange: `${startYear}-${currentYear - 1}`,
              trend: propertyTrend,
            },
          },
          delegation: {
            judiciaryCommitteeMembers: judiciaryMembers.map(r => ({
              name: r.name,
              party: r.party,
              chamber: r.chamber,
              bioguideId: r.bioguideId,
              committees: (r.committees ?? [])
                .filter(c => c.name.toLowerCase().includes('judiciary'))
                .map(c => c.name),
            })),
          },
          relevantPolicyArea: 'Crime and Law Enforcement',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['FBI Crime Data Explorer (UCR)', 'Congress.gov (committees)'],
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(profile) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 1: CFPB consumer complaint search ──────────────────────
  server.registerTool(
    'search_consumer_complaints',
    {
      title: 'Consumer complaint search',
      description:
        'Search CFPB consumer complaints by company, product, state, or date range. Returns complaint details including issue, response, and timeliness.',
      inputSchema: {
        company: z.string().optional().describe('Company name to filter by'),
        product: z.string().optional().describe('Product type (e.g., "Credit reporting")'),
        state: z.string().length(2).optional().describe('Two-letter state code'),
        dateFrom: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Start date (YYYY-MM-DD)'),
        dateTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('End date (YYYY-MM-DD)'),
        size: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ company, product, state, dateFrom, dateTo, size }) => {
      try {
        const result = await cfpbComplaintService.searchComplaints({
          company,
          product,
          state: state?.toUpperCase(),
          dateReceivedMin: dateFrom,
          dateReceivedMax: dateTo,
          size: Math.min(size ?? 25, 100),
        });

        if (result.complaints.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No consumer complaints found for the given criteria.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ total: result.total, complaints: result.complaints }),
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

  // ── Tier 2: District consumer complaints ────────────────────────
  server.registerTool(
    'get_district_consumer_complaints',
    {
      title: 'District consumer complaints',
      description:
        'Consumer complaints aggregated by congressional district using ZIP-district mapping. Shows top complained-about companies, products, and issues for a district.',
      inputSchema: {
        stateCode: z.string().length(2).describe('Two-letter state code (e.g., PA)'),
        districtNumber: z
          .number()
          .int()
          .min(0)
          .max(53)
          .describe('District number (0 for at-large)'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ stateCode, districtNumber }) => {
      try {
        const state = stateCode.toUpperCase();
        const districtStr = String(districtNumber).padStart(2, '0');

        // Get representative for context
        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        const districtRep = allReps.find(
          r => r.state === state && r.district === districtStr && r.chamber === 'House'
        );

        // Get state-level aggregates (CFPB doesn't filter by ZIP directly,
        // but we can get state data and note the district context)
        const stateAggs = await cfpbComplaintService.getComplaintAggregates(state);

        if (!stateAggs) {
          return {
            content: [
              { type: 'text' as const, text: `No CFPB complaint data available for ${state}.` },
            ],
          };
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
          stateComplaintSummary: {
            totalComplaints: stateAggs.total,
            topProducts: stateAggs.byProduct.slice(0, 10),
            topCompanies: stateAggs.byCompany.slice(0, 10),
            topIssues: stateAggs.byIssue.slice(0, 10),
            responseTimeliness: stateAggs.byTimely,
            submissionChannels: stateAggs.bySubmittedVia,
          },
          note: 'CFPB data aggregated at state level. District-level patterns approximate.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['CFPB Consumer Complaint Database'],
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(profile) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 3: Consumer protection influence analysis ──────────────
  server.registerTool(
    'analyze_consumer_protection_influence',
    {
      title: 'Consumer protection influence',
      description:
        'Cross-reference top complained-about companies in a state with lobbying registrants (entity resolution fuzzy match) and campaign contributions to the district representative. Checks rep votes on Finance-related legislation. Shows correlations only — not causation.',
      inputSchema: {
        stateCode: z.string().length(2).describe('Two-letter state code (e.g., IL)'),
        districtNumber: z
          .number()
          .int()
          .min(0)
          .max(53)
          .describe('District number (0 for at-large)'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ stateCode, districtNumber }) => {
      try {
        const state = stateCode.toUpperCase();
        const districtStr = String(districtNumber).padStart(2, '0');

        // Get representative
        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        const districtRep = allReps.find(
          r => r.state === state && r.district === districtStr && r.chamber === 'House'
        );

        if (!districtRep) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No representative found for ${state}-${districtStr}`,
              },
            ],
            isError: true,
          };
        }

        // Get top complained-about companies in the state
        const stateAggs = await cfpbComplaintService.getComplaintAggregates(state);
        const topCompanies = stateAggs?.byCompany.slice(0, 20) ?? [];

        if (topCompanies.length === 0) {
          return {
            content: [
              { type: 'text' as const, text: `No CFPB complaint data available for ${state}.` },
            ],
          };
        }

        // Get lobbying data for finance-related topics
        let financeLobbying: CommitteeLobbyingData[] = [];
        try {
          financeLobbying = (await getCommitteeLobbyingFromCorpus(['Banking', 'Finance'])) ?? [];
        } catch (e) {
          logger.warn('Could not fetch lobbying data for consumer protection analysis', {
            error: (e as Error).message,
          });
        }

        // Extract all lobbying registrant/client names. `companies` is the
        // rollup over every filing; `filings` is capped for memory, so matching
        // against it would only see the biggest spenders.
        const lobbyingEntities = new Set<string>();
        for (const committee of financeLobbying) {
          const names = committee.companies
            ? committee.companies.map(c => c.name)
            : committee.filings.map(f => f.company);
          for (const name of names) lobbyingEntities.add(name);
        }

        // Entity resolution: fuzzy match CFPB companies to lobbying registrants
        const companyLobbyingMatches: Array<{
          cfpbCompany: string;
          complaintCount: number;
          lobbyingMatch: string;
        }> = [];
        for (const company of topCompanies) {
          for (const lobbyist of lobbyingEntities) {
            if (entitiesMatch({ name: company.company }, { name: lobbyist })) {
              companyLobbyingMatches.push({
                cfpbCompany: company.company,
                complaintCount: company.count,
                lobbyingMatch: lobbyist,
              });
              break; // One match per company is sufficient
            }
          }
        }

        // Get FEC contributions to district rep
        const fecId = getFECIdFromBioguide(districtRep.bioguideId);
        let contributionContext: unknown = null;
        if (fecId) {
          try {
            const electionCycle =
              new Date().getFullYear() % 2 === 0
                ? new Date().getFullYear()
                : new Date().getFullYear() + 1;
            contributionContext = await fecApiService.getFinancialSummary(fecId, electionCycle);
          } catch (e) {
            logger.warn('FEC contribution lookup failed', {
              error: (e as Error).message,
            });
          }
        }

        // Check Finance committee membership
        const financeCommittees = (districtRep.committees ?? []).filter(c => {
          const name = c.name.toLowerCase();
          return (
            name.includes('financial services') ||
            name.includes('banking') ||
            name.includes('finance')
          );
        });

        const analysis = {
          district: `${state}-${districtStr}`,
          representative: {
            name: districtRep.name,
            party: districtRep.party,
            bioguideId: districtRep.bioguideId,
          },
          consumerComplaints: {
            topCompaniesInState: topCompanies.slice(0, 10),
            totalStateComplaints: stateAggs?.total ?? 0,
          },
          entityResolution: {
            companiesMatchedToLobbying: companyLobbyingMatches,
            matchCount: companyLobbyingMatches.length,
            totalCompaniesChecked: topCompanies.length,
          },
          campaignFinance: {
            fecId: fecId ?? 'No FEC mapping',
            financialSummary: contributionContext,
          },
          committeeOverlap: {
            financeRelatedCommittees: financeCommittees.map(c => c.name),
            hasFinanceOversight: financeCommittees.length > 0,
          },
          lobbyingContext: {
            coverage: await describeCorpusCoverage(),
            financeRelatedLobbying: financeLobbying.map(l => ({
              committee: l.committee,
              totalSpending: l.totalSpending,
              companyCount: l.companyCount,
              filingCount: l.filingCount,
              topFilers: (l.companies ?? []).slice(0, 5),
            })),
          },
          relevantPolicyArea: 'Finance and Financial Sector',
          disclaimer:
            'This analysis shows correlations between consumer complaint patterns and political activity. ' +
            'Correlations do not imply causation. All data sourced from public government records.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [
              'CFPB Consumer Complaint Database',
              'Senate LDA (lobbying)',
              'FEC (campaign finance)',
              '@civiq/entity-resolution',
              'Congress.gov (committees)',
            ],
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(analysis) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 1: HUD housing affordability ───────────────────────────
  server.registerTool(
    'get_housing_affordability',
    {
      title: 'Housing affordability data',
      description:
        'HUD Fair Market Rents and income limits by county FIPS code. Returns rental rates by bedroom count and income thresholds (very low, extremely low, low) by household size.',
      inputSchema: {
        countyFips: z
          .string()
          .regex(/^\d{5,10}$/)
          .describe('County FIPS code (e.g., 06037 for Los Angeles County)'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ countyFips }) => {
      try {
        const [fmr, il] = await Promise.all([
          hudService.getFairMarketRents(countyFips),
          hudService.getIncomeLimits(countyFips),
        ]);

        if (!fmr && !il) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No HUD data available. HUD_API_TOKEN may not be configured.',
              },
            ],
          };
        }

        const result = {
          countyFips,
          fairMarketRents: fmr,
          incomeLimits: il,
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['HUD User API (FMR)', 'HUD User API (IL)'],
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: District housing profile ────────────────────────────
  server.registerTool(
    'get_district_housing_profile',
    {
      title: 'District housing profile',
      description:
        "Housing affordability profile for a congressional district: HUD Fair Market Rents and income limits for district counties, representative's Housing committee membership, and relevant housing policy context.",
      inputSchema: {
        stateCode: z.string().length(2).describe('Two-letter state code (e.g., NY)'),
        districtNumber: z
          .number()
          .int()
          .min(0)
          .max(53)
          .describe('District number (0 for at-large)'),
      },
      annotations: READ_ONLY_EXTERNAL,
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

        // Fetch HUD data for district counties (limit to first 5 to avoid rate-limiting)
        const countiesToQuery = countyFipsList.slice(0, 5);
        const hudResults = await Promise.all(
          countiesToQuery.map(async fips => {
            const [fmr, il] = await Promise.all([
              hudService.getFairMarketRents(fips),
              hudService.getIncomeLimits(fips),
            ]);
            return { countyFips: fips, fairMarketRents: fmr, incomeLimits: il };
          })
        );

        const countiesWithData = hudResults.filter(r => r.fairMarketRents ?? r.incomeLimits);

        // Check Housing committee membership
        const housingCommittees = districtRep
          ? (districtRep.committees ?? []).filter(c => {
              const name = c.name.toLowerCase();
              return (
                name.includes('housing') ||
                name.includes('financial services') ||
                name.includes('banking')
              );
            })
          : [];

        const profile = {
          district: `${state}-${districtStr}`,
          representative: districtRep
            ? {
                name: districtRep.name,
                party: districtRep.party,
                bioguideId: districtRep.bioguideId,
              }
            : null,
          housingData: {
            countiesQueried: countiesToQuery.length,
            countiesWithData: countiesWithData.length,
            counties: countiesWithData,
          },
          committeeOverlap: {
            housingRelatedCommittees: housingCommittees.map(c => c.name),
            hasHousingOversight: housingCommittees.length > 0,
          },
          relevantPolicyArea: 'Housing and Community Development',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['HUD User API', 'Congress.gov (committees)'],
            totalCountiesInDistrict: countyFipsList.length,
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(profile) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 1: NHTSA vehicle recall search ─────────────────────────
  server.registerTool(
    'search_vehicle_recalls',
    {
      title: 'Vehicle recall search',
      description:
        'Search NHTSA vehicle recalls by make, model, and/or year. Returns campaign number, affected component, safety summary, consequence, remedy, and whether to park the vehicle immediately.',
      inputSchema: {
        make: z.string().optional().describe('Vehicle make (e.g., Ford, Toyota)'),
        model: z.string().optional().describe('Vehicle model (e.g., F-150, Camry)'),
        year: z.number().int().min(1966).max(2030).optional().describe('Model year'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ make, model, year }) => {
      try {
        if (!make && !model && !year) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Please provide at least a make, model, or year to search recalls.',
              },
            ],
            isError: true,
          };
        }

        const recalls = await nhtsaService.searchRecalls({ make, model, year });

        if (recalls.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No NHTSA vehicle recalls found for the given criteria.',
              },
            ],
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(recalls) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 1: NHTSA vehicle complaint search ──────────────────────
  server.registerTool(
    'search_vehicle_complaints',
    {
      title: 'Vehicle complaint search',
      description:
        'Search NHTSA consumer complaints about vehicles by make, model, and/or component. Returns incident details including injuries, deaths, crashes, fires, and complaint summary.',
      inputSchema: {
        make: z.string().optional().describe('Vehicle make (e.g., Ford, Toyota)'),
        model: z.string().optional().describe('Vehicle model (e.g., F-150, Camry)'),
        component: z
          .string()
          .optional()
          .describe('Vehicle component (e.g., STEERING, BRAKES, AIR BAGS)'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ make, model, component }) => {
      try {
        if (!make && !model) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Please provide at least a make or model to search complaints.',
              },
            ],
            isError: true,
          };
        }

        const complaints = await nhtsaService.searchComplaints({ make, model, component });

        if (complaints.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No NHTSA vehicle complaints found for the given criteria.',
              },
            ],
          };
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(complaints) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
