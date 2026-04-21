/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// House Committee on Financial Services (HSBA) - 119th Congress
// Jurisdiction text: Rules of the U.S. House of Representatives, Rule X,
// clause 1(g). HSBA is the Congress.gov / THOMAS system code for Financial
// Services (legacy "Banking" code); HSBU is Budget.

import type { Committee } from '@/types/committee';

export const houseFinancialServicesCommittee: Committee = {
  id: 'HSBA',
  name: 'House Committee on Financial Services',
  chamber: 'House',
  jurisdiction:
    'Under Rule X, clause 1(g) of the Rules of the U.S. House of Representatives, the Committee on Financial Services has legislative jurisdiction over: banks and banking, including deposit insurance and Federal monetary policy; economic stabilization, defense production, renegotiation, and control of the price of commodities, rents, and services; financial aid to commerce and industry (other than transportation); insurance generally; international finance; international financial and monetary organizations; money and credit, including currency and the issuance of notes and redemption thereof, gold and silver including the coinage thereof, and valuation and revaluation of the dollar; public and private housing; securities and exchanges; and urban development.',
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
