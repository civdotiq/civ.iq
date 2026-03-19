export class SearchResource {
  constructor(http) {
    this.http = http;
  }
  /** Cross-domain search across representatives, bills, committees, and state legislators. */
  unified(params) {
    return this.http.get('/search/unified', params);
  }
  /** Search by policy area across bills, regulations, spending, and committees. */
  policyArea(params) {
    return this.http.get('/search/policy-area', params);
  }
}
//# sourceMappingURL=search.js.map
