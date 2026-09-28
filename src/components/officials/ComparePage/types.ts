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

/** null = that section could not be computed; the row renders "—". */
export interface CompareVoting {
  totalVotes: number | null;
  partyLoyaltyScore: number | null;
  billsSponsored: number | null;
  billsEnacted: number | null;
  billsCosponsored: number | null;
  /** True when the cosponsored sample was truncated (count is a floor). */
  billsCosponsoredIsLowerBound: boolean;
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
