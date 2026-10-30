/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Every page route with an ID in its address must answer a made-up ID with
 * a real 404 and one robots tag ("noindex"), and a real ID with a 200 and no
 * noindex. Fetched as Googlebot, so metadata isn't streamed.
 *
 * Usage:
 *   npx tsx scripts/check-made-up-ids.ts [--base http://localhost:3000]
 *
 * Against production, set FIREWALL_BYPASS_TOKEN (Bot Protection challenges
 * scripted requests otherwise). Exits 1 on any mismatch.
 */

import './load-env';

const baseIndex = process.argv.indexOf('--base');
const BASE = ((baseIndex !== -1 && process.argv[baseIndex + 1]) || 'https://civdotiq.org').replace(
  /\/$/,
  ''
);

const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/** [path, expected status]. 404s must carry exactly one robots tag, "noindex". */
const CASES: Array<[string, 200 | 404]> = [
  ['/committee/ZZZZ99', 404],
  ['/committee/JSZZ', 404],
  ['/committee/SSJU99', 404],
  ['/committee/SSJU', 200],
  ['/committee/SSJU01', 200],
  ['/committee/SSFR', 200],
  ['/ask/committee-activity/ZZZZ99', 404],
  ['/ask/committee-members/ZZZZ99', 404],
  ['/ask/committee-lobbying/ZZZZ99', 404],
  ['/ask/committee-members/SSJU', 200],
  ['/industry/not-a-sector', 404],
  ['/industry/defense', 200],
  ['/regulations/0000-00000', 404],
  ['/regulations/2026-99999', 404],
  ['/state-bills/zz', 404],
  ['/state-bills/mi', 200],
  ['/state-bills/mi/fake-bill', 404],
  ['/state-bills/mi/HB-99999', 404],
  ['/state-legislature/zz/committees', 404],
  ['/state-legislature/mi/committees', 200],
  ['/vote/senate-119-2-600', 404],
  ['/vote/senate-119-2-256', 200],
  ['/districts/MI-99/print', 404],
  ['/embed/bill/fake', 404],
  ['/embed/district/MI-99', 404],
  ['/embed/reps/MI-99', 404],
  ['/representative/Z999999', 404],
  ['/districts/MI-99', 404],
  ['/states/zz', 404],
];

async function check([path, expected]: [string, number]): Promise<string | null> {
  const bypass = process.env.FIREWALL_BYPASS_TOKEN;
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': UA, ...(bypass ? { 'x-civiq-bypass': bypass } : {}) },
    redirect: 'manual',
    signal: AbortSignal.timeout(90_000),
  });
  const html = await response.text();
  const robots = [...html.matchAll(/<meta name="robots" content="([^"]*)"/g)].map(m => m[1]);
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  const line = `${response.status} ${path} robots=${JSON.stringify(robots)} title="${title}"`;
  console.log(line);
  if (response.status !== expected)
    return `${path}: status ${response.status}, expected ${expected}`;
  if (expected === 404 && (robots.length !== 1 || robots[0] !== 'noindex')) {
    return `${path}: robots ${JSON.stringify(robots)}, expected exactly ["noindex"]`;
  }
  if (expected === 200 && robots.some(r => r?.includes('noindex'))) {
    return `${path}: a real page is noindexed`;
  }
  return null;
}

async function main(): Promise<void> {
  const failures: string[] = [];
  for (const c of CASES) {
    const failure = await check(c).catch((error: Error) => `${c[0]}: ${error.message}`);
    if (failure) failures.push(failure);
  }
  console.log(
    failures.length ? `\nFAIL (${failures.length})` : `\nPASS: ${CASES.length} addresses`
  );
  for (const f of failures) console.log(`- ${f}`);
  process.exit(failures.length ? 1 : 0);
}

main();
