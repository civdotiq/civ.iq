/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Deterministic plain-language context for digest items.
 *
 * Pure lookups over the public record's own vocabulary — vote question
 * types, FEC form codes, committee-action phrases. No AI, no judgment
 * calls: each entry explains what a procedural term means, the way a
 * glossary would. Computed at render time so cached issues need no
 * invalidation and the email renderer can reuse them.
 */

export interface VoteQuestionContext {
  /** Procedural votes move the process; substantive votes decide outcomes. */
  kind: 'procedural' | 'substantive';
  text: string;
}

/** Longest-prefix-match table for House/Senate vote questions. */
const VOTE_QUESTION_CONTEXT: Array<{ prefix: string; context: VoteQuestionContext }> = [
  {
    prefix: 'On Ordering the Previous Question',
    context: {
      kind: 'procedural',
      text: 'Ends debate and blocks further amendments. The majority uses it to move ahead to the vote it wants.',
    },
  },
  {
    prefix: 'On Agreeing to the Resolution',
    context: {
      kind: 'procedural',
      text: 'Adopts a House resolution. When the resolution is a "rule," it sets the terms of debate for the bills named in it.',
    },
  },
  {
    prefix: 'On Agreeing to the Amendment',
    context: {
      kind: 'substantive',
      text: 'Decides whether this amendment changes the bill.',
    },
  },
  {
    prefix: 'On Motion to Suspend the Rules and Pass',
    context: {
      kind: 'substantive',
      text: 'A fast track for bills with broad support: debate is limited, no amendments are allowed, and passage needs a two-thirds majority.',
    },
  },
  {
    prefix: 'On Motion to Suspend the Rules and Agree',
    context: {
      kind: 'substantive',
      text: 'A fast track for measures with broad support: debate is limited, no amendments are allowed, and passage needs a two-thirds majority.',
    },
  },
  {
    prefix: 'On Passage',
    context: {
      kind: 'substantive',
      text: 'The final vote on whether the bill passes this chamber.',
    },
  },
  {
    prefix: 'On the Motion to Recommit',
    context: {
      kind: 'procedural',
      text: "The minority's last chance to send a bill back for changes before final passage. It usually fails along party lines.",
    },
  },
  {
    prefix: 'On Motion to Recommit',
    context: {
      kind: 'procedural',
      text: "The minority's last chance to send a bill back for changes before final passage. It usually fails along party lines.",
    },
  },
  {
    prefix: 'On Cloture',
    context: {
      kind: 'procedural',
      text: 'Ends Senate debate so a final vote can happen. It needs 60 votes; falling short blocks the measure.',
    },
  },
  {
    prefix: 'On the Cloture Motion',
    context: {
      kind: 'procedural',
      text: 'Ends Senate debate so a final vote can happen. It needs 60 votes; falling short blocks the measure.',
    },
  },
  {
    prefix: 'On the Nomination',
    context: {
      kind: 'substantive',
      text: "Confirms or rejects the President's nominee. A simple majority decides.",
    },
  },
  {
    prefix: 'On the Motion to Table',
    context: {
      kind: 'procedural',
      text: 'Kills a measure or amendment without a direct vote on it.',
    },
  },
  {
    prefix: 'On the Motion to Proceed',
    context: {
      kind: 'procedural',
      text: 'Decides whether the Senate takes up the measure at all.',
    },
  },
  {
    prefix: 'On the Journal',
    context: {
      kind: 'procedural',
      text: "Approves the previous day's official record. Often used to put attendance on the record.",
    },
  },
  {
    prefix: 'On Motion to Adjourn',
    context: {
      kind: 'procedural',
      text: 'Ends the day’s session. Sometimes used as a protest or delay tactic.',
    },
  },
  {
    prefix: 'On the Conference Report',
    context: {
      kind: 'substantive',
      text: 'The final vote on the version of a bill negotiated between the House and Senate.',
    },
  },
  {
    prefix: 'On Overriding the Veto',
    context: {
      kind: 'substantive',
      text: "Attempts to pass the bill over the President's veto. It needs a two-thirds majority in both chambers.",
    },
  },
];

export function voteQuestionContext(question: string): VoteQuestionContext | null {
  const normalized = question.trim();
  let best: { prefix: string; context: VoteQuestionContext } | null = null;
  for (const entry of VOTE_QUESTION_CONTEXT) {
    if (!normalized.toLowerCase().startsWith(entry.prefix.toLowerCase())) continue;
    if (!best || entry.prefix.length > best.prefix.length) best = entry;
  }
  return best?.context ?? null;
}

/**
 * FEC form codes → plain language. Amendment variants (F3A) and
 * termination variants (F3T) resolve to their base form's meaning.
 * @see https://www.fec.gov/data/browse-data/?tab=filings
 */
const FEC_FORM_CONTEXT: Record<string, string> = {
  F1: 'Statement of Organization — registers a committee and names its officers and bank.',
  F1M: 'Notice that a committee qualified for multicandidate status.',
  F2: "Statement of Candidacy — declares a run for office and names the campaign's main committee.",
  F3: 'Report of money raised and spent by a House or Senate campaign committee.',
  F3P: 'Report of money raised and spent by a presidential campaign committee.',
  F3X: 'Report of money raised and spent by a PAC or party committee.',
  F4: 'Report of money raised and spent by a convention committee.',
  F5: 'Report of independent spending by a person or group (not coordinated with any campaign).',
  F6: 'A 48-hour notice of contributions of $1,000 or more received right before an election.',
  F7: 'Report of communication costs by corporations and membership organizations.',
  F8: 'Debt settlement plan.',
  F9: 'A 24-hour notice of spending on electioneering communications.',
  F10: 'Notice that a candidate spent $50,000 or more of personal funds.',
  F13: 'Report of donations accepted for an inaugural committee.',
  F24: 'A 24- or 48-hour notice of independent expenditures.',
  F99: 'A free-form letter or notice filed with the FEC.',
};

export function fecFormContext(formType: string | undefined): string | null {
  if (!formType) return null;
  const normalized = formType.trim().toUpperCase();
  const direct = FEC_FORM_CONTEXT[normalized];
  if (direct) return direct;
  // F3A = amended F3, F3N = new F3, F3T = termination F3, etc.
  const base = normalized.match(/^(F\d+[A-Z]*?)[ANT]$/)?.[1];
  const baseText = base ? FEC_FORM_CONTEXT[base] : undefined;
  if (!baseText) return null;
  if (normalized.endsWith('A')) return `Amended filing. ${baseText}`;
  if (normalized.endsWith('T')) return `Termination filing. ${baseText}`;
  return baseText;
}

/** First-match table for Congress.gov latest-action phrases. */
const BILL_ACTION_CONTEXT: Array<{ pattern: RegExp; text: string }> = [
  {
    pattern: /became public law/i,
    text: 'Signed into law.',
  },
  {
    pattern: /presented to president/i,
    text: "Passed both chambers and awaits the President's signature or veto.",
  },
  {
    pattern: /passed\/agreed to in senate/i,
    text: 'Approved by the Senate.',
  },
  {
    pattern: /passed\/agreed to in house/i,
    text: 'Approved by the House.',
  },
  {
    pattern: /received in the senate/i,
    text: 'Passed the House and is now before the Senate.',
  },
  {
    pattern: /received in the house/i,
    text: 'Passed the Senate and is now before the House.',
  },
  {
    pattern: /ordered to be reported/i,
    text: 'The committee approved the bill and sent it to the full chamber.',
  },
  {
    pattern: /reported (to|by)/i,
    text: 'The committee finished its work and reported the bill to the full chamber.',
  },
  {
    pattern: /supplemental report filed/i,
    text: 'The committee filed an additional written report on the bill.',
  },
  {
    pattern:
      /placed on the union calendar|placed on the house calendar|placed on senate legislative calendar|placed on calendar/i,
    text: 'Now eligible for a floor vote. Scheduling is up to chamber leadership.',
  },
  {
    pattern: /rules committee resolution.*reported to house/i,
    text: 'The Rules Committee set the terms of floor debate for this bill.',
  },
  {
    pattern: /subcommittee hearings held/i,
    text: 'A subcommittee heard testimony on the bill.',
  },
  {
    pattern: /committee hearings held|hearings held/i,
    text: 'The committee heard testimony on the bill.',
  },
  {
    pattern: /subcommittee on .* discharged/i,
    text: 'The subcommittee was released from considering the bill so it could move ahead.',
  },
  {
    pattern: /referred to (the )?(committee|subcommittee|house committee|senate committee)/i,
    text: 'Assigned to a committee for review — the first step for most bills.',
  },
  {
    pattern: /motion to reconsider laid on the table/i,
    text: 'The vote was locked in — a routine step that prevents re-votes.',
  },
  {
    pattern: /signed by president/i,
    text: 'Signed into law.',
  },
  {
    pattern: /vetoed by president/i,
    text: 'The President vetoed the bill.',
  },
];

export function billActionContext(actionText: string | undefined): string | null {
  if (!actionText) return null;
  for (const entry of BILL_ACTION_CONTEXT) {
    if (entry.pattern.test(actionText)) return entry.text;
  }
  return null;
}

export interface BillRef {
  billId: string;
  label: string;
}

const BILL_REF_PATTERN =
  /\b(H\.? ?R\.?|H\.? ?Res\.?|H\.? ?J\.? ?Res\.?|H\.? ?Con\.? ?Res\.?|S\.? ?J\.? ?Res\.?|S\.? ?Con\.? ?Res\.?|S\.? ?Res\.?|S\.?)\s*(\d{1,5})\b/g;

function refTypeCode(raw: string): string {
  const compact = raw.replace(/[.\s]/g, '').toLowerCase();
  if (compact === 'hr') return 'hr';
  if (compact === 'hres') return 'hres';
  if (compact === 'hjres') return 'hjres';
  if (compact === 'hconres') return 'hconres';
  if (compact === 'sjres') return 'sjres';
  if (compact === 'sconres') return 'sconres';
  if (compact === 'sres') return 'sres';
  if (compact === 's') return 's';
  return compact;
}

const REF_LABEL: Record<string, string> = {
  hr: 'H.R.',
  hres: 'H.Res.',
  hjres: 'H.J.Res.',
  hconres: 'H.Con.Res.',
  sjres: 'S.J.Res.',
  sconres: 'S.Con.Res.',
  sres: 'S.Res.',
  s: 'S.',
};

/**
 * Extract bill references from a vote's descriptive text — rule
 * resolutions name the bills whose debate they govern ("providing for
 * consideration of the bill (H.R. 8800) ..."). Excludes the measure
 * being voted on itself, dedupes, keeps document order, caps at 4.
 */
export function extractBillRefs(
  description: string | undefined,
  congress: number,
  excludeBillId?: string
): BillRef[] {
  if (!description) return [];
  const refs: BillRef[] = [];
  const seen = new Set<string>();
  for (const match of description.matchAll(BILL_REF_PATTERN)) {
    const type = refTypeCode(match[1] ?? '');
    const number = match[2];
    if (!REF_LABEL[type] || !number) continue;
    const billId = `${congress}-${type}-${number}`;
    if (billId === excludeBillId || seen.has(billId)) continue;
    seen.add(billId);
    refs.push({ billId, label: `${REF_LABEL[type]} ${number}` });
    if (refs.length >= 4) break;
  }
  return refs;
}
