/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Resolve a filing to the committees whose jurisdiction it touches. Two
 * complementary signals, unioned:
 *
 *   1. Government entities — the resolver maps disclosed entities to committees
 *      directly (rare) and via agency → oversight committee. Most filings only
 *      name "SENATE"/"HOUSE" (dropped as noise), so this alone is thin.
 *   2. Issue-code jurisdiction — every quarterly report lists LDA issue codes.
 *      Each code maps to Congress.gov policy areas, whose topics match committee
 *      topics. This is the primary signal and the plan's framing: "spending on
 *      filings whose disclosed issues fall under this committee's jurisdiction".
 *
 * A filing that touches several jurisdictions counts toward each committee, so
 * committee totals are not a partition (documented in the aggregate methodology).
 */

import {
  ALL_COMMITTEE_MAPPINGS,
  getAllLDAIssueCodes,
  getPolicyAreasForLDAIssue,
  getResolvedCommittees,
  resolveFilingEntities,
} from '@civiq/entity-resolution';
import { getTopicsForPolicyArea } from '@/lib/connections/policy-area-map';
import type { CompactFiling } from './types';

export interface CommitteeRef {
  committeeCode: string;
  committeeName: string;
}

/** Precomputed LDA issue code → committees (by topic jurisdiction), built once. */
const ISSUE_TO_COMMITTEES: Map<string, CommitteeRef[]> = (() => {
  const map = new Map<string, CommitteeRef[]>();
  for (const code of getAllLDAIssueCodes()) {
    const topics = new Set<string>();
    for (const policyArea of getPolicyAreasForLDAIssue(code)) {
      for (const t of getTopicsForPolicyArea(policyArea)) topics.add(t.toLowerCase());
    }
    const committees = ALL_COMMITTEE_MAPPINGS.filter(c =>
      c.topics.some(t => topics.has(t.toLowerCase()))
    ).map(c => ({ committeeCode: c.committeeCode, committeeName: c.committeeName }));
    map.set(code, committees);
  }
  return map;
})();

/** Union of committees implied by a filing's government entities and issue codes. */
export function resolveFilingCommittees(filing: CompactFiling): CommitteeRef[] {
  const seen = new Map<string, string>();

  for (const c of getResolvedCommittees(resolveFilingEntities(filing.governmentEntities))) {
    seen.set(c.committeeCode, c.committeeName);
  }
  for (const code of filing.issueCodes) {
    for (const c of ISSUE_TO_COMMITTEES.get(code) ?? []) {
      if (!seen.has(c.committeeCode)) seen.set(c.committeeCode, c.committeeName);
    }
  }

  return Array.from(seen, ([committeeCode, committeeName]) => ({ committeeCode, committeeName }));
}
