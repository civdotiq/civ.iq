/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Keep src/data/member-roster-history.json current: walk the upstream
 * commits to congress-legislators' legislators-current.yaml newer than the
 * last one read, oldest first, and date each member's roster facts by the
 * commit that last changed them. See src/lib/data/member-roster-history.ts.
 *
 * With no history file yet (or --seed), starts from the version in effect
 * when the sitting Congress convened and walks every commit since.
 *
 * Usage: npx tsx scripts/sync-member-roster-history.ts [--seed]
 *
 * Reads the GitHub API (GITHUB_TOKEN raises the limit; a weekly run needs
 * only a request or two) and raw.githubusercontent.com. Run weekly by the
 * Sync Congress Legislators workflow.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import {
  applyRosterVersion,
  type MemberRosterHistory,
  type RosterEntry,
} from '../src/lib/data/member-roster-history';
import { getCurrentCongressNumber } from '../src/lib/data/congressional-constants';

const REPO = 'unitedstates/congress-legislators';
const FILE = 'legislators-current.yaml';
const PATH = resolve(process.cwd(), 'src/data/member-roster-history.json');
/** Far below the real ~539: trips on a truncated download, not on turnover. */
const MIN_MEMBERS = 500;

interface Commit {
  sha: string;
  commit: { committer: { date: string } };
}

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'civdotiq roster history',
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

/** Commits touching the roster file, oldest first; `since` and `until` are ISO times. */
async function rosterCommits(opts: { since?: string; until?: string }): Promise<Commit[]> {
  const commits: Commit[] = [];
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({ path: FILE, per_page: '100', page: String(page) });
    if (opts.since) params.set('since', opts.since);
    if (opts.until) params.set('until', opts.until);
    const batch = await getJson<Commit[]>(`https://api.github.com/repos/${REPO}/commits?${params}`);
    commits.push(...batch);
    if (batch.length < 100) break;
  }
  return commits.reverse();
}

async function rosterAt(sha: string): Promise<RosterEntry[]> {
  const url = `https://raw.githubusercontent.com/${REPO}/${sha}/${FILE}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  const entries = yaml.load(await response.text()) as RosterEntry[];
  if (!Array.isArray(entries) || entries.length < MIN_MEMBERS) {
    throw new Error(`${sha}: ${entries?.length ?? 0} members, refusing`);
  }
  return entries;
}

async function main(): Promise<void> {
  const seed = process.argv.includes('--seed') || !existsSync(PATH);
  let history: MemberRosterHistory;
  if (seed) {
    // The version in effect when the sitting Congress convened.
    const convened = `${1789 + (getCurrentCongressNumber() - 1) * 2}-01-03T17:00:00Z`;
    const [start] = (await rosterCommits({ until: convened })).slice(-1);
    if (!start) throw new Error('No roster commit before the Congress convened');
    history = {
      throughCommit: start.sha,
      throughDate: start.commit.committer.date,
      source: `${REPO} ${FILE} git history (CC0-1.0)`,
      members: applyRosterVersion({}, await rosterAt(start.sha), start.commit.committer.date),
    };
    console.log(`Seeded from ${start.sha.slice(0, 8)} (${start.commit.committer.date})`);
  } else {
    history = JSON.parse(readFileSync(PATH, 'utf8')) as MemberRosterHistory;
  }

  const newer = (await rosterCommits({ since: history.throughDate })).filter(
    c => c.sha !== history.throughCommit && c.commit.committer.date >= history.throughDate
  );
  for (const commit of newer) {
    history.members = applyRosterVersion(
      history.members,
      await rosterAt(commit.sha),
      commit.commit.committer.date
    );
    history.throughCommit = commit.sha;
    history.throughDate = commit.commit.committer.date;
    console.log(`  ${commit.sha.slice(0, 8)} ${commit.commit.committer.date}`);
  }

  const count = Object.keys(history.members).length;
  if (count < MIN_MEMBERS) throw new Error(`Refusing to write: ${count} members`);
  writeFileSync(PATH, `${JSON.stringify(history, null, 2)}\n`);
  console.log(`Wrote ${count} members through ${history.throughCommit.slice(0, 8)}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
