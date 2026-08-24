/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Guard for the standardized ApiError response shape.
 *
 * These routes were converted from ad-hoc inline error bodies
 * (`NextResponse.json({ error: '...' }, { status: NNN })`) to the
 * `ApiErrors` / `createErrorResponse` factories in
 * src/lib/api/error-responses.ts, which emit the documented shape:
 *
 *   { success: false, error: { code, message, details? }, metadata: { timestamp } }
 *
 * That shape matches the `ApiError` schema in public/openapi.json, which
 * these endpoints' documented 400/404 responses reference. A string-valued
 * `error` field regressing into any of these files would break agent
 * consumers and render '[object Object]' in UIs that read error.message.
 *
 * On failure: use ApiErrors.* or createErrorResponse() from
 * src/lib/api/error-responses.ts instead of an inline error literal.
 */

import fs from 'fs';
import path from 'path';

const APP_API = path.join(process.cwd(), 'src', 'app', 'api');

const CONVERTED_ROUTES = [
  'intelligence/representative/[bioguideId]/vote-prediction/route.ts',
  'intelligence/representative/[bioguideId]/influence-chain/route.ts',
  'intelligence/representative/[bioguideId]/temporal/route.ts',
  'intelligence/representative/[bioguideId]/finance-jurisdiction/route.ts',
  'intelligence/sector/[sector]/leaderboard/route.ts',
  'intelligence/address/money-report/route.ts',
  'intelligence/address/representatives/route.ts',
  'intelligence/influence-clusters/route.ts',
  'search/policy-area/route.ts',
  'compare/route.ts',
  'state-legislature/[state]/route.ts',
  'state-bills/[state]/route.ts',
];

describe('ApiError shape convention', () => {
  it.each(CONVERTED_ROUTES)(
    '%s uses the error-response factories, not inline error literals',
    routeFile => {
      const source = fs.readFileSync(path.join(APP_API, routeFile), 'utf-8');
      expect(source).not.toContain('NextResponse.json({ error:');
    }
  );
});
