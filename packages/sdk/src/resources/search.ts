import type { HttpClient } from '../http.js';
import type {
  UnifiedSearchResponse,
  PolicyAreaSearchResponse,
  UnifiedSearchParams,
  PolicyAreaSearchParams,
} from '../types.js';

export class SearchResource {
  constructor(private readonly http: HttpClient) {}

  /** Cross-domain search across representatives, bills, committees, and state legislators. */
  unified(params: UnifiedSearchParams): Promise<UnifiedSearchResponse> {
    return this.http.get('/search/unified', params as unknown as Record<string, unknown>);
  }

  /** Search by policy area across bills, regulations, spending, and committees. */
  policyArea(params: PolicyAreaSearchParams): Promise<PolicyAreaSearchResponse> {
    return this.http.get('/search/policy-area', params as unknown as Record<string, unknown>);
  }
}
