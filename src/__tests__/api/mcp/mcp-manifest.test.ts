/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * MCP Server Manifest Tests
 *
 * public/.well-known/mcp.json advertises the MCP server to agents in the
 * MCP registry server.json format. The middleware also serves it for
 * GET /mcp requests that ask for JSON (agents probing the endpoint named
 * in docs) so those probes get valid JSON instead of the docs page HTML.
 */

import * as fs from 'fs';
import * as path from 'path';

const manifestPath = path.resolve(process.cwd(), 'public/.well-known/mcp.json');

interface McpManifest {
  $schema: string;
  name: string;
  description: string;
  version: string;
  websiteUrl: string;
  remotes: Array<{ type: string; url: string }>;
}

describe('MCP server manifest (/.well-known/mcp.json)', () => {
  let manifest: McpManifest;

  beforeAll(() => {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  });

  it('should be valid JSON with the registry schema declared', () => {
    expect(manifest.$schema).toMatch(
      /^https:\/\/static\.modelcontextprotocol\.io\/schemas\/[\d-]+\/server\.schema\.json$/
    );
  });

  it('should use reverse-DNS naming', () => {
    expect(manifest.name).toBe('org.civdotiq/civiq');
    expect(manifest.name).toMatch(/^[a-z0-9.-]+\/[a-z0-9-]+$/);
  });

  it('should stay within registry field limits', () => {
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.description.length).toBeLessThanOrEqual(100);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should declare the Streamable HTTP endpoint', () => {
    expect(manifest.remotes).toHaveLength(1);
    expect(manifest.remotes[0]!.type).toBe('streamable-http');
    expect(manifest.remotes[0]!.url).toBe('https://civdotiq.org/api/mcp');
  });

  it('should point the website URL at the human docs page', () => {
    expect(manifest.websiteUrl).toBe('https://civdotiq.org/mcp');
  });
});

describe('Middleware JSON-probe logic for GET /mcp', () => {
  // Mirrors the accept-header decision in src/middleware.ts (same approach
  // as the other middleware logic tests — the edge runtime module cannot be
  // imported directly under jest).
  const servesManifest = (method: string, accept: string): boolean =>
    method === 'GET' && accept.includes('application/json') && !accept.includes('text/html');

  it('should serve the manifest to JSON-only probes', () => {
    expect(servesManifest('GET', 'application/json')).toBe(true);
  });

  it('should keep the docs page for browsers', () => {
    expect(servesManifest('GET', 'text/html,application/xhtml+xml,application/json;q=0.1')).toBe(
      false
    );
  });

  it('should not intercept protocol traffic (SSE GET handled first, POST untouched)', () => {
    expect(servesManifest('POST', 'application/json, text/event-stream')).toBe(false);
  });

  it('middleware source should contain the manifest rewrite', () => {
    const middlewareSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/middleware.ts'),
      'utf-8'
    );
    expect(middlewareSrc).toContain("'/.well-known/mcp.json'");
  });
});
