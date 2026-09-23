/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Shared setup for cron route tests. The global next/server mock has no real
 * Headers, so cron tests swap in these minimal classes:
 *   jest.mock('next/server', () => require('./cron-test-helpers').nextServerMock());
 */

import type { NextRequest } from 'next/server';

export function nextServerMock() {
  class _NextResponse {
    status: number;
    headers: Headers;
    private body: unknown;

    constructor(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }

    async json() {
      return this.body;
    }

    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new _NextResponse(data, init);
    }
  }

  class _NextRequest {
    url: string;
    method: string;
    headers: Headers;
    nextUrl: URL;

    constructor(
      urlInput: string | URL,
      init?: { method?: string; headers?: Record<string, string> }
    ) {
      this.url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      this.method = init?.method ?? 'GET';
      this.headers = new Headers(init?.headers);
      this.nextUrl = new URL(this.url);
    }
  }

  return { NextResponse: _NextResponse, NextRequest: _NextRequest };
}

export function makeCronRequest(path: string, authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.authorization = authHeader;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest: NR } = require('next/server');
  return new NR(`http://localhost:3000${path}`, { headers }) as NextRequest;
}

export function fakeReps(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    bioguideId: `B${String(i).padStart(3, '0')}`,
    name: `Rep ${i}`,
  }));
}
