/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Keep src/data/committee-roster-history.json current: walk the upstream
 * commits to congress-legislators' committees-current.yaml and
 * committee-membership-current.yaml newer than the last one read, oldest
 * first, and date each committee's facts by the commit that last changed
 * them. See src/lib/data/committee-roster-history.ts.
 *
 * With no history file yet (or --seed), starts from the versions in effect
 * when the sitting Congress convened and walks every commit since.
 *
 * Usage: npx tsx scripts/sync-committee-roster-history.ts [--seed]
 *
 * Reads the GitHub API (GITHUB_TOKEN raises the limit; a weekly run needs a
 * few requests) and raw.githubusercontent.com. Run weekly by the Sync
 * Congress Legislators workflow.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import {
  applyCommitteeVersion,
  type CommitteeRosterHistory,
  type UpstreamCommitteeEntry,
  type UpstreamMembership,
} from '../src/lib/data/committee-roster-history';
import { getCurrentCongressNumber } from '../src/lib/data/congressional-constants';

const REPO = 'unitedstates/congress-legislators';
const FILES = ['committees-current.yaml', 'committee-membership-current.yaml'] as const;
const PATH = resolve(process.cwd(), 'src/data/committee-roster-history.json');
// Structural floors far below the real figures (49 committees, ~230 committee
// and subcommittee IDs in 2026): they trip on a truncated download, not on
// reorganization.
const MIN_COMMITTEES = 35;
const MIN_IDS = 150;

interface Commit {
  sha: string;
  commit: { committer: { date: string } };
}

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'civdotiq committee roster history',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return (await response.json()) as T;
}

/** Commits touching either file, oldest first, deduplicated; `since`/`until` are ISO times. */
async function fileCommits(opts: { since?: string; until?: string }): Promise<Commit[]> {
  const bySha = new Map<string, Commit>();
  for (const file of FILES) {
    for (let page = 1; ; page++) {
      const params = new URLSearchParams({ path: file, per_page: '100', page: String(page) });
      if (opts.since) params.set('since', opts.since);
      if (opts.until) params.set('until', opts.until);
      const batch = await getJson<Commit[]>(
        `https://api.github.com/repos/${REPO}/commits?${params}`
      );
      for (const commit of batch) bySha.set(commit.sha, commit);
      if (batch.length < 100) break;
    }
  }
  return [...bySha.values()].sort((a, b) =>
    a.commit.committer.date.localeCompare(b.commit.committer.date)
  );
}

async function fileAt<T>(sha: string, file: string): Promise<T> {
  const url = `https://raw.githubusercontent.com/${REPO}/${sha}/${file}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return yaml.load(await response.text()) as T;
}

/** Both files as they stood at one commit, refusing a truncated download. */
async function versionAt(
  sha: string
): Promise<{ committees: UpstreamCommitteeEntry[]; membership: UpstreamMembership }> {
  const [committees, membership] = await Promise.all([
    fileAt<UpstreamCommitteeEntry[]>(sha, FILES[0]),
    fileAt<UpstreamMembership>(sha, FILES[1]),
  ]);
  if (!Array.isArray(committees) || committees.length < MIN_COMMITTEES) {
    throw new Error(`${sha}: ${committees?.length ?? 0} committees, refusing`);
  }
  // An empty map is real: upstream clears the file when a new Congress
  // convenes and refills it as committees organize (it was {} on 2025-01-04).
  if (!membership || typeof membership !== 'object' || Array.isArray(membership)) {
    throw new Error(`${sha}: membership file is not a map, refusing`);
  }
  return { committees, membership };
}

async function main(): Promise<void> {
  const seed = process.argv.includes('--seed') || !existsSync(PATH);
  let history: CommitteeRosterHistory;
  if (seed) {
    // The versions in effect when the sitting Congress convened.
    const convened = `${1789 + (getCurrentCongressNumber() - 1) * 2}-01-03T17:00:00Z`;
    const [start] = (await fileCommits({ until: convened })).slice(-1);
    if (!start) throw new Error('No committee commit before the Congress convened');
    const { committees, membership } = await versionAt(start.sha);
    history = {
      throughCommit: start.sha,
      throughDate: start.commit.committer.date,
      source: `${REPO} ${FILES.join(' + ')} git history (CC0-1.0)`,
      committees: applyCommitteeVersion({}, committees, membership, start.commit.committer.date),
    };
    console.log(`Seeded from ${start.sha.slice(0, 8)} (${start.commit.committer.date})`);
  } else {
    history = JSON.parse(readFileSync(PATH, 'utf8')) as CommitteeRosterHistory;
  }

  const newer = (await fileCommits({ since: history.throughDate })).filter(
    c => c.sha !== history.throughCommit && c.commit.committer.date >= history.throughDate
  );
  for (const commit of newer) {
    const { committees, membership } = await versionAt(commit.sha);
    history.committees = applyCommitteeVersion(
      history.committees,
      committees,
      membership,
      commit.commit.committer.date
    );
    history.throughCommit = commit.sha;
    history.throughDate = commit.commit.committer.date;
    console.log(`  ${commit.sha.slice(0, 8)} ${commit.commit.committer.date}`);
  }

  const count = Object.keys(history.committees).length;
  if (count < MIN_IDS) throw new Error(`Refusing to write: ${count} committees`);
  writeFileSync(PATH, `${JSON.stringify(history, null, 2)}\n`);
  console.log(
    `Wrote ${count} committees and subcommittees through ${history.throughCommit.slice(0, 8)}`
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
