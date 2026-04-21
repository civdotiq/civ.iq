/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// House Committee on Financial Services (HSBA) — 119th Congress
//
// Jurisdiction text is the verbatim enumeration from Rule X, clause 1(h) of
// the Rules of the U.S. House of Representatives, as published in the House
// Rules and Manual (HMAN-119), § 722, pp. 481–482 (U.S. Government Publishing
// Office, 119th Congress; https://www.govinfo.gov/content/pkg/HMAN-119/pdf/HMAN-119.pdf).
// HSBA is the Congress.gov / THOMAS systemCode for Financial Services (legacy
// "Banking" code from when the committee was Banking and Currency); HSBU is
// Budget. Do not confuse them.

import type { Committee } from '@/types/committee';

export const houseFinancialServicesCommittee: Committee = {
  id: 'HSBA',
  name: 'House Committee on Financial Services',
  chamber: 'House',
  jurisdiction:
    'Rule X, clause 1(h) of the Rules of the U.S. House of Representatives places the following subjects within the jurisdiction of the Committee on Financial Services: (1) banks and banking, including deposit insurance and Federal monetary policy; (2) economic stabilization, defense production, renegotiation, and control of the price of commodities, rents, and services; (3) financial aid to commerce and industry (other than transportation); (4) insurance generally; (5) international finance; (6) international financial and monetary organizations; (7) money and credit, including currency and the issuance of notes and redemption thereof, gold and silver including the coinage thereof, and valuation and revaluation of the dollar; (8) public and private housing; (9) securities and exchanges; and (10) urban development.',
  type: 'Standing',
  leadership: {
    chair: undefined,
    rankingMember: undefined,
    vice_chair: undefined,
  },
  members: [],
  subcommittees: [],
  url: 'https://financialservices.house.gov/',
  lastUpdated: new Date().toISOString(),
};
