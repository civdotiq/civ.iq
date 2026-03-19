/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { analyzeVotePrediction } from '@/lib/intelligence/analyzers/vote-prediction-analyzer';
import { analyzeInfluenceChains } from '@/lib/intelligence/analyzers/influence-chain-analyzer';

export function registerIntelligenceTools(server: McpServer): void {
  server.tool(
    'analyze_vote_prediction',
    'ML-based vote prediction analysis. Returns independence score (how often a legislator votes against their donor-predicted position), SHAP factors, and notable deviations.',
    {
      bioguideId: z.string().describe('Congress bioguide identifier'),
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
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(insight, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_influence_chain',
    'Trace lobbying money through contributions, committee assignments, and votes for a legislator. Shows the path from lobbying org to legislative outcome.',
    {
      bioguideId: z.string().describe('Congress bioguide identifier'),
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
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(insight, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
