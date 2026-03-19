import type { HttpClient } from '../http.js';
import type { GraphNeighborsResponse, GraphNeighborsParams } from '../types.js';

export class GraphResource {
  constructor(private readonly http: HttpClient) {}

  /** Get connected entities in the civic knowledge graph. */
  neighbors(nodeId: string, params?: GraphNeighborsParams): Promise<GraphNeighborsResponse> {
    return this.http.get(
      `/graph/neighbors/${encodeURIComponent(nodeId)}`,
      params as Record<string, unknown>
    );
  }

  /** Unified entity with identity, neighborhood, intelligence, and temporal context. */
  entity(nodeId: string): Promise<Record<string, unknown>> {
    return this.http.get(`/mesh/entity/${encodeURIComponent(nodeId)}`);
  }

  /** Quarterly time-series of edge activity and trends. */
  temporal(nodeId: string, params?: { quarters?: number }): Promise<Record<string, unknown>> {
    return this.http.get(
      `/mesh/temporal/${encodeURIComponent(nodeId)}`,
      params as Record<string, unknown>
    );
  }
}
