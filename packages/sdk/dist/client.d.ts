import type { HttpClientOptions } from './http.js';
import { RepresentativesResource } from './resources/representatives.js';
import { BillsResource } from './resources/bills.js';
import { VotesResource } from './resources/votes.js';
import { DistrictsResource } from './resources/districts.js';
import { CommitteesResource } from './resources/committees.js';
import { IntelligenceResource } from './resources/intelligence.js';
import { SearchResource } from './resources/search.js';
import { StatesResource } from './resources/states.js';
import { GraphResource } from './resources/graph.js';
export type CivIQOptions = HttpClientOptions;
export declare class CivIQ {
  readonly representatives: RepresentativesResource;
  readonly bills: BillsResource;
  readonly votes: VotesResource;
  readonly districts: DistrictsResource;
  readonly committees: CommitteesResource;
  readonly intelligence: IntelligenceResource;
  readonly search: SearchResource;
  readonly states: StatesResource;
  readonly graph: GraphResource;
  constructor(options?: CivIQOptions);
}
//# sourceMappingURL=client.d.ts.map
