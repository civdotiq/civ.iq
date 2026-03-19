/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';

export function registerFinanceTools(server: McpServer): void {
  server.tool(
    'get_campaign_finance',
    'Get FEC campaign finance data for a legislator including total raised/spent, PAC contributions, and industry breakdown.',
    {
      bioguideId: z.string().describe('Congress bioguide identifier'),
      cycle: z.number().optional().describe('Election cycle year, default current'),
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

        return { content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'search_lobbying',
    'Search Senate LDA lobbying filings. Returns registrant, client, spending amount, and issue codes.',
    {
      year: z.number().optional().describe('Filing year, default current'),
      quarter: z.number().min(1).max(4).optional().describe('Quarter (1-4), default most recent'),
    },
    async ({ year, quarter }) => {
      try {
        const filingYear = year ?? new Date().getFullYear();
        const filingQuarter = quarter ?? Math.ceil((new Date().getMonth() + 1) / 3);

        const filings = await senateLobbyingAPI.fetchFilingsByQuarter(filingYear, filingQuarter);

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(filings.slice(0, 50), null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_federal_spending',
    'Get federal contracts and grants for a congressional district from USASpending.gov.',
    {
      state: z.string().describe('Two-letter state code (e.g., MI)'),
      district: z.string().optional().describe('District number (e.g., 05)'),
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
          content: [{ type: 'text' as const, text: JSON.stringify(data.results ?? [], null, 2) }],
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
