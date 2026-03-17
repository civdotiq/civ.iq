# Implementation Plan: Civic Mesh — Open Civic Intelligence Infrastructure

## What This Is

Civic Mesh is CIV.IQ's formalized intelligence infrastructure layer. It takes the existing graph hydrators, entity resolution, 15 analyzers, ML models, and cross-domain joins — and unifies them into a queryable, temporal, composable system that serves as open digital infrastructure for civic data.

The name "Civic Mesh" reflects the architecture: a network of interconnected civic entities where every node can reach every other node through typed, weighted, time-stamped relationships.

## Why This Exists

CIV.IQ already has 8 entity types, 14 edge types, on-demand graph hydration, BFS path finding, 15 statistical analyzers, and ML-based vote prediction. But the schema is implicit — hydrators know what to fetch, routing tables know how domains connect, but there's no single layer that declares the full ontology and makes it queryable beyond point-to-point lookups.

Civic Mesh formalizes what exists and adds four capabilities:

1. A typed schema that makes the implicit ontology explicit and extensible
2. Time-series on every relationship (when did connections form, strengthen, break?)
3. ML-driven influence propagation (counterfactuals, cascades, weighted paths)
4. A district-level "digital twin" that answers "does my rep work for my district?"
5. An open data protocol so journalists, researchers, and news sites can consume civic intelligence

## Architecture Principle

**Civic Mesh does NOT replace existing infrastructure.** It is a composition and formalization layer on top of:

- Existing graph hydrators (`src/lib/graph/hydrators/*.ts`)
- Existing entity resolution (`packages/entity-resolution/`)
- Existing analyzers (`src/lib/intelligence/analyzers/`)
- Existing ML models (`src/lib/intelligence/ml/`, `embeddings/`, `clusters/`)
- Existing Redis caching patterns
- Existing API routes (181 endpoints)

No new databases. Same Redis. Same hydrator pattern. Same "statistics first, AI second" rule.

---

## Build Order

**Phase 1: Mesh Schema + Registry** — Formalize the implicit ontology
**Phase 2: Temporal Mesh** — Add time-series to every edge
**Phase 3: District Intelligence Profile** — The citizen-facing "digital twin"
**Phase 4: Influence Propagation** — ML on the graph (counterfactuals, cascades)
**Phase 5: Open Civic Data Protocol** — Public API, Nostr feeds, embeddable widgets

Each phase has its own plan file: `PLAN-civic-mesh-phase-N.md`

Phases are sequential — each builds on the previous. But each is independently shippable and testable.

---

## Phase Summary

### Phase 1: Mesh Schema + Registry

**Plan file**: `PLAN-civic-mesh-phase-1.md`
**Goal**: Extract the implicit ontology from hydrators and types into a declarative schema. Create an entity registry so new entity types plug in without modifying core code.
**Builds on**: `src/types/graph.ts`, `src/lib/graph/hydrator.ts`, `src/lib/graph/hydrators/*.ts`
**Ships**: `src/lib/mesh/` module with schema, registry, and generic N-hop traversal
**Risk**: Low — formalization only, no behavior change

### Phase 2: Temporal Mesh

**Plan file**: `PLAN-civic-mesh-phase-2.md`
**Goal**: Upgrade `GraphEdge.temporal` from optional single timestamp to full time-series. Build quarterly aggregation for all edge types. Surface temporal trends in graph API.
**Builds on**: Phase 1 schema + existing `temporal-proximity-analyzer.ts`, `graph/diff` endpoint
**Ships**: Temporal edge properties, `buildTemporalProfile()`, updated graph API responses
**Risk**: Low — data already exists in FEC/Congress/LDA APIs, just not aggregated temporally

### Phase 3: District Intelligence Profile

**Plan file**: `PLAN-civic-mesh-phase-3.md`
**Goal**: Build a computed district profile that answers "does my representative work for my district?" by composing existing analyzers with district economic data.
**Builds on**: Phase 1+2 + existing district endpoints, vote-finance/finance-jurisdiction analyzers, USASpending, Census, BLS data
**Ships**: `district-profile-analyzer.ts`, `/api/mesh/district/[districtId]`, `DistrictProfileCard.tsx`
**Risk**: Medium — composition of many data sources, needs careful timeout management

### Phase 4: Influence Propagation

**Plan file**: `PLAN-civic-mesh-phase-4.md`
**Goal**: Three new ML capabilities: counterfactual queries (mask donor features in XGBoost), weighted influence path scoring, and cascade simulation (perturb funding → re-predict votes).
**Builds on**: Phase 1+2+3 + existing `vote-predictor.ts`, `path-finder.ts`, `influence-chain-analyzer.ts`
**Ships**: `src/lib/mesh/propagation/` module, `/api/mesh/influence/` endpoints, UI components
**Risk**: Medium — new ML composition, needs accuracy validation

### Phase 5: Open Civic Data Protocol

**Plan file**: `PLAN-civic-mesh-phase-5.md`
**Goal**: Formalize CIV.IQ's computed intelligence as a public standard. Unified entity endpoint, Nostr civic event feeds, bulk export, embeddable widgets.
**Builds on**: All phases + existing Nostr publishing layer
**Ships**: `/api/mesh/entity/`, `/api/mesh/feed/`, embed components, API documentation
**Risk**: Low — mostly wiring existing outputs to new delivery channels

---

## Cross-Phase Rules

1. **Every phase passes `npm run validate:all`** before commit
2. **Statistics first, AI second** — same rule as existing analyzers
3. **Real data only** — empty results when data unavailable, never mock
4. **Confidence + methodology + disclaimer** on every computed output
5. **No causation claims** — "pattern", "correlation", "association" only
6. **30-line rule** — validate every 30 lines of new code
7. **Minimum sample sizes** enforced (10 votes, 4 quarters, 3 trades)
8. **Backward compatible** — existing API routes unchanged, new features additive

## How to Resume Between Conversations

Each phase plan file is self-contained. To start a new phase:

1. Read `PLAN-civic-mesh.md` (this file) for overall context
2. Read the specific phase plan file (`PLAN-civic-mesh-phase-N.md`)
3. Check the "Status" field at the top of the phase plan
4. The phase plan lists every file to create/modify with exact details

Memory file `project_civic-mesh.md` tracks overall initiative status.

---

## File Structure (when complete)

```
src/lib/mesh/
├── schema.ts              # Phase 1: Entity type definitions, property schemas
├── registry.ts            # Phase 1: Hydrator/resolver plugin registration
├── traversal.ts           # Phase 1: Generic N-hop traversal
├── temporal.ts            # Phase 2: Time-series edge aggregation
├── temporal-types.ts      # Phase 2: Temporal edge types
├── district-profile.ts    # Phase 3: District intelligence computation
├── propagation/
│   ├── counterfactual.ts  # Phase 4: Feature-masking on vote predictor
│   ├── path-scorer.ts     # Phase 4: Weighted influence path scoring
│   └── cascade.ts         # Phase 4: Funding perturbation simulation
└── protocol/
    ├── entity-api.ts      # Phase 5: Unified entity endpoint handler
    ├── feed.ts            # Phase 5: Nostr civic event publishing
    └── embed.ts           # Phase 5: Embeddable widget renderer

src/app/api/mesh/
├── entity/[...id]/route.ts      # Phase 5
├── district/[districtId]/route.ts # Phase 3
├── influence/route.ts            # Phase 4
├── feed/[entityType]/route.ts    # Phase 5
└── bulk/[entityType]/route.ts    # Phase 5

src/components/mesh/
├── DistrictProfileCard.tsx  # Phase 3
├── TemporalEdgeChart.tsx    # Phase 2
├── InfluencePathView.tsx    # Phase 4
└── CiviqScorecard.tsx       # Phase 5
```
