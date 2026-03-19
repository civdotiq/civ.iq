/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * OpenAPI Specification Validation Tests
 *
 * Validates the structure and completeness of public/openapi.json.
 */

import * as fs from 'fs';
import * as path from 'path';

const openapiPath = path.resolve(process.cwd(), 'public/openapi.json');

describe('OpenAPI Specification', () => {
  let spec: Record<string, unknown>;

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
      const info = spec.info as Record<string, unknown>;
      expect(info.title).toBe('CIV.IQ Public API');
      expect(info.description).toBeTruthy();
      expect(info.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should include MIT license', () => {
      const info = spec.info as Record<string, unknown>;
      const license = info.license as Record<string, unknown>;
      expect(license.name).toBe('MIT');
    });
  });

  describe('servers', () => {
    it('should list at least one server', () => {
      const servers = spec.servers as Array<Record<string, unknown>>;
      expect(servers.length).toBeGreaterThanOrEqual(1);
      expect(servers[0]!.url).toContain('/api/v1');
    });
  });

  describe('paths', () => {
    let paths: Record<string, unknown>;

    beforeAll(() => {
      paths = spec.paths as Record<string, unknown>;
    });

    const EXPECTED_PATHS = [
      '/',
      '/representatives',
      '/representatives/{bioguideId}',
      '/bills',
      '/bills/{billId}',
      '/bills/{billId}/summary',
      '/votes/{voteId}',
      '/districts/{districtId}',
      '/committees',
      '/committees/{committeeId}',
      '/changelog',
    ];

    for (const ep of EXPECTED_PATHS) {
      it(`should include path ${ep}`, () => {
        expect(paths).toHaveProperty(ep);
      });
    }

    it('should have 12 paths total', () => {
      expect(Object.keys(paths).length).toBe(12);
    });

    it('should only use GET or POST methods', () => {
      const validMethods = ['get', 'post'];
      for (const [, pathItem] of Object.entries(paths)) {
        const methods = Object.keys(pathItem as Record<string, unknown>);
        for (const method of methods) {
          expect(validMethods).toContain(method);
        }
      }
    });
  });

  describe('components', () => {
    it('should define schemas', () => {
      const components = spec.components as Record<string, unknown>;
      const schemas = components.schemas as Record<string, unknown>;
      expect(Object.keys(schemas).length).toBeGreaterThan(5);
    });

    it('should define Meta schema', () => {
      const components = spec.components as Record<string, unknown>;
      const schemas = components.schemas as Record<string, unknown>;
      expect(schemas).toHaveProperty('Meta');
    });

    it('should define Pagination schema', () => {
      const components = spec.components as Record<string, unknown>;
      const schemas = components.schemas as Record<string, unknown>;
      expect(schemas).toHaveProperty('Pagination');
    });

    it('should define V1Error schema', () => {
      const components = spec.components as Record<string, unknown>;
      const schemas = components.schemas as Record<string, unknown>;
      expect(schemas).toHaveProperty('V1Error');
    });

    it('should define error responses', () => {
      const components = spec.components as Record<string, unknown>;
      const responses = components.responses as Record<string, unknown>;
      expect(responses).toHaveProperty('BadRequest');
      expect(responses).toHaveProperty('NotFound');
      expect(responses).toHaveProperty('TooManyRequests');
    });
  });

  describe('tags', () => {
    it('should define at least 5 tags', () => {
      const tags = spec.tags as Array<Record<string, unknown>>;
      expect(tags.length).toBeGreaterThanOrEqual(5);
    });

    it('should include Representatives, Bills, Votes, Districts, Committees', () => {
      const tags = spec.tags as Array<Record<string, unknown>>;
      const tagNames = tags.map(t => t.name);
      expect(tagNames).toContain('Representatives');
      expect(tagNames).toContain('Bills');
      expect(tagNames).toContain('Votes');
      expect(tagNames).toContain('Districts');
      expect(tagNames).toContain('Committees');
    });
  });
});
