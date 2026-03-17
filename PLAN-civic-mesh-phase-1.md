# Civic Mesh Phase 1: Schema + Registry

**Status**: Not started
**Parent plan**: `PLAN-civic-mesh.md`
**Depends on**: Nothing (foundation phase)
**Estimated files**: 5 new, 2 modified

---

## Goal

Extract the implicit ontology from hydrators and graph types into a declarative schema. Create an entity registry so new entity types and relationships plug in without modifying core dispatch code.

This phase does NOT change any behavior. Existing hydrators, graph API, and investigate page continue working exactly as before. The mesh schema is a formalization layer that subsequent phases build on.

---

## What Exists Now (Read These First)

| File                                        | What It Contains                                                                                     | Why It Matters                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/types/graph.ts`                        | `GraphNode`, `GraphEdge`, `GraphNodeType` (8 types), `GraphEdgeType` (14 types), `GraphNeighborhood` | The implicit schema — but types are loose `Record<string, unknown>` for properties |
| `src/lib/graph/hydrator.ts`                 | Main dispatch: `hydrateNeighborhood(nodeId)` → parses canonical ID → calls type-specific hydrator    | Switch statement on node type — adding types means editing this file               |
| `src/lib/graph/hydrators/representative.ts` | Fetches committees, contributions, votes, sponsored bills → builds edges                             | Knows implicitly that a representative has committees, donors, votes               |
| `src/lib/graph/hydrators/bill.ts`           | Fetches sponsors, votes, lobbying matches → builds edges                                             | Knows implicitly that a bill has sponsors, votes, lobbying connections             |
| `src/lib/graph/hydrators/committee.ts`      | Fetches members, agencies, lobbying filings → builds edges                                           | Knows implicitly that a committee has members and oversight jurisdiction           |
| `src/lib/graph/hydrators/organization.ts`   | Fetches contributions, lobbying, affiliated entities → builds edges                                  | Knows implicitly that an organization donates, lobbies, and has sector membership  |
| `src/lib/graph/hydrators/agency.ts`         | Fetches contracts, regulations, oversight committees → builds edges                                  | Knows implicitly that an agency awards contracts and is overseen by committees     |
| `src/lib/graph/hydrators/sector.ts`         | Fetches organizations in sector, related bills → builds edges                                        | Knows implicitly that a sector contains organizations and is affected by bills     |
| `src/lib/graph/normalize.ts`                | Canonical ID generation: `rep:A000360`, `bill:119-hr-1234`, etc.                                     | The ID scheme that all caching and deduplication relies on                         |
| `src/lib/graph/path-finder.ts`              | BFS path finding, max 4 hops, confidence-weighted                                                    | Current traversal is path-only — no "find all within N hops matching filter"       |
| `packages/entity-resolution/src/index.ts`   | Entity resolution exports (industry taxonomy, committee maps, FEC mappings)                          | The resolution layer that hydrators depend on                                      |

---

## What to Build

### 1. `src/lib/mesh/schema.ts` — Entity Type Definitions

Declare what each entity type contains. This replaces the implicit knowledge scattered across hydrators.

```typescript
import { GraphNodeType, GraphEdgeType } from '@/types/graph';

/**
 * Property definition for an entity type.
 * Describes a single named property with its type and whether it's required.
 */
export interface PropertyDef {
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]';
  required: boolean;
  description: string;
}

/**
 * Relationship definition for an entity type.
 * Describes which edge types can connect this entity to which target types.
 */
export interface RelationshipDef {
  edgeType: GraphEdgeType;
  targetType: GraphNodeType;
  direction: 'outgoing' | 'incoming';
  description: string;
}

/**
 * Full schema definition for an entity type.
 */
export interface EntitySchema {
  nodeType: GraphNodeType;
  displayName: string;
  description: string;
  /** The property that serves as the primary identifier (e.g., "bioguideId") */
  primaryKey: string;
  /** Typed property definitions */
  properties: Record<string, PropertyDef>;
  /** Valid relationships for this entity type */
  relationships: RelationshipDef[];
  /** Canonical ID prefix (e.g., "rep", "bill", "cmte") */
  idPrefix: string;
}

// Then define schemas for all 8 entity types.
// Example (representative):
export const REPRESENTATIVE_SCHEMA: EntitySchema = {
  nodeType: 'representative',
  displayName: 'Representative',
  description: 'A current or former member of the US Congress',
  primaryKey: 'bioguideId',
  idPrefix: 'rep',
  properties: {
    bioguideId: { type: 'string', required: true, description: 'Bioguide identifier' },
    name: { type: 'string', required: true, description: 'Full name' },
    party: { type: 'string', required: true, description: 'Political party (D/R/I)' },
    chamber: { type: 'string', required: true, description: 'House or Senate' },
    state: { type: 'string', required: true, description: 'Two-letter state code' },
    district: { type: 'string', required: false, description: 'District number (House only)' },
  },
  relationships: [
    {
      edgeType: 'serves_on',
      targetType: 'committee',
      direction: 'outgoing',
      description: 'Committee membership',
    },
    {
      edgeType: 'voted_on',
      targetType: 'bill',
      direction: 'outgoing',
      description: 'Roll call vote',
    },
    {
      edgeType: 'sponsored',
      targetType: 'bill',
      direction: 'outgoing',
      description: 'Bill sponsorship',
    },
    {
      edgeType: 'traded_stock',
      targetType: 'organization',
      direction: 'outgoing',
      description: 'Financial disclosure trade',
    },
    {
      edgeType: 'donated_to',
      targetType: 'representative',
      direction: 'incoming',
      description: 'Received campaign contribution',
    },
  ],
};

// Define similar schemas for: bill, committee, agency, organization, sector, contract, regulation
// Extract the implicit knowledge from each hydrator file into its schema definition.
```

**Key decisions:**

- Properties are typed (not `Record<string, unknown>`) — enables validation and documentation
- Relationships declare direction — enables traversal queries ("all outgoing from rep" vs "all incoming to rep")
- Schemas are const objects, not a database — they're compile-time declarations
- Keep schemas aligned with what hydrators actually return (don't invent properties that don't exist)

### 2. `src/lib/mesh/registry.ts` — Entity Registry

A registry that maps entity types to their schemas and hydrators. Replaces the switch statement in `hydrator.ts`.

```typescript
import { GraphNodeType } from '@/types/graph';
import { EntitySchema } from './schema';
import { GraphNeighborhood } from '@/types/graph';

type HydratorFn = (identifier: string) => Promise<GraphNeighborhood>;

interface RegisteredEntity {
  schema: EntitySchema;
  hydrator: HydratorFn;
}

class MeshRegistry {
  private entities = new Map<GraphNodeType, RegisteredEntity>();

  register(schema: EntitySchema, hydrator: HydratorFn): void {
    this.entities.set(schema.nodeType, { schema, hydrator });
  }

  getSchema(nodeType: GraphNodeType): EntitySchema | undefined {
    return this.entities.get(nodeType)?.schema;
  }

  getHydrator(nodeType: GraphNodeType): HydratorFn | undefined {
    return this.entities.get(nodeType)?.hydrator;
  }

  getAllSchemas(): EntitySchema[] {
    return Array.from(this.entities.values()).map(e => e.schema);
  }

  /** Get all relationship types that can connect two entity types */
  getRelationships(fromType: GraphNodeType, toType: GraphNodeType): RelationshipDef[] {
    const schema = this.getSchema(fromType);
    if (!schema) return [];
    return schema.relationships.filter(r => r.targetType === toType);
  }
}

export const meshRegistry = new MeshRegistry();
```

**Then in a separate initialization file** (`src/lib/mesh/init.ts`), register all 8 entity types with their schemas and existing hydrators:

```typescript
import { meshRegistry } from './registry';
import { REPRESENTATIVE_SCHEMA, BILL_SCHEMA /* ... */ } from './schema';
import { hydrateRepresentative } from '@/lib/graph/hydrators/representative';
import { hydrateBill } from '@/lib/graph/hydrators/bill';
// ...

meshRegistry.register(REPRESENTATIVE_SCHEMA, hydrateRepresentative);
meshRegistry.register(BILL_SCHEMA, hydrateBill);
// ... all 8 types
```

### 3. `src/lib/mesh/traversal.ts` — Generic N-Hop Traversal

Generalize `path-finder.ts` from "find paths between A and B" to "find all entities within N hops matching a filter."

```typescript
import { GraphNodeType, GraphEdgeType, GraphNode, GraphEdge } from '@/types/graph';
import { meshRegistry } from './registry';

export interface TraversalFilter {
  /** Only traverse these edge types (default: all) */
  edgeTypes?: GraphEdgeType[];
  /** Only return nodes of these types (default: all) */
  nodeTypes?: GraphNodeType[];
  /** Minimum edge confidence to traverse (default: 0) */
  minConfidence?: number;
  /** Maximum hops from origin (default: 2, max: 4) */
  maxDepth?: number;
  /** Maximum nodes to return (default: 50) */
  limit?: number;
}

export interface TraversalResult {
  /** All nodes found within the traversal */
  nodes: GraphNode[];
  /** All edges traversed */
  edges: GraphEdge[];
  /** Depth at which each node was found */
  depthMap: Map<string, number>;
  /** Whether traversal was truncated by limit */
  truncated: boolean;
}

/**
 * BFS traversal from a starting node, collecting all reachable entities
 * within maxDepth hops that match the given filter.
 *
 * Uses existing hydrators via the mesh registry.
 * Respects Redis cache (hydrators check cache first).
 */
export async function traverseMesh(
  startId: string,
  filter?: TraversalFilter
): Promise<TraversalResult> {
  // BFS implementation using meshRegistry.getHydrator()
  // Similar to path-finder.ts but:
  // - Collects ALL matching nodes, not just paths to a target
  // - Filters by edge type and node type
  // - Returns depth map (which hop each node was found at)
  // - Respects limit to bound API calls
}
```

**How this differs from `path-finder.ts`:**

- `path-finder.ts`: "Find path from A to B" — goal-directed search
- `traverseMesh`: "Find everything reachable from A matching filter" — exploration search
- Both use BFS, both respect cache, both bound depth at 4

### 4. `src/lib/mesh/index.ts` — Barrel Export

```typescript
export { meshRegistry } from './registry';
export type { EntitySchema, PropertyDef, RelationshipDef } from './schema';
export { traverseMesh } from './traversal';
export type { TraversalFilter, TraversalResult } from './traversal';
// Re-export all schemas
export * from './schema';
```

### 5. `src/lib/mesh/init.ts` — Registration

Registers all 8 entity types. Imported once at app startup (or lazily on first mesh query).

---

## Files to Create/Modify

| #   | File                                   | Action     | What                                                                                                          |
| --- | -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `src/lib/mesh/schema.ts`               | **Create** | 8 entity type schemas with typed properties and relationship definitions (~200 lines)                         |
| 2   | `src/lib/mesh/registry.ts`             | **Create** | MeshRegistry class with register/query/introspect methods (~80 lines)                                         |
| 3   | `src/lib/mesh/traversal.ts`            | **Create** | Generic N-hop BFS traversal using registry (~150 lines)                                                       |
| 4   | `src/lib/mesh/init.ts`                 | **Create** | Register all 8 entity types with schemas + existing hydrators (~40 lines)                                     |
| 5   | `src/lib/mesh/index.ts`                | **Create** | Barrel exports (~15 lines)                                                                                    |
| 6   | `src/__tests__/mesh/schema.test.ts`    | **Create** | Schema validation tests: all 8 types defined, relationships bidirectional, IDs match normalize.ts (~60 lines) |
| 7   | `src/__tests__/mesh/traversal.test.ts` | **Create** | Traversal tests: BFS correctness, filter application, depth limits, truncation (~80 lines)                    |

**Modified (optional, not required for Phase 1):**

| #   | File                        | Action          | What                                                                                                              |
| --- | --------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| 8   | `src/lib/graph/hydrator.ts` | Edit (optional) | Could refactor switch statement to use `meshRegistry.getHydrator()` — but not required, existing code still works |

---

## Validation

After implementation:

```bash
npm run validate:all  # Must pass: lint + type-check + test + build
```

Specific checks:

- [ ] All 8 entity schemas defined with correct properties
- [ ] All 14 edge types referenced in at least one schema's relationships
- [ ] Schema property types match what hydrators actually return
- [ ] Registry correctly maps types to existing hydrators
- [ ] Traversal BFS returns correct results for mocked neighborhoods
- [ ] Traversal respects maxDepth, limit, edgeTypes, nodeTypes filters
- [ ] No changes to existing graph API behavior
- [ ] No new runtime dependencies

---

## What This Enables (for later phases)

- **Phase 2** uses schemas to know which edge types support temporal aggregation
- **Phase 3** uses traversal to explore district → representative → committee → sector paths
- **Phase 4** uses registry to look up entity schemas for influence scoring
- **Phase 5** uses schemas to auto-generate API documentation and validate requests
