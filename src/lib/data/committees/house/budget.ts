/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// House Committee on the Budget (HSBU) — 119th Congress
//
// Jurisdiction text is the verbatim enumeration from Rule X, clause 1(d) of
// the Rules of the U.S. House of Representatives, as published in the House
// Rules and Manual (HMAN-119), § 719, pp. 471–472 (U.S. Government Publishing
// Office, 119th Congress; https://www.govinfo.gov/content/pkg/HMAN-119/pdf/HMAN-119.pdf).
// HSBU is the Congress.gov / THOMAS systemCode for Budget; HSBA is Financial
// Services (legacy "Banking" code).

import type { Committee } from '@/types/committee';

export const houseBudgetCommittee: Committee = {
  id: 'HSBU',
  name: 'House Committee on the Budget',
  chamber: 'House',
  jurisdiction:
    'Rule X, clause 1(d) of the Rules of the U.S. House of Representatives places the following subjects within the jurisdiction of the Committee on the Budget: (1) concurrent resolutions on the budget (as defined in section 3(4) of the Congressional Budget Act of 1974), other matters required to be referred to the committee under titles III and IV of that Act, and other measures setting forth appropriate levels of budget totals for the United States Government; (2) budget process generally; and (3) establishment, extension, and enforcement of special controls over the Federal budget, including the budgetary treatment of off-budget Federal agencies and measures providing exemption from reduction under any order issued under part C of the Balanced Budget and Emergency Deficit Control Act of 1985.',
  type: 'Standing',
  leadership: {
    chair: undefined,
    rankingMember: undefined,
    vice_chair: undefined,
  },
  members: [],
  subcommittees: [],
  url: 'https://budget.house.gov/',
  lastUpdated: new Date().toISOString(),
};
