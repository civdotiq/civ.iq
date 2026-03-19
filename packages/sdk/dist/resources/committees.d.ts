import type { HttpClient } from '../http.js';
import type {
  CommitteeListResponse,
  CommitteeDetailResponse,
  ListCommitteesParams,
} from '../types.js';
export declare class CommitteesResource {
  private readonly http;
  constructor(http: HttpClient);
  /** List congressional committees. */
  list(params?: ListCommitteesParams): Promise<CommitteeListResponse>;
  /** Get committee detail with members and subcommittees. */
  get(committeeId: string): Promise<CommitteeDetailResponse>;
}
//# sourceMappingURL=committees.d.ts.map
