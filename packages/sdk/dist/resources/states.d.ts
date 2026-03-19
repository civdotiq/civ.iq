import type { HttpClient } from '../http.js';
import type {
  StateLegislatureResponse,
  StateBillsResponse,
  StateLegislatorsByAddressResponse,
  StateLegislatureParams,
  StateBillsParams,
  AddressInput,
} from '../types.js';
export declare class StatesResource {
  private readonly http;
  constructor(http: HttpClient);
  /** List state legislators via OpenStates. */
  legislature(state: string, params?: StateLegislatureParams): Promise<StateLegislatureResponse>;
  /** Search and list state bills via OpenStates. */
  bills(state: string, params?: StateBillsParams): Promise<StateBillsResponse>;
  /** Look up state legislators by street address. */
  legislatorsByAddress(
    address: AddressInput & {
      zip?: string;
    }
  ): Promise<StateLegislatorsByAddressResponse>;
}
//# sourceMappingURL=states.d.ts.map
