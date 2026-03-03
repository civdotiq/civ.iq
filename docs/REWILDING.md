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

**Kind 30023:** Universal client support. Rich structure (title, summary, tags, Markdown content). Addressable via `d` tag. The `civiq:` namespace creates a civic data schema within the existing standard.

## Content Format

Event content is Markdown, not JSON. Long-form Nostr clients (Habla, Yakihonne, Highlighter) render it natively:

```markdown
# HR 1: Passed House

The bill passed with bipartisan support...

**Type**: bill-action | **Source**: [congress.gov](https://www.congress.gov/...)

---

<details><summary>Structured Data</summary>

\`\`\`json
{ "platform": "civiq", "version": 1, "type": "bill-action", ... }
\`\`\`

</details>
```

Structured data is preserved in a collapsible `<details>` block for programmatic consumers. All metadata remains in tags (`d`, `title`, `summary`, `t`, `r`) for filtering and querying.

## NIP-65 Relay List

A Kind 10002 event is published on every cron run, advertising which relays carry CIV.IQ data. This allows clients to auto-discover relays without hardcoding URLs. The event is replaceable (re-publishing updates it).

## State Events

State legislature events are higher-leverage rewilding than federal — more invisible, less covered, closer to citizens. The publisher detects state bill introductions, actions, and votes via OpenStates API and publishes them to the same relay network.

| Event Type              | d-tag Pattern                                                         | Source     |
| ----------------------- | --------------------------------------------------------------------- | ---------- |
| `state-bill-introduced` | `civiq:state-bill-introduced:state-bill-intro-{state}-{id}-{session}` | OpenStates |
| `state-bill-action`     | `civiq:state-bill-action:state-bill-action-{state}-{id}-{date}`       | OpenStates |
| `state-vote`            | `civiq:state-vote:state-vote-{state}-{voteId}`                        | OpenStates |

**Enabled states**: CA, NY, TX, IL, FL, PA, OH, GA, WA, MI, NJ, VA, MA, AZ, CO (15 states, configurable via `nostrConfig.enabledStates`).

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

## Federation: ActivityPub

Nostr reaches individuals. ActivityPub reaches institutions — libraries, newsrooms, civic organizations, and any Mastodon/fediverse instance. CIV.IQ publishes as a `Service` actor that fediverse instances can follow.

### How It Works

1. **Discovery**: `/.well-known/webfinger?resource=acct:civiq@civ.iq` and `/.well-known/nodeinfo`
2. **Actor**: `/api/activitypub/actor` returns the JSON-LD actor document
3. **Follow**: Remote servers POST Follow activities to `/api/activitypub/inbox`; CIV.IQ responds with Accept (with retry on failure: 3 attempts, exponential backoff)
4. **Delivery**: New civic events are delivered to all follower inboxes via HTTP Signature-authenticated POST. Create and Update activity types supported.
5. **Outbox**: `/api/activitypub/outbox` provides a paginated OrderedCollection of all published activities
6. **Collections**: `/api/activitypub/followers` and `/api/activitypub/following` expose standard OrderedCollections
7. **NodeInfo**: `/api/activitypub/nodeinfo` exposes NodeInfo 2.0 for fediverse directory listing (fediverse.observer, fedidb.org)

### What Gets Published

Same 9 civic event types as Nostr: bill actions, bill introductions, vote records, executive orders, comment periods, hearings, and state legislature events. Each becomes an ActivityPub `Note` with hashtags, source links, and plain-text fallback. If an event already exists in the outbox, an `Update` activity is sent instead of `Create`.

### Authentication

- **Outgoing**: RSA-SHA256 HTTP Signatures (draft-cavage-http-signatures, Mastodon standard)
- **Incoming**: Signature verification by fetching the remote actor's public key
- **Keys**: RSA 2048-bit keypair stored in environment variables

---

_References:_

- Farrell, M. & Berjon, R. (2024). [We Need To Rewild The Internet](https://www.noemamag.com/we-need-to-rewild-the-internet/). NOEMA.
- [NIP-23: Long-form Content](https://nips.nostr.com/23). Nostr Protocol.
- [NIP-33: Parameterized Replaceable Events](https://nostr.co.uk/nips/nip-33/). Nostr Protocol.
