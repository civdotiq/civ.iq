/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export { parseRawFiling, quarterKey } from './parse';
export { dedupeAmendments } from './dedupe';
export { buildAggregates } from './aggregate';
export { buildFilingCorpus } from './build-filing-corpus';
export { decodeFilingRow } from './filing-corpus';
export type { FilingCorpusFile, EncodedFilingRow, CorpusFiling } from './filing-corpus';
export type {
  RawApiFiling,
  CompactFiling,
  OrgAgg,
  IssueTally,
  CommitteeQuarterAgg,
  IssueQuarterAgg,
  NationalQuarterAgg,
  LdaAggregates,
} from './types';
