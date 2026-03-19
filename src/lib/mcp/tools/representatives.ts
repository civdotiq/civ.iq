/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { CensusGeocoderService } from '@/services/geocoding/census-geocoder.service';
import logger from '@/lib/logging/simple-logger';

export function registerRepresentativeTools(server: McpServer): void {
  server.tool(
    'lookup_representatives',
    'Find federal legislators by full street address (most accurate) or by state. A full address resolves the exact congressional district via Census Geocoder. Returns bioguideId, name, party, state, district, chamber.',
    {
      street: z
        .string()
        .describe('Street address (e.g., "123 Main St") — required for district-level lookup'),
      city: z.string().describe('City name'),
      state: z.string().describe('Two-letter state code (e.g., MI)'),
      zip: z.string().optional().describe('5-digit ZIP code — improves geocoding accuracy'),
    },
    async ({ street, city, state, zip }) => {
      try {
        const geocodeResult = await CensusGeocoderService.geocodeAddress({
          street,
          city,
          state,
          zip,
        });

        if (!geocodeResult.congressionalDistrict) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Could not resolve congressional district for this address. Verify the address is correct and try again.`,
              },
            ],
            isError: true,
          };
        }

        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        const stateUpper = state.toUpperCase();
        const districtNum = geocodeResult.congressionalDistrict.number;

        const reps = allReps.filter(rep => {
          if (rep.state !== stateUpper) return false;
          if (rep.chamber === 'Senate') return true;
          if (rep.chamber !== 'House') return false;
          // At-large districts: Census returns "0", rep data may have "0" or undefined
          if (districtNum === '0') return rep.district === '0' || !rep.district;
          return rep.district === districtNum;
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  method: 'address_geocode',
                  district: `${stateUpper}-${districtNum}`,
                  representatives: reps.map(formatRep),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.warn('[MCP] lookup_representatives failed', { error: (error as Error).message });
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'list_state_delegation',
    'List all federal legislators for a state (both senators and all House representatives).',
    {
      state: z.string().describe('Two-letter state code (e.g., MI)'),
    },
    async ({ state }) => {
      try {
        const reps = await RepresentativesCoreService.getRepresentativesByState(
          state.toUpperCase()
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  state: state.toUpperCase(),
                  total: reps.length,
                  representatives: reps.map(formatRep),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.warn('[MCP] list_state_delegation failed', { error: (error as Error).message });
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_representative_profile',
    'Get detailed profile for a specific legislator including committees, social media, biography, and contact info.',
    {
      bioguideId: z.string().describe('Congress bioguide identifier (e.g., P000197)'),
    },
    async ({ bioguideId }) => {
      try {
        const rep = await getEnhancedRepresentative(bioguideId);
        if (!rep) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No representative found for bioguideId: ${bioguideId}`,
              },
            ],
            isError: true,
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(rep, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'compare_legislators',
    'Compare multiple legislators side-by-side. Returns profiles for each bioguideId.',
    {
      bioguideIds: z
        .array(z.string())
        .min(2)
        .max(10)
        .describe('Array of bioguide identifiers to compare'),
    },
    async ({ bioguideIds }) => {
      try {
        const profiles = await Promise.all(
          bioguideIds.map(async id => {
            const rep = await getEnhancedRepresentative(id);
            return rep ? { ...rep, bioguideId: id } : { bioguideId: id, error: 'Not found' };
          })
        );

        return { content: [{ type: 'text' as const, text: JSON.stringify(profiles, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}

function formatRep(r: {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string | null;
  chamber: string;
}) {
  return {
    bioguideId: r.bioguideId,
    name: r.name,
    party: r.party,
    state: r.state,
    district: r.district ?? null,
    chamber: r.chamber,
  };
}
