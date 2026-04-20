/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * OpenAPI Specification Validation Tests
 *
 * Validates the structure, completeness, and internal consistency of public/openapi.json.
 */

import * as fs from 'fs';
import * as path from 'path';

const openapiPath = path.resolve(process.cwd(), 'public/openapi.json');

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    license: { name: string; url: string };
    contact: { name: string; url: string };
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, PathOperation>>;
  components: {
    schemas: Record<string, SchemaObject>;
    responses: Record<string, unknown>;
  };
  tags: Array<{ name: string; description: string }>;
}

interface PathOperation {
  summary: string;
  description: string;
  operationId: string;
  tags: string[];
  parameters?: Array<{ name: string; in: string; required?: boolean; schema: SchemaObject }>;
  requestBody?: { required: boolean; content: Record<string, unknown> };
  responses: Record<string, unknown>;
}

interface SchemaObject {
  type?: string;
  $ref?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  [key: string]: unknown;
}

describe('OpenAPI Specification', () => {
  let spec: OpenAPISpec;

  beforeAll(() => {
    const raw = fs.readFileSync(openapiPath, 'utf-8');
    spec = JSON.parse(raw);
  });

  it('should be valid JSON', () => {
    expect(spec).toBeDefined();
  });

  it('should declare OpenAPI 3.0.x', () => {
    expect(spec.openapi).toMatch(/^3\.0\.\d+$/);
  });

  describe('info', () => {
    it('should have title, description, version', () => {
      expect(spec.info.title).toBe('CIV.IQ Public API');
      expect(spec.info.description).toBeTruthy();
      expect(spec.info.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should include MIT license', () => {
      expect(spec.info.license.name).toBe('MIT');
    });
  });

  describe('servers', () => {
    it('should list production server', () => {
      expect(spec.servers.length).toBeGreaterThanOrEqual(1);
      expect(spec.servers[0]!.url).toBe('https://civdotiq.org/api');
    });
  });

  describe('paths', () => {
    // V1 endpoints (original 12 + analytics)
    const V1_PATHS = [
      '/v1/',
      '/v1/representatives',
      '/v1/representatives/{bioguideId}',
      '/v1/bills',
      '/v1/bills/{billId}',
      '/v1/bills/{billId}/summary',
      '/v1/votes/{voteId}',
      '/v1/districts/{districtId}',
      '/v1/committees',
      '/v1/committees/{committeeId}',
      '/v1/changelog',
      '/v1/analytics',
      '/mcp',
    ];

    // Intelligence endpoints
    const INTELLIGENCE_PATHS = [
      '/intelligence/representative/{bioguideId}/vote-prediction',
      '/intelligence/representative/{bioguideId}/influence-chain',
      '/intelligence/representative/{bioguideId}/temporal',
      '/intelligence/representative/{bioguideId}/finance-jurisdiction',
      '/intelligence/sector/{sector}/leaderboard',
      '/intelligence/address/money-report',
      '/intelligence/address/representatives',
      '/intelligence/influence-clusters',
    ];

    // Feed endpoints
    const FEED_PATHS = [
      '/feed/member/{bioguideId}',
      '/feed/district/{districtId}',
      '/feed/bills/latest',
      '/feed/bill/{billId}',
      '/feed/committee/{committeeId}',
    ];

    // Search endpoints
    const SEARCH_PATHS = ['/search/unified', '/search/policy-area'];

    // Core data endpoints
    const CORE_PATHS = [
      '/geocode',
      '/districts/all',
      '/representatives/all',
      '/representative/{bioguideId}',
      '/compare',
    ];

    // State endpoints
    const STATE_PATHS = [
      '/state-legislature/{state}',
      '/state-bills/{state}',
      '/state-legislators-by-address',
    ];

    // Graph/Mesh endpoints
    const GRAPH_PATHS = [
      '/graph/neighbors/{nodeId}',
      '/mesh/entity/{nodeId}',
      '/mesh/temporal/{nodeId}',
      '/mesh/embed/{type}/{id}',
    ];

    const ALL_PATHS = [
      ...V1_PATHS,
      ...INTELLIGENCE_PATHS,
      ...FEED_PATHS,
      ...SEARCH_PATHS,
      ...CORE_PATHS,
      ...STATE_PATHS,
      ...GRAPH_PATHS,
    ];

    for (const ep of ALL_PATHS) {
      it(`should include path ${ep}`, () => {
        expect(spec.paths).toHaveProperty(ep);
      });
    }

    it('should have 40 paths total', () => {
      expect(Object.keys(spec.paths).length).toBe(40);
    });

    const ALLOWED_METHODS = ['get', 'post', 'delete'];

    it('should only use GET, POST, or DELETE methods', () => {
      for (const [, pathItem] of Object.entries(spec.paths)) {
        const methods = Object.keys(pathItem);
        for (const method of methods) {
          expect(ALLOWED_METHODS).toContain(method);
        }
      }
    });

    it('every operation should have operationId, tags, summary', () => {
      for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          const op = operation as PathOperation;
          expect(op.operationId).toBeTruthy();
          expect(op.tags?.length).toBeGreaterThan(0);
          expect(op.summary).toBeTruthy();
          // operationId should be unique — checked separately
          expect(op.description).toBeTruthy();
          // Verify we're not checking non-operation keys
          expect(ALLOWED_METHODS).toContain(method);
          // Verify path is well-formed
          expect(pathKey).toMatch(/^\//);
        }
      }
    });

    it('should have unique operationIds', () => {
      const ids = new Set<string>();
      for (const pathItem of Object.values(spec.paths)) {
        for (const operation of Object.values(pathItem)) {
          const op = operation as PathOperation;
          expect(ids.has(op.operationId)).toBe(false);
          ids.add(op.operationId);
        }
      }
    });

    it('path parameters should be marked required', () => {
      for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
        const pathParams = pathKey.match(/\{(\w+)\}/g)?.map(p => p.slice(1, -1)) ?? [];
        for (const operation of Object.values(pathItem)) {
          const op = operation as PathOperation;
          for (const paramName of pathParams) {
            const param = op.parameters?.find(p => p.name === paramName && p.in === 'path');
            if (param) {
              expect(param.required).toBe(true);
            }
          }
        }
      }
    });

    it('feed endpoints should return application/atom+xml', () => {
      for (const feedPath of FEED_PATHS) {
        const pathItem = spec.paths[feedPath];
        expect(pathItem).toBeDefined();
        const getOp = pathItem!['get'] as PathOperation;
        expect(getOp).toBeDefined();
        const response200 = getOp.responses['200'] as { content: Record<string, unknown> };
        expect(response200.content).toHaveProperty('application/atom+xml');
      }
    });

    it('intelligence endpoints should reference IntelligenceInsightResponse or specific schema', () => {
      const intelligenceRepPaths = INTELLIGENCE_PATHS.filter(p =>
        p.startsWith('/intelligence/representative/')
      );
      for (const intPath of intelligenceRepPaths) {
        const pathItem = spec.paths[intPath];
        expect(pathItem).toBeDefined();
        const getOp = pathItem!['get'] as PathOperation;
        const response200 = getOp.responses['200'] as { content: Record<string, unknown> };
        expect(response200.content).toHaveProperty('application/json');
      }
    });
  });

  describe('components', () => {
    it('should define at least 25 schemas', () => {
      expect(Object.keys(spec.components.schemas).length).toBeGreaterThanOrEqual(25);
    });

    it('should define core schemas', () => {
      const schemas = spec.components.schemas;
      expect(schemas).toHaveProperty('Meta');
      expect(schemas).toHaveProperty('Pagination');
      expect(schemas).toHaveProperty('V1Error');
      expect(schemas).toHaveProperty('RepresentativeSummary');
      expect(schemas).toHaveProperty('RepresentativeDetail');
      expect(schemas).toHaveProperty('BillSummary');
      expect(schemas).toHaveProperty('BillDetail');
      expect(schemas).toHaveProperty('VoteDetail');
      expect(schemas).toHaveProperty('DistrictDetail');
      expect(schemas).toHaveProperty('CommitteeSummary');
      expect(schemas).toHaveProperty('CommitteeDetail');
    });

    it('should define intelligence schemas', () => {
      const schemas = spec.components.schemas;
      expect(schemas).toHaveProperty('IntelligenceMetadata');
      expect(schemas).toHaveProperty('IntelligenceInsightResponse');
      expect(schemas).toHaveProperty('SectorLeaderboardResponse');
      expect(schemas).toHaveProperty('MoneyReportResponse');
    });

    it('should define search and geocode schemas', () => {
      const schemas = spec.components.schemas;
      expect(schemas).toHaveProperty('UnifiedSearchResponse');
      expect(schemas).toHaveProperty('GeocodeResponse');
    });

    it('should define error responses', () => {
      const responses = spec.components.responses as Record<string, unknown>;
      expect(responses).toHaveProperty('BadRequest');
      expect(responses).toHaveProperty('NotFound');
      expect(responses).toHaveProperty('TooManyRequests');
      expect(responses).toHaveProperty('BadGateway');
      expect(responses).toHaveProperty('ServiceUnavailable');
    });

    it('all $ref values should resolve to existing schemas', () => {
      const raw = fs.readFileSync(openapiPath, 'utf-8');
      const refMatches = raw.match(/"\$ref"\s*:\s*"([^"]+)"/g) ?? [];
      const refs = refMatches
        .map(m => {
          const match = m.match(/"#\/components\/schemas\/([^"]+)"/);
          return match?.[1];
        })
        .filter(Boolean);

      for (const ref of refs) {
        expect(spec.components.schemas).toHaveProperty(ref!);
      }
    });
  });

  describe('tags', () => {
    it('should define at least 10 tags', () => {
      expect(spec.tags.length).toBeGreaterThanOrEqual(10);
    });

    const REQUIRED_TAGS = [
      'Representatives',
      'Bills',
      'Votes',
      'Districts',
      'Committees',
      'Intelligence',
      'Search',
      'States',
      'Graph',
      'Feeds',
      'Widgets',
      'MCP',
    ];

    for (const tag of REQUIRED_TAGS) {
      it(`should include tag "${tag}"`, () => {
        const tagNames = spec.tags.map(t => t.name);
        expect(tagNames).toContain(tag);
      });
    }

    it('every operation tag should reference a defined tag', () => {
      const definedTags = new Set(spec.tags.map(t => t.name));
      for (const pathItem of Object.values(spec.paths)) {
        for (const operation of Object.values(pathItem)) {
          const op = operation as PathOperation;
          for (const tag of op.tags ?? []) {
            expect(definedTags.has(tag)).toBe(true);
          }
        }
      }
    });
  });
});
