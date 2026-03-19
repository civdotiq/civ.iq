import type { HttpClient } from '../http.js';
import type {
  StateLegislatureResponse,
  StateBillsResponse,
  StateLegislatorsByAddressResponse,
  StateLegislatureParams,
  StateBillsParams,
  AddressInput,
} from '../types.js';

export class StatesResource {
  constructor(private readonly http: HttpClient) {}

  /** List state legislators via OpenStates. */
  legislature(state: string, params?: StateLegislatureParams): Promise<StateLegislatureResponse> {
    return this.http.get(
      `/state-legislature/${encodeURIComponent(state.toUpperCase())}`,
      params as Record<string, unknown>
    );
  }

  /** Search and list state bills via OpenStates. */
  bills(state: string, params?: StateBillsParams): Promise<StateBillsResponse> {
    return this.http.get(
      `/state-bills/${encodeURIComponent(state.toUpperCase())}`,
      params as Record<string, unknown>
    );
  }

  /** Look up state legislators by street address. */
  legislatorsByAddress(
    address: AddressInput & { zip?: string }
  ): Promise<StateLegislatorsByAddressResponse> {
    return this.http.post('/state-legislators-by-address', address);
  }
}
