import type { HttpClient } from '../http.js';
import type {
  IntelligenceInsight,
  SectorLeaderboardResponse,
  MoneyReportResponse,
  AddressRepresentativesResponse,
  InfluenceClustersResponse,
  SectorLeaderboardParams,
  AddressInput,
} from '../types.js';

export class IntelligenceResource {
  constructor(private readonly http: HttpClient) {}

  /** ML vote prediction with SHAP explanations. */
  votePrediction(bioguideId: string): Promise<IntelligenceInsight> {
    return this.http.get(
      `/intelligence/representative/${encodeURIComponent(bioguideId)}/vote-prediction`
    );
  }

  /** Lobbying money → contribution → committee → vote chain. */
  influenceChain(bioguideId: string): Promise<IntelligenceInsight> {
    return this.http.get(
      `/intelligence/representative/${encodeURIComponent(bioguideId)}/influence-chain`
    );
  }

  /** Quarterly voting pattern shifts over time. */
  temporal(bioguideId: string): Promise<IntelligenceInsight> {
    return this.http.get(`/intelligence/representative/${encodeURIComponent(bioguideId)}/temporal`);
  }

  /** Campaign finance source vs. committee jurisdiction overlap. */
  financeJurisdiction(bioguideId: string): Promise<IntelligenceInsight> {
    return this.http.get(
      `/intelligence/representative/${encodeURIComponent(bioguideId)}/finance-jurisdiction`
    );
  }

  /** Top recipients of contributions from a specific industry sector. */
  sectorLeaderboard(
    sector: string,
    params?: SectorLeaderboardParams
  ): Promise<SectorLeaderboardResponse> {
    return this.http.get(
      `/intelligence/sector/${encodeURIComponent(sector)}/leaderboard`,
      params as Record<string, unknown>
    );
  }

  /** Campaign finance report card by ZIP code. */
  moneyReport(zip: string): Promise<MoneyReportResponse> {
    return this.http.get('/intelligence/address/money-report', { zip });
  }

  /** Campaign finance report card by street address. */
  moneyReportByAddress(address: AddressInput): Promise<MoneyReportResponse> {
    return this.http.post('/intelligence/address/money-report', address);
  }

  /** Look up representatives by street address. */
  representativesByAddress(address: AddressInput): Promise<AddressRepresentativesResponse> {
    return this.http.post('/intelligence/address/representatives', address);
  }

  /** Legislators grouped by shared funding patterns. */
  influenceClusters(bioguideId?: string): Promise<InfluenceClustersResponse> {
    return this.http.get(
      '/intelligence/influence-clusters',
      bioguideId ? { bioguideId } : undefined
    );
  }
}
