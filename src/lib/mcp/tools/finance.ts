/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import {
  forEachFilingForOrganization,
  forEachFilingForQuarters,
  getFilingCorpusMeta,
} from '@/lib/data-sources/lda-corpus/load-filings';
import { describeCorpusCoverage } from '@/lib/data-sources/lda-corpus/committee-lobbying';
import type { CorpusFiling } from '@/lib/data-sources/lda-corpus/filing-corpus';
import { READ_ONLY_EXTERNAL } from '@/lib/mcp/tool-annotations';

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
        'Search Senate LDA lobbying filings from the complete corpus — every quarterly report (LD-2) in the covered window, not a sample. Returns registrant, client, spending amount, issue codes and the committees each filing touches, plus exact totals. Filter by quarter, by organization, or both. Amounts are plausibility-gated (income <= $5M, expenses <= $50M per filing).',
      inputSchema: {
        year: z
          .number()
          .int()
          .min(1990)
          .max(2030)
          .optional()
          .describe('Filing year. Omit to search every quarter the corpus covers.'),
        quarter: z.number().min(1).max(4).optional().describe('Quarter (1-4). Requires `year`.'),
        organization: z
          .string()
          .optional()
          .describe(
            'Client or registrant name. Matched on a normalized form, so "Pfizer Inc." and "PFIZER, INC." reach the same filings.'
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe(
            'Rows to return, largest amount first. Default 50. Totals always cover every match.'
          ),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ year, quarter, organization, limit }) => {
      try {
        const meta = await getFilingCorpusMeta();
        if (!meta) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Lobbying data unavailable — the Senate LDA corpus could not be read. No sample is returned in its place: the API fallback is the first page of a quarter, about 0.09% of filings, and cannot be searched or aggregated.',
              },
            ],
            isError: true,
          };
        }

        // Requested window, intersected with what the corpus actually holds. An
        // agent asking for a quarter outside the window gets told so rather than
        // an empty result it would read as "nobody lobbied".
        const requested = year
          ? quarter
            ? [`${year}-Q${quarter}`]
            : [1, 2, 3, 4].map(q => `${year}-Q${q}`)
          : meta.quarters;
        const quarters = requested.filter(q => meta.quarters.includes(q));

        if (quarters.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: 'Requested period is outside the corpus window.',
                  requested,
                  covered: meta.quarters,
                }),
              },
            ],
            isError: true,
          };
        }

        const rows: Array<{
          registrant: string;
          registrantId: string;
          client: string;
          amount: number;
          quarter: string;
          issueCodes: string[];
          governmentEntities: string[];
          committeeCodes: string[];
        }> = [];
        const clients = new Set<string>();
        let filingCount = 0;
        let totalSpending = 0;

        const wanted = new Set(quarters);
        const collect = (filing: CorpusFiling): void => {
          if (!wanted.has(filing.quarter)) return;
          filingCount += 1;
          totalSpending += filing.amount;
          clients.add(filing.clientName);
          rows.push({
            registrant: filing.registrantName,
            registrantId: filing.registrantId,
            client: filing.clientName,
            amount: filing.amount,
            quarter: filing.quarter,
            issueCodes: filing.issueCodes,
            governmentEntities: filing.governmentEntities,
            committeeCodes: filing.committeeCodes,
          });
        };

        const available = organization
          ? await forEachFilingForOrganization(organization, collect)
          : await forEachFilingForQuarters(quarters, collect);

        if (!available) {
          return {
            content: [
              { type: 'text' as const, text: 'Lobbying corpus became unavailable mid-search.' },
            ],
            isError: true,
          };
        }

        rows.sort((a, b) => b.amount - a.amount);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                coverage: await describeCorpusCoverage(),
                query: { quarters, organization: organization ?? null },
                // Computed over every match, not over the returned rows.
                totals: {
                  filingCount,
                  totalSpending,
                  organizationCount: clients.size,
                },
                // Corpus rows carry no LDA filing UUID, no income/expenses
                // split and no lobbyist roster — dropped at build time to keep
                // the artifact shippable. Use the LDA site for a single filing's
                // full detail.
                returned: Math.min(rows.length, limit ?? 50),
                filings: rows.slice(0, limit ?? 50),
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
