export class IntelligenceResource {
  constructor(http) {
    this.http = http;
  }
  /** ML vote prediction with SHAP explanations. */
  votePrediction(bioguideId) {
    return this.http.get(
      `/intelligence/representative/${encodeURIComponent(bioguideId)}/vote-prediction`
    );
  }
  /** Lobbying money → contribution → committee → vote chain. */
  influenceChain(bioguideId) {
    return this.http.get(
      `/intelligence/representative/${encodeURIComponent(bioguideId)}/influence-chain`
    );
  }
  /** Quarterly voting pattern shifts over time. */
  temporal(bioguideId) {
    return this.http.get(`/intelligence/representative/${encodeURIComponent(bioguideId)}/temporal`);
  }
  /** Campaign finance source vs. committee jurisdiction overlap. */
  financeJurisdiction(bioguideId) {
    return this.http.get(
      `/intelligence/representative/${encodeURIComponent(bioguideId)}/finance-jurisdiction`
    );
  }
  /** Top recipients of contributions from a specific industry sector. */
  sectorLeaderboard(sector, params) {
    return this.http.get(`/intelligence/sector/${encodeURIComponent(sector)}/leaderboard`, params);
  }
  /** Campaign finance report card by ZIP code. */
  moneyReport(zip) {
    return this.http.get('/intelligence/address/money-report', { zip });
  }
  /** Campaign finance report card by street address. */
  moneyReportByAddress(address) {
    return this.http.post('/intelligence/address/money-report', address);
  }
  /** Look up representatives by street address. */
  representativesByAddress(address) {
    return this.http.post('/intelligence/address/representatives', address);
  }
  /** Legislators grouped by shared funding patterns. */
  influenceClusters(bioguideId) {
    return this.http.get(
      '/intelligence/influence-clusters',
      bioguideId ? { bioguideId } : undefined
    );
  }
}
//# sourceMappingURL=intelligence.js.map
