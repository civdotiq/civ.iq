/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getServerBaseUrl } from '@/lib/server-url';

describe('getServerBaseUrl', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  afterAll(() => {
    process.env = original;
  });

  it('falls back to localhost when nothing is configured', () => {
    expect(getServerBaseUrl()).toBe('http://localhost:3000');
  });

  it('prefers an explicit NEXT_PUBLIC_SITE_URL over everything else', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://override.example';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'civdotiq.org';
    process.env.VERCEL_URL = 'civ-abc123.vercel.app';
    expect(getServerBaseUrl()).toBe('https://override.example');
  });

  it('accepts NEXT_PUBLIC_BASE_URL as an override too', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://alt.example';
    process.env.VERCEL_URL = 'civ-abc123.vercel.app';
    expect(getServerBaseUrl()).toBe('https://alt.example');
  });

  // The deployment hostname sits behind Vercel SSO on this project, so a
  // self-fetch to it gets a login redirect instead of JSON. The production
  // custom domain must win.
  it('prefers the production custom domain over the deployment URL', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'civdotiq.org';
    process.env.VERCEL_URL = 'civ-mxhjk49da-civdotiq.vercel.app';
    expect(getServerBaseUrl()).toBe('https://civdotiq.org');
  });

  it('uses the deployment URL when no production domain is exposed', () => {
    process.env.VERCEL_URL = 'civ-mxhjk49da-civdotiq.vercel.app';
    expect(getServerBaseUrl()).toBe('https://civ-mxhjk49da-civdotiq.vercel.app');
  });
});
