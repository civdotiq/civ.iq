/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Each state's and territory's chief executive, from the committed
 * src/data/state-governors.json (built weekly by
 * scripts/sync-state-governors.ts). Reading it costs no network call, so
 * pages can server-render the governor without a live dependency.
 */

import file from '@/data/state-governors.json';

export interface StateChiefExecutive {
  /** "Governor", or "Mayor" for the District of Columbia. */
  title: string;
  name: string;
  /** As the source states it, e.g. "Democratic", "Republican". */
  party: string | null;
  /** YYYY-MM-DD start of the current unbroken run in office. */
  inOfficeSince: string | null;
  /** The governor's (or mayor's) official website. */
  website: string | null;
  /** Where this record came from. */
  sourceUrl: string;
}

export interface StateGovernorsFile {
  source: string;
  /** YYYY-MM-DD the content last changed. */
  asOf: string;
  executives: Record<string, StateChiefExecutive>;
}

const data = file as StateGovernorsFile;

export function getStateChiefExecutive(stateCode: string): StateChiefExecutive | null {
  return data.executives[stateCode.toUpperCase()] ?? null;
}

export function getStateGovernorsAsOf(): string {
  return data.asOf;
}
