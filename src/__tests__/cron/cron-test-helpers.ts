/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Shared setup for cron route tests. The global next/server mock
 * (jest.setup.js) covers NextResponse.json; cron routes only read the
 * Authorization header, so a plain object with real Headers is enough.
 */

import type { NextRequest } from 'next/server';

export function makeCronRequest(path: string, authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set('authorization', authHeader);
  return { url: `http://localhost:3000${path}`, method: 'GET', headers } as unknown as NextRequest;
}

export function fakeReps(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    bioguideId: `B${String(i).padStart(3, '0')}`,
    name: `Rep ${i}`,
  }));
}
