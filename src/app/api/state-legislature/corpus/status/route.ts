/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Freshness status for the committed state legislator roster corpus.
 *
 * Rosters are served from data/openstates-people.json.br rather than the
 * OpenStates API, which means a stalled mirror shows as confidently wrong
 * membership rather than as an outage — nothing downstream can tell. This is
 * the canary for that.
 *
 * Two independent staleness signals, because they fail differently:
 *
 *   - `stale`         — our mirror stopped running. Absolute date comparison
 *                       against the date the build stamped, so reading it never
 *                       has to reason about units or elapsed time.
 *   - `upstreamAgeDays` — upstream stopped moving. A mirror can run weekly and
 *                       faithfully reproduce a repository that nobody has
 *                       updated in six months.
 *
 * Reads only the small meta sidecar, so this never decompresses the corpus.
 * Returns `status: "unavailable"` (HTTP 200) when the corpus has never been
 * generated, per the real-data-or-unavailable rule.
 */

import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getVotesCorpusStatus } from '@/lib/data-sources/openstates-votes/load-votes';

export const dynamic = 'force-dynamic';

interface PeopleMeta {
  generatedAt: string;
  /** Absolute YYYY-MM-DD after which the corpus should not be trusted as current. */
  staleAfter?: string;
  upstreamCommit: string;
  upstreamCommittedAt: string;
  jurisdictions: number;
  people: number;
  departed: number;
  compressedBytes: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export async function GET() {
  let meta: PeopleMeta | null = null;
  try {
    meta = JSON.parse(
      await readFile(join(process.cwd(), 'data', 'openstates-people.meta.json'), 'utf8')
    ) as PeopleMeta;
  } catch {
    meta = null;
  }

  if (!meta) {
    return NextResponse.json(
      {
        status: 'unavailable',
        message:
          'Roster corpus has not been generated yet. Run the openstates-people-mirror workflow.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Null when the corpus predates the field — unknown staleness, not fresh.
  const today = new Date().toISOString().slice(0, 10);
  const stale = meta.staleAfter ? today >= meta.staleAfter : null;

  return NextResponse.json(
    {
      status: 'ok',
      generatedAt: meta.generatedAt,
      generatedAgeDays: Math.round((Date.now() - new Date(meta.generatedAt).getTime()) / DAY_MS),
      staleAfter: meta.staleAfter ?? null,
      stale,
      upstream: {
        repository: 'openstates/people',
        commit: meta.upstreamCommit,
        committedAt: meta.upstreamCommittedAt,
        ageDays: Math.round((Date.now() - new Date(meta.upstreamCommittedAt).getTime()) / DAY_MS),
      },
      jurisdictions: meta.jurisdictions,
      people: meta.people,
      /**
       * Members whose every chamber role had already ended — upstream had not
       * yet moved them to retired/. A handful is normal; a jump means upstream
       * has stalled and the roster is drifting out of date seat by seat.
       */
      departed: meta.departed,
      compressedBytes: meta.compressedBytes,
      votes: await votesStatus(today),
    },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } }
  );
}

/**
 * The per-state roll-call corpus (scripts/sync-openstates-votes.ts) has its
 * own manifest and its own stall mode: artifacts live outside the repo, so a
 * month the mirror skipped shows here as `stale`, and a state it never built
 * is simply absent from `jurisdictions`.
 */
async function votesStatus(today: string) {
  const manifest = await getVotesCorpusStatus();
  if (!manifest) {
    return { status: 'unavailable', message: 'Roll-call corpus has not been generated yet.' };
  }
  const states = Object.values(manifest.jurisdictions);
  return {
    status: 'ok',
    generatedAt: manifest.generatedAt,
    generatedAgeDays: Math.round((Date.now() - new Date(manifest.generatedAt).getTime()) / DAY_MS),
    staleAfter: manifest.staleAfter,
    stale: today >= manifest.staleAfter,
    hosted: manifest.baseUrl ? 'remote' : 'local',
    jurisdictions: states.length,
    rollCalls: states.reduce((n, s) => n + s.rollCalls, 0),
    memberVotes: states.reduce((n, s) => n + s.memberVotes, 0),
    /** Rows the source could not attribute to a member — see votes-corpus.ts. */
    unresolvedVotes: states.reduce((n, s) => n + s.unresolvedVotes, 0),
  };
}
