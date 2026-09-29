/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The member vote shape served by both `/api/representative/[id]/votes` and
 * the profile's `/api/representative/[id]/batch` (endpoint `votes`), plus the
 * Senate mapping they share. One mapping, so the two responses cannot drift:
 * before this module the batch path dropped `amendment`, `nomination`,
 * `majorityRequirement` and `bill.displayTitle`.
 */

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import logger from '@/lib/logging/simple-logger';
import type { SenateAmendmentRef, SenateNominationRef } from '@/lib/senate-vote-fields';
import type { MemberVoteRecord } from './batch-voting-service';

export interface MemberApiVote {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
    type: string;
    url?: string;
    /** Congress.gov's display title (the short title when the bill has one,
     *  e.g. "Protect College Sports Act of 2026"). Senate only; set when it
     *  differs from `title`. */
    displayTitle?: string;
  };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  chamber: 'House' | 'Senate';
  rollNumber: number;
  description: string;
  /** Senate only: the amendment voted on (`bill` is the measure it amends). */
  amendment?: SenateAmendmentRef;
  /** Senate only: the nomination voted on. */
  nomination?: SenateNominationRef;
  /** Senate only: "1/2" or "3/5" (rolls mirrored since 2026-09-29). */
  majorityRequirement?: string;
  congressUrl?: string; // Direct link to Congress.gov vote page
  category?: 'Budget' | 'Healthcare' | 'Defense' | 'Judiciary' | 'Foreign Affairs' | 'Other';
  isKeyVote?: boolean;
  total?: {
    yes: number;
    no: number;
    not_voting: number;
    present: number;
  };
  party_breakdown?: {
    democratic: { yes: number; no: number; not_voting: number; present: number };
    republican: { yes: number; no: number; not_voting: number; present: number };
    independent?: { yes: number; no: number; not_voting: number; present: number };
  };
  metadata: {
    source: 'house-congress-api' | 'senate-xml-feed';
    confidence: 'high' | 'medium' | 'low';
    processingDate: string;
  };
}

/** Standardized vote categorization for both House and Senate. */
export function categorizeVote(question: string): MemberApiVote['category'] {
  const text = question.toLowerCase();

  if (text.includes('budget') || text.includes('appropriation') || text.includes('spending')) {
    return 'Budget';
  }
  if (text.includes('health') || text.includes('medicare') || text.includes('medicaid')) {
    return 'Healthcare';
  }
  if (text.includes('defense') || text.includes('military') || text.includes('armed forces')) {
    return 'Defense';
  }
  if (
    text.includes('court') ||
    text.includes('judge') ||
    text.includes('confirmation') ||
    text.includes('nomination')
  ) {
    return 'Judiciary';
  }
  if (text.includes('foreign') || text.includes('treaty') || text.includes('ambassador')) {
    return 'Foreign Affairs';
  }

  return 'Other';
}

/** Standardized key vote determination for both House and Senate. */
export function determineKeyVote(question: string, result: string): boolean {
  const text = `${question} ${result}`.toLowerCase();

  const keyIndicators = [
    'final passage',
    'override',
    'veto',
    'impeachment',
    'confirmation',
    'budget resolution',
    'debt ceiling',
    'continuing resolution',
    'supreme court',
    'cabinet',
  ];

  return keyIndicators.some(indicator => text.includes(indicator));
}

type BillDetails = { title?: string; policyArea?: { name: string } };
const billCache = new Map<string, BillDetails>();

/** Congress.gov bill title + policy area, cached 24h in-process. */
export async function fetchBillDetails(
  congress: number,
  billType: string,
  billNumber: string
): Promise<BillDetails | null> {
  const cacheKey = `bill:${congress}:${billType}:${billNumber}`;
  const cached = billCache.get(cacheKey);
  if (cached) return cached;

  try {
    const normalizedType = billType.toLowerCase().replace(/[^a-z]/g, '');
    const url = `https://api.congress.gov/v3/bill/${congress}/${normalizedType}/${billNumber}?format=json`;
    const response = await fetch(url, {
      headers: {
        'X-API-Key': process.env.CONGRESS_API_KEY || '',
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const billData = data.bill;

    if (billData) {
      const enrichedBill: BillDetails = {
        title: billData.title,
        policyArea: billData.policyArea,
      };
      setTimeout(() => billCache.delete(cacheKey), 86400000);
      billCache.set(cacheKey, enrichedBill);
      return enrichedBill;
    }

    return null;
  } catch (error) {
    logger.debug('Error fetching bill details', { error: (error as Error).message, billNumber });
    return null;
  }
}

type BillTitleLookup = (
  congress: number,
  billType: string,
  billNumber: string
) => Promise<{ title?: string } | null>;

const billKey = (b: { congress: number | string; type: string; number: number | string }) =>
  `${b.congress}-${b.type}-${b.number}`;

/**
 * Map a senator's vote records to the API vote shape. Looks up Congress.gov
 * display titles for the few distinct bills in the list.
 */
export async function toSenateApiVotes(
  memberVotes: MemberVoteRecord[],
  lookupBill: BillTitleLookup = fetchBillDetails
): Promise<MemberApiVote[]> {
  const bills = new Map<string, { congress: number; type: string; number: string }>();
  for (const v of memberVotes) {
    if (v.bill) bills.set(billKey(v.bill), v.bill);
  }
  const displayTitles = new Map(
    await Promise.all(
      [...bills].map(
        async ([key, b]) => [key, (await lookupBill(b.congress, b.type, b.number))?.title] as const
      )
    )
  );

  return memberVotes.map(vote => {
    const question = vote.question || 'Unknown Question';
    const result = vote.result || 'Unknown';
    const displayTitle = vote.bill ? displayTitles.get(billKey(vote.bill)) : undefined;

    return {
      voteId: vote.voteId,
      bill: vote.bill
        ? {
            number: String(vote.bill.number),
            title: vote.bill.title,
            congress: String(vote.bill.congress),
            type: vote.bill.type,
            url: vote.bill.url,
            ...(displayTitle && displayTitle !== vote.bill.title ? { displayTitle } : {}),
          }
        : {
            number: 'N/A',
            title: vote.nomination?.description ?? 'Vote without associated bill',
            congress: String(getCurrentCongressNumber()),
            type: vote.nomination ? 'Nomination' : 'Senate Resolution',
            url: undefined,
          },
      question,
      result,
      date: vote.date,
      position: vote.position as MemberApiVote['position'],
      chamber: 'Senate' as const,
      rollNumber: vote.rollCallNumber || 0,
      description: question,
      ...(vote.amendment ? { amendment: vote.amendment } : {}),
      ...(vote.nomination ? { nomination: vote.nomination } : {}),
      ...(vote.majorityRequirement ? { majorityRequirement: vote.majorityRequirement } : {}),
      category: categorizeVote(question),
      isKeyVote: determineKeyVote(question, result),
      metadata: {
        source: 'senate-xml-feed' as const,
        confidence: 'high' as const,
        processingDate: new Date().toISOString(),
      },
    };
  });
}

/**
 * A senator's most recent votes in the API shape. Throws on upstream failure
 * so each caller decides how to report it.
 */
export async function getSenateApiVotes(
  bioguideId: string,
  limit: number = 10
): Promise<MemberApiVote[]> {
  const { batchVotingService } = await import('./batch-voting-service');
  // Congressional sessions: odd years = Session 1, even years = Session 2
  const currentSession = new Date().getFullYear() % 2 === 1 ? 1 : 2;
  const memberVotes = await batchVotingService.getSenateMemberVotes(
    bioguideId,
    getCurrentCongressNumber(),
    currentSession,
    limit
  );
  return toSenateApiVotes(memberVotes);
}
