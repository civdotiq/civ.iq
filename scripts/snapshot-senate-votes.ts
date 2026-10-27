/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Copy the Senate roll-call corpus out of Redis into a committed file
 * (data/senate-votes-{congress}.json.br + .meta.json), so votes mirrored from
 * senate.gov survive Redis expiry. See senate-votes-snapshot.ts.
 *
 * Usage:
 *   npx tsx scripts/snapshot-senate-votes.ts [--congress 119]
 *
 * Read-only against Redis. Refuses to write when any roll call the vote menu
 * lists is missing from Redis or has too few members to be a real roll call,
 * because a partial snapshot must never be committed.
 */

import './load-env';

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { getRedisCache } from '../src/lib/cache/redis-client';
import {
  READ_BATCH,
  rollKey,
  senateMenuKey,
  type CompactRollCall,
  type SenateVoteMenu,
} from '../src/features/representatives/services/roll-call-corpus';
import {
  snapshotPath,
  type SenateVotesSnapshotFile,
} from '../src/features/representatives/services/senate-votes-snapshot';

/** Same floor the ingest route uses to reject memberless shells. */
const MIN_MEMBERS = 80;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const congress = parseInt(argValue('--congress') ?? '119', 10);
  const redis = getRedisCache();

  const menu = await redis.get<SenateVoteMenu>(senateMenuKey(congress));
  if (!menu) throw new Error(`No Senate vote menu in Redis for the ${congress}th Congress`);

  const rolls: CompactRollCall[] = [];
  const problems: string[] = [];
  const perSession: Record<string, number> = {};

  for (const [session, entries] of Object.entries(menu.sessions)) {
    const sessionNum = parseInt(session, 10);
    perSession[session] = entries.length;
    for (let i = 0; i < entries.length; i += READ_BATCH) {
      const batch = entries.slice(i, i + READ_BATCH);
      const got = await redis.mget<CompactRollCall>(
        batch.map(e => rollKey('senate', congress, sessionNum, e.n))
      );
      batch.forEach((entry, j) => {
        const roll = got[j];
        if (!roll) {
          problems.push(`session ${session} roll ${entry.n}: missing from Redis`);
        } else if (roll.rollCallNumber !== entry.n || roll.session !== sessionNum) {
          problems.push(
            `session ${session} roll ${entry.n}: stored roll is ${roll.session}-${roll.rollCallNumber}`
          );
        } else if (roll.votes.length < MIN_MEMBERS) {
          problems.push(`session ${session} roll ${entry.n}: only ${roll.votes.length} members`);
        } else {
          rolls.push(roll);
        }
      });
    }
  }

  console.log(`Menu updatedAt ${menu.updatedAt}; menu entries per session:`, perSession);
  console.log(`Rolls read: ${rolls.length}`);
  if (problems.length > 0) {
    console.error(`Refusing to write: ${problems.length} problem(s)`);
    for (const p of problems.slice(0, 50)) console.error(`  ${p}`);
    await redis.disconnect();
    process.exit(1);
  }

  rolls.sort((a, b) => a.session - b.session || a.rollCallNumber - b.rollCallNumber);
  const dates = rolls.map(r => r.date).sort();
  const file: SenateVotesSnapshotFile = {
    congress,
    generatedAt: new Date().toISOString(),
    source:
      'senate.gov roll-call vote XML and vote menus, mirrored by the sync-senate-votes workflow into Redis, then copied here',
    menu,
    rolls,
  };

  const json = JSON.stringify(file);
  const compressed = brotliCompressSync(Buffer.from(json), {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  });
  const outPath = snapshotPath(congress);
  writeFileSync(outPath, compressed);

  const rollsPerSession: Record<string, number> = {};
  let memberVotes = 0;
  for (const r of rolls) {
    rollsPerSession[r.session] = (rollsPerSession[r.session] ?? 0) + 1;
    memberVotes += r.votes.length;
  }
  const meta = {
    generatedAt: file.generatedAt,
    congress,
    menuUpdatedAt: menu.updatedAt,
    rolls: rolls.length,
    rollsPerSession,
    memberVotes,
    firstVoteDate: dates[0] ?? null,
    lastVoteDate: dates[dates.length - 1] ?? null,
    compressedBytes: compressed.length,
    sha256: createHash('sha256').update(json).digest('hex'),
    source: file.source,
  };
  writeFileSync(outPath.replace(/\.json\.br$/, '.meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`Wrote ${outPath} (${compressed.length} bytes)`, meta);
  await redis.disconnect();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
