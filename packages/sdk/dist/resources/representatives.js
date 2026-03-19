export class RepresentativesResource {
  constructor(http) {
    this.http = http;
  }
  /** List current members of Congress with optional filters. */
  list(params) {
    return this.http.get('/v1/representatives', params);
  }
  /** Get normalized detail for a specific member. */
  get(bioguideId) {
    return this.http.get(`/v1/representatives/${encodeURIComponent(bioguideId)}`);
  }
  /** Get comprehensive profile with biography, committees, social media, and identifiers. */
  profile(bioguideId) {
    return this.http.get(`/representative/${encodeURIComponent(bioguideId)}`);
  }
  /** Side-by-side comparison of 2-4 legislators. */
  compare(bioguideIds) {
    return this.http.get('/compare', { bioguideId: bioguideIds.join(',') });
  }
  /** List all 535 current members. */
  all(params) {
    return this.http.get('/representatives/all', params);
  }
}
//# sourceMappingURL=representatives.js.map
