/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unknown /api/* paths must return structured JSON 404s, never the HTML
 * app shell. Exercises src/app/api/[...path]/route.ts directly.
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/[...path]/route';

describe('API catch-all 404', () => {
  it('returns the v1 error envelope for unknown /api/v1/* paths', async () => {
    const response = GET(new NextRequest('https://civdotiq.org/api/v1/nonexistent-endpoint'));
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe(404);
    expect(body.error.message).toContain('/api/v1/nonexistent-endpoint');
    expect(body.error.details).toContain('openapi.json');
    expect(body.meta.apiVersion).toBe('v1');
    expect(body.hints.documentation).toBe('https://civdotiq.org/docs/api');
    expect(body.hints.openapi).toBe('https://civdotiq.org/openapi.json');
  });

  it('returns the ApiError shape for unknown non-v1 /api/* paths', async () => {
    const response = GET(new NextRequest('https://civdotiq.org/api/nonexistent'));
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('/api/nonexistent');
    expect(body.hints.openapi).toBe('https://civdotiq.org/openapi.json');
    expect(body.metadata.timestamp).toBeTruthy();
  });

  it('answers write methods with the same JSON shape', async () => {
    const response = POST(new NextRequest('https://civdotiq.org/api/v1/bogus', { method: 'POST' }));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe(404);
  });
});
