import type { HttpClient } from '../http.js';
import type { VoteDetailResponse } from '../types.js';

export class VotesResource {
  constructor(private readonly http: HttpClient) {}

  /** Get roll-call vote details with individual member positions. */
  get(voteId: string): Promise<VoteDetailResponse> {
    return this.http.get(`/v1/votes/${encodeURIComponent(voteId)}`);
  }
}
