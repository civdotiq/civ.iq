export class VotesResource {
  constructor(http) {
    this.http = http;
  }
  /** Get roll-call vote details with individual member positions. */
  get(voteId) {
    return this.http.get(`/v1/votes/${encodeURIComponent(voteId)}`);
  }
}
//# sourceMappingURL=votes.js.map
