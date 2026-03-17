# Civic Mesh Phase 5: Open Civic Data Protocol

**Status**: Not started
**Parent plan**: `PLAN-civic-mesh.md`
**Depends on**: Phases 1-4 (uses all Civic Mesh capabilities)
**Estimated files**: 8 new, 2 modified

---

## Goal

Formalize CIV.IQ's computed civic intelligence as open digital infrastructure. Three delivery channels:

1. **Unified Entity API** — single endpoint to query any entity with full mesh context
2. **Nostr Civic Feeds** — publish intelligence updates as signed, verifiable Nostr events
3. **Embeddable Widgets** — React components and iframe endpoints for news sites

This is what differentiates CIV.IQ from closed intelligence platforms: the computed intelligence is open infrastructure, not a proprietary product.

---

## What Exists Now (Read These First)

| File                                               | What It Contains                                 | Why It Matters                                               |
| -------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| `src/lib/nostr/`                                   | Full Nostr event signing and relay publishing    | Already implemented — just needs to be wired to mesh outputs |
| `src/app/api/graph/neighbors/[...nodeId]/route.ts` | Returns GraphNeighborhood for any node           | Foundation for unified entity endpoint — add mesh context    |
| `src/app/api/graph/path/route.ts`                  | Path finding between nodes                       | Already a public API — extend with influence scoring         |
| `src/types/graph.ts`                               | GraphNode, GraphEdge, GraphNeighborhood          | Response types for entity API                                |
| `src/lib/mesh/` (Phases 1-4)                       | Schema, temporal, district profiles, propagation | All the computed intelligence to expose                      |
| `src/components/intelligence/*.tsx`                | 18 insight card components                       | Existing UI components to adapt for embeds                   |
| All intelligence analyzers                         | 15 analyzers computing insights                  | The computed data to publish                                 |

---

## What to Build

### 1. Unified Entity API — `/api/mesh/entity/[...id]/route.ts`

A single endpoint that returns everything the Civic Mesh knows about an entity.

```typescript
// GET /api/mesh/entity/rep:A000360
// GET /api/mesh/entity/bill:119-hr-1234
// GET /api/mesh/entity/sector:defense

interface MeshEntityResponse {
  /** Entity identity */
  entity: {
    id: string; // Canonical ID
    type: GraphNodeType;
    label: string;
    properties: Record<string, unknown>; // Typed by schema (Phase 1)
    schema: EntitySchema; // Self-describing — client knows what properties exist
  };

  /** Direct relationships */
  neighborhood: {
    nodes: GraphNode[];
    edges: GraphEdge[]; // With temporal data (Phase 2)
    completeness: 'complete' | 'partial' | 'degraded';
  };

  /** Computed intelligence (type-specific) */
  intelligence: {
    /** For representatives: vote-finance, finance-jurisdiction, independence score, etc. */
    insights: Record<string, InsightBase | null>;
    /** For districts: DistrictProfile (Phase 3) */
    districtProfile?: DistrictProfile;
    /** Temporal profile (Phase 2) */
    temporalProfile?: TemporalProfile;
  };

  /** Metadata */
  meta: {
    generatedAt: string;
    dataSources: string[];
    cacheStatus: 'fresh' | 'cached';
    cacheTTL: number;
    meshVersion: string; // e.g., "1.0.0" — for API versioning
  };
}
```

**Implementation:**

- Parse canonical ID → look up entity type in mesh registry (Phase 1)
- Hydrate neighborhood (existing hydrator)
- Fetch relevant insights based on entity type:
  - Representative: vote-finance, finance-jurisdiction, vote-prediction, influence-chain
  - Bill: bill intelligence, sponsor funding
  - Committee: lobbying pipeline
  - District: district profile (Phase 3)
  - Sector: sector leaderboard
- Include temporal profile (Phase 2)
- Return self-describing response (schema included so clients know the data shape)
- Cache: ISR 1 hour

### 2. Nostr Civic Event Feeds

Wire the existing Nostr publishing layer to emit civic intelligence events.

```typescript
// src/lib/mesh/protocol/feed.ts

/**
 * Publish a civic intelligence update as a signed Nostr event.
 *
 * Event kinds (using NIP-78 application-specific data):
 * - Kind 30078: Civic intelligence insight
 *
 * Tags:
 * - ["d", canonicalId]           // Entity this insight is about
 * - ["t", insightType]           // "vote-finance", "district-profile", etc.
 * - ["confidence", "0.87"]       // Insight confidence
 * - ["dataAsOf", "2026-03-17"]   // Data freshness
 * - ["mesh-version", "1.0.0"]    // Protocol version
 *
 * Content: JSON-stringified insight data (without narrative — just numbers)
 */
export async function publishCivicEvent(
  entityId: string,
  insightType: string,
  insight: InsightBase
): Promise<string>; // Returns Nostr event ID
```

**Feed endpoint:** `/api/mesh/feed/[entityType]/route.ts`

```typescript
// GET /api/mesh/feed/representative?since=2026-03-10
// Returns: Array of recent civic events for entity type
// This queries Nostr relays for events matching the entity type tag
```

**Publishing triggers:**

- When an insight is computed and differs significantly from cached version
- When a district profile alignment score changes by > 5%
- When a temporal event is detected (Phase 2)
- Publish from the existing cache-warm cron job (already runs periodically)

### 3. Bulk Export — `/api/mesh/bulk/[entityType]/route.ts`

For researchers and journalists who want the full dataset.

```typescript
// GET /api/mesh/bulk/representative?format=json
// GET /api/mesh/bulk/representative?format=csv
// Returns: All computed intelligence for all entities of this type
// Rate limited: 10 requests/hour per IP
// Cache: 24-hour snapshots
```

**Implementation:**

- Iterate all entities of the given type
- For each, fetch cached insights (do NOT compute fresh — use existing cache)
- Stream response as NDJSON or CSV
- Include methodology and disclaimers in response headers
- Rate limit to prevent abuse

### 4. Embeddable Widgets

React components designed for embedding in external sites.

**`src/components/mesh/CiviqScorecard.tsx`** — Compact representative scorecard:

```
┌─────────────────────────────────┐
│  Rep. Jane Smith (D-CA-12)      │
│  Alignment: 72%  ████████░░     │
│  Independence: 0.64             │
│  Top Donor Sector: Health       │
│  ─────────────────────────────  │
│  Data: CIV.IQ · Mar 2026       │
└─────────────────────────────────┘
```

**`src/components/mesh/CiviqDistrictCard.tsx`** — Compact district card:

```
┌─────────────────────────────────┐
│  CA-12 · San Francisco          │
│  Rep Alignment: 72%             │
│  Peer Avg: 65%                  │
│  Top Sector: Health             │
│  ─────────────────────────────  │
│  Data: CIV.IQ · Mar 2026       │
└─────────────────────────────────┘
```

**Embed endpoint:** `/api/mesh/embed/[type]/[id]/route.ts`

- Returns self-contained HTML (inline styles, no external dependencies)
- Designed for iframe embedding: `<iframe src="https://civ.iq/api/mesh/embed/scorecard/A000360">`
- Aicher/Ulm design system (Braun Linear font loaded via CSS)
- Includes "Powered by CIV.IQ" attribution link
- Refreshes data on load (from cached intelligence)

### 5. API Documentation

Auto-generate API docs from mesh schemas (Phase 1):

```typescript
// GET /api/mesh/docs
// Returns: OpenAPI-style documentation generated from EntitySchema definitions
// Lists all entity types, their properties, relationships, and available endpoints
```

---

## Files to Create/Modify

| #   | File                                          | Action     | What                                             |
| --- | --------------------------------------------- | ---------- | ------------------------------------------------ |
| 1   | `src/app/api/mesh/entity/[...id]/route.ts`    | **Create** | Unified entity endpoint (~120 lines)             |
| 2   | `src/lib/mesh/protocol/feed.ts`               | **Create** | Nostr civic event publishing (~100 lines)        |
| 3   | `src/app/api/mesh/feed/[entityType]/route.ts` | **Create** | Feed query endpoint (~60 lines)                  |
| 4   | `src/app/api/mesh/bulk/[entityType]/route.ts` | **Create** | Bulk export endpoint (~100 lines)                |
| 5   | `src/components/mesh/CiviqScorecard.tsx`      | **Create** | Embeddable rep scorecard (~120 lines)            |
| 6   | `src/components/mesh/CiviqDistrictCard.tsx`   | **Create** | Embeddable district card (~120 lines)            |
| 7   | `src/app/api/mesh/embed/[type]/[id]/route.ts` | **Create** | Embed iframe endpoint (~80 lines)                |
| 8   | `src/app/api/mesh/docs/route.ts`              | **Create** | Auto-generated API docs from schemas (~60 lines) |
| 9   | `src/__tests__/mesh/entity-api.test.ts`       | **Create** | Entity API response validation (~80 lines)       |
| 10  | `src/__tests__/mesh/feed.test.ts`             | **Create** | Nostr event publishing tests (~60 lines)         |

---

## Validation

```bash
npm run validate:all
```

Specific checks:

- [ ] Entity API returns valid response for all 8 entity types
- [ ] Entity API returns schema (self-describing)
- [ ] Nostr events are properly signed and tagged
- [ ] Bulk export includes methodology and disclaimers
- [ ] Embed components render correctly with inline styles (no external CSS)
- [ ] Embed components include attribution link
- [ ] Rate limiting works on bulk endpoint
- [ ] API docs accurately reflect schema definitions
- [ ] No sensitive data exposed (no API keys, no internal IDs)

---

## What This Achieves

CIV.IQ becomes **open civic infrastructure**:

- **Journalists** can query the unified entity API to research representatives
- **Researchers** can bulk-export computed intelligence for academic study
- **News sites** can embed scorecards without building their own data pipeline
- **Developers** can subscribe to Nostr feeds for real-time civic intelligence updates
- **Citizens** can share embed links to specific representatives or districts

The data is computed from real government sources, carries confidence scores and methodology, and is signed via Nostr for verifiability. This is what "digital infrastructure for civic data" means — not a dashboard, but a protocol.
