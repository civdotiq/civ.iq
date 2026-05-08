export type PartyKey = 'd' | 'r' | 'i';

export interface CompareOfficial {
  bioguideId: string;
  name: string;
  shortName: string;
  party: PartyKey;
  partyLabel: string;
  chamber: 'House' | 'Senate';
  state: string;
  district?: string;
  districtLabel: string;
  position: string;
  imageUrl?: string;
  since?: number;
  nextElection?: number;
  committeesCount: number;
  caucusesCount: number;
}

export interface CompareVoting {
  totalVotes: number;
  partyLoyaltyScore: number;
  billsSponsored: number;
  billsEnacted: number;
  billsCosponsored: number;
}

export interface CompareFinance {
  cycle: number;
  totalRaised: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  topIndustry?: string;
  topIndustryAmount?: number;
}

export interface CompareSidePayload {
  official: CompareOfficial | null;
  voting: CompareVoting | null;
  finance: CompareFinance | null;
  errors: {
    profile: boolean;
    voting: boolean;
    finance: boolean;
  };
}

export const DEFAULT_PAIR = {
  a: 'J000294',
  b: 'J000299',
} as const;
