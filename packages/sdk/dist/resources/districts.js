export class DistrictsResource {
  constructor(http) {
    this.http = http;
  }
  /** Get district info and its representatives. */
  get(districtId) {
    return this.http.get(`/v1/districts/${encodeURIComponent(districtId)}`);
  }
  /** List all 435 congressional districts. */
  list(params) {
    return this.http.get('/districts/all', params);
  }
  /** Resolve an address or coordinates to a congressional district. */
  geocode(input) {
    return this.http.post('/geocode', input);
  }
}
//# sourceMappingURL=districts.js.map
