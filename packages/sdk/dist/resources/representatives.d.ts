import type { HttpClient } from '../http.js';
import type {
  RepresentativeListResponse,
  RepresentativeDetailResponse,
  FullRepresentativeProfile,
  CompareResponse,
  ListRepresentativesParams,
} from '../types.js';
export declare class RepresentativesResource {
  private readonly http;
  constructor(http: HttpClient);
  /** List current members of Congress with optional filters. */
  list(params?: ListRepresentativesParams): Promise<RepresentativeListResponse>;
  /** Get normalized detail for a specific member. */
  get(bioguideId: string): Promise<RepresentativeDetailResponse>;
  /** Get comprehensive profile with biography, committees, social media, and identifiers. */
  profile(bioguideId: string): Promise<FullRepresentativeProfile>;
  /** Side-by-side comparison of 2-4 legislators. */
  compare(bioguideIds: string[]): Promise<CompareResponse>;
  /** List all 535 current members. */
  all(params?: { chamber?: 'house' | 'senate'; state?: string; party?: 'D' | 'R' | 'I' }): Promise<{
    representatives: RepresentativeListResponse['data'];
    metadata: Record<string, unknown>;
  }>;
}
//# sourceMappingURL=representatives.d.ts.map
