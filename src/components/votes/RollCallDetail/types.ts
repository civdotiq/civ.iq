/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { MemberVote, UnifiedVoteDetail } from '@/lib/services/vote.service';

export type Position = 'Yea' | 'Nay' | 'Present' | 'Not Voting';

export interface PartyTally {
  total: number;
  yea: number;
  nay: number;
  present: number;
  absent: number;
}

export interface RollCallMember {
  id: string;
  bioguideId?: string;
  fullName: string;
  firstName: string;
  lastName: string;
  state: string;
  district?: string;
  party: 'D' | 'R' | 'I';
  position: Position;
}

export interface RollCallDetailData {
  voteId: string;
  vote: UnifiedVoteDetail;
  members: RollCallMember[];
  totals: {
    yea: number;
    nay: number;
    present: number;
    absent: number;
    total: number;
    voting: number;
  };
  partyTallies: { democrat: PartyTally; republican: PartyTally; independent: PartyTally };
  fromBioguideId?: string;
  fromRepName?: string;
}

export type { MemberVote, UnifiedVoteDetail };
