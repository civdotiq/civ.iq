# Civic Mesh Phase 2: Temporal Mesh

**Status**: Not started
**Parent plan**: `PLAN-civic-mesh.md`
**Depends on**: Phase 1 (schema + registry)
**Estimated files**: 4 new, 3 modified

---

## Goal

Upgrade edges from optional single timestamps to full time-series. Every relationship in the Civic Mesh carries temporal metadata: when it started, when it was last active, and how it changed over time. This turns static "who is connected to whom" into dynamic "how relationships evolved."

---

## What Exists Now (Read These First)

| File                                                            | What It Contains                                         | Why It Matters                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/types/graph.ts`                                            | `GraphEdge.temporal?: { date: string; period?: string }` | Current temporal support: optional, single point in time                     |
| `src/lib/intelligence/analyzers/temporal-proximity-analyzer.ts` | Detects timing between donations and votes               | Already computes temporal alignment — but only for donation↔vote pairs      |
| `src/lib/intelligence/analyzers/temporal-vote-analyzer.ts`      | Tracks voting alignment shifts by quarter                | Already does quarterly aggregation — but only for vote alignment scores      |
| `src/app/api/graph/diff/[...nodeId]/route.ts`                   | Compares current neighborhood to snapshot                | Already stores/compares snapshots — foundation for time-series               |
| `src/lib/graph/hydrators/representative.ts`                     | Fetches contributions with date fields                   | FEC contribution data has `contribution_receipt_date` — temporal data exists |
| `src/lib/graph/hydrators/bill.ts`                               | Fetches votes with date fields                           | Congress.gov votes have `date` field — temporal data exists                  |
| `src/lib/data-sources/senate-lobbying-api.ts`                   | LDA filings with `dt_posted`, quarter, year              | Lobbying data is inherently quarterly — temporal data exists                 |

**Key insight:** The temporal data already flows through the system. FEC contributions have dates, votes have dates, lobbying filings have quarters. Hydrators already receive this data but only store a single timestamp on edges. This phase makes them store the full history.

---

## What to Build

### 1. `src/lib/mesh/temporal-types.ts` — Temporal Edge Types

```typescript
/**
 * A single time bucket aggregating edge activity over a period.
 */
export interface TemporalBucket {
  /** Period identifier: "2024-Q1", "2025-Q2", etc. */
  period: string;
  /** Start of period (ISO date) */
  start: string;
  /** End of period (ISO date) */
  end: string;
  /** Aggregate value for this period (dollars, vote count, filing count, etc.) */
  value: number;
  /** Number of individual events in this period */
  eventCount: number;
}

/**
 * Extended temporal metadata for a graph edge.
 * Replaces the simple { date, period? } with full time-series.
 */
export interface TemporalEdge {
  /** When this relationship first appeared in the data */
  firstSeen: string;
  /** Most recent activity */
  lastSeen: string;
  /** Quarterly aggregates */
  buckets: TemporalBucket[];
  /** Computed trend based on recent vs historical buckets */
  trend: 'increasing' | 'decreasing' | 'stable' | 'new' | 'ended';
  /** Percent change between most recent complete quarter and same quarter prior year */
  yoyChange: number | null;
}

/**
 * Full temporal profile for a node — aggregates temporal data
 * across all edges of each type.
 */
export interface TemporalProfile {
  nodeId: string;
  /** Time range covered */
  from: string;
  to: string;
  /** Per-edge-type temporal summaries */
  edgeSummaries: TemporalEdgeSummary[];
  /** Significant temporal events (large changes, new relationships, ended relationships) */
  events: TemporalEvent[];
}

export interface TemporalEdgeSummary {
  edgeType: GraphEdgeType;
  /** Total edges of this type */
  totalEdges: number;
  /** How many are trending up/down/stable */
  trendBreakdown: {
    increasing: number;
    decreasing: number;
    stable: number;
    new: number;
    ended: number;
  };
  /** Aggregate value time-series across all edges of this type */
  aggregateBuckets: TemporalBucket[];
}

export interface TemporalEvent {
  date: string;
  edgeType: GraphEdgeType;
  description: string;
  /** Magnitude of change (e.g., "340% increase in energy sector donations") */
  magnitude: number;
  relatedNodeId: string;
}
```

### 2. `src/lib/mesh/temporal.ts` — Temporal Aggregation Engine

```typescript
/**
 * Build a temporal profile for a node by:
 * 1. Hydrating the node's neighborhood (uses cached data)
 * 2. For each edge, check if temporal bucket data is available
 * 3. For edges missing bucket data, fetch historical data from APIs
 * 4. Aggregate into TemporalProfile
 *
 * Historical data sources by edge type:
 * - donated_to: FEC contributions by date → quarterly buckets
 * - lobbied: LDA filings by quarter → quarterly buckets
 * - voted_on: Congress.gov votes by date → quarterly buckets
 * - awarded_contract: USASpending awards by date → quarterly buckets
 * - traded_stock: House disclosures by date → quarterly buckets
 * - Others: point-in-time only (no historical aggregation)
 */
export async function buildTemporalProfile(
  nodeId: string,
  options?: { quarters?: number /* default 8 = 2 years */ }
): Promise<TemporalProfile>;

/**
 * Compute trend for a series of temporal buckets.
 * Uses linear regression on the last 4 complete quarters.
 * Threshold: slope > 10% of mean = increasing, < -10% = decreasing, else stable.
 * "new" if firstSeen within last quarter. "ended" if lastSeen before last quarter.
 */
export function computeTrend(
  buckets: TemporalBucket[],
  firstSeen: string,
  lastSeen: string
): TemporalEdge['trend'];

/**
 * Detect significant temporal events (anomalies in time-series).
 * Uses existing anomaly detection (Modified Z-Score) applied to temporal buckets.
 */
export function detectTemporalEvents(
  buckets: TemporalBucket[],
  edgeType: GraphEdgeType,
  relatedNodeId: string
): TemporalEvent[];
```

**Implementation details:**

- Reuse existing FEC service for historical contribution queries (already supports date filtering)
- Reuse existing Senate LDA API service for quarterly lobbying data
- Reuse existing Congress.gov service for vote history
- Reuse `detectAnomalies()` from `@civiq/civic-statistics` for flagging temporal anomalies
- Cache temporal profiles in Redis with 24-hour TTL (key: `temporal:{nodeId}`)
- Quarterly bucketing aligns with FEC reporting periods (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)

### 3. Update `src/types/graph.ts` — Extend GraphEdge

```typescript
// Update the existing temporal field on GraphEdge:
// Before:
temporal?: { date: string; period?: string };

// After (backward compatible — old format still works):
temporal?: {
  date: string;
  period?: string;
  // New fields (optional — populated when temporal data available):
  firstSeen?: string;
  lastSeen?: string;
  buckets?: TemporalBucket[];
  trend?: 'increasing' | 'decreasing' | 'stable' | 'new' | 'ended';
  yoyChange?: number | null;
};
```

**Backward compatible:** existing code that reads `temporal.date` still works. New fields are optional.

### 4. Update Hydrators to Populate Temporal Buckets

Modify hydrators to include temporal bucket data when available. The key hydrators to update:

- `hydrators/representative.ts` — add quarterly contribution buckets on `donated_to` edges
- `hydrators/bill.ts` — add vote dates as temporal data on `voted_on` edges
- `hydrators/committee.ts` — add quarterly lobbying buckets on `lobbied` edges

**Important:** Keep hydrator changes minimal. Hydrators should set `firstSeen`/`lastSeen` on edges they create (the data is already in the API responses). Full bucket aggregation happens in `temporal.ts` when `buildTemporalProfile()` is called.

### 5. API Endpoint: `/api/mesh/temporal/[...nodeId]/route.ts`

```typescript
// GET /api/mesh/temporal/rep:A000360?quarters=8
// Returns: TemporalProfile for the given node
// Cache: ISR 1 hour
```

### 6. UI Component: `src/components/mesh/TemporalEdgeChart.tsx`

A small sparkline/bar chart component showing edge value over time. Used in:

- Graph sidebar (when an edge is selected, show its temporal trend)
- Representative profile (show donation trend by sector)

Design: Aicher/Ulm style — no gradients, no shadows, 2px bars, grid-aligned.

---

## Files to Create/Modify

| #   | File                                             | Action     | What                                                                           |
| --- | ------------------------------------------------ | ---------- | ------------------------------------------------------------------------------ |
| 1   | `src/lib/mesh/temporal-types.ts`                 | **Create** | TemporalBucket, TemporalEdge, TemporalProfile, TemporalEvent types (~80 lines) |
| 2   | `src/lib/mesh/temporal.ts`                       | **Create** | buildTemporalProfile(), computeTrend(), detectTemporalEvents() (~250 lines)    |
| 3   | `src/app/api/mesh/temporal/[...nodeId]/route.ts` | **Create** | GET endpoint for temporal profiles (~60 lines)                                 |
| 4   | `src/components/mesh/TemporalEdgeChart.tsx`      | **Create** | Sparkline/bar chart for temporal edge data (~100 lines)                        |
| 5   | `src/types/graph.ts`                             | **Edit**   | Extend temporal field on GraphEdge (backward compatible)                       |
| 6   | `src/lib/graph/hydrators/representative.ts`      | **Edit**   | Add firstSeen/lastSeen on contribution edges                                   |
| 7   | `src/lib/graph/hydrators/committee.ts`           | **Edit**   | Add firstSeen/lastSeen on lobbying edges                                       |
| 8   | `src/__tests__/mesh/temporal.test.ts`            | **Create** | Temporal aggregation, trend detection, event detection tests (~100 lines)      |

---

## Validation

```bash
npm run validate:all
```

Specific checks:

- [ ] TemporalBucket aggregation produces correct quarterly sums
- [ ] Trend computation matches expected output for known time-series
- [ ] Temporal events flag anomalies correctly (reuse anomaly detection tests)
- [ ] GraphEdge backward compatible (existing tests still pass)
- [ ] Hydrator changes don't break existing graph API responses
- [ ] API endpoint returns valid TemporalProfile
- [ ] UI component renders with Aicher/Ulm design system
- [ ] No new runtime dependencies (reuse existing simple-statistics)

---

## What This Enables

- **Phase 3** uses temporal profiles to show how district representation alignment changes over time
- **Phase 4** uses temporal data to weight influence paths by recency
- **Phase 5** publishes temporal events as Nostr feed items ("Rep X's defense funding increased 200% this quarter")
