/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { CensusGeocoderService } from '@/services/geocoding/census-geocoder.service';
import { READ_ONLY_EXTERNAL } from '@/lib/mcp/tool-annotations';
import logger from '@/lib/logging/simple-logger';

export function registerRepresentativeTools(server: McpServer): void {
  server.registerTool(
    'lookup_representatives',
    {
      title: 'Representative lookup by address',
      description:
        'Find federal legislators by full street address (most accurate) or by state. A full address resolves the exact congressional district via Census Geocoder. Returns bioguideId, name, party, state, district, chamber.',
      inputSchema: {
        street: z
          .string()
          .describe('Street address (e.g., "123 Main St") — required for district-level lookup'),
        city: z.string().describe('City name'),
        state: z.string().length(2).describe('Two-letter state code (e.g., MI)'),
        zip: z
          .string()
          .regex(/^\d{5}$/)
          .optional()
          .describe('5-digit ZIP code — improves geocoding accuracy'),
      },
      annotations: READ_ONLY_EXTERNAL,
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
              text: JSON.stringify({
                method: 'address_geocode',
                district: `${stateUpper}-${districtNum}`,
                representatives: reps.map(formatRep),
              }),
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

  server.registerTool(
    'list_state_delegation',
    {
      title: 'State delegation list',
      description:
        'List all federal legislators for a state (both senators and all House representatives).',
      inputSchema: {
        state: z.string().describe('Two-letter state code (e.g., MI)'),
      },
      annotations: READ_ONLY_EXTERNAL,
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
              text: JSON.stringify({
                state: state.toUpperCase(),
                total: reps.length,
                representatives: reps.map(formatRep),
              }),
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

  server.registerTool(
    'get_representative_profile',
    {
      title: 'Legislator profile',
      description:
        'Get detailed profile for a specific legislator including committees, social media, biography, and contact info.',
      inputSchema: {
        bioguideId: z.string().describe('Congress bioguide identifier (e.g., P000197)'),
      },
      annotations: READ_ONLY_EXTERNAL,
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

        return { content: [{ type: 'text' as const, text: JSON.stringify(rep) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'compare_legislators',
    {
      title: 'Legislator comparison',
      description:
        'Compare multiple legislators side-by-side. Returns profiles for each bioguideId.',
      inputSchema: {
        bioguideIds: z
          .array(z.string())
          .min(2)
          .max(10)
          .describe('Array of bioguide identifiers to compare'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ bioguideIds }) => {
      try {
        const profiles = await Promise.all(
          bioguideIds.map(async id => {
            const rep = await getEnhancedRepresentative(id);
            return rep ? { ...rep, bioguideId: id } : { bioguideId: id, error: 'Not found' };
          })
        );

        return { content: [{ type: 'text' as const, text: JSON.stringify(profiles) }] };
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
