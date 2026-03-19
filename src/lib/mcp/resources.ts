/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { fetchBillFromCongress } from '@/lib/services/bill.service';

export function registerResources(server: McpServer): void {
  // Legislator profile resource
  server.resource(
    'legislator-profile',
    new ResourceTemplate('civiq://legislators/{bioguideId}', { list: undefined }),
    {
      description: 'Detailed profile for a member of Congress',
      mimeType: 'application/json',
    },
    async (uri, { bioguideId }) => {
      const id = Array.isArray(bioguideId) ? bioguideId[0] : bioguideId;
      const rep = await getEnhancedRepresentative(id ?? '');
      if (!rep) {
        return {
          contents: [
            { uri: uri.href, mimeType: 'application/json', text: '{"error":"Not found"}' },
          ],
        };
      }
      return {
        contents: [
          { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(rep, null, 2) },
        ],
      };
    }
  );

  // Bill detail resource
  server.resource(
    'bill-detail',
    new ResourceTemplate('civiq://bills/{congress}/{type}/{number}', { list: undefined }),
    {
      description: 'Detailed information about a bill in Congress',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const congress = Array.isArray(variables.congress)
        ? variables.congress[0]
        : variables.congress;
      const type = Array.isArray(variables.type) ? variables.type[0] : variables.type;
      const number = Array.isArray(variables.number) ? variables.number[0] : variables.number;
      const billId = `${congress}-${type}-${number}`;
      const bill = await fetchBillFromCongress(billId);
      if (!bill) {
        return {
          contents: [
            { uri: uri.href, mimeType: 'application/json', text: '{"error":"Not found"}' },
          ],
        };
      }
      return {
        contents: [
          { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(bill, null, 2) },
        ],
      };
    }
  );

  // District info resource
  server.resource(
    'district-info',
    new ResourceTemplate('civiq://districts/{stateCode}/{districtNumber}', { list: undefined }),
    {
      description: 'Congressional district demographics, economics, and representative info',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const state = Array.isArray(variables.stateCode)
        ? variables.stateCode[0]
        : variables.stateCode;
      const district = Array.isArray(variables.districtNumber)
        ? variables.districtNumber[0]
        : variables.districtNumber;
      const districtId = `${(state ?? '').toUpperCase()}-${(district ?? '').padStart(2, '0')}`;

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

      try {
        const response = await fetch(`${baseUrl}/api/districts/${districtId}`);
        if (!response.ok) {
          return {
            contents: [
              { uri: uri.href, mimeType: 'application/json', text: '{"error":"Not found"}' },
            ],
          };
        }
        const data = await response.json();
        return {
          contents: [
            { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(data, null, 2) },
          ],
        };
      } catch {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: '{"error":"Service unavailable"}',
            },
          ],
        };
      }
    }
  );
}
