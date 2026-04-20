/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * OpenAPI Completeness Gate
 *
 * Enforces that `public/openapi.json` stays in sync with the actual route
 * handlers in `src/app/api/v1/**`.
 *
 * Fails when:
 *   1. A v1 route file has no corresponding path in the OpenAPI spec.
 *   2. A `/v1` path in the OpenAPI spec has no corresponding route file.
 *   3. A route exports an HTTP method that the spec does not document for
 *      that path.
 *
 * The public contract is the spec — if the spec rots, SDK consumers, MCP
 * clients, and third-party integrators are reading lies. This gate makes
 * drift impossible to ship silently.
 */

import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const OPENAPI_PATH = path.join(REPO_ROOT, 'public/openapi.json');
const V1_ROUTES_DIR = path.join(REPO_ROOT, 'src/app/api/v1');

interface OpenApiSpec {
  paths: Record<string, Record<string, unknown>>;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'] as const;

/**
 * Convert a Next.js App Router `route.ts` file path to its OpenAPI path key.
 *
 * Examples:
 *   src/app/api/v1/route.ts                              -> "/v1"
 *   src/app/api/v1/bills/route.ts                        -> "/v1/bills"
 *   src/app/api/v1/bills/[billId]/route.ts               -> "/v1/bills/{billId}"
 *   src/app/api/v1/bills/[billId]/summary/route.ts       -> "/v1/bills/{billId}/summary"
 */
function routeFileToOpenApiPath(filePath: string): string {
  const rel = path.relative(path.join(REPO_ROOT, 'src/app/api'), filePath);
  const dir = path.dirname(rel);
  const segments = dir === '.' ? [] : dir.split(path.sep);
  const converted = segments.map(seg =>
    seg.startsWith('[') && seg.endsWith(']') ? `{${seg.slice(1, -1)}}` : seg
  );
  return '/' + converted.join('/');
}

/**
 * Extract HTTP methods exported from a Next.js `route.ts` file.
 * Matches `export [async] function GET(...)` and `export const GET = ...`.
 */
function extractMethods(filePath: string): string[] {
  const src = fs.readFileSync(filePath, 'utf-8');
  const methods: string[] = [];
  for (const method of HTTP_METHODS) {
    const re = new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${method}\\b`);
    if (re.test(src)) methods.push(method.toLowerCase());
  }
  return methods;
}

/**
 * Return both `path` and `path + '/'` so lookups tolerate trailing-slash
 * variance between the route filesystem and the OpenAPI spec (the v1 index
 * route maps to `/v1` but the spec documents it as `/v1/`).
 */
function pathVariants(p: string): string[] {
  return p.endsWith('/') ? [p, p.slice(0, -1)] : [p, p + '/'];
}

function findSpecPath(spec: OpenApiSpec, apiPath: string): Record<string, unknown> | undefined {
  for (const variant of pathVariants(apiPath)) {
    if (spec.paths[variant]) return spec.paths[variant];
  }
  return undefined;
}

describe('OpenAPI completeness gate (v1)', () => {
  const spec = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf-8')) as OpenApiSpec;
  const routeFiles = globSync(path.join(V1_ROUTES_DIR, '**/route.ts'));

  it('discovers at least one v1 route file', () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it('every v1 route file has a corresponding OpenAPI path', () => {
    const missing: string[] = [];
    for (const file of routeFiles) {
      const apiPath = routeFileToOpenApiPath(file);
      if (!findSpecPath(spec, apiPath)) {
        missing.push(`${apiPath} (from ${path.relative(REPO_ROOT, file)})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every /v1 OpenAPI path has a corresponding route file', () => {
    const routePaths = new Set(routeFiles.flatMap(f => pathVariants(routeFileToOpenApiPath(f))));
    const orphaned = Object.keys(spec.paths)
      .filter(p => p === '/v1' || p.startsWith('/v1/'))
      .filter(p => !routePaths.has(p));
    expect(orphaned).toEqual([]);
  });

  it('every route method is documented in OpenAPI for that path', () => {
    const mismatches: string[] = [];
    for (const file of routeFiles) {
      const apiPath = routeFileToOpenApiPath(file);
      const routeMethods = extractMethods(file);
      const operations = findSpecPath(spec, apiPath) ?? {};
      for (const method of routeMethods) {
        if (!operations[method]) {
          mismatches.push(
            `${apiPath} exports ${method.toUpperCase()} but OpenAPI doesn't document it ` +
              `(from ${path.relative(REPO_ROOT, file)})`
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('every OpenAPI method on a /v1 path is exported by its route file', () => {
    const orphanedMethods: string[] = [];
    for (const [apiPath, operations] of Object.entries(spec.paths)) {
      if (apiPath !== '/v1' && !apiPath.startsWith('/v1/')) continue;
      const matchingFile = routeFiles.find(f =>
        pathVariants(routeFileToOpenApiPath(f)).includes(apiPath)
      );
      if (!matchingFile) continue; // orphaned-path assertion will flag this
      const routeMethods = new Set(extractMethods(matchingFile));
      for (const method of Object.keys(operations)) {
        // OpenAPI path items may include non-method keys like "parameters",
        // "summary", "description", "servers" — skip them.
        const httpMethodNames = HTTP_METHODS.map(m => m.toLowerCase());
        if (!httpMethodNames.includes(method)) continue;
        if (!routeMethods.has(method)) {
          orphanedMethods.push(
            `${apiPath} documents ${method.toUpperCase()} in OpenAPI but ` +
              `${path.relative(REPO_ROOT, matchingFile)} doesn't export it`
          );
        }
      }
    }
    expect(orphanedMethods).toEqual([]);
  });
});
