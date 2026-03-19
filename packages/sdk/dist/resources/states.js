export class StatesResource {
  constructor(http) {
    this.http = http;
  }
  /** List state legislators via OpenStates. */
  legislature(state, params) {
    return this.http.get(`/state-legislature/${encodeURIComponent(state.toUpperCase())}`, params);
  }
  /** Search and list state bills via OpenStates. */
  bills(state, params) {
    return this.http.get(`/state-bills/${encodeURIComponent(state.toUpperCase())}`, params);
  }
  /** Look up state legislators by street address. */
  legislatorsByAddress(address) {
    return this.http.post('/state-legislators-by-address', address);
  }
}
//# sourceMappingURL=states.js.map
