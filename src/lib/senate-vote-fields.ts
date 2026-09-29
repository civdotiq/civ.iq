/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Pure helpers for the measure fields of a Senate roll call — what was
 * actually voted on (an amendment, a nomination, or a bill).
 *
 * senate.gov publishes these in two shapes: the vote menu (question,
 * issue, and a "<head>; <tail>" title) and the per-roll XML (structured
 * <amendment>/<document> blocks). Both parsers share these helpers so an
 * amendment's purpose is never mistaken for the bill's title.
 *
 * Client-safe: no server imports.
 */

/** The amendment a Senate roll call voted on (or moved to table, waive, …). */
export interface SenateAmendmentRef {
  /** e.g. "S.Amdt. 6835" */
  number: string;
  /** The amendment's stated purpose, e.g. "To improve the bill." */
  purpose?: string;
  /** senate.gov's short label, e.g. "Booker Amdt. No. 6835". */
  sponsorLabel?: string;
}

/** The nomination a Senate roll call voted on. */
export interface SenateNominationRef {
  /** e.g. "PN999-1" */
  number: string;
  /** e.g. "Angela Veronica Colmenero, of Texas, to be United States District Judge …" */
  description: string;
}

/** senate.gov's placeholder when a roll call has no amendment. */
const NO_PURPOSE = /^no statement of purpose on file\.?$/i;

/** Remove senate.gov `<measure>` markup, keeping the inner text. */
export function stripMeasureTags(text: string): string {
  return text
    .replace(/<\/?measure\s*\/?>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** An amendment purpose, or undefined for senate.gov's "no purpose" placeholder. */
export function cleanAmendmentPurpose(purpose: string | undefined): string | undefined {
  const trimmed = purpose?.trim();
  if (!trimmed || NO_PURPOSE.test(trimmed)) return undefined;
  return trimmed;
}

/** "S.Amdt. 6835" (or "H.Amdt. 12") from a question such as
 *  "On the Amendment S.Amdt. 6835" — undefined when none is named. */
export function amendmentNumberFromText(text: string): string | undefined {
  const match = stripMeasureTags(text).match(/\b([SH])\.\s?Amdt\.\s?(\d+)/);
  return match ? `${match[1]}.Amdt. ${match[2]}` : undefined;
}

/** The sponsor label ("Booker Amdt. No. 6835", "Amdt. No. 6776") when a
 *  vote title is exactly that — motions ("Motion to Table Lee Amdt. …")
 *  are not a sponsor label. */
export function amendmentSponsorLabel(voteTitle: string): string | undefined {
  const trimmed = voteTitle.trim();
  if (/^motion\b/i.test(trimmed)) return undefined;
  return /^(?:[A-Z][\w'’.\- ]*\s)?Amdt\. No\. \d+$/.test(trimmed) ? trimmed : undefined;
}

/** The sponsor's name from a sponsor label: "Booker Amdt. No. 6835" gives
 *  "Booker", "Van Hollen Amdt. No. 5632" gives "Van Hollen". Undefined for a
 *  label with no sponsor ("Amdt. No. 6776"). */
export function amendmentSponsorName(sponsorLabel: string | undefined): string | undefined {
  const match = sponsorLabel?.trim().match(/^(.+?)\s+Amdt\. No\. \d+$/);
  return match?.[1];
}

/** Split a vote-menu title "<head>; <tail>" at the first "; ". */
export function splitMenuTitle(title: string): { head: string; tail?: string } {
  const semi = title.indexOf('; ');
  if (semi === -1) return { head: title.trim() };
  return { head: title.slice(0, semi).trim(), tail: title.slice(semi + 2).trim() };
}

/** Nomination numbers look like "PN999-1" or "PN12". */
export function isNominationNumber(issue: string): boolean {
  return /^PN\d+(?:-\d+)?$/i.test(issue.trim());
}

/** Nominee description from a menu title such as "Confirmation: Angela …"
 *  or "Motion to Invoke Cloture: Angela …". */
export function nominationDescriptionFromTitle(title: string): string {
  const match = title.trim().match(/^(?:Confirmation|Motion[^:]*):\s*(.+)$/i);
  return (match?.[1] ?? title).trim();
}

/** Measure prefixes that identify a bill or resolution ("H.R. 3424",
 *  "S.J.Res. 185"), normalized to Congress.gov's type codes. Nominations
 *  (PN…), amendments and treaty documents are not bills. */
const BILL_TYPES = new Set(['S', 'HR', 'SJRES', 'HJRES', 'SCONRES', 'HCONRES', 'SRES', 'HRES']);

/** ("S. 4668") → { type: 'S', number: '4668' }; undefined for anything that
 *  is not a bill or resolution. */
export function parseBillMeasure(label: string): { type: string; number: string } | undefined {
  const match = label.trim().match(/^([A-Za-z.\s]+?)\s*(\d+)$/);
  if (!match?.[1] || !match[2]) return undefined;
  const type = match[1].replace(/[^A-Za-z]/g, '').toUpperCase();
  return BILL_TYPES.has(type) ? { type, number: match[2] } : undefined;
}
