/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * OpenAPI Completeness Gate
 *
 * Enforces that `public/openapi.json` stays in sync with the actual route
 * handlers under `src/app/api/**`.
 *
 * Two levels of strictness:
 *
 *   All spec paths (40-ish) → every documented endpoint must exist as a
 *   Next.js route file, and every documented method must be exported by
 *   that file. The spec is the public contract — a documented endpoint
 *   that doesn't exist is a lie to consumers (SDK, MCP agents, third
 *   parties).
 *
 *   /v1 routes → additionally, every route file under `src/app/api/v1/`
 *   must be in the spec, and every exported method must be documented.
 *   v1 is the strict versioned public surface; omissions in v1 silently
 *   break SDK generation.
 *
 * Method extraction uses the TypeScript compiler API (AST) rather than
 * regex so re-exports (`export { GET } from './handler'`), aliased
 * exports (`export { getImpl as GET }`), and other export forms are
 * handled correctly.
 */

import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import ts from 'typescript';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const OPENAPI_PATH = path.join(REPO_ROOT, 'public/openapi.json');
const API_ROUTES_DIR = path.join(REPO_ROOT, 'src/app/api');
const V1_ROUTES_DIR = path.join(API_ROUTES_DIR, 'v1');

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'] as const;
const HTTP_METHODS_LOWER = HTTP_METHODS.map(m => m.toLowerCase());

interface OpenApiSpec {
  paths: Record<string, Record<string, unknown>>;
}

/**
 * Convert a Next.js App Router `route.ts` file path to its OpenAPI path key.
 *
 * Handles three dynamic-segment flavors:
 *   [param]       → {param}   (single segment)
 *   [...param]    → {param}   (catch-all; multi-segment)
 *   [[...param]]  → {param}   (optional catch-all)
 *
 * Examples:
 *   src/app/api/v1/route.ts                          -> "/v1"
 *   src/app/api/v1/bills/[billId]/route.ts           -> "/v1/bills/{billId}"
 *   src/app/api/mesh/entity/[...nodeId]/route.ts     -> "/mesh/entity/{nodeId}"
 */
function routeFileToOpenApiPath(filePath: string): string {
  const rel = path.relative(API_ROUTES_DIR, filePath);
  const dir = path.dirname(rel);
  const segments = dir === '.' ? [] : dir.split(path.sep);
  const converted = segments.map(seg => {
    if (seg.startsWith('[[...') && seg.endsWith(']]')) return `{${seg.slice(5, -2)}}`;
    if (seg.startsWith('[...') && seg.endsWith(']')) return `{${seg.slice(4, -1)}}`;
    if (seg.startsWith('[') && seg.endsWith(']')) return `{${seg.slice(1, -1)}}`;
    return seg;
  });
  return '/' + converted.join('/');
}

/**
 * Extract HTTP methods exported from a Next.js `route.ts` file via AST.
 *
 * Recognizes all five App Router export forms:
 *   export function GET() {}
 *   export async function GET() {}
 *   export const GET = ...
 *   export { GET }                              (local re-export)
 *   export { handler as GET } from './x'        (external re-export)
 */
function extractMethods(filePath: string): string[] {
  const src = fs.readFileSync(filePath, 'utf-8');
  const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found = new Set<string>();
  const methodSet = new Set<string>(HTTP_METHODS);

  for (const stmt of sf.statements) {
    const hasExport = ts.canHaveModifiers(stmt)
      ? ts.getModifiers(stmt)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      : false;

    if (ts.isFunctionDeclaration(stmt) && hasExport && stmt.name) {
      if (methodSet.has(stmt.name.text)) found.add(stmt.name.text);
      continue;
    }

    if (ts.isVariableStatement(stmt) && hasExport) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && methodSet.has(decl.name.text)) {
          found.add(decl.name.text);
        }
      }
      continue;
    }

    if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) {
        // `export { GET }` → el.name.text === 'GET'
        // `export { handler as GET }` → el.name.text === 'GET' (the exported alias)
        if (methodSet.has(el.name.text)) found.add(el.name.text);
      }
      continue;
    }
  }

  return [...found].map(m => m.toLowerCase()).sort();
}

/**
 * Tolerate trailing-slash variance between filesystem-derived paths (no
 * trailing slash) and spec paths (the v1 index is documented as `/v1/`).
 */
function pathVariants(p: string): string[] {
  return p.endsWith('/') ? [p, p.slice(0, -1)] : [p, p + '/'];
}

function findSpecPath(
  spec: OpenApiSpec,
  apiPath: string
): [string, Record<string, unknown>] | undefined {
  for (const variant of pathVariants(apiPath)) {
    const ops = spec.paths[variant];
    if (ops) return [variant, ops];
  }
  return undefined;
}

function findRouteFile(routeFiles: string[], apiPath: string): string | undefined {
  return routeFiles.find(f => pathVariants(routeFileToOpenApiPath(f)).includes(apiPath));
}

describe('OpenAPI completeness gate', () => {
  const spec = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf-8')) as OpenApiSpec;
  const allRouteFiles = globSync(path.join(API_ROUTES_DIR, '**/route.ts'));
  const v1RouteFiles = globSync(path.join(V1_ROUTES_DIR, '**/route.ts'));
  const specPaths = Object.keys(spec.paths);

  it('discovers route files and spec paths', () => {
    expect(allRouteFiles.length).toBeGreaterThan(0);
    expect(v1RouteFiles.length).toBeGreaterThan(0);
    expect(specPaths.length).toBeGreaterThan(0);
  });

  // ─── Spec → Route (applies to ALL documented paths) ───────────

  it('every documented OpenAPI path has a corresponding route file', () => {
    const missing: string[] = [];
    for (const specPath of specPaths) {
      const file = findRouteFile(allRouteFiles, specPath);
      if (!file) missing.push(specPath);
    }
    expect(missing).toEqual([]);
  });

  it('every documented method is exported by its route file', () => {
    const mismatches: string[] = [];
    for (const [specPath, operations] of Object.entries(spec.paths)) {
      const file = findRouteFile(allRouteFiles, specPath);
      if (!file) continue; // previous assertion covers this
      const routeMethods = new Set(extractMethods(file));
      for (const method of Object.keys(operations)) {
        if (!HTTP_METHODS_LOWER.includes(method)) continue; // skip parameters/summary/etc.
        if (!routeMethods.has(method)) {
          mismatches.push(
            `${specPath} documents ${method.toUpperCase()} in OpenAPI but ` +
              `${path.relative(REPO_ROOT, file)} does not export it`
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('every method a documented route exports is documented in the spec', () => {
    // If the spec documents a path at all, it is making a public-contract
    // claim — and a consumer probing `curl -X GET` on a path that the spec
    // says is POST-only deserves to see that GET actually works. Every
    // method the route handler exports must appear in the spec.
    const mismatches: string[] = [];
    for (const [specPath, operations] of Object.entries(spec.paths)) {
      const file = findRouteFile(allRouteFiles, specPath);
      if (!file) continue;
      const routeMethods = extractMethods(file);
      const specMethods = new Set(
        Object.keys(operations).filter(k => HTTP_METHODS_LOWER.includes(k))
      );
      for (const method of routeMethods) {
        if (!specMethods.has(method)) {
          mismatches.push(
            `${specPath} is documented in OpenAPI but ` +
              `${path.relative(REPO_ROOT, file)} exports ${method.toUpperCase()} that the spec ignores`
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  // ─── Route → Spec (applies to /v1 only — strict versioned contract) ──

  it('every /v1 route file has a corresponding OpenAPI path', () => {
    const missing: string[] = [];
    for (const file of v1RouteFiles) {
      const apiPath = routeFileToOpenApiPath(file);
      if (!findSpecPath(spec, apiPath)) {
        missing.push(`${apiPath} (from ${path.relative(REPO_ROOT, file)})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every /v1 route method is documented in OpenAPI', () => {
    const mismatches: string[] = [];
    for (const file of v1RouteFiles) {
      const apiPath = routeFileToOpenApiPath(file);
      const routeMethods = extractMethods(file);
      const found = findSpecPath(spec, apiPath);
      const operations = found ? found[1] : {};
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
});
