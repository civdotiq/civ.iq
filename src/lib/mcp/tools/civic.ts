/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getCommitteeDataService } from '@/lib/services/committee.service';
import { READ_ONLY_EXTERNAL } from '@/lib/mcp/tool-annotations';

export function registerCivicTools(server: McpServer): void {
  server.registerTool(
    'get_committee_info',
    {
      title: 'Committee details',
      description:
        'Get detailed information about a congressional committee including members, jurisdiction, and subcommittees.',
      inputSchema: {
        committeeId: z
          .string()
          .describe('Committee identifier (e.g., HSIF for House Energy & Commerce)'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ committeeId }) => {
      try {
        const committee = await getCommitteeDataService(committeeId);
        if (!committee) {
          return {
            content: [{ type: 'text' as const, text: `Committee not found: ${committeeId}` }],
            isError: true,
          };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(committee) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_federal_register',
    {
      title: 'Federal Register search',
      description:
        'Search Federal Register for rules, proposed rules, notices, and executive orders.',
      inputSchema: {
        query: z.string().optional().describe('Search term'),
        type: z
          .enum(['rule', 'proposed_rule', 'notice', 'presidential_document'])
          .optional()
          .describe('Document type'),
        agency: z
          .string()
          .optional()
          .describe(
            'Agency slug (e.g., "environmental-protection-agency", "department-of-defense")'
          ),
        limit: z.number().int().min(1).max(50).optional().describe('Max results, default 20'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ query, type, agency, limit }) => {
      try {
        const params = new URLSearchParams();
        if (query) params.set('conditions[term]', query);
        if (type) params.set('conditions[type][]', type);
        if (agency) params.set('conditions[agencies][]', agency);
        params.set('per_page', String(Math.min(limit ?? 20, 50)));
        params.set('order', 'newest');

        const response = await fetch(
          `https://www.federalregister.gov/api/v1/documents.json?${params.toString()}`
        );

        if (!response.ok) {
          return {
            content: [
              { type: 'text' as const, text: `Federal Register API error: ${response.status}` },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const results = (data.results ?? []).map((doc: Record<string, unknown>) => ({
          documentNumber: doc.document_number,
          title: doc.title,
          type: doc.type,
          agencies: (doc.agencies as Array<{ name: string }> | undefined)?.map(a => a.name),
          publicationDate: doc.publication_date,
          abstract: doc.abstract,
          htmlUrl: doc.html_url,
        }));

        return { content: [{ type: 'text' as const, text: JSON.stringify(results) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_district_info',
    {
      title: 'District profile',
      description:
        'Get comprehensive information about a congressional district including demographics, economics, and representative.',
      inputSchema: {
        stateCode: z.string().describe('Two-letter state code (e.g., MI)'),
        districtNumber: z.string().describe('District number (e.g., 07)'),
      },
      annotations: READ_ONLY_EXTERNAL,
    },
    async ({ stateCode, districtNumber }) => {
      try {
        const districtId = `${stateCode.toUpperCase()}-${districtNumber.padStart(2, '0')}`;

        // Fetch district data from the internal API
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ??
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        const response = await fetch(`${baseUrl}/api/districts/${districtId}`);
        if (!response.ok) {
          return {
            content: [{ type: 'text' as const, text: `District not found: ${districtId}` }],
            isError: true,
          };
        }

        const data = await response.json();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
