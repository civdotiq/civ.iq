/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The API version is declared in three places: the X-API-Version constant,
 * the OpenAPI spec, and the newest changelog entry. They must never drift
 * (spec said 1.1.0 while the header said 1.0.0 until 2026-08).
 */

import fs from 'fs';
import path from 'path';
import { API_VERSION } from '@/lib/api/v1-versioning';

describe('API version declarations stay in sync', () => {
  it('matches the OpenAPI spec version', () => {
    const spec = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'public', 'openapi.json'), 'utf8')
    ) as { info: { version: string } };
    expect(spec.info.version).toBe(API_VERSION);
  });

  it('matches the newest changelog entry', async () => {
    const { GET } = await import('@/app/api/v1/changelog/route');
    const body = await (await GET()).json();
    expect(body.data.currentVersion).toBe(API_VERSION);
    expect(body.data.versions[0].version).toBe(API_VERSION);
  });
});
