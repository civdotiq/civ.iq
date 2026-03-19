/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer): void {
  server.prompt(
    'legislator_accountability',
    'Comprehensive accountability analysis combining campaign finance, voting record, committee assignments, and lobbying connections for a legislator.',
    {
      bioguideId: z.string().describe('Congress bioguide identifier'),
    },
    ({ bioguideId }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Analyze the accountability profile of legislator ${bioguideId} using CIV.IQ data.`,
              '',
              'Please use these tools in sequence:',
              '1. get_representative_profile — get their committee assignments and basic info',
              '2. get_campaign_finance — see who funds them',
              '3. get_voting_history — see how they vote',
              '4. analyze_vote_prediction — ML analysis of donor influence on voting',
              '5. get_influence_chain — trace lobbying money to votes',
              '',
              'Then synthesize the findings into a factual, nonpartisan accountability summary.',
              'Focus on patterns between funding sources and legislative behavior.',
              'Never claim causation — use "pattern", "correlation", "association" only.',
            ].join('\n'),
          },
        },
      ],
    })
  );

  server.prompt(
    'bill_impact_analysis',
    'Analyze a bill by examining sponsor funding, lobbying connections, and industry alignment.',
    {
      billId: z.string().describe('Bill identifier (e.g., hr1-119)'),
    },
    ({ billId }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Analyze bill ${billId} for potential industry influence using CIV.IQ data.`,
              '',
              'Please use these tools:',
              '1. get_bill_details — get the bill content, sponsor, and cosponsors',
              "2. get_campaign_finance — check the sponsor's funding sources",
              "3. search_lobbying — find lobbying filings related to the bill's policy area",
              '',
              'Then provide a factual analysis of:',
              "- Who funds the bill's sponsor and how that relates to the bill's policy area",
              '- Any lobbying activity aligned with the bill',
              '- Whether cosponsors share similar funding patterns',
              '',
              'Use only facts from the data. Never claim causation.',
            ].join('\n'),
          },
        },
      ],
    })
  );

  server.prompt(
    'policy_comparison',
    'Compare two or more legislators on their voting records, funding sources, and policy positions.',
    {
      bioguideIds: z
        .string()
        .describe('Comma-separated bioguide identifiers (e.g., P000197,M000355)'),
    },
    ({ bioguideIds }) => {
      const ids = bioguideIds.split(',').map(id => id.trim());
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `Compare legislators ${ids.join(', ')} using CIV.IQ data.`,
                '',
                'For each legislator, use:',
                '1. get_representative_profile — basic info and committees',
                '2. get_campaign_finance — funding sources',
                '3. get_voting_history — recent votes',
                '',
                'Then compare them on:',
                '- Party alignment and independence',
                '- Top funding sectors and how they differ',
                '- Voting patterns on shared votes',
                '- Committee overlap and specialization',
                '',
                'Present a balanced, factual comparison. Avoid editorializing.',
              ].join('\n'),
            },
          },
        ],
      };
    }
  );
}
