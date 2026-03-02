/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * PAC & Super PAC Acronym Taxonomy
 *
 * Maps common acronyms to their FEC-registered committee names.
 * The FEC API only searches registered names, so "AIPAC" misses
 * "AMERICAN ISRAEL PUBLIC AFFAIRS COMMITTEE" without expansion.
 *
 * Every expansion verified against the live FEC committees API.
 * Used by searchCommittees() in fec-api-service.ts.
 */

/** Category labels for PAC acronym entries */
export type PACCategory =
  | 'party'
  | 'pro-israel'
  | 'labor'
  | 'guns'
  | 'ideological'
  | 'super-pac'
  | 'industry'
  | 'healthcare'
  | 'energy'
  | 'finance'
  | 'legal'
  | 'tech'
  | 'defense';

/**
 * The main map used by searchCommittees — acronym -> FEC registered name.
 * Sorted alphabetically within each category section.
 */
export const PAC_ACRONYMS: Record<string, string> = {
  // ── Party Committees ──────────────────────────────────────────────
  DCCC: 'DEMOCRATIC CONGRESSIONAL CAMPAIGN COMMITTEE',
  DNC: 'DEMOCRATIC NATIONAL COMMITTEE',
  DSCC: 'DEMOCRATIC SENATORIAL CAMPAIGN COMMITTEE',
  NRCC: 'NATIONAL REPUBLICAN CONGRESSIONAL COMMITTEE',
  NRSC: 'NATIONAL REPUBLICAN SENATORIAL COMMITTEE',
  RNC: 'REPUBLICAN NATIONAL COMMITTEE',

  // ── Pro-Israel / Middle East ──────────────────────────────────────
  AIPAC: 'AMERICAN ISRAEL PUBLIC AFFAIRS COMMITTEE',
  CUFI: 'CUFI ACTION FUND',
  DMFI: 'DEMOCRATIC MAJORITY FOR ISRAEL',
  'J STREET': 'J STREET',
  NORPAC: 'NORPAC',

  // ── Labor / Unions ────────────────────────────────────────────────
  AFSCME: 'AMERICAN FEDERATION OF STATE COUNTY AND MUNICIPAL EMPLOYEES',
  AFT: 'AMERICAN FEDERATION OF TEACHERS',
  BCTGM: 'BAKERY CONFECTIONERY TOBACCO WORKERS',
  CWA: 'COMMUNICATIONS WORKERS OF AMERICA',
  IBEW: 'INTERNATIONAL BROTHERHOOD OF ELECTRICAL WORKERS',
  IUPAT: 'INTERNATIONAL UNION OF PAINTERS AND ALLIED TRADES',
  LIUNA: 'LABORERS INTERNATIONAL UNION OF NORTH AMERICA',
  NEA: 'NATIONAL EDUCATION ASSOCIATION',
  OPCMIA: 'OPERATIVE PLASTERERS AND CEMENT MASONS',
  SEIU: 'SERVICE EMPLOYEES INTERNATIONAL UNION',
  SMART: 'SHEET METAL AIR RAIL AND TRANSPORTATION WORKERS',
  UAW: 'UNITED AUTO WORKERS',
  UFCW: 'UNITED FOOD AND COMMERCIAL WORKERS',

  // ── Guns / 2A ─────────────────────────────────────────────────────
  BRADY: 'BRADY CAMPAIGN',
  GIFFORDS: 'GIFFORDS PAC',
  GOA: 'GUN OWNERS OF AMERICA',
  NAGR: 'NATIONAL ASSOCIATION FOR GUN RIGHTS',
  NRA: 'NATIONAL RIFLE ASSOCIATION',

  // ── Ideological / Advocacy ────────────────────────────────────────
  AFP: 'AMERICANS FOR PROSPERITY ACTION',
  ECU: 'END CITIZENS UNITED',
  EMILY: 'EMILYS LIST',
  LCV: 'LEAGUE OF CONSERVATION VOTERS',
  NARAL: 'NARAL PRO-CHOICE AMERICA',
  SBA: 'SUSAN B ANTHONY',

  // ── Super PACs ────────────────────────────────────────────────────
  CLF: 'CONGRESSIONAL LEADERSHIP FUND',

  // ── Industry / Trade ──────────────────────────────────────────────
  AMA: 'AMERICAN MEDICAL ASSOCIATION',
  NATPAC: 'NATIONAL ASSOCIATION OF BROADCASTERS',
  PHRMA: 'PHARMACEUTICAL RESEARCH MANUFACTURERS',

  // ── Healthcare ────────────────────────────────────────────────────
  AAFP: 'AMERICAN ACADEMY OF FAMILY PHYSICIANS',
  ADA: 'AMERICAN DENTAL ASSOCIATION',
  AHA: 'AMERICAN HOSPITAL ASSOCIATION',
  BCBS: 'BLUE CROSS BLUE SHIELD',

  // ── Energy ────────────────────────────────────────────────────────
  API: 'AMERICAN PETROLEUM INSTITUTE',

  // ── Legal ─────────────────────────────────────────────────────────
  AAJ: 'AMERICAN ASSOCIATION FOR JUSTICE',

  // ── Tech ──────────────────────────────────────────────────────────
  CCIA: 'COMPUTER AND COMMUNICATIONS INDUSTRY ASSOCIATION',
};

/**
 * Category metadata for future UI use (filtering, grouping).
 */
export const PAC_CATEGORIES: Record<string, { label: string; acronyms: string[] }> = {
  party: {
    label: 'Party Committees',
    acronyms: ['DCCC', 'DNC', 'DSCC', 'NRCC', 'NRSC', 'RNC'],
  },
  'pro-israel': {
    label: 'Pro-Israel / Middle East',
    acronyms: ['AIPAC', 'CUFI', 'DMFI', 'J STREET', 'NORPAC'],
  },
  labor: {
    label: 'Labor / Unions',
    acronyms: [
      'AFSCME',
      'AFT',
      'BCTGM',
      'CWA',
      'IBEW',
      'IUPAT',
      'LIUNA',
      'NEA',
      'OPCMIA',
      'SEIU',
      'SMART',
      'UAW',
      'UFCW',
    ],
  },
  guns: {
    label: 'Guns / 2A',
    acronyms: ['BRADY', 'GIFFORDS', 'GOA', 'NAGR', 'NRA'],
  },
  ideological: {
    label: 'Ideological / Advocacy',
    acronyms: ['AFP', 'ECU', 'EMILY', 'LCV', 'NARAL', 'SBA'],
  },
  'super-pac': {
    label: 'Super PACs',
    acronyms: ['CLF'],
  },
  industry: {
    label: 'Industry / Trade',
    acronyms: ['AMA', 'NATPAC', 'PHRMA'],
  },
  healthcare: {
    label: 'Healthcare',
    acronyms: ['AAFP', 'ADA', 'AHA', 'BCBS'],
  },
  energy: {
    label: 'Energy',
    acronyms: ['API'],
  },
  legal: {
    label: 'Legal',
    acronyms: ['AAJ'],
  },
  tech: {
    label: 'Tech',
    acronyms: ['CCIA'],
  },
};
