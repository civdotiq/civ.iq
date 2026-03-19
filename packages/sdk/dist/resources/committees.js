export class CommitteesResource {
  constructor(http) {
    this.http = http;
  }
  /** List congressional committees. */
  list(params) {
    return this.http.get('/v1/committees', params);
  }
  /** Get committee detail with members and subcommittees. */
  get(committeeId) {
    return this.http.get(`/v1/committees/${encodeURIComponent(committeeId)}`);
  }
}
//# sourceMappingURL=committees.js.map
