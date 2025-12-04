/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { EnhancedRepresentative } from './representative';

export interface Bill {
  id: string;
  number: string; // "H.R. 1234", "S. 567"
  title: string;
  shortTitle?: string;
  congress: string; // "119"
  session: string; // "1" or "2"
  type: 'hr' | 's' | 'hjres' | 'sjres' | 'hconres' | 'sconres' | 'hres' | 'sres';
  chamber: 'House' | 'Senate';

  // Bill status and timeline
  status: {
    current: BillStatus;
    lastAction: {
      date: string;
      description: string;
      chamber?: 'House' | 'Senate';
    };
    timeline: BillAction[];
  };

  // Sponsorship
  sponsor: {
    representative: EnhancedRepresentative;
    date: string;
  };
  cosponsors: Array<{
    representative: EnhancedRepresentative;
    date: string;
    withdrawn?: boolean;
  }>;

  // Committee information
  committees: Array<{
    committeeId: string;
    name: string;
    chamber: 'House' | 'Senate';
    activities: Array<{
      date: string;
      activity: string;
    }>;
  }>;

  // Content
  summary?: {
    text: string;
    date: string;
    version: string;
  };
  subjects: string[];
  policyArea?: string;

  // Full bill text
  fullText?: {
    content: string;
    format: 'html' | 'text';
    version: string;
    date: string;
  };

  // Text versions available
  textVersions?: Array<{
    type: string;
    date: string;
    formats: Array<{
      type: string;
      url: string;
    }>;
  }>;

  // CBO Cost Estimates
  cboCostEstimates?: Array<{
    title: string;
    description: string;
    url: string;
    pubDate: string;
  }>;

  // Amendments
  amendments?: {
    count: number;
    items?: Array<{
      number: string;
      description?: string;
      purpose?: string;
      sponsor?: string;
      status?: string;
    }>;
  };

  // Committee Reports
  committeeReports?: Array<{
    citation: string;
    url: string;
  }>;

  // Public Law (if enacted)
  laws?: Array<{
    type: string;
    number: string;
  }>;

  // Voting records
  votes: BillVote[];

  // Related bills
  relatedBills: Array<{
    number: string;
    title: string;
    relationship: 'identical' | 'related' | 'supersedes' | 'superseded';
  }>;

  // Metadata
  introducedDate: string;
  url?: string;
  textUrl?: string;
  lastUpdated: string;
}

export type BillStatus =
  | 'introduced'
  | 'referred'
  | 'reported'
  | 'passed_house'
  | 'passed_senate'
  | 'passed_both'
  | 'failed'
  | 'enacted'
  | 'vetoed'
  | 'pocket_vetoed';

export interface BillAction {
  date: string;
  description: string;
  chamber?: 'House' | 'Senate';
  actionCode?: string;
  type: 'action' | 'vote' | 'committee' | 'calendar';
}

export interface BillVote {
  voteId: string;
  chamber: 'House' | 'Senate';
  date: string;
  question: string;
  result: 'Passed' | 'Failed' | 'Agreed to' | 'Disagreed to';
  rollNumber?: number;
  votes: {
    yea: number;
    nay: number;
    present: number;
    notVoting: number;
  };
  breakdown: {
    democratic: { yea: number; nay: number; present: number; notVoting: number };
    republican: { yea: number; nay: number; present: number; notVoting: number };
    independent: { yea: number; nay: number; present: number; notVoting: number };
  };
  representativeVotes?: Array<{
    representative: EnhancedRepresentative;
    position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  }>;
}

export interface BillAPIResponse {
  bill: Bill;
  metadata: {
    dataSource: 'congress.gov' | 'mock';
    lastUpdated: string;
    cacheHit?: boolean;
    votesCount: number;
    cosponsorsCount: number;
    committeesCount: number;
  };
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

export interface BillSearchResult {
  bills: Array<{
    number: string;
    title: string;
    status: BillStatus;
    introducedDate: string;
    chamber: 'House' | 'Senate';
    sponsor: string;
  }>;
  total: number;
  page: number;
  perPage: number;
}

export interface BillListResponse {
  bills: Bill[];
  total: number;
  page?: number;
  perPage?: number;
  hasMore?: boolean;
  success: boolean;
  error?: string;
}

// Utility functions
export function getBillDisplayStatus(status: BillStatus): string {
  const statusMap: Record<BillStatus, string> = {
    introduced: 'Introduced',
    referred: 'Referred to Committee',
    reported: 'Reported by Committee',
    passed_house: 'Passed House',
    passed_senate: 'Passed Senate',
    passed_both: 'Passed Both Chambers',
    failed: 'Failed',
    enacted: 'Enacted',
    vetoed: 'Vetoed',
    pocket_vetoed: 'Pocket Vetoed',
  };
  return statusMap[status] || status;
}

export function getBillStatusColor(status: BillStatus): string {
  const colorMap: Record<BillStatus, string> = {
    introduced: 'bg-blue-100 text-blue-800',
    referred: 'bg-yellow-100 text-yellow-800',
    reported: 'bg-purple-100 text-purple-800',
    passed_house: 'bg-green-100 text-green-800',
    passed_senate: 'bg-green-100 text-green-800',
    passed_both: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    enacted: 'bg-emerald-100 text-emerald-800',
    vetoed: 'bg-red-100 text-red-800',
    pocket_vetoed: 'bg-red-100 text-red-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

export function parseBillNumber(billNumber: string): {
  type: string;
  number: string;
  congress: string;
} {
  // Handle suffixed formats like "119-hr-1234-cosponsored" by stripping suffixes
  let cleanBillNumber = billNumber;
  const suffixes = ['-cosponsored', '-sponsored', '-introduced', '-enacted'];

  for (const suffix of suffixes) {
    if (cleanBillNumber.endsWith(suffix)) {
      cleanBillNumber = cleanBillNumber.slice(0, -suffix.length);
      break;
    }
  }

  // Parse "congress-type-number" format (e.g., "119-hr-1234")
  const apiMatch = cleanBillNumber.match(/^(\d+)-([a-z]+)-(\d+)$/i);
  if (apiMatch && apiMatch[1] && apiMatch[2] && apiMatch[3]) {
    return {
      type: apiMatch[2].toLowerCase(),
      number: apiMatch[3],
      congress: apiMatch[1],
    };
  }

  // Parse "H.R. 1234" or "S. 567" display format
  const displayMatch = cleanBillNumber.match(/^([A-Z]+\.?[A-Z]*?)\.?\s+(\d+)$/i);
  if (displayMatch && displayMatch[1] && displayMatch[2]) {
    return {
      type: displayMatch[1].toLowerCase().replace(/\./g, ''),
      number: displayMatch[2],
      congress: '119', // Default to current congress
    };
  }

  // Fallback for unrecognized formats
  return {
    type: 'unknown',
    number: cleanBillNumber,
    congress: '119',
  };
}

// Type guards
export function isBill(obj: unknown): obj is Bill {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Bill).id === 'string' &&
    typeof (obj as Bill).number === 'string' &&
    typeof (obj as Bill).title === 'string'
  );
}

export function isBillVote(obj: unknown): obj is BillVote {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as BillVote).voteId === 'string' &&
    typeof (obj as BillVote).chamber === 'string'
  );
}
