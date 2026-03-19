import type { HttpClient } from '../http.js';
import type { VoteDetailResponse } from '../types.js';
export declare class VotesResource {
  private readonly http;
  constructor(http: HttpClient);
  /** Get roll-call vote details with individual member positions. */
  get(voteId: string): Promise<VoteDetailResponse>;
}
//# sourceMappingURL=votes.d.ts.map
