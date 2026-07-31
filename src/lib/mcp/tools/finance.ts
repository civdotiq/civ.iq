/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import { READ_ONLY_EXTERNAL } from '@/lib/mcp/tool-annotations';

/**
 * The LDA list endpoint serves 25 filings per page and the client does not
 * paginate, so every lobbying surface sees the first page only. Measured
 * 2026-07-31 against 2025 Q1: 27,446 filings match the query, 25 come back.
 * It is the first page in the API's own ordering rather than a random draw,
 * so it cannot be aggregated. Fix is tracked in PLAN-lobbying-corpus-2026-07.md.
 */
const LOBBYING_SAMPLE_CAVEAT =
  'SAMPLE ONLY — the first page the Senate LDA API returns (~25 filings) out of ~27,000 matching each quarter. Not a random sample: do not compute totals, rankings, or market shares from it.';

export function registerFinanceTools(server: McpServer): void {
  server.registerTool(
    'get_campaign_finance',
    {
      title: 'Campaign finance summary',
      description:
        'Get FEC campaign finance data for a legislator including total raised/spent, PAC contributions, and industry breakdown.',
      inputSchema: {
        bioguideId: z.string().describe('Congress bioguide identifier'),
        cycle: z
          .number()
          .int()
          .min(1990)
          .max(2030)
          .optional()
          .describe('Election cycle year, default current'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ bioguideId, cycle }) => {
      try {
        const fecId = getFECIdFromBioguide(bioguideId);
        if (!fecId) {
          return {
            content: [
              { type: 'text' as const, text: `No FEC mapping found for bioguideId: ${bioguideId}` },
            ],
            isError: true,
          };
        }

        const electionCycle =
          cycle ??
          (new Date().getFullYear() % 2 === 0
            ? new Date().getFullYear()
            : new Date().getFullYear() + 1);

        const summary = await fecApiService.getFinancialSummary(fecId, electionCycle);
        if (!summary) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No FEC data available for ${bioguideId} in cycle ${electionCycle}`,
              },
            ],
            isError: true,
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(summary) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'search_lobbying',
    {
      title: 'Lobbying filings search',
      description:
        'Search Senate LDA lobbying filings. Returns registrant, client, spending amount, and issue codes. Returns a small unrepresentative sample of each quarter, not the full set — see the `coverage` field on the response before using the numbers.',
      inputSchema: {
        year: z
          .number()
          .int()
          .min(1990)
          .max(2030)
          .optional()
          .describe('Filing year, default current'),
        quarter: z.number().min(1).max(4).optional().describe('Quarter (1-4), default most recent'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ year, quarter }) => {
      try {
        const filingYear = year ?? new Date().getFullYear();
        const filingQuarter = quarter ?? Math.ceil((new Date().getMonth() + 1) / 3);

        const filings = await senateLobbyingAPI.fetchFilingsByQuarter(filingYear, filingQuarter);

        // Wrapped rather than returned bare: an agent handed a naked array has
        // no way to tell a 25-row sample from a complete quarter.
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                coverage: LOBBYING_SAMPLE_CAVEAT,
                quarter: `${filingYear}Q${filingQuarter}`,
                filings: filings.slice(0, 50),
              }),
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

  server.registerTool(
    'get_federal_spending',
    {
      title: 'Federal spending lookup',
      description:
        'Get federal contracts and grants for a congressional district from USASpending.gov.',
      inputSchema: {
        state: z.string().describe('Two-letter state code (e.g., MI)'),
        district: z.string().optional().describe('District number (e.g., 05)'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ state, district }) => {
      try {
        const filters: Record<string, unknown> = {
          place_of_performance_locations: [
            {
              country: 'USA',
              state: state.toUpperCase(),
              ...(district ? { congressional_code: district } : {}),
            },
          ],
          time_period: [
            {
              start_date: `${new Date().getFullYear() - 1}-01-01`,
              end_date: new Date().toISOString().split('T')[0],
            },
          ],
        };

        const response = await fetch(
          'https://api.usaspending.gov/api/v2/search/spending_by_award/',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters,
              fields: [
                'Award ID',
                'Recipient Name',
                'Award Amount',
                'Award Type',
                'Awarding Agency',
                'Start Date',
                'Description',
              ],
              limit: 25,
              page: 1,
              sort: 'Award Amount',
              order: 'desc',
            }),
          }
        );

        if (!response.ok) {
          return {
            content: [{ type: 'text' as const, text: `USASpending API error: ${response.status}` }],
            isError: true,
          };
        }

        const data = await response.json();
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data.results ?? []) }],
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
