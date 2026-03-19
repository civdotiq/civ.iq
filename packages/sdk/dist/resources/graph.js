export class GraphResource {
  constructor(http) {
    this.http = http;
  }
  /** Get connected entities in the civic knowledge graph. */
  neighbors(nodeId, params) {
    return this.http.get(`/graph/neighbors/${encodeURIComponent(nodeId)}`, params);
  }
  /** Unified entity with identity, neighborhood, intelligence, and temporal context. */
  entity(nodeId) {
    return this.http.get(`/mesh/entity/${encodeURIComponent(nodeId)}`);
  }
  /** Quarterly time-series of edge activity and trends. */
  temporal(nodeId, params) {
    return this.http.get(`/mesh/temporal/${encodeURIComponent(nodeId)}`, params);
  }
}
//# sourceMappingURL=graph.js.map
