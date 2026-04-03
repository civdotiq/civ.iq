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
import { generateElectionResults2024 } from './generators/election-results-2024';
import { generateSenateStockTrades } from './generators/senate-stock-trades';
import { generateLobbyingFilings } from './generators/lobbying-filings';
import { generateFederalRegisterRules } from './generators/federal-register-rules';

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
    columnLabels: [
      'Bioguide ID',
      'Full Name',
      'Party Affiliation',
      'State',
      'District',
      'Chamber',
      'Role',
      'Phone',
      'Website',
      'Years in Office',
      'Next Election',
      'Term Start',
      'Term End',
    ],
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
    columnLabels: [
      'Committee ID',
      'Committee Name',
      'Chamber',
      'Member Name',
      'Member Party',
      'Member State',
      'Committee Role',
      'Rank',
    ],
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
    columnLabels: [
      'Bill Number',
      'Title',
      'Type',
      'Congress',
      'Origin Chamber',
      'Introduced Date',
      'Last Updated',
      'Latest Action Date',
      'Latest Action',
    ],
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
    columnLabels: [
      'Vote ID',
      'Chamber',
      'Date',
      'Question',
      'Description',
      'Result',
      'Yeas',
      'Nays',
      'Present',
      'Not Voting',
      'Bill Number',
      'Bill Title',
    ],
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
    columnLabels: [
      'Vote ID',
      'Vote Date',
      'Chamber',
      'Bioguide ID',
      'Member Name',
      'State',
      'Party',
      'Position',
      'Vote Question',
    ],
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
    columnLabels: [
      'Bioguide ID',
      'FEC Candidate ID',
      'Full Name',
      'Party',
      'State',
      'District',
      'Office',
      'Election Cycle',
      'Total Receipts',
      'Total Disbursements',
      'Cash on Hand',
      'Individual Contributions',
      'PAC Contributions',
    ],
    generate: generateCampaignFinance,
  },
  {
    slug: 'election-results-2024',
    name: '2024 Election Results',
    description:
      'Precinct-aggregated election results for 2024: US House, President, Senate, Governor, and state legislature races.',
    source: 'MIT Election Data and Science Lab',
    sourceUrl: 'https://github.com/MEDSL/2024-elections-official',
    approximateRows: '~7,300',
    freshness: 'Static (regenerated when MEDSL adds states)',
    columnLabels: [
      'District ID',
      'Office',
      'Democratic Votes',
      'Republican Votes',
      'Other Votes',
      'Total Votes',
      'Winner',
      'Margin',
      'Dem %',
      'Rep %',
    ],
    generate: generateElectionResults2024,
  },
  {
    slug: 'senate-stock-trades',
    name: 'Senate Stock Trades',
    description:
      'STOCK Act periodic transaction reports for U.S. Senators, including ticker, amount range, transaction type, and filing timeliness.',
    source: 'Senate Stock Watcher / Senate eFD',
    sourceUrl: 'https://efdsearch.senate.gov',
    approximateRows: '~3,000',
    freshness: 'Updated daily',
    columnLabels: [
      'Bioguide ID',
      'Senator Name',
      'Transaction Date',
      'Ticker',
      'Asset Description',
      'Asset Type',
      'Transaction Type',
      'Amount Range',
      'Owner',
      'Filing Date',
      'Days to Disclose',
      'Late Filing',
      'Source URL',
    ],
    generate: generateSenateStockTrades,
  },
  {
    slug: 'lobbying-filings',
    name: 'Lobbying Disclosure Filings',
    description:
      'Recent lobbying disclosure filings from the Senate LDA database, including registrants, clients, income, and issue areas.',
    source: 'Senate LDA API',
    sourceUrl: 'https://lda.senate.gov',
    approximateRows: '~2,000',
    freshness: 'Updated daily',
    columnLabels: [
      'Filing ID',
      'Registrant',
      'Client',
      'Income',
      'Expenses',
      'Filing Period',
      'Filing Year',
      'Issue Codes',
      'Lobbyist Names',
      'Government Entities',
    ],
    generate: generateLobbyingFilings,
  },
  {
    slug: 'federal-register-rules',
    name: 'Federal Register Rules & Orders',
    description:
      'Recent proposed rules, final rules, and presidential documents from the Federal Register.',
    source: 'Federal Register API',
    sourceUrl: 'https://www.federalregister.gov',
    approximateRows: '~100',
    freshness: 'Updated hourly',
    columnLabels: [
      'Document Number',
      'Title',
      'Type',
      'Agencies',
      'Publication Date',
      'Effective Date',
      'Comment Close Date',
      'Abstract',
      'HTML URL',
      'PDF URL',
    ],
    generate: generateFederalRegisterRules,
  },
];

export function getDatasetBySlug(slug: string): DatasetGenerator | undefined {
  return DATASET_REGISTRY.find(d => d.slug === slug);
}
