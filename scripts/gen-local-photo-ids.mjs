#!/usr/bin/env node

/**
 * Generate the local-photo ID manifest
 *
 * Emits src/generated/local-photo-ids.ts — the set of bioguide IDs that have
 * a pre-downloaded WebP portrait in public/photos/webp/.
 *
 * Middleware uses this to decide which /api/representative-photo requests are
 * safe to exempt from rate limiting. An ID in this set is guaranteed to be a
 * Tier 0 filesystem hit: no Wikidata query, no House Clerk lookup, no GitHub
 * fetch, and a response the CDN caches for a week. Anything else stays
 * metered, because a cache miss on an unknown ID reaches out to third-party
 * services and must not be uncapped.
 *
 * Run after adding or removing portraits:
 *   node scripts/gen-local-photo-ids.mjs
 *
 * Forgetting to re-run this is safe in the right direction: a new portrait
 * that is missing from the manifest is rate limited rather than exempt, which
 * is the behaviour that existed before the exemption.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import fs from 'fs/promises';
import path from 'path';

const WEBP_DIR = path.join(process.cwd(), 'public', 'photos', 'webp');
const OUT_FILE = path.join(process.cwd(), 'src', 'generated', 'local-photo-ids.ts');

const BIOGUIDE_RE = /^[A-Z]\d{6}$/;

async function main() {
  const entries = await fs.readdir(WEBP_DIR);

  const ids = entries
    .filter(name => name.endsWith('.webp'))
    .map(name => path.basename(name, '.webp').toUpperCase())
    .filter(id => BIOGUIDE_RE.test(id))
    .sort();

  if (ids.length === 0) {
    throw new Error(`No portraits found in ${WEBP_DIR} — refusing to emit an empty manifest`);
  }

  const skipped = entries.filter(n => n.endsWith('.webp')).length - ids.length;
  if (skipped > 0) {
    console.warn(`⚠️  Skipped ${skipped} file(s) whose name is not a bioguide ID`);
  }

  const body = `/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bioguide IDs with a pre-downloaded portrait in public/photos/webp/.
 *
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: node scripts/gen-local-photo-ids.mjs
 *
 * A request for one of these IDs is served from disk and cached by the CDN,
 * so it is exempt from rate limiting in src/middleware.ts. IDs outside this
 * set stay metered because they fall through to Wikidata, the House Clerk,
 * and GitHub.
 */
export const LOCAL_PHOTO_IDS: ReadonlySet<string> = new Set([
${ids.map(id => `  '${id}',`).join('\n')}
]);
`;

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, body, 'utf8');

  console.log(`✅ Wrote ${ids.length} bioguide IDs to ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch(error => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
