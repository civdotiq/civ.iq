import type { HttpClient } from '../http.js';
import type {
  CommitteeListResponse,
  CommitteeDetailResponse,
  ListCommitteesParams,
} from '../types.js';

export class CommitteesResource {
  constructor(private readonly http: HttpClient) {}

  /** List congressional committees. */
  list(params?: ListCommitteesParams): Promise<CommitteeListResponse> {
    return this.http.get('/v1/committees', params as Record<string, unknown>);
  }

  /** Get committee detail with members and subcommittees. */
  get(committeeId: string): Promise<CommitteeDetailResponse> {
    return this.http.get(`/v1/committees/${encodeURIComponent(committeeId)}`);
  }
}
