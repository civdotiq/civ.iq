import type { HttpClient } from '../http.js';
import type {
  UnifiedSearchResponse,
  PolicyAreaSearchResponse,
  UnifiedSearchParams,
  PolicyAreaSearchParams,
} from '../types.js';
export declare class SearchResource {
  private readonly http;
  constructor(http: HttpClient);
  /** Cross-domain search across representatives, bills, committees, and state legislators. */
  unified(params: UnifiedSearchParams): Promise<UnifiedSearchResponse>;
  /** Search by policy area across bills, regulations, spending, and committees. */
  policyArea(params: PolicyAreaSearchParams): Promise<PolicyAreaSearchResponse>;
}
//# sourceMappingURL=search.d.ts.map
