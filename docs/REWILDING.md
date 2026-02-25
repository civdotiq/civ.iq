# Rewilding Audit: CIV.IQ Nostr Publishing Layer

CIV.IQ aggregates 8 federal data sources into 107 API endpoints. But aggregation with a single point of failure is still monoculture ([Farrell & Berjon, 2024](https://www.noemamag.com/we-need-to-rewild-the-internet/)). The Nostr layer makes civic records survive independently of this platform.

## How It Works

Every civic event the system detects -- bills, votes, executive orders, comment periods, hearings -- becomes a Schnorr-signed Nostr event distributed to 7 independent relays. Once published:

1. **Cannot be altered** without invalidating the signature
2. **Cannot be censored** without taking down all 7 relays (different operators, different jurisdictions)
3. **Can be consumed** by any Nostr client, not just CIV.IQ
4. **Can be verified** by anyone with the CIV.IQ public key

```
Congress.gov API  -->  CIV.IQ  -->  relay.damus.io
Fed Register                       relay.snort.social
GovInfo                            nos.lol
                                   relay.nostr.band       -->  Any Nostr client
                                   nostr.wine                  Any custom consumer
                                   relay.nostr.bg              Future apps not yet built
                                   nostr-pub.wellorder.net
```

CIV.IQ can go offline entirely and the records survive.

## Technical Properties

| Property     | Mechanism                                | Effect                                 |
| ------------ | ---------------------------------------- | -------------------------------------- |
| Tamper-proof | Schnorr signatures (secp256k1)           | No operator can silently alter records |
| Addressable  | NIP-23 `d` tag: `civiq:{type}:{id}`      | Stable identifiers across all relays   |
| Discoverable | `t` tags per civic topic                 | Any client can filter by type          |
| Verifiable   | Public key published, all events signed  | Independent authenticity verification  |
| Redundant    | 7 relays, minimum 3 required             | No single point of failure             |
| Open         | Standard Nostr protocol (NIP-01, NIP-23) | Zero coordination to consume           |
| Replaceable  | Kind 30023 parameterized replaceable     | Corrections without breaking the chain |

## Why Kind 30023 for All Event Types

**Kind 1 (short text notes):** No structured metadata, no addressability, no replaceability.

**Custom kinds (30100+ range):** No existing client renders them. Data invisible to the ecosystem -- the opposite of rewilding.

**Kind 30023:** Universal client support. Rich structure (title, summary, tags, JSON body). Addressable via `d` tag. The `civiq:` namespace creates a civic data schema within the existing standard.

## Limits

- **Does not replace government APIs.** If Congress.gov stops publishing, we stop detecting. Nostr preserves what was detected, not what was never published.
- **Does not guarantee relay persistence.** 7-relay redundancy mitigates but doesn't eliminate.
- **Daily, not real-time.** Cron job runs once per day.
- **Audience gap.** The data is available; most citizens don't use Nostr clients yet.

## Verification

`GET /api/nostr/verify` — read-back endpoint that queries all relays for CIV.IQ-signed events and compares against publishing records.

| Field               | Description                          |
| ------------------- | ------------------------------------ |
| `status`            | `healthy` / `degraded` / `unhealthy` |
| `published`         | Events in Redis dedup cache          |
| `confirmedOnRelays` | Unique events found across relays    |
| `relayHealth[]`     | Per-relay status, event count        |
| `discrepancies[]`   | Events published but not confirmed   |

This closes the write-only gap. The system can now prove its records survive independently, not just assert it.

## Success Metrics

1. Third-party consumers fetching events from relays
2. Cross-referencing by other civic data publishers via `e` tags
3. Civic events rendered in clients we don't control
4. Community relay operators carrying civic data

None require CIV.IQ's permission or continued operation.

---

_References:_

- Farrell, M. & Berjon, R. (2024). [We Need To Rewild The Internet](https://www.noemamag.com/we-need-to-rewild-the-internet/). NOEMA.
- [NIP-23: Long-form Content](https://nips.nostr.com/23). Nostr Protocol.
- [NIP-33: Parameterized Replaceable Events](https://nostr.co.uk/nips/nip-33/). Nostr Protocol.
