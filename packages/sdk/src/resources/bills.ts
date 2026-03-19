import type { HttpClient } from '../http.js';
import type {
  BillListResponse,
  BillDetailResponse,
  BillSummaryResponse,
  ListBillsParams,
} from '../types.js';

export class BillsResource {
  constructor(private readonly http: HttpClient) {}

  /** List latest bills from Congress. */
  list(params?: ListBillsParams): Promise<BillListResponse> {
    return this.http.get('/v1/bills', params as Record<string, unknown>);
  }

  /** Get bill detail. */
  get(billId: string): Promise<BillDetailResponse> {
    return this.http.get(`/v1/bills/${encodeURIComponent(billId)}`);
  }

  /** Get AI-generated plain-language bill summary. */
  summary(billId: string): Promise<BillSummaryResponse> {
    return this.http.get(`/v1/bills/${encodeURIComponent(billId)}/summary`);
  }
}
