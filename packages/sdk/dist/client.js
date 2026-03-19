import { HttpClient } from './http.js';
import { RepresentativesResource } from './resources/representatives.js';
import { BillsResource } from './resources/bills.js';
import { VotesResource } from './resources/votes.js';
import { DistrictsResource } from './resources/districts.js';
import { CommitteesResource } from './resources/committees.js';
import { IntelligenceResource } from './resources/intelligence.js';
import { SearchResource } from './resources/search.js';
import { StatesResource } from './resources/states.js';
import { GraphResource } from './resources/graph.js';
export class CivIQ {
  constructor(options) {
    const http = new HttpClient(options);
    this.representatives = new RepresentativesResource(http);
    this.bills = new BillsResource(http);
    this.votes = new VotesResource(http);
    this.districts = new DistrictsResource(http);
    this.committees = new CommitteesResource(http);
    this.intelligence = new IntelligenceResource(http);
    this.search = new SearchResource(http);
    this.states = new StatesResource(http);
    this.graph = new GraphResource(http);
  }
}
//# sourceMappingURL=client.js.map
