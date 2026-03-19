export class BillsResource {
  constructor(http) {
    this.http = http;
  }
  /** List latest bills from Congress. */
  list(params) {
    return this.http.get('/v1/bills', params);
  }
  /** Get bill detail. */
  get(billId) {
    return this.http.get(`/v1/bills/${encodeURIComponent(billId)}`);
  }
  /** Get AI-generated plain-language bill summary. */
  summary(billId) {
    return this.http.get(`/v1/bills/${encodeURIComponent(billId)}/summary`);
  }
}
//# sourceMappingURL=bills.js.map
