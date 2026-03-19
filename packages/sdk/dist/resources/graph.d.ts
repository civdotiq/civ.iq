import type { HttpClient } from '../http.js';
import type { GraphNeighborsResponse, GraphNeighborsParams } from '../types.js';
export declare class GraphResource {
  private readonly http;
  constructor(http: HttpClient);
  /** Get connected entities in the civic knowledge graph. */
  neighbors(nodeId: string, params?: GraphNeighborsParams): Promise<GraphNeighborsResponse>;
  /** Unified entity with identity, neighborhood, intelligence, and temporal context. */
  entity(nodeId: string): Promise<Record<string, unknown>>;
  /** Quarterly time-series of edge activity and trends. */
  temporal(
    nodeId: string,
    params?: {
      quarters?: number;
    }
  ): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=graph.d.ts.map
