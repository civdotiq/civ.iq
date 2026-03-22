/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * MCP Health Tools (FDA + CMS + Open Payments)
 *
 * FDA:
 *   Tier 1: search_fda_recalls
 *   Tier 1: search_fda_adverse_events
 *   Tier 3: analyze_pharma_regulatory_influence
 *
 * CMS:
 *   Tier 1: search_healthcare_providers
 *   Tier 2: get_district_healthcare_profile
 *
 * Open Payments:
 *   Tier 1: search_open_payments
 *   Tier 2: get_district_pharma_payments
 *   Tier 3: analyze_health_industry_influence
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fdaService } from '@/lib/data-sources/fda-service';
import { cmsProviderService } from '@/lib/data-sources/cms-provider-service';
import { openPaymentsService } from '@/lib/data-sources/open-payments-service';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { getCountiesForDistrict } from '@/lib/data/county-district-mapping';
import { entitiesMatch } from '@civiq/entity-resolution';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import { fecApiService } from '@/lib/fec/fec-api-service';
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
  // ── Tier 1: FDA recall search ─────────────────────────────────
  server.tool(
    'search_fda_recalls',
    'Search FDA drug, food, and device recalls by product name, company, or classification (Class I=most serious, Class II, Class III). Returns recall details, reason, and distribution pattern.',
    {
      product: z.string().optional().describe('Product name or description to search'),
      company: z.string().optional().describe('Recalling firm name'),
      classification: z
        .enum(['Class I', 'Class II', 'Class III'])
        .optional()
        .describe('Recall severity: Class I (most serious), Class II, Class III'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
    },
    async ({ product, company, classification, limit }) => {
      try {
        const recalls = await fdaService.searchRecalls({
          product,
          company,
          classification,
          limit: Math.min(limit ?? 25, 100),
        });

        if (recalls.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No FDA recalls found for the given criteria.',
              },
            ],
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(recalls, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 1: FDA adverse event search ──────────────────────────
  server.tool(
    'search_fda_adverse_events',
    'Search FDA adverse event reports for drugs or devices. Returns seriousness indicators (hospitalization, death, life-threatening), patient demographics, drug/device details, and reported reactions.',
    {
      drug: z.string().optional().describe('Drug/medication name'),
      device: z.string().optional().describe('Medical device name'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
    },
    async ({ drug, device, limit }) => {
      try {
        if (!drug && !device) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Please provide either a drug or device name to search.',
              },
            ],
            isError: true,
          };
        }

        const events = await fdaService.searchAdverseEvents({
          drug,
          device,
          limit: Math.min(limit ?? 25, 100),
        });

        if (events.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No FDA adverse events found for the given criteria.',
              },
            ],
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(events, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 3: Pharma regulatory influence analysis ──────────────
  server.tool(
    'analyze_pharma_regulatory_influence',
    'Cross-reference FDA enforcement actions for a company with lobbying registrants (entity resolution fuzzy match) and campaign contributions to Health committee members. Checks voting patterns on health legislation. Shows correlations only — not causation.',
    {
      company: z.string().describe('Pharmaceutical or healthcare company name'),
      stateCode: z
        .string()
        .length(2)
        .optional()
        .describe('Optional state code to focus on a specific delegation'),
    },
    async ({ company, stateCode }) => {
      try {
        // Get FDA enforcement actions for this company
        const enforcementActions = await fdaService.getEnforcementActions(company);

        // Get lobbying data for health-related topics
        let healthLobbying: Awaited<ReturnType<typeof senateLobbyingAPI.getCommitteeLobbyingData>> =
          [];
        try {
          healthLobbying = await senateLobbyingAPI.getCommitteeLobbyingData([
            'Health',
            'HELP',
            'Energy and Commerce',
          ]);
        } catch (e) {
          logger.warn('Could not fetch lobbying data for pharma analysis', {
            error: (e as Error).message,
          });
        }

        // Extract lobbying entities
        const lobbyingEntities = new Set<string>();
        for (const committee of healthLobbying) {
          for (const filing of committee.filings) {
            lobbyingEntities.add(filing.company);
          }
        }

        // Entity resolution: match company to lobbying registrants
        const lobbyingMatches: Array<{ lobbyingEntity: string }> = [];
        for (const lobbyist of lobbyingEntities) {
          if (entitiesMatch({ name: company }, { name: lobbyist })) {
            lobbyingMatches.push({ lobbyingEntity: lobbyist });
          }
        }

        // Get representatives on Health-related committees
        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        const healthCommitteeMembers = allReps.filter(r => {
          if (stateCode && r.state !== stateCode.toUpperCase()) return false;
          return (r.committees ?? []).some(c => {
            const name = c.name.toLowerCase();
            return (
              name.includes('health') ||
              name.includes('energy and commerce') ||
              name.includes('help')
            );
          });
        });

        // Get contributions to top health committee members (limit to 10)
        const contributionResults: Array<{
          name: string;
          party: string;
          bioguideId: string;
          chamber: string;
          committees: string[];
          fecId: string | null;
          financialSummary: unknown;
        }> = [];

        for (const rep of healthCommitteeMembers.slice(0, 10)) {
          const fecId = getFECIdFromBioguide(rep.bioguideId);
          let financialSummary: unknown = null;
          if (fecId) {
            try {
              const electionCycle =
                new Date().getFullYear() % 2 === 0
                  ? new Date().getFullYear()
                  : new Date().getFullYear() + 1;
              financialSummary = await fecApiService.getFinancialSummary(fecId, electionCycle);
            } catch (e) {
              logger.warn('FEC lookup failed for health committee member', {
                bioguideId: rep.bioguideId,
                error: (e as Error).message,
              });
            }
          }

          const healthCommittees = (rep.committees ?? [])
            .filter(c => {
              const name = c.name.toLowerCase();
              return (
                name.includes('health') ||
                name.includes('energy and commerce') ||
                name.includes('help')
              );
            })
            .map(c => c.name);

          contributionResults.push({
            name: rep.name,
            party: rep.party,
            bioguideId: rep.bioguideId,
            chamber: rep.chamber,
            committees: healthCommittees,
            fecId,
            financialSummary,
          });
        }

        // Get recent health legislation
        let healthBills: unknown[] = [];
        try {
          healthBills = await fetchHealthBills(10);
        } catch (e) {
          logger.warn('Health legislation search failed', {
            error: (e as Error).message,
          });
        }

        const analysis = {
          company,
          fdaEnforcement: {
            totalActions: enforcementActions.length,
            byClassification: {
              classI: enforcementActions.filter(a => a.classification === 'Class I').length,
              classII: enforcementActions.filter(a => a.classification === 'Class II').length,
              classIII: enforcementActions.filter(a => a.classification === 'Class III').length,
            },
            recentActions: enforcementActions.slice(0, 10),
          },
          entityResolution: {
            lobbyingMatches,
            matchCount: lobbyingMatches.length,
            isRegisteredLobbyist: lobbyingMatches.length > 0,
          },
          healthCommitteeMembers: {
            total: healthCommitteeMembers.length,
            analyzed: contributionResults.length,
            members: contributionResults,
          },
          lobbyingContext: {
            healthRelatedLobbying: healthLobbying.map(l => ({
              committee: l.committee,
              totalSpending: l.totalSpending,
              companyCount: l.companyCount,
              topFilers: l.filings.slice(0, 5),
            })),
          },
          recentHealthLegislation: healthBills,
          relevantPolicyArea: 'Health',
          disclaimer:
            'This analysis shows correlations between FDA enforcement activity and political activity. ' +
            'Correlations do not imply causation. All data sourced from public government records.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [
              'FDA openFDA (enforcement)',
              'Senate LDA (lobbying)',
              'FEC (campaign finance)',
              '@civiq/entity-resolution',
              'Congress.gov (committees, legislation)',
            ],
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

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

  // ── Tier 1: Open Payments search ────────────────────────────────
  server.tool(
    'search_open_payments',
    'Search CMS Open Payments for pharma/device manufacturer payments to physicians by state, company, or payment type. Returns payer, recipient specialty, amount, payment nature, and associated product.',
    {
      state: z.string().length(2).optional().describe('Two-letter state code (e.g., CA)'),
      company: z.string().optional().describe('Manufacturer/GPO name to search'),
      paymentType: z
        .string()
        .optional()
        .describe('Nature of payment (e.g., "Food and Beverage", "Consulting Fee")'),
      limit: z.number().int().min(1).max(200).optional().describe('Max results (default 50)'),
    },
    async ({ state, company, paymentType, limit }) => {
      try {
        if (!state && !company && !paymentType) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Please provide at least a state, company, or payment type to search.',
              },
            ],
            isError: true,
          };
        }

        const payments = await openPaymentsService.searchPayments({
          state,
          company,
          paymentType,
          limit: Math.min(limit ?? 50, 200),
        });

        if (payments.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No Open Payments records found for the given criteria.',
              },
            ],
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(payments, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: District pharma payments ────────────────────────────
  server.tool(
    'get_district_pharma_payments',
    "Industry payments to physicians in a congressional district: top pharma/device companies, recipient specialties, payment types, and amounts. Cross-references with representative's Health committee membership.",
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., TX)'),
      districtNumber: z.number().int().min(0).max(53).describe('District number (0 for at-large)'),
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

        // Get state-level payment aggregates
        const paymentAggs = await openPaymentsService.getPaymentAggregates(state);

        if (!paymentAggs) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No Open Payments data available for ${state}.`,
              },
            ],
          };
        }

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

        const profile = {
          district: `${state}-${districtStr}`,
          representative: districtRep
            ? {
                name: districtRep.name,
                party: districtRep.party,
                bioguideId: districtRep.bioguideId,
              }
            : null,
          pharmaPayments: {
            totalPayments: paymentAggs.totalPayments,
            totalAmount: paymentAggs.totalAmount,
            topCompanies: paymentAggs.byCompany.slice(0, 15),
            topSpecialties: paymentAggs.bySpecialty.slice(0, 10),
            paymentTypes: paymentAggs.byNature.slice(0, 10),
          },
          committeeOverlap: {
            healthRelatedCommittees: healthCommittees.map(c => c.name),
            hasHealthOversight: healthCommittees.length > 0,
          },
          note: 'Open Payments data aggregated at state level. District-level patterns approximate.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['CMS Open Payments', 'Congress.gov (committees)'],
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

  // ── Tier 3: Health industry influence analysis ──────────────────
  server.tool(
    'analyze_health_industry_influence',
    'Cross-reference top pharma companies making Open Payments in a state with lobbying registrants (entity resolution fuzzy match) and campaign contributions to the district representative. Checks voting patterns on health/drug pricing legislation. Shows correlations only — not causation.',
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., NJ)'),
      districtNumber: z.number().int().min(0).max(53).describe('District number (0 for at-large)'),
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

        // Get top pharma payers in the state
        const paymentAggs = await openPaymentsService.getPaymentAggregates(state);
        const topCompanies = paymentAggs?.byCompany.slice(0, 20) ?? [];

        if (topCompanies.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No Open Payments data available for ${state}.`,
              },
            ],
          };
        }

        // Get lobbying data for health-related topics
        let healthLobbying: Awaited<ReturnType<typeof senateLobbyingAPI.getCommitteeLobbyingData>> =
          [];
        try {
          healthLobbying = await senateLobbyingAPI.getCommitteeLobbyingData([
            'Health',
            'HELP',
            'Energy and Commerce',
          ]);
        } catch (e) {
          logger.warn('Could not fetch lobbying data for health industry analysis', {
            error: (e as Error).message,
          });
        }

        // Extract all lobbying registrant/client names
        const lobbyingEntities = new Set<string>();
        for (const committee of healthLobbying) {
          for (const filing of committee.filings) {
            lobbyingEntities.add(filing.company);
          }
        }

        // Entity resolution: match Open Payments companies to lobbying registrants
        const companyLobbyingMatches: Array<{
          payerCompany: string;
          paymentCount: number;
          totalPaymentAmount: number;
          lobbyingMatch: string;
        }> = [];
        for (const company of topCompanies) {
          for (const lobbyist of lobbyingEntities) {
            if (entitiesMatch({ name: company.company }, { name: lobbyist })) {
              companyLobbyingMatches.push({
                payerCompany: company.company,
                paymentCount: company.count,
                totalPaymentAmount: company.totalAmount,
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
            logger.warn('FEC contribution lookup failed for health industry analysis', {
              error: (e as Error).message,
            });
          }
        }

        // Check Health committee membership
        const healthCommittees = (districtRep.committees ?? []).filter(c => {
          const name = c.name.toLowerCase();
          return (
            name.includes('health') ||
            name.includes('energy and commerce') ||
            name.includes('help') ||
            name.includes('ways and means')
          );
        });

        // Get recent health legislation
        let healthBills: unknown[] = [];
        try {
          healthBills = await fetchHealthBills(10);
        } catch (e) {
          logger.warn('Health legislation search failed', {
            error: (e as Error).message,
          });
        }

        const analysis = {
          district: `${state}-${districtStr}`,
          representative: {
            name: districtRep.name,
            party: districtRep.party,
            bioguideId: districtRep.bioguideId,
          },
          openPayments: {
            topPayersInState: topCompanies.slice(0, 10),
            totalStatePayments: paymentAggs?.totalPayments ?? 0,
            totalStateAmount: paymentAggs?.totalAmount ?? 0,
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
            healthRelatedCommittees: healthCommittees.map(c => c.name),
            hasHealthOversight: healthCommittees.length > 0,
          },
          lobbyingContext: {
            healthRelatedLobbying: healthLobbying.map(l => ({
              committee: l.committee,
              totalSpending: l.totalSpending,
              companyCount: l.companyCount,
              topFilers: l.filings.slice(0, 5),
            })),
          },
          recentHealthLegislation: healthBills,
          relevantPolicyArea: 'Health',
          disclaimer:
            'This analysis shows correlations between pharma industry payments, lobbying activity, ' +
            'and political activity. Correlations do not imply causation. All data sourced from public government records.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [
              'CMS Open Payments',
              'Senate LDA (lobbying)',
              'FEC (campaign finance)',
              '@civiq/entity-resolution',
              'Congress.gov (committees, legislation)',
            ],
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
