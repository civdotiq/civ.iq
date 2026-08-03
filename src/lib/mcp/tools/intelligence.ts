/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { analyzeVotePrediction } from '@/lib/intelligence/analyzers/vote-prediction-analyzer';
import { analyzeInfluenceChains } from '@/lib/intelligence/analyzers/influence-chain-analyzer';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { getCountiesForDistrict } from '@/lib/data/county-district-mapping';
import { epaEchoService } from '@/lib/data-sources/epa-echo-service';
import { cmsProviderService } from '@/lib/data-sources/cms-provider-service';
import { femaService } from '@/lib/data-sources/fema-service';
import { cfpbComplaintService } from '@/lib/data-sources/cfpb-complaint-service';
import { eiaService } from '@/lib/data-sources/eia-service';
import { collegeScorecardService } from '@/lib/data-sources/college-scorecard-service';
import { nihReporterService } from '@/lib/data-sources/nih-reporter-service';
import { fdicService } from '@/lib/data-sources/fdic-service';
import { nhtsaService } from '@/lib/data-sources/nhtsa-service';
import {
  describeCorpusCoverage,
  getCommitteeLobbyingFromCorpus,
} from '@/lib/data-sources/lda-corpus/committee-lobbying';
import type { CommitteeLobbyingData } from '@/lib/data-sources/senate-lobbying-api';
import { getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import { getCommitteesForAgency } from '@civiq/entity-resolution';
import { entitiesMatch } from '@civiq/entity-resolution';
import { READ_ONLY_EXTERNAL } from '@/lib/mcp/tool-annotations';
import logger from '@/lib/logging/simple-logger';

export function registerIntelligenceTools(server: McpServer): void {
  server.registerTool(
    'analyze_vote_prediction',
    {
      title: 'Vote prediction analysis',
      description:
        'ML-based vote prediction analysis. Returns independence score (how often a legislator votes against their donor-predicted position), SHAP factors, and notable deviations.',
      inputSchema: {
        bioguideId: z.string().describe('Congress bioguide identifier'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ bioguideId }) => {
      try {
        const insight = await analyzeVotePrediction(bioguideId);
        if (!insight) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Vote prediction analysis unavailable for ${bioguideId}. This may be due to insufficient data or the ML model not being loaded.`,
              },
            ],
            isError: true,
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(insight) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_influence_chain',
    {
      title: 'Influence chain trace',
      description:
        'Trace lobbying money through contributions, committee assignments, and votes for a legislator. Shows the path from lobbying org to legislative outcome.',
      inputSchema: {
        bioguideId: z.string().describe('Congress bioguide identifier'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ bioguideId }) => {
      try {
        const insight = await analyzeInfluenceChains(bioguideId);
        if (!insight) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Influence chain analysis unavailable for ${bioguideId}. This may be due to insufficient data.`,
              },
            ],
            isError: true,
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(insight) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 3: Comprehensive district analysis ─────────────────────
  server.registerTool(
    'analyze_district_comprehensive',
    {
      title: 'District cross-domain profile',
      description:
        'District representative info combined with STATE-level context across domains: environment (EPA), safety (FEMA, CFPB), health (CMS), economy (EIA, education, research, banking). Domain counts are statewide aggregates — these sources do not publish district-level rollups.',
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

        // Get representative. Rep data stores districts unpadded ("1", not
        // "01"); at-large seats may be "0" or undefined (same convention as
        // lookup_representatives).
        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        const districtRep = allReps.find(r => {
          if (r.state !== state || r.chamber !== 'House') return false;
          if (districtNumber === 0) return r.district === '0' || !r.district;
          return r.district === String(districtNumber);
        });

        // Parallel data fetches across all domains
        const [
          epaFacilities,
          hospitals,
          nursingHomes,
          disasters,
          complaints,
          energyProfile,
          colleges,
          nihGrants,
          banks,
        ] = await Promise.all([
          epaEchoService.searchFacilities({ state, limit: 50 }).catch(() => []),
          cmsProviderService.searchHospitals(state).catch(() => []),
          cmsProviderService.searchNursingHomes(state).catch(() => []),
          femaService.searchDisasters({ state, limit: 20 }).catch(() => []),
          cfpbComplaintService.getComplaintAggregates(state).catch(() => null),
          eiaService.getStateEnergyProfile(state).catch(() => null),
          collegeScorecardService.searchInstitutions({ state, limit: 20 }).catch(() => []),
          nihReporterService.searchGrants({ state, limit: 20 }).catch(() => []),
          fdicService.searchInstitutions({ state, limit: 20 }).catch(() => []),
        ]);

        const analysis = {
          district: `${state}-${districtStr}`,
          representative: districtRep
            ? {
                name: districtRep.name,
                party: districtRep.party,
                bioguideId: districtRep.bioguideId,
                committees: (districtRep.committees ?? []).map(c => c.name),
              }
            : null,
          // These sources publish state-level data only; labeling them as
          // district figures would overstate precision.
          stateContext: {
            scope: 'state' as const,
            note: `Figures below are ${state} statewide aggregates, not ${state}-${districtStr} district values.`,
            environment: {
              epaFacilities: epaFacilities.length,
              facilitiesWithViolations: epaFacilities.filter(f => f.sncFlag === 'Y').length,
            },
            health: {
              hospitals: hospitals.length,
              nursingHomes: nursingHomes.length,
            },
            safety: {
              recentDisasters: disasters.length,
              consumerComplaints: complaints?.total ?? 0,
            },
            economy: {
              energy: energyProfile
                ? {
                    renewablePercentage: energyProfile.renewablePercentage,
                    topSources: energyProfile.topSources.slice(0, 3),
                  }
                : null,
              higherEducation: colleges.length,
              nihGrants: nihGrants.length,
              nihTotalFunding: nihGrants.reduce((s, g) => s + g.awardAmount, 0),
              fdicInstitutions: banks.length,
            },
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [
              'EPA ECHO',
              'CMS Hospital/Nursing Home Compare',
              'CMS Open Payments',
              'FEMA',
              'CFPB',
              'EIA',
              'College Scorecard',
              'NIH RePORTER',
              'FDIC BankFind',
              'Congress.gov',
            ],
            countyCount: countyFipsList.length,
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

  // ── Tier 3: Industry regulatory landscape ───────────────────────
  server.registerTool(
    'analyze_industry_regulatory_landscape',
    {
      title: 'Industry regulatory landscape',
      description:
        'For a given industry sector: all regulatory actions (EPA, FDA, NHTSA), lobbying filings, campaign contributions, and committee jurisdiction. Maps sector to agencies and oversight committees.',
      inputSchema: {
        sector: z
          .string()
          .describe(
            'Industry sector (e.g., Health, Energy, Finance, Defense, Transportation, Agribusiness)'
          ),
        stateCode: z
          .string()
          .length(2)
          .optional()
          .describe('Optional state filter for regulatory actions'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ sector, stateCode }) => {
      try {
        const state = stateCode?.toUpperCase();
        const sectorLower = sector.toLowerCase();

        // Map sector to regulatory agencies and policy areas
        const regulatoryData: Record<string, unknown> = {};
        const agenciesChecked: string[] = [];

        // EPA data (energy, environment)
        if (sectorLower.includes('energy') || sectorLower.includes('environment')) {
          const facilities = await epaEchoService
            .searchFacilities({ state: state ?? 'CA', limit: 20 })
            .catch(() => []);
          regulatoryData.epaFacilities = facilities.length;
          regulatoryData.epaViolations = facilities.filter(f => f.sncFlag === 'Y').length;
          agenciesChecked.push('EPA');
        }

        // NHTSA data (transportation)
        if (sectorLower.includes('transport')) {
          const recalls = await nhtsaService.searchRecalls({ make: 'Ford' }).catch(() => []);
          regulatoryData.nhtsaRecallsSample = recalls.length;
          agenciesChecked.push('NHTSA');
        }

        // Get lobbying data for the sector
        let lobbyingData: CommitteeLobbyingData[] = [];
        try {
          // Map sector name to likely committee topics
          const committeeTopics = [sector];
          if (sectorLower.includes('health')) committeeTopics.push('Health', 'HELP');
          if (sectorLower.includes('energy')) committeeTopics.push('Energy', 'Energy and Commerce');
          if (sectorLower.includes('finance')) committeeTopics.push('Banking', 'Finance');
          if (sectorLower.includes('defense')) committeeTopics.push('Armed Services');

          lobbyingData = (await getCommitteeLobbyingFromCorpus(committeeTopics)) ?? [];
        } catch (e) {
          logger.warn('Lobbying data fetch failed for industry landscape', {
            error: (e as Error).message,
          });
        }

        // Get oversight committees for related agencies
        const oversightCommittees: Array<{ agency: string; committees: string[] }> = [];
        for (const agency of agenciesChecked) {
          const agencySlug = agency.toLowerCase().replace(/\s+/g, '-');
          const committees = getCommitteesForAgency(agencySlug);
          if (committees.length > 0) {
            oversightCommittees.push({
              agency,
              committees: committees.map(c => c.committeeName),
            });
          }
        }

        const analysis = {
          sector,
          stateFilter: state ?? 'national',
          regulatory: regulatoryData,
          agenciesChecked,
          lobbying: {
            coverage: await describeCorpusCoverage(),
            committees: lobbyingData.map(l => ({
              committee: l.committee,
              totalSpending: l.totalSpending,
              companyCount: l.companyCount,
              filingCount: l.filingCount,
              topFilers: (l.companies ?? []).slice(0, 5),
            })),
          },
          oversightCommittees,
          disclaimer:
            'This analysis maps industry regulatory activity to political oversight structures. ' +
            'All data sourced from public government records.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [
              ...agenciesChecked.map(a => `${a} (regulatory)`),
              'Senate LDA (lobbying)',
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

  // ── Tier 3: Policy area ecosystem ───────────────────────────────
  server.registerTool(
    'analyze_policy_area_ecosystem',
    {
      title: 'Policy area ecosystem',
      description:
        'For a Congress.gov policy area: related agencies, industry sectors, lobbying activity, committee oversight, and Federal Register keywords. Uses policy-area-map as the cross-domain join hub.',
      inputSchema: {
        policyArea: z
          .string()
          .describe(
            'Congress.gov policy area (e.g., "Health", "Energy", "Finance and Financial Sector")'
          ),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ policyArea }) => {
      try {
        const mapping = getPolicyAreaMapping(policyArea);

        if (!mapping) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Unknown policy area: "${policyArea}". Use a Congress.gov policy area string (e.g., Health, Energy, Education).`,
              },
            ],
            isError: true,
          };
        }

        // Get lobbying data for related committee topics
        let lobbyingData: CommitteeLobbyingData[] = [];
        try {
          if (mapping.topics.length > 0) {
            lobbyingData = (await getCommitteeLobbyingFromCorpus(mapping.topics.slice(0, 5))) ?? [];
          }
        } catch (e) {
          logger.warn('Lobbying data fetch failed for policy area ecosystem', {
            error: (e as Error).message,
          });
        }

        // Get oversight committees for each agency
        const agencyCommittees: Array<{ agency: string; committees: string[] }> = [];
        for (const agencySlug of mapping.agencySlugs) {
          const committees = getCommitteesForAgency(agencySlug);
          agencyCommittees.push({
            agency: agencySlug,
            committees: committees.map(c => c.committeeName),
          });
        }

        // Get representatives on relevant committees
        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        const allCommitteeNames = agencyCommittees.flatMap(a => a.committees);
        const relevantMembers = allReps.filter(r =>
          (r.committees ?? []).some(c =>
            allCommitteeNames.some(name => c.name.toLowerCase().includes(name.toLowerCase()))
          )
        );

        const ecosystem = {
          policyArea: mapping.policyArea,
          topics: mapping.topics,
          industrySectors: mapping.industrySectors,
          agencies: mapping.agencySlugs,
          federalRegisterKeywords: mapping.federalRegisterKeywords,
          agencyOversight: agencyCommittees,
          lobbying: {
            coverage: await describeCorpusCoverage(),
            committees: lobbyingData.map(l => ({
              committee: l.committee,
              totalSpending: l.totalSpending,
              companyCount: l.companyCount,
              filingCount: l.filingCount,
              topFilers: (l.companies ?? []).slice(0, 5),
            })),
          },
          committeeMembers: {
            total: relevantMembers.length,
            sample: relevantMembers.slice(0, 15).map(r => ({
              name: r.name,
              party: r.party,
              state: r.state,
              chamber: r.chamber,
              bioguideId: r.bioguideId,
            })),
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [
              'Congress.gov (policy areas, committees)',
              'Senate LDA (lobbying)',
              'CIV.IQ policy-area-map',
            ],
          },
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(ecosystem) }],
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
