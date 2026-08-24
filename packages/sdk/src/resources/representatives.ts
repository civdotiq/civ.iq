import type { HttpClient } from '../http.js';
import type {
  RepresentativeListResponse,
  RepresentativeDetailResponse,
  FullRepresentativeProfile,
  CompareResponse,
  ListRepresentativesParams,
  VotingRecordResponse,
  CampaignFinanceResponse,
} from '../types.js';

export class RepresentativesResource {
  constructor(private readonly http: HttpClient) {}

  /** List current members of Congress with optional filters. */
  list(params?: ListRepresentativesParams): Promise<RepresentativeListResponse> {
    return this.http.get('/v1/representatives', params as Record<string, unknown>);
  }

  /** Get normalized detail for a specific member. */
  get(bioguideId: string): Promise<RepresentativeDetailResponse> {
    return this.http.get(`/v1/representatives/${encodeURIComponent(bioguideId)}`);
  }

  /** Get comprehensive profile with biography, committees, social media, and identifiers. */
  profile(bioguideId: string): Promise<FullRepresentativeProfile> {
    return this.http.get(`/representative/${encodeURIComponent(bioguideId)}`);
  }

  /** Side-by-side comparison of 2-4 legislators. */
  compare(bioguideIds: string[]): Promise<CompareResponse> {
    return this.http.get('/compare', { bioguideId: bioguideIds.join(',') });
  }

  /** List all 535 current members. */
  all(params?: { chamber?: 'house' | 'senate'; state?: string; party?: 'D' | 'R' | 'I' }): Promise<{
    representatives: RepresentativeListResponse['data'];
    metadata: Record<string, unknown>;
  }> {
    return this.http.get('/representatives/all', params as Record<string, unknown>);
  }

  /** Voting record (House via Congress.gov, Senate via official XML feeds). */
  votes(bioguideId: string, params?: { limit?: number }): Promise<VotingRecordResponse> {
    return this.http.get(
      `/representative/${encodeURIComponent(bioguideId)}/votes`,
      params as Record<string, unknown>
    );
  }

  /** FEC campaign finance summary with industry breakdown. */
  finance(bioguideId: string, params?: { cycle?: number }): Promise<CampaignFinanceResponse> {
    return this.http.get(
      `/representative/${encodeURIComponent(bioguideId)}/finance`,
      params as Record<string, unknown>
    );
  }

  /** Senate LDA lobbying filings relevant to this member. */
  lobbying(bioguideId: string): Promise<Record<string, unknown>> {
    return this.http.get(`/representative/${encodeURIComponent(bioguideId)}/lobbying`);
  }
}
