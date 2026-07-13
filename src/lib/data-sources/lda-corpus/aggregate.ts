/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getLDAIssueLabel, normalizeCompanyName } from '@civiq/entity-resolution';
import { dedupeAmendments } from './dedupe';
import { resolveFilingCommittees } from './committee-match';
import type {
  CommitteeQuarterAgg,
  CompactFiling,
  IssueQuarterAgg,
  IssueTally,
  LdaAggregates,
  NationalQuarterAgg,
  OrgAgg,
} from './types';

const TOP_ORGS = 50;
const TOP_ISSUES = 10;

/**
 * Mutable accumulator for one organization within a bucket. Keyed by the
 * canonical company name, not LDA client.id: client.id is per firm-relationship,
 * so a client that hires several firms has many ids (Amazon had 14 in one
 * quarter). normalizeCompanyName merges the suffix/punctuation variants safely
 * (it keeps genuinely distinct names apart, e.g. CVS Health vs CVS Pharmacy).
 * Residual splits remain (an org's "Services" arm may stay separate) — that is
 * acceptable and never a wrong merge.
 */
interface OrgAcc {
  /** Raw name variants seen, with counts; the most frequent becomes the label. */
  variants: Map<string, number>;
  /** Distinct registrant ids; a link is kept only when the org has exactly one. */
  registrantIds: Set<string>;
  amount: number;
  filings: number;
}

function orgKey(clientName: string): string {
  return normalizeCompanyName(clientName) || clientName.trim().toUpperCase();
}

function accumulateOrg(map: Map<string, OrgAcc>, f: CompactFiling): void {
  const key = orgKey(f.clientName);
  const acc = map.get(key);
  if (acc) {
    acc.amount += f.amount;
    acc.filings += 1;
    acc.variants.set(f.clientName, (acc.variants.get(f.clientName) ?? 0) + 1);
    if (f.registrantId) acc.registrantIds.add(f.registrantId);
  } else {
    map.set(key, {
      variants: new Map([[f.clientName, 1]]),
      registrantIds: new Set(f.registrantId ? [f.registrantId] : []),
      amount: f.amount,
      filings: 1,
    });
  }
}

/** Most frequently seen raw name variant, ties broken by longer (more specific) name. */
function displayName(variants: Map<string, number>): string {
  return [...variants.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]![0];
}

function topOrgs(map: Map<string, OrgAcc>): OrgAgg[] {
  return Array.from(map.values())
    .sort((a, b) => b.amount - a.amount || b.filings - a.filings)
    .slice(0, TOP_ORGS)
    .map(o => ({
      name: displayName(o.variants),
      // Link only when unambiguous — merged multi-firm clients have several
      // registrant ids and no single meaningful lobby profile to link to.
      registrantId: o.registrantIds.size === 1 ? [...o.registrantIds][0]! : null,
      amount: o.amount,
      filings: o.filings,
    }));
}

/** One committee×quarter or issue×quarter bucket under construction. */
interface Bucket {
  total: number;
  filingCount: number;
  orgs: Map<string, OrgAcc>;
  issues: Map<string, number>;
}

function newBucket(): Bucket {
  return { total: 0, filingCount: 0, orgs: new Map(), issues: new Map() };
}

function topIssues(issues: Map<string, number>): IssueTally[] {
  return Array.from(issues.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ISSUES)
    .map(([code, count]) => ({ code, label: getLDAIssueLabel(code), count }));
}

/**
 * Build the complete aggregate set from parsed filings. Filings are deduped
 * (latest amendment wins) before aggregation. Each filing's gated amount is
 * attributed to every committee its government_entities resolve to and every
 * issue code it lists — a filing naming two committees counts toward both, so
 * committee totals are "spend on filings that disclose this committee", not a
 * partition (documented in methodology).
 */
export function buildAggregates(rawFilings: CompactFiling[], generatedAt: string): LdaAggregates {
  const filings = dedupeAmendments(rawFilings);

  const committeeBuckets = new Map<string, { name: string; byQuarter: Map<string, Bucket> }>();
  const issueBuckets = new Map<string, Map<string, Bucket>>();
  const national = new Map<string, Bucket>();
  const quarters = new Set<string>();
  let latestPosted: string | null = null;
  let gatedFilingCount = 0;

  for (const f of filings) {
    quarters.add(f.quarter);
    if (f.gated) gatedFilingCount += 1;
    if (!latestPosted || Date.parse(f.dtPosted) > Date.parse(latestPosted))
      latestPosted = f.dtPosted;

    // National
    const nat = national.get(f.quarter) ?? newBucket();
    nat.total += f.amount;
    nat.filingCount += 1;
    accumulateOrg(nat.orgs, f);
    national.set(f.quarter, nat);

    // Committees (via government entities + issue-code jurisdiction)
    const resolved = resolveFilingCommittees(f);
    for (const c of resolved) {
      const entry =
        committeeBuckets.get(c.committeeCode) ??
        ({ name: c.committeeName, byQuarter: new Map() } as {
          name: string;
          byQuarter: Map<string, Bucket>;
        });
      const b = entry.byQuarter.get(f.quarter) ?? newBucket();
      b.total += f.amount;
      b.filingCount += 1;
      accumulateOrg(b.orgs, f);
      for (const code of f.issueCodes) b.issues.set(code, (b.issues.get(code) ?? 0) + 1);
      entry.byQuarter.set(f.quarter, b);
      committeeBuckets.set(c.committeeCode, entry);
    }

    // Issues
    for (const code of f.issueCodes) {
      const byQuarter = issueBuckets.get(code) ?? new Map<string, Bucket>();
      const b = byQuarter.get(f.quarter) ?? newBucket();
      b.total += f.amount;
      b.filingCount += 1;
      accumulateOrg(b.orgs, f);
      byQuarter.set(f.quarter, b);
      issueBuckets.set(code, byQuarter);
    }
  }

  const committees: CommitteeQuarterAgg[] = [];
  for (const [committeeCode, entry] of committeeBuckets) {
    for (const [quarter, b] of entry.byQuarter) {
      committees.push({
        committeeCode,
        committeeName: entry.name,
        quarter,
        total: b.total,
        filingCount: b.filingCount,
        orgCount: b.orgs.size,
        topOrgs: topOrgs(b.orgs),
        topIssues: topIssues(b.issues),
      });
    }
  }

  const issues: IssueQuarterAgg[] = [];
  for (const [code, byQuarter] of issueBuckets) {
    for (const [quarter, b] of byQuarter) {
      issues.push({
        code,
        label: getLDAIssueLabel(code),
        quarter,
        total: b.total,
        filingCount: b.filingCount,
        orgCount: b.orgs.size,
        topOrgs: topOrgs(b.orgs),
      });
    }
  }

  const nationalAgg: NationalQuarterAgg[] = Array.from(national.entries())
    .map(([quarter, b]) => ({
      quarter,
      total: b.total,
      filingCount: b.filingCount,
      orgCount: b.orgs.size,
    }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));

  return {
    generatedAt,
    quarters: Array.from(quarters).sort((a, b) => a.localeCompare(b)),
    methodology:
      'Complete Senate LDA quarterly reports (LD-2) for the window, deduped so the ' +
      'latest amendment supersedes the original per registrant+client+period. Dollar ' +
      'amounts gated for plausibility (income <= $5M, expenses <= $50M per filing). ' +
      'Committee attribution resolves each filing’s disclosed government_entities to ' +
      'committees; a filing naming multiple committees counts toward each, so committee ' +
      'totals are spending on filings that disclose the committee, not a partition.',
    latestFilingPosted: latestPosted,
    committees: committees.sort((a, b) => a.quarter.localeCompare(b.quarter) || b.total - a.total),
    issues: issues.sort((a, b) => a.quarter.localeCompare(b.quarter) || b.total - a.total),
    national: nationalAgg,
    meta: {
      totalFilingsFetched: rawFilings.length,
      reportFilingsUsed: filings.length,
      gatedFilingCount,
      committeeMatch: 'entity-resolution+issue-jurisdiction',
    },
  };
}
