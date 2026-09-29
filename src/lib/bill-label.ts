/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { stripMeasureTags } from './senate-vote-fields';

const BILL_TYPE_DISPLAY: Record<string, string> = {
  HR: 'H.R.',
  S: 'S.',
  HRES: 'H.Res.',
  SRES: 'S.Res.',
  HJRES: 'H.J.Res.',
  SJRES: 'S.J.Res.',
  HCONRES: 'H.Con.Res.',
  SCONRES: 'S.Con.Res.',
};

/**
 * Format a Congress.gov bill type + number for display: ("S", "2403") → "S. 2403".
 * A bare number is ambiguous across chambers, so unknown types are shown as-is
 * and a missing type returns the number alone.
 */
export function formatBillNumber(type: string | undefined, number: string): string {
  const key = (type ?? '').replace(/[.\s]/g, '').toUpperCase();
  if (!key) return number;
  return `${BILL_TYPE_DISPLAY[key] ?? key} ${number}`;
}

/** The fields voteMeasureLabel reads — structural, so any vote shape fits. */
export interface VoteMeasureLabelInput {
  bill?: { number?: string; title?: string; type?: string; displayTitle?: string } | null;
  question?: string;
  rollNumber?: number;
  amendment?: { number: string; purpose?: string } | null;
  nomination?: { number: string; description: string } | null;
}

/** The votes route's placeholder title for a roll call with no bill. */
const NO_BILL_TITLE = 'Vote without associated bill';

/**
 * One-line label for what a roll call voted on:
 * - amendment:  "S.Amdt. 6835 to S. 4668 — To establish certain standards …"
 * - nomination: "Angela Veronica Colmenero, of Texas, to be United States District Judge …"
 * - bill:       "S. 4668 — Protect College Sports Act of 2026"
 * Falls back to the roll-call question (senate.gov markup stripped), then
 * "Roll call N". Votes cached before the amendment/nomination fields existed
 * simply take the bill/question path.
 */
export function voteMeasureLabel(vote: VoteMeasureLabelInput): string {
  const bill = vote.bill ?? undefined;
  const billNumber = bill?.number && bill.number !== 'N/A' ? bill.number : undefined;
  const billLabel = billNumber ? formatBillNumber(bill?.type, billNumber) : undefined;

  if (vote.amendment?.number) {
    const measure = billLabel ? `${vote.amendment.number} to ${billLabel}` : vote.amendment.number;
    return vote.amendment.purpose ? `${measure} — ${vote.amendment.purpose}` : measure;
  }

  if (vote.nomination?.description) return vote.nomination.description;

  const title = bill?.displayTitle || bill?.title;
  if (title && title !== NO_BILL_TITLE) {
    return billLabel && title !== billLabel ? `${billLabel} — ${title}` : title;
  }
  const question = stripMeasureTags(vote.question ?? '');
  return question || `Roll call ${vote.rollNumber ?? ''}`.trim();
}
