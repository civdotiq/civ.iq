#!/usr/bin/env node
// scripts/diagnose-fec.js
// Focused FEC (OpenFEC) connectivity + integration diagnostic.
//
// Run with: node scripts/diagnose-fec.js
//   or:      npm run diagnose:fec
//
// Dependency-light by design: pure Node (built-in fetch on Node >=18) plus a
// tiny hand-rolled .env.local parser. No dotenv / tsx required, so this stays
// runnable even when the toolchain is half-installed.
//
// Probes:
//   1. FEC_API_KEY presence + validity (cheap /candidates/ ping)
//   2. /candidates/            (candidate search)
//   3. /committee/{id}/        (single committee lookup)
//   4. /schedules/schedule_a/  (itemized individual contributions)
// Reports HTTP status, round-trip timing, and a pass/fail summary. Exits
// non-zero if any CRITICAL probe fails so CI / bootstrap scripts can gate on it.

'use strict';

const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

// ---------------------------------------------------------------------------
// Minimal .env.local loader (no dotenv dependency)
// ---------------------------------------------------------------------------
function loadEnvLocal() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Do not clobber values already set in the real environment.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// Terminal colors (match scripts/diagnose-apis.ts conventions)
// ---------------------------------------------------------------------------
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

const FEC_BASE = 'https://api.open.fec.gov/v1';

// ---------------------------------------------------------------------------
// Single probe runner. Returns { ok, status, ms }.
// ---------------------------------------------------------------------------
async function probe({ name, path, critical }) {
  log(`Testing ${name}...`, 'cyan');

  const apiKey = process.env.FEC_API_KEY;
  if (!apiKey) {
    log('  FAIL  Missing FEC_API_KEY (cannot call OpenFEC)', 'red');
    return { ok: false, status: 0, ms: 0, critical };
  }

  // OpenFEC accepts the key as a query parameter (api_key=...). We also send
  // the X-Api-Key header for belt-and-suspenders parity with the runtime
  // service in src/lib/fec/fec-api-service.ts.
  const sep = path.includes('?') ? '&' : '?';
  const url = `${FEC_BASE}${path}${sep}api_key=${encodeURIComponent(apiKey)}`;

  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(15000),
    });
    const ms = Date.now() - started;

    if (response.status === 200) {
      let count = null;
      try {
        const data = await response.json();
        if (data && data.pagination && typeof data.pagination.count === 'number') {
          count = data.pagination.count;
        } else if (data && Array.isArray(data.results)) {
          count = data.results.length;
        }
      } catch {
        /* body parse is best-effort */
      }
      const countNote = count !== null ? ` (results available: ${count})` : '';
      log(`  PASS  ${name} - 200 in ${ms}ms${countNote}`, 'green');
      return { ok: true, status: 200, ms, critical };
    }

    // Non-200. 401/403 almost always means a bad/expired key.
    let detail = '';
    try {
      const text = await response.text();
      if (text) detail = ` - ${text.substring(0, 160)}`;
    } catch {
      /* ignore */
    }
    if (response.status === 401 || response.status === 403) {
      log(`  FAIL  ${name} - ${response.status} (check FEC_API_KEY validity)${detail}`, 'red');
    } else if (response.status === 429) {
      log(`  WARN  ${name} - 429 rate limited in ${ms}ms (key is valid)`, 'yellow');
    } else {
      log(`  FAIL  ${name} - expected 200, got ${response.status} in ${ms}ms${detail}`, 'red');
    }
    // A 429 still proves the key works, so don't count it as a hard failure.
    return { ok: response.status === 429, status: response.status, ms, critical };
  } catch (error) {
    const ms = Date.now() - started;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log(`  FAIL  ${name} - network error after ${ms}ms: ${msg}`, 'red');
    return { ok: false, status: 0, ms, critical };
  }
}

async function main() {
  log('=================================', 'cyan');
  log('   CIV.IQ FEC Diagnostic Tool    ', 'cyan');
  log('=================================', 'cyan');

  // --- Key presence ---
  log('\n=== Environment ===\n', 'cyan');
  const key = process.env.FEC_API_KEY;
  if (!key) {
    log('FAIL  FEC_API_KEY missing.', 'red');
    log('      1. Get a free key at https://api.open.fec.gov/developers/', 'blue');
    log('      2. Add to .env.local:  FEC_API_KEY=your_key_here', 'blue');
    process.exit(1);
  }
  if (key === 'DEMO_KEY') {
    log(
      'WARN  FEC_API_KEY is set to DEMO_KEY (very low rate limit; not for production).',
      'yellow'
    );
  } else {
    log(`PASS  FEC_API_KEY present: ${key.substring(0, 6)}...`, 'green');
  }

  // --- Probes ---
  // Known-stable IDs: P80001571 = Obama for America presidential committee.
  log('\n=== OpenFEC Endpoint Probes ===\n', 'cyan');
  const probes = [
    {
      name: 'Key validity / candidate search (/candidates/)',
      path: '/candidates/?per_page=1&sort=name',
      critical: true,
    },
    {
      name: 'Committee lookup (/committee/{id}/)',
      path: '/committee/C00431445/', // Obama for America
      critical: true,
    },
    {
      name: 'Itemized contributions (/schedules/schedule_a/)',
      path: '/schedules/schedule_a/?committee_id=C00431445&two_year_transaction_period=2012&per_page=1',
      critical: false,
    },
  ];

  const results = [];
  for (const p of probes) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await probe(p));
    // Gentle pacing to stay under the OpenFEC rate limit.
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 400));
  }

  // --- Summary ---
  log('\n=== Summary ===\n', 'cyan');
  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  const criticalFailed = results.filter(r => !r.ok && r.critical).length;
  const avgMs =
    results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.ms, 0) / results.length) : 0;

  log(`${passed} passed, ${failed} failed (avg ${avgMs}ms)`, failed === 0 ? 'green' : 'yellow');

  if (criticalFailed > 0) {
    log(`\nFAIL  ${criticalFailed} critical probe(s) failed — FEC integration is degraded.`, 'red');
    process.exit(1);
  }

  log('\nPASS  FEC integration reachable.', 'green');
  process.exit(0);
}

main().catch(error => {
  log(`\nFatal error: ${error instanceof Error ? error.stack : error}`, 'red');
  process.exit(1);
});
