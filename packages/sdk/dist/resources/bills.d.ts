import type { HttpClient } from '../http.js';
import type {
  BillListResponse,
  BillDetailResponse,
  BillSummaryResponse,
  ListBillsParams,
} from '../types.js';
export declare class BillsResource {
  private readonly http;
  constructor(http: HttpClient);
  /** List latest bills from Congress. */
  list(params?: ListBillsParams): Promise<BillListResponse>;
  /** Get bill detail. */
  get(billId: string): Promise<BillDetailResponse>;
  /** Get AI-generated plain-language bill summary. */
  summary(billId: string): Promise<BillSummaryResponse>;
}
//# sourceMappingURL=bills.d.ts.map
