/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Glossary Page Terms — curated map of which civic terms to contextually
 * link on which pages. Each entry is the exact term name as it appears in
 * civic-glossary.ts. Only the first occurrence per page should be linked.
 *
 * This is an editorial curation file. Add or remove terms per page over time
 * as content evolves.
 */

/** Terms to link on representative profile pages */
export const REPRESENTATIVE_PAGE_TERMS = [
  'Standing Committee',
  'Ranking Member',
  'Committee Chair',
  'Subcommittee',
  'Roll Call Vote',
  'Congressional District',
  'Caucus',
  'PAC',
  'Cosponsor',
  'Bipartisan',
] as const;

/** Terms to link on committee detail pages */
export const COMMITTEE_PAGE_TERMS = [
  'Standing Committee',
  'Select Committee',
  'Joint Committee',
  'Subcommittee',
  'Committee Chair',
  'Ranking Member',
  'Hearing',
  'Markup',
  'Jurisdiction',
] as const;

/** Terms to link on voting record displays */
export const VOTING_RECORDS_TERMS = [
  'Roll Call Vote',
  'Voice Vote',
  'Quorum',
  'Party-Line Vote',
  'Unanimous Consent',
  'Motion to Recommit',
  'Motion to Table',
  'Cloture',
] as const;

export type PageTermSet =
  | typeof REPRESENTATIVE_PAGE_TERMS
  | typeof COMMITTEE_PAGE_TERMS
  | typeof VOTING_RECORDS_TERMS;
