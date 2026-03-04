/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Dataset Registry
 *
 * Maps dataset slugs to their generators. Used by the download API route
 * and the /open page to enumerate available datasets.
 */

import type { DatasetGenerator } from '@/types/dataset';
import { generateCongressMembers } from './generators/congress-members';
import { generateCommittees } from './generators/committees';
import { generateRecentBills } from './generators/recent-bills';
import { generateRecentVotes, generateVotePositions } from './generators/recent-votes';
import { generateCampaignFinance } from './generators/campaign-finance';

export const DATASET_REGISTRY: DatasetGenerator[] = [
  {
    slug: 'congress-members',
    name: 'Congress Members',
    description:
      'All current members of the 119th Congress with party, state, district, and contact info.',
    source: 'congress-legislators',
    sourceUrl: 'https://github.com/unitedstates/congress-legislators',
    approximateRows: '~535',
    freshness: 'Updated hourly',
    generate: generateCongressMembers,
  },
  {
    slug: 'committees',
    name: 'Committees & Memberships',
    description: 'Congressional committees and their members with roles and seniority.',
    source: 'congress-legislators',
    sourceUrl: 'https://github.com/unitedstates/congress-legislators',
    approximateRows: '~3,000',
    freshness: 'Updated hourly',
    generate: generateCommittees,
  },
  {
    slug: 'recent-bills',
    name: 'Recent Bills',
    description: 'The 250 most recently updated bills in the 119th Congress.',
    source: 'Congress.gov API',
    sourceUrl: 'https://api.congress.gov',
    approximateRows: '250',
    freshness: 'Updated hourly',
    generate: generateRecentBills,
  },
  {
    slug: 'recent-votes',
    name: 'Recent Votes',
    description: 'The 20 most recent roll-call vote summaries from both chambers.',
    source: 'Congress.gov + Senate.gov',
    sourceUrl: 'https://api.congress.gov',
    approximateRows: '~20',
    freshness: 'Updated hourly',
    generate: generateRecentVotes,
  },
  {
    slug: 'vote-positions',
    name: 'Vote Positions',
    description: 'Individual member voting positions for recent roll-call votes.',
    source: 'Congress.gov + Senate.gov + House Clerk',
    sourceUrl: 'https://api.congress.gov',
    approximateRows: '~10,000',
    freshness: 'Updated hourly',
    generate: generateVotePositions,
  },
  {
    slug: 'campaign-finance',
    name: 'Campaign Finance',
    description: 'Campaign finance totals for all members of Congress from FEC.gov.',
    source: 'Federal Election Commission',
    sourceUrl: 'https://api.open.fec.gov',
    approximateRows: '~535',
    freshness: 'Updated daily',
    generate: generateCampaignFinance,
  },
];

export function getDatasetBySlug(slug: string): DatasetGenerator | undefined {
  return DATASET_REGISTRY.find(d => d.slug === slug);
}
