# Plan: Decentralized Publishing Layer Upgrade

## Context

Research review of CIV.IQ's Nostr + ActivityPub implementations identified real architectural gaps. The 807-line monolithic cron handler (`src/app/api/cron/nostr-publisher/route.ts`) is the ceiling for all improvements. Beyond that, the Nostr layer only publishes Kind 30023 (invisible to most social clients), the ActivityPub delivery sends individual POSTs per follower (O(followers) scaling), and there's no mechanism to retract/correct published civic data.

This plan addresses the 6 highest-impact improvements in dependency order.

## Phase Dependency Graph

```
Phase 0 (Decompose Monolith) ─── prerequisite for all others
  ├── Phase 1 (Hybrid Kind 1 + Kind 30023)
  ├── Phase 2 (Shared Inbox)
  ├── Phase 4 (410 Gone Pruning) ─── standalone, ~15 lines
  ├── Phase 3 (Event Deletion) ─── needs Phase 0 detectors
  ├── Phase 5 (NIP-11 Relay Negotiation) ─── standalone
  └── Phase 6 (OpenStates Staleness) ─── standalone
```

**Implementation order: 0 → 1 → 2 → 4 → 3 → 5 → 6**

---

## Current Architecture (Key Files)

| File                                        | Purpose                                                                    | Lines |
| ------------------------------------------- | -------------------------------------------------------------------------- | ----- |
| `src/app/api/cron/nostr-publisher/route.ts` | Monolithic cron: detection + signing + Nostr publish + AP federation       | 807   |
| `src/lib/nostr/events.ts`                   | Creates Kind 30023 (NIP-23 long-form) events, Schnorr signing              | 62    |
| `src/lib/nostr/relay-pool.ts`               | SimplePool publish to 7 hardcoded relays, 5s timeout, 3-of-7 threshold     | 72    |
| `src/lib/nostr/relay-list.ts`               | Publishes Kind 0 (profile) and Kind 10002 (NIP-65 relay list)              | 75    |
| `src/lib/nostr/state-event-detector.ts`     | OpenStates API integration for 15 states                                   | 265   |
| `src/lib/nostr/relay-reader.ts`             | Queries relays for verification                                            | -     |
| `src/config/nostr.config.ts`                | Relay list, thresholds, event kind, dedup config, enabled states           | 58    |
| `src/types/nostr.ts`                        | 9 CivicEventTypes, all event data interfaces                               | 165   |
| `src/lib/activitypub/actor.ts`              | Builds Service actor document, RSA key management from env                 | 64    |
| `src/lib/activitypub/http-signatures.ts`    | draft-cavage RSA-SHA256 sign/verify, accepts hs2019 inbound, actor caching | 242   |
| `src/lib/activitypub/followers.ts`          | Redis JSON array: {actorId, inbox, followedAt}. NO sharedInbox field       | 74    |
| `src/lib/activitypub/outbox.ts`             | civicEventToNote() → wrapInCreate/Update → Redis. 500 max, 365d TTL        | 150   |
| `src/lib/activitypub/delivery.ts`           | Individual inbox POSTs, 10s timeout, Accept retry queue                    | 159   |
| `src/app/api/activitypub/inbox/route.ts`    | Handles Follow + Undo, verifies HTTP signatures                            | 179   |
| `src/config/activitypub.config.ts`          | Domain, actor config, outbox settings, Redis keys, rate limits             | 52    |
| `src/types/activitypub.ts`                  | AP types including APDeleteActivity (already defined but unused)           | 169   |

---

## Phase 0: Decompose the Monolith

**Why**: The cron route has 5 detector functions, 7 local interfaces, and the publish-and-federate loop all in one file. Adding hybrid content, deletion signals, or shared inbox grouping into this file would push it past 1000 lines and make it unmaintainable.

### New files

**`src/lib/nostr/detectors/types.ts`** — Shared interfaces (`CongressBill`, `CongressApiResponse`, `CongressVote`, `CongressVoteApiResponse`) currently at lines 45-80 of cron route.

**`src/lib/nostr/detectors/bill-detector.ts`** — Extract `parseBillNumber()`, `fetchRecentBills()`, `buildBillActionEvent()`, `buildBillIntroducedEvent()`, `detectBillEvents()` (lines 89-236).

**`src/lib/nostr/detectors/vote-detector.ts`** — Extract `detectVoteEvents()` (lines 239-308).

**`src/lib/nostr/detectors/executive-order-detector.ts`** — Extract `detectExecutiveOrderEvents()` (lines 311-392). Imports `FederalRegisterAPIResponse` from `@/types/federal-register`.

**`src/lib/nostr/detectors/comment-period-detector.ts`** — Extract `detectCommentPeriodEvents()` (lines 395-492). Also imports `FederalRegisterAPIResponse`.

**`src/lib/nostr/detectors/hearing-detector.ts`** — Extract `detectHearingEvents()` + `parseChamberFromDocClass()` (lines 495-571). Imports `GovInfoCollectionResponse` from `@/types/govinfo`.

**`src/lib/nostr/detectors/index.ts`** — Barrel export of all 5 detectors.

**`src/lib/publishing/publish-and-federate.ts`** — Extract the sign-publish-federate loop (lines 689-750):

```typescript
export interface PublishResult {
  eventsPublished: number;
  eventsFailed: number;
  activityPubAdded: number;
  activityPubDelivered: number;
  relayResults: RelayPublishResult[];
}

export async function publishAndFederate(
  events: CivicEvent[],
  privateKey: Uint8Array
): Promise<PublishResult>;
```

### Modified files

**`src/app/api/cron/nostr-publisher/route.ts`** — Shrinks to ~100 lines. Keeps `withDetectionTimeout()`, `detectNewEvents()` (orchestration), and the POST/GET handlers. The publish loop becomes `const result = await publishAndFederate(events, keypair.privateKey)`.

### Tests

- Each detector gets its own test file mocking `fetch` and `getRedisCache`
- `publish-and-federate.test.ts` mocks signing/relay/outbox functions
- Existing tests pass unchanged

---

## Phase 1: Hybrid Nostr Content (Kind 1 + Kind 30023)

**Why**: CIV.IQ is invisible on most Nostr social timelines. Damus, the dominant iOS client, treats NIP-23 (Kind 30023) as secondary content. Publishing Kind 1 short notes ensures civic alerts appear in every global timeline and search index.

### Modified files

**`src/lib/nostr/events.ts`** — Add `createSignedAlertEvent()`:

```typescript
export function createSignedAlertEvent(
  event: CivicEvent,
  privateKey: Uint8Array,
  articleEventId: string,
  pubkey: string
): VerifiedEvent;
```

- Kind 1 short note with: title, 1-line summary, hashtags, `naddr` pointer to the Kind 30023 article
- Uses `nip19.naddrEncode()` from nostr-tools (already installed, subpath `nostr-tools/nip19`)
- `e` tag references the article event ID with `mention` marker
- `t` tags mirror the article's topic tags, `r` tag for source URL

**Content format**:

```
{title}

{summary}

#legislation #house #civictech

Full details: nostr:{naddr}
```

**`src/config/nostr.config.ts`** — Add:

- `alertEventKind: 1`
- `enableDualPublish: (process.env.NOSTR_DUAL_PUBLISH ?? 'true') !== 'false'`

**`src/lib/publishing/publish-and-federate.ts`** — After publishing Kind 30023, conditionally publish Kind 1 alert. No separate dedup — tied to the Kind 30023 dedup key.

**`src/types/nostr.ts`** — Add `alertEventsPublished?: number` to `NostrPublishRun`.

### Tests

- `createSignedAlertEvent` produces kind 1, includes naddr, has e-tag
- Dual publish toggle works (enabled/disabled via config)

---

## Phase 2: Shared Inbox Optimization

**Why**: Current delivery is O(followers). If 5000 followers are on mastodon.social, CIV.IQ sends 5000 individual POSTs. With shared inbox, it sends 1. This changes algorithmic complexity from O(followers) to O(instances).

### Modified files

**`src/lib/activitypub/followers.ts`**:

- Add optional `sharedInbox?: string` to `FollowerEntry` (backward compatible — existing Redis data deserializes with `undefined`)
- `addFollower()` gets optional 3rd param: `sharedInbox?: string`
- `getFollowerInboxes()` returns deduplicated list preferring `sharedInbox` where available: `inboxSet.add(f.sharedInbox ?? f.inbox)`

**`src/app/api/activitypub/inbox/route.ts`** — In `handleFollow()` at ~line 108, extract `endpoints.sharedInbox` from fetched remote actor and pass to `addFollower()`:

```typescript
const actor = await actorRes.json();
inbox = actor.inbox;
const sharedInbox: string | undefined = actor.endpoints?.sharedInbox;
// ...
await addFollower(actorId, inbox, sharedInbox);
```

**`src/lib/activitypub/delivery.ts`** — No changes needed. Existing `[...new Set(inboxes)]` dedup at line 40 handles shared inboxes automatically.

### Tests

- `getFollowerInboxes()` deduplicates shared inboxes correctly
- Backward compat: entries without `sharedInbox` fall back to `inbox`
- Inbox route extracts `endpoints.sharedInbox` from mock actor

---

## Phase 3: Event Deletion (NIP-09 + ActivityPub Tombstone)

**Why**: CIV.IQ publishes legal data. When Congress.gov or OpenStates issues corrections, erroneous data currently persists permanently across Nostr relays and the Fediverse with no retraction mechanism.

### Modified files

**`src/lib/nostr/events.ts`** — Add `createDeletionEvent()`:

```typescript
export function createDeletionEvent(
  originalEventId: string,
  reason: string,
  privateKey: Uint8Array
): VerifiedEvent;
```

Kind 5 (NIP-09) with `e` tag referencing the original event. Content is the reason string.

**`src/lib/activitypub/outbox.ts`** — Add:

- `createDeleteActivity(noteId)` — produces `APDeleteActivity` with `Tombstone` (type already defined in `types/activitypub.ts:102-109`)
- `removeFromOutbox(noteId)` — removes activity from Redis + cleans up index

**`src/lib/activitypub/delivery.ts`** — Widen `DeliverableActivity` union to include `APDeleteActivity`. No other changes needed.

**`src/types/nostr.ts`** — Add optional `_correction` field to `CivicEvent`:

```typescript
_correction?: {
  originalNostrEventId: string;
  originalNoteId: string;
};
```

**`src/lib/publishing/publish-and-federate.ts`** — Store content hash (`SHA-256 of JSON.stringify(event.data)`) in dedup entry alongside event ID. When `_correction` is present:

1. Publish Kind 5 deletion for `originalNostrEventId`
2. Deliver AP Delete for `originalNoteId`
3. Remove old entry from outbox
4. Publish fresh Kind 30023 + Kind 1 + AP Create as normal

**Detectors** (`src/lib/nostr/detectors/*.ts`) — Change from `cache.exists(dedupKey)` to `cache.get<DedupEntry>(dedupKey)` and compare content hash. If hash changed, set `_correction` on the event.

### Dedup entry structure (stored in Redis):

```typescript
interface DedupEntry {
  eventId: string;
  nostrEventId: string;
  noteId: string;
  contentHash: string;
  publishedAt: number;
}
```

### Tests

- Kind 5 has correct e-tag; AP Delete has valid Tombstone
- Content hash comparison detects corrections
- Unchanged hash is a no-op (no double-publish)
- `removeFromOutbox` cleans up both activity key and index

---

## Phase 4: 410 Gone Follower Pruning

**Why**: When a remote instance dies or a user deletes their account, continued delivery attempts waste resources and can get CIV.IQ flagged as abusive by remote server admins.

### Modified files

**`src/lib/activitypub/delivery.ts`**:

- Add `GoneError` class extending `Error` with `inbox` property
- `deliverToInbox()`: throw `GoneError` on HTTP 410 (distinct from generic failures)
- `deliverToFollowers()`: after `Promise.allSettled`, detect `GoneError` instances, look up follower entries matching the gone inbox, call `removeFollower()` for each, log the pruning

### Tests

- Mock fetch returning 410 triggers `removeFollower` for correct actorId
- Non-410 errors (500, 502, etc.) do NOT trigger pruning
- 200/202 responses counted as successful delivery

---

## Phase 5: NIP-11 Relay Negotiation

**Why**: Relays can silently reject oversized Kind 30023 payloads or require Lightning Network payment. CIV.IQ currently publishes blindly to all 7 relays and counts timeouts as generic failures.

### New files

**`src/lib/nostr/relay-info.ts`**:

```typescript
export interface RelayInfo {
  name?: string;
  supported_nips?: number[];
  limitation?: {
    max_message_length?: number;
    auth_required?: boolean;
    payment_required?: boolean;
  };
}

// Fetch NIP-11 doc (wss:// → https://, Accept: application/nostr+json), cache 24h
export async function fetchRelayInfo(relayUrl: string): Promise<RelayInfo | null>;

// Exclude relays that can't accept payload. Fail-open: returns original list if all filtered
export async function filterCapableRelays(
  relayUrls: string[],
  payloadSize: number
): Promise<string[]>;
```

### Modified files

**`src/lib/nostr/relay-pool.ts`** — Add optional `options?: { skipNip11Check?: boolean }` param to `publishToRelays()`. Pre-filter relays before publishing. Small payloads (profile, relay-list) pass `skipNip11Check: true`.

**`src/config/nostr.config.ts`** — Add `enableNip11Check` config flag, `nip11CacheTTL: 24 * 60 * 60`.

### Tests

- Cached relay info returned on second call
- Oversized payload relays excluded
- Payment-required relays excluded
- Fail-open when ALL relays fail NIP-11 check (returns original list)
- `skipNip11Check: true` bypasses filtering

---

## Phase 6: OpenStates Staleness Monitoring

**Why**: When an OpenStates scraper breaks for a state, CIV.IQ silently publishes zero events for that jurisdiction with no alert. This can persist for weeks unnoticed.

### Modified files

**`src/lib/nostr/state-event-detector.ts`**:

- Add `StateStalenessInfo` interface: `{ state: string; stale: boolean; lastUpdate: string | null; billsChecked: number }`
- Add `detectStateEventsWithStaleness()` returning `{ events: CivicEvent[]; staleness: StateStalenessInfo[] }`
- Staleness threshold: 14 days without `updated_at` activity during active session
- Log warning for each stale state

**`src/types/nostr.ts`** — Add `stateStaleness?: StateStalenessInfo[]` to `NostrPublishRun`.

**Cron route** — Call new function, include staleness array in response JSON.

### Tests

- Recent `updated_at` not flagged stale
- Old `updated_at` (>14 days) flagged stale
- Empty bill list NOT flagged stale (no data to judge from)
- Staleness info included in cron response

---

## Verification

After each phase:

1. `npm run validate:all` (lint + type-check + test + build)
2. Verify existing test suites pass unchanged
3. New tests cover the added functionality

After all phases:

- Manual verification with `npm run dev`: hit `/api/nostr/status` and `/api/nostr/verify`
- Confirm cron endpoint still returns correct response shape
- Confirm ActivityPub actor at `/api/activitypub/actor` still resolves
- Confirm WebFinger at `/.well-known/webfinger?resource=acct:civiq@civdotiq.org` works

## Commit Strategy

One conventional commit per phase:

- `refactor(publishing): decompose monolithic cron handler into detector modules`
- `feat(nostr): hybrid Kind 1 alerts alongside Kind 30023 articles`
- `feat(activitypub): shared inbox optimization for O(instances) delivery`
- `feat(activitypub): auto-prune 410 Gone followers`
- `feat(publishing): NIP-09 + ActivityPub Delete for upstream corrections`
- `feat(nostr): NIP-11 relay negotiation before publishing`
- `feat(nostr): OpenStates staleness monitoring`

## What Was Explicitly NOT Included (and Why)

| Recommendation from Research            | Decision | Rationale                                                                                             |
| --------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| Redis Cluster sharding / BullMQ workers | Deferred | Premature — shared inbox alone drops delivery O(followers) → O(instances). Revisit at 10K+ followers. |
| RFC 9421 HTTP Message Signatures        | Deferred | Mastodon still accepts draft-cavage. Plan for in ~6 months as ecosystem demands it.                   |
| HSM/KMS for Nostr keys                  | Deferred | Operationally heavy for current scale. Env var approach is standard.                                  |
| FEP-2677 application actor              | Deferred | Minimal adoption. Current WebFinger + NodeInfo discovery works.                                       |
| Mention tagging legislators             | Rejected | Risks spam/harassment perception by instance mods. Conflicts with CIV.IQ as infrastructure.           |
| Dual draft-cavage + RFC 9421 signatures | Rejected | Adds complexity for marginal gain. Switch when ecosystem requires it.                                 |
| Self-hosted archival relay              | Deferred | Good long-term move but requires infrastructure beyond the app. Separate initiative.                  |
