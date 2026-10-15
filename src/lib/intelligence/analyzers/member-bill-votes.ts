/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import logger from '@/lib/logging/simple-logger';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';

/** A member's position on one bill-linked roll call, flattened for sector classification. */
export interface RawBillVote {
  billType: string;
  billNumber: string;
  billCongress: number;
  billTitle: string;
  billPolicyArea?: string;
  billSubjects?: string[];
  position: string;
  date: string;
}

/**
 * A member's newest `maxVotes` bill-linked votes across the whole current
 * Congress, in one fetch (session undefined). Fetching sessions 1 and 2
 * separately used to return the same votes twice, because the vote services
 * ignored the session. Returns [] on failure.
 */
export async function fetchMemberBillVotes(
  bioguideId: string,
  chamber: 'House' | 'Senate',
  maxVotes: number,
  logLabel: string
): Promise<RawBillVote[]> {
  try {
    const rawVotes =
      chamber === 'House'
        ? await batchVotingService.getHouseMemberVotes(
            bioguideId,
            getCurrentCongressNumber(),
            undefined,
            maxVotes
          )
        : await batchVotingService.getSenateMemberVotes(
            bioguideId,
            getCurrentCongressNumber(),
            undefined,
            maxVotes
          );

    return rawVotes
      .filter(v => v.bill && v.position)
      .map(v => ({
        billType: v.bill?.type ?? '',
        billNumber: String(v.bill?.number ?? ''),
        billCongress: v.bill?.congress ?? 0,
        billTitle: v.bill?.title ?? '',
        billPolicyArea: v.bill?.policyArea,
        billSubjects: v.bill?.subjects,
        position: v.position,
        date: v.date,
      }));
  } catch (error) {
    logger.warn(`${logLabel} Vote fetch failed`, {
      bioguideId,
      error: (error as Error).message,
    });
    return [];
  }
}
