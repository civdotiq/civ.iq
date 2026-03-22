/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * MCP Environment Tools (EPA + NOAA)
 *
 * EPA:
 *   Tier 1: search_epa_facilities
 *   Tier 2: get_district_environmental_profile
 *   Tier 3: analyze_environmental_influence
 *
 * NOAA:
 *   Tier 1: get_climate_data
 *   Tier 2: get_state_climate_profile
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { epaEchoService } from '@/lib/data-sources/epa-echo-service';
import { noaaService } from '@/lib/data-sources/noaa-service';
import { getCountiesForDistrict } from '@/lib/data/county-district-mapping';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { sicToSector } from '@civiq/entity-resolution';
import { getCommitteesForAgency } from '@/lib/connections/committee-agency-map';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import logger from '@/lib/logging/simple-logger';

export function registerEnvironmentTools(server: McpServer): void {
  // ── Tier 1: Raw EPA facility search ────────────────────────────
  server.tool(
    'search_epa_facilities',
    'Search EPA-regulated facilities by state, ZIP, or SIC code. Returns facility name, address, compliance status, violations, and penalties.',
    {
      state: z.string().length(2).describe('Two-letter state code (e.g., CA)'),
      zip: z
        .string()
        .regex(/^\d{5}$/)
        .optional()
        .describe('5-digit ZIP code'),
      sicCode: z.string().optional().describe('4-digit SIC code to filter by industry'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20)'),
    },
    async ({ state, zip, sicCode, limit }) => {
      try {
        const facilities = await epaEchoService.searchFacilities({
          state: state.toUpperCase(),
          zip,
          sicCode,
          limit: Math.min(limit ?? 20, 100),
        });

        if (facilities.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No EPA-regulated facilities found for the given criteria.',
              },
            ],
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(facilities, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: District environmental profile ─────────────────────
  server.tool(
    'get_district_environmental_profile',
    'Environmental profile for a congressional district: regulated facilities, active violations, Superfund sites, toxic releases. Includes serving representative.',
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., MI)'),
      districtNumber: z.number().int().min(0).max(53).describe('District number (0 for at-large)'),
    },
    async ({ stateCode, districtNumber }) => {
      try {
        const state = stateCode.toUpperCase();
        const countyFipsList = getCountiesForDistrict(state, districtNumber);

        if (countyFipsList.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No county mapping found for ${state}-${String(districtNumber).padStart(2, '0')}`,
              },
            ],
            isError: true,
          };
        }

        // Fetch representative for this district
        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        const districtStr = String(districtNumber).padStart(2, '0');
        const districtRep = allReps.find(
          r => r.state === state && r.district === districtStr && r.chamber === 'House'
        );

        // Fetch EPA data for the state (then filter by county overlap)
        const [facilities, superfundSites, toxicReleases] = await Promise.all([
          epaEchoService.searchFacilities({ state, limit: 100 }),
          epaEchoService.getSuperfundSites(state),
          epaEchoService.getToxicReleases(state),
        ]);

        // Filter facilities by county FIPS (from ZIP prefix match)
        const countyPrefixes = new Set(countyFipsList.map(f => f.slice(2))); // county part of FIPS
        const districtFacilities = facilities.filter(f => {
          // Match by ZIP if facility has one, or by county name
          for (const countyFips of countyFipsList) {
            if (f.zip && f.zip.startsWith(countyFips.slice(0, 3))) return true;
          }
          return false;
        });

        // Filter Superfund by county
        const countyNames = new Set(superfundSites.map(s => s.county.toUpperCase()));
        const districtSuperfund = superfundSites.filter(s =>
          countyFipsList.some(fips => {
            const siteCounty = s.county.toUpperCase();
            return countyNames.has(siteCounty);
          })
        );

        // Filter TRI by county FIPS
        const districtTri = toxicReleases.filter(t => countyFipsList.includes(t.countyFips));

        const activeViolations = districtFacilities.filter(f => {
          if (f.sncFlag === 'Y') return true;
          const status = (f.complianceStatus ?? '').toLowerCase();
          return status === 'violation identified' || status === 'significant violation';
        });

        const profile = {
          district: `${state}-${districtStr}`,
          representative: districtRep
            ? {
                name: districtRep.name,
                party: districtRep.party,
                bioguideId: districtRep.bioguideId,
              }
            : null,
          summary: {
            totalRegulatedFacilities: districtFacilities.length,
            facilitiesWithViolations: activeViolations.length,
            superfundSites: districtSuperfund.length,
            toxicReleaseFacilities: districtTri.length,
          },
          facilities: districtFacilities.slice(0, 20),
          superfundSites: districtSuperfund,
          toxicReleases: districtTri.slice(0, 20),
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['EPA ECHO', 'EPA GIS (Superfund)', 'EPA Envirofacts (TRI)'],
            countyCount: countyFipsList.length,
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

  // ── Tier 3: Environmental influence analysis ───────────────────
  server.tool(
    'analyze_environmental_influence',
    'Cross-reference EPA violations in a district with lobbying and campaign finance. Maps facility SIC codes to sectors, finds lobbying in those sectors by the district rep, checks EPA-oversight committee membership overlap, and identifies environmental legislation votes.',
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., OH)'),
      districtNumber: z.number().int().min(0).max(53).describe('District number (0 for at-large)'),
    },
    async ({ stateCode, districtNumber }) => {
      try {
        const state = stateCode.toUpperCase();
        const districtStr = String(districtNumber).padStart(2, '0');
        const countyFipsList = getCountiesForDistrict(state, districtNumber);

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

        // Get facilities with violations in the district
        const facilities = await epaEchoService.searchFacilities({ state, limit: 100 });
        const toxicReleases = await epaEchoService.getToxicReleases(state);

        // Filter TRI to district by county FIPS
        const districtTri = toxicReleases.filter(t => countyFipsList.includes(t.countyFips));

        // Extract SIC codes from facilities and map to sectors
        const sicCodes = new Set<string>();
        for (const f of facilities) {
          if (f.sicCodes) {
            for (const code of f.sicCodes.split(/[,\s]+/)) {
              if (code.trim()) sicCodes.add(code.trim());
            }
          }
        }

        const sectorMap = new Map<string, string[]>();
        for (const sic of sicCodes) {
          const sector = sicToSector(sic);
          if (sector) {
            const existing = sectorMap.get(sector) ?? [];
            existing.push(sic);
            sectorMap.set(sector, existing);
          }
        }

        // Get EPA-oversight committees
        const epaCommittees = getCommitteesForAgency('environmental-protection-agency');
        const repCommittees = districtRep.committees ?? [];
        const committeeOverlap = epaCommittees.filter(ec =>
          repCommittees.some(rc => rc.name.toLowerCase().includes(ec.committeeName.toLowerCase()))
        );

        // Get lobbying data for environment-related topics
        let environmentLobbying: Awaited<
          ReturnType<typeof senateLobbyingAPI.getCommitteeLobbyingData>
        > = [];
        try {
          environmentLobbying = await senateLobbyingAPI.getCommitteeLobbyingData([
            'Environment',
            'Energy',
          ]);
        } catch (e) {
          logger.warn('Could not fetch lobbying data for environmental analysis', {
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
          environmentalFootprint: {
            facilitySicSectors: Object.fromEntries(sectorMap),
            toxicReleaseFacilitiesInDistrict: districtTri.length,
          },
          committeeOverlap: {
            epaOversightCommittees: epaCommittees.map(c => c.committeeName),
            repServesOn: committeeOverlap.map(c => c.committeeName),
            hasEpaOversight: committeeOverlap.length > 0,
          },
          lobbyingContext: {
            environmentRelatedLobbying: environmentLobbying.map(l => ({
              committee: l.committee,
              totalSpending: l.totalSpending,
              companyCount: l.companyCount,
              topFilers: l.filings.slice(0, 5),
            })),
          },
          disclaimer:
            'This analysis shows correlations between environmental data and political activity. ' +
            'Correlations do not imply causation. All data sourced from public government records.',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [
              'EPA ECHO',
              'EPA Envirofacts (TRI)',
              '@civiq/entity-resolution (SIC→sector)',
              'Senate LDA (lobbying)',
              'Congress.gov (committees)',
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

  // ── Tier 1: NOAA climate data ───────────────────────────────────
  server.tool(
    'get_climate_data',
    'NOAA climate normals for a state: average temperature, min/max temperatures, precipitation, and snowfall from 30-year normal period. Requires NOAA_TOKEN.',
    {
      state: z.string().length(2).describe('Two-letter state code (e.g., CO)'),
    },
    async ({ state }) => {
      try {
        const normals = await noaaService.getClimateNormals(state);

        if (!normals) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No NOAA climate data available. NOAA_TOKEN may not be configured.',
              },
            ],
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(normals, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tier 2: State climate profile ───────────────────────────────
  server.tool(
    'get_state_climate_profile',
    "Climate profile for a state: NOAA climate normals, severe weather event history, and the state delegation's Environment committee membership for climate policy context.",
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., FL)'),
      year: z
        .number()
        .int()
        .min(2000)
        .max(2030)
        .optional()
        .describe('Year for severe weather events (default: last year)'),
    },
    async ({ stateCode, year }) => {
      try {
        const state = stateCode.toUpperCase();

        // Fetch climate normals and severe weather in parallel
        const [normals, severeWeather] = await Promise.all([
          noaaService.getClimateNormals(state),
          noaaService.getSevereWeatherEvents(state, year),
        ]);

        // Get state delegation environment committee members
        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        const stateDelegation = allReps.filter(r => r.state === state);
        const envMembers = stateDelegation.filter(r =>
          (r.committees ?? []).some(c => {
            const name = c.name.toLowerCase();
            return (
              name.includes('environment') ||
              name.includes('natural resources') ||
              name.includes('climate') ||
              name.includes('energy')
            );
          })
        );

        // Aggregate severe weather by type
        const eventTypeCounts: Record<string, number> = {};
        let totalInjuries = 0;
        let totalDeaths = 0;
        let totalPropertyDamage = 0;
        for (const e of severeWeather) {
          eventTypeCounts[e.eventType] = (eventTypeCounts[e.eventType] ?? 0) + 1;
          totalInjuries += e.injuries;
          totalDeaths += e.deaths;
          totalPropertyDamage += e.damageProperty;
        }

        const topEventTypes = Object.entries(eventTypeCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({ type, count }));

        const profile = {
          state,
          climateNormals: normals,
          severeWeather: {
            year: year ?? new Date().getFullYear() - 1,
            totalEvents: severeWeather.length,
            totalInjuries,
            totalDeaths,
            totalPropertyDamage,
            topEventTypes: topEventTypes.slice(0, 10),
            recentEvents: severeWeather.slice(0, 20),
          },
          delegation: {
            environmentCommitteeMembers: envMembers.map(r => ({
              name: r.name,
              party: r.party,
              chamber: r.chamber,
              bioguideId: r.bioguideId,
              committees: (r.committees ?? [])
                .filter(c => {
                  const name = c.name.toLowerCase();
                  return (
                    name.includes('environment') ||
                    name.includes('natural resources') ||
                    name.includes('climate') ||
                    name.includes('energy')
                  );
                })
                .map(c => c.name),
            })),
          },
          relevantPolicyArea: 'Environmental Protection',
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: [
              'NOAA CDO (Climate Normals)',
              'NOAA Storm Events',
              'Congress.gov (committees)',
            ],
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
