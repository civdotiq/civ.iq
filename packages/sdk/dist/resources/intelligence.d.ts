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
export declare class IntelligenceResource {
  private readonly http;
  constructor(http: HttpClient);
  /** ML vote prediction with SHAP explanations. */
  votePrediction(bioguideId: string): Promise<IntelligenceInsight>;
  /** Lobbying money → contribution → committee → vote chain. */
  influenceChain(bioguideId: string): Promise<IntelligenceInsight>;
  /** Quarterly voting pattern shifts over time. */
  temporal(bioguideId: string): Promise<IntelligenceInsight>;
  /** Campaign finance source vs. committee jurisdiction overlap. */
  financeJurisdiction(bioguideId: string): Promise<IntelligenceInsight>;
  /** Top recipients of contributions from a specific industry sector. */
  sectorLeaderboard(
    sector: string,
    params?: SectorLeaderboardParams
  ): Promise<SectorLeaderboardResponse>;
  /** Campaign finance report card by ZIP code. */
  moneyReport(zip: string): Promise<MoneyReportResponse>;
  /** Campaign finance report card by street address. */
  moneyReportByAddress(address: AddressInput): Promise<MoneyReportResponse>;
  /** Look up representatives by street address. */
  representativesByAddress(address: AddressInput): Promise<AddressRepresentativesResponse>;
  /** Legislators grouped by shared funding patterns. */
  influenceClusters(bioguideId?: string): Promise<InfluenceClustersResponse>;
}
//# sourceMappingURL=intelligence.d.ts.map
