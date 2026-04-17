/**
 * Adoption snapshot — npm downloads for the three @civiq packages.
 *
 * Polls api.npmjs.org for last-day, last-week, and last-month download
 * counts and writes docs/adoption/npm-downloads.json. Runs weekly via
 * .github/workflows/snapshot-adoption.yml and opens a PR when the file
 * changes so the signal is tracked in git history.
 *
 * Usage:
 *   npx tsx scripts/snapshot-adoption.ts              # write updated JSON
 *   npx tsx scripts/snapshot-adoption.ts --dry-run    # preview, no write
 *
 * Npm downloads API: https://github.com/npm/registry/blob/master/docs/download-counts.md
 */

import fs from 'fs';
import path from 'path';

const PACKAGES = ['@civiq/civic-statistics', '@civiq/entity-resolution', '@civiq/sdk'] as const;
const PERIODS = ['last-day', 'last-week', 'last-month'] as const;
const OUTPUT_PATH = path.join(process.cwd(), 'docs/adoption/npm-downloads.json');

type Period = (typeof PERIODS)[number];

interface DownloadsByPeriod {
  'last-day': number | null;
  'last-week': number | null;
  'last-month': number | null;
}

interface PackageSnapshot {
  package: string;
  downloads: DownloadsByPeriod;
  publishedVersion: string | null;
  lastRefreshed: string;
}

interface AdoptionSnapshot {
  generatedAt: string;
  source: 'https://api.npmjs.org/downloads/point/{period}/{package}';
  packages: PackageSnapshot[];
}

async function fetchDownloads(pkg: string, period: Period): Promise<number | null> {
  const url = `https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(pkg)}`;
  try {
    const res = await fetch(url);
    if (res.status === 404) return null; // package not yet published
    if (!res.ok) {
      console.warn(`[adoption] ${pkg} ${period}: ${res.status} ${res.statusText}`);
      return null;
    }
    const body = (await res.json()) as { downloads?: number };
    return typeof body.downloads === 'number' ? body.downloads : null;
  } catch (err) {
    console.warn(`[adoption] ${pkg} ${period}: ${(err as Error).message}`);
    return null;
  }
}

async function fetchPublishedVersion(pkg: string): Promise<string | null> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(pkg).replace('%40', '@')}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const body = (await res.json()) as { 'dist-tags'?: { latest?: string } };
    return body['dist-tags']?.latest ?? null;
  } catch {
    return null;
  }
}

async function snapshotPackage(pkg: string): Promise<PackageSnapshot> {
  const [lastDay, lastWeek, lastMonth, publishedVersion] = await Promise.all([
    fetchDownloads(pkg, 'last-day'),
    fetchDownloads(pkg, 'last-week'),
    fetchDownloads(pkg, 'last-month'),
    fetchPublishedVersion(pkg),
  ]);
  return {
    package: pkg,
    downloads: {
      'last-day': lastDay,
      'last-week': lastWeek,
      'last-month': lastMonth,
    },
    publishedVersion,
    lastRefreshed: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const snapshots = await Promise.all(PACKAGES.map(snapshotPackage));

  const output: AdoptionSnapshot = {
    generatedAt: new Date().toISOString(),
    source: 'https://api.npmjs.org/downloads/point/{period}/{package}',
    packages: snapshots,
  };

  const json = `${JSON.stringify(output, null, 2)}\n`;

  if (dryRun) {
    process.stdout.write(json);
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, json);
  console.log(`[adoption] wrote ${OUTPUT_PATH}`);
  for (const snap of snapshots) {
    const { 'last-week': week, 'last-month': month } = snap.downloads;
    console.log(
      `[adoption] ${snap.package}: week=${week ?? 'n/a'} month=${month ?? 'n/a'} version=${snap.publishedVersion ?? 'unpublished'}`
    );
  }
}

main().catch(err => {
  console.error('[adoption] fatal', err);
  process.exit(1);
});
