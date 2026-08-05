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
    delete process.env.VERCEL;
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

  // NEXT_PUBLIC_BASE_URL is localhost in .env.local and is scoped to All
  // Environments in Vercel, so it must never be treated as an origin override.
  it('ignores NEXT_PUBLIC_BASE_URL entirely', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'civdotiq.org';
    expect(getServerBaseUrl()).toBe('https://civdotiq.org');
  });

  it('ignores a localhost NEXT_PUBLIC_SITE_URL when deployed on Vercel', () => {
    process.env.VERCEL = '1';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'civdotiq.org';
    expect(getServerBaseUrl()).toBe('https://civdotiq.org');
  });

  it('still honours a localhost NEXT_PUBLIC_SITE_URL off Vercel', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:4000';
    expect(getServerBaseUrl()).toBe('http://localhost:4000');
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
