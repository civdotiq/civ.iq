/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import { epaEchoService } from '@/lib/data-sources/epa-echo-service';
import { cmsProviderService } from '@/lib/data-sources/cms-provider-service';
import { femaService } from '@/lib/data-sources/fema-service';
import { cfpbComplaintService } from '@/lib/data-sources/cfpb-complaint-service';
import { eiaService } from '@/lib/data-sources/eia-service';
import { collegeScorecardService } from '@/lib/data-sources/college-scorecard-service';
import { nihReporterService } from '@/lib/data-sources/nih-reporter-service';
import { fdicService } from '@/lib/data-sources/fdic-service';

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

  // District environment resource
  server.resource(
    'district-environment',
    new ResourceTemplate('civiq://districts/{stateCode}/{districtNumber}/environment', {
      list: undefined,
    }),
    {
      description:
        'Environmental profile for a congressional district (EPA facilities, violations)',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const state =
        (Array.isArray(variables.stateCode)
          ? variables.stateCode[0]
          : variables.stateCode
        )?.toUpperCase() ?? '';
      try {
        const facilities = await epaEchoService.searchFacilities({ state, limit: 50 });
        const superfund = await epaEchoService.getSuperfundSites(state);
        const result = {
          state,
          facilities: facilities.length,
          violations: facilities.filter(f => f.sncFlag === 'Y').length,
          superfundSites: superfund.length,
          topFacilities: facilities.slice(0, 10),
        };
        return {
          contents: [
            { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(result, null, 2) },
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

  // District health resource
  server.resource(
    'district-health',
    new ResourceTemplate('civiq://districts/{stateCode}/{districtNumber}/health', {
      list: undefined,
    }),
    {
      description: 'Healthcare profile for a congressional district (hospitals, nursing homes)',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const state =
        (Array.isArray(variables.stateCode)
          ? variables.stateCode[0]
          : variables.stateCode
        )?.toUpperCase() ?? '';
      try {
        const [hospitals, nursingHomes] = await Promise.all([
          cmsProviderService.searchHospitals(state),
          cmsProviderService.searchNursingHomes(state),
        ]);
        const result = {
          state,
          hospitals: hospitals.length,
          nursingHomes: nursingHomes.length,
        };
        return {
          contents: [
            { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(result, null, 2) },
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

  // District safety resource
  server.resource(
    'district-safety',
    new ResourceTemplate('civiq://districts/{stateCode}/{districtNumber}/safety', {
      list: undefined,
    }),
    {
      description:
        'Safety profile for a congressional district (FEMA disasters, consumer complaints)',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const state =
        (Array.isArray(variables.stateCode)
          ? variables.stateCode[0]
          : variables.stateCode
        )?.toUpperCase() ?? '';
      try {
        const [disasters, complaints] = await Promise.all([
          femaService.searchDisasters({ state, limit: 20 }),
          cfpbComplaintService.getComplaintAggregates(state).catch(() => null),
        ]);
        const result = {
          state,
          recentDisasters: disasters.length,
          consumerComplaints: complaints?.total ?? 0,
          topComplaintProducts: complaints?.byProduct.slice(0, 5) ?? [],
        };
        return {
          contents: [
            { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(result, null, 2) },
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

  // District economy resource
  server.resource(
    'district-economy',
    new ResourceTemplate('civiq://districts/{stateCode}/{districtNumber}/economy', {
      list: undefined,
    }),
    {
      description:
        'Economy profile for a congressional district (energy, education, research, banking)',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const state =
        (Array.isArray(variables.stateCode)
          ? variables.stateCode[0]
          : variables.stateCode
        )?.toUpperCase() ?? '';
      try {
        const [energy, colleges, grants, banks] = await Promise.all([
          eiaService.getStateEnergyProfile(state).catch(() => null),
          collegeScorecardService.searchInstitutions({ state, limit: 10 }).catch(() => []),
          nihReporterService.searchGrants({ state, limit: 10 }).catch(() => []),
          fdicService.searchInstitutions({ state, limit: 10 }).catch(() => []),
        ]);
        const result = {
          state,
          energy: energy
            ? {
                renewablePercentage: energy.renewablePercentage,
                topSources: energy.topSources.slice(0, 3),
              }
            : null,
          colleges: colleges.length,
          nihGrants: grants.length,
          nihTotalFunding: grants.reduce((s, g) => s + g.awardAmount, 0),
          fdicInstitutions: banks.length,
        };
        return {
          contents: [
            { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(result, null, 2) },
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
