/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * MCP Economy Tools (EIA + College Scorecard + NIH Reporter + FDIC + Treasury)
 *
 * EIA Energy:
 *   Tier 1: get_state_energy_profile
 *   Tier 3: analyze_energy_policy_influence
 *
 * College Scorecard:
 *   Tier 1: search_colleges
 *   Tier 2: get_district_education_profile
 *
 * NIH Reporter:
 *   Tier 1: search_nih_grants
 *   Tier 2: get_district_research_profile
 *
 * FDIC BankFind:
 *   Tier 1: search_fdic_institutions
 *   Tier 2: get_district_banking_profile
 *
 * Treasury Fiscal Data:
 *   Tier 1: get_federal_fiscal_data
 *   Tier 1: get_federal_debt_context
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { eiaService } from '@/lib/data-sources/eia-service';
import { collegeScorecardService } from '@/lib/data-sources/college-scorecard-service';
import { nihReporterService } from '@/lib/data-sources/nih-reporter-service';
import { fdicService } from '@/lib/data-sources/fdic-service';
import { treasuryFiscalService } from '@/lib/data-sources/treasury-fiscal-service';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { getCountiesForDistrict } from '@/lib/data/county-district-mapping';
import { entitiesMatch } from '@civiq/entity-resolution';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import { fecApiService } from '@/lib/fec/fec-api-service';
import logger from '@/lib/logging/simple-logger';

/** Fetch recent energy-related bills directly from Congress.gov API */
async function fetchEnergyBills(limit: number): Promise<unknown[]> {
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
      b.policyArea?.name?.toLowerCase().includes('energy')
    );
  } catch {
    return [];
  }
}

export function registerEconomyTools(server: McpServer): void {
  // ── Tier 1: EIA state energy profile ────────────────────────────
  server.tool(
    'get_state_energy_profile',
    'State energy profile from EIA: total consumption, production, electricity generation, renewable percentage, and top energy sources. Returns production mix and trends.',
    {
      state: z.string().length(2).describe('Two-letter state code (e.g., TX)'),
    },
    async ({ state }) => {
      try {
        const profile = await eiaService.getStateEnergyProfile(state);

        if (!profile) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No EIA energy data available. EIA_API_KEY may not be configured.',
              },
            ],
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(profile, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 3: Energy policy influence analysis ────────────────────
  server.tool(
    'analyze_energy_policy_influence',
    'Cross-reference state energy profile with energy sector lobbying registrants (entity resolution fuzzy match), Energy/Commerce committee membership, campaign contributions, and energy legislation votes. Shows correlations only — not causation.',
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

        // Get state energy profile
        const energyProfile = await eiaService.getStateEnergyProfile(state);

        // Get energy sector lobbying data
        let energyLobbying: Awaited<ReturnType<typeof senateLobbyingAPI.getCommitteeLobbyingData>> =
          [];
        try {
          energyLobbying = await senateLobbyingAPI.getCommitteeLobbyingData([
            'Energy',
            'Energy and Commerce',
            'Energy and Natural Resources',
          ]);
        } catch (e) {
          logger.warn('Could not fetch lobbying data for energy analysis', {
            error: (e as Error).message,
          });
        }

        // Entity resolution: match top energy sources to lobbying registrants
        const lobbyingEntities = new Set<string>();
        for (const committee of energyLobbying) {
          for (const filing of committee.filings) {
            lobbyingEntities.add(filing.company);
          }
        }

        const topSourceNames = (energyProfile?.topSources ?? []).slice(0, 5).map(s => s.source);

        const sourceMatches: Array<{ source: string; lobbyingMatch: string }> = [];
        for (const source of topSourceNames) {
          for (const lobbyist of lobbyingEntities) {
            if (entitiesMatch({ name: source }, { name: lobbyist })) {
              sourceMatches.push({ source, lobbyingMatch: lobbyist });
              break;
            }
          }
        }

        // Get FEC contributions
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
            logger.warn('FEC contribution lookup failed for energy analysis', {
              error: (e as Error).message,
            });
          }
        }

        // Check Energy committee membership
        const energyCommittees = (districtRep.committees ?? []).filter(c => {
          const name = c.name.toLowerCase();
          return (
            name.includes('energy') ||
            name.includes('natural resources') ||
            name.includes('science')
          );
        });

        // Get recent energy legislation
        let energyBills: unknown[] = [];
        try {
          energyBills = await fetchEnergyBills(10);
        } catch (e) {
          logger.warn('Energy legislation search failed', {
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
          stateEnergyProfile: energyProfile,
          entityResolution: {
            sourceToLobbyingMatches: sourceMatches,
            matchCount: sourceMatches.length,
          },
          campaignFinance: {
            fecId: fecId ?? 'No FEC mapping',
            financialSummary: contributionContext,
          },
          committeeOverlap: {
            energyRelatedCommittees: energyCommittees.map(c => c.name),
            hasEnergyOversight: energyCommittees.length > 0,
          },
          lobbyingContext: {
            energyRelatedLobbying: energyLobbying.map(l => ({
              committee: l.committee,
              totalSpending: l.totalSpending,
              companyCount: l.companyCount,
              topFilers: l.filings.slice(0, 5),
            })),
          },
          recentEnergyLegislation: energyBills,
          relevantPolicyArea: 'Energy',
          disclaimer:
            'This analysis shows correlations between energy industry data and political activity. ' +
            'Correlations do not imply causation. All data sourced from public government records.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [
              'EIA (Energy Information Administration)',
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

  // ── Tier 1: College Scorecard search ────────────────────────────
  server.tool(
    'search_colleges',
    'Search College Scorecard for higher education institutions by state and/or name. Returns admission rate, graduation rate, average net price, median earnings, median debt, and size.',
    {
      state: z.string().length(2).optional().describe('Two-letter state code (e.g., MA)'),
      name: z.string().optional().describe('Institution name (partial match)'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
    },
    async ({ state, name, limit }) => {
      try {
        if (!state && !name) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Please provide at least a state or institution name.',
              },
            ],
            isError: true,
          };
        }

        const institutions = await collegeScorecardService.searchInstitutions({
          state,
          name,
          limit: Math.min(limit ?? 25, 100),
        });

        if (institutions.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No institutions found. DATA_GOV_API_KEY may not be configured.',
              },
            ],
          };
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(institutions, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: District education profile ──────────────────────────
  server.tool(
    'get_district_education_profile',
    "Higher education landscape for a congressional district: colleges/universities by state with outcomes data, representative's Education committee membership, and relevant education policy context.",
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., OH)'),
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

        // Get state institutions
        const institutions = await collegeScorecardService.searchInstitutions({
          state,
          limit: 50,
        });

        // Compute summary statistics
        const withEarnings = institutions.filter(i => i.medianEarnings !== null);
        const avgMedianEarnings =
          withEarnings.length > 0
            ? Math.round(
                withEarnings.reduce((sum, i) => sum + (i.medianEarnings ?? 0), 0) /
                  withEarnings.length
              )
            : null;

        const withDebt = institutions.filter(i => i.medianDebt !== null);
        const avgMedianDebt =
          withDebt.length > 0
            ? Math.round(
                withDebt.reduce((sum, i) => sum + (i.medianDebt ?? 0), 0) / withDebt.length
              )
            : null;

        const withCompletion = institutions.filter(i => i.completionRate !== null);
        const avgCompletionRate =
          withCompletion.length > 0
            ? Math.round(
                (withCompletion.reduce((sum, i) => sum + (i.completionRate ?? 0), 0) /
                  withCompletion.length) *
                  1000
              ) / 10
            : null;

        // Check Education committee membership
        const educationCommittees = districtRep
          ? (districtRep.committees ?? []).filter(c => {
              const name = c.name.toLowerCase();
              return name.includes('education') || name.includes('workforce');
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
          higherEducation: {
            totalInstitutions: institutions.length,
            byOwnership: {
              public: institutions.filter(i => i.ownership === 'Public').length,
              privateNonprofit: institutions.filter(i => i.ownership === 'Private nonprofit')
                .length,
              privateForProfit: institutions.filter(i => i.ownership === 'Private for-profit')
                .length,
            },
            stateAverages: {
              medianEarnings10yr: avgMedianEarnings,
              medianDebt: avgMedianDebt,
              completionRate: avgCompletionRate,
            },
            topBySize: institutions
              .filter(i => i.size !== null)
              .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
              .slice(0, 10)
              .map(i => ({
                name: i.name,
                city: i.city,
                size: i.size,
                admissionRate: i.admissionRate,
                medianEarnings: i.medianEarnings,
              })),
            underInvestigation: institutions.filter(i => i.underInvestigation).length,
          },
          committeeOverlap: {
            educationRelatedCommittees: educationCommittees.map(c => c.name),
            hasEducationOversight: educationCommittees.length > 0,
          },
          relevantPolicyArea: 'Education',
          note: 'College Scorecard data aggregated at state level. District-level patterns approximate based on county mapping.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['College Scorecard (Dept. of Education)', 'Congress.gov (committees)'],
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

  // ── Tier 1: NIH grant search ────────────────────────────────────
  server.tool(
    'search_nih_grants',
    'Search NIH-funded research grants by state, institution, or topic. Returns project title, principal investigator, award amount, NIH institute, and organization.',
    {
      state: z.string().length(2).optional().describe('Two-letter state code (e.g., MD)'),
      institution: z.string().optional().describe('Research institution name'),
      topic: z.string().optional().describe('Research topic or keyword'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
    },
    async ({ state, institution, topic, limit }) => {
      try {
        if (!state && !institution && !topic) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Please provide at least a state, institution, or topic.',
              },
            ],
            isError: true,
          };
        }

        const grants = await nihReporterService.searchGrants({
          state,
          institution,
          topic,
          limit: Math.min(limit ?? 25, 100),
        });

        if (grants.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No NIH grants found for the given criteria.',
              },
            ],
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(grants, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: District research profile ───────────────────────────
  server.tool(
    'get_district_research_profile',
    "NIH-funded research in a congressional district: grants by state, top institutions, top-funded topics, total award amounts, and representative's Science/Health committee membership.",
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., MA)'),
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

        // Get state NIH grants
        const grants = await nihReporterService.searchGrants({ state, limit: 50 });

        // Aggregate by institution
        const instMap = new Map<string, { count: number; totalFunding: number }>();
        for (const g of grants) {
          const existing = instMap.get(g.organization) ?? { count: 0, totalFunding: 0 };
          existing.count += 1;
          existing.totalFunding += g.awardAmount;
          instMap.set(g.organization, existing);
        }
        const topInstitutions = [...instMap.entries()]
          .map(([name, v]) => ({ institution: name, ...v }))
          .sort((a, b) => b.totalFunding - a.totalFunding);

        // Aggregate by NIH institute
        const nihMap = new Map<string, { count: number; totalFunding: number }>();
        for (const g of grants) {
          if (!g.nihInstitute) continue;
          const existing = nihMap.get(g.nihInstitute) ?? { count: 0, totalFunding: 0 };
          existing.count += 1;
          existing.totalFunding += g.awardAmount;
          nihMap.set(g.nihInstitute, existing);
        }
        const topNihInstitutes = [...nihMap.entries()]
          .map(([institute, v]) => ({ institute, ...v }))
          .sort((a, b) => b.totalFunding - a.totalFunding);

        const totalFunding = grants.reduce((sum, g) => sum + g.awardAmount, 0);

        // Check Science/Health committee membership
        const researchCommittees = districtRep
          ? (districtRep.committees ?? []).filter(c => {
              const name = c.name.toLowerCase();
              return (
                name.includes('science') ||
                name.includes('health') ||
                name.includes('appropriations') ||
                name.includes('energy and commerce')
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
          nihResearch: {
            totalGrants: grants.length,
            totalFunding,
            topInstitutions: topInstitutions.slice(0, 10),
            topNihInstitutes: topNihInstitutes.slice(0, 10),
            topGrants: grants.slice(0, 10).map(g => ({
              title: g.projectTitle,
              pi: g.principalInvestigator,
              organization: g.organization,
              amount: g.awardAmount,
              nihInstitute: g.nihInstitute,
            })),
          },
          committeeOverlap: {
            researchRelatedCommittees: researchCommittees.map(c => c.name),
            hasResearchOversight: researchCommittees.length > 0,
          },
          relevantPolicyArea: 'Health',
          note: 'NIH data aggregated at state level. District-level patterns approximate based on county mapping.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['NIH RePORTER', 'Congress.gov (committees)'],
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

  // ── Tier 1: FDIC institution search ─────────────────────────────
  server.tool(
    'search_fdic_institutions',
    'Search FDIC-insured banks and financial institutions by state, name, or city. Returns total assets, deposits, number of offices, charter class, and regulator.',
    {
      state: z.string().length(2).optional().describe('Two-letter state code (e.g., NY)'),
      name: z.string().optional().describe('Institution name (partial match)'),
      city: z.string().optional().describe('City name'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
    },
    async ({ state, name, city, limit }) => {
      try {
        if (!state && !name && !city) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Please provide at least a state, name, or city.',
              },
            ],
            isError: true,
          };
        }

        const institutions = await fdicService.searchInstitutions({
          state,
          name,
          city,
          limit: Math.min(limit ?? 25, 100),
        });

        if (institutions.length === 0) {
          return {
            content: [
              { type: 'text' as const, text: 'No FDIC institutions found for the given criteria.' },
            ],
          };
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(institutions, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: District banking profile ────────────────────────────
  server.tool(
    'get_district_banking_profile',
    "Banking landscape for a congressional district: FDIC-insured institutions, total deposits/assets, recent bank failures, and representative's Banking/Financial Services committee membership.",
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., GA)'),
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

        // Get state banks and failures in parallel
        const [institutions, failures] = await Promise.all([
          fdicService.searchInstitutions({ state, limit: 50 }),
          fdicService.getBankFailures({ state, startYear: new Date().getFullYear() - 10 }),
        ]);

        // Compute summary
        const totalAssets = institutions.reduce((sum, i) => sum + (i.totalAssets ?? 0), 0);
        const totalDeposits = institutions.reduce((sum, i) => sum + (i.totalDeposits ?? 0), 0);

        // Check Banking committee membership
        const bankingCommittees = districtRep
          ? (districtRep.committees ?? []).filter(c => {
              const name = c.name.toLowerCase();
              return (
                name.includes('financial services') ||
                name.includes('banking') ||
                name.includes('finance')
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
          banking: {
            totalInstitutions: institutions.length,
            totalAssets,
            totalDeposits,
            topByAssets: institutions.slice(0, 10).map(i => ({
              name: i.institutionName,
              city: i.city,
              totalAssets: i.totalAssets,
              totalDeposits: i.totalDeposits,
              offices: i.numberOfOffices,
            })),
            recentFailures: failures.slice(0, 10),
            failureCount: failures.length,
          },
          committeeOverlap: {
            bankingRelatedCommittees: bankingCommittees.map(c => c.name),
            hasBankingOversight: bankingCommittees.length > 0,
          },
          relevantPolicyArea: 'Finance and Financial Sector',
          note: 'FDIC data aggregated at state level. District-level patterns approximate.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['FDIC BankFind', 'Congress.gov (committees)'],
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

  // ── Tier 1: Federal fiscal data ─────────────────────────────────
  server.tool(
    'get_federal_fiscal_data',
    'Federal fiscal overview from Treasury: national debt, monthly revenue by category, and spending by category. Returns current figures and fiscal year totals.',
    {
      year: z
        .number()
        .int()
        .min(2000)
        .max(2030)
        .optional()
        .describe('Fiscal year for revenue/spending (default: current year)'),
    },
    async ({ year }) => {
      try {
        const [debt, revenue, spending] = await Promise.all([
          treasuryFiscalService.getFederalDebt(),
          treasuryFiscalService.getMonthlyRevenue(year),
          treasuryFiscalService.getSpendingByCategory(year),
        ]);

        const result = {
          federalDebt: debt,
          revenue: {
            year: year ?? new Date().getFullYear(),
            records: revenue.length,
            data: revenue.slice(0, 20),
          },
          spending: {
            year: year ?? new Date().getFullYear(),
            records: spending.length,
            data: spending.slice(0, 20),
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['Treasury Fiscal Data (Debt to the Penny, MTS)'],
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 1: Federal debt context ────────────────────────────────
  server.tool(
    'get_federal_debt_context',
    'Current federal debt with context: total public debt outstanding, debt held by public vs intragovernmental holdings, and record date. Useful for fiscal policy discussions.',
    {},
    async () => {
      try {
        const debt = await treasuryFiscalService.getFederalDebt();

        if (!debt) {
          return {
            content: [{ type: 'text' as const, text: 'Federal debt data currently unavailable.' }],
          };
        }

        const context = {
          ...debt,
          formatted: {
            totalDebt: `$${(debt.totalPublicDebtOutstanding / 1_000_000_000_000).toFixed(2)} trillion`,
            debtHeldByPublic: `$${(debt.debtHeldByPublic / 1_000_000_000_000).toFixed(2)} trillion`,
            intragovernmental: `$${(debt.intragovernmentalHoldings / 1_000_000_000_000).toFixed(2)} trillion`,
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['Treasury Fiscal Data (Debt to the Penny)'],
          },
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(context, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
