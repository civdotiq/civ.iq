/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import logger from '@/lib/logging/simple-logger';

export function registerLegislationTools(server: McpServer): void {
  server.tool(
    'search_legislation',
    'Search for bills in Congress. Returns bill ID, title, sponsor, status, and policy area. Note: Congress.gov does not support keyword search — results are sorted by most recent activity. Filter by subject or sponsor after retrieval.',
    {
      congress: z.number().optional().describe('Congress number (e.g., 119)'),
      type: z
        .enum(['hr', 's', 'hjres', 'sjres', 'hconres', 'sconres', 'hres', 'sres'])
        .optional()
        .describe('Bill type filter'),
      limit: z.number().optional().describe('Max results, default 20'),
    },
    async ({ congress, type, limit }) => {
      try {
        const apiKey = process.env.CONGRESS_API_KEY;
        if (!apiKey) {
          return {
            content: [{ type: 'text' as const, text: 'Congress.gov API key not configured' }],
            isError: true,
          };
        }

        const congressNum = congress ?? 119;
        const maxResults = Math.min(limit ?? 20, 50);

        // Congress.gov /bill/{congress} is a listing endpoint — no keyword search supported.
        // If a bill type is specified, use the type-specific endpoint.
        const basePath = type
          ? `https://api.congress.gov/v3/bill/${congressNum}/${type}`
          : `https://api.congress.gov/v3/bill/${congressNum}`;

        const url = `${basePath}?limit=${maxResults}&sort=updateDate+desc&format=json`;

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'X-API-Key': apiKey,
          },
        });

        if (!response.ok) {
          return {
            content: [
              { type: 'text' as const, text: `Congress.gov API error: ${response.status}` },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const bills = (data.bills ?? []).map((b: Record<string, unknown>) => ({
          congress: b.congress,
          type: b.type,
          number: b.number,
          title: b.title,
          latestAction: b.latestAction,
          originChamber: b.originChamber,
          updateDate: b.updateDate,
        }));

        return { content: [{ type: 'text' as const, text: JSON.stringify(bills, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_bill_details',
    'Get detailed information about a specific bill including sponsor, cosponsors, committees, actions, and policy area.',
    {
      billId: z
        .string()
        .describe(
          'Bill identifier in congress-type-number format (e.g., "119-hr-1" for H.R.1 in 119th Congress)'
        ),
    },
    async ({ billId }) => {
      try {
        const bill = await fetchBillFromCongress(billId);
        if (!bill) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Bill not found: ${billId}. Use format: congress-type-number (e.g., "119-hr-1", "119-s-100")`,
              },
            ],
            isError: true,
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(bill, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_voting_history',
    "Get a legislator's recent voting record. Returns vote ID, bill info, position, result, and date.",
    {
      bioguideId: z.string().describe('Congress bioguide identifier'),
      chamber: z.enum(['House', 'Senate']).describe('Chamber of the legislator'),
      limit: z.number().optional().describe('Max votes to return, default 20'),
    },
    async ({ bioguideId, chamber, limit }) => {
      try {
        const maxVotes = Math.min(limit ?? 20, 50);
        const votes =
          chamber === 'House'
            ? await batchVotingService.getHouseMemberVotes(bioguideId, 119, undefined, maxVotes)
            : await batchVotingService.getSenateMemberVotes(bioguideId, 119, undefined, maxVotes);

        return { content: [{ type: 'text' as const, text: JSON.stringify(votes, null, 2) }] };
      } catch (error) {
        logger.warn('[MCP] get_voting_history failed', {
          bioguideId,
          error: (error as Error).message,
        });
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_vote_record',
    'Get details about a specific House roll call vote including all member positions. Note: only House votes are available via this tool.',
    {
      congress: z.number().optional().describe('Congress number, default 119'),
      session: z.number().optional().describe('Session number, default current'),
      rollCallNumber: z.number().describe('Roll call number'),
    },
    async ({ congress, session, rollCallNumber }) => {
      try {
        const apiKey = process.env.CONGRESS_API_KEY;
        if (!apiKey) {
          return {
            content: [{ type: 'text' as const, text: 'Congress.gov API key not configured' }],
            isError: true,
          };
        }

        const congressNum = congress ?? 119;
        const sessionNum = session ?? (new Date().getFullYear() % 2 === 1 ? 1 : 2);

        // Congress.gov v3 uses hyphenated path: house-vote (not house/vote)
        const response = await fetch(
          `https://api.congress.gov/v3/house-vote/${congressNum}/${sessionNum}/${rollCallNumber}?format=json`,
          {
            headers: {
              Accept: 'application/json',
              'X-API-Key': apiKey,
            },
          }
        );

        if (!response.ok) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Vote not found: House roll call ${rollCallNumber} (congress ${congressNum}, session ${sessionNum})`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
